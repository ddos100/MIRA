"""RAG document search tool for agents."""
from app.agents.base_agent import Tool
from app.llm.rag_pipeline import get_rag


class DocumentSearchTool(Tool):
    def __init__(self):
        super().__init__(
            name="document_search",
            description="Search uploaded documents semantically. Args: query (str), n_results (int, default 5)",
        )

    async def run(self, query: str, n_results: int = 5, **kwargs) -> list:
        rag = get_rag()
        results = await rag.search(query, n_results=n_results)
        return [{"content": r["content"][:1000], "source": r["metadata"].get("document_name", ""), "score": r["distance"]} for r in results]
