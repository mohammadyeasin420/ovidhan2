#!/usr/bin/env python3
"""Editorially gate Phase 2D Top 100 and freeze treatment/control cohorts."""

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import re
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
from pathlib import Path

GSC_PERIOD = "Last 3 months"
COUNTRY = "Bangladesh"
BASELINE_DATE = "2026-08-16"

REJECT = {
    "sinuous": "Bangla meaning 'পাপপূর্ণ' is incorrect for sinuous; no independent definition is present.",
    "sanguine": "Bangla meaning 'স্বচ্ছ' is incorrect for the relevant senses of sanguine.",
    "economical": "Bangla meaning 'অর্থনৈতিক' describes economic, not economical (cost-saving/frugal).",
    "monumental": "Bangla is an unexplained transliteration and no definition establishes a learner-useful sense.",
    "nun": "Bangla meaning uses the masculine/general 'সন্ন্যাসী'; the female sense is not represented accurately.",
    "subside": "Bangla value 'কম' is not a sufficient or grammatically correct rendering of the verb subside.",
    "slobber": "Bangla is an unsupported transliteration and no definition establishes the meaning.",
    "manipulate": "Bangla is only an unsupported transliteration and no definition establishes the intended sense.",
    "mess": "Bangla 'মেস' points to a different loanword sense and does not safely represent the primary headword.",
    "rant": "Bangla 'রন্ট' is a suspicious/malformed transliteration with no supporting definition.",
}

HUMAN_REVIEW = {
    "mayhem": "Bangla 'মারপিট' is narrower than mayhem and may select the wrong primary sense.",
    "on": "Bangla is only 'অন' and the definition covers a narrow adjective sense of a highly polysemous word.",
    "proprietary": "Bangla 'মালিকানা' is a noun while proprietary is commonly adjectival; sense/POS review is required.",
    "tire": "Bangla 'টায়ার' selects the US noun sense but the unqualified headword is polysemous and has no POS/definition.",
    "quilt": "Bangla is transliteration-only; confirm whether an explanatory Bangla equivalent is required.",
    "militant": "Bangla 'জঙ্গি' is narrower and more charged than the full adjective/noun meaning.",
    "terrific": "Bangla 'ভয়ঙ্কর' represents an older/literal sense and may mislead for the common modern sense 'excellent'.",
    "stalk": "Bangla 'ডালপালা' does not clearly identify the intended stem/stalk sense.",
    "swing": "Transliteration-only answer does not disambiguate the noun and verb senses.",
    "quarry": "Bangla 'খনন' describes excavation rather than clearly defining quarry as noun/verb.",
    "vanish": "Bangla 'অদৃশ্য' is adjectival and does not fully render the verb without editorial confirmation.",
    "equable": "Bangla 'সমান' is overly broad and may not convey even-tempered/uniform senses.",
    "hallmark": "Transliteration-only answer does not establish the characteristic/mark-of-quality sense.",
    "tear": "Transliteration-only answer does not disambiguate the tear/tear homographs.",
    "stroke": "Transliteration-only answer does not disambiguate medical, movement, mark, and verb senses.",
    "offset": "Transliteration-only answer does not identify the intended noun/verb/adjective sense.",
    "crunch": "Transliteration-only answer does not identify the sound, action, or shortage senses.",
    "squash": "Transliteration-only answer is ambiguous among verb, sport, and vegetable senses.",
}

SYNTHETIC_RE = re.compile(
    r"^(?:This is (?:an? )?[^.]+\.|I know the word ['\"].+['\"]\.|['\"].+['\"] is common in English\.|Can you use ['\"].+['\"] in a sentence\?)$",
    re.I,
)


