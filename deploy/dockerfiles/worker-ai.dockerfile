FROM python:3.14-slim AS production
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
WORKDIR /app

COPY pyproject.toml .
COPY libs/python-shared libs/python-shared/
COPY workers/worker-ai workers/worker-ai/

RUN uv sync
RUN --mount=type=cache,target=/root/.cache/uv \
    uv pip install --system -e ./libs/python-shared && \
    uv pip install --system -e ./workers/worker-ai

WORKDIR /app/workers/worker-ai/src
ENV WORKER_VERSION="1.2.0"
ARG WORKER_RELEASE_DATE="Unreleased"
ENV WORKER_RELEASE_DATE=${WORKER_RELEASE_DATE}

CMD ["python", "worker_runner.py"]