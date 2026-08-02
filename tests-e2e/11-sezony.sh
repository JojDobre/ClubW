#!/bin/bash
# Umiestnenie: /home/claude/test-krok17.sh
# Overenie Kroku 17: sezóny ako entita a súpisky po sezónach

API="http://localhost:3000"
JSON="Content-Type: application/json"
R=$RANDOM
# Jedinečné názvy sezón pre každý beh - inak by druhý beh narazil na duplicitu
ROK=$((2050 + RANDOM % 40))
SEZ_NAZOV="$ROK/$((ROK+1))"
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

echo "═══ TEST 1: Aktuálna sezóna existuje po migrácii ═══"
AKT=$(curl -s -m 5 $API/api/seasons/current)
SEZ_AKT=$(echo "$AKT" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['nazov'])" 2>/dev/null)
over "Aktuálna sezóna je nastavená" "True" "$([ -n "$SEZ_AKT" ] && echo True || echo False)"
echo "     Aktuálna sezóna: $SEZ_AKT"

echo ""
echo "═══ TEST 2: Vytvorenie novej sezóny ═══"
NOVA=$(curl -s -m 5 -X POST $API/api/admin/seasons -H "$JSON" -H "$AUTH" \
  -d "{\"nazov\":\"$SEZ_NAZOV\",\"zaciatok\":\"2099-07-01\",\"koniec\":\"2100-06-30\"}")
SEZ_ID=$(echo "$NOVA" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
over "Sezóna vytvorená" "True" "$([ -n "$SEZ_ID" ] && echo True || echo False)"

over "Duplicitná sezóna odmietnutá" "409" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
  -X POST $API/api/admin/seasons -H "$JSON" -H "$AUTH" -d "{\"nazov\":\"$SEZ_NAZOV\"}")"

over "Koniec pred začiatkom odmietnutý" "400" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
  -X POST $API/api/admin/seasons -H "$JSON" -H "$AUTH" \
  -d "{\"nazov\":\"$((ROK-1))/$ROK\",\"zaciatok\":\"2099-07-01\",\"koniec\":\"2098-01-01\"}")"

over "Bez tokenu odmietnuté" "401" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
  -X POST $API/api/admin/seasons -H "$JSON" -d "{\"nazov\":\"$((ROK-2))/$((ROK-1))\"}")"

