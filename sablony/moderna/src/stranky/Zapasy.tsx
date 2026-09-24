// Umiestnenie: sablony/moderna/src/stranky/Zapasy.tsx
// Zápasy klubu: program a výsledky zoskupené podľa mesiaca, filter tímu.

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Chyba,
  HlavickaStranky,
  Nacitava,
  Prazdne,
  RiadokZapasu,
  Zalozky,
  podlaMesiaca,
  useApi,
  useTitulok,
  type Tim,
  type Zapas,
} from '../spolocne';

type Zalozka = 'program' | 'vysledky';

const Zapasy: React.FC = () => {
  const [parametre, setParametre] = useSearchParams();
  const timId = parametre.get('tim') ?? '';
  const timy = useApi<Tim[]>('/teams');
  const zapasy = useApi<Zapas[]>(`/matches?limit=500${timId ? `&tim_id=${encodeURIComponent(timId)}` : ''}`);
  useTitulok('Zápasy a výsledky');

  const vsetky = zapasy.data ?? [];
  const hranica = Date.now() - 3 * 3_600_000;
  const program = vsetky
    .filter((z) => (z.status === 'naplanovany' || z.status === 'odlozeny') && new Date(z.datum_cas).getTime() >= hranica)
    .sort((a, b) => a.datum_cas.localeCompare(b.datum_cas));
  const vysledky = vsetky
    .filter((z) => !program.includes(z) && z.status !== 'zruseny')
    .sort((a, b) => b.datum_cas.localeCompare(a.datum_cas));

  const predvolena: Zalozka = program.length > 0 || vysledky.length === 0 ? 'program' : 'vysledky';
  const zvolena = parametre.get('zobrazit');
  const zalozka: Zalozka = zvolena === 'program' || zvolena === 'vysledky' ? zvolena : predvolena;

  const nastav = (kluc: string, hodnota: string) => {
    const nove = new URLSearchParams(parametre);
    if (hodnota) nove.set(kluc, hodnota);
    else nove.delete(kluc);
    setParametre(nove, { replace: true });
  };

  const zobrazene = zalozka === 'program' ? program : vysledky;
  const zoradeneTimy = [...(timy.data ?? [])].sort((a, b) => (a.poradie ?? 0) - (b.poradie ?? 0) || a.id - b.id);

  return (
    <div className="md-stranka">
      <HlavickaStranky stitok="Match Centre" nadpis="Zápasy a výsledky." popis="Kedy a kde hráme a ako sa zápasy skončili." />
      <div className="md-kontajner">
        <div className="md-filter">
          <Zalozky
            moznosti={[
              { kluc: 'program', nazov: 'Program', pocet: program.length },
              { kluc: 'vysledky', nazov: 'Výsledky', pocet: vysledky.length },
            ]}
            aktivna={zalozka}
            onZmena={(k) => nastav('zobrazit', k)}
            popis="Program alebo výsledky"
          />
          {zoradeneTimy.length > 1 && (
            <div className="md-cipy md-posuvnik" role="group" aria-label="Tím">
              <button type="button" className={`md-cip${!timId ? ' is-aktivny' : ''}`} onClick={() => nastav('tim', '')}>
                Všetky tímy
              </button>
              {zoradeneTimy.map((t) => (
                <button key={t.id} type="button" className={`md-cip${timId === String(t.id) ? ' is-aktivny' : ''}`} onClick={() => nastav('tim', String(t.id))}>
                  {t.vekova_kategoria && t.nazov.length > 18 ? t.vekova_kategoria : t.nazov}
                </button>
              ))}
            </div>
          )}
        </div>

        {zapasy.nacitava ? (
          <Nacitava text="Načítavam zápasy…" />
        ) : zapasy.chyba ? (
          <Chyba text={zapasy.chyba} />
        ) : zobrazene.length === 0 ? (
          <Prazdne
            nadpis={zalozka === 'program' ? 'Žiadne naplánované zápasy' : 'Zatiaľ žiadne odohrané zápasy'}
            text={zalozka === 'program' ? 'Program zverejníme hneď, ako bude známy.' : undefined}
          />
        ) : (
          podlaMesiaca(zobrazene).map((s) => (
            <section key={s.mesiac} className="md-skupina">
              <h2 className="md-skupina__nadpis">{s.mesiac}</h2>
              <div className="md-karta md-zoznam-zapasov md-zoznam-zapasov--karta">
                {s.zapasy.map((z) => (
                  <RiadokZapasu key={z.id} zapas={z} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
};

export default Zapasy;
