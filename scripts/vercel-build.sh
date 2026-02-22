#!/usr/bin/env sh
set -eu

echo "[build] Prisma generate"
npx prisma generate

VERCEL_ENV_VALUE="${VERCEL_ENV:-production}"
if [ "$VERCEL_ENV_VALUE" = "production" ]; then
  echo "[build] Production deploy detected. Running Prisma migrate deploy with retry..."

  attempt=1
  max_attempts=6
  while [ "$attempt" -le "$max_attempts" ]; do
    if npx prisma migrate deploy; then
      echo "[build] Prisma migrate deploy succeeded on attempt $attempt"
      break
    fi

    if [ "$attempt" -eq "$max_attempts" ]; then
      echo "[build] Prisma migrate deploy failed after $max_attempts attempts"
      exit 1
    fi

    wait_seconds=$((attempt * 12))
    echo "[build] Prisma migrate deploy failed (attempt $attempt/$max_attempts). Retrying in ${wait_seconds}s..."
    sleep "$wait_seconds"
    attempt=$((attempt + 1))
  done
else
  echo "[build] Non-production deploy ($VERCEL_ENV_VALUE). Skipping Prisma migrate deploy."
fi

echo "[build] Next.js build"
next build
