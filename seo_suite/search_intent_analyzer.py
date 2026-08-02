"""
Search Intent Analyzer for Ovidhan
- Fetches GSC queries for current and previous period
- Categorizes each query into learning intents (Dictionary, Grammar, Speaking, etc.)
- Detects trends (Up, Down, Flat, New)
- Outputs search_intent_report.csv
"""
import pandas as pd
from google.oauth2 import service_account
from googleapiclient.discovery import build
import argparse
from pathlib import Path
from datetime import datetime, timedelta
import re

BASE_DIR = Path(__file__).parent.parent
SERVICE_ACCOUNT_FILE = BASE_DIR / "seo_suite" / "service_account.json"
OUTPUT_CSV = BASE_DIR / "search_intent_report.csv"

# ---------------------------------------------------------------------------
# Intent classification rules (order matters – first match wins)
# ---------------------------------------------------------------------------
INTENT_RULES = [
    ("Dictionary", [
        r"meaning in bengali", r"meaning of", r"definition of",
        r"synonyms?", r"antonyms?", r"opposite of",
        r"pronunciation", r"উচ্চারণ", r"বাংলা অর্থ",
        r"what is the meaning", r"what does .* mean",
        r"define", r"dictionary",
    ]),
    ("Grammar", [
        r"tense", r"preposition", r"noun", r"verb", r"adjective", r"adverb",
        r"voice", r"narration", r"conditional", r"modal",
        r"article", r"parts of speech", r"sentence",
        r"grammar rules?", r"grammar bangla",
    ]),
    ("Speaking", [
        r"speaking", r"spoken english", r"pronunciation practice",
        r"conversation", r"dialogue", r"how to speak",
        r"fluent", r"speak english",
    ]),
    ("Writing", [
        r"essay", r"paragraph", r"letter writing",
        r"cv", r"resume", r"cover letter", r"application",
        r"email writing", r"report writing",
    ]),
    ("Reading", [
        r"reading", r"comprehension", r"passage", r"story",
        r"newspaper", r"article reading",
    ]),
    ("Listening", [
        r"listening", r"audio", r"podcast", r"bbc", r"voa",
        r"english news",
    ]),
    ("Vocabulary", [
        r"vocabulary", r"word list", r"word meaning",
        r"daily words?", r"important words?",
    ]),
    ("BCS", [
        r"bcs", r"bank job", r"psc", r"ssc english",
        r"hsc english", r"university admission",
        r"government job", r"exam preparation",
    ]),
    ("IELTS", [
        r"ielts", r"toefl", r"duolingo english test", r"pte",
    ]),
    ("Kids", [
        r"kids", r"children", r"baby", r"nursery", r"lkg", r"ukg",
        r"kid english", r"child english",
    ]),
    ("Business English", [
        r"business english", r"office english", r"professional english",
        r"meeting", r"presentation", r"corporate",
    ]),
    ("Travel", [
        r"travel", r"hotel", r"airport", r"visa interview",
        r"immigration", r"tourist", r"tourism",
    ]),
    ("Interview", [
        r"interview", r"viva", r"job interview", r"mock interview",
    ]),
    ("Banglish", [
        r"bengali", r"bangla", r"banglish", r"ইংরেজি", r"বাংলা",
        r"english to bangla", r"bangla to english",
    ]),
    ("Tools", [
        r"checker", r"builder", r"generator", r"translator",
        r"identifier", r"analyzer", r"finder",
    ]),
]

def categorize_query(query):
    """Return intent label for a given search query."""
    query_lower = query.lower().strip()
    for intent, patterns in INTENT_RULES:
        for pattern in patterns:
            if re.search(pattern, query_lower):
                return intent
    return "Other"

