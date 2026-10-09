// Umiestnenie: sablony/zakladna/src/stranky/Matches.tsx
// Zoznam zápasov - program, výsledky a práve hrané zápasy po mesiacoch,
// s filtrom podľa stavu a súťaže a vyhľadávaním.

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData, useZivaObnova } from '@clubw/jadro';
import { Ikona } from '../ikony';
import {
  ErbTimu,
  STAVY,
  cas,
  den,
  denCislo,
  maVysledok,
  nazovStrany,
  nazovSutaze,
  stavZapasu,
  useTitulok,
  type ZapasZakladny,
} from '../zapasy';
import './Matches.css';

type Filter = 'vsetky' | 'program' | 'vysledky' | 'zivo';

const FILTRE: Array<[Filter, string]> = [
  ['vsetky', 'Všetky'],
  ['program', 'Program'],
  ['vysledky', 'Výsledky'],
  ['zivo', 'Naživo'],
];

const mesiac = (d: string) => new Date(d).toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' });

export const RiadokZapasuZoznamu: React.FC<{ z: ZapasZakladny }> = ({ z }) => {
  const stav = stavZapasu(z);
  const skore = maVysledok(z) && (stav === 'ukonceny' || stav === 'prebieha');
  return (
    <Link to={`/matches/${z.id}`} className={`zk-zapas-riadok is-${stav}`}>
      <span className="zk-zapas-riadok__datum">
        <small>{den(z.datum_cas)}</small>
        <strong>{denCislo(z.datum_cas)}</strong>
        <small>{cas(z.datum_cas)}</small>
      </span>
      <span className="zk-zapas-riadok__info">
        <span className="zk-zapas-riadok__meta">
          {stav === 'prebieha' ? (
            <span className="zk-live">
              <i aria-hidden="true" /> Naživo
            </span>
          ) : (
            <span className={`zk-stav zk-stav--${stav}`}>{STAVY[stav] ?? stav}</span>
          )}
          {nazovSutaze(z) && <span>{nazovSutaze(z)}</span>}
        </span>
        <span className="zk-zapas-riadok__timy">
          <span className="zk-zapas-riadok__tim">
            <span>{nazovStrany(z, 'domaci')}</span>
            <ErbTimu z={z} strana="domaci" />
          </span>
          <span className={`zk-zapas-riadok__stred${skore ? ' ma-skore' : ''}`}>
            {skore ? (
              <>
                {z.goly_domaci}
                <i>:</i>
                {z.goly_hostia}
              </>
            ) : (
              'vs'
            )}
          </span>
          <span className="zk-zapas-riadok__tim zk-zapas-riadok__tim--hostia">
            <ErbTimu z={z} strana="hostia" />
            <span>{nazovStrany(z, 'hostia')}</span>
          </span>
        </span>
        {z.miesto && (
          <span className="zk-zapas-riadok__miesto">
            <Ikona nazov="miesto" /> {z.miesto}
          </span>
        )}
      </span>
      <Ikona nazov="sipka" className="zk-zapas-riadok__sipka" />
    </Link>
  );
};

