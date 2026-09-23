// frontend/src/components/ZapasPriebeh.tsx
// Verejný priebeh zápasu: udalosti hráčov (góly, karty, striedania),
// voľné poznámky k priebehu a zostava (základ / lavička).
//
// Nahrádza pôvodné vymyslené štatistiky (náhodné čísla striel, držania
// lopty…), ktoré sa na detaile zápasu zobrazovali.

import React, { useEffect, useState } from 'react';
import { apiUrl } from '../config/api';

interface Hrac {
  id: number;
  meno: string;
  priezvisko: string;
  cislo_dresu: number | null;
}

interface Udalost {
  id: number;
  typ: string;
  minuta: number | null;
  hrac_id: number | null;
  hrac?: Hrac | null;
  hostujuci_hrac_meno?: string | null;
  hostujuci_hrac_cislo?: number | null;
  striedany_hrac_id?: number | null;
  striedany_hrac_meno?: string | null;
}

interface TextovaUdalost {
  id: number;
  minuta: number | null;
  text: string;
}

interface Zostava {
  id: number;
  strana: 'domaci' | 'hostia';
  zaradenie: 'zakladna' | 'lavicka';
  hrac?: Hrac | null;
  hostujuci_hrac_meno?: string | null;
  hostujuci_hrac_cislo?: number | null;
  odohrane_minuty?: number | null;
  kapitan?: boolean;
}

const TYPY: Record<string, { symbol: string; popis: string }> = {
  gol: { symbol: '⚽', popis: 'Gól' },
  vlastny_gol: { symbol: '⚽', popis: 'Vlastný gól' },
  asistencia: { symbol: '👟', popis: 'Asistencia' },
  zlta_karta: { symbol: '🟨', popis: 'Žltá karta' },
  cervena_karta: { symbol: '🟥', popis: 'Červená karta' },
  striedanie: { symbol: '🔁', popis: 'Striedanie' },
};

const menoHraca = (h?: Hrac | null, meno?: string | null, cislo?: number | null) =>
  h ? `${h.meno} ${h.priezvisko}` : `${meno ?? '?'}${cislo != null ? ` (${cislo})` : ''}`;

const karta: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  marginBottom: '32px',
  overflow: 'hidden',
};

const hlavicka: React.CSSProperties = {
  padding: '16px 24px',
  borderBottom: '1px solid #e2e8f0',
  backgroundColor: '#f8fafc',
  fontSize: '1.25rem',
  fontWeight: 600,
  color: '#1e293b',
  margin: 0,
};

const ZapasPriebeh: React.FC<{ zapasId: number; domaci: string; hostia: string }> = ({ zapasId, domaci, hostia }) => {
  const [udalosti, setUdalosti] = useState<Udalost[]>([]);
  const [texty, setTexty] = useState<TextovaUdalost[]>([]);
  const [zostava, setZostava] = useState<Zostava[]>([]);

  useEffect(() => {
    const nacitaj = async (cesta: string) => {
      try {
        const odpoved = await fetch(apiUrl(cesta));
        const json = await odpoved.json();
        return json.success ? json.data : null;
      } catch {
        return null;
      }
    };
    void nacitaj(`/matches/${zapasId}/statistics`).then((d) => setUdalosti(d?.vsetky ?? []));
    void nacitaj(`/matches/${zapasId}/events`).then((d) => setTexty(Array.isArray(d) ? d : []));
    void nacitaj(`/matches/${zapasId}/lineup`).then((d) => setZostava(d?.vsetky ?? []));
  }, [zapasId]);

  // Udalosti hráčov a poznámky spolu, podľa minúty
  const priebeh = [
    ...udalosti.map((u) => ({ minuta: u.minuta, kluc: `u${u.id}`, udalost: u as Udalost | null, text: null as string | null })),
    ...texty.map((t) => ({ minuta: t.minuta, kluc: `t${t.id}`, udalost: null, text: t.text })),
  ].sort((a, b) => (a.minuta ?? 999) - (b.minuta ?? 999));

  const strany: Array<{ strana: 'domaci' | 'hostia'; nazov: string }> = [
    { strana: 'domaci', nazov: domaci },
    { strana: 'hostia', nazov: hostia },
  ];
  const stranyZostavy = strany.filter((s) => zostava.some((z) => z.strana === s.strana));

  if (priebeh.length === 0 && zostava.length === 0) return null;

  return (
    <>
      {priebeh.length > 0 && (
        <div style={karta}>
          <h2 style={hlavicka}>⏱️ Priebeh zápasu</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: '12px 24px' }}>
            {priebeh.map((p) => (
              <li key={p.kluc} style={{ display: 'flex', gap: '12px', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ width: '40px', fontWeight: 700, color: '#64748b' }}>
                  {p.minuta != null ? `${p.minuta}'` : ''}
                </span>
                {p.udalost ? (
                  <span>
                    {TYPY[p.udalost.typ]?.symbol} <strong>{TYPY[p.udalost.typ]?.popis ?? p.udalost.typ}</strong>{' '}
                    {menoHraca(p.udalost.hrac, p.udalost.hostujuci_hrac_meno, p.udalost.hostujuci_hrac_cislo)}
                    {p.udalost.typ === 'striedanie' &&
                      (p.udalost.striedany_hrac_meno || p.udalost.striedany_hrac_id) && (
                        <span style={{ color: '#64748b' }}>
                          {' '}za {p.udalost.striedany_hrac_meno ?? `hráča #${p.udalost.striedany_hrac_id}`}
                        </span>
                      )}
                  </span>
                ) : (
                  <span>{p.text}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {stranyZostavy.length > 0 && (
        <div style={karta}>
          <h2 style={hlavicka}>👕 Zostava</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', padding: '16px 24px' }}>
            {stranyZostavy.map(({ strana, nazov }) => (
              <div key={strana}>
                <h3 style={{ fontSize: '1rem', margin: '0 0 8px', color: '#1e293b' }}>{nazov}</h3>
                {(['zakladna', 'lavicka'] as const).map((zaradenie) => {
                  const hraci = zostava.filter((z) => z.strana === strana && z.zaradenie === zaradenie);
                  if (hraci.length === 0) return null;
                  return (
                    <div key={zaradenie} style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, margin: '8px 0 4px' }}>
                        {zaradenie === 'zakladna' ? 'Základná zostava' : 'Lavička'}
                      </div>
                      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                        {hraci.map((z) => (
                          <li key={z.id} style={{ padding: '3px 0' }}>
                            <span style={{ display: 'inline-block', width: '28px', fontWeight: 700, color: '#059669' }}>
                              {z.hrac?.cislo_dresu ?? z.hostujuci_hrac_cislo ?? ''}
                            </span>
                            {z.hrac ? `${z.hrac.meno} ${z.hrac.priezvisko}` : z.hostujuci_hrac_meno}
                            {z.kapitan && <strong title="Kapitán"> (C)</strong>}
                            {z.odohrane_minuty != null && (
                              <span style={{ color: '#64748b', fontSize: '13px' }}> · {z.odohrane_minuty}'</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default ZapasPriebeh;
