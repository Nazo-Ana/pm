#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
docker compose up --build -d
echo "Project Management is running at http://localhost:8000"
