// Umiestnenie: sablony/stadion/src/Uvod.tsx
// Úvodná stránka šablóny Štadión: veľká fotka, odpočet do najbližšieho
// zápasu, posledný výsledok, aktuality, anketa a pás partnerov.

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnketaWeb, souborUrl, useData, useNastavenia, useNastaveniaSablony } from '@clubw/jadro';

interface Nastavenia extends Record<string, string | number | boolean | null> {
  uvodna_fotka: string | null;
  titulok_uvodu: string | null;
  podtitulok_uvodu: string | null;
  pocet_clankov: number;
  ukazat_partnerov: boolean;
  ukazat_anketu: boolean;
}

interface Clanok {
  id: number;
  nazov: string;
  slug: string;
  excerpt?: string | null;
  obrazok?: string | null;
  publikovany_datum?: string | null;
  vytvoreny: string;
  kategoria?: { nazov: string } | null;
}

interface Zapas {
  id: number;
  datum_cas: string;
  domaci_tim_nazov?: string;
  hostujuci_tim_nazov?: string;
  goly_domaci?: number | null;
  goly_hostia?: number | null;
  liga_nazov?: string | null;
  miesto?: string | null;
}

interface Partner {
  id: number;
  nazov: string;
  logo: string | null;
  web_url: string | null;
}

