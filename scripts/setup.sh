#!/bin/bash
# scripts/setup.sh — CareerLab 초기 환경 세팅
set -e

echo "=== CareerLab 환경 세팅 ==="

# 1. 사전 체크
echo ""
echo "[1/6] 필수 도구 확인..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js 20+ 필요. https://nodejs.org"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3.11+ 필요."; exit 1; }

NODE_VER=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_VER" -lt 20 ]; then
  echo "❌ Node.js 20+ 필요 (현재: $(node -v))"
  exit 1
fi

echo "  Node.js: $(node -v)"
echo "  Python: $(python3 --version)"

# 2. pnpm 설치 (없으면)
echo ""
echo "[2/6] pnpm 확인..."
if ! command -v pnpm >/dev/null 2>&1; then
  echo "  pnpm 설치 중..."
  corepack enable
  corepack prepare pnpm@latest --activate
fi
echo "  pnpm: $(pnpm --version)"

# 3. uv 설치 (없으면)
echo ""
echo "[3/6] uv 확인..."
if ! command -v uv >/dev/null 2>&1; then
  echo "  uv 설치 중..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$PATH"
fi
echo "  uv: $(uv --version)"

# 4. Frontend 패키지 설치
echo ""
echo "[4/6] Frontend 패키지 설치..."
cd frontend
pnpm install
cd ..

# 5. Backend 패키지 설치
echo ""
echo "[5/6] Backend 패키지 설치..."
cd backend
uv venv
uv pip install -r requirements.txt
cd ..

# 6. 환경변수 파일 확인
echo ""
echo "[6/6] 환경변수 파일 확인..."
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "  ⚠️  backend/.env 생성됨 — API 키를 입력해주세요"
fi
if [ ! -f frontend/.env.local ]; then
  cp frontend/.env.example frontend/.env.local
  echo "  ⚠️  frontend/.env.local 생성됨 — Supabase 정보를 입력해주세요"
fi

echo ""
echo "=== 세팅 완료! ==="
echo "실행: ./scripts/dev.sh"
