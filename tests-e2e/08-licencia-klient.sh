#!/bin/bash
# Umiestnenie: /home/claude/test-licencia-klient.sh
# Overenie klientskej strany licencie: blokovanie zápisov pri neplatnej
# licencii, povolené čítanie, ochranná lehota pri nedostupnom serveri.
#
# Spúšťa licenčný server aj backend naraz - procesy neprežijú medzi volaniami.
export BACKEND="$(cd "$(dirname "${BASH_SOURCE[0]}")/../backend" && pwd)"
export LICENCNY="$(cd "$(dirname "${BASH_SOURCE[0]}")/../license-server" && pwd)"

API="http://localhost:3000"
LIC="http://localhost:3001"
ADMIN_KEY="test_admin_kluc_pre_sandbox_12345"
JSON="Content-Type: application/json"
PASS=0; FAIL=0

over() {
  if [ "$2" = "$3" ]; then echo "  ✅ $1: $3"; PASS=$((PASS+1));
  else echo "  ❌ $1: očakávané $2, skutočné $3"; FAIL=$((FAIL+1)); fi
}

# ===== 1. PostgreSQL =====
su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /tmp/pgdata -o '-p 5435 -k /tmp/pgrun' -l /tmp/pg.log start" >/dev/null 2>&1
sleep 3
pkill -9 -f "src/index.ts" 2>/dev/null; sleep 1

# ===== 2. Licenčný server =====
cd $LICENCNY
setsid nohup npx tsx src/index.ts > /tmp/licsrv.log 2>&1 < /dev/null &
for i in $(seq 1 25); do sleep 1; curl -s -m 2 $LIC/health >/dev/null 2>&1 && break; done
curl -s -m 2 $LIC/health >/dev/null 2>&1 || { echo "❌ Licenčný server nenaštartoval"; tail -8 /tmp/licsrv.log; exit 1; }
echo "✅ Licenčný server beží"

# ===== 3. Vytvorenie licencie pre klienta =====
NOVA=$(curl -s -m 5 -X POST $LIC/api/admin/licenses -H "$JSON" -H "X-Admin-Key: $ADMIN_KEY" -d '{
  "nazov_klienta":"FC Slovan Dolina","email_klienta":"admin@slovandolina.sk","plan":"pro"
}')
KLUC=$(echo "$NOVA" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['kluc'])" 2>/dev/null)
[ -z "$KLUC" ] && { echo "❌ Licenciu sa nepodarilo vytvoriť"; echo "$NOVA" | head -c 200; exit 1; }
echo "✅ Licencia vytvorená: $KLUC"

# Verejný kľúč pre overenie podpisu na strane klienta
VEREJNY=$(grep '^LICENSE_PUBLIC_KEY=' $LICENCNY/.env | head -1 | cut -d= -f2-)

# ===== 4. Backend .env s platnou licenciou =====
cd $BACKEND
cat > .env << EOF
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5435
DB_NAME=clubw_client_dev
DB_USER=client_dev
DB_PASSWORD=client_dev_password
JWT_SECRET=test_sandbox_jwt_secret_only_for_local_verification
CORS_ORIGIN=http://localhost:3002
LICENSE_KEY=$KLUC
LICENSE_SERVER_URL=$LIC
LICENSE_PUBLIC_KEY=$VEREJNY
EOF

spusti_backend() {
  pkill -9 -f "ts-node src/index.ts" 2>/dev/null; sleep 1
  cd $BACKEND
  setsid nohup npx ts-node src/index.ts > /tmp/backend.log 2>&1 < /dev/null &
  for i in $(seq 1 35); do sleep 1; curl -s -m 2 $API/health >/dev/null 2>&1 && return 0; done
  return 1
}

echo ""
echo "═══ TEST 1: Backend s PLATNOU licenciou ═══"
spusti_backend || { echo "❌ Backend nenaštartoval"; tail -10 /tmp/backend.log; exit 1; }

