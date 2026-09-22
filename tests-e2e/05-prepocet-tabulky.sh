#!/bin/bash
# Umiestnenie: /home/claude/test-krok7.sh
# Overenie Kroku 7: automatický prepočet tabuľky po zmene zápasu

RND=$RANDOM  # nahodna pripona - nazvy timov a lig musia byt jedinecne
API="http://localhost:3000"
PASS=0; FAIL=0

over() {
  if [ "$2" = "$3" ]; then echo "  ✅ $1: $3"; PASS=$((PASS+1));
  else echo "  ❌ $1: očakávané $2, skutočné $3"; FAIL=$((FAIL+1)); fi
}

TOKEN=$(curl -s -m 5 -X POST $API/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"test-admin@clubw.sk","heslo":"TestHeslo123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)
[ -z "$TOKEN" ] && { echo "❌ Prihlásenie zlyhalo"; exit 1; }
echo "✅ Admin prihlásený"

AUTH="-H \"Authorization: Bearer $TOKEN\""
HDR_JSON="-H Content-Type:application/json"

# Pomocná funkcia: vytiahne body tímu z tabuľky ligy
body_timu() {
  curl -s -m 5 "$API/api/leagues/$1/table" | python3 -c "
import sys,json
d=json.load(sys.stdin)
riadky=d.get('data',{})
if isinstance(riadky,dict): riadky=riadky.get('table') or riadky.get('tabulka') or []
for r in riadky:
    if r.get('tim_id')==$2:
        print(r.get('body')); break
else: print('CHYBA')
" 2>/dev/null
}

echo ""
echo "═══ Príprava: liga a dva tímy ═══"

TIM1=$(curl -s -m 5 -X POST $API/api/teams $HDR_JSON -H "Authorization: Bearer $TOKEN" \
  -d '{"nazov":"AutoTest Tim 1 '$RND'","typ":"muzi","vekova_kategoria":"seniori"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['id'])" 2>/dev/null)
TIM2=$(curl -s -m 5 -X POST $API/api/teams $HDR_JSON -H "Authorization: Bearer $TOKEN" \
  -d '{"nazov":"AutoTest Tim 2 '$RND'","typ":"muzi","vekova_kategoria":"seniori"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['id'])" 2>/dev/null)
echo "  Tímy: $TIM1, $TIM2"

LIGA=$(curl -s -m 5 -X POST $API/api/leagues $HDR_JSON -H "Authorization: Bearer $TOKEN" \
  -d '{"nazov":"AutoTest Liga '$RND'","sezona":"2025/2026","typ":"sutaz","format":"tabulka","auto_update_tabulka":true,"body_za_vitazstvo":3,"body_za_remizy":1}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['id'])" 2>/dev/null)
echo "  Liga: $LIGA (auto_update_tabulka = true)"

[ -z "$LIGA" ] && { echo "❌ Ligu sa nepodarilo vytvoriť"; exit 1; }

echo ""
echo "═══ TEST 1: Vytvorenie ukončeného zápasu 2:0 ═══"
ZAPAS=$(curl -s -m 10 -X POST $API/api/matches $HDR_JSON -H "Authorization: Bearer $TOKEN" \
  -d "{\"nazov\":\"AutoTest zapas\",\"liga_id\":$LIGA,\"datum_cas\":\"2026-05-10T15:00:00Z\",\"domaci_tim_id\":$TIM1,\"hostujuci_tim_id\":$TIM2,\"goly_domaci\":2,\"goly_hostia\":0,\"status\":\"ukonceny\"}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['id'])" 2>/dev/null)
echo "  Zápas vytvorený: id=$ZAPAS"
sleep 1
over "Tím 1 má po výhre 3 body (bez ručného prepočtu)" "3" "$(body_timu $LIGA $TIM1)"
over "Tím 2 má po prehre 0 bodov" "0" "$(body_timu $LIGA $TIM2)"

echo ""
echo "═══ TEST 2: Zmena výsledku na remízu 1:1 ═══"
curl -s -m 10 -X PUT $API/api/matches/$ZAPAS $HDR_JSON -H "Authorization: Bearer $TOKEN" \
  -d '{"goly_domaci":1,"goly_hostia":1}' > /dev/null
sleep 1
over "Tím 1 má po remíze 1 bod" "1" "$(body_timu $LIGA $TIM1)"
over "Tím 2 má po remíze 1 bod" "1" "$(body_timu $LIGA $TIM2)"

echo ""
echo "═══ TEST 3: Zmazanie zápasu ═══"
curl -s -m 10 -X DELETE $API/api/matches/$ZAPAS -H "Authorization: Bearer $TOKEN" > /dev/null
sleep 1
over "Tím 1 má po zmazaní 0 bodov" "0" "$(body_timu $LIGA $TIM1)"
over "Tím 2 má po zmazaní 0 bodov" "0" "$(body_timu $LIGA $TIM2)"

echo ""
echo "═══ TEST 4: Liga s vypnutým auto_update ═══"
LIGA2=$(curl -s -m 5 -X POST $API/api/leagues $HDR_JSON -H "Authorization: Bearer $TOKEN" \
  -d '{"nazov":"AutoTest Liga Vypnuta '$RND'","sezona":"2025/2026","typ":"sutaz","format":"tabulka","auto_update_tabulka":false}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['id'])" 2>/dev/null)
curl -s -m 10 -X POST $API/api/matches $HDR_JSON -H "Authorization: Bearer $TOKEN" \
  -d "{\"nazov\":\"Zapas bez auto\",\"liga_id\":$LIGA2,\"datum_cas\":\"2026-05-10T15:00:00Z\",\"domaci_tim_id\":$TIM1,\"hostujuci_tim_id\":$TIM2,\"goly_domaci\":5,\"goly_hostia\":0,\"status\":\"ukonceny\"}" > /dev/null
sleep 1
VYSLEDOK=$(body_timu $LIGA2 $TIM1)
over "Tabuľka sa NEprepočítala (rešpektuje nastavenie)" "CHYBA" "$VYSLEDOK"

echo ""
echo "═══════════════════════════════════════"
echo "  VÝSLEDOK: $PASS prešlo, $FAIL zlyhalo"
echo "═══════════════════════════════════════"