def read_csv(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


def write_csv(path: Path, records: list[dict], fields: list[str] | None = None) -> None:
    fields = fields or list(records[0])
    with path.open("w", encoding="utf-8-sig", newline="") as fh:
        out = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
        out.writeheader(); out.writerows(records)


def has_text(value) -> bool:
    if isinstance(value, list):
        return any(has_text(x) for x in value)
    return bool(str(value or "").strip())


def band_impressions(value: int) -> str:
    return "0" if value == 0 else "1-4" if value <= 4 else "5-19" if value <= 19 else "20+"


def band_position(impressions: int, value: float) -> str:
    if not impressions:
        return "NO_DATA"
    return "1-3" if value <= 3 else "4-10" if value <= 10 else "11-20" if value <= 20 else "21-50" if value <= 50 else "51+"


def source_state(record: dict | None) -> tuple[int, str]:
    if not record:
        return 0, "source-record-missing"
    flags = {
        "bangla": has_text(record.get("bangla")),
        "definition": has_text(record.get("definition")),
        "pos": str(record.get("part_of_speech", "")).strip().casefold() not in {"", "unknown"},
        "example": has_text(record.get("example")) or has_text(record.get("examples")),
        "synonyms": has_text(record.get("synonyms")),
        "antonyms": has_text(record.get("antonyms")),
        "word_family": has_text(record.get("word_family")),
    }
    return sum(flags.values()), ";".join(k for k, ok in flags.items() if ok) or "none"


def clean_list(value) -> list[str]:
    return [str(x).strip() for x in (value or []) if str(x).strip()]


def editorial_decision(word: str, source: dict) -> dict:
    example = str(source.get("example", "") or "").strip()
    bangla = str(source.get("bangla", "") or "").strip()
    definition = str(source.get("definition", "") or "").strip()
    pos = str(source.get("part_of_speech", "") or "").strip()
    synthetic = bool(example and SYNTHETIC_RE.fullmatch(example))
    if word in REJECT:
        classification, problem = "REJECT", REJECT[word]
    elif word in HUMAN_REVIEW:
        classification, problem = "HUMAN_REVIEW", HUMAN_REVIEW[word]
    elif synthetic or word == "integration":
        classification = "APPROVE_WITH_OMISSIONS"
        problem = "Synthetic/meta example must be omitted." if word != "integration" else "Bangla transliteration and grammatically broken synthetic example must be omitted; narrow but valid definition may be published."
    elif bangla or definition:
        classification, problem = "APPROVE", "Verified learner-useful Bangla meaning and/or definition; missing optional fields remain absent."
    else:
        classification, problem = "REJECT", "No strong verified Bangla meaning or English definition."

    publishable = classification in {"APPROVE", "APPROVE_WITH_OMISSIONS"}
    publish_bangla = bool(publishable and bangla and word != "integration")
    publish_definition = bool(publishable and definition)
    publish_pos = bool(publishable and pos and pos.casefold() != "unknown")
    publish_example = bool(publishable and example and not synthetic)
    verified_synonyms = {"wide": ["broad"], "provision": ["proviso"]}
    verified_antonyms = {"wide": ["narrow"], "integration": ["segregation"]}
    verified_word_family = {"hosted": ["host"]}
    synonyms = verified_synonyms.get(word, [])
    antonyms = verified_antonyms.get(word, [])
    word_family = verified_word_family.get(word, [])
    publish_synonyms = bool(publishable and synonyms)
    publish_antonyms = bool(publishable and antonyms)
    publish_word_family = bool(publishable and word_family)
    omitted = []
    if example and not publish_example: omitted.append("example")
    if bangla and not publish_bangla: omitted.append("bangla")
    if source.get("synonyms") and not publish_synonyms: omitted.append("synonyms")
    elif clean_list(source.get("synonyms")) != synonyms: omitted.append("unverified_synonyms")
    if publish_antonyms and clean_list(source.get("antonyms")) != antonyms: omitted.append("unverified_antonyms")
    if publish_word_family and clean_list(source.get("word_family")) != word_family: omitted.append("unverified_word_family")
    for field, allowed in (("definition", publish_definition), ("part_of_speech", publish_pos), ("antonyms", publish_antonyms), ("word_family", publish_word_family), ("pronunciation", False)):
        if has_text(source.get(field)) and not allowed: omitted.append(field)
    return {
        "classification": classification, "source_problem": problem,
        "recommended_action": "INCLUDE_IN_TREATMENT" if publishable else "DATA_REMEDIATION" if classification == "REJECT" else "HUMAN_EDITOR_REVIEW",
        "synthetic_example_rejected": synthetic,
        "publish_bangla": publish_bangla, "publish_definition": publish_definition, "publish_part_of_speech": publish_pos,
        "publish_example": publish_example, "publish_synonyms": publish_synonyms, "publish_antonyms": publish_antonyms,
        "publish_word_family": publish_word_family, "publish_pronunciation": False,
        "publish_synonym_values": ";".join(synonyms) if publishable else "",
        "publish_antonym_values": ";".join(antonyms) if publishable else "",
        "publish_word_family_values": ";".join(word_family) if publishable else "",
        "future_omissions": ";".join(sorted(set(omitted))) or "none",
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--top100", type=Path, required=True)
    ap.add_argument("--bd-pages", type=Path, required=True)
    ap.add_argument("--bd-queries", type=Path, required=True)
    ap.add_argument("--inventory", type=Path, required=True)
    ap.add_argument("--dictionary", type=Path, required=True)
    ap.add_argument("--phase2b", type=Path, required=True)
    ap.add_argument("--phase2c", type=Path, required=True)
    ap.add_argument("--phase2d", type=Path, required=True)
    ap.add_argument("--output", type=Path, default=Path("reports"))
    args = ap.parse_args(); args.output.mkdir(parents=True, exist_ok=True)

    top100 = read_csv(args.top100)
    if len(top100) != 100 or len({x["url"] for x in top100}) != 100:
        raise SystemExit("STOP: Phase 2D Top 100 must contain exactly 100 unique URLs")
    required_bd = {"BD_IMPRESSIONS", "BD_CLICKS", "BD_CTR", "BD_POSITION"}
    if not required_bd.issubset(top100[0]):
        raise SystemExit("STOP: Bangladesh-specific evidence fields are missing")
    phase2b = json.loads(args.phase2b.read_text(encoding="utf-8"))
    phase2c = json.loads(args.phase2c.read_text(encoding="utf-8"))
    phase2d = json.loads(args.phase2d.read_text(encoding="utf-8"))
    if phase2d.get("priority_model", {}).get("pool_a_observed_bd_demand") != 100:
        raise SystemExit("STOP: Phase 2D observed-demand pool does not reconcile to 100")

    inventory = []
    with gzip.open(args.inventory, "rt", encoding="utf-8") as fh:
        inventory = [json.loads(line) for line in fh]
    inv_by_url = {x["url"]: x for x in inventory}
    sources = json.loads(args.dictionary.read_text(encoding="utf-8"))
    source_groups = defaultdict(list)
    for source in sources:
        source_groups[str(source.get("english", "")).casefold().strip()].append(source)
    bd_pages = {x["url"]: x for x in read_csv(args.bd_pages)}
    query_signals = defaultdict(int)
    for query in read_csv(args.bd_queries):
        if query.get("category") in {"UNRELATED_OR_AMBIGUOUS", "BRANDED_OVIDHAN"}:
            continue
        for token in set(re.findall(r"[a-z0-9-]+", query.get("query", "").casefold())):
            if token in source_groups and len(token) >= 2:
                query_signals[token] += int(float(query.get("BD_IMPRESSIONS", 0) or 0))

    review = []
    for candidate in top100:
        word, url = candidate["word"], candidate["url"]
        records = source_groups.get(word.casefold(), [])
        if len(records) != 1:
            raise SystemExit(f"STOP: {word} has {len(records)} source records")
        source, inv = records[0], inv_by_url.get(url)
        if not inv or inv.get("migration_class") != "REVIEW" or inv.get("tier") not in {"A", "B"} or not inv.get("legacy_page"):
            raise SystemExit(f"STOP: candidate inventory mismatch for {word}")
        decision = editorial_decision(word, source)
        completeness, present = source_state(source)
        review.append({
            "original_priority_rank": int(candidate["priority_rank"]), "word": word, "url": url,
            "canonical_slug_valid": bool(re.fullmatch(r"[a-z0-9-]+", word) and url == f"https://ovidhan.net/word/{word}.html"),
            "BD_IMPRESSIONS": int(candidate["BD_IMPRESSIONS"]), "BD_CLICKS": int(candidate["BD_CLICKS"]),
            "BD_CTR": float(candidate["BD_CTR"]), "BD_POSITION": float(candidate["BD_POSITION"]),
            "BD_RELEVANT_QUERY_IMPRESSIONS": int(candidate["BD_RELEVANT_QUERY_IMPRESSIONS"]),
            "tier": candidate["tier"], "migration_class": candidate["migration_class"], "rendering_state": candidate["static_legacy_status"],
            "source_completeness_score": completeness, "source_fields_present": present,
            "source_bangla": str(source.get("bangla", "") or ""), "source_definition": str(source.get("definition", "") or ""),
            "source_part_of_speech": str(source.get("part_of_speech", "") or ""), "source_example": str(source.get("example", "") or ""),
            "source_synonyms": ";".join(clean_list(source.get("synonyms"))), "source_antonyms": ";".join(clean_list(source.get("antonyms"))),
            "source_word_family": ";".join(clean_list(source.get("word_family"))), "source_pronunciation": str(source.get("pronunciation", "") or ""),
            "source_editorial_status": str(source.get("editorial_status", "") or ""), **decision,
        })
    review.sort(key=lambda x: x["original_priority_rank"])
    write_csv(args.output / "dictionary-seo-top100-editorial-review-2e.csv", review)

    treatment = [x for x in review if x["classification"] in {"APPROVE", "APPROVE_WITH_OMISSIONS"}]
    treatment_urls = {x["url"] for x in treatment}
    treatment_manifest = [{
        "allowlisted": True, "treatment_id": f"T{index:03d}", "word": x["word"], "url": x["url"], "path": f"word/{x['word']}.html",
        "classification": x["classification"], "publish_bangla": x["publish_bangla"], "publish_definition": x["publish_definition"],
        "publish_part_of_speech": x["publish_part_of_speech"], "publish_example": x["publish_example"],
        "publish_synonyms": x["publish_synonyms"], "publish_antonyms": x["publish_antonyms"], "publish_word_family": x["publish_word_family"],
        "publish_synonym_values": x["publish_synonym_values"], "publish_antonym_values": x["publish_antonym_values"], "publish_word_family_values": x["publish_word_family_values"],
        "publish_pronunciation": False, "future_omissions": x["future_omissions"], "manifest_frozen": True,
    } for index, x in enumerate(treatment, 1)]
    write_csv(args.output / "dictionary-seo-treatment-manifest-2e.csv", treatment_manifest)

    # Greedy one-to-one controls. Same Bangladesh bands dominate the match cost;
    # content/tier differences are retained explicitly rather than hidden.
    control_candidates = []
    for inv in inventory:
        url = inv["url"]
        if url in treatment_urls or inv.get("batch_1") or inv.get("migration_class") in {"KEEP-INDEXED", "INVALID/NOISE", "MISSING/BROKEN"} or not inv.get("legacy_page"):
            continue
        source_records = source_groups.get(str(inv.get("slug", "")).casefold(), [])
        if len(source_records) != 1:
            continue
        completeness, present = source_state(source_records[0])
        perf = bd_pages.get(url, {})
        impressions = int(float(perf.get("BD_IMPRESSIONS", 0) or 0)); position = float(perf.get("BD_POSITION", 0) or 0)
        control_candidates.append({
            "word": inv.get("slug"), "url": url, "tier": inv.get("tier"), "migration_class": inv.get("migration_class"),
            "rendering_state": "LEGACY", "source_completeness_score": completeness, "source_fields_present": present,
            "BD_IMPRESSIONS": impressions, "BD_CLICKS": int(float(perf.get("BD_CLICKS", 0) or 0)),
            "BD_CTR": float(perf.get("BD_CTR", 0) or 0), "BD_POSITION": position,
            "BD_RELEVANT_QUERY_IMPRESSIONS": query_signals.get(str(inv.get("slug", "")).casefold(), 0),
            "query_intent": "MATCHED_ENGLISH_LEARNING_QUERY" if query_signals.get(str(inv.get("slug", "")).casefold(), 0) else "PAGE_ONLY_OR_UNATTRIBUTED",
            "impression_band": band_impressions(impressions), "position_band": band_position(impressions, position),
        })

    used_controls = set(); controls = []
    for index, treatment_row in enumerate(sorted(treatment, key=lambda x: (-x["BD_IMPRESSIONS"], x["original_priority_rank"])), 1):
        ti, tp = treatment_row["BD_IMPRESSIONS"], treatment_row["BD_POSITION"]
        ti_band, tp_band = band_impressions(ti), band_position(ti, tp)
        treatment_intent = "MATCHED_ENGLISH_LEARNING_QUERY" if treatment_row["BD_RELEVANT_QUERY_IMPRESSIONS"] else "PAGE_ONLY_OR_UNATTRIBUTED"
        def match_cost(c):
            return (
                (0 if c["impression_band"] == ti_band else 30) +
                (0 if c["position_band"] == tp_band else 14) +
                (0 if c["tier"] == treatment_row["tier"] else 8 if {c["tier"], treatment_row["tier"]} <= {"A", "B"} else 18) +
                abs(c["source_completeness_score"] - treatment_row["source_completeness_score"]) * 3 +
                min(12, abs(c["BD_IMPRESSIONS"] - ti) * 2) +
                (0 if c["query_intent"] == treatment_intent else 5) +
                (0 if c["migration_class"] == "REVIEW" else 6), c["word"]
            )
        available = (c for c in control_candidates if c["url"] not in used_controls)
        chosen = min(available, key=match_cost)
        used_controls.add(chosen["url"])
        cost = match_cost(chosen)[0]
        controls.append({
            "control_id": f"C{index:03d}", "matched_treatment_word": treatment_row["word"], **chosen,
            "matched_treatment_tier": treatment_row["tier"], "matched_treatment_impression_band": ti_band,
            "matched_treatment_position_band": tp_band, "matched_treatment_completeness": treatment_row["source_completeness_score"],
            "matched_treatment_query_intent": treatment_intent,
            "match_cost": cost, "match_quality": "EXACT/STRONG" if cost <= 6 else "ACCEPTABLE" if cost <= 20 else "WEAK",
            "control_frozen": True, "required_action": "NO STATIC UPGRADE",
        })
    write_csv(args.output / "dictionary-seo-control-manifest-2e.csv", controls)

    baseline = []
    for cohort, records in (("TREATMENT", treatment), ("CONTROL", controls)):
        for index, x in enumerate(records, 1):
            baseline.append({
                "cohort": cohort, "cohort_id": f"T{index:03d}" if cohort == "TREATMENT" else x["control_id"],
                "word": x["word"], "url": x["url"], "BASELINE_DATE": BASELINE_DATE, "GSC_PERIOD": GSC_PERIOD, "COUNTRY": COUNTRY,
                "BD_IMPRESSIONS": x["BD_IMPRESSIONS"], "BD_CLICKS": x["BD_CLICKS"], "BD_CTR": x["BD_CTR"], "BD_POSITION": x["BD_POSITION"],
                "tier": x["tier"], "source_completeness_score": x["source_completeness_score"], "rendering_state": x["rendering_state"], "cohort_frozen": True,
                "query_intent": ("MATCHED_ENGLISH_LEARNING_QUERY" if x.get("BD_RELEVANT_QUERY_IMPRESSIONS", 0) else "PAGE_ONLY_OR_UNATTRIBUTED") if cohort == "TREATMENT" else x["query_intent"],
            })
    write_csv(args.output / "dictionary-seo-experiment-baseline-2e.csv", baseline)

    classes = Counter(x["classification"] for x in review)
    problems = Counter()
    for x in review:
        if x["synthetic_example_rejected"]: problems["synthetic_or_meta_example"] += 1
        if x["classification"] == "HUMAN_REVIEW": problems["ambiguous_or_questionable_sense"] += 1
        if x["classification"] == "REJECT": problems["incorrect_or_insufficient_primary_answer"] += 1
        if x["source_editorial_status"] == "draft": problems["draft_source_record"] += 1
        if not x["source_definition"]: problems["definition_missing"] += 1
        if not x["source_part_of_speech"]: problems["part_of_speech_missing"] += 1
    flagged = [{k: x[k] for k in ("word", "url", "BD_IMPRESSIONS", "BD_CLICKS", "BD_CTR", "BD_POSITION", "source_problem", "classification", "recommended_action")} for x in review if x["classification"] in {"HUMAN_REVIEW", "REJECT"}]
    match_counts = Counter(x["match_quality"] for x in controls)
    freeze_hashes = {
        "phase2d_top100_input_sha256": hashlib.sha256(args.top100.read_bytes()).hexdigest(),
        "source_dictionary_sha256": hashlib.sha256(args.dictionary.read_bytes()).hexdigest(),
        "treatment_manifest_sha256": hashlib.sha256((args.output / "dictionary-seo-treatment-manifest-2e.csv").read_bytes()).hexdigest(),
        "control_manifest_sha256": hashlib.sha256((args.output / "dictionary-seo-control-manifest-2e.csv").read_bytes()).hexdigest(),
        "baseline_sha256": hashlib.sha256((args.output / "dictionary-seo-experiment-baseline-2e.csv").read_bytes()).hexdigest(),
    }
    report = {
        "report": "Ovidhan Dictionary SEO Phase 2E Top 100 Editorial Gate and Experiment Freeze",
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "repository": "mohammadyeasin420/ovidhan2", "starting_sha": "bf292f0087e673bf68475ebd753c33aee0b4d257",
        "inputs": {"phase2b_present": bool(phase2b), "phase2c_present": bool(phase2c), "phase2d_present": bool(phase2d), "original_top100_rows": len(top100), "bangladesh_fields_verified": True},
        "freeze_hashes": freeze_hashes,
        "editorial_results": {"counts": dict(classes), "reviewed": len(review), "treatment_size": len(treatment), "flagged_size": len(flagged), "dominant_problems": dict(problems)},
        "treatment": {"size": len(treatment), "manifest": "reports/dictionary-seo-treatment-manifest-2e.csv", "allowlist_is_mandatory_for_phase2f": True, "approved_only": True},
        "control": {"size": len(controls), "manifest": "reports/dictionary-seo-control-manifest-2e.csv", "matching_quality": dict(match_counts), "average_match_cost": round(sum(x["match_cost"] for x in controls) / len(controls), 2), "limitation": "The Phase 2D Top 100 exhausted all Tier A/B legacy URLs with observed Bangladesh demand. Exact same-tier/evidence controls are therefore limited; weak matches are disclosed, not hidden."},
        "baseline": {"date": BASELINE_DATE, "gsc_period": GSC_PERIOD, "country": COUNTRY, "rows": len(baseline), "treatment": {"BD_IMPRESSIONS": sum(x["BD_IMPRESSIONS"] for x in treatment), "BD_CLICKS": sum(x["BD_CLICKS"] for x in treatment), "BD_POSITION_WEIGHTED": round(sum(x["BD_POSITION"] * x["BD_IMPRESSIONS"] for x in treatment) / sum(x["BD_IMPRESSIONS"] for x in treatment), 2)}, "control": {"BD_IMPRESSIONS": sum(x["BD_IMPRESSIONS"] for x in controls), "BD_CLICKS": sum(x["BD_CLICKS"] for x in controls), "BD_POSITION_WEIGHTED": round(sum(x["BD_POSITION"] * x["BD_IMPRESSIONS"] for x in controls) / sum(x["BD_IMPRESSIONS"] for x in controls), 2) if sum(x["BD_IMPRESSIONS"] for x in controls) else 0}},
        "flagged_candidates": flagged,
        "strategic_answers": {"publishable_count": len(treatment), "dominant_quality_issue": problems.most_common(5), "high_ranking_poor_data": sum(1 for x in flagged if x["BD_IMPRESSIONS"] and x["BD_POSITION"] <= 20), "treatment_size": len(treatment), "control_comparable": "Partially; band-matching is frozen and every weak match is disclosed.", "implementation_ready": "Only after human review accepts the disclosed control limitation and Phase 2F consumes the mandatory treatment allowlist."},
        "validation": {"original_candidates_100": len(review) == 100, "every_candidate_classified": sum(classes.values()) == 100, "all_canonical_slugs_valid": all(x["canonical_slug_valid"] for x in review), "treatment_approved_only": all(x["classification"] in {"APPROVE", "APPROVE_WITH_OMISSIONS"} for x in treatment), "treatment_control_overlap": bool(treatment_urls & {x["url"] for x in controls}), "batch1_in_control": any(inv_by_url[x["url"]].get("batch_1") for x in controls), "invalid_noise_in_control": any(inv_by_url[x["url"]].get("migration_class") == "INVALID/NOISE" for x in controls), "baseline_rows": len(baseline), "production_changes_performed": False},
        "verdict": "PASS WITH WARNINGS — HUMAN REVIEW REQUIRED",
    }
    (args.output / "dictionary-seo-top100-gate-2e.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    plan = f"""# Phase 2E controlled experiment freeze\n\n## Frozen cohorts\n\n- Treatment: **{len(treatment)}** editorially approved legacy URLs from the Phase 2D Top 100.\n- Control: **{len(controls)}** unchanged legacy URLs selected by tier, Bangladesh impression band, position band, source completeness, and rendering state.\n- Baseline date: **{BASELINE_DATE}**\n- GSC filter: **Country = Bangladesh; Search type = Web; Period = Last 3 months**\n\nCohorts must not be silently changed after implementation. Any change requires a new versioned manifest and a reset baseline.\n\n## Phase 2F implementation contract\n\nThe future generator must require `reports/dictionary-seo-treatment-manifest-2e.csv` as an explicit allowlist and refuse implicit/full generation. Only rows with `allowlisted=true` may be generated. Field-level publish flags and omissions in the manifest are mandatory. Existing Learning Explorer and production header/footer remain. Controls receive no static upgrade.\n\n## Measurement\n\n- 7 days: implementation, crawl, canonical, structured-data, and indexing sanity only.\n- 28 days: first directional Bangladesh treatment-versus-control comparison.\n- 56 days: primary scale/no-scale evaluation.\n\nCompare relative treatment-versus-control movement in BD impressions, clicks, CTR, and average position. Account for Search Console delay, low counts, and volatility. Raw treatment growth alone is not success.\n\n## Scale gate\n\nDo not scale unless Phase 2F passes page validation and the 28/56-day comparison shows credible improvement without rendering, indexability, learner-quality, or control-integrity regressions. Weak control matches disclosed in the Phase 2E report require human acceptance before implementation.\n"""
    (args.output / "dictionary-seo-experiment-plan-2e.md").write_text(plan, encoding="utf-8")


if __name__ == "__main__":
    main()
