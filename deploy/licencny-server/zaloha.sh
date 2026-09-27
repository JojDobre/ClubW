#!/usr/bin/env bash
# Umiestnenie: deploy/licencny-server/zaloha.sh
# Záloha databázy licencií do priečinka zalohy/ (ponechá posledných 30).
#
#   ./zaloha.sh
#   cron (každú noc o 3:15):  15 3 * * * /cesta/k/deploy/licencny-server/zaloha.sh >/dev/null
#
# Obnova:  docker compose exec -T db pg_restore -U licencie -d licencie --clean < zalohy/licencie-....dump
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p zalohy
subor="zalohy/licencie-$(date +%Y%m%d-%H%M%S).dump"
docker compose exec -T db pg_dump -U licencie -Fc licencie > "$subor"
echo "Záloha: $subor ($(du -h "$subor" | cut -f1))"
ls -1t zalohy/licencie-*.dump | tail -n +31 | xargs -r rm --
