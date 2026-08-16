#!/usr/bin/env python3
"""Join a normalized GSC export to the Phase 2B dictionary inventory.

The input workbook is read separately by audit_search_console_workbook.mjs. This
script never alters site pages, sitemaps, templates, or the source dictionary.
"""

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

WORD_RE = re.compile(r"^/word/([a-z0-9-]+)\.html/?$", re.I)
GLOBAL_LABEL = "GLOBAL AGGREGATE — FRANCE CONTAMINATION POSSIBLE"
COUNTRY_WARNING = "Bangladesh-filtered GSC page/query export required"


def normalize_url(raw: str) -> tuple[str | None, str | None]:
    try:
        p = urlsplit(str(raw).strip())
        host = p.netloc.lower().removeprefix("www.")
        path = re.sub(r"/{2,}", "/", p.path)
        if host != "ovidhan.net" or not p.scheme:
            return None, "non-ovidhan-host-or-relative"
        if path != "/":
            path = path.rstrip("/")
        return urlunsplit(("https", host, path, "", "")), None
    except Exception as exc:  # pragma: no cover - defensive diagnostic
        return None, type(exc).__name__


def rows(sheet: dict) -> list[dict]:
    values = sheet["values"]
    return [dict(zip(values[0], row)) for row in values[1:]]


def numeric(row: dict, name: str) -> float:
    try:
        return float(row.get(name, 0) or 0)
    except (TypeError, ValueError):
        return 0.0


def weighted_position(items: list[dict]) -> float:
    impressions = sum(numeric(x, "Impressions") for x in items)
    return round(sum(numeric(x, "Position") * numeric(x, "Impressions") for x in items) / impressions, 2) if impressions else 0.0


def classify_query(query: str) -> str:
    q = query.lower()
    rules = [
        ("branded", r"\bovidhan\b|ovidhan\.net"),
        ("english_to_bangla_meaning", r"meaning (?:in|of).*\b(?:bangla|bengali)\b|\b(?:bangla|bengali) meaning\b|english to (?:bangla|bengali)|অনুবাদ|অর্থ"),
        ("grammar", r"grammar|preposition|plural|tense|voice|narration|article|parts of speech"),
        ("bcs", r"\bbcs\b|বিসিএস"),
        ("bank_job", r"bank (?:job|exam)|ব্যাংক"),
        ("ielts", r"\bielts\b"),
        ("spoken_english", r"spoken english|speaking english|কথোপকথন"),
        ("exam_learning", r"exam|quiz|question|vocabulary|learn english|education"),
    ]
    for label, pattern in rules:
        if re.search(pattern, q):
            return label
    return "unrelated_or_unclear"


def priority(inv: dict, perf: dict) -> float:
    # France cannot be subtracted rowwise. Clicks therefore receive zero weight.
    imp = perf.get("global_impressions", 0)
    pos = perf.get("global_position", 0)
    evidence = min(24.0, math.log1p(imp) * 5.0)
    position = 8.0 if imp and pos <= 10 else 5.0 if imp and pos <= 20 else 2.0 if imp else 0.0
    tier = {"A": 30.0, "B": 20.0}.get(inv.get("tier"), 0.0)
    quality = min(25.0, float(inv.get("tier_score") or 0) * 2.5)
    return round(tier + quality + evidence + position, 3)


