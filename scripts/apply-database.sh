#!/usr/bin/env bash
# Apply migrations, sample data, and the database tests.
# Point this at a running Postgres. Defaults match scripts/start-database.sh.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"

export PGHOST="${PGHOST:-127.0.0.1}"
export PGPORT="${PGPORT:-54322}"
export PGUSER="${PGUSER:-supabase_admin}"
export PGDATABASE="${PGDATABASE:-postgres}"
export PGPASSWORD="${PGPASSWORD:-postgres}"

echo "Applying to ${PGUSER}@${PGHOST}:${PGPORT}/${PGDATABASE}"

for migration in "$root"/supabase/migrations/*.sql; do
  echo "Applying $(basename "$migration")"
  psql -v ON_ERROR_STOP=1 -f "$migration"
done

echo "Applying seed.sql"
psql -v ON_ERROR_STOP=1 -f "$root/supabase/seed.sql"

echo "Running database tests"
psql -v ON_ERROR_STOP=1 -f "$root/supabase/tests/01_foundation.sql"

echo "Database checks passed."
