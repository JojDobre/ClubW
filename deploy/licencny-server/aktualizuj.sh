#!/usr/bin/env bash
# Umiestnenie: deploy/licencny-server/aktualizuj.sh
# Aktualizácia samotného licenčného servera na najnovší kód z gitu.
# Pred aktualizáciou sa zálohuje databáza, migrácie sa spustia pri štarte.
set -euo pipefail
cd "$(dirname "$0")"
./zaloha.sh
git pull --ff-only
docker compose up -d --build
docker image prune -f >/dev/null
docker compose ps
