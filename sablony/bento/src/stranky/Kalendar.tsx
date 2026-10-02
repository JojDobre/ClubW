// Umiestnenie: sablony/bento/src/stranky/Kalendar.tsx
// Kalendár klubu: zápasy a udalosti (tréningy, stretnutia) v mesiaci.
// Ovládanie mesiaca v tmavej hlavičke, na desktope mesačná mriežka
// s tmavým riadkom dní (ako tabuľky v šablóne), na mobile zoznam dní.

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HlavickaStranky, Nacitava, Prazdne, Sekcia } from '../casti';
import { Ikona, mesiacRok, useApi, useTitulok, useUpravy } from '../spolocne';

interface ZapasKalendara {
  id: number;
  nazov: string;
  datum_cas: string;
  status: string;
  vysledok: string;
  cas: string;
  liga?: { nazov: string } | null;
}

interface Udalost {
  id: number;
  nazov: string;
  datum_vyskytu: string;
  cas_od: string | null;
  miesto: string | null;
  farba: string | null;
  tim?: { nazov: string; farba: string | null } | null;
}

interface Polozka {
  kluc: string;
  cas: string;
  nazov: string;
  doplnok: string | null;
  zapas: ZapasKalendara | null;
  farba: string | null;
}

const DNI = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];
const DNI_DLHE = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const PolozkaKalendara: React.FC<{ p: Polozka; kompaktna?: boolean }> = ({ p, kompaktna }) => {
  const obsah = (
    <>
      {p.cas && <span className="db-kal-polozka__cas">{p.cas}</span>}
      <span className="db-kal-polozka__nazov">{p.nazov}</span>
      {!kompaktna && p.doplnok && <small>{p.doplnok}</small>}
    </>
  );
  const style = p.farba ? ({ '--db-farba-udalosti': p.farba } as React.CSSProperties) : undefined;
  return p.zapas ? (
    <Link to={`/matches/${p.zapas.id}`} className="db-kal-polozka db-kal-polozka--zapas" title={p.nazov}>
      {obsah}
    </Link>
  ) : (
    <span className="db-kal-polozka" style={style} title={p.nazov}>
      {obsah}
    </span>
  );
};

