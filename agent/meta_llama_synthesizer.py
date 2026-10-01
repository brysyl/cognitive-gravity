from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger("cognitive_gravity.meta_llama")

class MetaLlamaSynthesizer:
    """
    Low-latency semantic synthesis using Meta Llama's API.
    Falls back to deterministic synthesis if the API is unavailable or misconfigured.
    """

    def __init__(self) -> None:
        self.api_key = os.getenv("META_API_KEY")
        self.base_url = os.getenv("META_API_BASE_URL", "https://api.llama.com/v1")
        self.model = os.getenv("META_MODEL", "Llama-3.1-70B-Instruct")
        self.timeout = 30.0

    async def synthesize_collision(self, concept_a: str, concept_b: str) -> Dict[str, Any]:
        if not self.api_key:
            logger.warning("META_API_KEY missing. Using fallback synthesis.")
            return self._fallback_payload(concept_a, concept_b)

        prompt = (
            "You are synthesizing a new high-order concept from two colliding ideas in a spatial cognition workspace. "
            "Return valid JSON with keys: title, summary_tagline, gravity_weight. "
            "The output must be concise but semantically rich. "
            "The gravity_weight value must be a float between 0.5 and 3.0. "
            "The title should read like a meaningful concept or hypothesis. "
            "The summary_tagline should be a short but compelling description.\n\n"
            f"Concept A: {concept_a}\nConcept B: {concept_b}"
        )

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a thoughtful knowledge synthesis engine. "
                        "Return only valid JSON with keys title, summary_tagline, gravity_weight."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "max_tokens": 256,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url.rstrip('/')}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()

                content = (
                    data.get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "{}")
                )

                if isinstance(content, str):
                    parsed = json.loads(content)
                else:
                    parsed = {}

                return {
                    "title": str(parsed.get("title") or self._fallback_title(concept_a, concept_b)),
                    "summary_tagline": str(
                        parsed.get("summary_tagline") or self._fallback_summary(concept_a, concept_b)
                    ),
                    "gravity_weight": float(parsed.get("gravity_weight") or 1.5),
                }
        except Exception as exc:
            logger.exception("Meta Llama synthesis failed; using fallback.")
            return self._fallback_payload(concept_a, concept_b, reason=str(exc))

    def _fallback_title(self, concept_a: str, concept_b: str) -> str:
        left = concept_a.strip().split()[0:3]
        right = concept_b.strip().split()[0:3]
        left_text = " ".join(left) if left else "Signal"
        right_text = " ".join(right) if right else "Pattern"
        return f"{left_text} + {right_text} Synthesis"

    def _fallback_summary(self, concept_a: str, concept_b: str) -> str:
        return (
            f"A new concept formed from the intersection of '{concept_a}' "
            f"and '{concept_b}' into an emergent knowledge scaffold."
        )

    def _fallback_payload(self, concept_a: str, concept_b: str, reason: Optional[str] = None) -> Dict[str, Any]:
        return {
            "title": self._fallback_title(concept_a, concept_b),
            "summary_tagline": self._fallback_summary(concept_a, concept_b),
            "gravity_weight": 1.5,
            "fallback_reason": reason,
        }
