"""
Adaptive Learning Model — 4-tier difficulty system.

Levels (ascending): easy → intermediate → pro → mastery

Inputs:
  - recent_accuracy  : float  (0.0–1.0) over last N questions
  - avg_time_seconds : float
  - streak           : int (consecutive corrects)
  - current_difficulty: str

Output:
  - next_difficulty  : str
  - explanation      : str
"""
from typing import Literal

DifficultyLevel = Literal["easy", "intermediate", "pro", "mastery"]

LEVELS: list[str] = ["easy", "intermediate", "pro", "mastery"]

ACCURACY_UP    = 0.75   # above this → consider going up
ACCURACY_DOWN  = 0.45   # below this → step down
TIME_FAST      = 12.0   # seconds — quick + correct → nudge up
TIME_SLOW      = 50.0   # seconds — struggling → nudge down
STREAK_BOOST   = 4      # consecutive corrects → nudge up


def _to_int(d: str) -> int:
    return LEVELS.index(d) if d in LEVELS else 1


def _to_level(v: int) -> DifficultyLevel:
    return LEVELS[max(0, min(len(LEVELS) - 1, v))]  # type: ignore[return-value]


def predict_next_difficulty(
    recent_accuracy: float,
    avg_time_seconds: float,
    streak: int,
    current_difficulty: str = "easy",
) -> tuple[DifficultyLevel, str]:
    """
    Multi-factor delta scoring across 4 tiers.

    Each signal votes ±1; combined delta decides whether to stay, advance, or retreat.
    """
    current = _to_int(current_difficulty)
    delta = 0
    reasons: list[str] = []

    # Accuracy (weight 2 — strongest signal)
    if recent_accuracy >= ACCURACY_UP:
        delta += 2
        reasons.append(f"solid accuracy ({recent_accuracy:.0%})")
    elif recent_accuracy <= ACCURACY_DOWN:
        delta -= 2
        reasons.append(f"accuracy needs work ({recent_accuracy:.0%})")
    else:
        reasons.append("moderate accuracy")

    # Speed (weight 1)
    if avg_time_seconds < TIME_FAST and recent_accuracy >= 0.6:
        delta += 1
        reasons.append("answering quickly")
    elif avg_time_seconds > TIME_SLOW:
        delta -= 1
        reasons.append("taking longer per question")

    # Streak (weight 1)
    if streak >= STREAK_BOOST:
        delta += 1
        reasons.append(f"{streak}-answer streak")

    # Apply delta
    new_level = current
    if delta >= 2:
        new_level = min(len(LEVELS) - 1, current + 1)
    elif delta <= -2:
        new_level = max(0, current - 1)

    next_diff = _to_level(new_level)
    return next_diff, f"Moved to {next_diff} based on: {', '.join(reasons)}."


# XP multipliers per tier
_XP_MULT = {"easy": 1.0, "intermediate": 1.8, "pro": 3.0, "mastery": 5.0}


def calculate_xp_reward(
    is_correct: bool,
    difficulty: str,
    time_taken: float,
    streak: int,
) -> int:
    if not is_correct:
        return 0

    base = 10
    mult = _XP_MULT.get(difficulty, 1.0)

    speed_bonus = 1.0
    if time_taken < 10:
        speed_bonus = 1.5
    elif time_taken < 20:
        speed_bonus = 1.2

    streak_bonus = min(streak * 5, 30)
    return int(base * mult * speed_bonus) + streak_bonus