def fetch_gsc_data(service, property_uri, start_date, end_date):
    """Fetch raw query data for a date range."""
    request = {
        "startDate": start_date.strftime("%Y-%m-%d"),
        "endDate": end_date.strftime("%Y-%m-%d"),
        "dimensions": ["query"],
        "rowLimit": 25000,
        "aggregationType": "auto",
    }
    response = service.searchanalytics().query(siteUrl=property_uri, body=request).execute()
    rows = response.get("rows", [])
    data = []
    for row in rows:
        query = row["keys"][0]
        data.append({
            "Query": query,
            "Impressions": row.get("impressions", 0),
            "Clicks": row.get("clicks", 0),
            "CTR": row.get("ctr", 0),
            "Position": row.get("position", 0)
        })
    return data

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=90, help="Days of data to analyze")
    args = parser.parse_args()

    print("🔍 Search Intent Analyzer")
    # Auth
    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE,
        scopes=["https://www.googleapis.com/auth/webmasters.readonly"]
    )
    service = build("webmasters", "v3", credentials=credentials)
    property_uri = "https://ovidhan.net/"   # adjust if you use domain property

    # Date ranges: current period and previous period (same length)
    end_current = datetime.now()
    start_current = end_current - timedelta(days=args.days)
    end_previous = start_current
    start_previous = end_previous - timedelta(days=args.days)

    # Fetch current period data
    print(f"Fetching queries from {start_current.date()} to {end_current.date()}...")
    current_data = fetch_gsc_data(service, property_uri, start_current, end_current)
    print(f"  {len(current_data)} queries found.")

    # Fetch previous period (for trend)
    print(f"Fetching previous period...")
    previous_data = fetch_gsc_data(service, property_uri, start_previous, end_previous)
    print(f"  {len(previous_data)} queries found.")

    # Build DataFrames
    df_curr = pd.DataFrame(current_data)
    df_prev = pd.DataFrame(previous_data)

    # Categorize current period
    df_curr["Intent"] = df_curr["Query"].apply(categorize_query)

    # Categorize previous period (if data exists)
    if df_prev.empty:
        # Create an empty DataFrame with the same structure so merges don't break
        df_prev = pd.DataFrame(columns=["Query", "Intent", "Impressions", "Clicks", "Position"])
    else:
        df_prev["Intent"] = df_prev["Query"].apply(categorize_query)

    # Aggregate by intent – current period
    curr_agg = df_curr.groupby("Intent").agg(
        total_impressions=("Impressions", "sum"),
        total_clicks=("Clicks", "sum"),
        avg_position=("Position", "mean"),
        # Top 3 queries by impressions within each intent
        top_queries=("Query", lambda x: ", ".join(
            x.iloc[df_curr.loc[x.index, "Impressions"].argsort()[-3:][::-1]]
        ))
    ).reset_index()

    # Aggregate by intent – previous period (handle empty)
    if not df_prev.empty and "Intent" in df_prev.columns:
        prev_agg = df_prev.groupby("Intent").agg(
            prev_impressions=("Impressions", "sum")
        ).reset_index()
    else:
        prev_agg = pd.DataFrame(columns=["Intent", "prev_impressions"])

    # Merge current and previous, calculate trend
    report = curr_agg.merge(prev_agg, on="Intent", how="left")
    report["prev_impressions"] = report["prev_impressions"].fillna(0)
    report["impression_change"] = report["total_impressions"] - report["prev_impressions"]

    def trend_label(change, prev):
        if prev == 0:
            return "New"
        pct = change / prev
        if pct > 0.15:
            return "Up ↑"
        elif pct < -0.15:
            return "Down ↓"
        else:
            return "Flat →"

    report["Trend"] = report.apply(
        lambda r: trend_label(r["impression_change"], r["prev_impressions"]), axis=1
    )

    # Sort by impressions descending
    report = report.sort_values("total_impressions", ascending=False)

    # Save CSV
    report.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")
    print(f"✅ Report saved to {OUTPUT_CSV}")
    # Print summary table
    print(report[["Intent", "total_impressions", "total_clicks", "avg_position", "Trend"]].to_string(index=False))

if __name__ == "__main__":
    main()