// Umiestnenie: license-server/src/sluzby/baliky.ts
// Príprava balíka verzie (stiahnutie z GitHubu na pozadí).

import { Produkt, Verzia, zaznamenaj } from '../models/sprava';
import { stiahniBalik } from '../utils/balicky';

/** Verzie, ktoré sa práve sťahujú - ten istý balík nesťahujeme dvakrát. */
const rozpracovane = new Set<number>();

/**
 * Spustí stiahnutie balíka verzie. Vráti sa hneď, výsledok sa zapíše
 * do verzie (balik_stav: pripravuje -> pripraveny | chyba).
 */
export const pripravBalik = async (verzia: Verzia, administratorId: number | null = null): Promise<Promise<void>> => {
  const produkt = await Produkt.findByPk(verzia.produkt_id);
  if (!produkt?.github_repo) throw new Error('Produkt nemá nastavený repozitár na GitHube');
  if (rozpracovane.has(verzia.id)) return Promise.resolve();

  rozpracovane.add(verzia.id);
  await verzia.update({ balik_stav: 'pripravuje', balik_chyba: null });

  const beh = (async () => {
    try {
      const { sha256, velkost } = await stiahniBalik(produkt.github_repo!, produkt.kod, verzia.tag);
      await verzia.update({ balik_stav: 'pripraveny', balik_sha256: sha256, balik_velkost: velkost, balik_chyba: null });
      await zaznamenaj({
        typ: 'balik_pripraveny',
        popis: `Balík verzie ${verzia.verzia} je pripravený (${(velkost / 1024 / 1024).toFixed(1)} MB)`,
        administrator_id: administratorId,
        produkt_id: produkt.id,
        detaily: { verzia: verzia.verzia, sha256 },
      });
    } catch (chyba: any) {
      await verzia.update({ balik_stav: 'chyba', balik_chyba: String(chyba?.message ?? chyba).slice(0, 1000) });
      await zaznamenaj({
        typ: 'balik_chyba',
        popis: `Balík verzie ${verzia.verzia} sa nepodarilo pripraviť: ${chyba?.message ?? chyba}`,
        administrator_id: administratorId,
        produkt_id: produkt.id,
      });
    } finally {
      rozpracovane.delete(verzia.id);
    }
  })();
  return beh;
};

/** Po reštarte servera: balíky, ktorých sťahovanie prerušil reštart, označíme ako chybné. */
export const opravPrerusenePripravy = async (): Promise<void> => {
  await Verzia.update(
    { balik_stav: 'chyba', balik_chyba: 'Príprava balíka bola prerušená reštartom servera - spustite ju znova' },
    { where: { balik_stav: 'pripravuje' } }
  );
};