const Matches: React.FC = () => {
  const [filter, setFilter] = useState<Filter>('vsetky');
  const [liga, setLiga] = useState('');
  const [hladat, setHladat] = useState('');
  useTitulok('Zápasy');

  const [zivy, setZivy] = useState(false);
  const tik = useZivaObnova(zivy);
  const zapasy = useData<ZapasZakladny[]>(`/matches?limit=500${tik ? `&t=${tik}` : ''}`);
  const vsetky = zapasy.data ?? [];
  const jeZivy = vsetky.some((z) => z.status === 'prebieha');
  useEffect(() => setZivy(jeZivy), [jeZivy]);

  const sutaze = useMemo(
    () => [...new Set(vsetky.map((z) => z.liga_display_name || z.liga_nazov).filter((x): x is string => Boolean(x)))].sort((a, b) => a.localeCompare(b, 'sk')),
    [vsetky]
  );

  const pocty = useMemo(() => {
    const p = { vsetky: vsetky.length, program: 0, vysledky: 0, zivo: 0 };
    vsetky.forEach((z) => {
      const s = stavZapasu(z);
      if (s === 'prebieha') p.zivo += 1;
      else if (s === 'ukonceny') p.vysledky += 1;
      else if (s === 'naplanovany' || s === 'odlozeny') p.program += 1;
    });
    return p;
  }, [vsetky]);

  const hladane = hladat.trim().toLocaleLowerCase('sk');
  const vybrane = vsetky
    .filter((z) => {
      const s = stavZapasu(z);
      if (filter === 'program' && s !== 'naplanovany' && s !== 'odlozeny') return false;
      if (filter === 'vysledky' && s !== 'ukonceny') return false;
      if (filter === 'zivo' && s !== 'prebieha') return false;
      if (liga && (z.liga_display_name || z.liga_nazov) !== liga) return false;
      if (hladane) {
        const text = [nazovStrany(z, 'domaci'), nazovStrany(z, 'hostia'), z.miesto, z.liga_nazov].join(' ').toLocaleLowerCase('sk');
        if (!text.includes(hladane)) return false;
      }
      return true;
    })
    // Program od najbližšieho, výsledky od najnovšieho
    .sort((a, b) => (filter === 'program' ? a.datum_cas.localeCompare(b.datum_cas) : b.datum_cas.localeCompare(a.datum_cas)));

  const skupiny: Array<{ mesiac: string; zapasy: ZapasZakladny[] }> = [];
  vybrane.forEach((z) => {
    const m = mesiac(z.datum_cas);
    const posledna = skupiny[skupiny.length - 1];
    if (posledna?.mesiac === m) posledna.zapasy.push(z);
    else skupiny.push({ mesiac: m, zapasy: [z] });
  });

  return (
    <div className="zk-stranka">
      <header className="zk-stranka__hlava">
        <span className="zk-stranka__stitok">Sezóna</span>
        <h1>Zápasy</h1>
        <p>Program, výsledky a zápasy, ktoré sa práve hrajú.</p>
      </header>

      <div className="zk-zapasy-filtre">
        <div className="zk-cipy" role="tablist" aria-label="Zobraziť zápasy">
          {FILTRE.filter(([k]) => k !== 'zivo' || pocty.zivo > 0).map(([k, nazov]) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} className={`zk-cip${filter === k ? ' is-aktivny' : ''}`} onClick={() => setFilter(k)}>
              {nazov}
              <span>{pocty[k]}</span>
            </button>
          ))}
        </div>
        <div className="zk-zapasy-filtre__polia">
          {sutaze.length > 1 && (
            <select value={liga} onChange={(e) => setLiga(e.target.value)} className="zk-pole" aria-label="Súťaž">
              <option value="">Všetky súťaže</option>
              {sutaze.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          <label className="zk-pole zk-pole--hladat">
            <Ikona nazov="hladat" />
            <input type="search" value={hladat} onChange={(e) => setHladat(e.target.value)} placeholder="Hľadať tím alebo miesto" aria-label="Hľadať zápas" />
          </label>
        </div>
      </div>

      {zapasy.nacitava && !zapasy.data ? (
        <div className="zk-nacitavanie" role="status">
          <span className="zk-nacitavanie__kruh" aria-hidden="true" />
          Načítavam zápasy...
        </div>
      ) : zapasy.chyba ? (
        <p className="zk-prazdne">Zápasy sa nepodarilo načítať. Skúste obnoviť stránku.</p>
      ) : vybrane.length === 0 ? (
        <p className="zk-prazdne">Žiadne zápasy nezodpovedajú výberu.</p>
      ) : (
        skupiny.map((sk) => (
          <section key={sk.mesiac} className="zk-zapasy-mesiac">
            <h2>{sk.mesiac}</h2>
            <div className="zk-zapasy-zoznam">
              {sk.zapasy.map((z) => (
                <RiadokZapasuZoznamu key={z.id} z={z} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
};

export default Matches;
