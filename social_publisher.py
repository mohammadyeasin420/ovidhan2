import os
import json
import requests
from pathlib import Path
from datetime import datetime
ROOT = Path(__file__).parent
CONFIG_FILE = ROOT / "social_config.json"

def load_config():
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return {}

def publish_to_twitter(message):
    # Requires Twitter API v2 setup with OAuth 2.0
    # This is a placeholder – you'll need to add your own credentials
    config = load_config()
    if 'twitter' not in config:
        print("⚠️ Twitter credentials not configured.")
        return
    # Add your Twitter API call here
    print(f"🐦 Would tweet: {message}")

def publish_new_content(page_url, page_title):
    message = f"📚 New lesson: {page_title}\n\nLearn English for free at Ovidhan!\n{page_url}"
    publish_to_twitter(message)

if __name__ == "__main__":
    # Example: publish_to_twitter("New A2 course available at https://ovidhan.net/learning-path-elementary.html")
    print("📝 Social publisher ready.")