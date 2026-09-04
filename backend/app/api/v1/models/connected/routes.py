"""Routes for configured external LLM/VLM connections."""
from fastapi import APIRouter
from app.api.v1.models.multipart import parse_json_or_multipart
from app.api.v1.models.register_routes import register_model_routes
from app.schemas.models.connected.generation import ConnectedTextInput, ConnectedTextOutput, ConnectedStructuredInput, ConnectedStructuredOutput, ConnectedVisionInput, ConnectedVisionStructuredInput
router=APIRouter()
register_model_routes(router,path="/text-prompt",model_id="llm/text-prompt",input_schema=ConnectedTextInput,output_schema=ConnectedTextOutput,tags=["models","llm"],parse_payload=parse_json_or_multipart)
register_model_routes(router,path="/structured-extract",model_id="llm/structured-extract",input_schema=ConnectedStructuredInput,output_schema=ConnectedStructuredOutput,tags=["models","llm"],parse_payload=parse_json_or_multipart)
register_model_routes(router,path="/vision-prompt",model_id="vlm/vision-prompt",input_schema=ConnectedVisionInput,output_schema=ConnectedTextOutput,tags=["models","vlm"],parse_payload=parse_json_or_multipart)
register_model_routes(router,path="/vision-structured-extract",model_id="vlm/vision-structured-extract",input_schema=ConnectedVisionStructuredInput,output_schema=ConnectedStructuredOutput,tags=["models","vlm"],parse_payload=parse_json_or_multipart)
