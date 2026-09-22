#!/bin/bash
# Umiestnenie: /home/claude/test-krok14.sh
# Overenie Kroku 14: reálny licenčný server a kontrola na strane klienta
export BACKEND="$(cd "$(dirname "${BASH_SOURCE[0]}")/../backend" && pwd)"

LS="http://localhost:3001"
ADMIN_KEY="test_admin_kluc_pre_sandbox_12345"
PASS=0; FAIL=0

over() {
  if [ "$2" = "$3" ]; then echo "  ✅ $1: $3"; PASS=$((PASS+1));
  else echo "  ❌ $1: očakávané $2, skutočné $3"; FAIL=$((FAIL+1)); fi
}

echo "═══ TEST 1: Health check licenčného servera ═══"
DB=$(curl -s -m 5 $LS/health | python3 -c "import sys,json; print(json.load(sys.stdin)['databaza'])" 2>/dev/null)
over "Databáza pripojená (nie natvrdo zapísaná hodnota)" "pripojená" "$DB"

echo ""
echo "═══ TEST 2: Neexistujúci kľúč NESMIE prejsť ═══"
echo "(pôvodná atrapa vracala isValid: true na čokoľvek)"
ODP=$(curl -s -m 5 -X POST $LS/api/license/verify -H "Content-Type: application/json" \
  -d '{"licenseKey":"CLUBW-VYMYSLENY-KLUC-XXXX-YYYY"}')
over "Vymyslený kľúč odmietnutý" "False" "$(echo $ODP | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['platna'])" 2>/dev/null)"
over "Dôvod zamietnutia" "neexistujuca_licencia" "$(echo $ODP | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['dovod'])" 2>/dev/null)"
over "Odpoveď je podpísaná" "True" "$(echo $ODP | python3 -c "import sys,json; print(bool(json.load(sys.stdin).get('podpis')))" 2>/dev/null)"

echo ""
echo "═══ TEST 3: Admin rozhranie vyžaduje kľúč ═══"
over "Bez X-Admin-Key" "401" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 $LS/api/admin/licenses)"
over "So zlým kľúčom" "401" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 -H 'X-Admin-Key: zly' $LS/api/admin/licenses)"
over "So správnym kľúčom" "200" "$(curl -s -o /dev/null -w '%{http_code}' -m 5 -H "X-Admin-Key: $ADMIN_KEY" $LS/api/admin/licenses)"

echo ""
echo "═══ TEST 4: Vytvorenie platnej licencie ═══"
NOVA=$(curl -s -m 5 -X POST $LS/api/admin/licenses -H "Content-Type: application/json" -H "X-Admin-Key: $ADMIN_KEY" \
  -d '{"nazov_klienta":"FC Slovan Dolina","email_klienta":"admin@dolina.sk","plan":"pro","funkcie":["cms","timy","ligy"]}')
KLUC=$(echo $NOVA | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['kluc'])" 2>/dev/null)
echo "  Vygenerovaný kľúč: $KLUC"
over "Formát kľúča CLUBW-XXXX-XXXX-XXXX-XXXX" "True" "$(python3 -c "import re; print(bool(re.fullmatch(r'CLUBW(-[A-Z2-9]{4}){4}', '$KLUC')))")"

ODP=$(curl -s -m 5 -X POST $LS/api/license/verify -H "Content-Type: application/json" -d "{\"licenseKey\":\"$KLUC\"}")
over "Platná licencia prejde" "True" "$(echo $ODP | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['platna'])" 2>/dev/null)"
over "Plán" "pro" "$(echo $ODP | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['plan'])" 2>/dev/null)"
DNI=$(echo $ODP | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['dniDoVyprsania'])" 2>/dev/null)
echo "  Platnosť: $DNI dní (plán Pro = 1 rok)"
over "Pro plán platí ~365 dní" "True" "$(python3 -c "print(360 <= $DNI <= 366)")"

echo ""
echo "═══ TEST 5: Overenie podpisu verejným kľúčom ═══"
python3 << PYEOF
import json, base64, subprocess, os
odp = json.loads('''$ODP''')
udaje, podp = odp['data'], odp['podpis']

