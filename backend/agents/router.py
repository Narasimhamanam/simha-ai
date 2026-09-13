from agents.study_agent import study_agent
from agents.coding_agent import coding_agent
from agents.productivity_agent import productivity_agent
from agents.divine_agent import divine_agent


def route_query(query: str, history, stream: bool = False):
    query_lower = query.lower()

    if query_lower.startswith("coding:") or query_lower.startswith("code:"):
        cleaned_query = query.split(":", 1)[1].strip()
        return coding_agent(cleaned_query, history, stream=stream)

    elif query_lower.startswith("productivity:"):
        cleaned_query = query.split(":", 1)[1].strip()
        return productivity_agent(cleaned_query, history, stream=stream)

    elif (
        query_lower.startswith("wisdom:")
        or query_lower.startswith("divine:")
        or query_lower.startswith("krishna:")
    ):
        cleaned_query = query.split(":", 1)[1].strip()
        return divine_agent(cleaned_query, history, stream=stream)

    elif query_lower.startswith("study:"):
        cleaned_query = query.split(":", 1)[1].strip()
        return study_agent(cleaned_query, history, stream=stream)

    else:
        return study_agent(query.strip(), history, stream=stream)