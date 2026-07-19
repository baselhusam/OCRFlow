from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.v1.models.errors import register_model_exception_handlers
from app.api.v1.models.router import router as models_router
from app.api.v1.router import api_router
from app.core.config import get_settings
from app.db.session import async_session_factory, engine
from app.services.bootstrap import ensure_admin_user


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))

    settings = get_settings()
    async with async_session_factory() as session:
        await ensure_admin_user(session, settings)

    yield
    await engine.dispose()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="OCRFlow API", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_model_exception_handlers(app)
    app.include_router(api_router)
    app.include_router(models_router, prefix="/api/v1/models")

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
