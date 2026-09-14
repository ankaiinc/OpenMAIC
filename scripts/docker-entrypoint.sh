#!/bin/sh
set -eu

# Fly volumes are mounted as root. Keep the application process unprivileged
# while allowing it to persist generated classrooms and job receipts.
chown -R nextjs:nodejs /app/data
exec su-exec nextjs "$@"
