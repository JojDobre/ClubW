// Umiestnenie: sablony/moderna/src/stranky/Dokumenty.tsx
// Dokumenty klubu na stiahnutie, zoskupené podľa kategórie, s hľadaním.
// Stiahnutie ide cez počítadlo (/documents/:id/download).

import React, { useMemo, useState } from 'react';
import { apiUrl } from '@clubw/jadro';
import { Chyba, HlavickaStranky, Ikona, Nacitava, Prazdne, datum, useApi, useTitulok } from '../spolocne';

interface Dokument {
  id: number;
  nazov: string;
  popis: string | null;
  kategoria: string | null;
  kategoria_id: number | null;
  typ_suboru: string | null;
  velkost_kb: number | null;
  subor_url?: string | null;
  vytvoreny: string;
}

interface Kategoria {
  id: number;
  nazov: string;
  popis: string | null;
}

const velkost = (kb: number | null) => (!kb ? null : kb >= 1024 ? `${(kb / 1024).toFixed(1).replace('.', ',')} MB` : `${kb} kB`);
const typ = (d: Dokument) => (d.typ_suboru || d.subor_url?.split('.').pop() || 'súbor').toUpperCase().slice(0, 4);

const Dokumenty: React.FC = () => {
  const dokumenty = useApi<Dokument[]>('/documents?limit=500');
  const kategorie = useApi<Kategoria[]>('/document-categories');
  const [hladat, setHladat] = useState('');
  useTitulok('Dokumenty');

  const skupiny = useMemo(() => {
    const text = hladat.trim().toLowerCase();
    const vybrane = (dokumenty.data ?? []).filter((d) => !text || `${d.nazov} ${d.popis ?? ''}`.toLowerCase().includes(text));
    const zoznamKategorii = kategorie.data ?? [];
    const vysledok: Array<{ kluc: string; nazov: string; popis: string | null; polozky: Dokument[] }> = [];
    for (const k of zoznamKategorii) {
      const polozky = vybrane.filter((d) => d.kategoria_id === k.id);
      if (polozky.length) vysledok.push({ kluc: `k${k.id}`, nazov: k.nazov, popis: k.popis, polozky });
    }
    // Staršie dokumenty môžu mať kategóriu len ako text
    const zvysne = new Map<string, Dokument[]>();
    for (const d of vybrane.filter((d) => !d.kategoria_id || !zoznamKategorii.some((k) => k.id === d.kategoria_id))) {
      const nazov = d.kategoria?.trim() || 'Ostatné';
      zvysne.set(nazov, [...(zvysne.get(nazov) ?? []), d]);
    }
    for (const [nazov, polozky] of zvysne) vysledok.push({ kluc: `t${nazov}`, nazov, popis: null, polozky });
    return vysledok;
  }, [dokumenty.data, kategorie.data, hladat]);

  return (
    <div className="md-stranka">
      <HlavickaStranky stitok="Dokumenty" nadpis="Dokumenty na stiahnutie." popis="Stanovy, tlačivá, prihlášky a ďalšie dokumenty klubu." />
      <div className="md-kontajner md-uzsi">
        {dokumenty.nacitava ? (
          <Nacitava text="Načítavam dokumenty…" />
        ) : dokumenty.chyba ? (
          <Chyba text={dokumenty.chyba} />
        ) : (dokumenty.data ?? []).length === 0 ? (
          <Prazdne nadpis="Zatiaľ tu nie sú žiadne dokumenty" />
        ) : (
          <>
            <label className="md-hladat md-hladat--siroke">
              <Ikona nazov="hladat" />
              <input type="search" value={hladat} onChange={(e) => setHladat(e.target.value)} placeholder="Hľadať dokument" aria-label="Hľadať dokument" />
            </label>
            {skupiny.length === 0 && <Prazdne nadpis={`Pre „${hladat.trim()}" sme nič nenašli`} />}
            {skupiny.map((s) => (
              <section key={s.kluc} className="md-skupina">
                <h2 className="md-skupina__nadpis">
                  {s.nazov} <span>{s.polozky.length}</span>
                </h2>
                {s.popis && <p className="md-skupina__popis">{s.popis}</p>}
                <ul className="md-dokumenty">
                  {s.polozky.map((d) => (
                    <li key={d.id}>
                      <a href={apiUrl(`/documents/${d.id}/download`)} target="_blank" rel="noopener noreferrer" className="md-dokument">
                        <span className="md-dokument__typ" aria-hidden="true">
                          <Ikona nazov="dokument" velkost={20} />
                          <small>{typ(d)}</small>
                        </span>
                        <span className="md-dokument__text">
                          <strong>{d.nazov}</strong>
                          <small>{[d.popis, velkost(d.velkost_kb), datum(d.vytvoreny)].filter(Boolean).join(' · ')}</small>
                        </span>
                        <span className="md-dokument__stiahnut">
                          <Ikona nazov="stiahnut" />
                          <span className="md-skryte">Stiahnuť</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default Dokumenty;
