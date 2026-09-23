#!/bin/bash
# Umiestnenie: /home/claude/test-krok16.sh
# Overenie Kroku 16: nastavenia klubu (white-label)

API="http://localhost:3000"
JSON="Content-Type: application/json"
PASS=0; FAIL=0

over() {
  if [ "$2" = "$3" ]; then echo "  ✅ $1: $3"; PASS=$((PASS+1));
  else echo "  ❌ $1: očakávané $2, skutočné $3"; FAIL=$((FAIL+1)); fi
}

TOKEN=$(curl -s -m 5 -X POST $API/api/auth/login -H "$JSON" \
  -d '{"email":"test-admin@clubw.sk","heslo":"TestHeslo123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)
[ -z "$TOKEN" ] && { echo "❌ Prihlásenie zlyhalo"; exit 1; }
AUTH="Authorization: Bearer $TOKEN"

echo "═══ TEST 1: Verejné nastavenia bez prihlásenia ═══"
ODP=$(curl -s -m 5 $API/api/settings)
over "Endpoint dostupný verejne" "True" \
  "$(echo "$ODP" | python3 -c "import sys,json; print(json.load(sys.stdin)['success'])" 2>/dev/null)"
over "Predvolená primárna farba" "#1B5E20" \
  "$(echo "$ODP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['farby']['primarna'])" 2>/dev/null)"
over "Prevádzkové údaje NIE sú vo verejnej odpovedi" "True" \
  "$(echo "$ODP" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print('ico' not in d and 'id' not in d and 'updated_at' not in d)" 2>/dev/null)"
# Meracie ID Google Analytics web potrebuje, aby po súhlase načítal meranie
# (v kóde stránky je viditeľné tak či tak)
over "Meracie ID Analytics je verejné" "True" \
  "$(echo "$ODP" | python3 -c "import sys,json; print('google_analytics_id' in json.load(sys.stdin)['data'])" 2>/dev/null)"

echo ""
echo "═══ TEST 2: CSS s farbami klubu ═══"
CSS=$(curl -s -m 5 $API/api/settings.css)
TYP=$(curl -s -o /dev/null -w "%{content_type}" -m 5 $API/api/settings.css)
over "Content-Type je CSS" "True" "$(echo "$TYP" | grep -q 'text/css' && echo True || echo False)"
over "Obsahuje --club-primary" "True" "$(echo "$CSS" | grep -q -- '--club-primary:' && echo True || echo False)"
over "Obsahuje odvodené odtiene (color-mix)" "True" "$(echo "$CSS" | grep -q 'color-mix' && echo True || echo False)"

echo ""
echo "═══ TEST 3: Admin nastavenia vyžadujú prihlásenie ═══"
over "Bez tokenu odmietnuté" "401" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 $API/api/admin/settings)"
over "S admin tokenom dostupné" "200" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 -H "$AUTH" $API/api/admin/settings)"
over "Úprava bez tokenu odmietnutá" "401" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
  -X PUT $API/api/admin/settings -H "$JSON" -d '{"nazov":"Hacker FC"}')"

echo ""
echo "═══ TEST 4: Prebrandovanie klubu ═══"
KOD=$(curl -s -o /tmp/nast.json -w "%{http_code}" -m 5 -X PUT $API/api/admin/settings -H "$JSON" -H "$AUTH" -d '{
  "nazov":"FC Slovan Dolina",
  "skratka":"SD",
  "slogan":"Srdcom pre futbal",
  "rok_zalozenia":1932,
  "farba_primarna":"#1B5E20",
  "farba_akcent":"#FFC107",
  "email":"info@slovandolina.sk",
  "facebook_url":"https://facebook.com/slovandolina"
}')
over "Uloženie nastavení" "200" "$KOD"

ODP=$(curl -s -m 5 $API/api/settings)
over "Názov klubu" "FC Slovan Dolina" \
  "$(echo "$ODP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['nazov'])" 2>/dev/null)"
over "Slogan" "Srdcom pre futbal" \
  "$(echo "$ODP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['slogan'])" 2>/dev/null)"
over "Rok založenia" "1932" \
  "$(echo "$ODP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['rok_zalozenia'])" 2>/dev/null)"

echo ""
echo "═══ TEST 5: Zmena farieb sa prejaví v CSS ═══"
curl -s -m 5 -X PUT $API/api/admin/settings -H "$JSON" -H "$AUTH" \
  -d '{"farba_primarna":"#C62828","farba_akcent":"#FFD54F"}' > /dev/null
CSS=$(curl -s -m 5 $API/api/settings.css)
over "Nová primárna farba v CSS" "True" "$(echo "$CSS" | grep -q '#C62828' && echo True || echo False)"
echo "     (jedna zmena prefarbí celý web — odtiene odvodí color-mix)"

echo ""
echo "═══ TEST 6: Validácia ═══"
over "Neplatný formát farby odmietnutý" "400" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
  -X PUT $API/api/admin/settings -H "$JSON" -H "$AUTH" -d '{"farba_primarna":"zelena"}')"
over "Neplatný e-mail odmietnutý" "400" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
  -X PUT $API/api/admin/settings -H "$JSON" -H "$AUTH" -d '{"email":"toto-nie-je-email"}')"
over "Prázdny povinný názov odmietnutý" "400" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
  -X PUT $API/api/admin/settings -H "$JSON" -H "$AUTH" -d '{"nazov":""}')"
over "Neplatný rok založenia odmietnutý" "400" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
  -X PUT $API/api/admin/settings -H "$JSON" -H "$AUTH" -d '{"rok_zalozenia":1700}')"

echo ""
echo "═══ TEST 7: HTML v názve sa odstráni ═══"
curl -s -m 5 -X PUT $API/api/admin/settings -H "$JSON" -H "$AUTH" \
  -d '{"nazov":"FC <script>alert(1)</script>Test"}' > /dev/null
NAZOV=$(curl -s -m 5 $API/api/settings | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['nazov'])" 2>/dev/null)
over "Skript odstránený z názvu" "True" "$(echo "$NAZOV" | grep -qv '<script' && echo True || echo False)"
echo "     Uložený názov: $NAZOV"

# Návrat na pôvodné hodnoty
curl -s -m 5 -X PUT $API/api/admin/settings -H "$JSON" -H "$AUTH" -d '{
  "nazov":"FC Slovan Dolina","farba_primarna":"#1B5E20","farba_akcent":"#FFC107"
}' > /dev/null

echo ""
echo "═══ TEST 8: Nemenné polia sa nedajú prepísať ═══"
PRED=$(curl -s -m 5 -H "$AUTH" $API/api/admin/settings | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
curl -s -m 5 -X PUT $API/api/admin/settings -H "$JSON" -H "$AUTH" \
  -d '{"id":999,"nazov":"FC Slovan Dolina"}' > /dev/null
PO=$(curl -s -m 5 -H "$AUTH" $API/api/admin/settings | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
over "ID sa nedá zmeniť cez telo požiadavky" "True" "$([ "$PRED" = "$PO" ] && echo True || echo False)"

echo ""
echo "═══════════════════════════════════════"
echo "  VÝSLEDOK: $PASS prešlo, $FAIL zlyhalo"
echo "═══════════════════════════════════════"
