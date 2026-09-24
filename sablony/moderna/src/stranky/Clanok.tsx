// Umiestnenie: sablony/moderna/src/stranky/Clanok.tsx
// Detail správy: redakčná hlavička, veľká fotka, text, zdieľanie,
// súvisiace správy a komentáre.
//
// Náhľad z administrácie (?nahlad=<id>) načíta aj nepublikovaný článok
// cez administrátorský endpoint - vtedy sa neukážu komentáre ani
// súvisiace správy.

import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { KomentarePodClankom, ObsahSFormularmi, sanitizeHtml } from '@clubw/jadro';
import { NenajdenyObsah } from './Nenajdena';
import {
  Chyba,
  Ikona,
  KartaClanku,
  Nacitava,
  Obrazok,
  datum,
  hlavickaPrihlasenia,
  useApi,
  useMetaPopis,
  useNenajdene,
  useTitulok,
  type Clanok as TypClanku,
} from '../spolocne';

/** Odhad času čítania podľa počtu slov (200 slov za minútu). */
const casCitania = (html?: string) => {
  const slova = (html ?? '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(slova / 200));
};

const Zdielanie: React.FC<{ nazov: string }> = ({ nazov }) => {
  const [skopirovane, setSkopirovane] = useState(false);
  const adresa = window.location.href.split('?')[0];
  const kopiruj = async () => {
    try {
      await navigator.clipboard.writeText(adresa);
      setSkopirovane(true);
      setTimeout(() => setSkopirovane(false), 2000);
    } catch {
      window.prompt('Skopírujte odkaz:', adresa);
    }
  };
  const zdielajNativne = () => navigator.share?.({ title: nazov, url: adresa }).catch(() => undefined);
  return (
    <div className="md-zdielanie">
      <span>Zdieľať</span>
      {typeof navigator.share === 'function' && (
        <button type="button" className="md-tlacidlo md-tlacidlo--sekundarne md-tlacidlo--male" onClick={zdielajNativne}>
          <Ikona nazov="zdielat" velkost={16} /> Zdieľať
        </button>
      )}
      <a
        className="md-tlacidlo md-tlacidlo--sekundarne md-tlacidlo--male"
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(adresa)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Facebook
      </a>
      <a
        className="md-tlacidlo md-tlacidlo--sekundarne md-tlacidlo--male"
        href={`https://x.com/intent/post?url=${encodeURIComponent(adresa)}&text=${encodeURIComponent(nazov)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        X
      </a>
      <button type="button" className="md-tlacidlo md-tlacidlo--sekundarne md-tlacidlo--male" onClick={kopiruj}>
        <Ikona nazov="odkaz" velkost={16} /> {skopirovane ? 'Skopírované' : 'Kopírovať odkaz'}
      </button>
    </div>
  );
};

const Clanok: React.FC = () => {
  const { slug = '' } = useParams();
  const nahladId = new URLSearchParams(window.location.search).get('nahlad');
  const clanok = useApi<TypClanku>(
    nahladId ? `/admin/articles/${encodeURIComponent(nahladId)}/preview` : `/articles/${encodeURIComponent(slug)}`,
    nahladId ? hlavickaPrihlasenia() : undefined
  );
  const c = clanok.data;
  const nenajdene = useNenajdene(!nahladId && clanok.stav === 404);
  const suvisiace = useApi<TypClanku[]>(c?.kategoria && !nahladId ? `/articles?category=${encodeURIComponent(c.kategoria.slug)}&limit=4` : null);

  useTitulok(c ? c.meta_title || c.nazov : null);
  useMetaPopis(c ? c.meta_description || c.excerpt : null);

  if (clanok.nacitava || nenajdene === 'overuje') return <Nacitava text="Načítavam správu…" />;
  if (nenajdene === 'ano') {
    return <NenajdenyObsah nadpis="Túto správu sme nenašli." text="Správa mohla byť presunutá alebo stiahnutá." spat={{ odkaz: '/clanky', text: 'Všetky správy' }} />;
  }
  if (nahladId && (clanok.stav === 401 || clanok.stav === 403)) {
    return (
      <div className="md-kontajner md-stranka">
        <Chyba text="Na náhľad nepublikovanej správy sa musíte prihlásiť do administrácie." />
      </div>
    );
  }
  if (clanok.chyba || !c) {
    return (
      <div className="md-kontajner md-stranka">
        <Chyba text={clanok.chyba || 'Správu sa nepodarilo načítať.'} />
      </div>
    );
  }

  const ostatne = (suvisiace.data ?? []).filter((x) => x.id !== c.id).slice(0, 3);

  return (
    <article className="md-clanok">
      {nahladId && <div className="md-nahlad-pruh">Náhľad z administrácie - návštevníci správu uvidia až po zverejnení.</div>}
      <header className="md-clanok__hlava md-kontajner">
        <Link to={c.kategoria ? `/clanky?rubrika=${c.kategoria.slug}` : '/clanky'} className="md-spat">
          <Ikona nazov="spat" /> {c.kategoria ? c.kategoria.nazov : 'Všetky správy'}
        </Link>
        <div className="md-clanok__meta">
          {c.kategoria && <span className="md-stitok">{c.kategoria.nazov}</span>}
          <span>{datum(c.publikovany_datum || c.vytvoreny)}</span>
          <span>{casCitania(c.obsah)} min čítania</span>
        </div>
        <h1>{c.nazov}</h1>
        {c.excerpt && <p className="md-clanok__perex">{c.excerpt}</p>}
        {c.autor && (
          <div className="md-clanok__autor">
            <span className="md-clanok__avatar" aria-hidden="true">
              {c.autor.meno
                .split(' ')
                .map((s) => s.charAt(0))
                .slice(0, 2)
                .join('')}
            </span>
            <span>
              <strong>{c.autor.meno}</strong>
              <small>Autor</small>
            </span>
          </div>
        )}
      </header>

      {c.obrazok && (
        <div className="md-clanok__fotka md-kontajner">
          <Obrazok src={c.obrazok} alt={c.nazov} />
        </div>
      )}

      <div className="md-clanok__telo md-kontajner">
        <ObsahSFormularmi html={sanitizeHtml(c.obsah ?? '')} className="md-text" />
        {!nahladId && <Zdielanie nazov={c.nazov} />}
      </div>

      {ostatne.length > 0 && (
        <section className="md-sekcia md-suvisiace" aria-labelledby="md-suvisiace">
          <div className="md-kontajner">
            <div className="md-sekcia__hlava">
              <div>
                <div className="md-stitok">Čítajte ďalej</div>
                <h2 id="md-suvisiace">Súvisiace správy.</h2>
              </div>
            </div>
            <div className="md-mriezka-clankov md-mriezka-clankov--3">
              {ostatne.map((x) => (
                <KartaClanku key={x.id} clanok={x} />
              ))}
            </div>
          </div>
        </section>
      )}

      {!nahladId && (
        <div className="md-komentare md-kontajner">
          <KomentarePodClankom clanokId={c.id} />
        </div>
      )}
    </article>
  );
};

export default Clanok;
