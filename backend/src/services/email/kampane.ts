// Umiestnenie: backend/src/services/email/kampane.ts
// Hromadné e-maily fanúšikom a členom.
//
// Dostanú ich len aktívni fanúšikovia so súhlasom so zasielaním oznamov
// (suhlas_oznamy), voliteľne len vybrané typy členstva alebo len tí
// s platným členstvom. Každý e-mail má odkaz na odhlásenie a hlavičky
// List-Unsubscribe (Gmail a ďalší ukážu tlačidlo „Odhlásiť").

import crypto from 'crypto';
import { Op, type WhereOptions } from 'sequelize';
import Fanusik from '../../models/Fanusik';
import { EmailFronta, type AdresatiKampane, type EmailKampan } from '../../models/Email';
import { adresaApi, udajeKlubu } from './odosielanie';
import { vyrobEmail } from './vzhlad';

const NAZVY_TYPOV: Record<string, string> = { fanusik: 'fanúšik', clen: 'člen klubu', vip: 'VIP člen', cestny: 'čestný člen' };

/** Podmienka pre adresátov hromadného e-mailu. */
export const podmienkaAdresatov = (a: AdresatiKampane): WhereOptions => {
  const dnes = new Date().toISOString().slice(0, 10);
  return {
    stav: 'aktivny',
    aktivity: true,
    suhlas_oznamy: true,
    email: { [Op.ne]: '' },
    ...(a.typy?.length ? { typ_clenstva: { [Op.in]: a.typy } } : {}),
    ...(a.len_platne ? { [Op.or]: [{ clenstvo_do: null }, { clenstvo_do: { [Op.gte]: dnes } }] } : {}),
  } as WhereOptions;
};

export const pocetAdresatov = (a: AdresatiKampane) => Fanusik.count({ where: podmienkaAdresatov(a) });

// ===== Odhlásenie =====

const tajomstvo = () => process.env.EMAIL_SIFROVACI_KLUC || process.env.JWT_SECRET || 'clubw';

/** Podpis odkazu na odhlásenie - nedá sa uhádnuť pre cudzí účet. */
export const podpisOdhlasenia = (fanusikId: number) =>
  crypto.createHmac('sha256', tajomstvo()).update(`odhlasenie:${fanusikId}`).digest('base64url').slice(0, 32);

export const overPodpisOdhlasenia = (fanusikId: number, podpis: string) => {
  const ocakavany = Buffer.from(podpisOdhlasenia(fanusikId));
  const prijaty = Buffer.from(String(podpis));
  return ocakavany.length === prijaty.length && crypto.timingSafeEqual(ocakavany, prijaty);
};

export const odkazOdhlasenia = (fanusikId: number) => `${adresaApi()}/email/odhlasit?f=${fanusikId}&t=${podpisOdhlasenia(fanusikId)}`;

const datum = (d: string | null) => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString('sk-SK') : '');

export const hodnotyAdresata = (f: Fanusik): Record<string, string> => ({
  meno: f.meno,
  priezvisko: f.priezvisko,
  cislo_karty: f.cislo_karty ?? '',
  typ_clenstva: NAZVY_TYPOV[f.typ_clenstva] ?? f.typ_clenstva,
  clenstvo_do: datum(f.clenstvo_do as string | null),
});

/**
 * Zaradí hromadný e-mail do fronty pre všetkých adresátov.
 * E-maily potom posiela plánovač postupne (limit za minútu).
 *
 * @returns počet adresátov
 */
export const zaradKampan = async (kampan: EmailKampan): Promise<number> => {
  const { klub, znacky, pata } = await udajeKlubu();
  const adresati = await Fanusik.findAll({ where: podmienkaAdresatov(kampan.adresati ?? {}), order: [['id', 'ASC']] });
  const zaznamy = adresati.map((f) => {
    const odhlasenie = odkazOdhlasenia(f.id);
    const email = vyrobEmail(kampan, { ...znacky, ...hodnotyAdresata(f) }, klub, { pata, odhlasenie });
    return {
      prijemca: f.email,
      predmet: email.predmet.slice(0, 255),
      text: email.text,
      html: email.html,
      sablona: 'kampan',
      kampan_id: kampan.id,
      hlavicky: { 'List-Unsubscribe': `<${odhlasenie}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    };
  });
  for (let i = 0; i < zaznamy.length; i += 500) await EmailFronta.bulkCreate(zaznamy.slice(i, i + 500));
  await kampan.update({ stav: zaznamy.length ? 'odosiela' : 'odoslana', pocet_adresatov: zaznamy.length, odoslana: new Date() });
  return zaznamy.length;
};
