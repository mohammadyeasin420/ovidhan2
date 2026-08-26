#!/usr/bin/env python3
"""Phase 7A3C: high-confidence quality gate and extensionless URL recovery plan."""

from __future__ import annotations

import csv
import importlib.util
import json
import re
import subprocess
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
START_SHA = "b3eab99e3b427813cb981677e32d2a1b2ff5c8ba"
TIER_A_JUDGMENTS = {
    "net": "EDITORIAL_PRIORITY",
    "translation": "EDITORIAL_PRIORITY",
    "tradeoff": "EDITORIAL_PRIORITY",
    "walmart": "PROTECT_NO_EDITORIAL_EXPANSION",
    "slytherin": "PROTECT_NO_EDITORIAL_EXPANSION",
}
TEXT_EXTENSIONS = {".html", ".js", ".json", ".xml", ".py", ".md", ".txt", ".csv"}
PRE_M1_BATCH = ["net", "translation", "tradeoff", "without", "must", "provision", "accordance", "creating", "producing", "during", "wallet", "integration", "smaller", "street"]


def load_7a3b_module():
    path = ROOT / "scripts/dictionary-opportunity-7a3b.py"
    spec = importlib.util.spec_from_file_location("dictionary_opportunity_7a3b", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(module)
    return module


B = load_7a3b_module()


def git_files(directory: str = ".") -> list[str]:
    output = subprocess.check_output(["git", "ls-files", "-z", "--", directory], cwd=ROOT)
    return [item.decode("utf-8").replace("\\", "/") for item in output.split(b"\0") if item]


def normalized(value: object) -> str:
    return unicodedata.normalize("NFC", str(value or "").strip()).lower()


def parse_number(value: str | None) -> float | None:
    return None if value in (None, "") else float(value)


def extract_english_objects(path: str) -> set[str]:
    text = (ROOT / path).read_text(encoding="utf-8")
    return {normalized(value) for value in re.findall(r"\benglish\s*:\s*[\"']([^\"']+)[\"']", text, re.I)}


def extract_ielts_table(path: str) -> set[str]:
    text = (ROOT / path).read_text(encoding="utf-8")
    words = {normalized(re.sub(r"<[^>]+>", "", value)) for value in re.findall(r"<td>\s*<strong>(.*?)</strong>\s*</td>", text, re.I | re.S)}
    if not words:
        raise AssertionError(f"Explicit curated IELTS source yielded zero words: {path}")
    required = {"acquire", "analyse", "assess", "benefit"}
    assert required <= words, f"IELTS table missing known source examples: {sorted(required - words)}"
    return words


def learner_value_sources() -> dict[str, set[str]]:
    common = {normalized(item["word"]) for item in json.loads((ROOT / "5000-common-words-data.json").read_text(encoding="utf-8"))}
    basic_html = (ROOT / "basic-vocabulary-list.html").read_text(encoding="utf-8")
    basic = {normalized(value) for value in re.findall(r'data-word=["\']([^"\']+)["\']', basic_html, re.I)}
    daily_html = (ROOT / "1000-daily-use-english-words-bangla.html").read_text(encoding="utf-8")
    daily = {normalized(value) for value in re.findall(r"\b(?:word|english)\s*:\s*[\"']([^\"']+)[\"']", daily_html, re.I)}
    business_html = (ROOT / "business-vocabulary-bangla.html").read_text(encoding="utf-8")
    business = {normalized(re.sub(r"^\d+\.\s*", "", value)) for value in re.findall(r'<div class="en">([^<]+)</div>', business_html, re.I)}
    sources = {
        "bcs": extract_english_objects("bcs-500-words.html"),
        "ielts": extract_ielts_table("ielts-vocabulary-2026-bangla-meaning.html"),
        "bank_job": extract_english_objects("bank-job-vocabulary.html"),
        "business_workplace": business,
        "basic_vocabulary": basic,
        "daily_use": daily,
        "common_5000": common,
    }
    empty = sorted(name for name, words in sources.items() if not words)
    assert not empty, f"Explicit curated learner sources yielded zero words: {empty}"
    return sources


SOURCE_PATHS = {
    "bcs": "bcs-500-words.html",
    "ielts": "ielts-vocabulary-2026-bangla-meaning.html",
    "bank_job": "bank-job-vocabulary.html",
    "business_workplace": "business-vocabulary-bangla.html",
    "basic_vocabulary": "basic-vocabulary-list.html",
    "daily_use": "1000-daily-use-english-words-bangla.html",
    "common_5000": "5000-common-words-data.json",
}


def learner_evidence(slug: str, sources: dict[str, set[str]]) -> dict:
    memberships = sorted(name for name, words in sources.items() if slug in words)
    return {
        "bcs": "KNOWN_POSITIVE" if "bcs" in memberships else "UNKNOWN",
        "ielts": "KNOWN_POSITIVE" if "ielts" in memberships else "UNKNOWN",
        "job_workplace": "KNOWN_POSITIVE" if {"bank_job", "business_workplace"}.intersection(memberships) else "UNKNOWN",
        "general_english": "KNOWN_POSITIVE" if {"common_5000", "basic_vocabulary", "daily_use"}.intersection(memberships) else "UNKNOWN",
        "sources": [SOURCE_PATHS[name] for name in memberships],
    }


def lexical_form_relation(slug: str, dictionary_by_word: dict) -> str | None:
    entry = dictionary_by_word.get(normalized(slug))
    if not entry:
        return None
    record = entry[1]
    candidates = []
    if slug.endswith("ing") and len(slug) > 5:
        candidates.extend((slug[:-3], slug[:-3] + "e"))
    if slug.endswith("er") and len(slug) > 4:
        candidates.append(slug[:-2])
    evidence_terms = {normalized(x) for x in record.get("synonyms", []) if isinstance(x, str)}
    definition_first = normalized(record.get("definition")).split(" ", 1)[0]
    for base in candidates:
        if base in dictionary_by_word and f"word/{base}.html" in TRACKED_FILES and (base in evidence_terms or base == definition_first):
            return base
    return None


def semantic_gate(slug: str, evidence: dict, dictionary_by_word: dict, manual: str | None = None) -> tuple[str, str | None]:
    if slug in {"walmart", "slytherin"}:
        return "PROPER_NAME_BRAND_OR_ENTITY", None
    base = lexical_form_relation(slug, dictionary_by_word)
    if base:
        return "INFLECTED_OR_DERIVED_FORM", base
    if evidence["bcs"] == "KNOWN_POSITIVE" or evidence["ielts"] == "KNOWN_POSITIVE":
        return "CORE_LEARNING_WORD", None
    if evidence["job_workplace"] == "KNOWN_POSITIVE":
        return "VALID_SECONDARY_WORD", None
    if evidence["general_english"] == "KNOWN_POSITIVE":
        return "VALID_SECONDARY_WORD", None
    if manual == "EDITORIAL_PRIORITY":
        return "VALID_SECONDARY_WORD", None
    return "UNKNOWN_REQUIRES_HUMAN_REVIEW", None


def inventory_context():
    dictionary = json.loads((ROOT / "enriched-dictionary.json").read_text(encoding="utf-8"))
    dictionary_by_word = {}
    for index, entry in enumerate(dictionary):
        key = normalized(entry.get("english") or entry.get("word") or entry.get("en"))
        if key and key not in dictionary_by_word:
            dictionary_by_word[key] = (index, entry)
    pilot = json.loads((ROOT / "data/seo-word-pilot-7a1.json").read_text(encoding="utf-8"))
    architecture_evidence = json.loads((ROOT / "reports/seo-word-pilot-7a1-baseline-architecture.json").read_text(encoding="utf-8"))
    audit = json.loads((ROOT / "reports/seo-word-pilot-7a1-editorial-review.json").read_text(encoding="utf-8"))
    approved = {normalized(x) for x in pilot["approved_population"]}
    rejected = {normalized(x["slug"]) for x in audit["entries"]} - approved
    treatment = {normalized(x["slug"]) for x in pilot["entries"] if x["group"] == "treatment"}
    control = {normalized(x["slug"]) for x in pilot["entries"] if x["group"] == "control"}
    static_core = {normalized(x["slug"]) for x in architecture_evidence["entries"] if x["baseline_architecture"] == "STATIC_CORE"}
    sitemap_text = "\n".join((ROOT / name).read_text(encoding="utf-8") for name in git_files() if re.match(r"^sitemap(?:-index|-part-\d+)?\.xml$", name, re.I))
    sitemap_urls = {B.normalize_url(x) for x in re.findall(r"<loc>([^<]+)</loc>", sitemap_text)}
    return dictionary_by_word, approved, rejected, treatment, control, static_core, sitemap_urls, sitemap_text


def inspect_target(slug: str, context: tuple) -> dict:
    dictionary_by_word, approved, rejected, treatment, control, static_core, sitemap_urls, _ = context
    key = normalized(slug)
    target_file = ROOT / "word" / f"{slug}.html"
    exists = target_file.is_file() and f"word/{slug}.html" in TRACKED_FILES
    html = target_file.read_text(encoding="utf-8") if exists else ""
    canonical_match = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)', html, re.I) or re.search(r'<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\']canonical', html, re.I)
    canonical = None
    if canonical_match:
        try:
            canonical = B.normalize_url(canonical_match.group(1))
        except Exception:
            canonical = canonical_match.group(1)
    target_url = B.expected_url(slug)
    found = dictionary_by_word.get(key)
    fields = B.lexical_fields(found[1] if found else None)
    if key in static_core:
        architecture = "STATIC_CORE"
    elif key in treatment:
        architecture = "7A1_TREATMENT_STATIC"
    elif key in control:
        architecture = "7A1_CONTROL_JS_SHELL"
    elif re.search(r'id=["\']staticWordContent["\']', html, re.I):
        architecture = "OTHER_STATIC"
    elif "learning-explorer.js" in html:
        architecture = "OTHER_JS_SHELL"
    else:
        architecture = "UNKNOWN_REQUIRES_REVIEW"
    editorial = "approved" if key in approved else "rejected" if key in rejected else "unreviewed"
    if found is None or editorial == "rejected" or not exists:
        readiness = "REVIEW_REQUIRED"
    elif fields["bangla"] and fields["definition"] and fields["pos"]:
        readiness = "READY_STRONG"
    elif any(fields[x] for x in ("bangla", "definition", "pos", "usable_example")):
        readiness = "READY_PARTIAL"
    else:
        readiness = "WEAK_DATA"
    return {
        "target_exists": exists, "target_url": target_url, "target_canonical": canonical,
        "target_canonical_matches": canonical == target_url, "target_in_sitemap": target_url in sitemap_urls,
        "dictionary_record_exists": found is not None, "target_architecture": architecture,
        "target_data_readiness": readiness, "target_editorial_status": editorial,
    }


