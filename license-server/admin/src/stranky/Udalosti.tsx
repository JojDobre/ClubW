// Umiestnenie: license-server/admin/src/stranky/Udalosti.tsx
// Záznam udalostí: kto čo kedy zmenil, prihlásenia, overenia, aktualizácie.

import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, parametre, type Udalost } from '../api';
import { ChybaStav, HlavickaStranky, Ikona, Karta, Nacitava, Prazdne, Strankovanie, Vyber, useNacitaj } from '../komponenty';
import { datumCas } from '../formaty';

const NAZVY_TYPOV: Record<string, string> = {
  prihlasenie: 'Prihlásenie',
  prihlasenie_neuspesne: 'Neúspešné prihlásenie',
  licencia_vytvorena: 'Nová licencia',
  licencia_upravena: 'Úprava licencie',
  licencia_pozastavena: 'Pozastavenie',
  licencia_obnovena: 'Obnovenie',
  licencia_zrusena: 'Zrušenie',
  licencia_predlzena: 'Predĺženie',
  licencia_novy_kluc: 'Nový kľúč',
  licencia_zmazana: 'Zmazanie licencie',
  instalacia_prvy_kontakt: 'Nová inštalácia',
  instalacia_verzia: 'Zmena verzie',
  aktualizacia_zadana: 'Aktualizácia zadaná',
  aktualizacia_hotova: 'Aktualizácia hotová',
  aktualizacia_chyba: 'Aktualizácia zlyhala',
  aktualizacia_zrusena: 'Aktualizácia zrušená',
  hromadna_aktualizacia: 'Hromadná aktualizácia',
  aktualna_verzia: 'Aktuálna verzia',
  verzie_synchronizovane: 'Synchronizácia verzií',
  balik_pripraveny: 'Balík pripravený',
  balik_chyba: 'Chyba balíka',
  verzia_pridana: 'Pridaná verzia',
  verzia_zmazana: 'Zmazaná verzia',
  produkt_vytvoreny: 'Nový produkt',
  produkt_upraveny: 'Úprava produktu',
  administrator_vytvoreny: 'Nový administrátor',
  administrator_upraveny: 'Úprava administrátora',
  zmena_hesla: 'Zmena hesla',
  '2fa_zapnute': '2FA zapnuté',
  '2fa_vypnute': '2FA vypnuté',
  export: 'Export',
};

const Udalosti: React.FC = () => {
  const [q, setQ] = useSearchParams();
  const [hladat, setHladat] = useState(q.get('hladat') ?? '');
  const typ = q.get('typ') ?? '';
  const strana = Number(q.get('strana') ?? 1);
  const nastav = (k: string, v: string) => {
    const nove = new URLSearchParams(q);
    v ? nove.set(k, v) : nove.delete(k);
    if (k !== 'strana') nove.delete('strana');
    setQ(nove, { replace: true });
  };
  useEffect(() => {
    const t = setTimeout(() => hladat !== (q.get('hladat') ?? '') && nastav('hladat', hladat.trim()), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hladat]);
  const udalosti = useNacitaj((s) => api.get<Udalost[]>(`/udalosti${parametre({ typ, hladat: q.get('hladat'), strana, limit: 100 })}`, s), [q.toString()]);
  const typy = (udalosti.data?.typy as string[] | undefined) ?? [];

  return (
    <div className="stranka">
      <HlavickaStranky nadpis="Udalosti" popis="Záznam všetkých zmien a dôležitých okamihov - kto, čo a kedy." />
      <div className="nastroje">
        <label className="hladanie">
          <Ikona nazov="hladat" velkost={16} />
          <input type="search" value={hladat} onChange={(e) => setHladat(e.target.value)} placeholder="Hľadať v popise…" aria-label="Hľadať" />
        </label>
        <Vyber value={typ} onChange={(e) => nastav('typ', e.target.value)} prazdna="Všetky typy" moznosti={typy.map((t) => ({ hodnota: t, popis: NAZVY_TYPOV[t] ?? t }))} />
      </div>
      <Karta>
        {udalosti.chyba ? (
          <ChybaStav text={udalosti.chyba} onZnova={udalosti.obnov} />
        ) : !udalosti.data ? (
          <Nacitava />
        ) : udalosti.data.data.length === 0 ? (
          <Prazdne nadpis="Žiadne udalosti" />
        ) : (
          <div className="tabulka-obal">
            <table className="tabulka">
              <thead>
                <tr>
                  <th>Čas</th>
                  <th>Typ</th>
                  <th>Popis</th>
                  <th>Kto</th>
                </tr>
              </thead>
              <tbody>
                {udalosti.data.data.map((u) => (
                  <tr key={u.id}>
                    <td className="nezalamovat">{datumCas(u.vytvorena)}</td>
                    <td className="nezalamovat">{NAZVY_TYPOV[u.typ] ?? u.typ}</td>
                    <td>
                      {u.licencia_id ? <Link to={`/licencie/${u.licencia_id}`}>{u.popis}</Link> : u.popis}
                      {u.detaily && Object.keys(u.detaily).length > 0 && (
                        <details className="detaily">
                          <summary>Podrobnosti</summary>
                          <pre className="kod">{JSON.stringify(u.detaily, null, 2)}</pre>
                        </details>
                      )}
                    </td>
                    <td className="nezalamovat">
                      {u.administrator?.meno ?? <span className="tlmene">systém</span>}
                      {u.ip && <small className="mono">{u.ip}</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Karta>
      {udalosti.data?.strankovanie && <Strankovanie {...udalosti.data.strankovanie} onZmena={(s) => nastav('strana', String(s))} />}
    </div>
  );
};

export default Udalosti;
