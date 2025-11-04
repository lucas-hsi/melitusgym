#!/bin/bash

# Melitus Gym Backend - Railway start script
# Binds to $PORT, disables SQLite, and starts uvicorn

set -euo pipefail

echo "🚀 Starting MelitusGym Backend on Railway..."

# Ensure environment
export USE_SQLITE=false
export ENVIRONMENT=production
export LOG_LEVEL=${LOG_LEVEL:-INFO}

# Default TACO path if not provided (prefer lightweight CSV)
if [ -z "${TACO_FILE_PATH:-}" ]; then
  if [ -f ./taco_export.csv ]; then
    export TACO_FILE_PATH=./taco_export.csv
  else
    export TACO_FILE_PATH=./Taco-4a-Edicao.xlsx
  fi
fi

# Optional: seed TACO CSV into PostgreSQL before starting API
# Enable by setting SEED_TACO_CSV=true in Railway environment
if [ "${SEED_TACO_CSV:-false}" = "true" ]; then
  echo "🌱 Seeding TACO CSV into PostgreSQL..."
  if [ -z "${DATABASE_URL:-}" ]; then
    echo "❌ DATABASE_URL not set; skipping TACO seed."
  else
    # Use provided TACO_FILE_PATH; default to taco_export.csv
    CSV_PATH="${TACO_FILE_PATH:-./taco_export.csv}"
    if [ -f "$CSV_PATH" ]; then
      python scripts/ingest_csv_to_cloud.py --csv "$CSV_PATH" --db "$DATABASE_URL" || echo "⚠️ TACO seed failed, continuing."
    else
      echo "⚠️ CSV file not found at '$CSV_PATH'; skipping TACO seed."
    fi
  fi
fi

# Railway provides PORT
PORT=${PORT:-8000}
echo "🔌 Binding uvicorn to 0.0.0.0:${PORT}"

# Start API
python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT}