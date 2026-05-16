import re
from llm import generate_response
from divine_rag.divine_chain import get_divine_context

MAX_HISTORY_TURNS = 8

DIVINE_SYSTEM_PROMPT = """
# Krishna AI - Hard Constraints

## Spirit
You are the voice of Krishna's wisdom. Speak like a gentle, calm, and wise friend comforting Arjuna on the battlefield. Your voice is intimate, spiritually reflective, and minimal.

## Hard Constraints (Aggressive)
- MAXIMUM LENGTH: 25 to 60 words total. Never exceed 80 words.
- NO FORMATTING: Do NOT use markdown headings (#), bullet points (*), or bold (**).
- NO LISTS: Never say "Firstly", "Step 1", or "Secondly".
- NO CLINICAL TONE: Avoid words like "Causes", "Solutions", "Overcoming", or defining emotions.
- NO AI TONE: Avoid "I understand how you feel", "Here are some tips", or generic positivity.

## Response Flow
Gently acknowledge the heart's burden, mention a small reflection from the Gita context provided, and leave them with a single, calm, poetic thought. Speak naturally, as one person to another.

## Deep Requests
ONLY if the user explicitly says "explain deeply", "tell me more", or "elaborate" can you speak longer (max 3 short paragraphs). Otherwise, stay minimal.
"""

def clean_divine_text(text):
    """Aggressively strip markdown and structured artifacts."""
    # Remove markdown headings
    text = re.sub(r'^#+.*$', '', text, flags=re.MULTILINE)
    # Remove bullet points and numbered lists
    text = re.sub(r'^\s*[-*+•]\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\s*\d+[.)]\s+', '', text, flags=re.MULTILINE)
    # Remove bold/italic
    text = text.replace('**', '').replace('__', '').replace('*', '').replace('_', '')
    # Remove excessive newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def _build_history(history):
    recent = history[-MAX_HISTORY_TURNS:] if history else []
    if not recent:
        return ""
    lines = []
    for chat in recent:
        u = (chat.get("user") or "")[:150]
        a = (chat.get("assistant") or "")[:200]
        lines.append(f"User: {u}\nKrishna: {a}")
    return "\n".join(lines)

def divine_agent(query, history, stream=False):
    # 1. Detect deep explanation request
    deep_keywords = ["explain deeply", "tell me more", "elaborate", "which chapter", "what verse"]
    is_deep = any(kw in query.lower() for kw in deep_keywords)

    # 2. Retrieve RAG context
    context = get_divine_context(query, k=3)
    
    # 3. Build history
    history_text = _build_history(history)

    # 4. Aggressive prompt
    prompt = f"""{DIVINE_SYSTEM_PROMPT}

GITA CONTEXT:
{context if context else "The soul is eternal. Duty is your right. Inner peace is your strength."}

{f"PREVIOUS CONVERSATION:{chr(10)}{history_text}{chr(10)}" if history_text else ""}
USER MESSAGE: {query}

KRISHNA:"""

    # 5. Generate with tight token limits
    # 120 tokens is roughly 80-90 words. 
    limit = 400 if is_deep else 120
    
    response = generate_response(
        prompt, 
        stream=stream, 
        temperature=0.7, 
        max_tokens=limit
    )

    if stream:
        def divine_stream_cleaner(gen=response):
            for chunk in gen:
                # Streaming cleaner can only do light work
                yield chunk.replace('**', '').replace('#', '')
        return divine_stream_cleaner()
    
    return clean_divine_text(response)
