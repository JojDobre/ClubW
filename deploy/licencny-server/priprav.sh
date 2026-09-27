#!/usr/bin/env bash
# Umiestnenie: deploy/licencny-server/priprav.sh
# Jednorazová príprava .env: doména, heslo databázy a pár podpisových kľúčov.
#
#   ./priprav.sh licencie.vasadomena.sk vas@email.sk [github_token]
set -euo pipefail
cd "$(dirname "$0")"

DOMENA="${1:-}"
EMAIL="${2:-}"
TOKEN="${3:-}"
if [ -z "$DOMENA" ] || [ -z "$EMAIL" ]; then
  echo "Použitie: ./priprav.sh <doména> <e-mail> [github_token]"
  echo "Príklad:  ./priprav.sh licencie.vasadomena.sk jozef@vasadomena.sk"
  exit 1
fi
if [ -f .env ]; then
  echo "Súbor .env už existuje - nič neprepisujem."
  echo "Kľúče nemeňte: s novým kľúčom by všetky weby prestali licenčnému serveru veriť."
  exit 1
fi
command -v openssl >/dev/null || { echo "Chýba openssl (apt install openssl)"; exit 1; }

# PEM na jeden riadok s \n - tak ho čítajú licenčný server aj CMS
jedenRiadok() { awk 'NF { printf "%s\\n", $0 }' | sed 's/\\n$//'; }

docasny=$(mktemp -d)
trap 'rm -rf "$docasny"' EXIT
openssl genpkey -algorithm ed25519 -out "$docasny/sukromny.pem" 2>/dev/null
openssl pkey -in "$docasny/sukromny.pem" -pubout -out "$docasny/verejny.pem"
SUKROMNY=$(jedenRiadok < "$docasny/sukromny.pem")
VEREJNY=$(jedenRiadok < "$docasny/verejny.pem")

umask 077
cat > .env <<KONIEC
DOMENA=$DOMENA
ACME_EMAIL=$EMAIL
DB_PASSWORD=$(openssl rand -hex 24)
LICENSE_PRIVATE_KEY="$SUKROMNY"
LICENSE_PUBLIC_KEY="$VEREJNY"
GITHUB_TOKEN=$TOKEN
KONIEC

echo "✅ Vytvorený .env pre https://$DOMENA"
echo
echo "Verejný kľúč (patrí do backend/.env každého webu ako LICENSE_PUBLIC_KEY):"
echo "LICENSE_PUBLIC_KEY=\"$VEREJNY\""
echo
echo "⚠️  Súbor .env zálohujte na bezpečné miesto. Bez súkromného kľúča"
echo "   by bolo treba všetkým webom vymeniť verejný kľúč."
echo
echo "Ďalej: docker compose up -d --build"
