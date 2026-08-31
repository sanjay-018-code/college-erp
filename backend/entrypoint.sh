#!/bin/bash
set -e

echo "Waiting for database..."
while ! python -c "
import socket, os
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(1)
try:
    s.connect((os.environ.get('POSTGRES_HOST', 'db'), int(os.environ.get('POSTGRES_PORT', 5432))))
    s.close()
except Exception:
    exit(1)
"; do
  sleep 1
done
echo "Database is up."

python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Only seed demo data if explicitly requested (avoid polluting real prod DB by accident)
if [ "$SEED_DEMO_DATA" = "true" ]; then
    python manage.py seed_demo_data
fi

exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 60
