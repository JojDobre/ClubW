// Umiestnenie: license-server/admin/src/stranky/Licencie.tsx
// Zoznam licencií s filtrami, hľadaním a exportom; nová licencia.

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, parametre, type Licencia, type Produkt } from '../api';
import { ChybaStav, HlavickaStranky, Ikona, Nacitava, Prazdne, Stitok, Strankovanie, Tlacidlo, Vyber, useNacitaj } from '../komponenty';
import { STAVY_LICENCIE, datum, predCasom, sklon } from '../formaty';
import NovaLicencia from './NovaLicencia';

const FILTRE_STAVU = [
  { hodnota: '', popis: 'Všetky' },
  { hodnota: 'aktivna', popis: 'Aktívne' },
  { hodnota: 'vyprsi', popis: 'Vyprší do 30 dní' },
  { hodnota: 'vyprsana', popis: 'Vypršané' },
  { hodnota: 'pozastavena', popis: 'Pozastavené' },
  { hodnota: 'zrusena', popis: 'Zrušené' },
  { hodnota: 'online', popis: 'Online' },
  { hodnota: 'offline', popis: 'Offline' },
];

const Licencie: React.FC = () => {
  const [q, setQ] = useSearchParams();
  const navigate = useNavigate();
  const [hladat, setHladat] = useState(q.get('hladat') ?? '');
  const [nova, setNova] = useState(false);
  const stav = q.get('stav') ?? '';
  const produktId = q.get('produkt_id') ?? '';
  const poradie = q.get('poradie') ?? 'vytvorenie';
  const strana = Number(q.get('strana') ?? 1);

  const nastav = (zmeny: Record<string, string>) => {
    const nove = new URLSearchParams(q);
    for (const [k, v] of Object.entries(zmeny)) (v ? nove.set(k, v) : nove.delete(k));
    if (!('strana' in zmeny)) nove.delete('strana');
    setQ(nove, { replace: true });
  };

  useEffect(() => {
    const t = setTimeout(() => hladat !== (q.get('hladat') ?? '') && nastav({ hladat: hladat.trim() }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hladat]);

  const produkty = useNacitaj((s) => api.get<Produkt[]>('/produkty', s).then((r) => r.data), []);
  const filtre = { stav, produkt_id: produktId, hladat: q.get('hladat') ?? '', poradie, strana, limit: 50 };
  const licencie = useNacitaj((s) => api.get<Licencia[]>(`/licencie${parametre(filtre)}`, s), [q.toString()]);

  return (
    <div className="stranka">
      <HlavickaStranky
        nadpis="Licencie"
        popis="Všetky licencie všetkých produktov."
        akcie={
          <>
            <a className="tlacidlo tlacidlo--sekundarne" href={`/api/sprava/licencie/export.csv${parametre({ ...filtre, strana: undefined, limit: undefined })}`}>
              <Ikona nazov="stiahnut" velkost={16} /> Export CSV
            </a>
            <Tlacidlo variant="primarne" ikona="plus" onClick={() => setNova(true)}>
              Nová licencia
            </Tlacidlo>
          </>
        }
      />

      <div className="nastroje">
        <label className="hladanie">
          <Ikona nazov="hladat" velkost={16} />
          <input type="search" value={hladat} onChange={(e) => setHladat(e.target.value)} placeholder="Klient, e-mail, doména, kľúč…" aria-label="Hľadať" />
        </label>
        <Vyber
          value={produktId}
          onChange={(e) => nastav({ produkt_id: e.target.value })}
          prazdna="Všetky produkty"
          moznosti={(produkty.data ?? []).map((p) => ({ hodnota: p.id, popis: p.nazov }))}
        />
        <Vyber
          value={poradie}
          onChange={(e) => nastav({ poradie: e.target.value })}
          moznosti={[
            { hodnota: 'vytvorenie', popis: 'Najnovšie' },
            { hodnota: 'platnost', popis: 'Podľa konca platnosti' },
            { hodnota: 'nazov', popis: 'Podľa názvu' },
            { hodnota: 'kontakt', popis: 'Podľa posledného kontaktu' },
          ]}
        />
      </div>
      <div className="cipy" role="group" aria-label="Stav">
        {FILTRE_STAVU.map((f) => (
          <button key={f.hodnota} type="button" className={`cip${stav === f.hodnota ? ' is-aktivny' : ''}`} onClick={() => nastav({ stav: f.hodnota })}>
            {f.popis}
          </button>
        ))}
      </div>

      {licencie.chyba ? (
        <ChybaStav text={licencie.chyba} onZnova={licencie.obnov} />
      ) : licencie.nacitava && !licencie.data ? (
        <Nacitava />
      ) : (licencie.data?.data ?? []).length === 0 ? (
        <Prazdne nadpis="Žiadne licencie" text={stav || filtre.hladat || produktId ? 'Skúste zmeniť filtre.' : 'Vytvorte prvú licenciu tlačidlom Nová licencia.'} />
      ) : (
        <>
          <div className="tabulka-obal">
            <table className="tabulka tabulka--klikatelna tabulka--karty">
              <thead>
                <tr>
                  <th>Klient</th>
                  <th>Produkt</th>
                  <th>Doména</th>
                  <th>Stav</th>
                  <th>Platná do</th>
                  <th>Verzia</th>
                  <th>Posledný kontakt</th>
                </tr>
              </thead>
              <tbody>
                {licencie.data!.data.map((l) => {
                  const s = STAVY_LICENCIE[l.vypocitany_stav];
                  return (
                    <tr key={l.id} onClick={() => navigate(`/licencie/${l.id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/licencie/${l.id}`)}>
                      <td>
                        <strong>{l.nazov_klienta}</strong>
                        <small className="mono">{l.kluc}</small>
                      </td>
                      <td data-popis="Produkt">
                        {l.produkt?.nazov}
                        <small>{l.plan}</small>
                      </td>
                      <td data-popis="Doména">{l.domena ?? <span className="tlmene">ľubovoľná</span>}</td>
                      <td data-popis="Stav">
                        <Stitok ton={s.ton}>{s.nazov}</Stitok>
                      </td>
                      <td data-popis="Platná do">
                        {datum(l.platna_do)}
                        {l.vypocitany_stav === 'aktivna' && l.dni_do_vyprsania <= 30 && (
                          <small className="text-oranzova">
                            o {l.dni_do_vyprsania} {sklon(l.dni_do_vyprsania, 'deň', 'dni', 'dní')}
                          </small>
                        )}
                      </td>
                      <td data-popis="Verzia" className="mono">{l.nainstalovana_verzia ?? '—'}</td>
                      <td data-popis="Posledný kontakt">
                        <Stitok ton={l.online ? 'zelena' : 'seda'} bodka>
                          {predCasom(l.posledna_kontrola)}
                        </Stitok>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {licencie.data?.strankovanie && <Strankovanie {...licencie.data.strankovanie} onZmena={(s) => nastav({ strana: String(s) })} />}
        </>
      )}

      {nova && (
        <NovaLicencia
          produkty={produkty.data ?? []}
          onZavriet={() => setNova(false)}
          onVytvorena={(l) => {
            setNova(false);
            navigate(`/licencie/${l.id}`, { state: { nova: true } });
          }}
        />
      )}
    </div>
  );
};

export default Licencie;