def reconstruct_observed_inventory(inputs: dict, context: tuple) -> list[dict]:
    dictionary_by_word, approved, rejected, treatment, control, static_core, sitemap_urls, _ = context
    performance_raw = []
    for raw_url, clicks, impressions, ctr, position in inputs["page_rows"]:
        url = B.normalize_url(raw_url)
        if urlsplit(url).path.startswith("/word/"):
            performance_raw.append({"url": url, "clicks": float(clicks or 0), "impressions": float(impressions or 0), "ctr": float(ctr or 0), "position": float(position or 0)})
    performance, _ = B.merge_performance(performance_raw)
    B.add_scores(list(performance.values()))
    rows = []
    for url, p in performance.items():
        path = urlsplit(url).path
        if not path.endswith(".html") or url not in sitemap_urls:
            continue
        slug = normalized(path[len("/word/"):-5])
        file = ROOT / "word" / f"{slug}.html"
        if not file.is_file() or f"word/{slug}.html" not in TRACKED_FILES:
            continue
        key = normalized(slug)
        found = dictionary_by_word.get(key)
        fields = B.lexical_fields(found[1] if found else None)
        html = file.read_text(encoding="utf-8")
        has_static = bool(re.search(r'id=["\']staticWordContent["\']', html, re.I))
        if key in static_core:
            architecture = "STATIC_CORE"
        elif key in treatment:
            architecture = "7A1_TREATMENT_STATIC"
        elif key in control:
            architecture = "7A1_CONTROL_JS_SHELL"
        elif has_static:
            architecture = "OTHER_STATIC"
        elif "learning-explorer.js" in html:
            architecture = "OTHER_JS_SHELL"
        else:
            architecture = "UNKNOWN_REQUIRES_REVIEW"
        structural = []
        if len(slug) <= 2: structural.append("slug_length_le_2")
        if not slug: structural.append("empty_slug")
        if re.search(r"\d", slug): structural.append("contains_digits")
        if len(slug) >= 30: structural.append("unusually_long_slug_ge_30")
        if not found: structural.append("dictionary_record_missing")
        if B.has_url_template_leak(html): structural.append("html_url_context_literal_template_pattern")
        if url not in sitemap_urls: structural.append("page_not_in_sitemap")
        content = []
        if found and not fields["bangla"]: content.append("missing_bangla")
        if found and not fields["definition"]: content.append("missing_definition")
        if found and not fields["pos"]: content.append("missing_pos")
        row = {
            "slug": slug, "url": url, "dictionary_index": found[0] if found else None, "fields": fields,
            "architecture": architecture, "editorial_status": "approved" if key in approved else "rejected" if key in rejected else "unreviewed",
            "structural_anomaly_flags": structural, "structural_risk_count": len(structural), "content_quality_flags": content,
            "architecture_flags": ["generic_js_shell"] if architecture.endswith("JS_SHELL") else [],
            "performance_state": "OBSERVED", "coverage_state": "UNKNOWN", "coverage_validation_status": None,
            "clicks": p["clicks"], "impressions": p["impressions"], "ctr": p["ctr"], "position": p["position"],
            "search_value_score": p["search_value_score"], "search_improvement_score": p["search_improvement_score"],
            "click_percentile": p["click_percentile"], "acquisition_score_contribution": p["acquisition_score_contribution"],
        }
        row["data_readiness"] = B.data_readiness(row)
        B.classify(row)
        row["reason"] = B.reason(row)
        rows.append(row)
    assert len(rows) == 839, f"Expected 839 canonical observed inventory rows, got {len(rows)}"
    return rows


