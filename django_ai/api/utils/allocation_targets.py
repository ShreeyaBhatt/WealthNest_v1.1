"""
api/utils/allocation_targets.py — Shared "ideal" portfolio splits

Both the recommendation engine (recommend.py) and the health score
(health_score.py) need something to compare a user's actual
equity/debt/gold split against. These numbers are simple, commonly-cited
rules of thumb — not a precise financial model. We're upfront about that
here, the same way train_models.py is upfront about its synthetic
training data: a rule a user can actually understand ("you're 20 points
over the usual target for your risk profile") is more useful to a
student project than a black-box number would be.
"""

TARGET_ALLOCATIONS = {
    'aggressive':   {'equity': 70, 'debt': 20, 'gold': 10},
    'moderate':     {'equity': 50, 'debt': 40, 'gold': 10},
    'conservative': {'equity': 30, 'debt': 60, 'gold': 10},
}

DEFAULT_PROFILE = 'moderate'


def get_target(risk_profile):
    """Falls back to 'moderate' if the profile is missing/unrecognized —
    same default the User model uses on the Node side."""
    return TARGET_ALLOCATIONS.get(risk_profile, TARGET_ALLOCATIONS[DEFAULT_PROFILE])
