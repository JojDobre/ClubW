// Umiestnenie: frontend/src/components/AnketaWeb.tsx
// Hlasovanie v ankete na webe. Vloženie do stránky: [anketa 3],
// na úvodnej stránke sa ukáže najnovšia otvorená anketa.

import React, { useEffect, useState } from 'react';
import { apiUrl } from '../config/api';
import './AnketaWeb.css';

interface Moznost { id: string; text: string; hlasy: number }
interface Anketa {
  id: number;
  otazka: string;
  moznosti: Moznost[];
  otvorena: boolean;
  platna_od: string | null;
  platna_do: string | null;
  celkom_hlasov: number;
}

const kluc = (id: number) => `clubw_anketa_${id}`;
const uzHlasoval = (id: number): boolean => {
  try {
    return localStorage.getItem(kluc(id)) !== null;
  } catch {
    return false;
  }
};

/** Prijíma anketa hlasy dnes? */
const jeOtvorena = (a: Anketa) => {
  const dnes = new Date().toISOString().slice(0, 10);
  return a.otvorena && (!a.platna_od || a.platna_od.slice(0, 10) <= dnes) && (!a.platna_do || a.platna_do.slice(0, 10) >= dnes);
};

export const AnketaWeb: React.FC<{ id?: number; najnovsia?: boolean }> = ({ id, najnovsia }) => {
  const [anketa, setAnketa] = useState<Anketa | null>(null);
  const [volba, setVolba] = useState('');
  const [hlasoval, setHlasoval] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [odosiela, setOdosiela] = useState(false);

  useEffect(() => {
    const adresa = id ? `/polls/${id}` : '/polls?limit=20';
    fetch(apiUrl(adresa))
      .then((r) => r.json())
      .then((d) => {
        if (!d?.success) return;
        const a: Anketa | undefined = Array.isArray(d.data) ? d.data.find(jeOtvorena) : d.data;
        if (a) {
          setAnketa(a);
          setHlasoval(uzHlasoval(a.id));
        }
      })
      .catch(() => undefined);
  }, [id, najnovsia]);

  if (!anketa) return null;

  const otvorena = jeOtvorena(anketa);
  const ukazVysledky = hlasoval || !otvorena;
  const celkom = anketa.moznosti.reduce((s, m) => s + (m.hlasy || 0), 0);

  const hlasuj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volba) return setChyba('Vyberte jednu z možností');
    setOdosiela(true);
    setChyba(null);
    try {
      const r = await fetch(apiUrl(`/polls/${anketa.id}/vote`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moznost: volba }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.success) throw new Error(d?.message || 'Hlas sa nepodarilo odoslať');
      setAnketa(d.data);
      try {
        localStorage.setItem(kluc(anketa.id), volba);
      } catch {
        /* súkromné okno */
      }
      setHlasoval(true);
    } catch (e: any) {
      setChyba(e.message);
    } finally {
      setOdosiela(false);
    }
  };

  return (
    <div className="aw">
      <div className="aw__stitok">Anketa</div>
      <h3 className="aw__otazka">{anketa.otazka}</h3>
      {ukazVysledky ? (
        <ul className="aw__vysledky">
          {anketa.moznosti.map((m) => {
            const podiel = celkom ? Math.round(((m.hlasy || 0) / celkom) * 100) : 0;
            return (
              <li key={m.id}>
                <div className="aw__riadok">
                  <span>{m.text}</span>
                  <strong>{podiel} %</strong>
                </div>
                <div className="aw__pruh" aria-hidden="true">
                  <span style={{ width: `${podiel}%` }} />
                </div>
              </li>
            );
          })}
          <li className="aw__spolu">
            {celkom} {celkom === 1 ? 'hlas' : celkom >= 2 && celkom <= 4 ? 'hlasy' : 'hlasov'}
            {!otvorena && ' · anketa je uzavretá'}
          </li>
        </ul>
      ) : (
        <form onSubmit={hlasuj}>
          {anketa.moznosti.map((m) => (
            <label key={m.id} className="aw__moznost">
              <input type="radio" name={`anketa-${anketa.id}`} value={m.id} checked={volba === m.id} onChange={() => setVolba(m.id)} />
              {m.text}
            </label>
          ))}
          {chyba && <p className="aw__chyba" role="alert">{chyba}</p>}
          <button type="submit" className="aw__hlasovat" disabled={odosiela}>
            {odosiela ? 'Odosielam...' : 'Hlasovať'}
          </button>
        </form>
      )}
    </div>
  );
};

export default AnketaWeb;