def scan_exact_extensionless_occurrences(slugs: list[str]) -> tuple[dict[str, dict], list[dict]]:
    evidence = {slug: {"sitemap": [], "canonical": [], "href_src": [], "js_generated": [], "structured_data": [], "repository_html": [], "other": []} for slug in slugs}
    generic_sources = []
    slug_pattern = "|".join(re.escape(slug) for slug in sorted(slugs, key=len, reverse=True))
    exact = re.compile(rf"/word/({slug_pattern})(?![A-Za-z0-9_.-]|\.html)", re.I)
    generic = re.compile(r"/word/(?:\$\{|\{\{|[\"']?\s*\+)", re.I)
    for relative in TRACKED_FILES:
        # Generated analysis artifacts preserve observed URLs but are not live URL sources.
        if relative.startswith("reports/"):
            continue
        path = ROOT / relative
        if path.suffix.lower() not in TEXT_EXTENSIONS:
            continue
        try:
            with path.open("r", encoding="utf-8", errors="replace") as handle:
                for line_number, line in enumerate(handle, 1):
                    if "/word/" not in line:
                        continue
                    if generic.search(line) and ".html" not in line:
                        generic_sources.append({"file": relative, "line": line_number, "context": line.strip()[:240]})
                    for match in exact.finditer(line):
                        slug = normalized(match.group(1))
                        context = line.strip()[:300]
                        record = {"file": relative, "line": line_number, "context": context}
                        lower = line.lower()
                        if relative.startswith("sitemap") and "<loc>" in lower:
                            category = "sitemap"
                        elif "canonical" in lower:
                            category = "canonical"
                        elif re.search(r"(?:href|src)\s*=", line, re.I):
                            category = "href_src"
                        elif "application/ld+json" in lower or '"@type"' in lower:
                            category = "structured_data"
                        elif path.suffix.lower() == ".js" or "${" in line or re.search(r"/word/[\"']?\s*\+", line):
                            category = "js_generated"
                        elif path.suffix.lower() == ".html":
                            category = "repository_html"
                        else:
                            category = "other"
                        evidence[slug][category].append(record)
        except OSError:
            continue
    unique_generic = {(x["file"], x["line"]): x for x in generic_sources}
    return evidence, [unique_generic[key] for key in sorted(unique_generic)]


