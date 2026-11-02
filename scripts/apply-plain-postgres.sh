#!/usr/bin/env bash
# Apply migrations and seed to a local Postgres, without the Supabase CLI.
# Usage: scripts/apply-plain-postgres.sh [database_name]
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
db_name="${1:-drop_dev}"

sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${db_name};"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${db_name};"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$db_name" -f "$root/scripts/plain-postgres/00_bootstrap.sql"

for migration in "$root"/supabase/migrations/*.sql; do
  echo "Applying $(basename "$migration")"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$db_name" -f "$migration"
done

echo "Applying seed.sql"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$db_name" -f "$root/supabase/seed.sql"

if sudo -u postgres psql -d "$db_name" -tAc "select 1 from pg_available_extensions where name = 'pgtap'" | grep -q 1; then
  echo "Running pgTAP foundation tests"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$db_name" -f "$root/supabase/tests/01_foundation.sql"
else
  echo "pgTAP is not installed; skipped supabase/tests/01_foundation.sql"
fi

echo "Database ${db_name} is ready."
