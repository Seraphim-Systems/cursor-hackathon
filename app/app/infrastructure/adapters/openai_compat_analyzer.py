"""AI analysis via OpenAI-compatible Chat Completions (HTTP).

Use any base URL that implements `POST /chat/completions` (OpenAI, Azure OpenAI path-style,
or local proxies). Responses are requested as JSON objects matching `AnalysisResult` fields.
"""

import json
import logging
from typing import Any

import httpx

from app.domain.protocols import AnalysisResult, IAIAnalyzer

logger = logging.getLogger(__name__)

ANALYSIS_JSON_INSTRUCTIONS = """You analyze private journal entries. Return one JSON object only, no markdown.
Keys (use null only where truly unknown):
- summary: string, short paragraph
- sentiment_score: number from -1 (very negative) to 1 (very positive)
- key_points: string array
- projects: array of { "name": string, "notes": string } for work/themes mentioned
- goals: string array
- blockers: string array
- people: string array (names or roles)
- priorities: string array
- themes: string array (thematic labels)

Be concise. If the entry is empty or noise, still return valid JSON with empty arrays and a short summary."""


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
        content = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        if not isinstance(content, str) or not content.strip():
            raise ValueError("AI response missing message content")

        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as e:
            raise ValueError("AI returned non-JSON content") from e

        return _to_analysis_result(parsed)


def _to_analysis_result(raw: dict[str, Any]) -> AnalysisResult:
    projects_in = raw.get("projects") or []
    projects: list[dict] = []
    for p in projects_in:
        if isinstance(p, dict) and "name" in p:
            name = str(p.get("name", "")).strip()
            if name:
                projects.append(
                    {
                        "name": name,
                        "notes": str(p.get("notes") or ""),
                    }
                )
        elif isinstance(p, str) and p.strip():
            projects.append({"name": p.strip(), "notes": ""})

    def str_list(key: str) -> list[str]:
        v = raw.get(key)
        if not isinstance(v, list):
            return []
        out: list[str] = []
        for item in v:
            if isinstance(item, str) and item.strip():
                out.append(item.strip())
        return out

    sentiment = raw.get("sentiment_score")
    if sentiment is not None:
        try:
            sentiment = float(sentiment)
        except (TypeError, ValueError):
            sentiment = None

    summary = raw.get("summary")
    summary_str = str(summary).strip() if summary is not None else None

    return AnalysisResult(
        summary=summary_str or None,
        sentiment_score=sentiment,
        key_points=str_list("key_points"),
        projects=projects,
        goals=str_list("goals"),
        blockers=str_list("blockers"),
        people=str_list("people"),
        priorities=str_list("priorities"),
        themes=str_list("themes"),
    )
