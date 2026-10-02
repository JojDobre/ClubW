// Umiestnenie: sablony/bento/src/stranky/Stranka.tsx
// Stránka z administrácie (O klube, Kontakt, Vstupenky...) - adresa /:slug.
// Tmavá hlavička s nadpisom, text v čitateľnom stĺpci a pod ním bloky
// (časová os, karty osôb, čísla…). Obsah môže obsahovať značky
// [formular slug] a [anketa ID].

import React from 'react';
import { useParams } from 'react-router-dom';
import { BlokyStranky, ObsahSFormularmi, sanitizeHtml, useNastavenia, type BlokStranky } from '@clubw/jadro';
import { KLUBOVE_BLOKY } from '../bloky';
import { NenajdenyObsah } from './Nenajdena';
import { ChybaStranky, HlavickaStranky, Nacitava } from '../casti';
import { hlavickaPrihlasenia, useApi, useMetaPopis, useNenajdene, useTitulok } from '../spolocne';

interface TypStranky {
  id: number;
  nazov: string;
  slug: string;
  obsah: string;
  bloky?: BlokStranky[];
  meta_title?: string | null;
  meta_description?: string | null;
}

const Stranka: React.FC = () => {
  const { slug = '' } = useParams();
  const { nastavenia } = useNastavenia();
  const nahladId = new URLSearchParams(window.location.search).get('nahlad');
  const stranka = useApi<TypStranky>(
    nahladId ? `/admin/pages/${encodeURIComponent(nahladId)}/nahlad` : `/pages/${encodeURIComponent(slug)}`,
    nahladId ? hlavickaPrihlasenia() : undefined
  );
  const s = stranka.data;
  const nenajdene = useNenajdene(!nahladId && stranka.stav === 404);

  useTitulok(s ? s.meta_title || s.nazov : null);
  useMetaPopis(s?.meta_description);

  if (stranka.nacitava || nenajdene === 'overuje') return <Nacitava />;
  if (nenajdene === 'ano') return <NenajdenyObsah />;
  if (nahladId && (stranka.stav === 401 || stranka.stav === 403)) {
    return <ChybaStranky text="Na náhľad nepublikovanej stránky sa musíte prihlásiť do administrácie." />;
  }
  if (stranka.chyba || !s) return <ChybaStranky text={stranka.chyba || 'Stránku sa nepodarilo načítať.'} />;

  return (
    <div className="db-stranka db-obsahova">
      {nahladId && <div className="db-nahlad-pruh">Náhľad z administrácie - návštevníci stránku uvidia až po zverejnení.</div>}
      <HlavickaStranky stitok={nastavenia.nazov} nadpis={s.nazov} />
      {s.obsah && (
        <div className="db-clanok-detail__telo db-clanok-detail__telo--bez-fotky">
          <ObsahSFormularmi html={sanitizeHtml(s.obsah)} className="db-text" />
        </div>
      )}
      <BlokyStranky bloky={s.bloky} predvolenyVzhlad={false} className="db-bloky" komponenty={KLUBOVE_BLOKY} />
    </div>
  );
};

export default Stranka;
