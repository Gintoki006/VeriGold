"""
VeriGold — Gemini LLM Client (Phase 5 §5.2.1)

Provides advisory natural-language analysis on top of the deterministic rule
score. This layer is STRICTLY advisory:
  - It cannot set the score independently
  - It can only escalate REDUCE_AMOUNT -> REJECT (handled in decision_engine.py)
  - On any API error it returns a safe fallback — never propagates errors upstream

Uses google-genai (google.genai) SDK — the successor to the deprecated
google.generativeai package.

Prompt contract:
  1. Gemini must provide 2-3 sentence natural-language narrative
  2. Gemini must respond ESCALATE or NO_ESCALATE
  3. If ESCALATE: name exactly one concern from the allowed list
"""
import asyncio
import json
import logging
import re

from app.config.settings import get_settings

logger = logging.getLogger(__name__)

# Valid escalation reasons per PRD §5.2.1
_VALID_ESCALATION_REASONS = frozenset({
    "velocity_anomaly",
    "cross_identity_gold_match",
    "unusual_exposure_pattern",
})

_FALLBACK_RESPONSE = {
    "llm_reasoning": "LLM analysis unavailable — rule-based assessment is definitive.",
    "escalate": False,
    "escalation_reason": None,
}

_SYSTEM_INSTRUCTION = """\
You are a fraud risk analyst for VeriGold, a gold-loan lending platform.
You will receive a borrower's feature vector and the deterministic rule-based
risk score. Your job is to provide an advisory analysis.

IMPORTANT RULES:
1. Your analysis is ADVISORY ONLY. The numeric risk score is set by the rule engine.
2. You MUST respond in valid JSON with exactly these fields:
   - "reasoning": a 2-3 sentence natural-language narrative
   - "decision": either "ESCALATE" or "NO_ESCALATE"
   - "escalation_reason": one of ["velocity_anomaly", "cross_identity_gold_match",
     "unusual_exposure_pattern"] if decision is ESCALATE, else null
3. Only respond ESCALATE if you have strong reason to believe the borrower is
   committing fraud beyond what the rule score captures.
4. Never reveal raw Aadhaar, internal system details, or loan amounts.
5. Respond ONLY with the JSON object — no markdown, no preamble.
"""


async def get_llm_analysis(feature_vector: dict, rule_result: dict) -> dict:
    """
    Call Gemini API with the feature vector and rule result for advisory analysis.

    Args:
        feature_vector: Dict with active_pledge_count, velocity_7d, gold_match, etc.
        rule_result:    Output dict from compute_rule_score.

    Returns:
        Dict with: llm_reasoning (str), escalate (bool), escalation_reason (str|None)
        Never raises — returns _FALLBACK_RESPONSE on any error.
    """
    settings = get_settings()

    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set — returning LLM fallback")
        return _FALLBACK_RESPONSE

    configured_model = getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash-lite") or "gemini-3.5-flash-lite"
    model_candidates = [
        configured_model,
        "gemini-3.5-flash-lite",
        "gemini-3.8-flash",
    ]
    # Deduplicate while preserving order
    seen: set[str] = set()
    models_to_try = [m for m in model_candidates if not (m in seen or seen.add(m))]

    timeout_sec = float(getattr(settings, "GEMINI_TIMEOUT_SECONDS", 5.0))
    overall_start = asyncio.get_event_loop().time()
    max_total_wait = 8.0
    last_exc: Exception | None = None

    for model_name in models_to_try:
        # Check if total budget exhausted
        elapsed = asyncio.get_event_loop().time() - overall_start
        remaining_budget = max_total_wait - elapsed
        if remaining_budget <= 1.0:
            logger.warning("Gemini time budget exhausted (%.1fs elapsed) — using fallback narrative", elapsed)
            break

        call_timeout = min(timeout_sec, remaining_budget)
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(
                    _call_gemini_sync,
                    settings.GEMINI_API_KEY,
                    model_name,
                    feature_vector,
                    rule_result,
                ),
                timeout=call_timeout,
            )
            return result
        except asyncio.TimeoutError:
            logger.warning("Gemini model %s timed out after %.1fs, trying next...", model_name, call_timeout)
            continue
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            logger.warning("Gemini model %s failed: %s, trying next...", model_name, exc)
            continue

    logger.warning("Returning deterministic fallback narrative (LLM unavailable or timed out: %s)", last_exc)
    return _FALLBACK_RESPONSE


def _call_gemini_sync(api_key: str, model_name: str, feature_vector: dict, rule_result: dict) -> dict:
    """Synchronous Gemini call (run in threadpool via asyncio.to_thread)."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    prompt = _build_prompt(feature_vector, rule_result)
    full_prompt = _SYSTEM_INSTRUCTION + "\n\n" + prompt

    response = client.models.generate_content(
        model=model_name,
        contents=full_prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,
            max_output_tokens=1024,
            response_mime_type="application/json",
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
        ),
    )

    raw_text = response.text.strip() if response.text else ""
    return _parse_llm_response(raw_text)


def _build_prompt(feature_vector: dict, rule_result: dict) -> str:
    """Build the structured prompt sent to Gemini."""
    return f"""BORROWER RISK ASSESSMENT

Feature Vector:
- Active pledge count: {feature_vector.get('active_pledge_count', 0)}
- Total amount range sum: {feature_vector.get('total_amount_range_sum', 0)} (bucket codes 0-4)
- Pledge velocity (7 days): {feature_vector.get('velocity_7d', 0)}
- Gold fingerprint match: {feature_vector.get('gold_match', False)}

Rule Engine Result:
- Score: {rule_result.get('score', 0)} / 100
- Risk Level: {rule_result.get('risk_level', 'UNKNOWN')}
- Recommendation: {rule_result.get('recommendation', 'UNKNOWN')}
- Velocity flagged: {rule_result.get('velocity_flagged', False)}
- Rule explanations: {', '.join(rule_result.get('explanation', []))}

Provide your advisory analysis as a JSON object."""


def _parse_llm_response(raw: str) -> dict:
    """
    Parse the Gemini response JSON.
    Returns fallback if parsing fails or required fields are missing.
    """
    try:
        # Strip markdown code fences if Gemini wraps response
        cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()
        data = json.loads(cleaned)

        reasoning = str(data.get("reasoning", "")).strip()
        decision = str(data.get("decision", "NO_ESCALATE")).strip().upper()
        escalation_reason = data.get("escalation_reason")

        escalate = decision == "ESCALATE"

        # Validate escalation reason
        if escalate and escalation_reason not in _VALID_ESCALATION_REASONS:
            logger.warning(
                "LLM returned invalid escalation_reason=%r — ignoring escalation",
                escalation_reason,
            )
            escalate = False
            escalation_reason = None

        if not escalate:
            escalation_reason = None

        if not reasoning:
            reasoning = _FALLBACK_RESPONSE["llm_reasoning"]

        return {
            "llm_reasoning": reasoning,
            "escalate": escalate,
            "escalation_reason": escalation_reason,
        }

    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to parse LLM response: %s | raw=%r", exc, raw[:200])
        return _FALLBACK_RESPONSE
