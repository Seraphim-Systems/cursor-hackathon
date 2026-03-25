"""AI analysis via OpenAI-compatible Chat Completions (HTTP).

Use any base URL that implements `POST /chat/completions` (OpenAI, Azure OpenAI path-style,
or local proxies). Responses are validated with `domain.ai_payload.AIAnalysisPayload`.
"""

import json
import logging
from typing import Any

import httpx

from app.domain.ai_payload import AIAnalysisPayload
from app.domain.protocols import AnalysisResult

logger = logging.getLogger(__name__)

ANALYSIS_JSON_INSTRUCTIONS = """You analyze private journal entries. Return one JSON object only, no markdown.
Keys (use null only where truly unknown):
- summary: string, short paragraph
- sentiment_score: number in [-1, 1]
- key_points: string array
- projects: array of { "name": string, "notes": string } for work/themes mentioned
- goals: string array
- blockers: string array
- people: string array (always use specific names if mentioned; avoid generic "friends" or "family")
- priorities: string array
- themes: string array (thematic labels)
- impactful_factors: array of { "name": string, "impact": number, "type": string }

Be concise. Focus on topics, themes, and specific people. Avoid generic labels; if a specific name is mentioned, use it.
If the entry is empty or noise, still return valid JSON with empty arrays and a short summary."""


class OpenAiCompatAnalyzer:
    def __init__(
        self,
        *,
        api_key: str,
        base_url: str = "https://api.openai.com/v1",
        model: str = "gpt-4o-mini",
        timeout_seconds: float = 120.0,
    ) -> None:
        self._api_key = api_key
        self._base = base_url.rstrip("/")
        self._model = model
        self._timeout = timeout_seconds

    async def analyze(self, *, text: str) -> AnalysisResult:
        url = f"{self._base}/chat/completions"
        payload: dict[str, Any] = {
            "model": self._model,
            "temperature": 0.3,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": ANALYSIS_JSON_INSTRUCTIONS},
                {
                    "role": "user",
                    "content": f"Journal entry to analyze:\n\n{text}",
                },
            ],
        }
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
            except httpx.HTTPError as e:
                logger.warning("AI analysis request failed: %s", e)
                raise

        data = response.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        if not isinstance(content, str) or not content.strip():
            raise ValueError("AI response missing message content")

        try:
            raw = json.loads(content)
        except json.JSONDecodeError as e:
            raise ValueError("AI returned non-JSON content") from e

        try:
            validated = AIAnalysisPayload.model_validate(raw)
        except Exception as e:
            raise ValueError(f"AI JSON did not match analysis contract: {e}") from e

        return _payload_to_result(validated)

    async def analyze_trends(self, *, entries_data: list[dict]) -> dict:
        url = f"{self._base}/chat/completions"
        system_msg = """You analyze multiple journal entry insights to find long-term patterns and connections.
Identify recurring topics, themes, and people.
Return one JSON object only:
- summary: string, high-level overview of discovered patterns
- findings: string array, specific connections discovered (e.g., "[Person] is often mentioned alongside [Topic]", "Recurring focus on [Theme] during weekdays")
- beneficial_actions: string array, suggestions based on the identified patterns
"""
        payload: dict[str, Any] = {
            "model": self._model,
            "temperature": 0.5,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_msg},
                {
                    "role": "user",
                    "content": f"Entries data for trend analysis:\n\n{json.dumps(entries_data)}",
                },
            ],
        }
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
            except httpx.HTTPError as e:
                logger.warning("AI trend analysis request failed: %s", e)
                raise

        data = response.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            raise ValueError("AI returned non-JSON content for trends") from e


def _payload_to_result(p: AIAnalysisPayload) -> AnalysisResult:
    return AnalysisResult(
        summary=(
            p.summary.strip()
            if isinstance(p.summary, str) and p.summary.strip()
            else None
        ),
        sentiment_score=p.sentiment_score,
        key_points=list(p.key_points),
        projects=[{"name": x.name, "notes": x.notes} for x in p.projects],
        goals=list(p.goals),
        blockers=list(p.blockers),
        people=list(p.people),
        priorities=list(p.priorities),
        themes=list(p.themes),
        impactful_factors=[
            {"name": x.name, "impact": x.impact, "type": x.factor_type}
            for x in p.impactful_factors
        ],
    )
