from __future__ import annotations

import json
import re
from typing import Optional

from app.schemas import ScoreRequest


def _short_response_payload(feedback: str, transcript: str) -> str:
    clean_transcript = transcript.strip() or None
    return json.dumps(
        {
            "overall": 10,
            "content": 10,
            "fluency": 10,
            "pronunciation": 10,
            "grammar": 10,
            "spelling": 10,
            "vocabulary": 10,
            "feedback": {
                "summary": feedback,
                "issues": ["The response was too short to assess content and delivery reliably."],
                "improvements": ["Speak for longer and cover the full prompt before submitting."],
                "example_fix": "Give a fuller response with clear beginning, middle, and end.",
            },
            "transcript": clean_transcript,
        }
    )


def _speaking_prompt(prompt_type: str, transcript: str, question_text: Optional[str], reference_answer: Optional[str]) -> str:
    prompt_label = prompt_type.replace("_", " ").strip().title()
    reference = reference_answer or question_text or ""
    normalized = prompt_type.lower().replace("-", "_").replace(" ", "_")
    is_repeat = normalized == "repeat_sentence"
    rubric = (
        "Repeat Sentence rubric: Content, Fluency, Pronunciation, Overall."
        if is_repeat
        else f"{prompt_label} rubric: Content, Fluency, Pronunciation, Overall."
    )
    return f"""
You are a PTE Academic examiner. Score this speaking response for {prompt_label}.

Use a low-variance, production-friendly assessment. Preserve the current scoring idea:
- Content coverage against the prompt/reference
- Fluency based on coherence and delivery smoothness inferred from transcript quality
- Pronunciation estimated conservatively from transcript fidelity and word choice
- Convert all dimensions to the PTE 10-90 scale

{rubric}

If the transcript is extremely short, empty, or obviously invalid, return a low but reasonable score with brief feedback.

Question text:
{question_text or "(none)"}

Reference answer:
{reference or "(none)"}

Student transcript:
{transcript or "(empty)"}

Return JSON only. No markdown. No code fences.
Schema:
{{
  "overall": number,
  "content": number | null,
  "fluency": number | null,
  "pronunciation": number | null,
  "grammar": null,
  "spelling": null,
  "vocabulary": null,
  "feedback": {{
    "summary": string,
    "issues": string[],
    "improvements": string[],
    "example_fix": string
  }},
  "transcript": string | null
}}

Requirements for feedback:
- Keep it concise and practical
- issues: 1 to 3 short strings
- improvements: 1 to 3 short actionable strings
- example_fix: one short improved phrase or sentence
""".strip()


def _writing_prompt(prompt_type: str, transcript: str, question_text: Optional[str], reference_answer: Optional[str]) -> str:
    prompt_label = prompt_type.replace("_", " ").strip().title()
    return f"""
You are a PTE Academic examiner. Score this writing response for {prompt_label}.

Preserve the current scoring idea:
- Content relevance to the prompt/source
- Grammar accuracy and sentence control
- Vocabulary range and precision
- Spelling quality
- Convert all scores to PTE 10-90

If the response is too short, off-topic, or invalid, return a low but reasonable score with concise feedback.

Question text:
{question_text or "(none)"}

Reference answer / source:
{reference_answer or "(none)"}

Student response:
{transcript or "(empty)"}

Return JSON only. No markdown. No code fences.
Schema:
{{
  "overall": number,
  "content": number | null,
  "fluency": null,
  "pronunciation": null,
  "grammar": number | null,
  "spelling": number | null,
  "vocabulary": number | null,
  "feedback": string,
  "transcript": string | null
}}
""".strip()


def _dictation_prompt(transcript: str, reference_answer: Optional[str]) -> str:
    return f"""
You are a PTE Academic examiner. Score this Write From Dictation response.

Scoring idea:
- Compare the student sentence with the reference answer
- Score overall on PTE 10-90
- Use spelling as the strongest dimension
- Use grammar and vocabulary as supportive dimensions when helpful

Reference sentence:
{reference_answer or "(none)"}

Student answer:
{transcript or "(empty)"}

Return JSON only. No markdown. No code fences.
Schema:
{{
  "overall": number,
  "content": null,
  "fluency": null,
  "pronunciation": null,
  "grammar": number | null,
  "spelling": number | null,
  "vocabulary": number | null,
  "feedback": string,
  "transcript": string | null
}}
""".strip()


def _summary_prompt(prompt_type: str, transcript: str, question_text: Optional[str], reference_answer: Optional[str]) -> str:
    prompt_label = prompt_type.replace("_", " ").strip().title()
    return f"""
You are a PTE Academic examiner. Score this summary response for {prompt_label}.

Preserve the current scoring idea:
- Content capture of the source material
- Grammar, vocabulary, and spelling
- Convert all dimensions to the PTE 10-90 scale

Question text:
{question_text or "(none)"}

Source transcript / reference:
{reference_answer or "(none)"}

Student summary:
{transcript or "(empty)"}

Return JSON only. No markdown. No code fences.
Schema:
{{
  "overall": number,
  "content": number | null,
  "fluency": null,
  "pronunciation": null,
  "grammar": number | null,
  "spelling": number | null,
  "vocabulary": number | null,
  "feedback": string,
  "transcript": string | null
}}
""".strip()


def build_prompt(payload: ScoreRequest) -> str:
    normalized_transcript = (payload.transcript or "").strip()
    if len(re.sub(r"\s+", "", normalized_transcript)) < 3:
        feedback = "The response was too short to score reliably. Please provide a fuller answer."
        return _short_response_payload(feedback, normalized_transcript)

    task = payload.task.lower()
    if task == "speaking":
        return _speaking_prompt(payload.promptType, normalized_transcript, payload.questionText, payload.referenceAnswer)
    if task == "writing":
        return _writing_prompt(payload.promptType, normalized_transcript, payload.questionText, payload.referenceAnswer)
    if task == "dictation":
        return _dictation_prompt(normalized_transcript, payload.referenceAnswer)
    if task == "summary":
        return _summary_prompt(payload.promptType, normalized_transcript, payload.questionText, payload.referenceAnswer)
    raise ValueError(f"Unsupported task: {payload.task}")
