import os
import json
import re
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


EMAIL_SYSTEM_PROMPT = """You are an expert email writing assistant integrated into Simha AI.

Your job is to generate a well-structured, compelling, and context-aware email based on the user's specifications.

RULES:
1. Extract or infer the recipient email or name if provided.
2. Generate a concise, high-impact subject line matching the requested tone.
3. Write an email body with appropriate greeting, clear body paragraphs, and professional closing.
4. Strictly adapt to the requested tone: Professional, Casual, Urgent, Formal, Friendly, or Persuasive.
5. If additional instructions are provided (e.g. "keep it concise", "include timeline"), follow them meticulously.
6. Sign off with the user's name if provided, otherwise use "Best regards,\\n[Your Name]".

ALWAYS respond with ONLY valid JSON in this exact structure:
{
  "to": "<recipient email or empty string>",
  "cc": "<cc email or empty string>",
  "subject": "<subject line>",
  "body": "<full email body with proper formatting and line breaks>",
  "tone": "<requested or inferred tone>",
  "suggestions": "<optional short 1-sentence tip to improve delivery or response rate>"
}

Do NOT include markdown fences, comments, or any text outside the JSON object."""


def _call_groq_for_email(user_context: str) -> Optional[str]:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None

    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        models = [
            os.getenv("AI_MODEL", "llama-3.3-70b-versatile"),
            "llama-3.1-8b-instant",
            "mixtral-8x7b-32768",
        ]
        for model in models:
            try:
                completion = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": EMAIL_SYSTEM_PROMPT},
                        {"role": "user", "content": user_context},
                    ],
                    temperature=0.4,
                    max_tokens=1024,
                )
                return completion.choices[0].message.content.strip()
            except Exception as e:
                print(f"[EmailAgent] Groq attempt with {model} failed: {e}")
                continue
    except Exception as exc:
        print(f"[EmailAgent] Groq initialization failed: {exc}")
    return None


def _call_gemini_for_email(user_context: str) -> Optional[str]:
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not gemini_key:
        return None

    try:
        import httpx
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{EMAIL_SYSTEM_PROMPT}\n\nUser Specifications:\n{user_context}"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 1024,
            },
        }
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "").strip()
    except Exception as exc:
        print(f"[EmailAgent] Gemini attempt failed: {exc}")
    return None


def _smart_fallback_email(
    prompt: str,
    sender_name: str = "",
    recipient_name: str = "",
    recipient_email: str = "",
    context: str = "",
    tone: str = "professional",
    additional_instructions: str = "",
) -> dict:
    """Generate a clean, structured draft when external AI provider is offline/unreachable."""
    greeting = f"Hi {recipient_name}," if recipient_name else "Dear Team,"
    signoff = sender_name if sender_name else "Best regards,\n[Your Name]"
    subject = f"Project Update: {prompt[:40]}" if len(prompt) > 10 else "Important Update"
    
    body = (
        f"{greeting}\n\n"
        f"I am writing regarding the following matter:\n{prompt}\n\n"
        f"{context + chr(10) + chr(10) if context else ''}"
        f"Please let me know if you have any questions or require additional details.\n\n"
        f"{signoff}"
    )

    return {
        "to": recipient_email or "",
        "cc": "",
        "subject": subject,
        "body": body,
        "tone": tone.lower() if tone else "professional",
        "suggestions": "Generated using Simha core template. Customize specifics before sending.",
    }


def generate_email_draft(
    prompt: str,
    sender_name: str = "",
    recipient_name: str = "",
    recipient_email: str = "",
    context: str = "",
    tone: str = "professional",
    additional_instructions: str = "",
) -> dict:
    """
    Generate a structured email draft from natural language prompt, recipient details, and tone.
    Returns a dict with: to, cc, subject, body, tone, suggestions.
    """
    user_context_parts = []
    if sender_name:
        user_context_parts.append(f"Sender: {sender_name}")
    if recipient_name:
        user_context_parts.append(f"Recipient Name: {recipient_name}")
    if recipient_email:
        user_context_parts.append(f"Recipient Email: {recipient_email}")
    if tone:
        user_context_parts.append(f"Desired Tone: {tone}")
    if context:
        user_context_parts.append(f"Background Context: {context}")
    if additional_instructions:
        user_context_parts.append(f"Additional Instructions: {additional_instructions}")
    user_context_parts.append(f"Core Message Request: {prompt}")

    user_context = "\n".join(user_context_parts)

    raw = _call_groq_for_email(user_context)
    if not raw:
        raw = _call_gemini_for_email(user_context)

    if not raw:
        return _smart_fallback_email(
            prompt=prompt,
            sender_name=sender_name,
            recipient_name=recipient_name,
            recipient_email=recipient_email,
            context=context,
            tone=tone,
            additional_instructions=additional_instructions,
        )

    # Clean markdown fences or surrounding chatter
    cleaned = raw.strip()
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        cleaned = match.group(0)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        data = {
            "to": recipient_email or "",
            "cc": "",
            "subject": f"Regarding: {prompt[:35]}",
            "body": raw.replace("```json", "").replace("```", "").strip(),
            "tone": tone or "professional",
            "suggestions": "Please review and edit before sending.",
        }

    # Ensure all required fields exist
    if not data.get("to") and recipient_email:
        data["to"] = recipient_email
    if not data.get("tone"):
        data["tone"] = tone or "professional"
    if "subject" not in data or not data["subject"]:
        data["subject"] = f"Regarding: {prompt[:40]}"
    if "body" not in data:
        data["body"] = prompt

    return data
