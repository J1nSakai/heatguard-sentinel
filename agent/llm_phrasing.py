"""
agent/llm_phrasing.py

Turns escalation.py's decision object into a plain-English explanation
using Groq's API (fast Llama/Mixtral inference).

Falls back to a template string if GROQ_API_KEY isn't set or the call fails
— so the demo never breaks even without the LLM layer working.
"""

import os
from dotenv import load_dotenv

load_dotenv()
print("SCRIPT STARTED")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")


def phrase_alert(decision: dict, landcover_context: dict = None) -> str:
    """
    decision: dict from escalation.py's evaluate_site()
    landcover_context: optional dict from Person B's insights/landcover.py,
                        e.g. {"asphalt_pct": 70, "shade_pct": 5}
    """
    if not GROQ_API_KEY:
        return _fallback_template(decision, landcover_context)

    try:
        return _call_groq(decision, landcover_context)
    except Exception as e:
        print(f"[llm_phrasing] Groq call failed ({e}), using fallback template.")
        return _fallback_template(decision, landcover_context)


def _fallback_template(decision: dict, landcover_context: dict = None) -> str:
    msg = (
        f"Heat risk level: {decision['risk_tier'].upper()}. "
        f"Site has been above {decision['threshold_c']}°C for "
        f"{decision['persistence_hours']:.1f} continuous hours. "
        f"Recommended action: {decision.get('recommended_response', 'Monitor conditions.')}"
    )
    if landcover_context:
        asphalt = landcover_context.get("asphalt_pct")
        shade = landcover_context.get("shade_pct")
        if asphalt is not None and shade is not None:
            msg += f" Zone context: {asphalt}% asphalt coverage, {shade}% shade — low shade increases exposure risk."
    return msg


def _call_groq(decision: dict, landcover_context: dict = None) -> str:
    from groq import Groq

    client = Groq(api_key=GROQ_API_KEY)

    context_line = ""
    if landcover_context:
        context_line = (
            f" Land cover: {landcover_context.get('asphalt_pct')}% asphalt, "
            f"{landcover_context.get('shade_pct')}% shade."
        )

    prompt = (
        f"You are a construction-site heat safety assistant. Write ONE short, "
        f"plain-language sentence a site manager can immediately act on, based on this data:\n"
        f"Risk tier: {decision['risk_tier']}\n"
        f"Threshold: {decision['threshold_c']}°C\n"
        f"Continuous hours above threshold: {decision['persistence_hours']}\n"
        f"Recommended action: {decision.get('recommended_response', '')}\n"
        f"{context_line}\n"
        f"Keep it under 30 words, no preamble."
    )

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",   # fast, small — good fit for this use-case
        messages=[{"role": "user", "content": prompt}],
        max_tokens=500,
        temperature=0.3,
    )
    return response.choices[0].message.content.strip()


if __name__ == "__main__":
    import traceback
    fake_decision = {
        "risk_tier": "high",
        "threshold_c": 38.0,
        "persistence_hours": 6.5,
        "recommended_response": "Mandate 15-min shaded break; monitor workers for symptoms.",
    }
    fake_landcover = {"asphalt_pct": 65, "shade_pct": 8}
    try:
        result = phrase_alert(fake_decision, fake_landcover)
        print("RESULT:", result)
    except Exception as e:
        print("CRASHED:")
        traceback.print_exc()