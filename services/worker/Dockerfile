# Worker image (doc 03 section 4.3). Build context: services/worker. kicad-cli is deferred (group D3).
FROM python:3.12-slim-bookworm

ARG GIT_SHA=unknown
ENV GIT_SHA=${GIT_SHA} \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH"

# ngspice is a CLI used by verifiers; learner netlists still run only in the sandbox runner.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ngspice \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.11.32 /uv /usr/local/bin/uv

RUN useradd --system --create-home --uid 10001 worker
WORKDIR /app

COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen --no-dev --no-install-project

COPY polymath_worker ./polymath_worker
RUN chown -R worker:worker /app

USER worker
EXPOSE 8080
CMD ["uvicorn", "polymath_worker.main:app", "--host", "0.0.0.0", "--port", "8080"]
