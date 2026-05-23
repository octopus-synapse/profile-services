# Postgres 16 with both pgvector and pg_uuidv7 extensions.
#
# Base: `pgvector/pgvector:pg16` (already wire-compatible with stock
# postgres:16 — keeps existing volumes valid). On top we build
# `pg_uuidv7` from source (the upstream release artefacts don't
# expose a stable URL pattern across architectures, so cloning
# + `make install` is the simplest cross-arch path).
#
# The image is the same in dev and CI; production uses a managed
# Postgres where the operator enables both extensions through the
# provider's allowlist (see `scripts/check-pg-extensions.ts`).
FROM pgvector/pgvector:pg16

ARG PG_UUIDV7_REF=v1.6.0

USER root

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        ca-certificates git build-essential postgresql-server-dev-16; \
    git clone --depth 1 --branch "${PG_UUIDV7_REF}" https://github.com/fboulnois/pg_uuidv7.git /tmp/pg_uuidv7; \
    cd /tmp/pg_uuidv7; \
    make; \
    make install; \
    cd /; \
    rm -rf /tmp/pg_uuidv7; \
    apt-get purge -y --auto-remove git build-essential postgresql-server-dev-16; \
    rm -rf /var/lib/apt/lists/*

# Init scripts run on first boot of a fresh data volume — bootstraps
# the extensions and the `uuidv7()` alias the migrations call.
COPY infra/docker/postgres/init/ /docker-entrypoint-initdb.d/

USER postgres
