import json
import requests
from datetime import datetime
from pathlib import Path
ROOT = Path(__file__).parent

FEEDBACK_FILE = ROOT / "feedback_data.json"
WEBHOOK_URL = "YOUR_WEBHOOK_URL"  # Replace with Slack/Discord/Telegram webhook

def collect_feedback(user_message, rating, page_url):
    data = {
        "timestamp": datetime.now().isoformat(),
        "message": user_message,
        "rating": rating,
        "page": page_url,
    }

    # Save locally
    try:
        with open(FEEDBACK_FILE, 'r') as f:
            existing = json.load(f)
    except:
        existing = []
    existing.append(data)
    with open(FEEDBACK_FILE, 'w') as f:
        json.dump(existing, f, indent=2)

    # Send to webhook
    if WEBHOOK_URL != "YOUR_WEBHOOK_URL":
        try:
            requests.post(WEBHOOK_URL, json={"text": f"📝 New Feedback: {data['message']}"})
        except:
            pass

    print("✅ Feedback saved!")

def generate_feedback_report():
    try:
        with open(FEEDBACK_FILE, 'r') as f:
            data = json.load(f)
    except:
        print("No feedback data.")
        return

    print(f"📊 Total feedback entries: {len(data)}")
    avg_rating = sum(d.get('rating', 0) for d in data) / len(data) if data else 0
    print(f"⭐ Average rating: {avg_rating:.1f}/5")

if __name__ == "__main__":
    generate_feedback_report()