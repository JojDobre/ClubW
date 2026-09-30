// Umiestnenie: sablony/klubova/src/bloky.tsx
// Bloky stránok v dizajne Klubovej. Väčšinu blokov kreslí jadro
// (BlokyStranky) a vzhľad im dáva styl.css (.kl-bloky .blok…). Tu sú len
// bloky s dátami webu, ktoré používajú karty šablóny - zápasy, články
// a partneri vyzerajú rovnako ako na úvode.

import React from 'react';
import { HlavickaBloku, adresaZapasovBloku, useNastaveniaSablony, type KomponentBloku } from '@clubw/jadro';
import { KartaClanku, KartaZapasu, LogoPartnera } from './casti';
import { useApi, type Clanok, type Partner, type Zapas } from './spolocne';

const ZapasyBloku: KomponentBloku = ({ blok: { data } }) => {
  const s = useNastaveniaSablony<{ vstupenky_odkaz: string | null }>();
  const zapasy = useApi<Zapas[]>(adresaZapasovBloku(data));
  const pocet = Number(data.pocet) || 3;
  const zoznam = [...(zapasy.data ?? [])]
    .sort((a, b) => (data.rezim === 'vysledky' ? b.datum_cas.localeCompare(a.datum_cas) : a.datum_cas.localeCompare(b.datum_cas)))
    .slice(0, pocet);
  if (zoznam.length === 0) return null;
  return (
    <>
      <HlavickaBloku nadpis={data.nadpis} />
      <div className="kl-mriezka-3 kl-mriezka-zapasov">
        {zoznam.map((z) => (
          <KartaZapasu key={z.id} zapas={z} vstupenky={(s.vstupenky_odkaz || '').trim() || null} />
        ))}
      </div>
    </>
  );
};

const ClankyBloku: KomponentBloku = ({ blok: { data } }) => {
  const pocet = Number(data.pocet) || 3;
  const clanky = useApi<Clanok[]>(`/articles?limit=${pocet}${data.rubrika ? `&category=${encodeURIComponent(data.rubrika)}` : ''}`);
  if (!clanky.data?.length) return null;
  return (
    <>
      <HlavickaBloku nadpis={data.nadpis} />
      <div className="kl-mriezka-3">
        {clanky.data.map((c) => (
          <KartaClanku key={c.id} clanok={c} />
        ))}
      </div>
    </>
  );
};

const PartneriBloku: KomponentBloku = ({ blok: { data } }) => {
  const partneri = useApi<Partner[]>('/sponsors?limit=500');
  if (!partneri.data?.length) return null;
  return (
    <>
      <HlavickaBloku nadpis={data.nadpis} />
      <div className="kl-bloky__partneri">
        {partneri.data.map((p) => (
          <LogoPartnera key={p.id} partner={p} velke />
        ))}
      </div>
    </>
  );
};

export const KLUBOVE_BLOKY: Partial<Record<string, KomponentBloku>> = {
  zapasy: ZapasyBloku,
  clanky: ClankyBloku,
  partneri: PartneriBloku,
};
