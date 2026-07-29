// Umiestnenie: backend/scripts/test-ochranna-lehota.ts
// Overenie ochrannej lehoty (grace period) pri nedostupnom licenčnom serveri.
//
// Spustenie: npx tsx scripts/test-ochranna-lehota.ts
//
// Testuje logiku priamo v middleware, bez potreby spúšťať servery -
// posúvanie času o dni by inak trvalo príliš dlho.

import { stavLicencie, _nastavStavPreTesty } from '../src/middleware/licencia';

let preslo = 0;
let zlyhalo = 0;

function over(nazov: string, ocakavane: any, skutocne: any) {
  if (String(ocakavane) === String(skutocne)) {
    console.log(`  ✅ ${nazov}: ${skutocne}`);
    preslo++;
  } else {
    console.log(`  ❌ ${nazov}: očakávané ${ocakavane}, skutočné ${skutocne}`);
    zlyhalo++;
  }
}

const DEN = 24 * 60 * 60 * 1000;

console.log('\n═══ TEST 1: Platná licencia ═══');
_nastavStavPreTesty({
  platna: true,
  dovod: null,
  poslednyUspesnyKontakt: Date.now(),
});
over('Zápis povolený', 'true', stavLicencie().povolene);

console.log('\n═══ TEST 2: Server nedostupný 3 dni (v ochrannej lehote) ═══');
_nastavStavPreTesty({
  platna: false,
  dovod: 'nezistene',
  poslednyUspesnyKontakt: Date.now() - 3 * DEN,
});
let s = stavLicencie();
over('Zápis stále povolený', 'true', s.povolene);
console.log(`     dôvod: ${s.dovod}`);

console.log('\n═══ TEST 3: Server nedostupný 6 dní (posledný deň lehoty) ═══');
_nastavStavPreTesty({
  platna: false,
  dovod: 'nezistene',
  poslednyUspesnyKontakt: Date.now() - 6 * DEN,
});
s = stavLicencie();
over('Zápis povolený', 'true', s.povolene);
console.log(`     dôvod: ${s.dovod}`);

console.log('\n═══ TEST 4: Server nedostupný 8 dní (lehota vypršala) ═══');
_nastavStavPreTesty({
  platna: false,
  dovod: 'nezistene',
  poslednyUspesnyKontakt: Date.now() - 8 * DEN,
});
s = stavLicencie();
over('Zápis zablokovaný', 'false', s.povolene);
over('Dôvod', 'ochranna_lehota_vyprsala', s.dovod);

console.log('\n═══ TEST 5: Server odpovedal, že licencia vypršala ═══');
console.log('(ochranná lehota sa NESMIE uplatniť - inak by stačilo odpojiť internet)');
_nastavStavPreTesty({
  platna: false,
  dovod: 'vyprsana_licencia',
  poslednyUspesnyKontakt: Date.now(), // práve teraz sme sa spojili
});
s = stavLicencie();
over('Zápis zablokovaný okamžite', 'false', s.povolene);
over('Dôvod', 'vyprsana_licencia', s.dovod);

console.log('\n═══ TEST 6: Zrušená licencia + odpojený internet ═══');
console.log('(klient sa pokúsi obísť blokovanie odpojením od siete)');
_nastavStavPreTesty({
  platna: false,
  dovod: 'licencia_zrusena',
  poslednyUspesnyKontakt: Date.now() - 2 * DEN,
});
s = stavLicencie();
over('Ochranná lehota sa neuplatní', 'false', s.povolene);

console.log('\n═══ TEST 7: Podvrhnutý podpis ═══');
_nastavStavPreTesty({
  platna: false,
  dovod: 'neplatny_podpis',
  poslednyUspesnyKontakt: null,
});
over('Zápis zablokovaný', 'false', stavLicencie().povolene);

console.log('\n═══════════════════════════════════════');
console.log(`  VÝSLEDOK: ${preslo} prešlo, ${zlyhalo} zlyhalo`);
console.log('═══════════════════════════════════════');

process.exit(zlyhalo > 0 ? 1 : 0);
