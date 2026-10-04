// Umiestnenie: sablony/tribuna/src/bloky.tsx
// Bloky stránok v dizajne Tribúny. Väčšinu blokov kreslí jadro
// (BlokyStranky) a vzhľad im dáva styl.css (.tb-bloky .blok…). Tu sú len
// bloky s dátami webu, ktoré používajú karty šablóny - zápasy, články
// a partneri vyzerajú rovnako ako na úvode.

import React from 'react';
import { HlavickaBloku, PREDVOLENE_BLOKY, SekcieUvodu, adresaZapasovBloku, odkazVsetkychBloku, useNastavenia, useNastaveniaSablony, type KomponentBloku, type VlastnostiHlavickyBloku } from '@clubw/jadro';
import { KartaClanku, KartaZapasu, Obrazok, RadyPartnerov } from './casti';
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
      <HlavickaBloku nadpis={data.nadpis} odkaz={odkazVsetkychBloku('zapasy', data)} textOdkazu={data.text_odkazu} />
      <div className="tb-mriezka-3 tb-mriezka-zapasov">
        {zoznam.map((z) => (
          <KartaZapasu key={z.id} zapas={z} vstupenky={(s.vstupenky_odkaz || '').trim() || null} />
        ))}
      </div>
    </>
  );
};

const ClankyBloku: KomponentBloku = (props) => {
  const { data } = props.blok;
  const pocet = Number(data.pocet) || 3;
  const clanky = useApi<Clanok[]>(data.vzhlad === 'zoznam' ? null : `/articles?limit=${pocet}${data.rubrika ? `&category=${encodeURIComponent(data.rubrika)}` : ''}`);
  if (data.vzhlad === 'zoznam') {
    const Predvolene = PREDVOLENE_BLOKY.clanky;
    return <Predvolene {...props} />;
  }
  if (!clanky.data?.length) return null;
  return (
    <>
      <HlavickaBloku nadpis={data.nadpis} odkaz={odkazVsetkychBloku('clanky', data)} textOdkazu={data.text_odkazu} />
      <div className="tb-mriezka-3">
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
      <HlavickaBloku nadpis={data.nadpis} odkaz={odkazVsetkychBloku('partneri', data)} textOdkazu={data.text_odkazu} />
      <div className="tb-bloky__partneri">
        <RadyPartnerov partneri={partneri.data} />
      </div>
    </>
  );
};

/** Farebné tóny kariet „Odkaz klubu" - rovnaké ako na úvode */
const TONY_ODKAZU = ['var(--tb-tmava)', 'var(--tb-akcent)', '#c8862a'];

/** Karty: vzhľad „Odkaz klubu" (ovál s názvom a tlačidlo ako na úvode), ostatné vzhľady kreslí jadro. */
const KartyBloku: KomponentBloku = (props) => {
  const { nastavenia } = useNastavenia();
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
            <div key={i} className="blok__polozka tb-odkaz-karta">
              <div className="tb-odkaz-karta__obraz">
                <Obrazok src={p.obrazok as string | null} className="tb-odkaz-karta__fotka" />
                <span className="tb-odkaz-karta__ton" style={{ background: TONY_ODKAZU[i % TONY_ODKAZU.length] }} aria-hidden="true" />
                <span className="tb-odkaz-karta__oval" aria-hidden="true">
                  <small>{nastavenia.skratka || nastavenia.nazov}</small>
                  <strong>{nazov}</strong>
                </span>
              </div>
              <div className="tb-odkaz-karta__spodok">
                <span>{nazov}</span>
                {p.odkaz && (
                  <Odkaz to={String(p.odkaz)} className="tb-tlacidlo-obrys tb-tlacidlo-obrys--male">
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

/** Vlastné sekcie úvodu (nastavenie „Vlastné sekcie na úvode") v dizajne šablóny. */
export const Sekcie: React.FC<{ p: string; hlavicka?: React.ComponentType<VlastnostiHlavickyBloku> }> = ({ p, hlavicka }) => (
  <SekcieUvodu pozicia={p} predvolenyVzhlad={false} className="tb-bloky tb-u-sekcie" komponenty={KLUBOVE_BLOKY} hlavicka={hlavicka} />
);
