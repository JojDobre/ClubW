// Umiestnenie: frontend/src/components/FormularWeb.tsx
// Vyplnenie formulára na webe.
//
// Používa ho samostatná adresa /formular/:slug, vloženie do obsahu
// stránky značkou [formular slug] aj náhľad v administrácii.

import React, { useEffect, useState } from 'react';
import { apiUrl } from '../config/api';
import type { Formular, PoleFormulara } from '../api/typy';
import './FormularWeb.css';
import AnketaWeb from './AnketaWeb';

type Hodnoty = Record<string, string | string[] | boolean>;

interface Props {
  /** Slug alebo ID formulára - načíta sa z API */
  kluc?: string;
  /** Hotová definícia (náhľad v administrácii) */
  formular?: Pick<Formular, 'nazov' | 'popis' | 'polia' | 'aktivny' | 'sprava_po_odoslani'>;
  /** Náhľad - formulár sa nedá odoslať */
  nahlad?: boolean;
  /** Skryť nadpis (napr. keď ho stránka už má) */
  bezNadpisu?: boolean;
}

const TYPY_VSTUPU: Record<string, string> = {
  text: 'text',
  email: 'email',
  telefon: 'tel',
  cislo: 'number',
  datum: 'date',
};

export const FormularWeb: React.FC<Props> = ({ kluc, formular: zadany, nahlad = false, bezNadpisu = false }) => {
  const [nacitany, setNacitany] = useState<Props['formular'] | null>(null);
  // Náhľad dostáva definíciu priamo a pri každom písaní novú - nedržíme ju v stave
  const formular = zadany ?? nacitany;
  const maZadany = Boolean(zadany);
  const [chybaNacitania, setChybaNacitania] = useState<string | null>(null);
  const [hodnoty, setHodnoty] = useState<Hodnoty>({});
  const [chyby, setChyby] = useState<string[]>([]);
  const [odosiela, setOdosiela] = useState(false);
  const [odoslane, setOdoslane] = useState<string | null>(null);
  const [web, setWeb] = useState('');

  useEffect(() => {
    if (maZadany || !kluc) return;
    let zruseny = false;
    fetch(apiUrl(`/forms/${encodeURIComponent(kluc)}`))
      .then(async (r) => {
        const obsah = await r.json().catch(() => null);
        if (!r.ok || !obsah?.success) throw new Error(obsah?.message || 'Formulár sa nenašiel');
        if (!zruseny) setNacitany(obsah.data);
      })
      .catch((e) => !zruseny && setChybaNacitania(e.message));
    return () => {
      zruseny = true;
    };
  }, [kluc, maZadany]);

  if (chybaNacitania) return <div className="fw fw--info">{chybaNacitania}</div>;
  if (!formular) return <div className="fw fw--info">Načítavam formulár...</div>;

  const nastav = (kod: string, hodnota: string | string[] | boolean) =>
    setHodnoty((h) => ({ ...h, [kod]: hodnota }));

  const odosli = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nahlad || !kluc) return;
    setOdosiela(true);
    setChyby([]);
    try {
      const r = await fetch(apiUrl(`/forms/${encodeURIComponent(kluc)}/submit`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ udaje: hodnoty, _web: web }),
      });
      const obsah = await r.json().catch(() => null);
      if (!r.ok || !obsah?.success) {
        const zoznam: string[] = Array.isArray(obsah?.errors) ? obsah.errors.map(String) : [];
        setChyby(zoznam.length ? zoznam : [obsah?.message || 'Formulár sa nepodarilo odoslať']);
        return;
      }
      setOdoslane(obsah.message || 'Ďakujeme, formulár bol odoslaný.');
    } catch {
      setChyby(['Server neodpovedá. Skúste to prosím znova.']);
    } finally {
      setOdosiela(false);
    }
  };

  if (odoslane) {
    return (
      <div className="fw fw--hotovo" role="status">
        <strong>✓ {odoslane}</strong>
      </div>
    );
  }

  const idPola = (p: PoleFormulara) => `fw-${kluc ?? 'nahlad'}-${p.kod}`;

  const vstup = (p: PoleFormulara) => {
    const id = idPola(p);
    const hodnota = hodnoty[p.kod];
    switch (p.typ) {
      case 'textarea':
        return <textarea id={id} rows={4} required={p.povinne} value={String(hodnota ?? '')} onChange={(e) => nastav(p.kod, e.target.value)} />;
      case 'vyber':
        return (
          <select id={id} required={p.povinne} value={String(hodnota ?? '')} onChange={(e) => nastav(p.kod, e.target.value)}>
            <option value="">— vyberte —</option>
            {(p.moznosti ?? []).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        );
      case 'zaskrtavacie': {
        const vybrane = Array.isArray(hodnota) ? hodnota : [];
        return (
          <div className="fw__moznosti" role="group" aria-labelledby={`${id}-nazov`}>
            {(p.moznosti ?? []).map((m) => (
              <label key={m} className="fw__zaskrtnutie">
                <input
                  type="checkbox"
                  checked={vybrane.includes(m)}
                  onChange={(e) => nastav(p.kod, e.target.checked ? [...vybrane, m] : vybrane.filter((v) => v !== m))}
                />
                {m}
              </label>
            ))}
          </div>
        );
      }
      default:
        return (
          <input
            id={id}
            type={TYPY_VSTUPU[p.typ] ?? 'text'}
            required={p.povinne}
            value={String(hodnota ?? '')}
            onChange={(e) => nastav(p.kod, e.target.value)}
          />
        );
    }
  };

  return (
    <form className="fw" onSubmit={odosli} noValidate={nahlad}>
      {!bezNadpisu && <h3 className="fw__nadpis">{formular.nazov}</h3>}
      {formular.popis && <p className="fw__popis">{formular.popis}</p>}
      {!formular.aktivny && <div className="fw__upozornenie">Formulár momentálne neprijíma odpovede.</div>}

      {formular.polia.map((p) =>
        p.typ === 'suhlas' ? (
          <div key={p.kod} className="fw__pole">
            <label className="fw__zaskrtnutie">
              <input
                type="checkbox"
                required={p.povinne}
                checked={hodnoty[p.kod] === true}
                onChange={(e) => nastav(p.kod, e.target.checked)}
              />
              <span>
                {p.nazov}
                {p.povinne && <span className="fw__povinne"> *</span>}
              </span>
            </label>
            {p.popis && <small className="fw__napoveda">{p.popis}</small>}
          </div>
        ) : (
          <div key={p.kod} className="fw__pole">
            <label id={`${idPola(p)}-nazov`} htmlFor={p.typ === 'zaskrtavacie' ? undefined : idPola(p)} className="fw__menovka">
              {p.nazov}
              {p.povinne && <span className="fw__povinne"> *</span>}
            </label>
            {p.popis && <small className="fw__napoveda">{p.popis}</small>}
            {vstup(p)}
          </div>
        )
      )}

      {/* Pasca na roboty - človek pole nevidí */}
      <div className="fw__pasca" aria-hidden="true">
        <label>
          Web
          <input tabIndex={-1} autoComplete="off" value={web} onChange={(e) => setWeb(e.target.value)} />
        </label>
      </div>

      {chyby.length > 0 && (
        <ul className="fw__chyby" role="alert">
          {chyby.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}

      <button type="submit" className="fw__odoslat" disabled={nahlad || odosiela || !formular.aktivny}>
        {odosiela ? 'Odosielam...' : 'Odoslať'}
      </button>
      {nahlad && <small className="fw__napoveda">Náhľad - odoslanie je vypnuté.</small>}
    </form>
  );
};

/** Značky na vloženie do obsahu: [formular slug] a [anketa 3] */
const ZNACKA = /(?:<p[^>]*>\s*)?\[(formul[aá]r|anketa)[:\s]+([a-z0-9-]+)\](?:\s*<\/p>)?/gi;

/**
 * Vykreslí HTML obsah a na miesto značiek [formular slug] vloží
 * formuláre. HTML musí byť už očistené.
 */
export const ObsahSFormularmi: React.FC<{ html: string; className?: string; style?: React.CSSProperties }> = ({
  html,
  className,
  style,
}) => {
  const casti: Array<{ html?: string; formular?: string; anketa?: number }> = [];
  let posledny = 0;
  for (const zhoda of html.matchAll(ZNACKA)) {
    const index = zhoda.index ?? 0;
    if (index > posledny) casti.push({ html: html.slice(posledny, index) });
    if (zhoda[1].toLowerCase() === 'anketa') casti.push({ anketa: Number(zhoda[2]) || undefined });
    else casti.push({ formular: zhoda[2].toLowerCase() });
    posledny = index + zhoda[0].length;
  }
  if (posledny < html.length) casti.push({ html: html.slice(posledny) });

  if (!casti.some((c) => c.formular || c.anketa)) {
    return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
  }

  return (
    <div className={className} style={style}>
      {casti.map((c, i) =>
        c.formular ? (
          <FormularWeb key={i} kluc={c.formular} />
        ) : c.anketa ? (
          <AnketaWeb key={i} id={c.anketa} />
        ) : (
          <div key={i} dangerouslySetInnerHTML={{ __html: c.html ?? '' }} />
        )
      )}
    </div>
  );
};

export default FormularWeb;
