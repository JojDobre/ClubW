// Umiestnenie: sablony/klubova/src/bloky.tsx
// Bloky stránok v dizajne Klubovej. Väčšinu blokov kreslí jadro
// (BlokyStranky) a vzhľad im dáva styl.css (.kl-bloky .blok…). Tu sú len
// bloky s dátami webu, ktoré používajú karty šablóny - zápasy, články
// a partneri vyzerajú rovnako ako na úvode.

import React from 'react';
import { HlavickaBloku, PREDVOLENE_BLOKY, adresaZapasovBloku, useNastaveniaSablony, type KomponentBloku } from '@clubw/jadro';
import { KartaClanku, KartaZapasu, ObrazOdkazu, RadyPartnerov } from './casti';
import { Ikona, Odkaz, useApi, useUpravy, type Clanok, type Partner, type Zapas } from './spolocne';

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
        <RadyPartnerov partneri={partneri.data} />
      </div>
    </>
  );
};

/** Farebné tóny kariet „Odkaz klubu" - rovnaké ako na úvode */
const TONY_ODKAZU = ['var(--kl-tmava)', 'var(--kl-akcent)', '#c8862a'];

/**
 * Karty: vzhľad „Odkaz klubu" (rám s názvom a tlačidlo ako na úvode), ostatné vzhľady kreslí jadro.
 * Text položky sa ukáže v ráme nad názvom (prázdny = text z nastavení šablóny alebo názov klubu).
 */
const KartyBloku: KomponentBloku = (props) => {
  const u = useUpravy();
  const { data, polozky = [] } = props.blok;
  if (data.vzhlad !== 'klub') {
    const Predvolene = PREDVOLENE_BLOKY.karty;
    return <Predvolene {...props} />;
  }
  return (
    <>
      <HlavickaBloku nadpis={data.nadpis} uvod={data.uvod} />
      <div className={`blok__mriezka blok__mriezka--${data.stlpce || '3'} blok__karty--klub`}>
        {polozky.map((p, i) => {
          const nazov = String(p.nadpis || '');
          return (
            <div key={i} className="blok__polozka kl-odkaz-karta">
              <ObrazOdkazu obrazok={(p.obrazok as string | null) || null} ton={TONY_ODKAZU[i % TONY_ODKAZU.length]} nazov={nazov} stitok={String(p.text || '')} />
              <div className="kl-odkaz-karta__spodok">
                <span>{nazov}</span>
                {p.odkaz && (
                  <Odkaz to={String(p.odkaz)} className="kl-tlacidlo-obrys kl-tlacidlo-obrys--male">
                    {String(p.tlacidlo || '') || u.text('text_objavit', 'Objaviť')}
                    <Ikona nazov="sipka" velkost={12} />
                  </Odkaz>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export const KLUBOVE_BLOKY: Partial<Record<string, KomponentBloku>> = {
  karty: KartyBloku,
  zapasy: ZapasyBloku,
  clanky: ClankyBloku,
  partneri: PartneriBloku,
};
