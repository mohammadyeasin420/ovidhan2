#!/usr/bin/env python3
"""
learning_graph_builder.py
Build a comprehensive English learning knowledge graph from Ovidhan’s data.
Output: graph_data/learning_graph.gexf (or .graphml) + edge list CSVs.
"""

import os
import json
import csv
import logging
import networkx as nx
from typing import Dict, List, Optional, Set
from collections import defaultdict

# ---------- CONFIGURATION ----------
DATA_DIR = "data"                 # your structured JSON/CSV data
OUTPUT_DIR = "graph_data"
GRAPH_FILE = os.path.join(OUTPUT_DIR, "learning_graph.gexf")

# Data sources (adjust to your actual files)
WORD_DATA        = os.path.join(DATA_DIR, "words.json")          # [{word, pos, cefr, ...}]
COLLOCATION_DATA = os.path.join(DATA_DIR, "collocations.json")   # [{word, collocation, ...}]
LESSON_DATA      = os.path.join(DATA_DIR, "lessons.json")        # [{id, words, grammar, ...}]
QUIZ_DATA        = os.path.join(DATA_DIR, "quizzes.json")        # [{id, words, lesson_id, ...}]
GRAMMAR_TOPICS   = os.path.join(DATA_DIR, "grammar_topics.json") # [{id, name, category}]
BLOG_DATA        = os.path.join(DATA_DIR, "blogs.json")          # [{slug, tags, linked_words}]
EXAM_DATA        = os.path.join(DATA_DIR, "exams.json")          # [{id, type, words, quiz_ids}]
AUDIO_DATA       = os.path.join(DATA_DIR, "audio_files.json")    # [{word, file}]

# Optional: use spaCy for lemma/derivation extraction
USE_SPACY = True
try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
except:
    USE_SPACY = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")

# ---------- UTILITY ----------
def load_json(path: str) -> list:
    if not os.path.exists(path):
        logging.warning(f"File not found: {path}")
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)

