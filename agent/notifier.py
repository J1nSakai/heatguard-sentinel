"""
agent/notifier.py

Fires alerts when escalation.py decides risk warrants one:
1. Logs to local JSON file
2. Sends an email — to `recipient_email` if given (e.g. from the frontend/
   API request), otherwise falls back to ALERT_EMAIL_TO in .env

Setup required in .env:
    ALERT_EMAIL_FROM=your_gmail_address@gmail.com
    ALERT_EMAIL_APP_PASSWORD=your_16_char_gmail_app_password
    ALERT_EMAIL_TO=default_fallback_email@example.com   # used if no recipient_email passed in
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
EMAIL_TO_DEFAULT = os.getenv("ALERT_EMAIL_TO")


def send_alert(decision: dict, recipient_email: str = None) -> None:
    """
    Called by escalation.py when action == "alert".

    recipient_email: dynamic recipient (e.g. site manager's email from the
    frontend). Falls back to ALERT_EMAIL_TO in .env if not provided —
    keeps this working for local/CLI testing without a frontend attached.
    """
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)

    with open(LOG_PATH, "a") as f:
        f.write(json.dumps(decision) + "\n")

    risk_label = decision.get("risk_label", decision.get("risk_level", "unknown"))
    zone_name = decision.get("zone_name", decision.get("zone_id", "unknown site"))
    guidance = decision.get("guidance", "")

    print(f"[ALERT FIRED] {decision['timestamp']} — "
          f"zone={zone_name} — risk={risk_label} — {guidance}")

    to_email = recipient_email or EMAIL_TO_DEFAULT
    _send_email_alert(decision, zone_name, risk_label, guidance, to_email)


def _send_email_alert(decision: dict, zone_name: str, risk_label: str,
                       guidance: str, to_email: str) -> None:
    if not all([EMAIL_FROM, EMAIL_APP_PASSWORD, to_email]):
        print("[notifier] Email not configured or no recipient — skipping email, log-only.")
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
    msg["To"] = to_email

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(EMAIL_FROM, EMAIL_APP_PASSWORD)
            server.sendmail(EMAIL_FROM, [to_email], msg.as_string())
        print(f"[notifier] Email alert sent to {to_email}")
    except Exception as e:
        print(f"[notifier] Email send failed ({e}) — alert still logged locally.")