const datum = (d?: string | null) => (d ? new Date(d).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long' }) : '');

/** Zostávajúci čas do výkopu, obnovuje sa každú minútu. */
const Odpocet: React.FC<{ kedy: string }> = ({ kedy }) => {
  const [teraz, setTeraz] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setTeraz(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const zostava = Math.max(0, new Date(kedy).getTime() - teraz);
  const dni = Math.floor(zostava / 86_400_000);
  const hodiny = Math.floor((zostava % 86_400_000) / 3_600_000);
  const minuty = Math.floor((zostava % 3_600_000) / 60_000);
  return (
    <div className="st-odpocet" aria-label={`Do výkopu zostáva ${dni} dní, ${hodiny} hodín a ${minuty} minút`}>
      {[
        [dni, 'dní'],
        [hodiny, 'hod'],
        [minuty, 'min'],
      ].map(([cislo, popis]) => (
        <span key={popis as string}>
          <strong>{String(cislo).padStart(2, '0')}</strong>
          <small>{popis}</small>
        </span>
      ))}
    </div>
  );
};

const Uvod: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const s = useNastaveniaSablony<Nastavenia>();
  const pocet = Math.min(Math.max(Number(s.pocet_clankov) || 4, 2), 9);

  const clanky = useData<Clanok[]>(`/articles?limit=${pocet}`);
  const buduce = useData<Zapas[]>(`/matches?status=naplanovany&od_datumu=${new Date().toISOString().slice(0, 10)}&limit=50`);
  const vysledky = useData<Zapas[]>('/matches?status=ukonceny&limit=1');
  const partneri = useData<Partner[]>(s.ukazat_partnerov ? '/sponsors?limit=30' : null);

  const najblizsi = [...(buduce.data ?? [])].sort((a, b) => a.datum_cas.localeCompare(b.datum_cas))[0];
  const posledny = vysledky.data?.[0];
  const [hlavny, ...ostatne] = clanky.data ?? [];

  return (
    <div className="st-uvod">
      <section
        className={`st-hero${s.uvodna_fotka ? ' st-hero--fotka' : ''}`}
        style={s.uvodna_fotka ? { backgroundImage: `url("${souborUrl(s.uvodna_fotka)}")` } : undefined}
      >
        <div className="st-hero__obsah">
          <h1>{s.titulok_uvodu || nastavenia.nazov}</h1>
          {(s.podtitulok_uvodu || nastavenia.slogan) && <p>{s.podtitulok_uvodu || nastavenia.slogan}</p>}
        </div>

        {najblizsi && (
          <Link to={`/matches/${najblizsi.id}`} className="st-zapas-karta">
            <span className="st-stitok">Najbližší zápas</span>
            <span className="st-zapas-karta__timy">
              {najblizsi.domaci_tim_nazov} <em>vs</em> {najblizsi.hostujuci_tim_nazov}
            </span>
            <span className="st-zapas-karta__info">
              {new Date(najblizsi.datum_cas).toLocaleString('sk-SK', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {najblizsi.miesto && ` · ${najblizsi.miesto}`}
            </span>
            <Odpocet kedy={najblizsi.datum_cas} />
          </Link>
        )}
      </section>

      {posledny && (
        <Link to={`/matches/${posledny.id}`} className="st-vysledok">
          <span className="st-stitok">Posledný výsledok</span>
          <span className="st-vysledok__tim">{posledny.domaci_tim_nazov}</span>
          <span className="st-vysledok__skore">
            {posledny.goly_domaci ?? '-'} : {posledny.goly_hostia ?? '-'}
          </span>
          <span className="st-vysledok__tim">{posledny.hostujuci_tim_nazov}</span>
          <span className="st-vysledok__datum">
            {datum(posledny.datum_cas)}
            {posledny.liga_nazov && ` · ${posledny.liga_nazov}`}
          </span>
        </Link>
      )}

      <div className="st-sekcia">
        <div className="st-sekcia__hlava">
          <h2>Aktuality</h2>
          <Link to="/clanky">Všetky správy</Link>
        </div>
        {clanky.nacitava ? (
          <p className="st-prazdne">Načítavam...</p>
        ) : !hlavny ? (
          <p className="st-prazdne">Zatiaľ žiadne správy.</p>
        ) : (
          <div className="st-clanky">
            <Link to={`/clanek/${hlavny.slug}`} className="st-clanok st-clanok--hlavny">
              {hlavny.obrazok && <img src={souborUrl(hlavny.obrazok)} alt="" loading="lazy" />}
              <div className="st-clanok__text">
                {hlavny.kategoria?.nazov && <span className="st-stitok">{hlavny.kategoria.nazov}</span>}
                <h3>{hlavny.nazov}</h3>
                {hlavny.excerpt && <p>{hlavny.excerpt}</p>}
                <small>{datum(hlavny.publikovany_datum || hlavny.vytvoreny)}</small>
              </div>
            </Link>
            <div className="st-clanky__zoznam">
              {ostatne.map((c) => (
                <Link key={c.id} to={`/clanek/${c.slug}`} className="st-clanok">
                  {c.obrazok ? <img src={souborUrl(c.obrazok)} alt="" loading="lazy" /> : <span className="st-clanok__nahrada" aria-hidden="true" />}
                  <div className="st-clanok__text">
                    <h3>{c.nazov}</h3>
                    <small>{datum(c.publikovany_datum || c.vytvoreny)}</small>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {s.ukazat_anketu && (
        <div className="st-sekcia st-sekcia--anketa">
          <AnketaWeb najnovsia />
        </div>
      )}

      {s.ukazat_partnerov && (partneri.data ?? []).length > 0 && (
        <div className="st-partneri">
          <h2>Partneri klubu</h2>
          <div className="st-partneri__loga">
            {partneri.data!.map((p) => {
              const obsah = p.logo ? <img src={souborUrl(p.logo)} alt={p.nazov} loading="lazy" /> : <span>{p.nazov}</span>;
              return p.web_url ? (
                <a key={p.id} href={p.web_url} target="_blank" rel="noopener noreferrer" title={p.nazov}>
                  {obsah}
                </a>
              ) : (
                <span key={p.id} title={p.nazov}>
                  {obsah}
                </span>
              );
            })}
          </div>
          <Link to="/sponzori" className="st-partneri__odkaz">
            Všetci partneri
          </Link>
        </div>
      )}
    </div>
  );
};

export default Uvod;
