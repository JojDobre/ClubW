// Umiestnenie: sablony/zakladna/src/stranky/Matches.tsx
// Zoznam zápasov - program, výsledky a práve hrané zápasy po mesiacoch,
// s filtrom podľa stavu a súťaže a vyhľadávaním. Na PC riadok ako
// výsledková tabuľa, na mobile kompaktný zoznam v jednej karte mesiaca.

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData, useTeraz, useZivaObnova, zivaMinuta } from '@clubw/jadro';
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
import { HlavickaStranky } from '../casti';
import { zaKolko } from '../spolocne';
import './Matches.css';

type Filter = 'vsetky' | 'program' | 'vysledky' | 'zivo';

const FILTRE: Array<[Filter, string]> = [
  ['vsetky', 'Všetky'],
  ['program', 'Program'],
  ['vysledky', 'Výsledky'],
  ['zivo', 'Naživo'],
];

const mesiac = (d: string) => new Date(d).toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' });

/** Spoločné údaje pre riadok zápasu: stav, skóre, výsledok z pohľadu klubu, minúta. */
const infoZapasu = (z: ZapasZakladny, teraz: number) => {
  const stav = stavZapasu(z);
  const skore = maVysledok(z) && (stav === 'ukonceny' || stav === 'prebieha');
  const nasDomaci = Boolean(z.domaci_tim_id);
  const nasHostia = Boolean(z.hostujuci_tim_id);
  let vysledok: 'V' | 'R' | 'P' | null = null;
  if (skore && stav === 'ukonceny' && (nasDomaci || nasHostia) && !(nasDomaci && nasHostia)) {
    const my = nasDomaci ? z.goly_domaci! : z.goly_hostia!;
    const oni = nasDomaci ? z.goly_hostia! : z.goly_domaci!;
    vysledok = my > oni ? 'V' : my < oni ? 'P' : 'R';
  }
  const minuta = stav === 'prebieha' ? zivaMinuta(z, teraz) : null;
  const sutaz = nazovSutaze(z);
  return { stav, skore, vysledok, minuta, sutaz };
};

const NAZVY_VYSLEDKOV = { V: 'Výhra', R: 'Remíza', P: 'Prehra' } as const;

/** Štítok stavu len tam, kde nesie informáciu (naživo, odložený, zrušený). */
const StavZapasu: React.FC<{ stav: string; minuta: string | null }> = ({ stav, minuta }) =>
  stav === 'prebieha' ? (
    <span className="zk-live">
      <i aria-hidden="true" /> {minuta || 'Naživo'}
    </span>
  ) : stav === 'odlozeny' || stav === 'zruseny' ? (
    <span className={`zk-stav zk-stav--${stav}`}>{STAVY[stav]}</span>
  ) : null;

/** Na PC: riadok ako výsledková tabuľa - dátum, domáci, skóre, hostia, súťaž a miesto. */
const RiadokA: React.FC<{ z: ZapasZakladny; teraz: number }> = ({ z, teraz }) => {
  const { stav, skore, vysledok, minuta, sutaz } = infoZapasu(z, teraz);
  return (
    <Link to={`/matches/${z.id}`} className={`zk-zr is-${stav}${vysledok ? ` je-${vysledok}` : ''}`}>
      <span className="zk-zr__datum">
        <strong>
          {den(z.datum_cas)} {denCislo(z.datum_cas)}
        </strong>
        <small>{cas(z.datum_cas)}</small>
      </span>
      <span className="zk-zr__tim zk-zr__tim--domaci">
        <span className="zk-zr__nazov">{nazovStrany(z, 'domaci')}</span>
        <ErbTimu z={z} strana="domaci" />
      </span>
      <span className="zk-zr__skore">
        {skore ? (
          <>
            <b>{z.goly_domaci}</b>
            <i>:</i>
            <b>{z.goly_hostia}</b>
          </>
        ) : stav === 'ukonceny' ? (
          <em>–:–</em>
        ) : (
          <em>{cas(z.datum_cas)}</em>
        )}
      </span>
      <span className="zk-zr__tim zk-zr__tim--hostia">
        <ErbTimu z={z} strana="hostia" />
        <span className="zk-zr__nazov">{nazovStrany(z, 'hostia')}</span>
      </span>
      <span className="zk-zr__info">
        <StavZapasu stav={stav} minuta={minuta} />
        {vysledok && <span className={`zk-vrp zk-vrp--${vysledok}`} title={NAZVY_VYSLEDKOV[vysledok]}>{vysledok}</span>}
        {sutaz && <span className="zk-zr__sutaz">{sutaz}</span>}
        {z.miesto && (
          <span className="zk-zr__miesto">
            <Ikona nazov="miesto" /> {z.miesto}
          </span>
        )}
      </span>
    </Link>
  );
};

/** Na mobile: kompaktný riadok v jednej karte mesiaca - tímy pod sebou, skóre vpravo. */
const RiadokB: React.FC<{ z: ZapasZakladny; teraz: number }> = ({ z, teraz }) => {
  const { stav, skore, vysledok, minuta, sutaz } = infoZapasu(z, teraz);
  return (
    <Link to={`/matches/${z.id}`} className={`zk-zk is-${stav}`}>
      <span className="zk-zk__datum">
        <small>{den(z.datum_cas)}</small>
        <strong>{denCislo(z.datum_cas)}</strong>
        <small>{cas(z.datum_cas)}</small>
      </span>
      <span className="zk-zk__timy">
        {(['domaci', 'hostia'] as const).map((strana) => (
          <span key={strana} className="zk-zk__tim">
            <ErbTimu z={z} strana={strana} />
            <span className="zk-zk__nazov">{nazovStrany(z, strana)}</span>
            <b className="zk-zk__gol">{skore ? (strana === 'domaci' ? z.goly_domaci : z.goly_hostia) : stav === 'ukonceny' ? '–' : ''}</b>
          </span>
        ))}
        {(sutaz || z.miesto) && <span className="zk-zk__sutaz">{[sutaz, z.miesto].filter(Boolean).join(' · ')}</span>}
      </span>
      <span className="zk-zk__stav">
        <StavZapasu stav={stav} minuta={minuta} />
        {vysledok ? (
          <span className={`zk-vrp zk-vrp--${vysledok}`} title={NAZVY_VYSLEDKOV[vysledok]}>
            {vysledok}
          </span>
        ) : !skore && stav === 'naplanovany' ? (
          <span className="zk-zk__za">{zaKolko(z.datum_cas) || cas(z.datum_cas)}</span>
        ) : null}
        <Ikona nazov="sipka" className="zk-zk__sipka" />
      </span>
    </Link>
  );
};

const Matches: React.FC = () => {
  const [filter, setFilter] = useState<Filter>('vsetky');
  const [liga, setLiga] = useState('');
  const [hladat, setHladat] = useState('');
  useTitulok('Zápasy');
  const teraz = useTeraz();

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
    <>
      <HlavickaStranky stitok="Sezóna" nadpis="Zápasy">
        <p className="zs-hlava__popis">Program, výsledky a zápasy, ktoré sa práve hrajú.</p>
      </HlavickaStranky>
      <div className="zk-stranka zk-stranka--pod-hlavou">
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
                {/* Riadok pre PC aj pre mobil - zobrazí sa len ten, ktorý sedí na šírku */}
                {sk.zapasy.map((z) => (
                  <React.Fragment key={z.id}>
                    <RiadokA z={z} teraz={teraz} />
                    <RiadokB z={z} teraz={teraz} />
                  </React.Fragment>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
};

export default Matches;