def stabilny(h):
    if h is None or not isinstance(h,(dict,list)): return json.dumps(h)
    if isinstance(h,list): return '['+','.join(stabilny(x) for x in h)+']'
    return '{'+','.join(f'{json.dumps(k)}:{stabilny(h[k])}' for k in sorted(h))+'}'

# Verejny kluc z .env backendu
kluc=''
for r in open(os.environ['BACKEND'] + '/.env'):
    if r.startswith('LICENSE_PUBLIC_KEY='):
        kluc = r.split('=',1)[1].strip().strip('"').replace('\\\\n','\n')
open('/tmp/pub.pem','w').write(kluc+'\n')
open('/tmp/sprava.txt','w').write(stabilny(udaje))
open('/tmp/podpis.bin','wb').write(base64.b64decode(podp))

r = subprocess.run(['openssl','pkeyutl','-verify','-pubin','-inkey','/tmp/pub.pem',
                    '-rawin','-in','/tmp/sprava.txt','-sigfile','/tmp/podpis.bin'],
                   capture_output=True, text=True)
print("  ✅ Podpis platný (overené verejným kľúčom)" if 'Success' in r.stdout else f"  ❌ Podpis NEPLATNÝ: {r.stdout}{r.stderr}")

# Test: zmenene udaje musia podpis zneplatnit
udaje2 = dict(udaje); udaje2['platna'] = True; udaje2['plan'] = 'enterprise'
open('/tmp/sprava2.txt','w').write(stabilny(udaje2))
r2 = subprocess.run(['openssl','pkeyutl','-verify','-pubin','-inkey','/tmp/pub.pem',
                     '-rawin','-in','/tmp/sprava2.txt','-sigfile','/tmp/podpis.bin'],
                    capture_output=True, text=True)
print("  ✅ Podvrhnuté údaje podpisom NEPREJDÚ" if 'Success' not in r2.stdout else "  ❌ CHYBA: podvrhnuté údaje prešli!")
PYEOF

echo ""
echo "═══ TEST 6: Pozastavenie a vypršanie licencie ═══"
ID=$(echo $NOVA | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
curl -s -m 5 -X PUT $LS/api/admin/licenses/$ID -H "Content-Type: application/json" -H "X-Admin-Key: $ADMIN_KEY" -d '{"stav":"pozastavena"}' > /dev/null
over "Pozastavená licencia neprejde" "licencia_pozastavena" "$(curl -s -m 5 -X POST $LS/api/license/verify -H 'Content-Type: application/json' -d "{\"licenseKey\":\"$KLUC\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['dovod'])" 2>/dev/null)"

curl -s -m 5 -X PUT $LS/api/admin/licenses/$ID -H "Content-Type: application/json" -H "X-Admin-Key: $ADMIN_KEY" \
  -d '{"stav":"aktivna","platna_do":"2020-01-01T00:00:00Z"}' > /dev/null
over "Vypršaná licencia neprejde" "vyprsana_licencia" "$(curl -s -m 5 -X POST $LS/api/license/verify -H 'Content-Type: application/json' -d "{\"licenseKey\":\"$KLUC\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['dovod'])" 2>/dev/null)"

echo ""
echo "═══ TEST 7: Viazanie na doménu ═══"
DOM=$(curl -s -m 5 -X POST $LS/api/admin/licenses -H "Content-Type: application/json" -H "X-Admin-Key: $ADMIN_KEY" \
  -d '{"nazov_klienta":"Test Domena","email_klienta":"t@t.sk","domena":"mojklub.sk"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['kluc'])" 2>/dev/null)
over "Správna doména prejde" "True" "$(curl -s -m 5 -X POST $LS/api/license/verify -H 'Content-Type: application/json' -d "{\"licenseKey\":\"$DOM\",\"domena\":\"www.mojklub.sk\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['platna'])" 2>/dev/null)"
over "Cudzia doména neprejde" "nespravna_domena" "$(curl -s -m 5 -X POST $LS/api/license/verify -H 'Content-Type: application/json' -d "{\"licenseKey\":\"$DOM\",\"domena\":\"cudzi-web.sk\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['dovod'])" 2>/dev/null)"

echo ""
echo "═══════════════════════════════════════"
echo "  VÝSLEDOK: $PASS prešlo, $FAIL zlyhalo"
echo "═══════════════════════════════════════"
echo "PLATNY_KLUC=$DOM" > /tmp/testkluc.txt
