"""Aggregate analysis for multiple journal entries (Yearly, Monthly, Weekly)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.domain.protocols import IAIAnalyzer

logger = logging.getLogger(__name__)

AGGREGATE_JSON_INSTRUCTIONS = """You organize a set of journal entries for a specific time period (Year, Month, or Week).
Return one JSON object only, no markdown.
Keys:
- summary: string, a neutral summary of what happened in the period (no advice)
- key_achievements: string array (notable moments; do not give advice)
- top_themes: string array
- key_people: string array

Do not give advice. Do not diagnose emotions. Keep it factual and useful for navigation.
Focus on topics, themes, and specific people. Avoid generic labels like "friends" or "family"; use specific names mentioned in the entries when possible."""

class AggregateAnalysisResult:
    def __init__(
        self,
        summary: str,
        key_achievements: list[str],
        top_themes: list[str],
        key_people: list[str],
    ):
        self.summary = summary
        self.key_achievements = key_achievements
        self.top_themes = top_themes
        self.key_people = key_people

async def analyze_aggregate(
    *,
    texts: list[str],
    period_name: str,
    api_key: str,
    base_url: str = "https://api.openai.com/v1",
    model: str = "gpt-4o-mini",
) -> dict[str, Any]:
    if not texts:
        return {
            "summary": "No entries for this period.",
            "key_achievements": [],
            "top_themes": [],
            "key_people": [],
        }

    combined_text = "\n---\n".join(texts)
    url = f"{base_url.rstrip('/')}/chat/completions"
    payload = {
        "model": model,
        "temperature": 0.3,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": AGGREGATE_JSON_INSTRUCTIONS},
            {
                "role": "user",
                "content": f"Journal entries for {period_name}:\n\n{combined_text}",
            },
        ],
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
        except Exception as e:
            logger.warning("Aggregate AI analysis failed: %s", e)
            return {
                "summary": "Error generating summary.",
                "key_achievements": [],
                "top_themes": [],
                "key_people": [],
            }
