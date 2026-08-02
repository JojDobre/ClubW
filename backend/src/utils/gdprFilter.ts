// Umiestnenie: backend/src/utils/gdprFilter.ts
// Filtrovanie osobných údajov pre verejné rozhranie.
//
// PREČO: fotky a mená hráčov sa zobrazujú na verejnom webe klubu.
// Pri maloletých (kategórie U9 až U19) na to GDPR vyžaduje súhlas
// zákonného zástupcu. Doteraz sa zverejňovalo všetko bez rozdielu.
//
// PRÍSTUP: pri maloletom sa údaj zverejní LEN vtedy, keď na to existuje
// platný súhlas. Chýbajúci záznam znamená "bez súhlasu", nie "povolené" -
// pri osobných údajoch detí je opatrnejší predvolený stav namieste.
//
// Dospelí hráči sa nefiltrujú. Ich pôsobenie v klube je súčasťou verejnej
// športovej činnosti a súhlas rieši klub zmluvne pri registrácii.

import Suhlas, { DruhSuhlasu } from '../models/Suhlas';
import { jeMaloletý } from '../controllers/gdprController';

/**
 * Odstráni z údajov hráča to, na čo chýba súhlas.
 *
 * @param hrac - údaje hráča (výstup z toSafeJSON())
 * @param suhlasy - množina druhov, na ktoré má hráč platný súhlas
 * @returns upravená kópia údajov
 */
export const filtrujUdajeHraca = (
  hrac: any,
  suhlasy: Set<DruhSuhlasu>
): any => {
  // Dospelých nefiltrujeme
  if (!jeMaloletý(hrac?.datum_narodenia)) {
    return hrac;
  }

  const vysledok = { ...hrac };

  // Fotka sa zverejní len s výslovným súhlasom
  if (!suhlasy.has('zverejnenie_fotky')) {
    vysledok.fotka = null;
    vysledok.fotka_skryta_bez_suhlasu = true;
  }

  // Bez súhlasu so zverejnením mena ukážeme len priezvisko so skratkou
  // krstného mena. Tím tak zostane použiteľný pre fanúšikov, ale meno
  // dieťaťa nie je na webe v plnom znení.
  if (!suhlasy.has('zverejnenie_mena')) {
    const krstne = String(vysledok.meno || '');
    vysledok.meno = krstne ? `${krstne.charAt(0)}.` : '';
    vysledok.meno_skratene_bez_suhlasu = true;
  }

  // Presný dátum narodenia dieťaťa na verejný web nepatrí nikdy.
  // Ponecháme len rok, ktorý stačí na zaradenie do vekovej kategórie.
  if (vysledok.datum_narodenia) {
    vysledok.rok_narodenia = new Date(vysledok.datum_narodenia).getFullYear();
    delete vysledok.datum_narodenia;
  }

  // Telesné údaje maloletých na verejnom webe nemajú opodstatnenie
  delete vysledok.vaha;
  delete vysledok.vyska;

  return vysledok;
};

/**
 * Vyfiltruje zoznam hráčov naraz.
 *
 * Súhlasy načíta jedným dotazom pre všetkých hráčov - filtrovanie po
 * jednom by pri súpiske s 25 hráčmi znamenalo 25 dotazov do databázy.
 *
 * @param hraci - pole údajov hráčov
 * @returns pole s odfiltrovanými údajmi
 */
export const filtrujZoznamHracov = async (hraci: any[]): Promise<any[]> => {
  if (!Array.isArray(hraci) || hraci.length === 0) return hraci;

  // Filtrovanie sa týka len maloletých, takže súhlasy načítame len pre nich
  const idMaloletych = hraci
    .filter((h) => jeMaloletý(h?.datum_narodenia))
    .map((h) => h?.id)
    .filter((id): id is number => typeof id === 'number');

  if (idMaloletych.length === 0) return hraci;

  const mapaSuhlasov = await Suhlas.platneDruhyPreViacerych(idMaloletych);

  return hraci.map((h) =>
    filtrujUdajeHraca(h, mapaSuhlasov.get(h?.id) ?? new Set())
  );
};

/**
 * Vyfiltruje údaje jedného hráča.
 */
export const filtrujJednehoHraca = async (hrac: any): Promise<any> => {
  if (!hrac || !jeMaloletý(hrac?.datum_narodenia)) return hrac;

  const suhlasy = await Suhlas.platneDruhy(hrac.id);
  return filtrujUdajeHraca(hrac, suhlasy);
};
