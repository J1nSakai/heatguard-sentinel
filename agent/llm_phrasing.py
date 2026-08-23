"""
agent/llm_phrasing.py

Optional layer: takes escalation.py's decision object and generates a
plain-English explanation using an LLM (Claude/Gemini/etc — pick whichever
API key your team has access to).

If this isn't wired up in time, notifier.py already has a hardcoded
`recommended_response` fallback (see escalation.py's _recommend_action),
so the demo still works without this file.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Set this to whichever LLM API key your team has (Anthropic/Gemini/OpenAI).
# If none is set, phrase_alert() falls back to a template string.
LLM_API_KEY = os.getenv("LLM_API_KEY")


def phrase_alert(decision: dict, landcover_context: dict = None) -> str:
    """
    Generates a plain-language alert message.

    decision: the dict from escalation.py's evaluate_site()
    landcover_context: optional dict from Person B's insights/landcover.py,
                        e.g. {"asphalt_pct": 70, "shade_pct": 5}
                        (pass None if not available yet)
    """
    if not LLM_API_KEY:
        return _fallback_template(decision, landcover_context)

    try:
        return _call_llm(decision, landcover_context)
    except Exception as e:
        print(f"[llm_phrasing] LLM call failed ({e}), using fallback template.")
        return _fallback_template(decision, landcover_context)


def _fallback_template(decision: dict, landcover_context: dict = None) -> str:
    """No-LLM fallback — still produces a readable alert message."""
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


def _call_llm(decision: dict, landcover_context: dict = None) -> str:
    """
    Real LLM call — fill in once you've picked a provider.
    Example structure for Anthropic's API (adjust for whichever you use):

    import anthropic
    client = anthropic.Anthropic(api_key=LLM_API_KEY)
    prompt = f"Explain this construction-site heat alert in one plain sentence a site manager can act on: {decision}"
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=150,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text
    """
    raise NotImplementedError("Wire up your chosen LLM provider here.")


if __name__ == "__main__":
    # quick manual test with a fake decision
    fake_decision = {
        "risk_tier": "high",
        "threshold_c": 38.0,
        "persistence_hours": 6.5,
        "recommended_response": "Mandate 15-min shaded break; monitor workers for symptoms.",
    }
    fake_landcover = {"asphalt_pct": 65, "shade_pct": 8}
    print(phrase_alert(fake_decision, fake_landcover))