def read_7a3b_candidates() -> list[dict]:
    rows = []
    with (ROOT / "reports/dictionary-opportunity-7a3b-candidates.csv").open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            for field in ("clicks", "impressions", "ctr", "position", "search_value_score", "search_improvement_score"):
                row[field] = parse_number(row[field])
            row["structural_risk_count"] = int(row["structural_risk_count"] or 0)
            rows.append(row)
    return rows


def internal_links(slug: str, evidence: dict) -> list[dict]:
    links = []
    for source in evidence["sources"]:
        if source.endswith(".json"):
            hub = "5000-common-english-words-bangla.html"
        else:
            hub = source
        links.append({"hub_to_word": f"/{hub} -> /word/{slug}.html", "word_to_hub": f"/word/{slug}.html -> /{hub}", "evidence_source": source})
    return links


def classify_extensionless(target_exists: bool, dictionary_exists: bool, exact_source_count: int, safe: bool) -> str:
    if not target_exists or not dictionary_exists:
        return "NO_VALID_TARGET"
    if exact_source_count:
        return "POSSIBLE_INTERNAL_SOURCE_BUG" if safe else "NEEDS_REVIEW"
    return "SAFE_301_TO_HTML" if safe else "NEEDS_REVIEW"


def run_tests() -> dict:
    sources = learner_value_sources()
    dictionary_by_word = inventory_context()[0]
    assert "net" in sources["bank_job"]
    assert len(sources["ielts"]) > 0 and {"acquire", "analyse", "assess", "benefit"} <= sources["ielts"]
    assert semantic_gate("walmart", learner_evidence("walmart", sources), dictionary_by_word)[0] == "PROPER_NAME_BRAND_OR_ENTITY"
    assert semantic_gate("translation", learner_evidence("translation", sources), dictionary_by_word, "EDITORIAL_PRIORITY")[0] in {"CORE_LEARNING_WORD", "VALID_SECONDARY_WORD"}
    assert learner_evidence("definitely-not-curated", sources)["general_english"] == "UNKNOWN"
    assert internal_links("net", learner_evidence("net", sources))
    assert semantic_gate("creating", learner_evidence("creating", sources), dictionary_by_word) == ("INFLECTED_OR_DERIVED_FORM", "create")
    assert semantic_gate("producing", learner_evidence("producing", sources), dictionary_by_word) == ("INFLECTED_OR_DERIVED_FORM", "produce")
    assert semantic_gate("smaller", learner_evidence("smaller", sources), dictionary_by_word) == ("INFLECTED_OR_DERIVED_FORM", "small")
    assert semantic_gate("during", learner_evidence("during", sources), dictionary_by_word)[0] != "INFLECTED_OR_DERIVED_FORM"
    assert classify_extensionless(True, True, 0, True) == "SAFE_301_TO_HTML"
    assert classify_extensionless(True, True, 1, True) == "POSSIBLE_INTERNAL_SOURCE_BUG"
    assert classify_extensionless(False, False, 0, False) == "NO_VALID_TARGET"
    return {"status": "PASS", "cases": 13}


