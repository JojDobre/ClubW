#!/bin/bash
# Umiestnenie: /home/claude/test-krok8.sh
# Overenie Kroku 8: štatistiky zápasu (strelci, asistencie, karty)

API="http://localhost:3000"
RND=$RANDOM
PASS=0; FAIL=0

over() {
  if [ "$2" = "$3" ]; then echo "  ✅ $1: $3"; PASS=$((PASS+1));
  else echo "  ❌ $1: očakávané $2, skutočné $3"; FAIL=$((FAIL+1)); fi
}

TOKEN=$(curl -s -X POST $API/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"test-admin@clubw.sk","heslo":"TestHeslo123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)
[ -z "$TOKEN" ] && { echo "❌ Prihlásenie zlyhalo"; exit 1; }
echo "✅ Admin prihlásený"

AUTH="Authorization: Bearer $TOKEN"
JSON="Content-Type: application/json"

echo ""
echo "═══ Príprava: tímy, hráči, liga, zápas ═══"

TIM1=$(curl -s -X POST $API/api/teams -H "$JSON" -H "$AUTH" \
  -d "{\"nazov\":\"Stat Tim A $RND\",\"typ\":\"muzi\",\"vekova_kategoria\":\"seniori\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
TIM2=$(curl -s -X POST $API/api/teams -H "$JSON" -H "$AUTH" \
  -d "{\"nazov\":\"Stat Tim B $RND\",\"typ\":\"muzi\",\"vekova_kategoria\":\"seniori\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

# Traja hráči v tíme A
HRAC1=$(curl -s -X POST $API/api/players -H "$JSON" -H "$AUTH" \
  -d "{\"meno\":\"Jan\",\"priezvisko\":\"Strelec $RND\",\"tim_id\":$TIM1,\"pozicia\":\"utocnik\",\"cislo_dresu\":9,\"datum_narodenia\":\"1998-03-15\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
HRAC2=$(curl -s -X POST $API/api/players -H "$JSON" -H "$AUTH" \
  -d "{\"meno\":\"Peter\",\"priezvisko\":\"Zaloznik $RND\",\"tim_id\":$TIM1,\"pozicia\":\"zaloznik\",\"cislo_dresu\":8,\"datum_narodenia\":\"1997-07-22\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
HRAC3=$(curl -s -X POST $API/api/players -H "$JSON" -H "$AUTH" \
  -d "{\"meno\":\"Marek\",\"priezvisko\":\"Obranca $RND\",\"tim_id\":$TIM2,\"pozicia\":\"obranca\",\"cislo_dresu\":4,\"datum_narodenia\":\"2000-01-10\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
echo "  Hráči: $HRAC1 (útočník), $HRAC2 (záložník), $HRAC3 (obranca súpera)"

LIGA=$(curl -s -X POST $API/api/leagues -H "$JSON" -H "$AUTH" \
  -d "{\"nazov\":\"Stat Liga $RND\",\"sezona\":\"2025/2026\",\"typ\":\"sutaz\",\"format\":\"tabulka\",\"auto_update_tabulka\":true}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

echo ""
echo "═══ TEST 1: Vytvorenie zápasu SO štatistikami naraz ═══"
ZAPAS=$(curl -s -X POST $API/api/matches -H "$JSON" -H "$AUTH" -d "{
  \"nazov\":\"Stat zapas $RND\",\"liga_id\":$LIGA,\"datum_cas\":\"2026-05-10T15:00:00Z\",
  \"domaci_tim_id\":$TIM1,\"hostujuci_tim_id\":$TIM2,
  \"goly_domaci\":2,\"goly_hostia\":1,\"status\":\"ukonceny\",
  \"statistiky\":[
    {\"hrac_id\":$HRAC1,\"typ\":\"gol\",\"minuta\":23},
    {\"hrac_id\":$HRAC1,\"typ\":\"gol\",\"minuta\":67},
    {\"hrac_id\":$HRAC2,\"typ\":\"asistencia\",\"minuta\":23},
    {\"hrac_id\":$HRAC3,\"typ\":\"zlta_karta\",\"minuta\":45,\"poznamka\":\"Zdrzovanie hry\"},
    {\"hrac_id\":$HRAC3,\"typ\":\"gol\",\"minuta\":88}
  ]}" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
echo "  Zápas vytvorený: id=$ZAPAS"

STAT=$(curl -s "$API/api/matches/$ZAPAS/statistics")
over "Celkový počet záznamov" "5" "$(echo $STAT | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']['vsetky']))" 2>/dev/null)"
over "Počet gólov" "3" "$(echo $STAT | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']['podla_typu']['goly']))" 2>/dev/null)"
over "Počet asistencií" "1" "$(echo $STAT | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']['podla_typu']['asistencie']))" 2>/dev/null)"
over "Počet žltých kariet" "1" "$(echo $STAT | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']['podla_typu']['zlte_karty']))" 2>/dev/null)"

echo ""
echo "  Priebeh zápasu:"
echo $STAT | python3 -c "
import sys,json
for s in json.load(sys.stdin)['data']['vsetky']:
    h=s['hrac']
    typy={'gol':'⚽ gól','asistencia':'👟 asistencia','zlta_karta':'🟨 žltá','cervena_karta':'🟥 červená','vlastny_gol':'⚽ vlastný gól'}
    print(f\"    {str(s['minuta'] or '-').rjust(3)}'  {typy.get(s['typ'],s['typ']).ljust(14)} {h['meno']} {h['priezvisko']} (#{h['cislo_dresu']})\")
" 2>/dev/null

echo ""
echo "═══ TEST 2: Poradie strelcov ligy ═══"
STRELCI=$(curl -s "$API/api/leagues/$LIGA/top-scorers")
over "Počet strelcov v poradí" "2" "$(echo $STRELCI | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']))" 2>/dev/null)"
over "Najlepší strelec má 2 góly (číslo, nie reťazec)" "2" "$(echo $STRELCI | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d[0]['pocet'] if isinstance(d[0]['pocet'],int) else 'RETAZEC')" 2>/dev/null)"
echo "  Poradie strelcov:"
echo $STRELCI | python3 -c "
import sys,json
for r in json.load(sys.stdin)['data']:
    h=r['hrac']
    tim=h.get('tim',{}).get('nazov','?') if h.get('tim') else '?'
    print(f\"    {r['poradie']}. {h['meno']} {h['priezvisko']} ({tim}) - {r['pocet']} gólov\")
" 2>/dev/null

echo ""
echo "═══ TEST 3: Poradie asistentov ═══"
over "Počet asistentov" "1" "$(curl -s "$API/api/leagues/$LIGA/top-scorers?typ=asistencia" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']))" 2>/dev/null)"

echo ""
echo "═══ TEST 4: Nahradenie štatistík cez PUT ═══"
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X PUT $API/api/matches/$ZAPAS/statistics -H "$JSON" -H "$AUTH" \
  -d "{\"statistiky\":[{\"hrac_id\":$HRAC2,\"typ\":\"gol\",\"minuta\":10}]}")
over "PUT štatistík" "200" "$KOD"
over "Staré záznamy nahradené (zostal 1)" "1" "$(curl -s "$API/api/matches/$ZAPAS/statistics" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']['vsetky']))" 2>/dev/null)"

echo ""
echo "═══ TEST 5: Validácia ═══"
KOD=$(curl -s -o /tmp/val.json -w "%{http_code}" -X PUT $API/api/matches/$ZAPAS/statistics -H "$JSON" -H "$AUTH" \
  -d "{\"statistiky\":[{\"hrac_id\":$HRAC1,\"typ\":\"neplatny_typ\",\"minuta\":10}]}")
over "Neplatný typ odmietnutý" "400" "$KOD"

KOD=$(curl -s -o /dev/null -w "%{http_code}" -X PUT $API/api/matches/$ZAPAS/statistics -H "$JSON" -H "$AUTH" \
  -d "{\"statistiky\":[{\"hrac_id\":999999,\"typ\":\"gol\",\"minuta\":10}]}")
over "Neexistujúci hráč odmietnutý" "400" "$KOD"

KOD=$(curl -s -o /dev/null -w "%{http_code}" -X PUT $API/api/matches/$ZAPAS/statistics -H "$JSON" -H "$AUTH" \
  -d "{\"statistiky\":[{\"hrac_id\":$HRAC1,\"typ\":\"gol\",\"minuta\":500}]}")
over "Neplatná minúta odmietnutá" "400" "$KOD"

KOD=$(curl -s -o /dev/null -w "%{http_code}" -X PUT $API/api/matches/$ZAPAS/statistics -H "$JSON" \
  -d "{\"statistiky\":[{\"hrac_id\":$HRAC1,\"typ\":\"gol\"}]}")
over "Bez tokenu odmietnuté" "401" "$KOD"

echo ""
echo "═══ TEST 6: Prázdne pole vymaže štatistiky ═══"
curl -s -X PUT $API/api/matches/$ZAPAS/statistics -H "$JSON" -H "$AUTH" -d '{"statistiky":[]}' > /dev/null
over "Štatistiky vymazané" "0" "$(curl -s "$API/api/matches/$ZAPAS/statistics" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']['vsetky']))" 2>/dev/null)"

echo ""
echo "═══════════════════════════════════════"
echo "  VÝSLEDOK: $PASS prešlo, $FAIL zlyhalo"
echo "═══════════════════════════════════════"
