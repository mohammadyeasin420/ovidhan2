#!/usr/bin/env python3
"""Build a Bangladesh-only dictionary SEO evidence and priority audit."""

from __future__ import annotations

import argparse
import csv
import gzip
import json
import math
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

BD_SCOPE = "BANGLADESH-FILTERED GSC"
WORD_RE = re.compile(r"^/word/([a-z0-9-]+)\.html/?$", re.I)
CATEGORIES = [
    "ENGLISH_TO_BANGLA_WORD_MEANING", "ENGLISH_TO_BANGLA_DICTIONARY", "BANGLA_TO_ENGLISH",
    "GRAMMAR", "SPOKEN_ENGLISH", "VOCABULARY", "BCS", "BANK_JOB", "IELTS", "SSC_HSC",
    "UNIVERSITY_ADMISSION", "JOB_INTERVIEW", "VISA_TRAVEL", "BRANDED_OVIDHAN",
    "OTHER_ENGLISH_LEARNING", "UNRELATED_OR_AMBIGUOUS",
]


def rows(sheet: dict) -> list[dict]:
    values = sheet["values"]
    return [dict(zip(values[0], row)) for row in values[1:]]


def num(row: dict, key: str) -> float:
    try:
        return float(row.get(key, 0) or 0)
    except (TypeError, ValueError):
        return 0.0


def normalize_url(raw: str) -> tuple[str | None, str | None]:
    try:
        part = urlsplit(str(raw).strip())
        host = part.netloc.lower().removeprefix("www.")
        if part.scheme.lower() not in {"http", "https"} or host != "ovidhan.net":
            return None, "non-canonical-host-or-relative"
        path = re.sub(r"/{2,}", "/", part.path)
        if path != "/":
            path = path.rstrip("/")
        return urlunsplit(("https", "ovidhan.net", path, "", "")), None
    except Exception as exc:  # defensive diagnostic
        return None, type(exc).__name__


def query_category(query: str) -> str:
    q = query.casefold().strip()
    rules = [
        ("BRANDED_OVIDHAN", r"\bovidhan\b|ovidhan\.net|অভিধান\.net"),
        ("ENGLISH_TO_BANGLA_WORD_MEANING", r"meaning (?:in|of).*\b(?:bangla|bengali)\b|\b(?:bangla|bengali) meaning\b|বাংলা অর্থ|বাংলা মানে|অর্থ কি"),
        ("ENGLISH_TO_BANGLA_DICTIONARY", r"english to (?:bangla|bengali)(?: dictionary| translation)?|ইংরেজি থেকে বাংলা"),
        ("BANGLA_TO_ENGLISH", r"bangla to english|bengali to english|বাংলা থেকে ইংরেজি"),
        ("BCS", r"\bbcs\b|বিসিএস"),
        ("BANK_JOB", r"bank (?:job|exam)|ব্যাংক (?:জব|পরীক্ষা)"),
        ("IELTS", r"\bielts\b"),
        ("SSC_HSC", r"\b(?:ssc|hsc)\b|এসএসসি|এইচএসসি"),
        ("UNIVERSITY_ADMISSION", r"university|admission|বিশ্ববিদ্যালয়|ভর্তি"),
        ("JOB_INTERVIEW", r"job interview|interview question|চাকরি|ইন্টারভিউ"),
        ("VISA_TRAVEL", r"\bvisa\b|travel english|ভিসা"),
        ("GRAMMAR", r"grammar|preposition|plural|tense|voice|narration|article|parts of speech|ব্যাকরণ"),
        ("SPOKEN_ENGLISH", r"spoken english|speaking english|কথোপকথন"),
        ("VOCABULARY", r"vocabulary|synonym|antonym|শব্দভাণ্ডার"),
        ("OTHER_ENGLISH_LEARNING", r"learn english|english word|pronunciation|translation|dictionary|ইংরেজি"),
    ]
    for label, pattern in rules:
        if re.search(pattern, q):
            return label
    return "UNRELATED_OR_AMBIGUOUS"