STAV=$(curl -s -m 5 $API/api/license/status)
over "Licencia použiteľná" "True" "$(echo "$STAV" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["povolene"])' 2>/dev/null)"

TOKEN=$(curl -s -m 5 -X POST $API/api/auth/login -H "$JSON" \
  -d '{"email":"test-admin@clubw.sk","heslo":"TestHeslo123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  # Admin ešte neexistuje - vytvoríme ho
  npx tsx -e "
  import User from './src/models/user';
  (async () => {
    await User.create({ meno:'Test Admin', email:'test-admin@clubw.sk',
      heslo:'TestHeslo123', rola:'admin', aktivity:true } as any);
    process.exit(0);
  })();" >/dev/null 2>&1
  TOKEN=$(curl -s -m 5 -X POST $API/api/auth/login -H "$JSON" \
    -d '{"email":"test-admin@clubw.sk","heslo":"TestHeslo123"}' \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)
fi

R=$RANDOM
KOD=$(curl -s -o /dev/null -w "%{http_code}" -m 10 -X POST $API/api/teams -H "$JSON" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"nazov\":\"Lic Tim $R\",\"typ\":\"muzi\",\"vekova_kategoria\":\"seniori\"}")
over "Zápis povolený s platnou licenciou" "201" "$KOD"

echo ""
echo "═══ TEST 2: Backend s NEPLATNOU licenciou ═══"
sed -i "s|^LICENSE_KEY=.*|LICENSE_KEY=CLUBW-XXXX-XXXX-XXXX-XXXX|" .env
spusti_backend || { echo "❌ Backend nenaštartoval"; exit 1; }

TOKEN2=$(curl -s -m 5 -X POST $API/api/auth/login -H "$JSON" \
  -d '{"email":"test-admin@clubw.sk","heslo":"TestHeslo123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)
over "Prihlásenie funguje aj bez licencie (admin musí vidieť upozornenie)" "True" "$([ -n "$TOKEN2" ] && echo True || echo False)"

KOD=$(curl -s -o /dev/null -w "%{http_code}" -m 10 $API/api/teams)
over "Čítanie verejného webu povolené" "200" "$KOD"

KOD=$(curl -s -o /dev/null -w "%{http_code}" -m 10 -X POST $API/api/teams -H "$JSON" \
  -H "Authorization: Bearer $TOKEN2" \
  -d "{\"nazov\":\"Blokovany Tim $R\",\"typ\":\"muzi\",\"vekova_kategoria\":\"seniori\"}")
over "Zápis ZABLOKOVANÝ neplatnou licenciou" "403" "$KOD"

echo ""
echo "═══ TEST 3: Ochranná lehota — licenčný server nedostupný ═══"
sed -i "s|^LICENSE_KEY=.*|LICENSE_KEY=$KLUC|" .env
sed -i "s|^LICENSE_SERVER_URL=.*|LICENSE_SERVER_URL=http://localhost:59999|" .env
spusti_backend || { echo "❌ Backend nenaštartoval"; exit 1; }

TOKEN3=$(curl -s -m 5 -X POST $API/api/auth/login -H "$JSON" \
  -d '{"email":"test-admin@clubw.sk","heslo":"TestHeslo123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)

KOD=$(curl -s -o /dev/null -w "%{http_code}" -m 10 -X POST $API/api/teams -H "$JSON" \
  -H "Authorization: Bearer $TOKEN3" \
  -d "{\"nazov\":\"Grace Tim $R\",\"typ\":\"muzi\",\"vekova_kategoria\":\"seniori\"}")
over "Zápis povolený počas ochrannej lehoty" "201" "$KOD"
echo "     (výpadok licenčného servera nesmie položiť klub)"

echo ""
echo "═══════════════════════════════════════"
echo "  KLIENTSKA KONTROLA: $PASS prešlo, $FAIL zlyhalo"
echo "═══════════════════════════════════════"

pkill -9 -f "src/index.ts" 2>/dev/null
