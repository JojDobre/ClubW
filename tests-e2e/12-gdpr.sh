#!/bin/bash
# Umiestnenie: /home/claude/test-krok18.sh
# Overenie Kroku 18: GDPR — súhlasy, filtrovanie údajov detí, export,
# anonymizácia, audit

API="http://localhost:3000"
JSON="Content-Type: application/json"
R=$RANDOM
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

# Tím a dvaja hráči: maloletý (14 rokov) a dospelý
TIM=$(curl -s -m 5 -X POST $API/api/teams -H "$JSON" -H "$AUTH" \
  -d "{\"nazov\":\"GDPR Tim $R\",\"typ\":\"mladez\",\"vekova_kategoria\":\"U15\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

ROK_DIETA=$(python3 -c "from datetime import date; print(date.today().year - 14)")
ROK_DOSPELY=$(python3 -c "from datetime import date; print(date.today().year - 25)")

DIETA=$(curl -s -m 5 -X POST $API/api/players -H "$JSON" -H "$AUTH" \
  -d "{\"meno\":\"Tomas\",\"priezvisko\":\"Maloletý $R\",\"tim_id\":$TIM,\"pozicia\":\"utocnik\",\"cislo_dresu\":7,\"datum_narodenia\":\"$ROK_DIETA-05-20\",\"fotka\":\"/uploads/images/players/dieta.jpg\",\"vaha\":52,\"vyska\":162}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

DOSPELY=$(curl -s -m 5 -X POST $API/api/players -H "$JSON" -H "$AUTH" \
  -d "{\"meno\":\"Martin\",\"priezvisko\":\"Dospely $R\",\"tim_id\":$TIM,\"pozicia\":\"obranca\",\"cislo_dresu\":4,\"datum_narodenia\":\"$ROK_DOSPELY-03-11\",\"fotka\":\"/uploads/images/players/dospely.jpg\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

echo "Hráči: dieťa=$DIETA (14 r.), dospelý=$DOSPELY (25 r.)"

echo ""
echo "═══ TEST 1: Údaje dieťaťa BEZ súhlasu na verejnom webe ═══"
VER=$(curl -s -m 5 "$API/api/players/$DIETA")
over "Fotka skrytá" "None" \
  "$(echo "$VER" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('fotka'))" 2>/dev/null)"
over "Meno skrátené na iniciálu" "T." \
  "$(echo "$VER" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('meno'))" 2>/dev/null)"
over "Presný dátum narodenia odstránený" "True" \
  "$(echo "$VER" | python3 -c "import sys,json; print('datum_narodenia' not in json.load(sys.stdin)['data'])" 2>/dev/null)"
over "Rok narodenia zachovaný (pre vekovú kategóriu)" "$ROK_DIETA" \
  "$(echo "$VER" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('rok_narodenia'))" 2>/dev/null)"
over "Telesné údaje odstránené" "True" \
  "$(echo "$VER" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print('vaha' not in d and 'vyska' not in d)" 2>/dev/null)"

echo ""
echo "═══ TEST 2: Dospelý hráč sa nefiltruje ═══"
VERD=$(curl -s -m 5 "$API/api/players/$DOSPELY")
over "Fotka zobrazená" "True" \
  "$(echo "$VERD" | python3 -c "import sys,json; print(bool(json.load(sys.stdin)['data'].get('fotka')))" 2>/dev/null)"
over "Plné meno zobrazené" "Martin" \
  "$(echo "$VERD" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('meno'))" 2>/dev/null)"

echo ""
echo "═══ TEST 3: Súhlas maloletého vyžaduje zákonného zástupcu ═══"
over "Bez mena zástupcu odmietnuté" "400" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
  -X PUT $API/api/admin/players/$DIETA/consents -H "$JSON" -H "$AUTH" \
  -d '{"druh":"zverejnenie_fotky","udeleny":true}')"

over "So zástupcom prijaté" "200" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
  -X PUT $API/api/admin/players/$DIETA/consents -H "$JSON" -H "$AUTH" \
  -d '{"druh":"zverejnenie_fotky","udeleny":true,"udelil_meno":"Anna Maloletá","udelil_vztah":"matka","zdroj":"papierový formulár"}')"

curl -s -m 5 -X PUT $API/api/admin/players/$DIETA/consents -H "$JSON" -H "$AUTH" \
  -d '{"druh":"zverejnenie_mena","udeleny":true,"udelil_meno":"Anna Maloletá","udelil_vztah":"matka"}' > /dev/null

echo ""
echo "═══ TEST 4: So súhlasom sa údaje zobrazia ═══"
VER2=$(curl -s -m 5 "$API/api/players/$DIETA")
over "Fotka zobrazená" "True" \
  "$(echo "$VER2" | python3 -c "import sys,json; print(bool(json.load(sys.stdin)['data'].get('fotka')))" 2>/dev/null)"
