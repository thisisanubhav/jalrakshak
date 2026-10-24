FROM python:3.12-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 HF_HUB_DISABLE_TELEMETRY=1
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir faster-whisper==1.2.1
RUN useradd --uid 10001 --create-home speech && install -d -o speech -g speech /models /app
COPY --chown=speech:speech scripts/local-speech.py /app/local-speech.py
USER speech
WORKDIR /app
CMD ["python", "local-speech.py"]
