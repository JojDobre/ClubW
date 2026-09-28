// Umiestnenie: sablony/klubova/src/stranky/Zapasy.tsx
// Zápasy klubu: červený pás so záložkami tímov (ako na súpiske), pilulky
// Program / Výsledky a karty zápasov z úvodnej stránky zoskupené podľa
// mesiaca. Tím a zobrazenie sa držia v adrese (?tim=1&zobrazit=vysledky).

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNastaveniaSablony } from '@clubw/jadro';
import { Chyba, Filtre, HlavickaStranky, KartaZapasu, Nacitava, PasZaloziek, Prazdne, Sekcia } from '../casti';
import { podlaMesiaca, useApi, useTitulok, useVolbaVAdrese, zoradTimy, type Tim, type Zapas } from '../spolocne';

type Zobrazenie = 'program' | 'vysledky';

const Zapasy: React.FC = () => {
  const [parametre, setParametre] = useSearchParams();
  const s = useNastaveniaSablony<{ vstupenky_odkaz: string | null }>();
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

  const predvolene: Zobrazenie = program.length > 0 || vysledky.length === 0 ? 'program' : 'vysledky';
  const [zobrazenie, setZobrazenie] = useVolbaVAdrese<Zobrazenie>('zobrazit', ['program', 'vysledky'], predvolene);
  const zobrazene = zobrazenie === 'program' ? program : vysledky;
  const zoradeneTimy = zoradTimy(timy.data);
  const vstupenky = (s.vstupenky_odkaz || '').trim() || null;

  const zvolTim = (id: string) => {
    const nove = new URLSearchParams(parametre);
    if (id) nove.set('tim', id);
    else nove.delete('tim');
    setParametre(nove, { replace: true });
  };

  return (
    <div className="kl-stranka kl-zapasy-stranka">
      <HlavickaStranky stitok="Program a výsledky" nadpis="Zápasy" />

      {zoradeneTimy.length > 1 && (
        <PasZaloziek popis="Tím">
          {[{ id: '', nazov: 'Všetky tímy' }, ...zoradeneTimy.map((t) => ({ id: String(t.id), nazov: t.nazov }))].map((t) => (
            <button
              key={t.id || 'vsetky'}
              type="button"
              className={`kl-zalozka-timu${timId === t.id ? ' is-aktivna' : ''}`}
              aria-pressed={timId === t.id}
              onClick={() => zvolTim(t.id)}
            >
              {t.nazov}
            </button>
          ))}
        </PasZaloziek>
      )}

      <Sekcia className="kl-sekcia--filtre">
        <Filtre<Zobrazenie>
          popis="Program alebo výsledky"
          aktivna={zobrazenie}
          onZmena={setZobrazenie}
          moznosti={[
            { kluc: 'program', nazov: `Program${program.length ? ` (${program.length})` : ''}` },
            { kluc: 'vysledky', nazov: `Výsledky${vysledky.length ? ` (${vysledky.length})` : ''}` },
          ]}
        />
      </Sekcia>

      {zapasy.nacitava ? (
        <Nacitava text="Načítavam zápasy…" />
      ) : zapasy.chyba ? (
        <Sekcia>
          <Chyba text={zapasy.chyba} />
        </Sekcia>
      ) : zobrazene.length === 0 ? (
        <Sekcia>
          <Prazdne
            nadpis={zobrazenie === 'program' ? 'Žiadne naplánované zápasy' : 'Zatiaľ žiadne odohrané zápasy'}
            text={zobrazenie === 'program' ? 'Program zverejníme hneď, ako bude známy.' : undefined}
          />
        </Sekcia>
      ) : (
        podlaMesiaca(zobrazene).map((m) => (
          <Sekcia key={m.mesiac} className="kl-skupina" ariaLabel={m.mesiac}>
            <h2 className="kl-skupina__nadpis">{m.mesiac}</h2>
            <div className="kl-mriezka-3 kl-mriezka-zapasov">
              {m.zapasy.map((z) => (
                <KartaZapasu key={z.id} zapas={z} vstupenky={vstupenky} />
              ))}
            </div>
          </Sekcia>
        ))
      )}
    </div>
  );
};

export default Zapasy;
