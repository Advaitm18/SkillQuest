from datetime import datetime, date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.models.achievement import Achievement, UserAchievement


# XP thresholds for each level (level N requires sum of thresholds[0..N-1])
XP_PER_LEVEL = [0] + [100 * i for i in range(1, 51)]  # level 1=0xp, level 2=100xp...


def calculate_level(xp: int) -> int:
    """Calculate level from total XP using progressive thresholds."""
    cumulative = 0
    for level in range(1, 51):
        cumulative += level * 80
        if xp < cumulative:
            return level
    return 50


def xp_to_next_level(xp: int, current_level: int) -> int:
    """XP needed to reach next level from current total."""
    cumulative = sum(l * 80 for l in range(1, current_level + 1))
    return max(0, cumulative - xp)


async def award_xp(db: AsyncSession, user: User, xp: int) -> dict:
    """Award XP to user and check for level up."""
    old_level = user.level
    user.xp += xp
    new_level = calculate_level(user.xp)
    user.level = new_level
    leveled_up = new_level > old_level

    await db.flush()
    return {
        "new_xp": user.xp,
        "new_level": new_level,
        "leveled_up": leveled_up,
        "xp_to_next_level": xp_to_next_level(user.xp, new_level),
    }


async def update_streak(db: AsyncSession, user: User) -> None:
    """Update daily login streak."""
    today = date.today()
    if user.last_active_date is None:
        user.streak = 1
        user.last_active_date = datetime.utcnow()
        user.longest_streak = max(user.longest_streak, user.streak)
        await db.flush()
        return

    last_active = user.last_active_date.date() if isinstance(user.last_active_date, datetime) else user.last_active_date
    days_diff = (today - last_active).days

    if days_diff == 0:
        return  # Already logged in today
    elif days_diff == 1:
        user.streak += 1
        user.longest_streak = max(user.longest_streak, user.streak)
    else:
        user.streak = 1  # Streak broken

    user.last_active_date = datetime.utcnow()
    await db.flush()


async def check_and_award_achievements(db: AsyncSession, user: User) -> list:
    """Check all achievement criteria and award any newly earned ones."""
    # Fetch achievements user doesn't have yet
    earned_result = await db.execute(
        select(UserAchievement.achievement_id).where(UserAchievement.user_id == user.id)
    )
    earned_ids = {row[0] for row in earned_result.fetchall()}

    all_achievements_result = await db.execute(select(Achievement))
    all_achievements = all_achievements_result.scalars().all()

    newly_earned = []
    for achievement in all_achievements:
        if achievement.id in earned_ids:
            continue

        earned = False
        ctype = achievement.criteria_type
        cval = achievement.criteria_value

        if ctype == "xp" and user.xp >= cval:
            earned = True
        elif ctype == "level" and user.level >= cval:
            earned = True
        elif ctype == "streak" and user.streak >= cval:
            earned = True
        elif ctype == "questions" and user.total_questions_answered >= cval:
            earned = True
        elif ctype == "correct" and user.total_correct_answers >= cval:
            earned = True

        if earned:
            ua = UserAchievement(user_id=user.id, achievement_id=achievement.id)
            db.add(ua)
            # Bonus XP for achievement
            if achievement.xp_bonus > 0:
                user.xp += achievement.xp_bonus
                user.level = calculate_level(user.xp)
            newly_earned.append({
                "id": achievement.id,
                "name": achievement.name,
                "icon": achievement.icon,
                "xp_bonus": achievement.xp_bonus,
            })

    if newly_earned:
        await db.flush()
    return newly_earned
