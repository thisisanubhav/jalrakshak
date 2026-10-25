# CPU-only extraction of official Ollama release binaries. GPU libraries are omitted.
FROM debian:bookworm-slim
ARG TARGETARCH
SHELL ["/bin/bash", "-o", "pipefail", "-c"]
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl zstd libgomp1 && rm -rf /var/lib/apt/lists/*
RUN set -eu; \
    case "$TARGETARCH" in \
      amd64) checksum=1e8ad2d2a394efdd235bee74deec237badd95142ffba77588140ab2a9ecec227 ;; \
      arm64) checksum=57dca26f51efc050112b733a65dea6f6c8e68da7a2946afd7c1eb8834d9eeb92 ;; \
      *) exit 1 ;; \
    esac; \
    mkfifo /tmp/archive-hash; \
    sha256sum /tmp/archive-hash > /tmp/archive-digest & hash_pid=$!; \
    curl --connect-timeout 30 --max-time 1800 -fsSL "https://github.com/ollama/ollama/releases/download/v0.40.10/ollama-linux-${TARGETARCH}.tar.zst" | tee /tmp/archive-hash | \
    tar --zstd --ignore-zeros -xf - -C /usr --exclude='lib/ollama/cuda*' --exclude='lib/ollama/rocm*' --exclude='lib/ollama/vulkan*' --exclude='lib/ollama/jetpack*'; \
    wait "$hash_pid"; \
    test "$(cut -d ' ' -f 1 /tmp/archive-digest)" = "$checksum"; \
    rm /tmp/archive-hash /tmp/archive-digest
ENV OLLAMA_HOST=0.0.0.0:11434 OLLAMA_NO_CLOUD=1
ENTRYPOINT ["ollama"]
CMD ["serve"]