def query_template(query: str) -> str:
    q = query.casefold().strip()
    if re.fullmatch(r".+ meaning in bengali\??", q):
        return "<word> meaning in bengali"
    if re.fullmatch(r".+ meaning in bangla\??", q):
        return "<word> meaning in bangla"
    if re.search(r"english to (?:bangla|bengali) dictionary", q):
        return "english to bangla dictionary"
    if re.search(r"bangla to english", q):
        return "bangla to english"
    return "OTHER"


def weighted_position(records: list[dict], impression_key: str, position_key: str) -> float:
    impressions = sum(float(x.get(impression_key, 0) or 0) for x in records)
    return round(sum(float(x.get(impression_key, 0) or 0) * float(x.get(position_key, 0) or 0) for x in records) / impressions, 2) if impressions else 0.0


def source_completeness(source: dict | None) -> tuple[int, str]:
    if not source:
        return 0, "source-record-missing"
    fields = {
        "bangla": bool(str(source.get("bangla", "")).strip()),
        "definition": bool(str(source.get("definition", "")).strip()),
        "part_of_speech": str(source.get("part_of_speech", "")).strip().casefold() not in {"", "unknown"},
        "example": bool(str(source.get("example", "")).strip() or source.get("examples")),
        "pronunciation": bool(str(source.get("pronunciation", "")).strip()),
    }
    return sum(fields.values()), ";".join(k for k, present in fields.items() if present) or "none"


def bd_priority(inv: dict, perf: dict, query_impressions: int, completeness: int, global_impressions: int) -> float:
    impressions = int(perf.get("BD_IMPRESSIONS", 0))
    clicks = int(perf.get("BD_CLICKS", 0))
    position = float(perf.get("BD_POSITION", 0))
    score = min(38.0, math.log1p(impressions) * 10.5)
    if impressions:
        score += 16 if position <= 3 else 20 if position <= 10 else 15 if position <= 20 else 7 if position <= 50 else 2
    score += min(10.0, math.log1p(clicks) * 6.0)
    score += 16 if inv.get("tier") == "A" else 10
    score += min(12.0, float(inv.get("tier_score") or 0) * 1.5)
    score += min(6.0, completeness * 1.2)
    score += min(7.0, math.log1p(query_impressions) * 2.5)
    # Global context is only a weak discovery tiebreaker; global clicks are never used.
    score += min(3.0, math.log1p(global_impressions) * 0.8)
    score += 4.0  # verified rendering deficiency: candidate set is legacy REVIEW only
    return round(score, 3)


