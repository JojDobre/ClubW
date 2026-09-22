#!/bin/bash
# Umiestnenie: /home/claude/test-krok3.sh
# Overenie Kroku 3: autentifikácia na zápisových operáciách
export BACKEND="$(cd "$(dirname "${BASH_SOURCE[0]}")/../backend" && pwd)"

API="http://localhost:3000"
PASS=0
FAIL=0

# Pomocná funkcia: očakávaný HTTP kód vs skutočný
check() {
  local nazov="$1"; local ocakavany="$2"; local skutocny="$3"
  if [ "$skutocny" = "$ocakavany" ]; then
    echo "  ✅ $nazov → HTTP $skutocny"
    PASS=$((PASS+1))
  else
    echo "  ❌ $nazov → HTTP $skutocny (očakávané $ocakavany)"
    FAIL=$((FAIL+1))
  fi
}

echo "═══ ČASŤ A: Zápisové operácie BEZ tokenu musia vrátiť 401 ═══"
for ep in "POST /api/teams" "PUT /api/teams/1" "DELETE /api/teams/1" \
          "POST /api/players" "PUT /api/players/1" "DELETE /api/players/1" \
          "POST /api/staff" "PUT /api/staff/1" "DELETE /api/staff/1" \
          "POST /api/leagues" "PUT /api/leagues/1" "DELETE /api/leagues/1" \
          "POST /api/leagues/1/table/recalculate" "PUT /api/leagues/1/table" \
          "POST /api/matches" "PUT /api/matches/1" "DELETE /api/matches/1" \
          "PUT /api/matches/update-statuses"; do
  METODA=$(echo $ep | cut -d' ' -f1)
  CESTA=$(echo $ep | cut -d' ' -f2)
  KOD=$(curl -s -o /dev/null -w "%{http_code}" -m 5 -X $METODA "$API$CESTA" \
        -H "Content-Type: application/json" -d '{"nazov":"Test"}')
  check "$ep" "401" "$KOD"
done

echo ""
echo "═══ ČASŤ B: Verejné čítanie (GET) musí ostať dostupné bez tokenu ═══"
for ep in "/api/teams" "/api/players" "/api/staff" "/api/leagues" "/api/matches"; do
  KOD=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "$API$ep")
  check "GET $ep" "200" "$KOD"
done

echo ""
echo "═══ ČASŤ C: S platným tokenom musí zápis fungovať ═══"
# Vytvorenie admin používateľa priamo v DB (registračný endpoint neexistuje)
cd $BACKEND
npx tsx -e "
import User from './src/models/user';
(async () => {
  // Heslo nastavíme vždy - iný test ho mohol medzitým zmeniť
  const existuje = await User.findOne({ where: { email: 'test-admin@clubw.sk' } });
  if (existuje) {
    await existuje.update({ heslo: 'TestHeslo123', aktivity: true, rola: 'admin' });
  } else {
    await User.create({
      meno: 'Test Admin', email: 'test-admin@clubw.sk',
      heslo: 'TestHeslo123', rola: 'admin', aktivity: true,
    } as any);
  }
  process.exit(0);
})();
" > /dev/null 2>&1

TOKEN=$(curl -s -m 5 -X POST $API/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test-admin@clubw.sk","heslo":"TestHeslo123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "  ❌ Nepodarilo sa získať token - prihlásenie zlyhalo"
  FAIL=$((FAIL+1))
else
  echo "  ✅ Prihlásenie admina úspešné (token získaný)"
  PASS=$((PASS+1))

  # Vytvorenie tímu s tokenom
  ODPOVED=$(curl -s -m 5 -w "\n%{http_code}" -X POST $API/api/teams \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"nazov":"Test Tím A '$RANDOM'","typ":"muzi","vekova_kategoria":"seniori"}')
  KOD=$(echo "$ODPOVED" | tail -1)
  check "POST /api/teams s tokenom" "201" "$KOD"

  # Neplatný token musí byť odmietnutý
  KOD=$(curl -s -o /dev/null -w "%{http_code}" -m 5 -X POST $API/api/teams \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer neplatny.token.hodnota" \
    -d '{"nazov":"Test Tím B","typ":"muzi","vekova_kategoria":"seniori"}')
  check "POST /api/teams s NEPLATNÝM tokenom" "401" "$KOD"
fi

echo ""
echo "═══════════════════════════════════════"
echo "  VÝSLEDOK: $PASS prešlo, $FAIL zlyhalo"
echo "═══════════════════════════════════════"