def main() -> None:
    tests = run_tests()
    inputs = B.load_inputs(B.PERFORMANCE_PATH, B.COVERAGE_PATH)
    performance_rows = []
    for raw_url, clicks, impressions, _ctr, position in inputs["page_rows"]:
        url = B.normalize_url(raw_url)
        path = urlsplit(url).path
        if path.startswith("/word/") and not path.endswith(".html"):
            performance_rows.append({"gsc_url": url, "slug": normalized(path[len("/word/"):]), "clicks": float(clicks or 0), "impressions": float(impressions or 0), "position": float(position or 0)})
    assert len(performance_rows) == 95

    context = inventory_context()
    exact_evidence, generic_sources = scan_exact_extensionless_occurrences([row["slug"] for row in performance_rows])
    extensionless = []
    for row in sorted(performance_rows, key=lambda x: (-x["clicks"], -x["impressions"], x["slug"])):
        target = inspect_target(row["slug"], context)
        evidence = exact_evidence[row["slug"]]
        exact_count = sum(len(values) for values in evidence.values())
        safe = all((target["target_exists"], target["target_canonical_matches"], target["target_in_sitemap"], target["dictionary_record_exists"]))
        classification = classify_extensionless(target["target_exists"], target["dictionary_record_exists"], exact_count, safe)
        actions = ["URL_RECOVERY"] if safe else ["HUMAN_REVIEW"]
        extensionless.append({**row, **target, "occurrence_evidence": evidence, "repository_occurrence_count": exact_count, "generic_extensionless_generators_detected": len(generic_sources), "one_to_one_301_safe": safe, "classification": classification, "actions": actions})

    sources = learner_value_sources()
    candidates = reconstruct_observed_inventory(inputs, context)
    by_slug = {row["slug"]: row for row in candidates}
    dictionary_by_word = context[0]
    tier_a = []
    for slug, judgment in TIER_A_JUDGMENTS.items():
        row = by_slug[slug]
        evidence = learner_evidence(slug, sources)
        semantic, base = semantic_gate(slug, evidence, dictionary_by_word, judgment)
        tier_a.append({**row, "editorial_judgment": judgment, "semantic_class": semantic, "base_lemma": base, "learner_value": evidence, "actions": ["SEO_PROTECT", judgment], "internal_links": internal_links(slug, evidence) if judgment == "EDITORIAL_PRIORITY" else []})

    protection_register = []
    for row in candidates:
        if "PROTECT" not in row["priority_labels"]:
            continue
        evidence = learner_evidence(row["slug"], sources)
        semantic, base = semantic_gate(row["slug"], evidence, dictionary_by_word, TIER_A_JUDGMENTS.get(row["slug"]))
        actions = ["SEO_PROTECT"]
        if semantic == "UNKNOWN_REQUIRES_HUMAN_REVIEW":
            actions.append("HUMAN_REVIEW")
        if TIER_A_JUDGMENTS.get(row["slug"]):
            actions.append(TIER_A_JUDGMENTS[row["slug"]])
        protection_register.append({**row, "semantic_class": semantic, "base_lemma": base, "learner_value": evidence, "actions": sorted(set(actions))})
    protection_register.sort(key=lambda r: (-r["clicks"], -r["impressions"], r["slug"]))
    clicked_protected = {row["slug"] for row in protection_register if row["clicks"] > 0}
    assert clicked_protected == {"net", "translation", "tradeoff", "walmart", "slytherin", "ua"}, clicked_protected

    tier_b_source = [row for row in candidates if row["provisional_tier"] == "PROVISIONAL_TIER_B_CANDIDATE"]
    assert len(tier_b_source) == 824, f"Expected 824 corrected Tier-B candidates, got {len(tier_b_source)}"
    review_queue = []
    for row in tier_b_source:
        evidence = learner_evidence(row["slug"], sources)
        semantic, base = semantic_gate(row["slug"], evidence, dictionary_by_word)
        evidence_count = len(evidence["sources"])
        review_score = round((row["search_improvement_score"] or 0) + min(evidence_count, 3) * 8 + (8 if row["data_readiness"] == "READY_STRONG" else 3 if row["data_readiness"] == "READY_PARTIAL" else 0), 2)
        actions = []
        if (row["clicks"] or 0) > 0 or (row["impressions"] or 0) >= 5 or (row["position"] or 999) <= 20:
            actions.append("SEO_PROTECT")
        if evidence_count:
            actions.append("INTERNAL_LINK_OPPORTUNITY")
        if semantic in {"UNKNOWN_REQUIRES_HUMAN_REVIEW", "INFLECTED_OR_DERIVED_FORM"}:
            actions.append("HUMAN_REVIEW")
        elif row["data_readiness"] in {"WEAK_DATA", "READY_PARTIAL"}:
            actions.append("CONTENT_REPAIR")
        if not actions:
            actions.append("DEFER")
        review_queue.append({**row, "learner_value": evidence, "learner_evidence_count": evidence_count, "semantic_class": semantic, "base_lemma": base, "quality_gate_score": review_score, "actions": actions, "internal_links": internal_links(row["slug"], evidence)})
    review_queue.sort(key=lambda r: (-r["quality_gate_score"], -(r["impressions"] or 0), r["slug"]))
    tier_b_learner_count = sum(row["learner_evidence_count"] > 0 for row in review_queue)
    tier_b_semantic_counts = dict(Counter(row["semantic_class"] for row in review_queue))
    tier_b_source_intersections = {
        "bcs": sum(row["learner_value"]["bcs"] == "KNOWN_POSITIVE" for row in review_queue),
        "ielts": sum(row["learner_value"]["ielts"] == "KNOWN_POSITIVE" for row in review_queue),
        "job_workplace": sum(row["learner_value"]["job_workplace"] == "KNOWN_POSITIVE" for row in review_queue),
        "general_english": sum(row["learner_value"]["general_english"] == "KNOWN_POSITIVE" for row in review_queue),
    }
    tier_b_inflected_relations = [{"slug": row["slug"], "base_lemma": row["base_lemma"]} for row in review_queue if row["semantic_class"] == "INFLECTED_OR_DERIVED_FORM"]
    review_queue = review_queue[:100]

    editorial_pool = [row for row in review_queue if row["semantic_class"] in {"CORE_LEARNING_WORD", "VALID_SECONDARY_WORD"} and row["learner_evidence_count"] > 0 and row["structural_risk_count"] == 0 and row["data_readiness"] in {"READY_STRONG", "READY_PARTIAL", "WEAK_DATA"}]
    first_batch = []
    for row in tier_a:
        if row["editorial_judgment"] == "EDITORIAL_PRIORITY":
            first_batch.append({**row, "batch_reason": "Explicit 7A3C human judgment plus observed Google value"})
    for row in editorial_pool:
        if row["slug"] in {x["slug"] for x in first_batch}:
            continue
        first_batch.append({**row, "actions": sorted(set(row["actions"] + ["EDITORIAL_PRIORITY"])), "batch_reason": "Observed demand plus explicit curated learner evidence and technical safety"})
        if len(first_batch) == 20:
            break

    coverage_urls = set()
    for raw_url, _last, _status in inputs["coverage_rows"]:
        coverage_urls.add(B.normalize_url(raw_url))
    treatment_control = context[3] | context[4]
    action_queue_by_slug = {row["slug"]: row for row in review_queue}
    action_queue_by_slug.update({row["slug"]: row for row in protection_register})
    action_queue = list(action_queue_by_slug.values())
    summary = {
        "schema": "ovidhan-dictionary-opportunity-7a3c-summary-v1", "starting_sha": START_SHA,
        "input_hashes": {"performance": B.sha256(B.PERFORMANCE_PATH), "coverage": B.sha256(B.COVERAGE_PATH)},
        "extensionless": {"observed_urls": len(extensionless), "mapped_to_tracked_html": sum(x["target_exists"] for x in extensionless), "safe_redirect_candidates": sum(x["one_to_one_301_safe"] for x in extensionless), "unresolved": sum(not x["one_to_one_301_safe"] for x in extensionless), "suspected_internal_source_leak": sum(x["classification"] == "POSSIBLE_INTERNAL_SOURCE_BUG" for x in extensionless), "classification_counts": dict(Counter(x["classification"] for x in extensionless)), "generic_source_candidates": generic_sources},
        "tier_a_quality_gate": [{k: row[k] for k in ("slug", "url", "clicks", "impressions", "position", "editorial_judgment", "semantic_class", "base_lemma", "actions", "learner_value")} for row in tier_a],
        "protection_register": {"size": len(protection_register), "clicked_urls": [x["url"] for x in protection_register if x["clicks"] > 0], "action_counts": dict(Counter(action for x in protection_register for action in x["actions"]))},
        "review_queue": {"tier_b_total_considered": len(tier_b_source), "tier_b_pages_with_learner_value_evidence": tier_b_learner_count, "tier_b_learner_source_intersections": tier_b_source_intersections, "tier_b_semantic_counts": tier_b_semantic_counts, "tier_b_inflected_relations": tier_b_inflected_relations, "size": len(review_queue), "semantic_counts": dict(Counter(x["semantic_class"] for x in review_queue)), "pages_with_learner_value_evidence": sum(x["learner_evidence_count"] > 0 for x in review_queue), "action_counts": dict(Counter(action for x in review_queue for action in x["actions"]))},
        "previous_first_batch": PRE_M1_BATCH,
        "first_batch": [{"slug": x["slug"], "url": x["url"], "actions": x["actions"], "semantic_class": x["semantic_class"], "base_lemma": x.get("base_lemma"), "learner_value": x["learner_value"], "internal_links": x.get("internal_links", []), "reason": x["batch_reason"]} for x in first_batch],
        "required_counts": {"pages_with_clicks": sum((x.get("clicks") or 0) > 0 for x in action_queue), "pages_with_learner_value_evidence": sum(bool(x["learner_value"]["sources"]) for x in action_queue), "proper_name_entity_noise_review": sum(x["semantic_class"] in {"PROPER_NAME_BRAND_OR_ENTITY", "SUSPICIOUS_OR_NOISY", "UNKNOWN_REQUIRES_HUMAN_REVIEW"} for x in action_queue), "editorial_priority": len(first_batch), "first_batch_size": len(first_batch), "internal_link_opportunities": sum(len(x.get("internal_links", [])) for x in first_batch), "overlap_7a1": sum(x["slug"] in treatment_control for x in action_queue), "coverage_backlog_overlap": sum(x["url"] in coverage_urls for x in action_queue)},
        "learner_value_sources": {name: {"path": SOURCE_PATHS[name], "word_count": len(words)} for name, words in sources.items()},
        "page_template_specification": page_template_specification(), "tests": tests,
    }
    write_extensionless(extensionless)
    write_review_queue(review_queue)
    write_protection_register(protection_register)
    safe_redirects = [x for x in extensionless if x["one_to_one_301_safe"]]
    if safe_redirects:
        lines = ["# PROPOSAL ONLY — Phase 7A3C; do not deploy", "# One-to-one permanent redirects validated against tracked canonical .html targets"]
        lines += [f"/word/{x['slug']} /word/{x['slug']}.html 301" for x in sorted(safe_redirects, key=lambda x: x["slug"])]
        (ROOT / "reports/dictionary-opportunity-7a3c-redirect-proposal.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    (ROOT / "reports/dictionary-opportunity-7a3c-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ROOT / "reports/dictionary-opportunity-7a3c.md").write_text(render_report(summary, extensionless, review_queue), encoding="utf-8")
    print(json.dumps({"status": "PASS", "extensionless": summary["extensionless"], "protection_register": summary["protection_register"], "review_queue": summary["review_queue"], "required_counts": summary["required_counts"], "ielts_extracted": len(sources["ielts"]), "old_batch": PRE_M1_BATCH, "first_batch": [x["slug"] for x in first_batch]}, indent=2))


