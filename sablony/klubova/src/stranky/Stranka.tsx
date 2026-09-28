// Umiestnenie: sablony/klubova/src/stranky/Stranka.tsx
// Stránka z administrácie (O klube, Kontakt, Vstupenky...) - adresa /:slug.
// Tmavá hlavička s nadpisom a text v čitateľnom stĺpci. Obsah môže
// obsahovať značky [formular slug] a [anketa ID].

import React from 'react';
import { useParams } from 'react-router-dom';
import { ObsahSFormularmi, sanitizeHtml, useNastavenia } from '@clubw/jadro';
import { NenajdenyObsah } from './Nenajdena';
import { ChybaStranky, HlavickaStranky, Nacitava } from '../casti';
import { hlavickaPrihlasenia, useApi, useMetaPopis, useNenajdene, useTitulok } from '../spolocne';

interface TypStranky {
  id: number;
  nazov: string;
  slug: string;
  obsah: string;
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
    <div className="kl-stranka kl-obsahova">
      {nahladId && <div className="kl-nahlad-pruh">Náhľad z administrácie - návštevníci stránku uvidia až po zverejnení.</div>}
      <HlavickaStranky stitok={nastavenia.nazov} nadpis={s.nazov} />
      <div className="kl-clanok-detail__telo kl-clanok-detail__telo--bez-fotky">
        <ObsahSFormularmi html={sanitizeHtml(s.obsah ?? '')} className="kl-text" />
      </div>
    </div>
  );
};

export default Stranka;
