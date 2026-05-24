"""
Database initialization and seed data.
Creates all tables and populates with skills, nodes, questions, and achievements.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.db.database import engine, Base, AsyncSessionLocal
from app.models.user import User
from app.models.skill import Skill, SkillNode, UserSkillProgress
from app.models.quiz import Question
from app.models.achievement import Achievement, UserAchievement


async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def migrate_questions_columns():
    """SQLite: add new columns on existing DBs without Alembic."""
    from app.config import settings
    if "sqlite" not in settings.database_url.lower():
        return
    from sqlalchemy import text

    async with engine.begin() as conn:

        def add_columns(sync_conn):
            rows = sync_conn.execute(text("PRAGMA table_info(questions)")).fetchall()
            cols = [row[1] for row in rows]
            if "domain" not in cols:
                sync_conn.execute(text("ALTER TABLE questions ADD COLUMN domain VARCHAR(100)"))
            if "generation_source" not in cols:
                sync_conn.execute(
                    text("ALTER TABLE questions ADD COLUMN generation_source VARCHAR(32) DEFAULT 'seed'")
                )
            if "provider_model" not in cols:
                sync_conn.execute(text("ALTER TABLE questions ADD COLUMN provider_model VARCHAR(80)"))
            if "hint" not in cols:
                sync_conn.execute(text("ALTER TABLE questions ADD COLUMN hint TEXT"))
            sync_conn.execute(
                text("UPDATE questions SET domain = topic WHERE domain IS NULL OR domain = ''")
            )
            sync_conn.execute(
                text("UPDATE questions SET generation_source = 'seed' WHERE generation_source IS NULL")
            )
            # Migrate old difficulty names to new 4-tier system
            sync_conn.execute(text("UPDATE questions SET difficulty = 'intermediate' WHERE difficulty = 'medium'"))
            sync_conn.execute(text("UPDATE questions SET difficulty = 'pro' WHERE difficulty = 'hard'"))

        await conn.run_sync(add_columns)


async def migrate_performance_indexes():
    """Composite indexes for hot quiz / history queries (SQLite & PostgreSQL)."""
    stmts = [
        "CREATE INDEX IF NOT EXISTS ix_questions_domain_difficulty ON questions(domain, difficulty)",
        "CREATE INDEX IF NOT EXISTS ix_questions_topic_difficulty ON questions(topic, difficulty)",
        "CREATE INDEX IF NOT EXISTS ix_quiz_attempts_user_created ON quiz_attempts(user_id, created_at)",
        "CREATE INDEX IF NOT EXISTS ix_quiz_attempts_user_question ON quiz_attempts(user_id, question_id)",
    ]
    async with engine.begin() as conn:
        for sql in stmts:
            await conn.execute(text(sql))


async def seed_skills(session: AsyncSession):
    result = await session.execute(select(Skill))
    if result.scalars().first():
        return  # Already seeded

    # icon: short label for APIs; UI uses track name → MUI icons on the frontend.
    skills_data = [
        {
            "name": "Machine Learning",
            "description": "Models, training, evaluation, and practical ML workflows",
            "category": "AI/ML",
            "icon": "ML",
            "color": "#8b6914",
            "difficulty": "intermediate",
            "nodes": [
                {"name": "ML Fundamentals", "description": "What is ML, types of learning, key concepts", "order_index": 0, "required_xp": 0, "xp_reward": 50},
                {"name": "Supervised Learning", "description": "Regression, classification, training/testing", "order_index": 1, "required_xp": 0, "xp_reward": 75},
                {"name": "Unsupervised Learning", "description": "Clustering, dimensionality reduction", "order_index": 2, "required_xp": 50, "xp_reward": 75},
                {"name": "Model Evaluation", "description": "Metrics, cross-validation, bias-variance", "order_index": 3, "required_xp": 100, "xp_reward": 100},
                {"name": "Feature Engineering", "description": "Selection, transformation, encoding", "order_index": 4, "required_xp": 150, "xp_reward": 100},
                {"name": "Ensemble Methods", "description": "Random Forests, Gradient Boosting, XGBoost", "order_index": 5, "required_xp": 200, "xp_reward": 150, "is_boss_level": True},
            ],
        },
        {
            "name": "Web Development",
            "description": "HTML, CSS, JavaScript, frameworks, and APIs",
            "category": "Web",
            "icon": "WEB",
            "color": "#2d6a4f",
            "difficulty": "beginner",
            "nodes": [
                {"name": "HTML & CSS", "description": "Structure and styling fundamentals", "order_index": 0, "required_xp": 0, "xp_reward": 50},
                {"name": "JavaScript", "description": "DOM manipulation, events, async JS", "order_index": 1, "required_xp": 0, "xp_reward": 75},
                {"name": "React", "description": "Components, hooks, state management", "order_index": 2, "required_xp": 75, "xp_reward": 100},
                {"name": "REST APIs", "description": "HTTP methods, JSON, API design", "order_index": 3, "required_xp": 100, "xp_reward": 100},
                {"name": "Databases", "description": "SQL, NoSQL, ORM patterns", "order_index": 4, "required_xp": 150, "xp_reward": 125},
                {"name": "Full-Stack Project", "description": "Build a complete web application", "order_index": 5, "required_xp": 250, "xp_reward": 200, "is_boss_level": True},
            ],
        },
        {
            "name": "DSA",
            "description": "Data structures and algorithms for interviews",
            "category": "CS Fundamentals",
            "icon": "DSA",
            "color": "#b45309",
            "difficulty": "intermediate",
            "nodes": [
                {"name": "Arrays & Strings", "description": "Fundamentals of linear data structures", "order_index": 0, "required_xp": 0, "xp_reward": 50},
                {"name": "Linked Lists", "description": "Singly, doubly, circular lists", "order_index": 1, "required_xp": 0, "xp_reward": 75},
                {"name": "Stacks & Queues", "description": "LIFO/FIFO structures and applications", "order_index": 2, "required_xp": 50, "xp_reward": 75},
                {"name": "Trees & Graphs", "description": "BST, BFS, DFS, traversals", "order_index": 3, "required_xp": 100, "xp_reward": 125},
                {"name": "Dynamic Programming", "description": "Memoization, tabulation, optimization", "order_index": 4, "required_xp": 200, "xp_reward": 150},
                {"name": "Advanced Algorithms", "description": "Graph algorithms, NP problems, patterns", "order_index": 5, "required_xp": 300, "xp_reward": 200, "is_boss_level": True},
            ],
        },
        {
            "name": "Python",
            "description": "Python language core, idioms, and advanced features",
            "category": "Programming",
            "icon": "PY",
            "color": "#5a7d6e",
            "difficulty": "beginner",
            "nodes": [
                {"name": "Python Basics", "description": "Syntax, variables, data types, control flow", "order_index": 0, "required_xp": 0, "xp_reward": 40},
                {"name": "Functions & OOP", "description": "Functions, classes, inheritance, decorators", "order_index": 1, "required_xp": 0, "xp_reward": 60},
                {"name": "Data Structures", "description": "Lists, dicts, sets, comprehensions", "order_index": 2, "required_xp": 40, "xp_reward": 75},
                {"name": "Advanced Python", "description": "Generators, context managers, metaclasses", "order_index": 3, "required_xp": 100, "xp_reward": 100, "is_boss_level": True},
            ],
        },
        {
            "name": "Cloud & DevOps",
            "description": "AWS-style cloud, containers, CI/CD, and infrastructure as code",
            "category": "Cloud",
            "icon": "CLD",
            "color": "#33658a",
            "difficulty": "intermediate",
            "nodes": [
                {"name": "Linux & Shell", "description": "CLI, processes, permissions, scripting basics", "order_index": 0, "required_xp": 0, "xp_reward": 50},
                {"name": "Containers", "description": "Docker images, networking, compose", "order_index": 1, "required_xp": 40, "xp_reward": 75},
                {"name": "Kubernetes Basics", "description": "Pods, services, deployments, config", "order_index": 2, "required_xp": 100, "xp_reward": 100},
                {"name": "CI/CD", "description": "Pipelines, testing gates, artifacts", "order_index": 3, "required_xp": 150, "xp_reward": 125},
                {"name": "IaC & Ops", "description": "Terraform-style infra, observability", "order_index": 4, "required_xp": 220, "xp_reward": 180, "is_boss_level": True},
            ],
        },
        {
            "name": "Data Engineering",
            "description": "SQL, ETL/ELT, warehousing, and reliable data pipelines",
            "category": "Data",
            "icon": "DE",
            "color": "#7c6f64",
            "difficulty": "intermediate",
            "nodes": [
                {"name": "SQL & Modeling", "description": "Joins, indexes, normalization", "order_index": 0, "required_xp": 0, "xp_reward": 55},
                {"name": "ETL Pipelines", "description": "Batch jobs, idempotency, orchestration", "order_index": 1, "required_xp": 50, "xp_reward": 80},
                {"name": "Data Warehousing", "description": "Facts, dimensions, slowly changing dimensions", "order_index": 2, "required_xp": 100, "xp_reward": 100},
                {"name": "Streaming Basics", "description": "Events, offsets, at-least-once delivery", "order_index": 3, "required_xp": 160, "xp_reward": 120},
                {"name": "Data Quality", "description": "Validation, lineage, monitoring", "order_index": 4, "required_xp": 240, "xp_reward": 170, "is_boss_level": True},
            ],
        },
        {
            "name": "AI & LLMs",
            "description": "Prompting, RAG, embeddings, safety, and evaluation",
            "category": "AI/ML",
            "icon": "LLM",
            "color": "#6b5344",
            "difficulty": "intermediate",
            "nodes": [
                {"name": "Prompting & Eval", "description": "Instruction design, benchmarks, failure modes", "order_index": 0, "required_xp": 0, "xp_reward": 55},
                {"name": "RAG", "description": "Retrieval, chunking, reranking", "order_index": 1, "required_xp": 50, "xp_reward": 85},
                {"name": "Embeddings & Vectors", "description": "Similarity search, ANN indexes", "order_index": 2, "required_xp": 110, "xp_reward": 100},
                {"name": "Safety & Guardrails", "description": "PII, jailbreaks, moderation", "order_index": 3, "required_xp": 170, "xp_reward": 120},
                {"name": "Fine-tuning Intro", "description": "When to tune, data, eval loops", "order_index": 4, "required_xp": 250, "xp_reward": 180, "is_boss_level": True},
            ],
        },
        {
            "name": "Cybersecurity",
            "description": "Identity, threats, secure design, and AppSec fundamentals",
            "category": "Security",
            "icon": "SEC",
            "color": "#8c4a4a",
            "difficulty": "intermediate",
            "nodes": [
                {"name": "Threat Modeling", "description": "Assets, trust boundaries, STRIDE-lite", "order_index": 0, "required_xp": 0, "xp_reward": 50},
                {"name": "Auth & Identity", "description": "OAuth2/OIDC, sessions, MFA", "order_index": 1, "required_xp": 45, "xp_reward": 80},
                {"name": "OWASP & Web Risks", "description": "Injection, XSS, CSRF, SSRF", "order_index": 2, "required_xp": 100, "xp_reward": 100},
                {"name": "Cryptography Basics", "description": "Hashing, symmetric/asymmetric, TLS", "order_index": 3, "required_xp": 160, "xp_reward": 120},
                {"name": "Secure SDLC", "description": "Dependencies, secrets, hardening", "order_index": 4, "required_xp": 230, "xp_reward": 175, "is_boss_level": True},
            ],
        },
        {
            "name": "System Design",
            "description": "Scalable systems, APIs, storage, and reliability patterns",
            "category": "Architecture",
            "icon": "SYS",
            "color": "#5c6b7a",
            "difficulty": "advanced",
            "nodes": [
                {"name": "Requirements & Capacity", "description": "NFRs, back-of-envelope estimates", "order_index": 0, "required_xp": 0, "xp_reward": 60},
                {"name": "APIs & Storage", "description": "REST, gRPC, SQL vs NoSQL tradeoffs", "order_index": 1, "required_xp": 80, "xp_reward": 90},
                {"name": "Caching & CDN", "description": "TTLs, invalidation, edge", "order_index": 2, "required_xp": 140, "xp_reward": 110},
                {"name": "Consistency & Reliability", "description": "Replication, partitions, idempotency", "order_index": 3, "required_xp": 200, "xp_reward": 130},
                {"name": "End-to-end Design", "description": "Putting it together with tradeoffs", "order_index": 4, "required_xp": 280, "xp_reward": 200, "is_boss_level": True},
            ],
        },
        {
            "name": "TypeScript",
            "description": "Typed JavaScript for large apps and safer refactors",
            "category": "Programming",
            "icon": "TS",
            "color": "#3d5a80",
            "difficulty": "intermediate",
            "nodes": [
                {"name": "Types & Generics", "description": "Structural typing, utility types", "order_index": 0, "required_xp": 0, "xp_reward": 55},
                {"name": "Modules & Tooling", "description": "tsconfig, bundlers, path aliases", "order_index": 1, "required_xp": 50, "xp_reward": 75},
                {"name": "Async & Patterns", "description": "Promises, Result types, errors", "order_index": 2, "required_xp": 100, "xp_reward": 95},
                {"name": "React + TS", "description": "Components, hooks typing, props", "order_index": 3, "required_xp": 150, "xp_reward": 110},
                {"name": "Production TS", "description": "Strictness, testing, incremental adoption", "order_index": 4, "required_xp": 220, "xp_reward": 165, "is_boss_level": True},
            ],
        },
    ]

    for skill_data in skills_data:
        nodes_data = skill_data.pop("nodes")
        skill = Skill(**skill_data, total_nodes=len(nodes_data))
        session.add(skill)
        await session.flush()

        parent_id = None
        for node_data in nodes_data:
            node = SkillNode(
                skill_id=skill.id,
                parent_id=parent_id,
                **node_data,
            )
            session.add(node)
            await session.flush()
            parent_id = node.id

    await session.commit()


async def seed_questions(session: AsyncSession):
    result = await session.execute(select(Question))
    if result.scalars().first():
        return  # Already seeded

    from app.ml.question_generator import QUESTION_BANK

    for topic, difficulties in QUESTION_BANK.items():
        for difficulty, questions in difficulties.items():
            for q in questions:
                question = Question(
                    topic=topic,
                    domain=topic,
                    question_text=q["question_text"],
                    question_type=q.get("question_type", "mcq"),
                    options=q.get("options"),
                    correct_answer=q["correct_answer"],
                    explanation=q.get("explanation"),
                    difficulty=difficulty,
                    is_ai_generated=False,
                    generation_source="seed",
                    provider_model=None,
                )
                session.add(question)

    await session.commit()


async def seed_achievements(session: AsyncSession):
    result = await session.execute(select(Achievement))
    if result.scalars().first():
        return  # Already seeded

    achievements = [
        # Streak achievements
        {"name": "First Steps", "description": "Log in for the first time", "icon": "👣", "category": "milestone", "criteria_type": "questions", "criteria_value": 1, "xp_bonus": 20},
        {"name": "On a Roll", "description": "Maintain a 3-day streak", "icon": "🔥", "category": "streak", "criteria_type": "streak", "criteria_value": 3, "xp_bonus": 30},
        {"name": "Week Warrior", "description": "Maintain a 7-day streak", "icon": "⚔️", "category": "streak", "criteria_type": "streak", "criteria_value": 7, "xp_bonus": 75, "is_rare": True},
        {"name": "Unstoppable", "description": "Maintain a 30-day streak", "icon": "🌟", "category": "streak", "criteria_type": "streak", "criteria_value": 30, "xp_bonus": 300, "is_rare": True},
        # XP achievements
        {"name": "Knowledge Seeker", "description": "Earn 100 XP", "icon": "📚", "category": "xp", "criteria_type": "xp", "criteria_value": 100, "xp_bonus": 10},
        {"name": "Scholar", "description": "Earn 500 XP", "icon": "🎓", "category": "xp", "criteria_type": "xp", "criteria_value": 500, "xp_bonus": 50},
        {"name": "Expert", "description": "Earn 2000 XP", "icon": "💎", "category": "xp", "criteria_type": "xp", "criteria_value": 2000, "xp_bonus": 200, "is_rare": True},
        {"name": "Grandmaster", "description": "Earn 5000 XP", "icon": "👑", "category": "xp", "criteria_type": "xp", "criteria_value": 5000, "xp_bonus": 500, "is_rare": True},
        # Question achievements
        {"name": "Curious Mind", "description": "Answer 10 questions", "icon": "🤔", "category": "questions", "criteria_type": "questions", "criteria_value": 10, "xp_bonus": 20},
        {"name": "Dedicated Learner", "description": "Answer 50 questions", "icon": "📖", "category": "questions", "criteria_type": "questions", "criteria_value": 50, "xp_bonus": 50},
        {"name": "Quiz Champion", "description": "Answer 200 questions correctly", "icon": "🏆", "category": "questions", "criteria_type": "correct", "criteria_value": 200, "xp_bonus": 150, "is_rare": True},
        # Level achievements
        {"name": "Rising Star", "description": "Reach Level 5", "icon": "⭐", "category": "level", "criteria_type": "level", "criteria_value": 5, "xp_bonus": 50},
        {"name": "Trailblazer", "description": "Reach Level 10", "icon": "🚀", "category": "level", "criteria_type": "level", "criteria_value": 10, "xp_bonus": 100, "is_rare": True},
    ]

    for ach_data in achievements:
        achievement = Achievement(**ach_data)
        session.add(achievement)

    await session.commit()


async def seed_demo_user(session: AsyncSession):
    """
    Create a fully maxed-out demo account.
    Credentials: demo@skillquest.ai / demo
    Stats: Level 50 · 9 999 XP · 30-day streak · all achievements · all skill nodes completed.
    Re-runs safely (idempotent).
    """
    from app.services.auth_service import hash_password
    from datetime import datetime

    DEMO_EMAIL = "demo@skillquest.ai"

    existing = (await session.execute(select(User).where(User.email == DEMO_EMAIL))).scalar_one_or_none()
    if existing:
        return

    demo = User(
        username="DemoChampion",
        email=DEMO_EMAIL,
        hashed_password=hash_password("demo"),
        avatar="👑",
        xp=9999,
        level=50,
        streak=30,
        longest_streak=45,
        total_questions_answered=500,
        total_correct_answers=455,
        last_active_date=datetime.utcnow(),
        is_active=True,
    )
    session.add(demo)
    await session.flush()  # get demo.id

    # ── Unlock every achievement ───────────────────────────────────────────────
    achievements = (await session.execute(select(Achievement))).scalars().all()
    for ach in achievements:
        session.add(UserAchievement(user_id=demo.id, achievement_id=ach.id))

    # ── Complete every skill node ──────────────────────────────────────────────
    skills = (await session.execute(select(Skill))).scalars().all()
    for skill in skills:
        nodes = (
            await session.execute(select(SkillNode).where(SkillNode.skill_id == skill.id))
        ).scalars().all()
        for node in nodes:
            session.add(UserSkillProgress(
                user_id=demo.id,
                skill_id=skill.id,
                skill_node_id=node.id,
                is_completed=True,
                score=95.0,
                attempts=3,
                xp_earned=node.xp_reward,
            ))

    await session.commit()


async def init_db():
    """Initialize database: create tables and seed data."""
    await create_tables()
    await migrate_questions_columns()
    await migrate_performance_indexes()
    async with AsyncSessionLocal() as session:
        await seed_skills(session)
        await seed_questions(session)
        await seed_achievements(session)
        await seed_demo_user(session)
