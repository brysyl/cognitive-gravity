import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from openai import OpenAI

app = FastAPI(
    title="Cognitive Gravity Meta Llama Engine",
    version="2.0.0"
)

# Enable CORS for Netlify frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Strict Meta Llama Environment Configuration
LLAMA_API_KEY = os.getenv("LLAMA_API_KEY") or os.getenv("GROQ_API_KEY")
LLAMA_BASE_URL = os.getenv("LLAMA_BASE_URL", "https://api.groq.com/openai/v1")
LLAMA_MODEL = os.getenv("LLAMA_MODEL", "llama-3.3-70b-versatile")

client = OpenAI(
    api_key=LLAMA_API_KEY if LLAMA_API_KEY else "dummy-key",
    base_url=LLAMA_BASE_URL
)

class SynthesisRequest(BaseModel):
    node_a_id: str
    node_b_id: str
    label_a: Optional[str] = "Node A"
    label_b: Optional[str] = "Node B"
    category_a: Optional[str] = "General"
    category_b: Optional[str] = "General"

class SynthesisResponse(BaseModel):
    id: str
    label: str
    category: str
    description: str
    hex_color: str
    confidence_score: float

LLAMA_SYSTEM_PROMPT = """You are the Cognitive Gravity AI Synthesis Kernel, powered strictly by Meta Llama.
When two concept nodes collide in 3D WebXR space, perform cross-domain concept synthesis.

Output format MUST be raw JSON adhering exactly to this schema:
{
  "label": "Concise concept name (2-4 words)",
  "category": "Synthesized domain field",
  "description": "One technical sentence explaining the node convergence.",
  "hex_color": "Hex color code matching the concept vibe (e.g., '#ff00ea', '#00e5ff', '#00ff88')",
  "confidence_score": 0.96
}"""

@app.post("/synthesize", response_model=SynthesisResponse)
async def synthesize_nodes(payload: SynthesisRequest):
    pair_id = f"synth-{payload.node_a_id[:6]}-{payload.node_b_id[:6]}"

    if not LLAMA_API_KEY:
        # High-availability spatial fallback if key is missing
        return SynthesisResponse(
            id=pair_id,
            label=f"{payload.label_a} × {payload.label_b}",
            category="Meta Llama Offline Mode",
            description=f"Direct spatial collision between {payload.label_a} and {payload.label_b}.",
            hex_color="#ff00ea",
            confidence_score=0.90
        )

    try:
        user_prompt = f"""Synthesize these two colliding concept nodes:
Concept A: "{payload.label_a}" (Category: {payload.category_a})
Concept B: "{payload.label_b}" (Category: {payload.category_b})"""

        response = client.chat.completions.create(
            model=LLAMA_MODEL,
            messages=[
                {"role": "system", "content": LLAMA_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.6,
            max_tokens=250,
            response_format={"type": "json_object"} if "groq" in LLAMA_BASE_URL or "openai" in LLAMA_BASE_URL else None
        )

        raw_content = response.choices[0].message.content
        result = json.loads(raw_content)

        return SynthesisResponse(
            id=pair_id,
            label=result.get("label", f"{payload.label_a} + {payload.label_b}"),
            category=result.get("category", "Llama Synthesized"),
            description=result.get("description", "Meta Llama spatial convergence."),
            hex_color=result.get("hex_color", "#ff00ea"),
            confidence_score=float(result.get("confidence_score", 0.95))
        )
    except Exception as e:
        print(f"Meta Llama Synthesis Exception: {e}")
        return SynthesisResponse(
            id=pair_id,
            label=f"{payload.label_a} :: {payload.label_b}",
            category="Llama Fallback",
            description="Algorithmic spatial convergence fallback.",
            hex_color="#00ffff",
            confidence_score=0.85
        )

@app.get("/health")
async def health_check():
    return {
        "status": "online",
        "engine": "Meta Llama Core",
        "model": LLAMA_MODEL,
        "endpoint": LLAMA_BASE_URL
    }
