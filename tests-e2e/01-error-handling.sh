#!/bin/bash
# Umiestnenie: /home/claude/test-krok2.sh
# Overenie Kroku 2: error handler, 404 handlery, reálne štatistiky

API="http://localhost:3000"

echo "===== TEST 1: 404 handler pre /api/* (plná cesta) ====="
curl -s -m 5 -w " [HTTP %{http_code}]\n" $API/api/neexistuje/hlbsie

echo ""
echo "===== TEST 2: 404 handler pre ostatné cesty ====="
curl -s -m 5 -w " [HTTP %{http_code}]\n" $API/nejaka-stranka

echo ""
echo "===== TEST 3: Error handler - validačná chyba ====="
echo "(pôvodne: HTTP 500 + dvojitá odpoveď; očakávame: HTTP 400 s popisom polí)"
curl -s -m 5 -w "\n[HTTP %{http_code}]\n" -X POST $API/api/teams \
  -H "Content-Type: application/json" \
  -d '{"nazov":"X","typ":"neplatny_typ","vekova_kategoria":"U13"}'

echo ""
echo "===== TEST 4: Reálne štatistiky z DB ====="
curl -s -m 5 $API/api/stats

echo ""
echo ""
echo "===== TEST 5: Kontrola dvojitej odpovede v logu ====="
if grep -q "ERR_HTTP_HEADERS_SENT" /tmp/backend.log; then
  echo "❌ NÁJDENÉ ERR_HTTP_HEADERS_SENT - handler stále odpovedá dvakrát"
else
  echo "✅ Žiadne ERR_HTTP_HEADERS_SENT - error handler odpovedá len raz"
fi
