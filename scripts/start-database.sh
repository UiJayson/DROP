#!/usr/bin/env bash
# Start the Supabase Postgres image used for local migrations.
# The password below is for this local database only.
set -euo pipefail

name="${DROP_DB_CONTAINER:-drop-db}"
port="${DROP_DB_PORT:-54322}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed. Install Docker Desktop, start it, and run this again."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker is installed but not running. Start Docker and try again."
  exit 1
fi

if docker ps -a --format '{{.Names}}' | grep -qx "$name"; then
  docker rm -f "$name" >/dev/null
fi

docker run -d --name "$name" \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  -p "${port}:5432" \
  public.ecr.aws/supabase/postgres:17.11.0.011 >/dev/null

echo "Waiting for Postgres on port ${port}..."
for _ in $(seq 1 60); do
  if PGPASSWORD=postgres psql -h 127.0.0.1 -p "$port" -U supabase_admin -d postgres -c 'select 1' >/dev/null 2>&1; then
    echo "Postgres is ready."
    exit 0
  fi
  sleep 1
done

echo "Postgres did not become ready. Check: docker logs ${name}"
exit 1
