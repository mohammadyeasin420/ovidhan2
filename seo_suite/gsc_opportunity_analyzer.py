"""
GSC Opportunity Analyzer for Ovidhan
Finds keywords ranking 5-15 with high impressions – low-hanging fruit for quick ranking gains.
Outputs a CSV with page URLs, query, current position, impressions, and clicks.
"""
import pandas as pd
from google.oauth2 import service_account
from googleapiclient.discovery import build
import argparse
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
SERVICE_ACCOUNT_FILE = BASE_DIR / "seo_suite" / "service_account.json"

def fetch_gsc_data(days=90):
    """Fetch last `days` of search analytics from GSC."""
    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE,
        scopes=["https://www.googleapis.com/auth/webmasters.readonly"]
    )
    service = build("webmasters", "v3", credentials=credentials)

    # Your Search Console property (URL-prefix)
    property_uri = "https://ovidhan.net/"

    # Dates must be strings in YYYY-MM-DD format
    start_date = (pd.Timestamp.now() - pd.Timedelta(days=days)).strftime("%Y-%m-%d")
    end_date = pd.Timestamp.now().strftime("%Y-%m-%d")

    request = {
        "startDate": start_date,
        "endDate": end_date,
        "dimensions": ["page", "query"],
        "rowLimit": 25000,
        "aggregationType": "auto",
    }

    response = service.searchanalytics().query(siteUrl=property_uri, body=request).execute()
    rows = response.get("rows", [])

    data = []
    for row in rows:
        page = row["keys"][0]
        query = row["keys"][1]
        impressions = row.get("impressions", 0)
        clicks = row.get("clicks", 0)
        position = row.get("position", 0)
        ctr = row.get("ctr", 0)
        if 5 <= position <= 15 and impressions > 5:
            data.append({
                "Page": page,
                "Query": query,
                "Impressions": impressions,
                "Clicks": clicks,
                "CTR": round(ctr, 4),
                "Position": round(position, 1)
            })
    return data

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=90, help="Days of data to pull")
    args = parser.parse_args()

    print(f"🔎 Fetching GSC data for last {args.days} days...")
    data = fetch_gsc_data(days=args.days)
    if not data:
        print("No opportunities found (or no data yet).")
        return
    df = pd.DataFrame(data)
    df = df.sort_values("Impressions", ascending=False)
    output_csv = BASE_DIR / "gsc_opportunities.csv"
    df.to_csv(output_csv, index=False, encoding="utf-8-sig")
    print(f"✅ Saved {len(df)} opportunities to {output_csv}")
    print("Top 10:")
    print(df.head(10).to_string(index=False))

if __name__ == "__main__":
    main()