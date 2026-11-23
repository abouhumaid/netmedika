from __future__ import annotations

from typing import AsyncGenerator, Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from backend.core.settings import settings


def _make_async_url(url: str) -> str:
    """Convert sync database URL to async variant."""
    parsed = make_url(url)
    if parsed.drivername in {"sqlite", "sqlite+pysqlite"}:
        return parsed.set(drivername="sqlite+aiosqlite").render_as_string(hide_password=False)
    if parsed.drivername in {"postgres", "postgresql", "postgresql+psycopg"}:
        return parsed.set(drivername="postgresql+asyncpg").render_as_string(hide_password=False)
    return url


def _make_sync_url(url: str) -> str:
    """Convert supported async database URLs for Alembic's sync engine."""
    parsed = make_url(url)
    if parsed.drivername == "sqlite+aiosqlite":
        return parsed.set(drivername="sqlite").render_as_string(hide_password=False)
    # Bare PostgreSQL URLs select psycopg2 by default in SQLAlchemy. The
    # project installs psycopg 3, so force all sync PostgreSQL aliases to it.
    if parsed.drivername in {
        "postgres",
        "postgresql",
        "postgresql+asyncpg",
        "postgresql+psycopg2",
    }:
        return parsed.set(drivername="postgresql+psycopg").render_as_string(hide_password=False)
    return url


engine = create_async_engine(
    _make_async_url(settings.database_url),
    echo=False,
    pool_pre_ping=True,
)
async_session_maker = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)
Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async database session."""
    async with async_session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


# Sync engine for alembic migrations
sync_engine = create_engine(_make_sync_url(settings.database_url), pool_pre_ping=True)
sync_session_maker = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)


def get_sync_db() -> Generator[Session, None, None]:
    """Sync session for alembic/migrations only."""
    with sync_session_maker() as session:
        yield session
