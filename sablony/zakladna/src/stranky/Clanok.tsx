// Umiestnenie: sablony/zakladna/src/stranky/Clanok.tsx
// Detail článku v štýle Základnej: tmavá hlavička s rubrikou, nadpisom
// a autorom, veľká fotka, text v úzkom stĺpci, zdieľanie, súvisiace
// novinky (karty ako v Novinkách) a komentáre.
//
// Náhľad z administrácie (?nahlad=<id>) načíta aj nepublikovaný článok -
// vtedy sa neukážu komentáre ani súvisiace novinky.

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { KomentarePodClankom, ObsahSFormularmi, sanitizeHtml } from '@clubw/jadro';
import { NenajdenyObsah } from './Nenajdena';
import { ChybaStranky, HlavickaStranky, KartaClanku, Nacitava, Obrazok, Sekcia } from '../casti';
import {
  Ikona,
  NadpisSekcie,
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
  return (
    <div className="zs-zdielanie">
      <span className="zs-zdielanie__nadpis">Zdieľať</span>
      {typeof navigator.share === 'function' && (
        <button type="button" className="zs-zdielanie__tlacidlo" onClick={() => navigator.share?.({ title: nazov, url: adresa }).catch(() => undefined)}>
          <Ikona nazov="zdielat" velkost={15} /> Zdieľať
        </button>
      )}
      <a className="zs-zdielanie__tlacidlo" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(adresa)}`} target="_blank" rel="noopener noreferrer">
        Facebook
      </a>
      <a
        className="zs-zdielanie__tlacidlo"
        href={`https://x.com/intent/post?url=${encodeURIComponent(adresa)}&text=${encodeURIComponent(nazov)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        X
      </a>
      <button type="button" className="zs-zdielanie__tlacidlo" onClick={kopiruj}>
        <Ikona nazov="odkaz" velkost={15} /> {skopirovane ? 'Skopírované' : 'Kopírovať odkaz'}
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
  const suvisiace = useApi<TypClanku[]>(
    c && !nahladId ? `/articles?limit=4${c.kategoria ? `&category=${encodeURIComponent(c.kategoria.slug)}` : ''}` : null
  );

  useTitulok(c ? c.meta_title || c.nazov : null);
  useMetaPopis(c ? c.meta_description || c.excerpt : null);

  if (clanok.nacitava || nenajdene === 'overuje') return <Nacitava text="Načítavam článok…" />;
  if (nenajdene === 'ano') {
    return <NenajdenyObsah nadpis="Tento článok sme nenašli" text="Článok mohol byť presunutý alebo stiahnutý." spat={{ odkaz: '/clanky', text: 'Všetky novinky' }} />;
  }
  if (nahladId && (clanok.stav === 401 || clanok.stav === 403)) {
    return <ChybaStranky text="Na náhľad nepublikovaného článku sa musíte prihlásiť do administrácie." />;
  }
  if (clanok.chyba || !c) return <ChybaStranky text={clanok.chyba || 'Článok sa nepodarilo načítať.'} />;

  const ostatne = (suvisiace.data ?? []).filter((x) => x.id !== c.id).slice(0, 3);

  return (
    <article className="zs-stranka zs-clanok-detail">
      {nahladId && <div className="zs-nahlad-pruh">Náhľad z administrácie - návštevníci článok uvidia až po zverejnení.</div>}
      <HlavickaStranky
        className="zs-hlava--clanok"
        stitok={c.kategoria?.nazov ?? 'Novinky'}
        nadpis={c.nazov}
        spat={{ odkaz: c.kategoria ? `/clanky?rubrika=${c.kategoria.slug}` : '/clanky', text: 'Novinky' }}
      >
        <div className="zs-hlava__meta">
          <span>{datum(c.publikovany_datum || c.vytvoreny)}</span>
          {c.autor && (
            <span>
              Autor <strong>{c.autor.meno}</strong>
            </span>
          )}
          <span>{casCitania(c.obsah)} min čítania</span>
        </div>
      </HlavickaStranky>

      {c.obrazok && (
        <div className="zs-clanok-detail__fotka">
          <Obrazok src={c.obrazok} alt={c.nazov} className="zs-clanok-detail__obrazok" />
        </div>
      )}

      <div className={`zs-clanok-detail__telo${c.obrazok ? '' : ' zs-clanok-detail__telo--bez-fotky'}`}>
        {c.excerpt && <p className="zs-clanok-detail__perex">{c.excerpt}</p>}
        <ObsahSFormularmi html={sanitizeHtml(c.obsah ?? '')} className="zs-text" />
        {!nahladId && <Zdielanie nazov={c.nazov} />}
      </div>

      {ostatne.length > 0 && (
        <Sekcia className="zs-sekcia--suvisiace zs-sekcia--siva">
          <NadpisSekcie nadpis="Súvisiace novinky" odkaz={c.kategoria ? `/clanky?rubrika=${c.kategoria.slug}` : '/clanky'} />
          <div className="zs-mriezka-3 zs-mriezka-3--karty zs-pas-mobil">
            {ostatne.map((x) => (
              <KartaClanku key={x.id} clanok={x} />
            ))}
          </div>
        </Sekcia>
      )}

      {!nahladId && (
        <div className="zs-komentare">
          <KomentarePodClankom clanokId={c.id} />
        </div>
      )}
    </article>
  );
};

export default Clanok;
