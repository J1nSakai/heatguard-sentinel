"""
agent/run_subscriptions.py

Evaluates every saved alert subscription once and emails the ones whose
current risk tier meets the subscriber's threshold.

Run manually:
    python -m agent.run_subscriptions
    python -m agent.run_subscriptions --simulate      # demo safety net
    python -m agent.run_subscriptions --simulate-temp 47

Intended to be triggered on a schedule (cron / Task Scheduler) — the design
is deliberately "one pass, then exit" rather than a long-lived daemon, so
there is no process to babysit during the demo.

Nothing here re-implements risk logic: it reuses evaluate_pinned_zone() in
agent/escalation.py, which is the same classifier the pre-loaded demo zones
go through.
"""

import sys

from agent.escalation import evaluate_pinned_zone
from agent.subscriptions import (
    list_subscriptions,
    mark_checked,
    subscription_to_zone,
)


def run_once(simulate: bool = False, simulate_temp_c: float = 42.0) -> list:
    """Evaluate every subscription. Returns the list of decision objects."""
    subs = list_subscriptions()
    if not subs:
        print("No alert subscriptions saved — nothing to check.")
        return []

    print(f"Checking {len(subs)} subscription(s)...")
    decisions = []

    for sub in subs:
        zone = subscription_to_zone(sub)
        label = f"{sub['name']} ({sub['lat']:.4f}, {sub['lon']:.4f}) -> {sub['email']}"
        try:
            decision = evaluate_pinned_zone(
                zone,
                min_tier=sub["min_tier"],
                recipient=sub["email"],
                simulate=simulate,
                simulate_temp_c=simulate_temp_c,
            )
        except Exception as exc:
            # One bad subscription (e.g. a coordinate the API rejects) must
            # not stop the others from being checked.
            print(f"  [error] {label}: {exc}")
            continue

        alerted = decision["action"] == "alert"
        mark_checked(sub["id"], alerted=alerted)
        decisions.append(decision)

        state = "ALERTED" if alerted else "no alert"
        print(
            f"  {label}: {decision['apparent_temperature_c']}°C "
            f"-> {decision['risk_label']} ({decision['risk_level']}) "
            f"[min_tier={sub['min_tier']}] {state}"
        )

    return decisions


if __name__ == "__main__":
    simulate = "--simulate" in sys.argv
    temp = 42.0
    if "--simulate-temp" in sys.argv:
        temp = float(sys.argv[sys.argv.index("--simulate-temp") + 1])
    run_once(simulate=simulate, simulate_temp_c=temp)
