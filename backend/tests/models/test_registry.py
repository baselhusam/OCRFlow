import pytest

from app.models.registry import (
    REGISTRY,
    ModelNotFoundError,
    ModelStatus,
    get_model,
    list_categories,
    list_models,
)


def test_registry_ids_are_unique():
    ids = [entry.id for entry in REGISTRY.values()]
    assert len(ids) == len(set(ids))


def test_get_model_returns_docling_layout_heron():
    entry = get_model("docling/layout-heron")
    assert entry.category == "layout_detection"
    assert entry.provider == "docling"
    assert entry.status == ModelStatus.done
    assert entry.python_extra == "docling"


def test_get_model_unknown_raises():
    with pytest.raises(ModelNotFoundError):
        get_model("unknown/model")


def test_list_models_filter_by_category():
    models = list_models(category="layout_detection")
    assert models
    assert all(entry.category == "layout_detection" for entry in models)


def test_list_models_filter_by_provider():
    models = list_models(provider="surya")
    assert len(models) == 6
    assert all(entry.provider == "surya" for entry in models)


def test_list_models_filter_by_status():
    deferred = list_models(status=ModelStatus.deferred)
    assert deferred
    assert all(entry.status == ModelStatus.deferred for entry in deferred)


def test_list_categories_includes_prompt_and_vision_types():
    categories = list_categories()
    assert len(categories) == 19
    ids = {category.id for category in categories}
    assert "layout_detection" in ids
    assert "text_generation" in ids
    assert "vision_language" in ids
    assert "export" in ids


def test_ollama_catalog_models_are_local_and_done():
    models = list_models(provider="ollama")
    assert {entry.id for entry in models} == {
        "ollama/structured-extract",
        "ollama/text-prompt",
        "ollama/vision-prompt",
        "ollama/vision-structured-extract",
    }
    assert all(entry.status == ModelStatus.done for entry in models)