# ---------- GRAPH CONSTRUCTION ----------
class LearningGraphBuilder:
    def __init__(self):
        self.G = nx.MultiDiGraph()  # MultiDiGraph allows multiple edges between same nodes

    # --- Node adders ---
    def add_word_node(self, word: str, properties: Dict):
        self.G.add_node(word, type="word", **properties)

    def add_collocation_node(self, phrase: str, base_word: str, properties: Dict):
        node_id = f"colloc::{phrase}"  # ensure uniqueness
        self.G.add_node(node_id, type="collocation", phrase=phrase, base_word=base_word, **properties)
        return node_id

    def add_lesson_node(self, lesson_id: str, properties: Dict):
        self.G.add_node(f"lesson::{lesson_id}", type="lesson", **properties)

    def add_grammar_node(self, grammar_id: str, properties: Dict):
        self.G.add_node(f"grammar::{grammar_id}", type="grammar", **properties)

    def add_quiz_node(self, quiz_id: str, properties: Dict):
        self.G.add_node(f"quiz::{quiz_id}", type="quiz", **properties)

    def add_exam_node(self, exam_id: str, properties: Dict):
        self.G.add_node(f"exam::{exam_id}", type="exam", **properties)

    def add_blog_node(self, slug: str, properties: Dict):
        self.G.add_node(f"blog::{slug}", type="blog", **properties)

    def add_audio_node(self, word: str, file: str, properties: Dict):
        node_id = f"audio::{word}::{file}"
        self.G.add_node(node_id, type="audio", word=word, file=file, **properties)
        return node_id

    # --- Edge adders ---
    def add_edge(self, u, v, rel_type: str, weight: float = 1.0, **metadata):
        self.G.add_edge(u, v, relation=rel_type, weight=weight, **metadata)

    # --- Build functions ---
    def build_word_relations(self):
        """Synonyms, antonyms, derivations (runner from run), collocations, related concepts."""
        words = load_json(WORD_DATA)
        # Build lookup for fast access
        word_dict = {w["word"].lower(): w for w in words}
        for w in words:
            word = w["word"].lower()
            # Add node if not already present (properties may be enriched later)
            if not self.G.has_node(word):
                self.add_word_node(word, w)

            # Synonyms
            if "synonyms" in w:
                for syn in w["synonyms"]:
                    syn = syn.lower()
                    if syn in word_dict:
                        self.add_edge(word, syn, "synonym", weight=0.9)

            # Antonyms
            if "antonyms" in w:
                for ant in w["antonyms"]:
                    ant = ant.lower()
                    if ant in word_dict:
                        self.add_edge(word, ant, "antonym", weight=0.8)

            # Collocations (from separate file)
            # We'll handle them in build_collocations() but we can pre-create edges to colloc nodes

            # Derivations using spaCy (e.g., run -> runner, running)
            if USE_SPACY and "pos" in w and w["pos"] in ["verb", "noun"]:
                try:
                    lemma = nlp(word)[0].lemma_
                    # Find words that have this lemma as their root
                    for other_word, other_data in word_dict.items():
                        if other_word == word:
                            continue
                        # simplistic: other_word starts with lemma or ends with typical suffixes
                        if other_word.startswith(lemma) and other_word != lemma:
                            # check if it's a known derivation
                            self.add_edge(word, other_word, "derivation", weight=0.7)
                except:
                    pass

    def build_collocations(self):
        """Load collocations and link to base words."""
        collocs = load_json(COLLOCATION_DATA)
        for c in collocs:
            base = c.get("base_word", "").lower()
            phrase = c.get("collocation", "").lower()
            if not base or not phrase:
                continue
            # Add base word node if not exists
            if not self.G.has_node(base):
                self.G.add_node(base, type="word", pos=c.get("pos", ""))
            # Add collocation node
            colloc_id = self.add_collocation_node(phrase, base, {"type": c.get("type", "phrasal_verb")})
            # Link base word → collocation
            self.add_edge(base, colloc_id, "collocation", weight=1.0)
            # Optionally, link collocation back to word
            self.add_edge(colloc_id, base, "base_word", weight=0.5)

    def build_grammar_relations(self):
        """Link words to grammar topics, and grammar to lessons."""
        topics = load_json(GRAMMAR_TOPICS)
        words = load_json(WORD_DATA)
        word_to_pos = {w["word"].lower(): w.get("pos", "") for w in words}

        for t in topics:
            gid = t["id"]
            self.add_grammar_node(gid, t)

            # If grammar topic lists example words
            for ex_word in t.get("example_words", []):
                w = ex_word.lower()
                if w in word_to_pos:
                    self.add_edge(w, f"grammar::{gid}", "grammar_topic", weight=0.9)

            # Auto‑link based on POS: e.g., "verbs" topic connects to all verb words
            category = t.get("category", "").lower()
            if category in ["verbs", "nouns", "adjectives", "adverbs", "prepositions"]:
                for word, pos in word_to_pos.items():
                    if pos and category in pos.lower():
                        self.add_edge(word, f"grammar::{gid}", "grammar_pos_match", weight=0.6)

    def build_lesson_relations(self):
        """Connect lessons to words, grammar topics, and quizzes."""
        lessons = load_json(LESSON_DATA)
        for les in lessons:
            lid = les["id"]
            self.add_lesson_node(lid, les)

            # Words taught
            for word in les.get("words", []):
                word = word.lower()
                if self.G.has_node(word):
                    self.add_edge(word, f"lesson::{lid}", "taught_in", weight=0.8)
                else:
                    self.add_word_node(word, {"pos": ""})
                    self.add_edge(word, f"lesson::{lid}", "taught_in", weight=0.8)

            # Grammar covered
            for gid in les.get("grammar_ids", []):
                self.add_edge(f"lesson::{lid}", f"grammar::{gid}", "covers", weight=0.9)

            # Quiz associations (if quizzes reference lesson)
            # Will be done in build_quiz_relations

    def build_quiz_relations(self):
        """Link quizzes to words, lessons, and exams."""
        quizzes = load_json(QUIZ_DATA)
        for quiz in quizzes:
            qid = quiz["id"]
            self.add_quiz_node(qid, quiz)

            # Tested words
            for word in quiz.get("words", []):
                word = word.lower()
                if not self.G.has_node(word):
                    self.add_word_node(word, {"pos": ""})
                self.add_edge(word, f"quiz::{qid}", "tested_in", weight=0.7)

            # Lesson association
            if "lesson_id" in quiz:
                self.add_edge(f"lesson::{quiz['lesson_id']}", f"quiz::{qid}", "has_quiz", weight=1.0)

            # Exam association (if part of an exam)
            # Handled in build_exam_relations

    def build_exam_relations(self):
        """Connect exams to quizzes and word lists."""
        exams = load_json(EXAM_DATA)
        for exam in exams:
            eid = exam["id"]
            self.add_exam_node(eid, exam)

            # Quizzes inside exam
            for qid in exam.get("quiz_ids", []):
                self.add_edge(f"exam::{eid}", f"quiz::{qid}", "contains", weight=0.9)

            # Important words for exam
            for word in exam.get("vocabulary", []):
                word = word.lower()
                if not self.G.has_node(word):
                    self.add_word_node(word, {})
                self.add_edge(word, f"exam::{eid}", "important_for_exam", weight=1.0)

    def build_blog_relations(self):
        """Link blogs to words and lessons they mention."""
        blogs = load_json(BLOG_DATA)
        for blog in blogs:
            slug = blog["slug"]
            self.add_blog_node(slug, blog)

            for word in blog.get("linked_words", []):
                word = word.lower()
                if not self.G.has_node(word):
                    self.add_word_node(word, {})
                self.add_edge(f"blog::{slug}", word, "references", weight=0.5)

            for lid in blog.get("lesson_ids", []):
                self.add_edge(f"blog::{slug}", f"lesson::{lid}", "recommends_lesson", weight=0.7)

    def build_audio_relations(self):
        """Link audio nodes to words."""
        audios = load_json(AUDIO_DATA)
        for a in audios:
            word = a["word"].lower()
            file = a["file"]
            props = {"accent": a.get("accent", "us")}
            audio_id = self.add_audio_node(word, file, props)
            self.add_edge(word, audio_id, "has_audio", weight=1.0)

    def build_semantic_relations(self):
        """
        Advanced: Use word embeddings (e.g., fastText) to find top-N related words
        and add 'related_concept' edges. This requires a pre-trained model.
        """
        # Placeholder – you can integrate gensim's fastText or glove
        pass

    # ---------- ENRICHMENT ----------
    def propagate_weights(self):
        """Use PageRank or HITS to compute node importance scores."""
        pr = nx.pagerank(self.G, weight='weight')
        nx.set_node_attributes(self.G, pr, "pagerank")
        logging.info("PageRank computed and stored as node attribute 'pagerank'.")

    def save_graph(self):
        ensure_dir(OUTPUT_DIR)
        nx.write_gexf(self.G, GRAPH_FILE)
        logging.info(f"Graph saved to {GRAPH_FILE} ({self.G.number_of_nodes()} nodes, {self.G.number_of_edges()} edges).")

        # Also export edge lists for easy ingestion
        edges_csv = os.path.join(OUTPUT_DIR, "all_edges.csv")
        with open(edges_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["source", "target", "relation", "weight"])
            for u, v, data in self.G.edges(data=True):
                writer.writerow([u, v, data.get("relation", ""), data.get("weight", 1.0)])
        logging.info(f"Edge list saved to {edges_csv}")

# ---------- MAIN ----------
def main():
    builder = LearningGraphBuilder()
    logging.info("Building word relations...")
    builder.build_word_relations()
    logging.info("Building collocations...")
    builder.build_collocations()
    logging.info("Building grammar relations...")
    builder.build_grammar_relations()
    logging.info("Building lesson relations...")
    builder.build_lesson_relations()
    logging.info("Building quiz relations...")
    builder.build_quiz_relations()
    logging.info("Building exam relations...")
    builder.build_exam_relations()
    logging.info("Building blog relations...")
    builder.build_blog_relations()
    logging.info("Building audio relations...")
    builder.build_audio_relations()
    logging.info("Building semantic relations...")
    builder.build_semantic_relations()
    logging.info("Propagating node importance...")
    builder.propagate_weights()
    logging.info("Saving graph...")
    builder.save_graph()
    logging.info("Done! Graph ready for downstream tasks.")

if __name__ == "__main__":
    main()