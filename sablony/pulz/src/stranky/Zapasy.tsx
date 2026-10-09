// Umiestnenie: sablony/pulz/src/stranky/Zapasy.tsx
// Zápasy klubu ako rozpis sezóny - nie mriežka kariet:
//  - v tmavej hlavičke bilancia sezóny (výhry, remízy, prehry, skóre),
//  - plávajúci panel nástrojov: prepínač Program / Výsledky / Celá sezóna
//    a výber tímu,
//  - vľavo prilepený zoznam mesiacov (skok na mesiac), vpravo zápasy ako
//    široké riadky po mesiacoch s dňom, miestom, skóre a výsledkom klubu.
// Tím a zobrazenie sa držia v adrese (?tim=1&zobrazit=vysledky).

import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Chyba, HlavickaStranky, Nacitava, Prazdne, RiadokRozpisu, Sekcia } from '../casti';
import { podlaMesiaca, useApi, useTitulok, useVolbaVAdrese, vysledokKlubu, zoradTimy, useUpravy, type Tim, type Zapas } from '../spolocne';

type Zobrazenie = 'program' | 'vysledky' | 'vsetky';

const kotvaMesiaca = (mesiac: string) => `pz-mesiac-${mesiac.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '-')}`;

const Zapasy: React.FC = () => {
  const u = useUpravy();
  const [parametre, setParametre] = useSearchParams();
  const timId = parametre.get('tim') ?? '';
  const timy = useApi<Tim[]>('/teams');
  const zapasy = useApi<Zapas[]>(`/matches?limit=500${timId ? `&tim_id=${encodeURIComponent(timId)}` : ''}`);
  useTitulok('Zápasy');

  const vsetky = zapasy.data ?? [];
  const hranica = Date.now() - 3 * 3_600_000;
  const program = vsetky
    .filter((z) => (z.status === 'naplanovany' || z.status === 'odlozeny' || z.status === 'prebieha') && new Date(z.datum_cas).getTime() >= hranica)
    .sort((a, b) => a.datum_cas.localeCompare(b.datum_cas));
  const vysledky = vsetky.filter((z) => !program.includes(z) && z.status !== 'zruseny').sort((a, b) => b.datum_cas.localeCompare(a.datum_cas));
  const sezona = [...vsetky].sort((a, b) => a.datum_cas.localeCompare(b.datum_cas));
  // Bez programu sa rovno ukážu výsledky
  const [zobrazenie, setZobrazenie] = useVolbaVAdrese<Zobrazenie>('zobrazit', ['program', 'vysledky', 'vsetky'], 'program');
  const aktivne = zobrazenie === 'program' && program.length === 0 && !zapasy.nacitava ? 'vysledky' : zobrazenie;
  const zobrazene = aktivne === 'program' ? program : aktivne === 'vysledky' ? vysledky : sezona;
  const mesiace = podlaMesiaca(zobrazene);
  const zoradeneTimy = zoradTimy(timy.data);

  const bilancia = useMemo(() => {
    const b = { V: 0, R: 0, P: 0, za: 0, proti: 0 };
    for (const z of vysledky) {
      const v = vysledokKlubu(z);
      if (!v) continue;
      b[v]++;
      const domaci = Boolean(z.domaci_tim_id);
      b.za += (domaci ? z.goly_domaci : z.goly_hostia) ?? 0;
      b.proti += (domaci ? z.goly_hostia : z.goly_domaci) ?? 0;
    }
    return b;
  }, [vysledky]);
  const odohrane = bilancia.V + bilancia.R + bilancia.P;

  const zvolTim = (id: string) => {
    const nove = new URLSearchParams(parametre);
    if (id) nove.set('tim', id);
    else nove.delete('tim');
    setParametre(nove, { replace: true });
  };
  const skocNa = (mesiac: string) => {
    const ciel = document.getElementById(kotvaMesiaca(mesiac));
    if (ciel) window.scrollTo({ top: ciel.getBoundingClientRect().top + window.scrollY - 170, behavior: 'smooth' });
  };

  return (
    <div className="pz-stranka pz-rozpis-stranka">
      <HlavickaStranky stitok={u.text('stranka_zapasy_stitok', 'Program a výsledky')} nadpis={u.text('stranka_zapasy_nadpis', 'Zápasy')}>
        {odohrane > 0 && (
          <dl className="pz-bilancia-hlavy" aria-label="Bilancia odohraných zápasov">
            <div>
              <dt>{odohrane}</dt>
              <dd>zápasov</dd>
            </div>
            <div className="is-v">
              <dt>{bilancia.V}</dt>
              <dd>výhier</dd>
            </div>
            <div>
              <dt>{bilancia.R}</dt>
              <dd>remíz</dd>
            </div>
            <div className="is-p">
              <dt>{bilancia.P}</dt>
              <dd>prehier</dd>
            </div>
            <div>
              <dt>
                {bilancia.za}:{bilancia.proti}
              </dt>
              <dd>skóre</dd>
            </div>
          </dl>
        )}
      </HlavickaStranky>

      <div className="pz-kontajner pz-nastroje">
        <div className="pz-segment" role="group" aria-label="Zobrazenie">
          {(
            [
              ['program', 'Program', program.length],
              ['vysledky', 'Výsledky', vysledky.length],
              ['vsetky', 'Celá sezóna', sezona.length],
            ] as const
          ).map(([kluc, nazov, pocet]) => (
            <button key={kluc} type="button" className={aktivne === kluc ? 'is-aktivny' : ''} aria-pressed={aktivne === kluc} onClick={() => setZobrazenie(kluc)}>
              {nazov}
              <small>{pocet}</small>
            </button>
          ))}
        </div>
        {zoradeneTimy.length > 1 && (
          <label className="pz-vyber">
            <span>Tím</span>
            <select value={timId} onChange={(e) => zvolTim(e.target.value)}>
              <option value="">Všetky tímy</option>
              {zoradeneTimy.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.nazov}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {zapasy.nacitava ? (
        <Nacitava text="Načítavam zápasy…" />
      ) : zapasy.chyba ? (
        <Sekcia>
          <Chyba text={zapasy.chyba} />
        </Sekcia>
      ) : zobrazene.length === 0 ? (
        <Sekcia>
          <Prazdne nadpis={aktivne === 'program' ? 'Žiadne naplánované zápasy' : 'Zatiaľ tu nie sú žiadne zápasy'} text={aktivne === 'program' ? 'Program zverejníme hneď, ako bude známy.' : undefined} />
        </Sekcia>
      ) : (
        <div className="pz-kontajner pz-rozpis">
          {mesiace.length > 1 && (
            <nav className="pz-rozpis__mesiace" aria-label="Mesiace">
              <span>Mesiace</span>
              {mesiace.map((m) => (
                <button key={m.mesiac} type="button" onClick={() => skocNa(m.mesiac)}>
                  {m.mesiac}
                  <small>{m.zapasy.length}</small>
                </button>
              ))}
            </nav>
          )}
          <div className="pz-rozpis__zoznam">
            {mesiace.map((m) => {
              const [nazov, rok] = m.mesiac.split(' ');
              return (
                <section key={m.mesiac} id={kotvaMesiaca(m.mesiac)} className="pz-rozpis__mesiac" aria-label={m.mesiac}>
                  <h2>
                    {nazov} <span>{rok}</span>
                  </h2>
                  <div className="pz-rozpis__riadky">
                    {m.zapasy.map((z) => (
                      <RiadokRozpisu key={z.id} zapas={z} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Zapasy;
