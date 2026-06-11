#!/bin/sh
set -eu

admin_username="${ADMIN_USER:-admin}"
admin_password_hash="${ADMIN_PASSWORD_HASH:-}"
enable_dev_admin_bootstrap="${ENABLE_DEV_ADMIN_BOOTSTRAP:-false}"
default_mirror_domain="${DEFAULT_MIRROR_DOMAIN:-}"
dev_password_hash='$2a$10$nUTthNgz8t59pRYyncjPwe0knC5c9xmrMuCnu489lrKaJ0F1wV0/q'

if [ -z "$admin_password_hash" ] && [ "$enable_dev_admin_bootstrap" = "true" ]; then
  admin_password_hash="$dev_password_hash"
fi

if [ -n "$admin_password_hash" ]; then
  psql -v ON_ERROR_STOP=1 \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    --set admin_username="$admin_username" \
    --set admin_password_hash="$admin_password_hash" <<'SQL'
INSERT INTO admin_users (username, password_hash, role)
VALUES (:'admin_username', :'admin_password_hash', 'admin')
ON CONFLICT (username) DO NOTHING;
SQL
fi

if [ -n "$default_mirror_domain" ]; then
  psql -v ON_ERROR_STOP=1 \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    --set default_mirror_domain="$default_mirror_domain" <<'SQL'
INSERT INTO mirrors (domain, is_active, is_primary, region)
VALUES (:'default_mirror_domain', true, true, 'global')
ON CONFLICT (domain) DO NOTHING;
SQL
fi
