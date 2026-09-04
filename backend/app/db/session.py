from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
import os

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import get_settings

settings = get_settings()

# A pooled asyncpg connection is tied to the event loop that created it. Tests
# exercise the app on multiple loops, so CI selects NullPool to ensure no
# connection is reused by a different loop. Production retains SQLAlchemy's
# default pool.
engine_options = (
    {"poolclass": NullPool}
    if os.getenv("SQLALCHEMY_POOL_CLASS", "").lower() == "null"
    else {}
)
engine = create_async_engine(settings.database_url, echo=False, **engine_options)
async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session


@asynccontextmanager
async def task_session() -> AsyncGenerator[AsyncSession, None]:
    """Session bound to the current event loop (safe inside Celery / asyncio.run)."""
    task_engine = create_async_engine(
        settings.database_url,
        echo=False,
        poolclass=NullPool,
    )
    factory = async_sessionmaker(
        task_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    try:
        async with factory() as session:
            yield session
    finally:
        await task_engine.dispose()
