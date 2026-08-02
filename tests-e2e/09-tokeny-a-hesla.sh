#!/bin/bash
# Umiestnenie: /home/claude/test-krok15.sh
# Overenie Kroku 15: obnovovacie tokeny, obnova hesla, sila hesla

API="http://localhost:3000"
JSON="Content-Type: application/json"
R=$RANDOM
PASS=0; FAIL=0

over() {
  if [ "$2" = "$3" ]; then echo "  ✅ $1: $3"; PASS=$((PASS+1));
  else echo "  ❌ $1: očakávané $2, skutočné $3"; FAIL=$((FAIL+1)); fi
}

# ===== Prihlásenie admina =====
ODP=$(curl -s -m 5 -X POST $API/api/auth/login -H "$JSON" \
  -d '{"email":"test-admin@clubw.sk","heslo":"TestHeslo123"}')
TOKEN=$(echo "$ODP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)
REFRESH=$(echo "$ODP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('refreshToken',''))" 2>/dev/null)
[ -z "$TOKEN" ] && { echo "❌ Prihlásenie zlyhalo: $(echo $ODP | head -c 200)"; exit 1; }

echo "═══ TEST 1: Prihlásenie vydáva obnovovací token ═══"
over "Prístupový token vydaný" "True" "$([ -n "$TOKEN" ] && echo True || echo False)"
over "Obnovovací token vydaný" "True" "$([ -n "$REFRESH" ] && echo True || echo False)"
echo "     Obnovovací token má $(echo -n "$REFRESH" | wc -c) znakov"

echo ""
echo "═══ TEST 2: Obnova tokenu BEZ prihlasovacieho tokenu ═══"
echo "(pôvodne sa dal obnoviť len ešte platný token — nezmyselné)"
ODP2=$(curl -s -m 5 -X POST $API/api/auth/refresh -H "$JSON" \
  -d "{\"refreshToken\":\"$REFRESH\"}")
NOVY_TOKEN=$(echo "$ODP2" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)
NOVY_REFRESH=$(echo "$ODP2" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['refreshToken'])" 2>/dev/null)
over "Nový prístupový token vydaný" "True" "$([ -n "$NOVY_TOKEN" ] && echo True || echo False)"
over "Obnovovací token bol vymenený (rotácia)" "True" "$([ "$NOVY_REFRESH" != "$REFRESH" ] && echo True || echo False)"

echo ""
echo "═══ TEST 3: Odcudzený token — opakované použitie ═══"
ODP3=$(curl -s -m 5 -X POST $API/api/auth/refresh -H "$JSON" \
  -d "{\"refreshToken\":\"$REFRESH\"}")
over "Starý token po rotácii neplatí" "False" \
  "$(echo "$ODP3" | python3 -c "import sys,json; print(json.load(sys.stdin)['success'])" 2>/dev/null)"

# Po odhalení zneužitia musia byť zrušené VŠETKY tokeny používateľa
ODP4=$(curl -s -m 5 -X POST $API/api/auth/refresh -H "$JSON" \
  -d "{\"refreshToken\":\"$NOVY_REFRESH\"}")
over "Aj nový token zrušený (ochrana pri zneužití)" "False" \
  "$(echo "$ODP4" | python3 -c "import sys,json; print(json.load(sys.stdin)['success'])" 2>/dev/null)"

echo ""
echo "═══ TEST 4: Sila hesla pri vytváraní používateľa ═══"
# Znova sa prihlásime — predchádzajúci test zrušil relácie
TOKEN=$(curl -s -m 5 -X POST $API/api/auth/login -H "$JSON" \
  -d '{"email":"test-admin@clubw.sk","heslo":"TestHeslo123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)
AUTH="Authorization: Bearer $TOKEN"

skus_heslo() {
  curl -s -o /dev/null -w "%{http_code}" -m 5 -X POST $API/api/users -H "$JSON" -H "$AUTH" \
    -d "{\"meno\":\"Test Pouzivatel\",\"email\":\"test$2$R@clubw.sk\",\"heslo\":\"$1\",\"rola\":\"redaktor\"}"
}

over "Heslo '123456' odmietnuté" "400" "$(skus_heslo '123456' a)"
over "Heslo 'heslo123' odmietnuté (bežné slovo)" "400" "$(skus_heslo 'heslo123' b)"
over "Heslo 'abcdefghij' odmietnuté (postupnosť)" "400" "$(skus_heslo 'abcdefghij' c)"
over "Krátke 'Kratke1!' odmietnuté" "400" "$(skus_heslo 'Kratke1!' d)"
over "Dlhá fráza prijatá" "201" "$(skus_heslo 'zelena lucna kosacka pri potoku' e)"
over "Silné heslo prijaté" "201" "$(skus_heslo 'Vrchol-2026-Klub' f)"

echo ""
echo "═══ TEST 5: Obnova zabudnutého hesla ═══"
# Neexistujúci e-mail musí odpovedať rovnako ako existujúci
ODP_NEEX=$(curl -s -m 5 -X POST $API/api/auth/zabudnute-heslo -H "$JSON" \
  -d '{"email":"neexistuje-vobec@clubw.sk"}')
ODP_EX=$(curl -s -m 5 -X POST $API/api/auth/zabudnute-heslo -H "$JSON" \
  -d '{"email":"test-admin@clubw.sk"}')
SPRAVA_NEEX=$(echo "$ODP_NEEX" | python3 -c "import sys,json; print(json.load(sys.stdin)['message'])" 2>/dev/null)
SPRAVA_EX=$(echo "$ODP_EX" | python3 -c "import sys,json; print(json.load(sys.stdin)['message'])" 2>/dev/null)
over "Rovnaká odpoveď pre existujúci aj neexistujúci e-mail" "True" \
  "$([ "$SPRAVA_NEEX" = "$SPRAVA_EX" ] && echo True || echo False)"
echo "     (inak by sa dali zisťovať registrované adresy)"

# Token vytiahneme z logu (vývojový režim vypisuje obsah e-mailu)
RESET_TOKEN=$(grep -o 'obnova-hesla?token=[A-Za-z0-9_-]*' /tmp/backend.log | tail -1 | cut -d= -f2)
over "Odkaz na obnovu vygenerovaný" "True" "$([ -n "$RESET_TOKEN" ] && echo True || echo False)"

echo ""
echo "═══ TEST 6: Použitie tokenu na obnovu ═══"
over "Slabé nové heslo odmietnuté" "400" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
  -X POST $API/api/auth/obnova-hesla -H "$JSON" \
  -d "{\"token\":\"$RESET_TOKEN\",\"heslo\":\"123456\"}")"

over "Neplatný token odmietnutý" "400" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
  -X POST $API/api/auth/obnova-hesla -H "$JSON" \
  -d '{"token":"vymysleny-token","heslo":"Zelena-Lucna-Kosacka-2026"}')"