const Kalendar: React.FC = () => {
  const u = useUpravy();
  const [mesiac, setMesiac] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  useTitulok('Kalendár');

  const rok = mesiac.getFullYear();
  const cisloMesiaca = mesiac.getMonth() + 1;
  const prvy = iso(mesiac);
  const posledny = iso(new Date(rok, cisloMesiaca, 0));
  const zapasy = useApi<{ calendar: Record<string, ZapasKalendara[]> }>(`/calendar/month/${rok}/${cisloMesiaca}`);
  const udalosti = useApi<Udalost[]>(`/calendar/events?od=${prvy}&do=${posledny}`);

  // Všetko do jedného slovníka podľa dňa (RRRR-MM-DD)
  const podlaDna = useMemo(() => {
    const mapa = new Map<string, Polozka[]>();
    const pridaj = (den: string, p: Polozka) => mapa.set(den, [...(mapa.get(den) ?? []), p]);
    for (const zoznam of Object.values(zapasy.data?.calendar ?? {})) {
      for (const z of zoznam) {
        pridaj(iso(new Date(z.datum_cas)), {
          kluc: `z${z.id}`,
          cas: z.cas,
          nazov: z.nazov,
          doplnok: z.status === 'ukonceny' && z.vysledok && z.vysledok !== '-:-' ? z.vysledok : z.liga?.nazov ?? null,
          zapas: z,
          farba: null,
        });
      }
    }
    for (const u of udalosti.data ?? []) {
      pridaj(u.datum_vyskytu, {
        kluc: `u${u.id}-${u.datum_vyskytu}`,
        cas: u.cas_od ? u.cas_od.slice(0, 5) : '',
        nazov: u.nazov,
        doplnok: [u.tim?.nazov, u.miesto].filter(Boolean).join(' · ') || null,
        zapas: null,
        farba: u.farba || u.tim?.farba || null,
      });
    }
    for (const [den, zoznam] of mapa) mapa.set(den, zoznam.sort((a, b) => (a.cas || '99').localeCompare(b.cas || '99')));
    return mapa;
  }, [zapasy.data, udalosti.data]);

  // Mriežka od pondelka pred prvým dňom po nedeľu po poslednom
  const dni = useMemo(() => {
    const zaciatok = new Date(rok, cisloMesiaca - 1, 1);
    zaciatok.setDate(zaciatok.getDate() - ((zaciatok.getDay() + 6) % 7));
    const koniec = new Date(rok, cisloMesiaca, 0);
    koniec.setDate(koniec.getDate() + ((7 - koniec.getDay()) % 7));
    const vysledok: Date[] = [];
    for (const d = new Date(zaciatok); d <= koniec; d.setDate(d.getDate() + 1)) vysledok.push(new Date(d));
    return vysledok;
  }, [rok, cisloMesiaca]);

  const dnes = iso(new Date());
  const posun = (o: number) => setMesiac((m) => new Date(m.getFullYear(), m.getMonth() + o, 1));
  const nazovMesiaca = mesiacRok(mesiac);
  const dniSUdalostou = [...podlaDna.keys()].filter((d) => d >= prvy && d <= posledny).sort();
  const nacitava = zapasy.nacitava || udalosti.nacitava;

  return (
    <div className="db-stranka db-kalendar-stranka">
      <HlavickaStranky stitok={u.text('stranka_kalendar_stitok', 'Kalendár')} nadpis={nazovMesiaca}>
        <div className="db-kal-ovladanie">
          <button type="button" className="db-kruh-tlacidlo" onClick={() => posun(-1)} aria-label="Predchádzajúci mesiac">
            <Ikona nazov="vlavo" />
          </button>
          <button type="button" className="db-kruh-tlacidlo" onClick={() => posun(1)} aria-label="Nasledujúci mesiac">
            <Ikona nazov="vpravo" />
          </button>
          <button type="button" className="db-pill" onClick={() => setMesiac(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
            Dnes
          </button>
        </div>
      </HlavickaStranky>

      <Sekcia className="db-sekcia--hore db-sekcia--mriezka">
        {nacitava && podlaDna.size === 0 ? (
          <Nacitava text="Načítavam kalendár…" />
        ) : (
          <>
            <div className="db-kalendar" role="grid" aria-label={nazovMesiaca}>
              {DNI.map((d) => (
                <div key={d} className="db-kalendar__den-tyzdna" role="columnheader">
                  {d}
                </div>
              ))}
              {dni.map((d) => {
                const kluc = iso(d);
                const polozky = podlaDna.get(kluc) ?? [];
                const mimo = d.getMonth() !== mesiac.getMonth();
                return (
                  <div key={kluc} role="gridcell" className={`db-kalendar__den${mimo ? ' is-mimo' : ''}${kluc === dnes ? ' is-dnes' : ''}`}>
                    <span className="db-kalendar__cislo">{d.getDate()}</span>
                    {polozky.slice(0, 3).map((p) => (
                      <PolozkaKalendara key={p.kluc} p={p} kompaktna />
                    ))}
                    {polozky.length > 3 && <small className="db-kalendar__viac">+{polozky.length - 3} ďalšie</small>}
                  </div>
                );
              })}
            </div>

            <div className="db-agenda">
              {dniSUdalostou.length === 0 ? (
                <Prazdne nadpis="V tomto mesiaci nič neplánujeme" text="Pozrite sa na ďalší mesiac." />
              ) : (
                dniSUdalostou.map((den) => {
                  const d = new Date(`${den}T12:00:00`);
                  return (
                    <section key={den} className={`db-agenda__den${den === dnes ? ' is-dnes' : ''}`}>
                      <div className="db-agenda__datum">
                        <strong>{d.getDate()}</strong>
                        <small>{DNI_DLHE[d.getDay()]}</small>
                      </div>
                      <div className="db-agenda__polozky">
                        {podlaDna.get(den)!.map((p) => (
                          <PolozkaKalendara key={p.kluc} p={p} />
                        ))}
                      </div>
                    </section>
                  );
                })
              )}
            </div>
          </>
        )}
      </Sekcia>
    </div>
  );
};

export default Kalendar;
