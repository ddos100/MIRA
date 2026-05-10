"""ChromaDB-backed RAG pipeline — with keyword search fallback."""
import logging
import uuid
from typing import Dict, List, Optional

from django.conf import settings

logger = logging.getLogger(__name__)

_rag: Optional["RAGPipeline"] = None


def get_rag() -> "RAGPipeline":
    global _rag
    if _rag is None:
        _rag = RAGPipeline()
    return _rag


class RAGPipeline:
    COLLECTION_NAME = "mira_conductor_docs"

    def __init__(self):
        self._chroma = None

    def _get_client(self):
        if self._chroma is None:
            try:
                import chromadb
                host = getattr(settings, "CHROMADB_HOST", "chromadb")
                port = getattr(settings, "CHROMADB_PORT", 8001)
                self._chroma = chromadb.HttpClient(host=host, port=port)
            except Exception as exc:
                logger.warning("ChromaDB unavailable: %s — using keyword fallback", exc)
                return None
        return self._chroma

    def _collection(self):
        client = self._get_client()
        if client is None:
            return None
        try:
            return client.get_or_create_collection(
                name=self.COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
        except Exception as exc:
            logger.warning("ChromaDB collection error: %s", exc)
            return None

    async def ingest_chunks(
        self,
        chunks: List[str],
        document_id: str,
        chunk_ids: List[str],
        metadatas: List[dict],
        embeddings: Optional[List[List[float]]] = None,
    ) -> List[str]:
        col = self._collection()
        if col is None:
            logger.info("ChromaDB unavailable — chunks stored in DB only")
            return chunk_ids
        try:
            col.upsert(
                ids=chunk_ids,
                documents=chunks,
                metadatas=metadatas,
                embeddings=embeddings,
            )
            return chunk_ids
        except Exception as exc:
            logger.error("ChromaDB ingest error: %s", exc)
            return chunk_ids

    async def search(
        self,
        query: str,
        n_results: int = 5,
        where: Optional[dict] = None,
        query_embedding: Optional[List[float]] = None,
    ) -> List[dict]:
        col = self._collection()
        if col is None:
            return await self._keyword_fallback(query, n_results)
        try:
            kwargs: dict = {"n_results": n_results, "include": ["documents", "metadatas", "distances"]}
            if where:
                kwargs["where"] = where
            if query_embedding:
                kwargs["query_embeddings"] = [query_embedding]
            else:
                kwargs["query_texts"] = [query]
            result = col.query(**kwargs)
            docs = result.get("documents", [[]])[0]
            metas = result.get("metadatas", [[]])[0]
            dists = result.get("distances", [[]])[0]
            return [{"content": d, "metadata": m, "distance": s} for d, m, s in zip(docs, metas, dists)]
        except Exception as exc:
            logger.error("ChromaDB search error: %s — falling back to keyword", exc)
            return await self._keyword_fallback(query, n_results)

    async def _keyword_fallback(self, query: str, n_results: int) -> List[dict]:
        from apps.conductor.models import AiDocumentChunk
        chunks = AiDocumentChunk.objects.filter(content__icontains=query.split()[0])[:n_results]
        return [{"content": c.content, "metadata": c.chunk_metadata, "distance": 0.5} for c in chunks]

    async def delete_document(self, document_id: str) -> None:
        col = self._collection()
        if col is None:
            return
        try:
            col.delete(where={"document_id": document_id})
        except Exception as exc:
            logger.warning("ChromaDB delete error: %s", exc)

    async def collection_stats(self) -> dict:
        col = self._collection()
        if col is None:
            return {"available": False, "count": 0}
        try:
            return {"available": True, "count": col.count()}
        except Exception:
            return {"available": False, "count": 0}
