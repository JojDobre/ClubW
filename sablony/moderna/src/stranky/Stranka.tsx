// Umiestnenie: sablony/moderna/src/stranky/Stranka.tsx
// Stránka z administrácie (O klube, Kontakt, Vstupenky...) - adresa /:slug.
// Obsah môže obsahovať značky [formular slug] a [anketa ID].

import React from 'react';
import { useParams } from 'react-router-dom';
import { ObsahSFormularmi, sanitizeHtml, useNastavenia } from '@clubw/jadro';
import { NenajdenyObsah } from './Nenajdena';
import { Chyba, HlavickaStranky, Nacitava, hlavickaPrihlasenia, useApi, useMetaPopis, useNenajdene, useTitulok } from '../spolocne';

interface Stranka {
  id: number;
  nazov: string;
  slug: string;
  obsah: string;
  meta_title?: string | null;
  meta_description?: string | null;
  aktualizovany?: string;
}

const Stranka: React.FC = () => {
  const { slug = '' } = useParams();
  const { nastavenia } = useNastavenia();
  const nahladId = new URLSearchParams(window.location.search).get('nahlad');
  const stranka = useApi<Stranka>(
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
    return (
      <div className="md-kontajner md-stranka">
        <Chyba text="Na náhľad nepublikovanej stránky sa musíte prihlásiť do administrácie." />
      </div>
    );
  }
  if (stranka.chyba || !s) {
    return (
      <div className="md-kontajner md-stranka">
        <Chyba text={stranka.chyba || 'Stránku sa nepodarilo načítať.'} />
      </div>
    );
  }

  return (
    <div className="md-stranka md-stranka--obsah">
      {nahladId && <div className="md-nahlad-pruh">Náhľad z administrácie - návštevníci stránku uvidia až po zverejnení.</div>}
      <HlavickaStranky stitok={nastavenia.nazov} nadpis={s.nazov} />
      <div className="md-kontajner md-stranka__telo">
        <ObsahSFormularmi html={sanitizeHtml(s.obsah ?? '')} className="md-text" />
      </div>
    </div>
  );
};

export default Stranka;
