# Test fixtures

Golden images, PDFs, and expected JSON outputs for model regression tests.

## Layout

```
fixtures/
  <provider>/
    <task>/
      input.png          # or input.pdf
      expected.json      # golden output for smoke/regression tests
```

## Phase 1

The first golden fixtures will be added for `docling/layout-heron`:

- `docling/layout-heron/` — single-column academic page, page with table + figure

## Notes

- Keep fixtures small (resize/compress where possible).
- GPU smoke tests use `@pytest.mark.gpu` and are skipped in CI without a GPU.
