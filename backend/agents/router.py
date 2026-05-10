from agents.study_agent import study_agent
from agents.coding_agent import coding_agent
from agents.productivity_agent import productivity_agent

def route_query(query, history):

    query_lower = query.lower()

    if query_lower.startswith("coding:"):

        cleaned_query = query.replace(

            "coding:",
            ""

        ).strip()

        return coding_agent(

            cleaned_query,
            history

        )

    elif query_lower.startswith("productivity:"):

        cleaned_query = query.replace(

            "productivity:",
            ""

        ).strip()

        return productivity_agent(

            cleaned_query,
            history

        )

    else:

        cleaned_query = query.replace(

            "study:",
            ""

        ).strip()

        return study_agent(

            cleaned_query,
            history

        )