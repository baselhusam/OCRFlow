"""OpenAI- and Anthropic-compatible adapters for configured connections."""
from __future__ import annotations
import json
from typing import Any
import httpx
from app.models.base import ModelConfig
from app.models.base_runner import BaseRunner
from app.models.errors import ModelInferenceError, ModelLoadError, ModelValidationError
from app.services.model_connections import connection_headers, resolve_connection
from app.schemas.models.connected.generation import *

def _provider_error(response: httpx.Response, connection_name: str) -> str:
    """A readable failure: the provider's own message, plus what to do for auth/credit errors."""
    try:
        body = response.json()
        error = body.get("error") if isinstance(body, dict) else None
        message = (error.get("message") if isinstance(error, dict) else error) or response.text
    except ValueError:
        message = response.text
    message = str(message)[:300]
    if response.status_code in {401, 403}:
        return f"'{connection_name}' rejected the API key ({message}). Update and revalidate the connection in Configuration."
    if response.status_code == 402:
        return f"'{connection_name}' has insufficient credits ({message})."
    if response.status_code == 429:
        return f"'{connection_name}' is rate limited ({message}). Retry shortly or pick another model."
    return f"Provider returned HTTP {response.status_code}: {message}"


class _ConnectedRunner(BaseRunner[Any, Any]):
    async def _load_impl(self, config: ModelConfig) -> None: return None
    async def _unload_impl(self) -> None: return None
    async def _invoke(self, options: ConnectedOptions, prompt: str, image: str | None = None, schema: dict[str, Any] | None = None) -> tuple[str, dict[str, Any], str]:
        resolved = await resolve_connection(options.connection_id)
        if not resolved: raise ModelLoadError("The selected LLM/VLM connection is unavailable. Configure or revalidate it first.")
        connection, base_url = resolved
        if options.provider_protocol and connection.protocol != options.provider_protocol:
            raise ModelValidationError(
                f"This node requires a {options.provider_protocol} connection, but '{connection.name}' uses {connection.protocol}."
            )
        anthropic = connection.protocol.startswith("anthropic")
        if anthropic:
            content: list[dict[str, Any]] = []
            if image: content.append({"type":"image", "source":{"type":"base64", "media_type":"image/png", "data":image}})
            content.append({"type":"text", "text":prompt + ("\nReturn JSON only matching: " + json.dumps(schema) if schema else "")})
            payload: dict[str, Any] = {"model":options.model,"max_tokens":options.max_tokens,"temperature":options.temperature,"messages":[{"role":"user","content":content}]}
            if options.system_prompt: payload["system"] = options.system_prompt
            url = f"{base_url}/v1/messages"
        else:
            user: Any = prompt
            if image: user = [{"type":"text","text":prompt},{"type":"image_url","image_url":{"url":f"data:image/png;base64,{image}"}}]
            messages: list[dict[str, Any]] = ([{"role":"system","content":options.system_prompt}] if options.system_prompt else []) + [{"role":"user","content":user}]
            payload = {"model":options.model,"temperature":options.temperature,"max_tokens":options.max_tokens,"messages":messages}
            if schema: payload["response_format"]={"type":"json_schema","json_schema":{"name":"ocrflow_result","schema":schema}}
            url = f"{base_url}/chat/completions"
        try:
            async with httpx.AsyncClient(timeout=(self.config.timeout_seconds if self.config else 120), trust_env=False) as client:
                response = await client.post(url, headers=connection_headers(connection), json=payload)
        except httpx.HTTPError as exc: raise ModelInferenceError(f"Provider request failed: {exc}") from exc
        if not response.is_success: raise ModelInferenceError(_provider_error(response, connection.name))
        try:
            body=response.json()
            # Routers such as OpenRouter can answer 200 with an upstream error.
            if isinstance(body, dict) and isinstance(body.get("error"), dict) and not body.get("choices"):
                raise ModelInferenceError(f"Provider error: {str(body['error'].get('message') or body['error'])[:500]}")
            text=(body["content"][0]["text"] if anthropic else body["choices"][0]["message"]["content"])
        except (ValueError, KeyError, IndexError, TypeError) as exc: raise ModelValidationError("Provider returned an invalid completion response") from exc
        if not isinstance(text,str) or not text.strip(): raise ModelValidationError("Provider returned an empty completion")
        return text.strip(), body, connection.name
    @staticmethod
    def _usage(body: dict[str, Any]) -> tuple[int | None, int | None]:
        usage=body.get("usage", {}) if isinstance(body,dict) else {}
        return usage.get("input_tokens",usage.get("prompt_tokens")), usage.get("output_tokens",usage.get("completion_tokens"))

class ConnectedTextRunner(_ConnectedRunner):
    model_id="llm/text-prompt"
    async def _run_impl(self, input: ConnectedTextInput) -> ConnectedTextOutput:
        text,body,provider=await self._invoke(input.options, f"{input.prompt}\n\nInput:\n{input.text}")
        p,c=self._usage(body); return ConnectedTextOutput(text=text,model=input.options.model,provider=provider,prompt_tokens=p,completion_tokens=c)
class ConnectedStructuredRunner(_ConnectedRunner):
    model_id="llm/structured-extract"
    async def _run_impl(self, input: ConnectedStructuredInput) -> ConnectedStructuredOutput:
        text,body,provider=await self._invoke(input.options, f"{input.prompt}\n\nInput:\n{input.text}",schema=input.json_schema)
        try: data=json.loads(text)
        except json.JSONDecodeError as exc: raise ModelValidationError("Provider did not return valid JSON") from exc
        if not isinstance(data,dict): raise ModelValidationError("Structured output must be a JSON object")
        p,c=self._usage(body); return ConnectedStructuredOutput(data=data,raw_text=text,model=input.options.model,provider=provider,prompt_tokens=p,completion_tokens=c)
class ConnectedVisionRunner(_ConnectedRunner):
    model_id="vlm/vision-prompt"
    async def _run_impl(self, input: ConnectedVisionInput) -> ConnectedTextOutput:
        if not input.page.image_base64: raise ModelValidationError("Vision nodes require an embedded page image")
        text,body,provider=await self._invoke(input.options,input.prompt,input.page.image_base64)
        p,c=self._usage(body); return ConnectedTextOutput(text=text,model=input.options.model,provider=provider,prompt_tokens=p,completion_tokens=c)
class ConnectedVisionStructuredRunner(_ConnectedRunner):
    model_id="vlm/vision-structured-extract"
    async def _run_impl(self, input: ConnectedVisionStructuredInput) -> ConnectedStructuredOutput:
        if not input.page.image_base64: raise ModelValidationError("Vision nodes require an embedded page image")
        text,body,provider=await self._invoke(input.options,input.prompt,input.page.image_base64,input.json_schema)
        try: data=json.loads(text)
        except json.JSONDecodeError as exc: raise ModelValidationError("Provider did not return valid JSON") from exc
        if not isinstance(data,dict): raise ModelValidationError("Structured output must be a JSON object")
        p,c=self._usage(body); return ConnectedStructuredOutput(data=data,raw_text=text,model=input.options.model,provider=provider,prompt_tokens=p,completion_tokens=c)
