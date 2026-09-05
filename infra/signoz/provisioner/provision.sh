#!/bin/sh
set -e

echo "Waiting for SigNoz Query Service to be healthy..."
until wget -q --spider http://signoz-query-service:8080/api/v1/health 2>/dev/null || wget -q --spider http://signoz-query-service:8080/api/v1/version 2>/dev/null; do
  sleep 2
done

echo "SigNoz Query Service is ready. Provisioning dashboards..."
for file in /dashboards/*.json; do
  if [ -f "$file" ]; then
    echo "Importing dashboard: $file"
    wget -q -O- --post-file="$file" --header="Content-Type: application/json" http://signoz-query-service:8080/api/v1/dashboards || true
  fi
done

echo "Provisioning complete."
