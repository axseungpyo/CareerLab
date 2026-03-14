#!/bin/bash
# scripts/dev.sh — 프론트+백 동시 실행
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Starting CareerLab..."

# 백엔드
cd "$PROJECT_DIR/backend"
uv run uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# 프론트엔드
cd "$PROJECT_DIR/frontend"
pnpm dev &
FRONTEND_PID=$!

echo ""
echo "Backend:  http://localhost:8000"
echo "Swagger:  http://localhost:8000/docs"
echo "Frontend: http://localhost:3000"
echo ""
echo "종료: Ctrl+C"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
