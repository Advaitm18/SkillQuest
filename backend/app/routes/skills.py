from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from typing import List
from app.db.database import get_db
from app.schemas.skill import SkillResponse, SkillTreeResponse, SkillNodeResponse
from app.models.skill import Skill, SkillNode, UserSkillProgress
from app.routes.auth import get_current_user

router = APIRouter()


@router.get("", response_model=List[SkillResponse])
async def get_skills(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Skill))
    skills = result.scalars().all()
    if not skills:
        return []

    skill_ids = [s.id for s in skills]

    # Single grouped query — scales when users have many node progress rows
    agg_rows = (
        await db.execute(
            select(
                UserSkillProgress.skill_id,
                func.coalesce(
                    func.sum(case((UserSkillProgress.is_completed.is_(True), 1), else_=0)),
                    0,
                ).label("completed"),
                func.coalesce(func.sum(UserSkillProgress.xp_earned), 0).label("xp"),
            )
            .where(
                UserSkillProgress.user_id == current_user.id,
                UserSkillProgress.skill_id.in_(skill_ids),
            )
            .group_by(UserSkillProgress.skill_id)
        )
    ).all()

    skill_completed = {int(r.skill_id): int(r.completed) for r in agg_rows}
    skill_xp = {int(r.skill_id): int(r.xp) for r in agg_rows}

    response = []
    for skill in skills:
        sr = SkillResponse.model_validate(skill)
        sr.completed_nodes = skill_completed.get(skill.id, 0)
        sr.user_xp_in_skill = skill_xp.get(skill.id, 0)
        response.append(sr)
    return response


@router.get("/{skill_id}/tree", response_model=SkillTreeResponse)
async def get_skill_tree(
    skill_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Skill).where(Skill.id == skill_id))
    skill = result.scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    nodes_result = await db.execute(
        select(SkillNode)
        .where(SkillNode.skill_id == skill_id)
        .order_by(SkillNode.order_index)
    )
    nodes = nodes_result.scalars().all()

    prog_result = await db.execute(
        select(UserSkillProgress).where(
            UserSkillProgress.user_id == current_user.id,
            UserSkillProgress.skill_id == skill_id,
        )
    )
    progress_rows = prog_result.scalars().all()
    completed_node_ids = {p.skill_node_id for p in progress_rows if p.is_completed}
    completed_count = sum(1 for p in progress_rows if p.is_completed)
    total_xp_in_skill = sum(p.xp_earned for p in progress_rows)

    node_responses = []
    for node in nodes:
        is_unlocked = (
            node.parent_id is None
            or node.parent_id in completed_node_ids
            or current_user.xp >= node.required_xp
        )
        is_completed = node.id in completed_node_ids
        nr = SkillNodeResponse.model_validate(node)
        nr.is_unlocked = is_unlocked
        nr.is_completed = is_completed
        node_responses.append(nr)

    skill_response = SkillResponse.model_validate(skill)
    skill_response.completed_nodes = completed_count
    skill_response.user_xp_in_skill = total_xp_in_skill

    return SkillTreeResponse(skill=skill_response, nodes=node_responses)
