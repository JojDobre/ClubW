// Umiestnenie: sablony/zakladna/src/stranky/Dokumenty.tsx
// Verejné dokumenty klubu (/dokumenty) - zoskupené podľa kategórií,
// s odkazom na stiahnutie cez počítadlo stiahnutí.

import React, { useEffect, useMemo, useState } from 'react';
import { apiUrl } from '@clubw/jadro';
import './Dokumenty.css';

interface Dokument {
  id: number;
  nazov: string;
  popis: string | null;
  kategoria: string | null;
  kategoria_id: number | null;
  typ_suboru: string | null;
  velkost_kb: number | null;
  vytvoreny: string;
}

interface Kategoria {
  id: number;
  nazov: string;
  popis: string | null;
}

const velkost = (kb: number | null) =>
  !kb ? '' : kb >= 1024 ? `${(kb / 1024).toFixed(1).replace('.', ',')} MB` : `${kb} kB`;

const nacitaj = async <T,>(cesta: string): Promise<T[]> => {
  const odpoved = await fetch(apiUrl(cesta));
  if (!odpoved.ok) throw new Error(`Chyba servera (${odpoved.status})`);
  const obsah = await odpoved.json();
  return Array.isArray(obsah?.data) ? obsah.data : [];
};

const Dokumenty: React.FC = () => {
  const [dokumenty, setDokumenty] = useState<Dokument[] | null>(null);
  const [kategorie, setKategorie] = useState<Kategoria[]>([]);
  const [chyba, setChyba] = useState<string | null>(null);
  const [hladat, setHladat] = useState('');

  useEffect(() => {
    document.title = 'Dokumenty';
    Promise.all([nacitaj<Dokument>('/documents?limit=500'), nacitaj<Kategoria>('/document-categories')])
      .then(([d, k]) => {
        setDokumenty(d);
        setKategorie(k);
      })
      .catch((e) => setChyba(e?.message || 'Dokumenty sa nepodarilo načítať'));
  }, []);

  // Skupiny v poradí kategórií, dokumenty bez kategórie na koniec
  const skupiny = useMemo(() => {
    const text = hladat.trim().toLowerCase();
    const vybrane = (dokumenty ?? []).filter(
      (d) => !text || d.nazov.toLowerCase().includes(text) || (d.popis ?? '').toLowerCase().includes(text)
    );
    const vysledok: Array<{ kluc: string; nazov: string; popis: string | null; polozky: Dokument[] }> = [];
    for (const k of kategorie) {
      const polozky = vybrane.filter((d) => d.kategoria_id === k.id);
      if (polozky.length) vysledok.push({ kluc: `k${k.id}`, nazov: k.nazov, popis: k.popis, polozky });
    }
    // Staršie dokumenty môžu mať kategóriu len ako text
    const zvysne = vybrane.filter((d) => !d.kategoria_id || !kategorie.some((k) => k.id === d.kategoria_id));
    const podlaTextu = new Map<string, Dokument[]>();
    for (const d of zvysne) {
      const nazov = d.kategoria?.trim() || 'Ostatné';
      podlaTextu.set(nazov, [...(podlaTextu.get(nazov) ?? []), d]);
    }
    for (const [nazov, polozky] of podlaTextu) {
      vysledok.push({ kluc: `t${nazov}`, nazov, popis: null, polozky });
    }
    return vysledok;
  }, [dokumenty, kategorie, hladat]);

  return (
    <div className="dp">
      <h1>Dokumenty</h1>
      <p className="dp__uvod">Tlačivá, stanovy a ďalšie dokumenty klubu na stiahnutie.</p>

      {chyba ? (
        <p className="dp__stav">{chyba}</p>
      ) : dokumenty === null ? (
        <p className="dp__stav">Načítavam dokumenty...</p>
      ) : dokumenty.length === 0 ? (
        <p className="dp__stav">Zatiaľ tu nie sú žiadne dokumenty.</p>
      ) : (
        <>
          <input
            className="dp__hladat"
            type="search"
            placeholder="Hľadať dokument..."
            value={hladat}
            onChange={(e) => setHladat(e.target.value)}
            aria-label="Hľadať dokument"
          />
          {skupiny.length === 0 && <p className="dp__stav">Nič sa nenašlo.</p>}
          {skupiny.map((s) => (
            <section key={s.kluc} className="dp__skupina">
              <h2>{s.nazov}</h2>
              {s.popis && <p className="dp__popis-kat">{s.popis}</p>}
              <ul>
                {s.polozky.map((d) => (
                  <li key={d.id}>
                    <span className="dp__typ">{(d.typ_suboru || 'súbor').toUpperCase()}</span>
                    <div className="dp__text">
                      <strong>{d.nazov}</strong>
                      {d.popis && <span>{d.popis}</span>}
                    </div>
                    <a className="dp__stiahnut" href={apiUrl(`/documents/${d.id}/download`)} target="_blank" rel="noreferrer">
                      Stiahnuť{d.velkost_kb ? ` (${velkost(d.velkost_kb)})` : ''}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
};

export default Dokumenty;
