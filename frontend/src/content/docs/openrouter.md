---
title: OpenRouter
description: Connect an OpenRouter API key and use any of its hosted vision models as an OCR node.
---

OpenRouter puts hundreds of hosted models behind one API key. OCRFlow uses it for **cloud OCR**: once a key is verified, every OpenRouter model that reads images and answers in text shows up in the canvas library as its own OCR node. Nothing runs on your machine, so there is no service to start and no GPU to provision.

OpenRouter has no dedicated OCR category. OCRFlow treats a model as OCR-capable when its catalog entry takes `image` input and returns only `text`. That covers document-tuned models (Qwen VL, Pixtral, Moondream, Gemini Flash, …) as well as general vision models. Routers such as `openrouter/auto` and batch-only variants are left out because they cannot back a canvas node.

## Connect your key

1. Create a key at [openrouter.ai/keys](https://openrouter.ai/keys).
2. Open **Configuration → LLM & vision connections → Add provider** (administrators only).
3. Pick **OpenRouter** as the protocol. The base URL is filled in for you (`https://openrouter.ai/api/v1`).
4. Paste the key and press **Validate**.

Validation makes two calls:

| Call | Why |
| --- | --- |
| `GET /api/v1/key` | Proves the key is real. OpenRouter's model list is public, so it cannot verify a key on its own. |
| `GET /api/v1/models` | Lists the catalog. OCRFlow keeps the image → text models and stores their names, context window, and prices with the connection. |

A rejected key reports **authentication required** and nothing is listed. The key is encrypted with the deployment `SECRET_KEY` and never returned by the API.

## Choose which models reach the canvas

OpenRouter lists a couple of hundred vision models, so only the ones you enable appear on the canvas. After you save the connection, OCRFlow opens **Configuration → OpenRouter → Manage models**:

- Models are grouped by vendor (Google, Qwen, Mistral, Meta, …) with their logos. Each group has its own switch and an "on" count.
- **Enable all** and **Disable all** act on everything shown, so you can search or filter first ("Enable 24 shown").
- Filters: **On canvas**, **For documents** (models the provider describes for OCR, scans, charts, or documents), and **Free**.
- **Recommended** resets the selection to the document-focused models. A new connection starts with this set.
- Changes save automatically and show up in open canvases on their next refresh (window focus is enough).
- **Refresh list** revalidates the key and pulls models OpenRouter has added since. Your selection is kept; new models start disabled.

Users who are not administrators only ever see the enabled models: in the library, the model picker, and the catalog API.

## Use it on the canvas

Every validated OpenRouter connection adds a **Cloud OCR** section to the library with its enabled models:

- Each row shows the model vendor's logo. Models described for documents come first, then the rest alphabetically. The section previews eight rows; **Show all** or the OpenRouter engine chip lists every enabled model.
- Search matches model names, ids, and vendors (`qwen`, `pixtral`, `free`).
- The info button on a row shows the description, price per million tokens, context window, and the connection it uses.

Click or drag a row to add an **OpenRouter OCR** node with that model already chosen. The node's caption shows the model name. Wire it from a PDF Loader, Image Loader, Select Page, or any node that outputs a page.

| Node | Input → output |
| --- | --- |
| `openrouter/ocr` | page image → `DocumentArtifact` + markdown |

The node sends the page to the chosen model with a transcription instruction, strips any code fence the model wraps around its answer, and returns the page as markdown. Like Unlimited-OCR's per-page parser, it can **Apply to all pages**, and its output wires into anything that accepts text, JSON, or a document.

### Parameters

| Field | Default | Notes |
| --- | --- | --- |
| OCR model | the row you added | Searchable picker over the connection's enabled models, with an "only models described for documents" filter. |
| Instructions | transcribe to clean Markdown | Change it for tables-only, key-value output, or a specific language. |
| Max output tokens | `8192` | A warning is returned when the answer hits the limit. |
| Temperature | `0` | Keep it at 0 for faithful transcription. |

Hosted chat models return text without coordinates, so the document has no layout boxes. Use Surya or Docling when you need geometry.

### More OpenRouter nodes

The same connection also powers the general connected-provider nodes, which take a model id as a parameter:

| Node | Input → output |
| --- | --- |
| `openrouter/vision-prompt` | page image + prompt → text |
| `openrouter/vision-structured-extract` | page image + JSON Schema → JSON |
| `openrouter/text-prompt` | text + prompt → text |
| `openrouter/structured-extract` | text + JSON Schema → JSON |

## Costs and errors

OpenRouter bills each request to your account at the model's listed price; `:free` models cost nothing but are rate limited. Errors come back in plain language on the node:

- **rejected the API key**: the key was revoked or changed. Update it in Configuration and revalidate.
- **insufficient credits**: top up your OpenRouter balance.
- **rate limited**: retry shortly or pick another model.

Signed-in users who are not administrators still see the Cloud OCR models and can run them. Only administrators can add, revalidate, or remove the connection.

## API

```bash
# Enabled OCR models on validated connections (any signed-in user)
curl -s http://localhost:8000/api/v1/models/ocr-catalog -H "Authorization: Bearer $TOKEN"

# Run one page
curl -s http://localhost:8000/api/v1/models/openrouter/ocr \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"page": {"page_index": 0, "width": 1240, "height": 1754, "image_base64": "..."},
       "options": {"connection_id": "<connection id or name>", "model": "qwen/qwen2.5-vl-72b-instruct"}}'
```