over "Platný token + silné heslo" "200" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
  -X POST $API/api/auth/obnova-hesla -H "$JSON" \
  -d "{\"token\":\"$RESET_TOKEN\",\"heslo\":\"Zelena-Lucna-Kosacka-2026\"}")"

over "Token je jednorazový" "400" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
  -X POST $API/api/auth/obnova-hesla -H "$JSON" \
  -d "{\"token\":\"$RESET_TOKEN\",\"heslo\":\"Modra-Obloha-Nad-Tatrami\"}")"

echo ""
echo "═══ TEST 7: Prihlásenie novým heslom ═══"
over "Staré heslo už neplatí" "401" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
  -X POST $API/api/auth/login -H "$JSON" \
  -d '{"email":"test-admin@clubw.sk","heslo":"TestHeslo123"}')"
over "Nové heslo funguje" "200" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
  -X POST $API/api/auth/login -H "$JSON" \
  -d '{"email":"test-admin@clubw.sk","heslo":"Zelena-Lucna-Kosacka-2026"}')"

echo ""
echo "═══ TEST 8: Odhlásenie zruší obnovovací token ═══"
ODP5=$(curl -s -m 5 -X POST $API/api/auth/login -H "$JSON" \
  -d '{"email":"test-admin@clubw.sk","heslo":"Zelena-Lucna-Kosacka-2026"}')
REF5=$(echo "$ODP5" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['refreshToken'])" 2>/dev/null)
curl -s -m 5 -X POST $API/api/auth/logout -H "$JSON" -d "{\"refreshToken\":\"$REF5\"}" > /dev/null
over "Po odhlásení sa token nedá obnoviť" "False" \
  "$(curl -s -m 5 -X POST $API/api/auth/refresh -H "$JSON" -d "{\"refreshToken\":\"$REF5\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['success'])" 2>/dev/null)"

echo ""
echo "═══════════════════════════════════════"
echo "  VÝSLEDOK: $PASS prešlo, $FAIL zlyhalo"
echo "═══════════════════════════════════════"
