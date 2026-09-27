// Umiestnenie: license-server/admin/src/stranky/Aktualizacie.tsx
// Všetky aktualizácie inštalácií s ich priebehom. Kým niektorá beží,
// zoznam sa obnovuje sám.

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, parametre, type Prikaz, type Produkt } from '../api';
import { ChybaStav, HlavickaStranky, Karta, Nacitava, Prazdne, Strankovanie, Vyber, useInterval, useNacitaj } from '../komponenty';
import { PrikazRiadok } from './LicenciaDetail';

const Aktualizacie: React.FC = () => {
  const [q, setQ] = useSearchParams();
  const stav = q.get('stav') ?? '';
  const produktId = q.get('produkt_id') ?? '';
  const strana = Number(q.get('strana') ?? 1);
  const nastav = (k: string, v: string) => {
    const nove = new URLSearchParams(q);
    v ? nove.set(k, v) : nove.delete(k);
    if (k !== 'strana') nove.delete('strana');
    setQ(nove, { replace: true });
  };
  const produkty = useNacitaj((s) => api.get<Produkt[]>('/produkty', s).then((r) => r.data), []);
  const prikazy = useNacitaj((s) => api.get<Prikaz[]>(`/prikazy${parametre({ stav, produkt_id: produktId, strana, limit: 30 })}`, s), [q.toString()]);
  const bezi = prikazy.data?.data.some((p) => ['caka', 'prevzaty', 'prebieha'].includes(p.stav));
  useInterval(prikazy.obnov, bezi ? 8000 : null);

  return (
    <div className="stranka">
      <HlavickaStranky
        nadpis="Aktualizácie"
        popis="Inštalácia si príkaz vyzdvihne pri overení licencie (najneskôr do 24 hodín, v jej administrácii hneď po Overiť teraz), urobí zálohu, aktualizuje sa a nahlási výsledok."
      />
      <div className="nastroje">
        <Vyber
          value={stav}
          onChange={(e) => nastav('stav', e.target.value)}
          prazdna="Všetky stavy"
          moznosti={[
            { hodnota: 'neukoncene', popis: 'Rozpracované' },
            { hodnota: 'caka', popis: 'Čakajú na inštaláciu' },
            { hodnota: 'prebieha', popis: 'Prebiehajú' },
            { hodnota: 'hotovo', popis: 'Hotové' },
            { hodnota: 'chyba', popis: 'Zlyhané' },
            { hodnota: 'zruseny', popis: 'Zrušené' },
          ]}
        />
        <Vyber value={produktId} onChange={(e) => nastav('produkt_id', e.target.value)} prazdna="Všetky produkty" moznosti={(produkty.data ?? []).map((p) => ({ hodnota: p.id, popis: p.nazov }))} />
      </div>
      <Karta>
        {prikazy.chyba ? (
          <ChybaStav text={prikazy.chyba} onZnova={prikazy.obnov} />
        ) : !prikazy.data ? (
          <Nacitava />
        ) : prikazy.data.data.length === 0 ? (
          <Prazdne nadpis="Žiadne aktualizácie" text="Aktualizáciu zadáte v detaile licencie alebo hromadne v detaile produktu." />
        ) : (
          <ul className="prikazy">
            {prikazy.data.data.map((p) => (
              <PrikazRiadok key={p.id} prikaz={p} onZmena={prikazy.obnov} sLicenciou />
            ))}
          </ul>
        )}
      </Karta>
      {prikazy.data?.strankovanie && <Strankovanie {...prikazy.data.strankovanie} onZmena={(s) => nastav('strana', String(s))} />}
    </div>
  );
};

export default Aktualizacie;
