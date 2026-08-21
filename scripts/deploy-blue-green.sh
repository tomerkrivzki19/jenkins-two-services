#!/bin/sh
set -e

echo "=== BLUE/GREEN DEPLOYMENT ==="

# Find which color is currently receiving traffic
if docker exec jenkins-gateway cat /etc/nginx/conf.d/default.conf | grep -q "web-blue"; then
    CURRENT="blue"
    TARGET="green"
else
    CURRENT="green"
    TARGET="blue"
fi

echo "Current deployment: $CURRENT"
echo "New deployment:     $TARGET"

TARGET_NETWORK="${TARGET}-network"

# Remove an old failed target deployment if one exists
docker rm -f "api-${TARGET}" "web-${TARGET}" 2>/dev/null || true
docker network rm "$TARGET_NETWORK" 2>/dev/null || true

# Create isolated network for the new version
docker network create "$TARGET_NETWORK"

echo "Starting API ${TARGET}..."

docker run -d \
  --name "api-${TARGET}" \
  --network "$TARGET_NETWORK" \
  --network-alias api \
#   -e FORCE_HEALTH_FAIL=true \
  "jenkins-api:${BUILD_NUMBER}"

echo "Building WEB ${TARGET}..."

docker build \
  --build-arg DEPLOYMENT_SLOT="$TARGET" \
  -t "jenkins-web:${BUILD_NUMBER}-${TARGET}" \
  ./web

echo "Starting WEB ${TARGET}..."

docker run -d \
  --name "web-${TARGET}" \
  --network "$TARGET_NETWORK" \
  "jenkins-web:${BUILD_NUMBER}-${TARGET}"

# Gateway must also be able to reach the new WEB container
docker network connect gateway-network "web-${TARGET}"

echo "Waiting for new version..."
sleep 5

echo "Health-checking ${TARGET}..."

if ! docker exec "web-${TARGET}" \
    wget -qO- http://127.0.0.1/api/health | grep -q '"status":"ok"'
then
    echo "Health check FAILED."

    docker rm -f "web-${TARGET}" "api-${TARGET}" || true
    docker network rm "$TARGET_NETWORK" || true

    echo "$CURRENT remains live."
    exit 1
fi

echo "Health check passed."

# Save current gateway config in case switching fails
docker exec jenkins-gateway \
  cat /etc/nginx/conf.d/default.conf > gateway-backup.conf

# Create new gateway configuration
cat > gateway-next.conf <<EOF
server {
    listen 80;

    location / {
        proxy_pass http://web-${TARGET}:80;
    }
}
EOF

echo "Switching traffic to ${TARGET}..."

docker cp gateway-next.conf \
  jenkins-gateway:/etc/nginx/conf.d/default.conf

# Verify nginx config before reload
if ! docker exec jenkins-gateway nginx -t
then
    echo "Gateway configuration invalid. Rolling back."

    docker cp gateway-backup.conf \
      jenkins-gateway:/etc/nginx/conf.d/default.conf

    docker rm -f "web-${TARGET}" "api-${TARGET}" || true
    docker network rm "$TARGET_NETWORK" || true

    exit 1
fi

# Graceful nginx reload — gateway stays alive
docker exec jenkins-gateway nginx -s reload

sleep 2

echo "Checking switched production traffic..."

if ! docker exec jenkins-gateway \
    wget -qO- http://127.0.0.1/api/health | grep -q '"status":"ok"'
then
    echo "Production verification failed. Rolling back to ${CURRENT}."

    docker cp gateway-backup.conf \
      jenkins-gateway:/etc/nginx/conf.d/default.conf

    docker exec jenkins-gateway nginx -s reload

    docker rm -f "web-${TARGET}" "api-${TARGET}" || true
    docker network rm "$TARGET_NETWORK" || true

    exit 1
fi

echo "Traffic successfully switched to ${TARGET}."

# Only NOW remove the previous version
docker rm -f "web-${CURRENT}" "api-${CURRENT}" 2>/dev/null || true
docker network rm "${CURRENT}-network" 2>/dev/null || true

rm -f gateway-next.conf gateway-backup.conf

echo "Deployment completed successfully."
echo "ACTIVE SLOT: ${TARGET}"




# THE EXPLANATION TO THIS FILE :
# BLUE currently live
#        ↓
# start GREEN alongside BLUE
#        ↓
# health check GREEN
#        ↓
#      PASS?
#      /   \
#    YES    NO
#     ↓      ↓
# reload    delete GREEN
# gateway   keep BLUE
#     ↓
# GREEN receives traffic
#     ↓
# verify fixed URL
#     ↓
# remove BLUE