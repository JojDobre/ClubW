// Umiestnenie: license-server/scripts/generuj-kluce.js
// Jednorazové vygenerovanie páru kľúčov pre podpisovanie licencií.
//
// Spustenie: npm run generuj-kluce
//
// Súkromný kľúč patrí VÝHRADNE na licenčný server (premenná LICENSE_PRIVATE_KEY).
// Verejný kľúč sa vkladá do každého klientskeho webu (LICENSE_PUBLIC_KEY),
// aby si vedel overiť, že odpoveď naozaj prišla od vášho servera.

const crypto = require('crypto');

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

const verejny = publicKey.export({ type: 'spki', format: 'pem' }).toString();
const sukromny = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

// Do .env súboru sa viacriadkový text vkladá s \n namiesto skutočných zalomení
const naJedenRiadok = (pem) => pem.trim().replace(/\n/g, '\\n');

console.log('\n═══════════════════════════════════════════════════════');
console.log('  PÁR KĽÚČOV VYGENEROVANÝ');
console.log('═══════════════════════════════════════════════════════\n');

console.log('1) Do license-server/.env vložte SÚKROMNÝ kľúč:\n');
console.log(`LICENSE_PRIVATE_KEY="${naJedenRiadok(sukromny)}"`);
console.log(`LICENSE_PUBLIC_KEY="${naJedenRiadok(verejny)}"\n`);

console.log('2) Do backend/.env KAŽDÉHO klienta vložte VEREJNÝ kľúč:\n');
console.log(`LICENSE_PUBLIC_KEY="${naJedenRiadok(verejny)}"\n`);

console.log('⚠️  Súkromný kľúč nikdy nedávajte klientom ani do gitu.');
console.log('    Kto ho má, vie si vystaviť platnú licenciu sám.\n');
