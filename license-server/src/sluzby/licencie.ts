// Umiestnenie: license-server/src/sluzby/licencie.ts
// Logika licencií spoločná pre administráciu a overovanie: vypočítaný
// stav, cieľová verzia inštalácie a príkazy na aktualizáciu.

import { Op } from 'sequelize';
import Licencia from '../models/Licencia';
import { NEUKONCENE_STAVY, Prikaz, Produkt, Verzia, zaznamenaj } from '../models/sprava';
import { porovnajVerzie } from '../utils/verzie';
import { balikJeNaDisku } from '../utils/balicky';

/** Inštalácia sa za posledných 48 hodín ozvala = beží. */
export const ONLINE_MS = 48 * 60 * 60 * 1000;

export type VypocitanyStav = 'aktivna' | 'vyprsana' | 'pozastavena' | 'zrusena';

export const vypocitanyStav = (l: Licencia): VypocitanyStav => {
  if (l.stav !== 'aktivna') return l.stav;
  return new Date(l.platna_do).getTime() < Date.now() ? 'vyprsana' : 'aktivna';
};

/** Licencia pre administráciu - s dopočítanými údajmi. */
export const doAdministracie = (l: Licencia) => {
  const json = l.toJSON() as unknown as Record<string, unknown>;
  return {
    ...json,
    vypocitany_stav: vypocitanyStav(l),
    dni_do_vyprsania: l.dniDoVyprsania(),
    online: Boolean(l.posledna_kontrola && Date.now() - new Date(l.posledna_kontrola).getTime() < ONLINE_MS),
  };
};

/**
 * Na akú verziu má inštalácia prejsť: pripnutá verzia licencie, inak
 * aktuálna verzia produktu. Vráti null, ak produkt aktuálnu verziu nemá.
 */
export const cielovaVerzia = async (l: Licencia): Promise<{ verzia: Verzia; produkt: Produkt } | null> => {
  const produkt = await Produkt.findByPk(l.produkt_id);
  if (!produkt) return null;
  const idVerzie = l.pripnuta_verzia_id ?? produkt.aktualna_verzia_id;
  if (!idVerzie) return null;
  const verzia = await Verzia.findByPk(idVerzie);
  return verzia && verzia.produkt_id === produkt.id ? { verzia, produkt } : null;
};

/** Údaje o verzii pre klienta - podpisujú sa spolu s licenciou. */
export const verziaPreKlienta = (v: Verzia) => ({
  id: v.id,
  verzia: v.verzia,
  tag: v.tag,
  sha256: v.balik_sha256,
  velkost: v.balik_velkost,
  poznamky: v.poznamky ? v.poznamky.slice(0, 4000) : null,
});

/**
 * Dostupná aktualizácia pre inštaláciu s danou verziou. Len ak je cieľová
 * verzia novšia a jej balík je pripravený na stiahnutie.
 */
export const dostupnaAktualizacia = async (l: Licencia, nainstalovana: string | null) => {
  const ciel = await cielovaVerzia(l);
  if (!ciel || !nainstalovana) return null;
  const { verzia, produkt } = ciel;
  if (porovnajVerzie(verzia.verzia, nainstalovana) <= 0) return null;
  if (!balikJeNaDisku(produkt.kod, verzia)) return null;
  return {
    ...verziaPreKlienta(verzia),
    povinna: Boolean(produkt.minimalna_verzia && porovnajVerzie(nainstalovana, produkt.minimalna_verzia) < 0),
  };
};

export class ChybaPrikazu extends Error {}

/**
 * Vytvorí príkaz na aktualizáciu inštalácie. Inštalácia ho dostane pri
 * najbližšom overení licencie (najneskôr do 24 hodín, po kliknutí
 * na Overiť teraz v jej administrácii hneď).
 */
export const vytvorPrikazAktualizacie = async (
  l: Licencia,
  verzia: Verzia,
  kto: { administrator_id?: number | null; ip?: string | null; automaticky?: boolean }
): Promise<Prikaz> => {
  if (verzia.produkt_id !== l.produkt_id) throw new ChybaPrikazu('Verzia patrí inému produktu');
  if (verzia.balik_stav !== 'pripraveny') throw new ChybaPrikazu(`Balík verzie ${verzia.verzia} nie je pripravený`);
  if (vypocitanyStav(l) !== 'aktivna') throw new ChybaPrikazu('Licencia nie je aktívna - inštalácia by balík nestiahla');
  if (l.nainstalovana_verzia && porovnajVerzie(verzia.verzia, l.nainstalovana_verzia) === 0) {
    throw new ChybaPrikazu(`Inštalácia už beží na verzii ${verzia.verzia}`);
  }
  const rozpracovany = await Prikaz.findOne({ where: { licencia_id: l.id, stav: { [Op.in]: NEUKONCENE_STAVY } } });
  if (rozpracovany) throw new ChybaPrikazu('Inštalácia už má rozpracovanú aktualizáciu');

  const prikaz = await Prikaz.create({
    licencia_id: l.id,
    typ: 'aktualizacia',
    verzia_id: verzia.id,
    vytvoril_id: kto.administrator_id ?? null,
    sprava: kto.automaticky ? 'Automatická aktualizácia' : null,
  });
  await zaznamenaj({
    typ: 'aktualizacia_zadana',
    popis: `${kto.automaticky ? 'Automatická aktualizácia' : 'Aktualizácia'} na verziu ${verzia.verzia} - ${l.nazov_klienta}`,
    administrator_id: kto.administrator_id ?? null,
    licencia_id: l.id,
    produkt_id: l.produkt_id,
    detaily: { prikaz_id: prikaz.id, verzia: verzia.verzia, z_verzie: l.nainstalovana_verzia },
    ip: kto.ip ?? null,
  });
  return prikaz;
};
