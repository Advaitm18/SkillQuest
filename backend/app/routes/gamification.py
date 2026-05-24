from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.database import get_db
from app.schemas.gamification import (
    LeaderboardResponse, LeaderboardEntry,
    XPUpdateRequest, XPUpdateResponse
)
from app.models.user import User
from app.routes.auth import get_current_user
from app.services.gamification_service import award_xp, check_and_award_achievements

router = APIRouter()


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    limit: int = 20,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User)
        .where(User.is_active == True)
        .order_by(desc(User.xp))
        .limit(limit)
    )
    users = result.scalars().all()

    entries = [
        LeaderboardEntry(
            rank=i + 1,
            user_id=u.id,
            username=u.username,
            xp=u.xp,
            level=u.level,
            streak=u.streak,
            avatar=u.avatar,
        )
        for i, u in enumerate(users)
    ]

    # Find current user's rank
    all_result = await db.execute(
        select(User).where(User.is_active == True).order_by(desc(User.xp))
    )
    all_users = all_result.scalars().all()
    current_rank = next(
        (i + 1 for i, u in enumerate(all_users) if u.id == current_user.id), None
    )

    return LeaderboardResponse(entries=entries, current_user_rank=current_rank)


@router.post("/update-xp", response_model=XPUpdateResponse)
async def update_xp(
    payload: XPUpdateRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.xp_to_add < 0 or payload.xp_to_add > 1000:
        raise HTTPException(status_code=400, detail="Invalid XP amount")

    result = await award_xp(db, current_user, payload.xp_to_add)
    await check_and_award_achievements(db, current_user)
    return XPUpdateResponse(**result)
