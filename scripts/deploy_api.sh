#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <image>"
  exit 1
fi

IMAGE="$1"
APP_DIR="/home/ubuntu/netmedika-api"
ENV_FILE="${APP_DIR}/.env"
CONTAINER_NAME="netmedika-api"

required_vars=(
  DATABASE_URL
  SECRET_KEY
  ACCESS_TOKEN_EXPIRE_MINUTES
  REFRESH_TOKEN_EXPIRE_DAYS
  DOCKERHUB_USERNAME
  DOCKERHUB_TOKEN
)

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "Missing required environment variable: ${var_name}"
    exit 1
  fi
done

mkdir -p "${APP_DIR}"

cat >"${ENV_FILE}" <<EOF
DATABASE_URL=${DATABASE_URL}
SECRET_KEY=${SECRET_KEY}
ACCESS_TOKEN_EXPIRE_MINUTES=${ACCESS_TOKEN_EXPIRE_MINUTES}
REFRESH_TOKEN_EXPIRE_DAYS=${REFRESH_TOKEN_EXPIRE_DAYS}
EOF

chmod 600 "${ENV_FILE}"

echo "${DOCKERHUB_TOKEN}" | docker login -u "${DOCKERHUB_USERNAME}" --password-stdin
docker pull "${IMAGE}"

# Run schema migrations from the EC2 host, which has network access to RDS.
docker run --rm \
  --env-file "${ENV_FILE}" \
  "${IMAGE}" \
  alembic upgrade head

if docker ps -a --format '{{.Names}}' | grep -Fxq "${CONTAINER_NAME}"; then
  docker rm -f "${CONTAINER_NAME}"
fi

docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  --env-file "${ENV_FILE}" \
  -p 80:8000 \
  "${IMAGE}"

for _ in {1..12}; do
  if curl --fail --silent http://127.0.0.1/health >/dev/null; then
    echo "Deployment succeeded"
    exit 0
  fi

  sleep 5
done

echo "Deployment health check failed"
docker logs "${CONTAINER_NAME}" || true
exit 1
