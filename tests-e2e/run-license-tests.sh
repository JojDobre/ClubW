#!/bin/bash
# Umiestnenie: /home/claude/run-license-tests.sh
# Spustí PostgreSQL, licenčný server a zadaný test — všetko v jednom behu,
# pretože procesy neprežijú medzi jednotlivými volaniami nástroja.

TESTFILE="$1"

# PostgreSQL
su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /tmp/pgdata -o '-p 5435 -k /tmp/pgrun' -l /tmp/pg.log start" >/dev/null 2>&1
sleep 3

pkill -9 -f "src/index.ts" 2>/dev/null
sleep 1

cd "$(dirname "$0")/../license-server"
setsid nohup npx tsx src/index.ts > /tmp/licsrv.log 2>&1 < /dev/null &

# Čakanie na štart
for i in $(seq 1 30); do
  sleep 1
  if curl -s -m 2 http://localhost:3001/health >/dev/null 2>&1; then
    echo "✅ Licenčný server spustený (${i}s)"
    break
  fi
done

if ! curl -s -m 3 http://localhost:3001/health >/dev/null 2>&1; then
  echo "❌ Licenčný server neodpovedá"
  tail -15 /tmp/licsrv.log
  exit 1
fi

echo ""
bash "$TESTFILE"

pkill -9 -f "src/index.ts" 2>/dev/null
exit 0
