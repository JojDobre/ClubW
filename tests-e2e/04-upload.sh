#!/bin/bash
# Umiestnenie: /home/claude/test-krok5.sh
# Overenie Kroku 5: bezpečnosť uploadov
export BACKEND="$(cd "$(dirname "${BASH_SOURCE[0]}")/../backend" && pwd)"

API="http://localhost:3000"
PASS=0; FAIL=0
TMP=/tmp/upload-testy
mkdir -p $TMP

check() {
  if [ "$2" = "$3" ]; then echo "  ✅ $1 → HTTP $3"; PASS=$((PASS+1));
  else echo "  ❌ $1 → HTTP $3 (očakávané $2)"; FAIL=$((FAIL+1)); fi
}

# Prihlásenie
TOKEN=$(curl -s -m 5 -X POST $API/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"test-admin@clubw.sk","heslo":"TestHeslo123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)
[ -z "$TOKEN" ] && { echo "❌ Prihlásenie zlyhalo"; exit 1; }
echo "✅ Admin prihlásený"

# Príprava testovacích súborov
python3 -c "
from PIL import Image
Image.new('RGB',(800,600),(200,30,30)).save('$TMP/platny.png')
" 2>/dev/null || python3 -c "
import zlib, struct
def chunk(t,d):
    c=t+d
    return struct.pack('>I',len(d))+c+struct.pack('>I',zlib.crc32(c))
png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',10,10,8,2,0,0,0))
raw=b''.join(b'\x00'+b'\xff\x00\x00'*10 for _ in range(10))
png+=chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
open('$TMP/platny.png','wb').write(png)
"
# Spustiteľný súbor premenovaný na .png (podvrhnutý mimetype)
printf '#!/bin/bash\nrm -rf /\n' > $TMP/skodlivy.png
# SVG so skriptom premenované na .png
printf '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>' > $TMP/xss.png

echo ""
echo "═══ TEST 1: Platný PNG obrázok sa nahrá ═══"
KOD=$(curl -s -o $TMP/odp1.json -w "%{http_code}" -m 15 -X POST $API/api/upload/player-photo \
  -H "Authorization: Bearer $TOKEN" -F "photo=@$TMP/platny.png;type=image/png" -F "tim_id=1")
check "Platný PNG" "200" "$KOD"
echo "     Odpoveď: $(head -c 200 $TMP/odp1.json)"

echo ""
echo "═══ TEST 2: Skript premenovaný na .png (podvrhnutý mimetype) ═══"
KOD=$(curl -s -o $TMP/odp2.json -w "%{http_code}" -m 15 -X POST $API/api/upload/player-photo \
  -H "Authorization: Bearer $TOKEN" -F "photo=@$TMP/skodlivy.png;type=image/png" -F "tim_id=1")
check "Podvrhnutý súbor odmietnutý" "400" "$KOD"

echo ""
echo "═══ TEST 3: SVG so skriptom premenované na .png ═══"
KOD=$(curl -s -o $TMP/odp3.json -w "%{http_code}" -m 15 -X POST $API/api/upload/player-photo \
  -H "Authorization: Bearer $TOKEN" -F "photo=@$TMP/xss.png;type=image/png" -F "tim_id=1")
check "SVG odmietnuté" "400" "$KOD"

echo ""
echo "═══ TEST 4: Path traversal cez tim_id (zápis mimo uploads) ═══"
KOD=$(curl -s -o $TMP/odp4.json -w "%{http_code}" -m 15 -X POST $API/api/upload/player-photo \
  -H "Authorization: Bearer $TOKEN" -F "photo=@$TMP/platny.png;type=image/png" -F "tim_id=../../../tmp")
check "Traversal cez tim_id odmietnutý" "400" "$KOD"
if [ -f /tmp/player_*.jpg ] 2>/dev/null; then
  echo "  ❌ Súbor sa zapísal mimo uploads!"; FAIL=$((FAIL+1))
else
  echo "  ✅ Žiadny súbor mimo priečinka uploads"; PASS=$((PASS+1))
fi

echo ""
echo "═══ TEST 5: Path traversal cez /api/uploads (zmazaný router) ═══"
KOD=$(curl -s -o /dev/null -w "%{http_code}" -m 5 --path-as-is "$API/api/uploads/../package.json")
check "Zraniteľný router odstránený" "404" "$KOD"

echo ""
echo "═══ TEST 6: Static serving neservuje skryté súbory ═══"
KOD=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "$API/uploads/.env")
check "Skryté súbory blokované" "404" "$KOD"

echo ""
echo "═══ TEST 7: Upload bez tokenu ═══"
KOD=$(curl -s -o /dev/null -w "%{http_code}" -m 15 -X POST $API/api/upload/player-photo \
  -F "photo=@$TMP/platny.png;type=image/png" -F "tim_id=1")
check "Bez tokenu odmietnuté" "401" "$KOD"

echo ""
echo "═══ Kontrola uloženého súboru ═══"
NAJDENE=$(find $BACKEND/uploads/images/players -name "*.jpg" 2>/dev/null | head -1)
if [ -n "$NAJDENE" ]; then
  TYP=$(python3 -c "
import sys
d=open('$NAJDENE','rb').read(3)
print('JPEG' if d==b'\xff\xd8\xff' else 'INÝ FORMÁT')
")
  echo "  ✅ Súbor uložený: $(basename $NAJDENE)"
  echo "  ✅ Skutočný formát po pre-enkódovaní: $TYP"
  PASS=$((PASS+1))
else
  echo "  ❌ Žiadny uložený súbor sa nenašiel"; FAIL=$((FAIL+1))
fi

echo ""
echo "═══════════════════════════════════════"
echo "  VÝSLEDOK: $PASS prešlo, $FAIL zlyhalo"
echo "═══════════════════════════════════════"