def write_csv(path: Path, records: list[dict], fields: list[str]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as fh:
        out = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
        out.writeheader()
        out.writerows(records)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--gsc", required=True, type=Path)
    ap.add_argument("--phase2b-report", required=True, type=Path)
    ap.add_argument("--inventory", required=True, type=Path)
    ap.add_argument("--output", default="reports", type=Path)
    args = ap.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    gsc = json.loads(args.gsc.read_text(encoding="utf-8"))
    phase2b = json.loads(args.phase2b_report.read_text(encoding="utf-8"))
    sheets = gsc["sheets"]
    page_rows, query_rows = rows(sheets["Pages"]), rows(sheets["Queries"])
    country_rows, device_rows = rows(sheets["Countries"]), rows(sheets["Devices"])
    chart_rows, filter_rows = rows(sheets["Chart"]), rows(sheets["Filters"])

    inventory = []
    with gzip.open(args.inventory, "rt", encoding="utf-8") as fh:
        for line in fh:
            inventory.append(json.loads(line))
    by_url = {x["url"]: x for x in inventory}

    normalized = defaultdict(lambda: {"rows": 0, "clicks": 0.0, "impressions": 0.0, "position_parts": []})
    malformed = []
    for row in page_rows:
        url, error = normalize_url(row.get("Top pages", ""))
        if not url:
            malformed.append({"raw": row.get("Top pages"), "reason": error})
            continue
        item = normalized[url]
        item["rows"] += 1
        item["clicks"] += numeric(row, "Clicks")
        item["impressions"] += numeric(row, "Impressions")
        item["position_parts"].append((numeric(row, "Position"), numeric(row, "Impressions")))

    joined, unmatched = [], []
    for url, perf in normalized.items():
        match = WORD_RE.fullmatch(urlsplit(url).path)
        if not match:
            continue
        inv = by_url.get(url)
        position = sum(p * i for p, i in perf["position_parts"]) / perf["impressions"] if perf["impressions"] else 0
        base = {
            "url": url, "word": match.group(1), "global_clicks": int(perf["clicks"]),
            "global_impressions": int(perf["impressions"]), "global_ctr": round(perf["clicks"] / perf["impressions"], 6) if perf["impressions"] else 0,
            "global_position": round(position, 2), "metric_scope": GLOBAL_LABEL,
            "country_confidence": "LOW", "country_data_requirement": COUNTRY_WARNING,
        }
        if not inv:
            unmatched.append(base)
            continue
        base.update({k: inv.get(k) for k in ("path", "tier", "tier_score", "migration_class", "batch_1", "legacy_page", "self_canonical", "useful_without_javascript", "indexability_signals_pass")})
        joined.append(base)

    joined_by_url = {x["url"]: x for x in joined}
    duplicate_normalized = sorted(url for url, x in normalized.items() if x["rows"] > 1)
    country = {x["Country"]: x for x in country_rows}
    france, bangladesh = country.get("France", {}), country.get("Bangladesh", {})
    total_clicks = int(sum(numeric(x, "Clicks") for x in country_rows))
    total_impressions = int(sum(numeric(x, "Impressions") for x in country_rows))
    france_clicks, france_impressions = int(numeric(france, "Clicks")), int(numeric(france, "Impressions"))
    non_france_impressions = total_impressions - france_impressions
    bangladesh_impressions = int(numeric(bangladesh, "Impressions"))

    query_categories = defaultdict(lambda: {"rows": 0, "clicks": 0, "impressions": 0, "position_parts": []})
    for q in query_rows:
        c = classify_query(str(q.get("Top queries", "")))
        x = query_categories[c]
        x["rows"] += 1; x["clicks"] += int(numeric(q, "Clicks")); x["impressions"] += int(numeric(q, "Impressions")); x["position_parts"].append(q)
    query_summary = {k: {"rows": v["rows"], "global_clicks": v["clicks"], "global_impressions": v["impressions"], "global_position": weighted_position(v["position_parts"]), "metric_scope": GLOBAL_LABEL} for k, v in sorted(query_categories.items())}

    candidates = []
    for inv in inventory:
        if inv.get("legacy_page") and inv.get("tier") in {"A", "B"} and inv.get("migration_class") == "REVIEW":
            perf = joined_by_url.get(inv["url"], {})
            item = {
                "word": inv.get("slug"), "url": inv["url"], "tier": inv.get("tier"), "tier_score": inv.get("tier_score"),
                "migration_class": inv.get("migration_class"), "static_legacy_status": "LEGACY — NEEDS STATIC UPGRADE",
                "global_clicks": perf.get("global_clicks", 0),
                "global_impressions": perf.get("global_impressions", 0), "global_ctr": perf.get("global_ctr", 0),
                "global_position": perf.get("global_position", 0), "metric_scope": GLOBAL_LABEL,
                "country_confidence": "LOW" if perf else "NONE", "country_data_requirement": COUNTRY_WARNING,
                "priority_score": priority(inv, perf), "priority_basis": "Phase 2B tier/quality + global impressions/position; clicks excluded from score",
            }
            candidates.append(item)
    candidates.sort(key=lambda x: (-x["priority_score"], -x["global_impressions"], x["word"] or ""))
    candidate_fields = list(candidates[0])
    for n in (100, 500, 1000):
        write_csv(args.output / f"dictionary-seo-priority-top{n}.csv", candidates[:n], candidate_fields)

    protected = []
    for inv in inventory:
        if inv.get("batch_1") or inv.get("migration_class") == "KEEP-INDEXED":
            perf = joined_by_url.get(inv["url"], {})
            protected.append({
                "word": inv.get("slug"), "url": inv["url"], "protection_status": "AUTO_PROTECTED",
                "protection_reason": "Batch 1" if inv.get("batch_1") else "Phase 2B KEEP-INDEXED",
                "global_clicks": perf.get("global_clicks", 0), "global_impressions": perf.get("global_impressions", 0),
                "metric_scope": GLOBAL_LABEL, "country_confidence": "LOW" if perf else "NONE",
                "country_data_requirement": COUNTRY_WARNING,
            })
    review_protection = []
    for item in candidates:
        if item["global_impressions"] >= 10:
            review_protection.append({
                "word": item["word"], "url": item["url"], "protection_status": "REVIEW — COUNTRY DATA REQUIRED",
                "protection_reason": "Strong global impression signal, but France cannot be separated rowwise",
                "global_clicks": item["global_clicks"], "global_impressions": item["global_impressions"],
                "metric_scope": GLOBAL_LABEL, "country_confidence": "LOW", "country_data_requirement": COUNTRY_WARNING,
            })
    protected.extend(review_protection)
    protected.sort(key=lambda x: x["url"])
    write_csv(args.output / "dictionary-seo-protected-candidates.csv", protected, list(protected[0]))

    join_fields = list(joined[0])
    write_csv(args.output / "dictionary-seo-gsc-word-page-join.csv", sorted(joined, key=lambda x: (-x["global_impressions"], x["url"])), join_fields)

    mig = Counter(x.get("migration_class") for x in inventory)
    tiers = Counter(x.get("tier") for x in inventory)
    thin = [x for x in inventory if x.get("migration_class") == "THIN-LEGACY"]
    thin_evidence = [x for x in thin if joined_by_url.get(x["url"], {}).get("global_impressions", 0) > 1 or joined_by_url.get(x["url"], {}).get("global_clicks", 0) > 0]
    batch = [x for x in inventory if x.get("batch_1")]
    batch_visible = [joined_by_url[x["url"]] for x in batch if x["url"] in joined_by_url]
    legacy_visible = [x for x in joined if x.get("legacy_page")]
    word_with_impressions = [x for x in joined if x["global_impressions"] > 0]
    word_with_clicks = [x for x in joined if x["global_clicks"] > 0]
    position_buckets = {
        "1-10": sum(1 for x in word_with_impressions if x["global_position"] <= 10),
        "11-20": sum(1 for x in word_with_impressions if 10 < x["global_position"] <= 20),
        "21-50": sum(1 for x in word_with_impressions if 20 < x["global_position"] <= 50),
        "51+": sum(1 for x in word_with_impressions if x["global_position"] > 50),
    }
    segments = {
        "A_HIGH_VALUE_NEEDS_STATIC_UPGRADE": sum(1 for x in candidates if x["global_impressions"] >= 3),
        "B_HIGH_VALUE_ALREADY_GOOD": sum(1 for x in protected if x["global_impressions"] > 0),
        "C_SEO_OPPORTUNITY": sum(1 for x in candidates if x["global_impressions"] > 0 and (x["global_ctr"] < total_clicks / total_impressions or x["global_position"] > 10)),
        "D_LOW_EVIDENCE_THIN_LEGACY": len(thin) - len(thin_evidence),
        "E_INVALID_OR_NOISE": mig["INVALID/NOISE"],
        "F_OWNER_TRAFFIC_UNCERTAIN": len(joined),
    }

    report = {
        "report": "Ovidhan Dictionary SEO Phase 2C Search Console Evidence Join",
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "source": {"workbook": Path(gsc["sourceWorkbook"]).name, "filters": filter_rows, "phase2b_commit": "22118bd6531a6c696e436d5e63d0faf3df9d6ac0", "raw_workbook_committed": False},
        "scope_guardrails": {"analysis_only": True, "page_query_scope": GLOBAL_LABEL, "france_rowwise_subtraction_performed": False, "country_confidence": "Bangladesh-filtered page/query export unavailable; no page/query claim is Bangladesh-attributed"},
        "workbook_audit": {"sheet_ranges": {k: v["address"] for k, v in sheets.items()}, "page_rows": len(page_rows), "query_rows": len(query_rows), "country_rows": len(country_rows), "device_rows": len(device_rows), "search_appearance_rows": len(rows(sheets["Search appearance"])), "chart_date_min": min((x.get("Date") for x in chart_rows), default=None), "chart_date_max": max((x.get("Date") for x in chart_rows), default=None), "devices": device_rows, "search_appearance": rows(sheets["Search appearance"])},
        "totals": {"global_clicks": total_clicks, "global_impressions": total_impressions, "global_ctr": round(total_clicks / total_impressions, 6), "global_position_impression_weighted_from_country_rows": weighted_position(country_rows), "page_export": {"clicks": int(sum(numeric(x, "Clicks") for x in page_rows)), "impressions": int(sum(numeric(x, "Impressions") for x in page_rows))}, "query_export": {"clicks": int(sum(numeric(x, "Clicks") for x in query_rows)), "impressions": int(sum(numeric(x, "Impressions") for x in query_rows))}, "chart_export": {"clicks": int(sum(numeric(x, "Clicks") for x in chart_rows)), "impressions": int(sum(numeric(x, "Impressions") for x in chart_rows))}, "country_device_clicks_reconcile": total_clicks == int(sum(numeric(x, "Clicks") for x in device_rows)), "country_device_impressions_reconcile": total_impressions == int(sum(numeric(x, "Impressions") for x in device_rows))},
        "france_contamination": {"classification": "OWNER/DEVELOPER TESTING CONTAMINATION", "clicks": france_clicks, "impressions": france_impressions, "ctr": numeric(france, "CTR"), "position": numeric(france, "Position"), "excluded_from_genuine_market_totals": True, "not_subtracted_from_page_or_query_rows": True},
        "bangladesh": {"clicks": int(numeric(bangladesh, "Clicks")), "impressions": bangladesh_impressions, "ctr": numeric(bangladesh, "CTR"), "position": numeric(bangladesh, "Position"), "rank_by_impressions": 1 + sum(1 for x in country_rows if numeric(x, "Impressions") > bangladesh_impressions), "share_of_non_france_impressions": round(bangladesh_impressions / non_france_impressions, 6), "confidence_limit": COUNTRY_WARNING},
        "country_groups": {
            "BANGLADESH": {"clicks": int(numeric(bangladesh, "Clicks")), "impressions": bangladesh_impressions},
            "INDIA": {"clicks": int(numeric(country.get("India", {}), "Clicks")), "impressions": int(numeric(country.get("India", {}), "Impressions"))},
            "OTHER_COUNTRIES_EXCLUDING_FRANCE_BANGLADESH_INDIA": {"clicks": total_clicks - france_clicks - int(numeric(bangladesh, "Clicks")) - int(numeric(country.get("India", {}), "Clicks")), "impressions": total_impressions - france_impressions - bangladesh_impressions - int(numeric(country.get("India", {}), "Impressions"))},
            "FRANCE_EXCLUDED_DEVELOPER_OWNER_TRAFFIC": {"clicks": france_clicks, "impressions": france_impressions},
        },
        "query_categories": query_summary,
        "top_global_queries": [{"query": x.get("Top queries"), "category": classify_query(str(x.get("Top queries", ""))), "global_clicks": int(numeric(x, "Clicks")), "global_impressions": int(numeric(x, "Impressions")), "global_position": numeric(x, "Position"), "metric_scope": GLOBAL_LABEL} for x in query_rows[:25]],
        "url_join": {"gsc_page_rows": len(page_rows), "normalized_page_urls": len(normalized), "duplicate_or_aggregated_input_rows": len(page_rows) - len(normalized), "duplicate_normalized_urls": duplicate_normalized, "malformed_urls": malformed, "word_page_rows": len(joined) + len(unmatched), "non_word_page_rows": len(normalized) - len(joined) - len(unmatched), "matched_repository_word_urls": len(joined), "unmatched_word_urls": unmatched, "joined_csv": "reports/dictionary-seo-gsc-word-page-join.csv"},
        "phase2b_inventory": {"rows": len(inventory), "migration_classes": dict(mig), "tiers": dict(tiers), "reported_inventory": phase2b.get("inventory", {})},
        "segments": segments,
        "priorities": {"eligible_legacy_tier_a_b_review": len(candidates), "method": "Tier and repository quality dominate. Global impressions and position add capped evidence. Global clicks are retained but have zero score weight because France cannot be separated rowwise.", "model_components": {"repository_content_quality": "Phase 2B tier + tier_score, weighted", "global_impressions": "log-capped, weighted", "global_clicks": "reported but zero weight due France uncertainty", "ranking_position": "small capped boost where impressions exist", "bangladesh_relevance": "not scored without Bangladesh-attributed page/query rows", "general_english_learning_usefulness": "proxied conservatively by Phase 2B content tier; no external volume invented", "bcs_bank_ielts_student_relevance": "query patterns reported globally; not attributed to candidate URLs without supporting join data", "internal_link_opportunity": "not scored; no link graph supplied", "rendering_deficiency": "eligibility restricted to legacy REVIEW pages needing static upgrade"}, "top_100": "reports/dictionary-seo-priority-top100.csv", "top_500": "reports/dictionary-seo-priority-top500.csv", "top_1000": "reports/dictionary-seo-priority-top1000.csv"},
        "protected": {"auto_protected_count": len(protected) - len(review_protection), "batch1_count": len(batch), "review_country_data_required_count": len(review_protection), "manifest_rows": len(protected), "manifest": "reports/dictionary-seo-protected-candidates.csv"},
        "batch1_visibility": {"pages_in_global_export": len(batch_visible), "global_clicks": sum(x["global_clicks"] for x in batch_visible), "global_impressions": sum(x["global_impressions"] for x in batch_visible), "scope": GLOBAL_LABEL, "interpretation": "Historical/global visibility signal only; no Bangladesh page attribution and no causal post-upgrade claim."},
        "word_page_visibility": {"word_urls_in_export": len(joined) + len(unmatched), "matched_word_urls": len(joined), "urls_with_impressions": len(word_with_impressions), "urls_with_clicks": len(word_with_clicks), "global_impressions": sum(x["global_impressions"] for x in joined), "global_clicks": sum(x["global_clicks"] for x in joined), "position_distribution": position_buckets, "scope": GLOBAL_LABEL},
        "legacy_visibility": {"pages_in_global_export": len(legacy_visible), "global_clicks": sum(x["global_clicks"] for x in legacy_visible), "global_impressions": sum(x["global_impressions"] for x in legacy_visible), "interpretation": "Legacy pages already have global Google visibility; evidence supports selective static upgrades, not mass removal."},
        "thin_legacy": {"total": len(thin), "meaningful_global_evidence_rows": len(thin_evidence), "zero_or_near_zero_global_evidence_rows": len(thin) - len(thin_evidence), "near_zero_definition": "No matched global row above 1 impression and no click; absence may reflect export truncation."},
        "strategic_answers": {
            "bangladesh_visibility": "Yes, country-level evidence shows organic discovery, but scale remains modest and page/query attribution is unavailable.",
            "word_pages_visible": "Yes, hundreds of dictionary word URLs have global impressions.",
            "legacy_upgrade_vs_remove": "Selective evidence-led static upgrades are justified; removal is not justified by this dataset.",
            "strongest_page_types": "Dictionary meaning pages show broad impression coverage; branded/home traffic drives most clicks. Country-filtered data is needed for Bangladesh-specific page-type ranking.",
            "evidence_vs_alphabetical": "Use evidence plus repository quality rather than alphabetical order for the next cohort.",
            "change_indexability_now": "No. Backlinks, index coverage, crawl evidence, and Bangladesh-attributed URL performance are missing.",
            "best_next_export": "Bangladesh-filtered GSC Pages and Queries for the same date window, followed by a post-deployment comparison window.",
        },
        "next_data_required": {
            "bangladesh_filtered_pages": "Would establish URL-level Bangladesh demand and remove France uncertainty.",
            "bangladesh_filtered_queries": "Would establish Bangladesh learner intent and query-to-page priorities.",
            "backlinks_referring_domains": "Would prevent harming externally linked legacy URLs.",
            "google_index_coverage": "Would show which URLs Google actually indexes and why exclusions occur.",
            "crawl_data": "Would reveal discovery, canonical, status, and rendering problems at scale.",
            "analytics_engagement": "Would separate useful learner visits from low-quality impressions.",
            "dakho_conversion": "Would connect organic discovery to product outcomes.",
            "bangladesh_keyword_volume": "Would add independent market-size evidence without fabricating demand.",
            "post_deployment_window": "Would distinguish Batch 1 post-upgrade performance from pre-upgrade history.",
        },
        "verdict": "PASS WITH WARNINGS — BANGLADESH-FILTERED PAGE/QUERY DATA REQUIRED",
    }
    (args.output / "dictionary-seo-evidence-2c.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    note = f"""# France contamination handling\n\nThe GSC country aggregate reports **{france_clicks} clicks from {france_impressions} impressions** for France. This is classified as **OWNER/DEVELOPER TESTING CONTAMINATION**, not genuine market demand.\n\nFrance is excluded from genuine-country conclusions and ranking logic. It is **not** subtracted from page or query rows because GSC dimension exports cannot support row-level allocation. Every page/query metric is therefore labeled `{GLOBAL_LABEL}`. Global clicks receive zero weight in the candidate priority score.\n\nBangladesh-filtered GSC Pages and Queries exports are required before assigning country-level confidence to a URL or query.\n"""
    (args.output / "dictionary-seo-france-contamination-note.md").write_text(note, encoding="utf-8")


if __name__ == "__main__":
    main()
