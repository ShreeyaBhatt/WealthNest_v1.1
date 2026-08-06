"""
api/models.py — Django's Own Database Model

WHY does Django need its own model if all the "real" WealthNest data
(users, families, investments) lives in MongoDB via Node?

Because every time someone calls /api/predict-risk/ or
/api/predict-future/, it's useful to keep a small log of what was asked
and what the model answered — for debugging, and so we can show a
history of past predictions later. That log is genuinely Django's own
data (it's about Django's own work, not about the user's investments),
so it's a perfect, honest use of Django's built-in SQLite database and
ORM — no MongoDB needed for this part.

Whenever you change this file, remember to run:
    python manage.py makemigrations
    python manage.py migrate
so Django actually creates/updates the database table to match.
"""

from django.db import models


class PredictionLog(models.Model):
    # Which kind of prediction was this? Risk category, or future value?
    PREDICTION_TYPE_CHOICES = [
        ('risk', 'Risk Classification'),
        ('future_value', 'Future Value Regression'),
        ('recommendation', 'Investment Recommendation'),
        ('health_score', 'Portfolio Health Score'),
    ]

    prediction_type = models.CharField(max_length=20, choices=PREDICTION_TYPE_CHOICES)

    # We don't know in advance exactly which fields will be sent in
    # (that can change as the ML model evolves), so a JSONField is a
    # simple way to store "whatever features were used" without needing
    # a rigid column for every possible feature.
    input_features = models.JSONField()

    # Same idea for the result — could be a risk category + confidence,
    # or a set of 1/3/5 year value predictions.
    result = models.JSONField()

    # auto_now_add fills this in automatically the moment the row is
    # created — we never set it ourselves.
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Newest predictions first, by default.
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.prediction_type} prediction at {self.created_at}"