def write_extensionless(rows: list[dict]) -> None:
    columns = ["gsc_url", "slug", "clicks", "impressions", "position", "target_exists", "target_url", "target_canonical", "target_canonical_matches", "target_in_sitemap", "dictionary_record_exists", "target_architecture", "target_data_readiness", "target_editorial_status", "in_sitemap_extensionless", "in_canonical_extensionless", "in_href_src_extensionless", "in_js_generated_extensionless", "in_structured_data_extensionless", "in_repository_html_extensionless", "repository_occurrence_count", "one_to_one_301_safe", "classification", "actions"]
    with (ROOT / "reports/dictionary-opportunity-7a3c-extensionless.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        for row in rows:
            e = row["occurrence_evidence"]
            writer.writerow({**{key: row.get(key) for key in columns}, "in_sitemap_extensionless": bool(e["sitemap"]), "in_canonical_extensionless": bool(e["canonical"]), "in_href_src_extensionless": bool(e["href_src"]), "in_js_generated_extensionless": bool(e["js_generated"]), "in_structured_data_extensionless": bool(e["structured_data"]), "in_repository_html_extensionless": bool(e["repository_html"]), "actions": "|".join(row["actions"])})


def write_review_queue(rows: list[dict]) -> None:
    columns = ["rank", "slug", "url", "clicks", "impressions", "position", "search_value_score", "search_improvement_score", "data_readiness", "architecture", "editorial_status", "structural_risk_count", "learner_value_bcs", "learner_value_ielts", "learner_value_job_workplace", "learner_value_general_english", "learner_evidence_sources", "semantic_class", "base_lemma", "quality_gate_score", "actions", "internal_link_opportunity_count", "reason"]
    with (ROOT / "reports/dictionary-opportunity-7a3c-review-queue.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        for rank, row in enumerate(rows, 1):
            evidence = row["learner_value"]
            writer.writerow({"rank": rank, "slug": row["slug"], "url": row["url"], "clicks": row["clicks"], "impressions": row["impressions"], "position": row["position"], "search_value_score": row["search_value_score"], "search_improvement_score": row["search_improvement_score"], "data_readiness": row["data_readiness"], "architecture": row["architecture"], "editorial_status": row["editorial_status"], "structural_risk_count": row["structural_risk_count"], "learner_value_bcs": evidence["bcs"], "learner_value_ielts": evidence["ielts"], "learner_value_job_workplace": evidence["job_workplace"], "learner_value_general_english": evidence["general_english"], "learner_evidence_sources": "|".join(evidence["sources"]), "semantic_class": row["semantic_class"], "base_lemma": row.get("base_lemma") or "", "quality_gate_score": row["quality_gate_score"], "actions": "|".join(row["actions"]), "internal_link_opportunity_count": len(row["internal_links"]), "reason": row["reason"]})


def write_protection_register(rows: list[dict]) -> None:
    columns = ["slug", "url", "clicks", "impressions", "position", "data_readiness", "architecture", "editorial_status", "priority_evidence", "semantic_class", "base_lemma", "learner_evidence_sources", "actions", "reason"]
    with (ROOT / "reports/dictionary-opportunity-7a3c-protect.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        for row in rows:
            writer.writerow({"slug": row["slug"], "url": row["url"], "clicks": row["clicks"], "impressions": row["impressions"], "position": row["position"], "data_readiness": row["data_readiness"], "architecture": row["architecture"], "editorial_status": row["editorial_status"], "priority_evidence": "|".join(row["priority_labels"]), "semantic_class": row["semantic_class"], "base_lemma": row.get("base_lemma") or "", "learner_evidence_sources": "|".join(row["learner_value"]["sources"]), "actions": "|".join(row["actions"]), "reason": row["reason"]})


def page_template_specification() -> dict:
    return {"principle": "SEARCH ANSWER → UNDERSTANDING → USE → PRACTICE → LEARNER PROGRESS", "constraint": "Render a module only when its underlying evidence is verified; never add filler for word count.", "modules": [
        {"name": "Instant Answer", "evidence": "English, Bangla, POS, pronunciation"},
        {"name": "Simple Meaning", "evidence": "reviewed learner-friendly English definition and Bangla explanation"},
        {"name": "Use It Correctly", "evidence": "reviewed natural contextual examples"},
        {"name": "Bangla Learner Mistake", "evidence": "verified confusion or L1-transfer evidence only"},
        {"name": "Word Family / Forms", "evidence": "verified lexical forms"},
        {"name": "Collocations", "evidence": "verified collocations"},
        {"name": "Similar / Confused Words", "evidence": "reviewed useful contrast"},
        {"name": "Goal Relevance", "evidence": "explicit BCS, IELTS, job, or speaking collection membership"},
        {"name": "30-Second Practice", "evidence": "deterministic exercise sourced from verified fields"},
        {"name": "Next Learning Step", "evidence": "contextual link to an existing relevant Ovidhan/Dakho learning page"},
    ]}


def render_report(s: dict, extensionless: list[dict], review: list[dict]) -> str:
    ext = s["extensionless"]
    batch = "\n".join(f"- `{x['slug']}` — {', '.join(x['actions'])}; {x['reason']}" + (f"; base lemma: `{x['base_lemma']}`" if x.get("base_lemma") else "") for x in s["first_batch"])
    tier_a = "\n".join(f"- `{x['slug']}`: **{x['editorial_judgment']}**; {x['semantic_class']}; {x['clicks']:g} clicks / {x['impressions']:g} impressions" for x in s["tier_a_quality_gate"])
    top_review = "\n".join(f"- `{x['slug']}` — score {x['quality_gate_score']:.2f}; {x['impressions']:g} impressions; {x['semantic_class']}; sources: {', '.join(x['learner_value']['sources']) or 'none'}" for x in review[:20])
    link_rows = "\n".join(f"- `{x['slug']}`: `{link['hub_to_word']}` and `{link['word_to_hub']}` (source: `{link['evidence_source']}`)" for x in s["first_batch"] for link in x["internal_links"])
    modules = "\n".join(f"{i}. **{x['name']}** — {x['evidence']}" for i, x in enumerate(s["page_template_specification"]["modules"], 1))
    return f"""# Phase 7A3C SEO Opportunity Quality Gate and URL Recovery Plan

Analysis and proposal only. No redirects, page changes, noindex decisions, deployments, or DNS changes were made.

## Extensionless URL forensic

- Observed extensionless GSC URLs: **{ext['observed_urls']}**
- Mapped to tracked `.html` targets: **{ext['mapped_to_tracked_html']}**
- Technically safe one-to-one 301 candidates: **{ext['safe_redirect_candidates']}**
- Unresolved: **{ext['unresolved']}**
- Suspected current internal source leak: **{ext['suspected_internal_source_leak']}**
- Classifications: `{json.dumps(ext['classification_counts'], sort_keys=True)}`

The analyzer searched tracked sitemap locations, canonical tags, href/src references, JavaScript URL construction, structured data, and repository HTML. Generic current extensionless generator candidates: **{len(ext['generic_source_candidates'])}**. Exact current repository sources creating these extensionless URLs: **{'none found' if ext['suspected_internal_source_leak'] == 0 else str(ext['suspected_internal_source_leak']) + ' URL(s) require source review'}**. Generated analysis reports are excluded because they preserve observations rather than create live URLs. A proposal file is generated only for rows whose tracked target, canonical, sitemap membership, and dictionary record all validate. It is not deployed.

## Tier-A human quality gate

{tier_a}

All five remain protected. `walmart` and `slytherin` receive no editorial-expansion recommendation and are not deletion/noindex candidates.

## Complete SEO protection register

- Protected canonical URLs: **{s['protection_register']['size']}**
- Clicked URLs protected: **{len(s['protection_register']['clicked_urls'])} / 6**
- Clicked set: {', '.join(f'`{x}`' for x in s['protection_register']['clicked_urls'])}

The separate protection CSV applies the unchanged 7A3B `PROTECT` rule across the complete observed canonical universe, independently of the bounded editorial-review queue. `ua` is retained as `SEO_PROTECT` plus human review and is not promoted to editorial priority.

## Bounded Tier-B review queue

- Queue size: **{s['review_queue']['size']}**
- Full corrected Tier-B candidates considered before bounding: **{s['review_queue']['tier_b_total_considered']}**
- Full Tier-B pages with explicit learner evidence: **{s['review_queue']['tier_b_pages_with_learner_value_evidence']}**
- Full Tier-B learner-source intersections: `{json.dumps(s['review_queue']['tier_b_learner_source_intersections'], sort_keys=True)}`
- Full Tier-B semantic counts: `{json.dumps(s['review_queue']['tier_b_semantic_counts'], sort_keys=True)}`
- High-confidence inflected/base relations: {', '.join(f"`{x['slug']} → {x['base_lemma']}`" for x in s['review_queue']['tier_b_inflected_relations']) or 'none'}
- Pages with explicit learner evidence: **{s['review_queue']['pages_with_learner_value_evidence']}**
- Semantic counts: `{json.dumps(s['review_queue']['semantic_counts'], sort_keys=True)}`
- Action counts: `{json.dumps(s['review_queue']['action_counts'], sort_keys=True)}`

{top_review}

Unknown learner evidence stays unknown. Automatic `CORE_LEARNING_WORD` or `VALID_SECONDARY_WORD` requires membership in a concrete repository collection; otherwise the queue uses `UNKNOWN_REQUIRES_HUMAN_REVIEW`.

The IELTS extractor reads **{s['learner_value_sources']['ielts']['word_count']}** real static-table entries. General-English collection membership is learner-value evidence but no longer proves `CORE_LEARNING_WORD`. High-confidence dictionary/page relations classify `creating → create`, `producing → produce`, and `smaller → small` as `INFLECTED_OR_DERIVED_FORM`; `during` is explicitly verified as a non-match.

## First recommended editorial batch

Batch size: **{s['required_counts']['first_batch_size']}** (maximum 20).

Pre-M1 batch: {', '.join(f'`{x}`' for x in PRE_M1_BATCH)}.

Corrected batch:

{batch}

## Internal-link opportunities

The first batch has **{s['required_counts']['internal_link_opportunities']}** evidence-backed bidirectional link opportunities. Each recommendation ties an existing curated hub to the word page and the word page back to that same relevant hub; no mass or irrelevant links are proposed.

{link_rows}

## Unique Ovidhan word-page specification

Principle: **{s['page_template_specification']['principle']}**.

{modules}

## Required counts

`{json.dumps(s['required_counts'], sort_keys=True)}`

## Reproduction and limitations

Run `python scripts/dictionary-opportunity-7a3c.py` with the same external GSC workbooks. The analysis validates the Phase 7A3B hashes/headers, preserves unknown states, keeps semantic classification conservative, and produces bounded 95-row and 100-row forensic/review artifacts. Embedded deterministic tests: **{s['tests']['status']} ({s['tests']['cases']} cases)**. Historical or external sources not present in Git cannot be proven by this repository scan.
"""


TRACKED_FILES = set(git_files())

if __name__ == "__main__":
    main()
