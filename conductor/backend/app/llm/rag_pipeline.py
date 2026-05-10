"""RAG pipeline: document chunks → Ollama embeddings → ChromaDB → retrieval.
All embeddings are generated locally via Ollama. Nothing leaves the server.
"""
import uuid
from typing import List, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.config import get_settings
from app.llm.ollama_client import get_ollama

settings = get_settings()


def get_chroma_client() -> chromadb.AsyncHttpClient:
    return chromadb.AsyncHttpClient(
        host=settings.chroma_host,
        port=settings.chroma_port,
        settings=ChromaSettings(anonymized_telemetry=False),
    )


class RAGPipeline:
    def __init__(self):
        self.ollama = get_ollama()
        self.collection_name = settings.chroma_collection

    async def _get_collection(self):
        client = get_chroma_client()
        return await client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    async def ingest_chunks(
        self,
        chunks: List[str],
        document_id: str,
        chunk_ids: List[str],
        metadatas: Optional[List[dict]] = None,
    ) -> List[str]:
        """Embed and store chunks in ChromaDB. Returns chroma IDs."""
        if not chunks:
            return []

        embeddings = await self.ollama.embed_batch(chunks)
        collection = await self._get_collection()

        chroma_ids = [f"{document_id}_{i}" for i in range(len(chunks))]
        metas = metadatas or [{} for _ in chunks]
        for m, cid in zip(metas, chunk_ids):
            m["document_id"] = document_id
            m["chunk_db_id"] = cid

        await collection.add(
            ids=chroma_ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=metas,
        )
        return chroma_ids

    async def search(
        self,
        query: str,
        n_results: int = 5,
        where: Optional[dict] = None,
    ) -> List[dict]:
        """Semantic search across all ingested documents."""
        query_embedding = await self.ollama.embed(query)
        collection = await self._get_collection()

        results = await collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where,
            include=["documents", "metadatas", "distances"],
        )

        output = []
        for i, doc in enumerate(results["documents"][0]):
            output.append({
                "content": doc,
                "metadata": results["metadatas"][0][i],
                "distance": results["distances"][0][i],
                "chroma_id": results["ids"][0][i],
            })
        return output

    async def delete_document(self, document_id: str) -> None:
        """Remove all chunks for a document from ChromaDB."""
        collection = await self._get_collection()
        await collection.delete(where={"document_id": document_id})

    async def collection_stats(self) -> dict:
        collection = await self._get_collection()
        count = await collection.count()
        return {"collection": self.collection_name, "total_chunks": count}


_rag: Optional[RAGPipeline] = None


def get_rag() -> RAGPipeline:
    global _rag
    if _rag is None:
        _rag = RAGPipeline()
    return _rag
