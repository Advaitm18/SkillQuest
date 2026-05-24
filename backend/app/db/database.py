from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


def _engine_kwargs() -> dict:
    url = settings.database_url.lower()
    kw: dict = {"echo": False, "future": True}
    if "sqlite" in url:
        kw["connect_args"] = {"check_same_thread": False}
        kw["pool_pre_ping"] = True
    else:
        kw["pool_size"] = settings.db_pool_size
        kw["max_overflow"] = settings.db_max_overflow
        kw["pool_pre_ping"] = True
    return kw


engine = create_async_engine(settings.database_url, **_engine_kwargs())

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
