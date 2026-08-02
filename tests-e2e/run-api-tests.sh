#!/bin/bash
# Umiestnenie: /home/claude/run-api-tests.sh
# Pomocný skript: spustí backend, počká na štart, spustí zadaný test súbor, server ukončí.
# Dôvod: procesy neprežijú medzi jednotlivými volaniami, preto štart + testy v jednom behu.

TESTFILE="$1"

pkill -9 -f ts-node 2>/dev/null
sleep 1

cd "$(dirname "$0")/../backend"
setsid nohup npx ts-node src/index.ts > /tmp/backend.log 2>&1 < /dev/null &
SRV_PID=$!

# Čakanie na štart servera (max 40s)
for i in $(seq 1 40); do
  sleep 1
  if grep -q "je spustený" /tmp/backend.log 2>/dev/null; then
    echo "✅ Server spustený (${i}s)"
    break
  fi
  if grep -q "❌ Chyba pri spúšťaní" /tmp/backend.log 2>/dev/null; then
    echo "❌ Server padol pri štarte:"
    grep -A5 "❌ Chyba" /tmp/backend.log | head -10
    exit 1
  fi
done

if ! curl -s -m 3 http://localhost:3000/health > /dev/null 2>&1; then
  echo "❌ Server neodpovedá na /health"
  tail -20 /tmp/backend.log | grep -v "^Executing"
  exit 1
fi

echo ""
# Spustenie testov
bash "$TESTFILE"

# Upratanie
pkill -9 -f ts-node 2>/dev/null
exit 0