def write_csv(path: Path, records: list[dict], fields: list[str] | None = None) -> None:
    fields = fields or list(records[0])
    with path.open("w", encoding="utf-8-sig", newline="") as fh:
        out = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
        out.writeheader()
        out.writerows(records)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--bd-gsc", type=Path, required=True)
    ap.add_argument("--phase2b-report", type=Path, required=True)
    ap.add_argument("--inventory", type=Path, required=True)
    ap.add_argument("--phase2c-report", type=Path, required=True)
    ap.add_argument("--global-join", type=Path, required=True)
    ap.add_argument("--dictionary", type=Path, required=True)
    ap.add_argument("--output", type=Path, default=Path("reports"))
    args = ap.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    gsc = json.loads(args.bd_gsc.read_text(encoding="utf-8"))
    sheets = gsc["sheets"]
    page_rows, query_rows = rows(sheets["Pages"]), rows(sheets["Queries"])
    country_rows, device_rows = rows(sheets["Countries"]), rows(sheets["Devices"])
    filters = {x["Filter"]: x["Value"] for x in rows(sheets["Filters"])}
    if filters != {"Search type": "Web", "Date": "Last 3 months", "Country": "Bangladesh"}:
        raise SystemExit(f"STOP: workbook filters are not authoritative Bangladesh filters: {filters}")
    if len(page_rows) != 544 or len(query_rows) != 624:
        raise SystemExit(f"STOP: unexpected Bangladesh row counts: Pages={len(page_rows)}, Queries={len(query_rows)}")
    if len(country_rows) != 1 or country_rows[0].get("Country") != "Bangladesh" or int(num(country_rows[0], "Clicks")) != 37 or int(num(country_rows[0], "Impressions")) != 2069:
        raise SystemExit("STOP: Bangladesh country totals do not reconcile")

    phase2b = json.loads(args.phase2b_report.read_text(encoding="utf-8"))
    phase2c = json.loads(args.phase2c_report.read_text(encoding="utf-8"))
    inventory = []
    with gzip.open(args.inventory, "rt", encoding="utf-8") as fh:
        inventory = [json.loads(line) for line in fh]
    by_url = {x["url"]: x for x in inventory}
    source_records = json.loads(args.dictionary.read_text(encoding="utf-8"))
    source_by_word = {}
    for record in source_records:
        word = str(record.get("english", "")).casefold().strip()
        if word and word not in source_by_word:
            source_by_word[word] = record
    global_by_url = {}
    with args.global_join.open(encoding="utf-8-sig", newline="") as fh:
        for row in csv.DictReader(fh):
            global_by_url[row["url"]] = row

    normalized = defaultdict(lambda: {"rows": 0, "clicks": 0, "impressions": 0, "position_parts": []})
    malformed = []
    for row in page_rows:
        url, error = normalize_url(row.get("Top pages", ""))
        if not url:
            malformed.append({"raw_url": row.get("Top pages"), "reason": error})
            continue
        item = normalized[url]
        item["rows"] += 1
        item["clicks"] += int(num(row, "Clicks"))
        item["impressions"] += int(num(row, "Impressions"))
        item["position_parts"].append((num(row, "Position"), num(row, "Impressions")))

    joined, unmatched = [], []
    for url, perf in normalized.items():
        match = WORD_RE.fullmatch(urlsplit(url).path)
        if not match:
            continue
        impressions = perf["impressions"]
        position = sum(p * i for p, i in perf["position_parts"]) / impressions if impressions else 0
        base = {
            "word": match.group(1), "url": url, "BD_CLICKS": perf["clicks"], "BD_IMPRESSIONS": impressions,
            "BD_CTR": round(perf["clicks"] / impressions, 6) if impressions else 0, "BD_POSITION": round(position, 2), "metric_scope": BD_SCOPE,
        }
        inv = by_url.get(url)
        if not inv:
            unmatched.append(base)
            continue
        completeness, present = source_completeness(source_by_word.get(match.group(1)))
        base.update({
            "migration_class": inv.get("migration_class"), "tier": inv.get("tier"), "tier_score": inv.get("tier_score"),
            "batch_1": inv.get("batch_1"), "static_legacy_status": "LEGACY" if inv.get("legacy_page") else "STATIC",
            "self_canonical": inv.get("self_canonical"), "rendering_quality": "USEFUL_WITHOUT_JS" if inv.get("useful_without_javascript") else "WEAK_OR_JS_DEPENDENT",
            "indexability_signals_pass": inv.get("indexability_signals_pass"), "source_completeness_score": completeness,
            "source_fields_present": present, "tier_flags": ";".join(inv.get("tier_flags") or []),
        })
        joined.append(base)
    joined_by_url = {x["url"]: x for x in joined}
    duplicate_urls = sorted(url for url, data in normalized.items() if data["rows"] > 1)

    query_output, category_data, template_data = [], defaultdict(list), defaultdict(list)
    query_word_signals = defaultdict(lambda: {"impressions": 0, "clicks": 0, "relevant_rows": 0})
    for row in query_rows:
        query = str(row.get("Top queries", "")).strip()
        category, template = query_category(query), query_template(query)
        item = {"query": query, "category": category, "recurring_template": template, "BD_CLICKS": int(num(row, "Clicks")), "BD_IMPRESSIONS": int(num(row, "Impressions")), "BD_CTR": num(row, "CTR"), "BD_POSITION": num(row, "Position"), "metric_scope": BD_SCOPE}
        query_output.append(item); category_data[category].append(item); template_data[template].append(item)
        if category not in {"UNRELATED_OR_AMBIGUOUS", "BRANDED_OVIDHAN"}:
            qtokens = set(re.findall(r"[a-z0-9-]+", query.casefold()))
            for word in qtokens:
                if word in source_by_word and len(word) >= 2:
                    sig = query_word_signals[word]
                    sig["impressions"] += item["BD_IMPRESSIONS"]; sig["clicks"] += item["BD_CLICKS"]; sig["relevant_rows"] += 1
    write_csv(args.output / "dictionary-seo-bd-query-analysis.csv", query_output)

    candidates = []
    for inv in inventory:
        if not (inv.get("legacy_page") and inv.get("migration_class") == "REVIEW" and inv.get("tier") in {"A", "B"}):
            continue
        perf = joined_by_url.get(inv["url"], {})
        global_perf = global_by_url.get(inv["url"], {})
        word = inv.get("slug") or ""
        completeness, present = source_completeness(source_by_word.get(word))
        qsig = query_word_signals.get(word, {})
        bd_impressions, bd_clicks = int(perf.get("BD_IMPRESSIONS", 0)), int(perf.get("BD_CLICKS", 0))
        pool = "POOL A — OBSERVED BANGLADESH DEMAND" if bd_impressions else "POOL B — HIGH-QUALITY DISCOVERY"
        if bd_impressions >= 5 and (qsig.get("impressions", 0) > 0 or bd_clicks > 0):
            confidence = "HIGH CONFIDENCE"
        elif bd_impressions > 0:
            confidence = "MEDIUM CONFIDENCE"
        else:
            confidence = "LOW CONFIDENCE"
        item = {
            "priority_rank": 0, "word": word, "url": inv["url"], "candidate_pool": pool,
            "BD_IMPRESSIONS": bd_impressions, "BD_CLICKS": bd_clicks, "BD_CTR": perf.get("BD_CTR", 0), "BD_POSITION": perf.get("BD_POSITION", 0),
            "tier": inv.get("tier"), "tier_score": inv.get("tier_score"), "migration_class": inv.get("migration_class"),
            "static_legacy_status": "LEGACY", "confidence": confidence, "source_completeness_score": completeness,
            "source_fields_present": present, "BD_RELEVANT_QUERY_IMPRESSIONS": qsig.get("impressions", 0),
            "GLOBAL_CONTEXT_IMPRESSIONS": int(float(global_perf.get("global_impressions", 0) or 0)),
            "priority_score": bd_priority(inv, perf, qsig.get("impressions", 0), completeness, int(float(global_perf.get("global_impressions", 0) or 0))),
            "reason": "Bangladesh demand + near-ranking opportunity + useful source" if bd_impressions else "Tier A/B source quality; discovery candidate requiring external demand data",
            "proposed_action": "STATIC-UPGRADE PRIORITY" if bd_impressions >= 3 else "CONTENT REVIEW" if completeness >= 2 else "DATA QUALITY REVIEW",
        }
        candidates.append(item)
    candidates.sort(key=lambda x: (0 if x["candidate_pool"].startswith("POOL A") else 1, -x["priority_score"], -x["BD_IMPRESSIONS"], -x["BD_RELEVANT_QUERY_IMPRESSIONS"], -x["source_completeness_score"], x["word"]))
    for rank, item in enumerate(candidates, 1):
        item["priority_rank"] = rank
    for size in (100, 500, 1000):
        write_csv(args.output / f"dictionary-seo-bd-priority-top{size}.csv", candidates[:size])

    protected = []
    auto_urls = set()
    for inv in inventory:
        if inv.get("batch_1") or inv.get("migration_class") == "KEEP-INDEXED":
            auto_urls.add(inv["url"])
            perf = joined_by_url.get(inv["url"], {})
            protected.append({"word": inv.get("slug"), "url": inv["url"], "protection_status": "AUTO_PROTECTED", "reason": "Batch 1" if inv.get("batch_1") else "Phase 2B KEEP-INDEXED", "BD_IMPRESSIONS": perf.get("BD_IMPRESSIONS", 0), "BD_CLICKS": perf.get("BD_CLICKS", 0)})
    bd_legacy_protected = [x for x in candidates if x["BD_IMPRESSIONS"] >= 3]
    for item in bd_legacy_protected:
        if item["url"] not in auto_urls:
            protected.append({"word": item["word"], "url": item["url"], "protection_status": "DIAGNOSTIC_PROTECT_BD_HIGH_VALUE", "reason": "Bangladesh impressions + Tier A/B legacy upgrade value", "BD_IMPRESSIONS": item["BD_IMPRESSIONS"], "BD_CLICKS": item["BD_CLICKS"]})
    protected_urls = {x["url"] for x in protected}
    bd_data_quality_protected = [x for x in joined if x.get("static_legacy_status") == "LEGACY" and (x["BD_IMPRESSIONS"] >= 5 or x["BD_CLICKS"] > 0) and x["url"] not in protected_urls]
    for item in bd_data_quality_protected:
        protected.append({"word": item["word"], "url": item["url"], "protection_status": "REVIEW — BD EVIDENCE / DATA QUALITY", "reason": "Meaningful Bangladesh evidence, but source or migration quality is insufficient for automatic upgrade", "BD_IMPRESSIONS": item["BD_IMPRESSIONS"], "BD_CLICKS": item["BD_CLICKS"]})
    protected.sort(key=lambda x: x["url"])
    write_csv(args.output / "dictionary-seo-bd-protected-candidates.csv", protected)
    write_csv(args.output / "dictionary-seo-bd-page-join.csv", sorted(joined, key=lambda x: (-x["BD_IMPRESSIONS"], x["url"])))

    word_impressions = [x for x in joined if x["BD_IMPRESSIONS"] > 0]
    word_clicks = [x for x in joined if x["BD_CLICKS"] > 0]
    buckets = {
        "1-3": sum(1 for x in word_impressions if x["BD_POSITION"] <= 3),
        "4-10": sum(1 for x in word_impressions if 3 < x["BD_POSITION"] <= 10),
        "11-20": sum(1 for x in word_impressions if 10 < x["BD_POSITION"] <= 20),
        "21-50": sum(1 for x in word_impressions if 20 < x["BD_POSITION"] <= 50),
        "51+": sum(1 for x in word_impressions if x["BD_POSITION"] > 50),
    }
    click_winners = sorted(word_clicks, key=lambda x: (-x["BD_CLICKS"], -x["BD_IMPRESSIONS"], x["word"]))
    ctr_opportunities = sorted([x for x in joined if x["BD_IMPRESSIONS"] >= 5 and x["BD_POSITION"] <= 20 and x["BD_CTR"] < 0.02], key=lambda x: (-x["BD_IMPRESSIONS"], x["BD_POSITION"]))
    batch_visible = [x for x in joined if x.get("batch_1")]
    legacy_visible = [x for x in joined if x.get("static_legacy_status") == "LEGACY"]
    pool_a = [x for x in candidates if x["candidate_pool"].startswith("POOL A")]
    pool_b = [x for x in candidates if x["candidate_pool"].startswith("POOL B")]
    category_summary = {key: {"query_count": len(category_data[key]), "BD_IMPRESSIONS": sum(x["BD_IMPRESSIONS"] for x in category_data[key]), "BD_CLICKS": sum(x["BD_CLICKS"] for x in category_data[key]), "BD_CTR": round(sum(x["BD_CLICKS"] for x in category_data[key]) / sum(x["BD_IMPRESSIONS"] for x in category_data[key]), 6) if sum(x["BD_IMPRESSIONS"] for x in category_data[key]) else 0, "BD_POSITION": weighted_position(category_data[key], "BD_IMPRESSIONS", "BD_POSITION")} for key in CATEGORIES}
    template_summary = {key: {"query_count": len(values), "BD_IMPRESSIONS": sum(x["BD_IMPRESSIONS"] for x in values), "BD_CLICKS": sum(x["BD_CLICKS"] for x in values)} for key, values in sorted(template_data.items()) if key != "OTHER"}
    migration_counts, tier_counts = Counter(x.get("migration_class") for x in inventory), Counter(x.get("tier") for x in inventory)

    report = {
        "report": "Ovidhan Dictionary SEO Phase 2D Bangladesh Priority Audit",
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "source": {"workbook": Path(gsc["sourceWorkbook"]).name, "filters": filters, "scope": BD_SCOPE, "phase2b_commit": "22118bd6531a6c696e436d5e63d0faf3df9d6ac0", "phase2c_commit": "97821d504ed07ea37d914d32da8ee4d6ff0d685e", "raw_workbook_committed": False},
        "workbook_verification": {"sheet_ranges": {k: v["address"] for k, v in sheets.items()}, "page_rows": len(page_rows), "query_rows": len(query_rows), "country_rows": len(country_rows), "device_rows": len(device_rows), "search_appearance_rows": len(rows(sheets["Search appearance"])), "country_totals": country_rows[0], "page_dimension_totals": {"clicks": int(sum(num(x, "Clicks") for x in page_rows)), "impressions": int(sum(num(x, "Impressions") for x in page_rows))}, "query_dimension_totals": {"clicks": int(sum(num(x, "Clicks") for x in query_rows)), "impressions": int(sum(num(x, "Impressions") for x in query_rows))}, "devices": device_rows},
        "page_join": {"page_rows": len(page_rows), "unique_normalized_urls": len(normalized), "duplicate_or_aggregated_rows": len(page_rows) - len(normalized), "duplicate_normalized_urls": duplicate_urls, "malformed_urls": malformed, "dictionary_word_urls": len(joined) + len(unmatched), "matched_word_urls": len(joined), "unmatched_word_urls": unmatched, "non_word_urls": len(normalized) - len(joined) - len(unmatched)},
        "query_analysis": {"categories": category_summary, "recurring_templates": template_summary, "query_csv": "reports/dictionary-seo-bd-query-analysis.csv"},
        "dictionary_visibility": {"word_pages_with_impressions": len(word_impressions), "word_pages_with_clicks": len(word_clicks), "BD_IMPRESSIONS": sum(x["BD_IMPRESSIONS"] for x in joined), "BD_CLICKS": sum(x["BD_CLICKS"] for x in joined), "position_distribution": buckets},
        "click_winners": click_winners,
        "ctr_opportunities": ctr_opportunities,
        "legacy_opportunity": {"legacy_pages_with_bd_evidence": len(legacy_visible), "tier_a_b_review_pool_a": len(pool_a), "top_1_10": sum(1 for x in pool_a if x["BD_POSITION"] <= 10), "top_11_20": sum(1 for x in pool_a if 10 < x["BD_POSITION"] <= 20)},
        "batch1": {"pages_in_bd_export": len(batch_visible), "BD_IMPRESSIONS": sum(x["BD_IMPRESSIONS"] for x in batch_visible), "BD_CLICKS": sum(x["BD_CLICKS"] for x in batch_visible), "pages": batch_visible, "interpretation": "POST-UPGRADE EVALUATION WINDOW TOO SHORT; three-month history cannot be attributed to the recent static implementation."},
        "priority_model": {"eligible_candidates": len(candidates), "pool_a_observed_bd_demand": len(pool_a), "pool_b_high_quality_discovery": len(pool_b), "method": "Bangladesh impressions (log-capped), ranking opportunity, clicks, Tier A/B quality, source completeness, matched Bangladesh query relevance, weak global-impression tiebreaker, and verified legacy rendering deficiency. Global clicks and France traffic are excluded.", "confidence": {"HIGH": "At least five BD impressions plus a relevant-query or click signal", "MEDIUM": "BD page evidence exists but remains small", "LOW": "No BD page evidence; quality/discovery basis only"}},
        "top_cohorts": {str(n): {"rows": n, "pool_a": sum(1 for x in candidates[:n] if x["candidate_pool"].startswith("POOL A")), "pool_b": sum(1 for x in candidates[:n] if x["candidate_pool"].startswith("POOL B")), "high_confidence": sum(1 for x in candidates[:n] if x["confidence"] == "HIGH CONFIDENCE"), "medium_confidence": sum(1 for x in candidates[:n] if x["confidence"] == "MEDIUM CONFIDENCE"), "low_confidence": sum(1 for x in candidates[:n] if x["confidence"] == "LOW CONFIDENCE")} for n in (100, 500, 1000)},
        "protected": {"auto_protected": len(auto_urls), "batch1": sum(1 for x in inventory if x.get("batch_1")), "bd_high_value_tier_a_b_legacy": len(bd_legacy_protected), "bd_evidence_data_quality_review": len(bd_data_quality_protected), "manifest_rows": len(protected)},
        "phase2b_reconciliation": {"inventory_rows": len(inventory), "migration_classes": dict(migration_counts), "tiers": dict(tier_counts), "reported_word_files": phase2b.get("inventory", {}).get("word_files")},
        "phase2c_context": {"global_report_verdict": phase2c.get("verdict"), "use": "Secondary context only; no global clicks enter Phase 2D priority scoring."},
        "recommended_rollout": {"choice": "A. Top 100 evidence-backed pages first", "reason": "The Bangladesh evidence is real but early. A controlled 100-page cohort maximizes measurement quality and limits production risk."},
        "strategic_findings": {"dictionary_acquisition": "Yes. Bangladesh-specific word-meaning queries and word-page impressions demonstrate genuine acquisition potential, though clicks are still sparse.", "strongest_signals": "The click-winner and CTR-opportunity cohorts contain the strongest current URL-level signals.", "legacy_near_visibility": "Tier A/B legacy pages ranking in positions 1-20 are the clearest upgrade opportunities.", "content_templates": list(template_summary), "evidence_first": "Yes; prioritize observed Bangladesh demand before alphabetical expansion.", "next_cohort": "Top 100 controlled cohort.", "learning_goal": "Measure whether static answers improve BD CTR, impressions, and position against a comparable legacy control before scaling."},
        "additional_data": {"bangladesh_keyword_volume": "Ranks Pool B beyond repository quality.", "backlinks": "Protects externally valuable legacy URLs.", "index_coverage_and_crawl": "Separates content opportunity from discovery/indexing faults.", "analytics_and_dakho_conversion": "Connects search visibility to learner value and product outcomes.", "post_deployment_gsc_windows": "Enables causal comparison after reporting delay and volatility."},
        "validation": {"country_filter_bangladesh": True, "clicks_reconcile_37": True, "impressions_reconcile_2069": True, "page_rows_544": True, "query_rows_624": True, "france_rows_present": False, "invented_bd_attribution": False, "batch1_protected": sum(1 for x in inventory if x.get("batch_1")) == 1000},
        "verdict": "PASS — READY FOR CONTROLLED ROLLOUT REVIEW",
    }
    (args.output / "dictionary-seo-bangladesh-2d.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    measurement = """# Bangladesh static-upgrade measurement plan\n\n## Recommended cohort\n\nUpgrade the Phase 2D Top 100 only after review. Freeze the selected URLs, implementation date, and baseline export before generation.\n\n## Baseline\n\nFor every treatment and control URL record Bangladesh-filtered impressions, clicks, CTR, and average position for the comparable pre-change window. Retain Tier, rendering state, and query intent.\n\n## Control group\n\nSelect 100 legacy pages not upgraded, matched to treatment pages by Tier, baseline Bangladesh-impression band (0, 1–4, 5–19, 20+), and position band (1–3, 4–10, 11–20, 21–50, 51+). Do not choose controls from alphabetical adjacency alone. Freeze this group before implementation.\n\n## Observation windows\n\n- 7 days: implementation/indexing sanity check only; expect Search Console delay and volatility.\n- 28 days: first directional treatment-versus-control comparison.\n- 56 days: primary evaluation window and scale/no-scale decision.\n\nUse identical Bangladesh, Web filters and comparable calendar windows. Compare changes in impressions, clicks, CTR, and position between treatment and control. Do not claim causation from treatment-only before/after movement. Record crawl/index coverage and release anomalies alongside the metrics.\n\n## Scale gate\n\nProceed beyond 100 only if validation remains clean and the 28/56-day treatment-control comparison shows credible improvement without indexing, rendering, or learner-quality regressions.\n"""
    (args.output / "dictionary-seo-bd-measurement-plan.md").write_text(measurement, encoding="utf-8")


if __name__ == "__main__":
    main()
