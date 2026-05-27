FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

ARG DEV=false
COPY pyproject.toml .
RUN if [ "$DEV" = "true" ]; then \
      uv sync --no-install-project; \
    else \
      uv sync --no-dev --no-install-project; \
    fi

ENV PATH="/app/.venv/bin:$PATH"

RUN playwright install chrome --with-deps

COPY . .

RUN chmod +x docker/entrypoint.sh

EXPOSE 8000
CMD ["./docker/entrypoint.sh"]
