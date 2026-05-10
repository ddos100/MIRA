#!/bin/sh
# Pull all default Conductor models at startup.
# Models are stored in the ollama_models Docker volume so they persist across restarts.

set -e

MODELS="nomic-embed-text llama3:8b mistral:7b codellama:7b"

for model in $MODELS; do
    echo "[ollama] Checking model: $model"
    if ollama list | grep -q "^${model}"; then
        echo "[ollama] Already present: $model"
    else
        echo "[ollama] Pulling: $model"
        ollama pull "$model"
        echo "[ollama] Done: $model"
    fi
done

echo "[ollama] All models ready."
