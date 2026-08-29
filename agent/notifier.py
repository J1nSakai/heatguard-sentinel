"""
agent/notifier.py — UPDATED with email alerts

Fires alerts when escalation.py decides risk warrants one:
1. Logs to local JSON file (existing behavior)
2. NEW: sends an email to the site manager via Gmail SMTP

Setup required in .env:
    ALERT_EMAIL_FROM=your_gmail_address@gmail.com
    ALERT_EMAIL_APP_PASSWORD=your_16_char_gmail_app_password   # NOT your normal password
    ALERT_EMAIL_TO=site_manager@example.com

Gmail requires an "App Password" (not your regular password) for SMTP.
Generate one at: https://myaccount.google.com/apppasswords
(Requires 2-Step Verification enabled on the Gmail account first.)
"""

import json
import os
import smtplib
from email.mime.text import MIMEText
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

LOG_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "logs", "alerts.jsonl")

EMAIL_FROM = os.getenv("ALERT_EMAIL_FROM")
EMAIL_APP_PASSWORD = os.getenv("ALERT_EMAIL_APP_PASSWORD")
EMAIL_TO = os.getenv("ALERT_EMAIL_TO")


def send_alert(decision: dict, recipient: str = None) -> None:
    """
    Called by escalation.py when action == "alert".
    Logs to file AND emails the site manager, if email config is present.

    `recipient` overrides ALERT_EMAIL_TO — used by alert subscriptions so a
    manager who subscribed to their own pinned site gets the email, rather
    than whoever is configured globally in .env.
    """
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)

    with open(LOG_PATH, "a") as f:
        f.write(json.dumps(decision) + "\n")

    risk_label = decision.get("risk_label", decision.get("risk_level", "unknown"))
    zone_name = decision.get("zone_name", decision.get("zone_id", "unknown site"))
    guidance = decision.get("guidance", "")

    print(f"[ALERT FIRED] {decision['timestamp']} — "
          f"zone={zone_name} — risk={risk_label} — {guidance}")

    _send_email_alert(decision, zone_name, risk_label, guidance, recipient=recipient)


def _send_email_alert(
    decision: dict,
    zone_name: str,
    risk_label: str,
    guidance: str,
    recipient: str = None,
) -> None:
    to_address = recipient or EMAIL_TO
    if not all([EMAIL_FROM, EMAIL_APP_PASSWORD, to_address]):
        print("[notifier] Email not configured (missing .env values) — skipping email, log-only.")
        return

    subject = f"⚠️ Heat Safety Alert — {zone_name} — {risk_label}"
    body = (
        f"Heat Safety Alert\n"
        f"------------------\n"
        f"Site: {zone_name}\n"
        f"Risk level: {risk_label}\n"
        f"Time: {decision.get('timestamp', datetime.now().isoformat())}\n"
        f"Apparent temperature: {decision.get('apparent_temperature_c', 'N/A')}°C\n\n"
        f"Recommended action:\n{guidance}\n\n"
        f"{decision.get('explanation', '')}\n"
    )

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = EMAIL_FROM
    msg["To"] = to_address

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(EMAIL_FROM, EMAIL_APP_PASSWORD)
            server.sendmail(EMAIL_FROM, [to_address], msg.as_string())
        print(f"[notifier] Email alert sent to {to_address}")
    except Exception as e:
        print(f"[notifier] Email send failed ({e}) — alert still logged locally.")