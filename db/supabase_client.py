from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional

from supabase import create_client

logger = logging.getLogger("cognitive_gravity.supabase")

class SupabaseVectorStore:
    """
    Stores semantic memory nodes and their embedding vectors in Supabase pgvector.
    This version uses a deterministic 768-dim fallback if no embedding service is configured.
    """

    def __init__(self) -> None:
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        self.client = create_client(self.url, self.key) if self.url and self.key else None

    async def _embed_text(self, text: str) -> List[float]:
        if not self.client:
            return [0.0] * 768

        try:
            import httpx

            meta_key = os.getenv("META_API_KEY")
            if not meta_key:
                return [0.0] * 768

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f\"{os.getenv('META_API_BASE_URL', 'https://api.llama.com/v1').rstrip('/')}/embeddings\",
                    headers={
                        "Authorization": f"Bearer {meta_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": os.getenv("META_EMBED_MODEL", "Llama-3.1-70B-Instruct"),
                        "input": text,
                    },
                )
                response.raise_for_status()
                payload = response.json()
                embedding = payload.get("data", [{}])[0].get("embedding", [])
                if embedding:
                    return [float(v) for v in embedding]

        except Exception as exc:
            logger.warning("Vector embedding generation failed: %s", exc)

        return [0.0] * 768

    async def store_node(self, node: Dict[str, Any], session_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        if self.client is None:
            logger.warning("Supabase not configured; skipping semantic node persistence.")
            return None

        text = " ".join(
            [
                str(node.get("title", "")),
                str(node.get("summary_tagline", "")),
                str(node.get("concept_a", "")),
                str(node.get("concept_b", "")),
            ]
        )

        embedding = await self._embed_text(text)
        payload = {
            "session_id": session_id,
            "title": node.get("title", "Untitled Concept"),
            "summary_tagline": node.get("summary_tagline", "New knowledge node"),
            "gravity_weight": float(node.get("gravity_weight", 1.0)),
            "embedding": embedding,
            "metadata": {
                "concept_a": node.get("concept_a"),
                "concept_b": node.get("concept_b"),
                "source": "cognitive-gravity",
            },
        }

        try:
            response = self.client.table("semantic_nodes").insert(payload).execute()
            return response.data[0] if response.data else payload
        except Exception as exc:
            logger.exception("Supabase insert failed for semantic node: %s", exc)
            return payload
