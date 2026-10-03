// Umiestnenie: sablony/tribuna/src/stranky/Dokumenty.tsx
// Dokumenty klubu na stiahnutie: vyhľadávanie, pilulky kategórií
// a zoznam súborov v zaoblených riadkoch. Stiahnutie ide cez počítadlo
// (/documents/:id/download).

import React, { useMemo, useState } from 'react';
import { apiUrl } from '@clubw/jadro';
import { Chyba, Filtre, HlavickaStranky, Nacitava, Prazdne, Sekcia } from '../casti';
import { Ikona, datum, useApi, useTitulok, useUpravy } from '../spolocne';

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
  const u = useUpravy();
  const dokumenty = useApi<Dokument[]>('/documents?limit=500');
  const kategorie = useApi<Kategoria[]>('/document-categories');
  const [hladat, setHladat] = useState('');
  const [kategoria, setKategoria] = useState('');
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

  const zobrazene = skupiny.filter((s) => !kategoria || s.kluc === kategoria);

  return (
    <div className="tb-stranka tb-dokumenty-stranka">
      <HlavickaStranky stitok={u.text('stranka_dokumenty_stitok', 'Na stiahnutie')} nadpis={u.text('stranka_dokumenty_nadpis', 'Dokumenty')}>
        {(dokumenty.data ?? []).length > 0 && (
          <label className="tb-hladat">
            <Ikona nazov="hladat" />
            <input type="search" value={hladat} onChange={(e) => setHladat(e.target.value)} placeholder="Hľadať dokument" aria-label="Hľadať dokument" />
          </label>
        )}
      </HlavickaStranky>

      {skupiny.length > 1 && (
        <Sekcia className="tb-sekcia--filtre">
          <Filtre popis="Kategórie dokumentov" aktivna={kategoria} onZmena={setKategoria} moznosti={[{ kluc: '', nazov: 'Všetko' }, ...skupiny.map((s) => ({ kluc: s.kluc, nazov: s.nazov }))]} />
        </Sekcia>
      )}

      {dokumenty.nacitava ? (
        <Nacitava text="Načítavam dokumenty…" />
      ) : dokumenty.chyba ? (
        <Sekcia className="tb-sekcia--hore">
          <Chyba text={dokumenty.chyba} />
        </Sekcia>
      ) : (dokumenty.data ?? []).length === 0 ? (
        <Sekcia className="tb-sekcia--hore tb-sekcia--mriezka">
          <Prazdne nadpis="Zatiaľ tu nie sú žiadne dokumenty" />
        </Sekcia>
      ) : zobrazene.length === 0 ? (
        <Sekcia className="tb-sekcia--hore tb-sekcia--mriezka">
          <Prazdne nadpis={`Pre „${hladat.trim()}" sme nič nenašli`} />
        </Sekcia>
      ) : (
        zobrazene.map((s, i) => (
          <Sekcia key={s.kluc} className={`tb-skupina${i === 0 && skupiny.length <= 1 ? ' tb-sekcia--hore' : ''}`} ariaLabel={s.nazov}>
            <h2 className="tb-skupina__nadpis tb-skupina__nadpis--male">{s.nazov}</h2>
            {s.popis && <p className="tb-skupina__popis">{s.popis}</p>}
            <ul className="tb-dokumenty">
              {s.polozky.map((d) => (
                <li key={d.id}>
                  <a href={apiUrl(`/documents/${d.id}/download`)} target="_blank" rel="noopener noreferrer" className="tb-dokument">
                    <span className="tb-dokument__typ" aria-hidden="true">
                      {typ(d)}
                    </span>
                    <span className="tb-dokument__text">
                      <strong>{d.nazov}</strong>
                      <small>{[d.popis, velkost(d.velkost_kb), datum(d.vytvoreny)].filter(Boolean).join(' · ')}</small>
                    </span>
                    <span className="tb-dokument__stiahnut">
                      <Ikona nazov="stiahnut" velkost={18} />
                      <span className="tb-skryte">Stiahnuť</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Sekcia>
        ))
      )}
    </div>
  );
};

export default Dokumenty;
