from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from agent.meta_llama_synthesizer import MetaLlamaSynthesizer
from db.supabase_client import SupabaseVectorStore

logger = logging.getLogger("cognitive_gravity")
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Cognitive Gravity Backend",
    description="Agentic volumetric synthesis service for spatial knowledge graph generation.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://*.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.github.dev",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CollisionPayload(BaseModel):
    concept_a: str = Field(..., min_length=1, max_length=4000)
    concept_b: str = Field(..., min_length=1, max_length=4000)
    session_id: Optional[str] = None
    source: Optional[str] = "webxr"

class SynthesisEnvelope(BaseModel):
    status: str = "ok"
    data: Dict[str, Any]

async def _handle_collision(payload: CollisionPayload) -> Dict[str, Any]:
    synthesizer = MetaLlamaSynthesizer()
    result = await synthesizer.synthesize_collision(payload.concept_a, payload.concept_b)

    vector_store = SupabaseVectorStore()
    await vector_store.store_node(
        node={
            "title": result.get("title", "Untitled Concept"),
            "summary_tagline": result.get("summary_tagline", "New knowledge node"),
            "gravity_weight": result.get("gravity_weight", 1.0),
            "concept_a": payload.concept_a,
            "concept_b": payload.concept_b,
        },
        session_id=payload.session_id,
    )
    return result

@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok", "service": "cognitive-gravity"}

@app.post("/synthesize")
async def synthesize(payload: CollisionPayload) -> SynthesisEnvelope:
    result = await _handle_collision(payload)
    return SynthesisEnvelope(status="ok", data=result)

@app.websocket("/ws/synthesis")
async def ws_synthesis(websocket: WebSocket) -> None:
    await websocket.accept()
    logger.info("WebSocket client connected to /ws/synthesis")

    try:
        while True:
            raw_message = await websocket.receive_text()
            try:
                payload_data = json.loads(raw_message)
                payload = CollisionPayload(**payload_data)
            except Exception as exc:
                logger.exception("Invalid payload received on WS: %s", raw_message)
                await websocket.send_json({
                    "status": "error",
                    "error": f"Invalid payload: {str(exc)}",
                })
                continue

            try:
                result = await _handle_collision(payload)
                await websocket.send_json({
                    "status": "ok",
                    "data": result,
                    "session_id": payload.session_id,
                })
            except Exception as exc:
                logger.exception(
                    "Synthesis failure for collision between '%s' and '%s'",
                    payload.concept_a,
                    payload.concept_b,
                )
                await websocket.send_json({
                    "status": "error",
                    "error": str(exc),
                    "session_id": payload.session_id,
                })
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected from /ws/synthesis")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=False)