echo ""
echo "═══ TEST 3: Len jedna sezóna môže byť aktuálna ═══"
curl -s -m 5 -X POST $API/api/admin/seasons/$SEZ_ID/set-current -H "$AUTH" > /dev/null
POCET_AKT=$(curl -s -m 5 $API/api/seasons | python3 -c "
import sys,json
print(sum(1 for s in json.load(sys.stdin)['data'] if s['aktualna']))" 2>/dev/null)
over "Počet aktuálnych sezón" "1" "$POCET_AKT"
NOVA_AKT=$(curl -s -m 5 $API/api/seasons/current | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['nazov'])" 2>/dev/null)
over "Nová aktuálna sezóna" "$SEZ_NAZOV" "$NOVA_AKT"

echo ""
echo "═══ TEST 4: Súpiska a história hráča ═══"
TIM=$(curl -s -m 5 -X POST $API/api/teams -H "$JSON" -H "$AUTH" \
  -d "{\"nazov\":\"Sezona Tim $R\",\"typ\":\"muzi\",\"vekova_kategoria\":\"seniori\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
TIM2=$(curl -s -m 5 -X POST $API/api/teams -H "$JSON" -H "$AUTH" \
  -d "{\"nazov\":\"Sezona Dorast $R\",\"typ\":\"mladez\",\"vekova_kategoria\":\"U19\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
HRAC=$(curl -s -m 5 -X POST $API/api/players -H "$JSON" -H "$AUTH" \
  -d "{\"meno\":\"Jozef\",\"priezvisko\":\"Sezonny $R\",\"tim_id\":$TIM2,\"pozicia\":\"utocnik\",\"cislo_dresu\":11,\"datum_narodenia\":\"2006-04-12\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
echo "     Tímy: $TIM (seniori), $TIM2 (U19) · hráč: $HRAC"

# Stará sezóna - hráč v doraste
STARA_ID=$(curl -s -m 5 $API/api/seasons | python3 -c "
import sys,json
s=[x for x in json.load(sys.stdin)['data'] if x['nazov']!='$SEZ_NAZOV']
print(s[0]['id'] if s else '')" 2>/dev/null)

over "Zápis do starej sezóny (dorast)" "201" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
  -X POST $API/api/admin/rosters -H "$JSON" -H "$AUTH" \
  -d "{\"sezona_id\":$STARA_ID,\"tim_id\":$TIM2,\"hrac_id\":$HRAC,\"cislo_dresu\":11}")"

over "Zápis do novej sezóny (seniori)" "201" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
  -X POST $API/api/admin/rosters -H "$JSON" -H "$AUTH" \
  -d "{\"sezona_id\":$SEZ_ID,\"tim_id\":$TIM,\"hrac_id\":$HRAC,\"cislo_dresu\":9,\"kapitan\":true}")"

echo ""
echo "  História hráča po sezónach:"
curl -s -m 5 "$API/api/players/$HRAC/history" | python3 -c "
import sys,json
for z in json.load(sys.stdin)['data']:
    s=z.get('sezona',{}); t=z.get('tim',{})
    k=' (kapitán)' if z.get('kapitan') else ''
    print(f\"    {s.get('nazov','?')}  {t.get('nazov','?')} — č. {z.get('cislo_dresu','-')}{k}\")
" 2>/dev/null

POCET_H=$(curl -s -m 5 "$API/api/players/$HRAC/history" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']))" 2>/dev/null)
over "História obsahuje obe sezóny" "2" "$POCET_H"
echo "     (predtým sa dalo zistiť len to, kde hráč je práve teraz)"

echo ""
echo "═══ TEST 5: Súpiska tímu pre sezónu ═══"
SUP=$(curl -s -m 5 "$API/api/teams/$TIM/roster?sezona_id=$SEZ_ID")
over "Súpiska seniorov v novej sezóne" "1" \
  "$(echo "$SUP" | python3 -c "import sys,json; print(json.load(sys.stdin)['meta']['pocet'])" 2>/dev/null)"
SUP_STARA=$(curl -s -m 5 "$API/api/teams/$TIM/roster?sezona_id=$STARA_ID")
over "V starej sezóne seniori hráča nemali" "0" \
  "$(echo "$SUP_STARA" | python3 -c "import sys,json; print(json.load(sys.stdin)['meta']['pocet'])" 2>/dev/null)"

echo ""
echo "═══ TEST 6: Uzavretá sezóna sa needituje ═══"
curl -s -m 5 -X PUT $API/api/admin/seasons/$STARA_ID -H "$JSON" -H "$AUTH" -d '{"uzavreta":true}' > /dev/null
over "Zápis do uzavretej sezóny odmietnutý" "409" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
  -X POST $API/api/admin/rosters -H "$JSON" -H "$AUTH" \
  -d "{\"sezona_id\":$STARA_ID,\"tim_id\":$TIM,\"hrac_id\":$HRAC}")"
curl -s -m 5 -X PUT $API/api/admin/seasons/$STARA_ID -H "$JSON" -H "$AUTH" -d '{"uzavreta":false}' > /dev/null

echo ""
echo "═══ TEST 7: História sa nedá zmazať ═══"
over "Sezóna so súpiskami sa nezmaže" "409" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
  -X DELETE $API/api/admin/seasons/$SEZ_ID -H "$AUTH")"
echo "     (inak by sa dala jedným klikom stratiť celá história)"

echo ""
echo "═══ TEST 8: Ligy sú prepojené na sezóny ═══"
LIGA=$(curl -s -m 5 -X POST $API/api/leagues -H "$JSON" -H "$AUTH" \
  -d "{\"nazov\":\"Sezona Liga $R\",\"sezona\":\"$SEZ_NAZOV\",\"typ\":\"sutaz\",\"format\":\"tabulka\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
over "Liga vytvorená" "True" "$([ -n "$LIGA" ] && echo True || echo False)"

# Návrat pôvodnej aktuálnej sezóny
if [ -n "$STARA_ID" ]; then
  curl -s -m 5 -X POST $API/api/admin/seasons/$STARA_ID/set-current -H "$AUTH" > /dev/null
fi

echo ""
echo "═══════════════════════════════════════"
echo "  VÝSLEDOK: $PASS prešlo, $FAIL zlyhalo"
echo "═══════════════════════════════════════"
