#!/bin/bash

# Melitus Gym Backend - Railway start script
# Binds to $PORT, disables SQLite, and starts uvicorn

set -euo pipefail

echo "🚀 Starting MelitusGym Backend on Railway..."

# Ensure environment
export USE_SQLITE=false
export ENVIRONMENT=production
export LOG_LEVEL=${LOG_LEVEL:-INFO}

# Default TACO path if not provided
export TACO_FILE_PATH=${TACO_FILE_PATH:-./Taco-4a-Edicao.xlsx}

# Railway provides PORT
PORT=${PORT:-8000}
echo "🔌 Binding uvicorn to 0.0.0.0:${PORT}"

# Start API
python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT}