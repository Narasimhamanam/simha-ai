from agents.study_agent import study_agent
from agents.coding_agent import coding_agent
from agents.productivity_agent import productivity_agent
from agents.divine_agent import divine_agent

def route_query(query, history, stream=False):

    query_lower = query.lower()

    if query_lower.startswith("coding:"):

        cleaned_query = query.replace(

            "coding:",
            ""

        ).strip()

        return coding_agent(

            cleaned_query,
            history,
            stream=stream

        )

    elif query_lower.startswith("productivity:"):

        cleaned_query = query.replace(

            "productivity:",
            ""

        ).strip()

        return productivity_agent(
            cleaned_query,
            history,
            stream=stream
        )
    
    elif query_lower.startswith("divine:") or query_lower.startswith("krishna:"):
        cleaned_query = query.replace("divine:", "").replace("krishna:", "").replace("Divine:", "").replace("Krishna:", "").strip()
        return divine_agent(
            cleaned_query,
            history,
            stream=stream
        )

    else:

        cleaned_query = query.replace(

            "study:",
            ""

        ).strip()

        return study_agent(

            cleaned_query,
            history,
            stream=stream

        )