over "Plné meno zobrazené" "Tomas" \
  "$(echo "$VER2" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('meno'))" 2>/dev/null)"
over "Dátum narodenia stále skrytý" "True" \
  "$(echo "$VER2" | python3 -c "import sys,json; print('datum_narodenia' not in json.load(sys.stdin)['data'])" 2>/dev/null)"
echo "     (presný dátum narodenia dieťaťa na web nepatrí ani so súhlasom)"

echo ""
echo "═══ TEST 5: Odvolanie súhlasu ═══"
curl -s -m 5 -X PUT $API/api/admin/players/$DIETA/consents -H "$JSON" -H "$AUTH" \
  -d '{"druh":"zverejnenie_fotky","udeleny":false}' > /dev/null
over "Fotka opäť skrytá" "None" \
  "$(curl -s -m 5 "$API/api/players/$DIETA" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('fotka'))" 2>/dev/null)"

echo ""
echo "═══ TEST 6: Prehľad súhlasov ═══"
PREH=$(curl -s -m 5 -H "$AUTH" "$API/api/admin/players/$DIETA/consents")
over "Hráč označený ako maloletý" "True" \
  "$(echo "$PREH" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['maloletý'])" 2>/dev/null)"
over "Prehľad obsahuje všetkých 5 druhov" "5" \
  "$(echo "$PREH" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']['suhlasy']))" 2>/dev/null)"
over "Bez tokenu nedostupné" "401" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
  "$API/api/admin/players/$DIETA/consents")"

echo ""
echo "═══ TEST 7: Export údajov (právo na prístup) ═══"
EXP=$(curl -s -m 5 -H "$AUTH" "$API/api/admin/players/$DIETA/export")
over "Export obsahuje osobné údaje" "True" \
  "$(echo "$EXP" | python3 -c "import sys,json; print('osobne_udaje' in json.load(sys.stdin)['data'])" 2>/dev/null)"
over "Export obsahuje súhlasy" "True" \
  "$(echo "$EXP" | python3 -c "import sys,json; print('suhlasy' in json.load(sys.stdin)['data'])" 2>/dev/null)"

echo ""
echo "═══ TEST 8: Anonymizácia (právo na výmaz) ═══"
over "Bez potvrdenia odmietnuté" "400" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
  -X POST $API/api/admin/players/$DIETA/anonymize -H "$JSON" -H "$AUTH" -d '{}')"

over "S potvrdením vykonané" "200" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
  -X POST $API/api/admin/players/$DIETA/anonymize -H "$JSON" -H "$AUTH" \
  -d '{"potvrdenie":"ANONYMIZOVAT"}')"

ANON=$(curl -s -m 5 -H "$AUTH" "$API/api/admin/players/$DIETA/export")
over "Meno anonymizované" "Anonymizovaný" \
  "$(echo "$ANON" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['osobne_udaje']['meno'])" 2>/dev/null)"
over "Fotka odstránená" "None" \
  "$(echo "$ANON" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['osobne_udaje'].get('fotka'))" 2>/dev/null)"
over "Súhlasy odstránené" "0" \
  "$(echo "$ANON" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']['suhlasy']))" 2>/dev/null)"

echo ""
echo "═══ TEST 9: Auditný záznam ═══"
AUD=$(curl -s -m 5 -H "$AUTH" "$API/api/admin/gdpr/audit?entita=Player&entita_id=$DIETA")
over "Anonymizácia zaznamenaná" "True" \
  "$(echo "$AUD" | python3 -c "import sys,json; print(any(z['akcia']=='anonymizacia' for z in json.load(sys.stdin)['data']))" 2>/dev/null)"
over "Export zaznamenaný" "True" \
  "$(echo "$AUD" | python3 -c "import sys,json; print(any(z['akcia']=='export_udajov' for z in json.load(sys.stdin)['data']))" 2>/dev/null)"
echo "  Záznamy v audite:"
echo "$AUD" | python3 -c "
import sys,json
for z in json.load(sys.stdin)['data'][:4]:
    print(f\"    {z['vytvoreny'][:19]}  {z['akcia']:16} {z.get('popis','')[:60]}\")
" 2>/dev/null

echo ""
echo "═══ TEST 10: Prehľad retencie ═══"
RET=$(curl -s -m 5 -H "$AUTH" "$API/api/admin/gdpr/retention")
over "Prehľad dostupný" "True" \
  "$(echo "$RET" | python3 -c "import sys,json; print(json.load(sys.stdin)['success'])" 2>/dev/null)"
over "Doba uchovávania uvedená" "3" \
  "$(echo "$RET" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['doba_uchovavania_rokov'])" 2>/dev/null)"

echo ""
echo "═══════════════════════════════════════"
echo "  VÝSLEDOK: $PASS prešlo, $FAIL zlyhalo"
echo "═══════════════════════════════════════"
