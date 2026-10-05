// Umiestnenie: frontend/src/pages/admin/emaily/spolocne.tsx
// Spoločné časti sekcie E-MAILY: názvy a popisy šablón a značiek
// (preložiteľné), editor textu e-mailu so značkami a náhľadom a pás
// so stavom odosielania.

import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, Input, Textarea } from '../../../ui';
import type { HotovyEmail, StavEmailov } from '../../../api/emaily';
import { tr } from '../../../i18n';
import './Emaily.css';

// ===== Popisy šablón =====

export const POPIS_SABLON: Record<string, { nazov: string; popis: string }> = {
  heslo_admin: { nazov: tr('Obnova hesla do administrácie'), popis: tr('Odkaz na nové heslo pre redaktorov a správcov, ktorí zabudli heslo.') },
  formular_odpoved: { nazov: tr('Nová odpoveď na formulár'), popis: tr('Upozornenie klubu, keď niekto vyplní formulár na webe.') },
  objednavka_zakaznik: { nazov: tr('Potvrdenie objednávky'), popis: tr('Zákazník ho dostane hneď po objednávke vo fanshope.') },
  objednavka_klub: { nazov: tr('Nová objednávka (pre klub)'), popis: tr('Upozornenie klubu na novú objednávku vo fanshope.') },
  objednavka_stav: { nazov: tr('Zmena stavu objednávky'), popis: tr('Zákazník ho dostane, keď v objednávke zvolíte „upozorniť zákazníka“.') },
  fanusik_registracia_klub: { nazov: tr('Nová registrácia fanúšika (pre klub)'), popis: tr('Upozornenie klubu na novú žiadosť o členstvo z webu.') },
  fanusik_schvalenie: { nazov: tr('Schválenie registrácie'), popis: tr('Fanúšik s účtom ho dostane po schválení; bez účtu dostane pozvánku.') },
  fanusik_pozvanka: { nazov: tr('Pozvánka do Môj klub'), popis: tr('Odkaz na nastavenie hesla pre fanúšika, ktorý ešte nemá účet.') },
  fanusik_heslo: { nazov: tr('Nové heslo fanúšika'), popis: tr('Odkaz na nové heslo, keď ho fanúšik zabudne alebo mu ho pošle klub.') },
  fanusik_zruseny_klub: { nazov: tr('Zrušený účet fanúšika (pre klub)'), popis: tr('Upozornenie klubu, keď si fanúšik zruší účet na webe.') },
};

export const SKUPINY_SABLON: Record<string, string> = {
  administracia: tr('Administrácia'),
  formulare: tr('Formuláre'),
  eshop: tr('Fanshop'),
  fanusikovia: tr('Fanúšikovia a členovia'),
};

export const KOMU: Record<string, string> = {
  klub: tr('klubu'),
  pouzivatel: tr('používateľovi administrácie'),
  zakaznik: tr('zákazníkovi'),
  fanusik: tr('fanúšikovi'),
};

/** Čo značka vloží - pre tlačidlá pod editorom. */
export const POPIS_ZNACIEK: Record<string, string> = {
  klub: tr('názov klubu'),
  web: tr('adresa webu'),
  klub_email: tr('e-mail klubu'),
  klub_telefon: tr('telefón klubu'),
  rok: tr('aktuálny rok'),
  meno: tr('meno'),
  priezvisko: tr('priezvisko'),
  email: tr('e-mail'),
  telefon: tr('telefón'),
  odkaz: tr('odkaz (tlačidlo)'),
  odkaz_admin: tr('odkaz do administrácie'),
  platnost_minut: tr('platnosť odkazu v minútach'),
  formular: tr('názov formulára'),
  odpovede: tr('vyplnené odpovede'),
  cislo: tr('číslo objednávky'),
  suhrn: tr('súhrn objednávky'),
  spolu: tr('suma spolu'),
  pokyny: tr('pokyny k platbe'),
  adresa: tr('adresa doručenia'),
  poznamka: tr('poznámka zákazníka'),
  stav: tr('nový stav objednávky'),
  platba: tr('informácia o platbe'),
  typ: tr('typ členstva'),
  text_spravy: tr('správa z registrácie'),
  cislo_karty: tr('číslo členskej karty'),
  typ_clenstva: tr('typ členstva'),
  clenstvo_do: tr('platnosť členstva'),
};

// ===== Pás so stavom =====

export const PasStavu: React.FC<{ stav: StavEmailov | null; naNastaveniach?: boolean }> = ({ stav, naNastaveniach }) => {
  if (!stav) return null;
  if (stav.nastavene) {
    return (
      <div className="cw-em-pas cw-em-pas--ok">
        <Icon nazov="gdpr" velkost={18} />
        <div>
          <strong>{tr('E-maily sa odosielajú')}</strong>
          <span>
            {stav.zdroj === 'env' ? tr('Server {server} (nastavený v súbore .env na serveri)', { server: stav.server }) : tr('Server {server}', { server: stav.server })}
            {' · '}
            {tr('za 24 hodín odoslané: {pocet}', { pocet: stav.odoslane_24h })}
            {stav.caka > 0 && ` · ${tr('čaká: {pocet}', { pocet: stav.caka })}`}
            {stav.chyby_24h > 0 && ` · ${tr('chyby: {pocet}', { pocet: stav.chyby_24h })}`}
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="cw-em-pas cw-em-pas--varovanie">
      <Icon nazov="zvonik" velkost={18} />
      <div>
        <strong>{stav.vyvoj ? tr('E-maily sa neodosielajú (vývojový režim)') : tr('E-maily sa neodosielajú')}</strong>
        <span>
          {stav.vyvoj
            ? tr('Bez SMTP servera sa e-maily len vypisujú do konzoly servera.')
            : tr('Bez SMTP servera nedostanú zákazníci potvrdenia objednávok ani odkazy na heslo. Čakajúce e-maily: {pocet}.', { pocet: stav.caka })}{' '}
          {!naNastaveniach && <Link to="/admin/emaily/nastavenia">{tr('Nastaviť e-maily')}</Link>}
        </span>
      </div>
    </div>
  );
};

// ===== Náhľad =====

export const NahladEmailu: React.FC<{ email: HotovyEmail | null; nacitava?: boolean }> = ({ email, nacitava }) => {
  const [rezim, setRezim] = useState<'html' | 'text'>('html');
  return (
    <div className="cw-em-nahlad">
      <div className="cw-em-nahlad__hlava">
        <div className="cw-em-nahlad__predmet">
          <span>{tr('Predmet')}</span>
          <strong>{email?.predmet || '…'}</strong>
        </div>
        <div className="cw-em-nahlad__prepinac" role="tablist">
          <button type="button" className={rezim === 'html' ? 'is-aktivny' : ''} onClick={() => setRezim('html')}>
            {tr('E-mail')}
          </button>
          <button type="button" className={rezim === 'text' ? 'is-aktivny' : ''} onClick={() => setRezim('text')}>
            {tr('Text')}
          </button>
        </div>
      </div>
      <div className={`cw-em-nahlad__telo${nacitava ? ' is-nacitava' : ''}`}>
        {email &&
          (rezim === 'html' ? (
            <iframe title={tr('Náhľad e-mailu')} srcDoc={email.html} sandbox="" className="cw-em-nahlad__ram" />
          ) : (
            <pre className="cw-em-nahlad__text">{email.text}</pre>
          ))}
      </div>
    </div>
  );
};

/** Náhľad, ktorý sa obnoví chvíľu po poslednej zmene textu. */
export const useNahlad = (nacitaj: (signal: AbortSignal) => Promise<HotovyEmail>, zavislosti: unknown[]) => {
  const [email, setEmail] = useState<HotovyEmail | null>(null);
  const [nacitava, setNacitava] = useState(false);
  useEffect(() => {
    const ovladac = new AbortController();
    setNacitava(true);
    const casovac = window.setTimeout(() => {
      nacitaj(ovladac.signal)
        .then((e) => setEmail(e))
        .catch(() => undefined)
        .finally(() => !ovladac.signal.aborted && setNacitava(false));
    }, 400);
    return () => {
      window.clearTimeout(casovac);
      ovladac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, zavislosti);
  return { email, nacitava };
};

// ===== Editor textu =====

interface EditorProps {
  predmet: string;
  obsah: string;
  onPredmet: (v: string) => void;
  onObsah: (v: string) => void;
  znacky: string[];
  spolocneZnacky: string[];
  zablokovane?: boolean;
}

/** Predmet a text e-mailu so značkami (kliknutím sa vložia na miesto kurzora). */
export const EditorEmailu: React.FC<EditorProps> = ({ predmet, obsah, onPredmet, onObsah, znacky, spolocneZnacky, zablokovane }) => {
  const pole = useRef<HTMLTextAreaElement>(null);
  const poslednePole = useRef<'predmet' | 'obsah'>('obsah');
  const predmetRef = useRef<HTMLInputElement>(null);

  const vloz = (vlozit: string) => {
    if (poslednePole.current === 'predmet' && predmetRef.current) {
      const el = predmetRef.current;
      const z = el.selectionStart ?? predmet.length;
      const k = el.selectionEnd ?? predmet.length;
      onPredmet(predmet.slice(0, z) + vlozit + predmet.slice(k));
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(z + vlozit.length, z + vlozit.length);
      });
      return;
    }
    const el = pole.current;
    const z = el?.selectionStart ?? obsah.length;
    const k = el?.selectionEnd ?? obsah.length;
    onObsah(obsah.slice(0, z) + vlozit + obsah.slice(k));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(z + vlozit.length, z + vlozit.length);
    });
  };

  const tlacidloZnacky = (z: string) => (
    <button key={z} type="button" className="cw-em-znacka" onClick={() => vloz(`{{${z}}}`)} title={POPIS_ZNACIEK[z] ?? z} disabled={zablokovane}>
      <code>{`{{${z}}}`}</code>
      <span>{POPIS_ZNACIEK[z] ?? z}</span>
    </button>
  );

  return (
    <div className="cw-em-editor">
      <Input
        ref={predmetRef}
        menovka={tr('Predmet')}
        value={predmet}
        maxLength={255}
        onChange={(e) => onPredmet(e.target.value)}
        onFocus={() => (poslednePole.current = 'predmet')}
        disabled={zablokovane}
      />
      <Textarea
        ref={pole}
        menovka={tr('Text e-mailu')}
        value={obsah}
        rows={14}
        onChange={(e) => onObsah(e.target.value)}
        onFocus={() => (poslednePole.current = 'obsah')}
        className="cw-em-editor__text"
        disabled={zablokovane}
      />
      <div className="cw-em-editor__nastroje">
        <button type="button" className="cw-em-znacka cw-em-znacka--zapis" onClick={() => vloz('**tučné**')} disabled={zablokovane}>
          <code>**B**</code>
          <span>{tr('tučné')}</span>
        </button>
        <button type="button" className="cw-em-znacka cw-em-znacka--zapis" onClick={() => vloz('\n[Text tlačidla](https://)\n')} disabled={zablokovane}>
          <code>[ ]( )</code>
          <span>{tr('tlačidlo / odkaz')}</span>
        </button>
        <button type="button" className="cw-em-znacka cw-em-znacka--zapis" onClick={() => vloz('\n![Popis obrázka](https://)\n')} disabled={zablokovane}>
          <code>![ ]( )</code>
          <span>{tr('obrázok')}</span>
        </button>
        <button type="button" className="cw-em-znacka cw-em-znacka--zapis" onClick={() => vloz('\n- ')} disabled={zablokovane}>
          <code>-</code>
          <span>{tr('odrážka')}</span>
        </button>
      </div>
      {znacky.length > 0 && (
        <div className="cw-em-editor__znacky">
          <span className="cw-em-editor__menovka">{tr('Údaje tohto e-mailu')}</span>
          <div>{znacky.map(tlacidloZnacky)}</div>
        </div>
      )}
      <div className="cw-em-editor__znacky">
        <span className="cw-em-editor__menovka">{tr('Údaje klubu')}</span>
        <div>{spolocneZnacky.map(tlacidloZnacky)}</div>
      </div>
      <details className="cw-em-napoveda">
        <summary>{tr('Ako písať text e-mailu')}</summary>
        <ul>
          <li>{tr('Prázdny riadok začne nový odsek.')}</li>
          <li>
            <code>{'{{meno}}'}</code> {tr('sa nahradí skutočnou hodnotou. Riadok, v ktorom sú všetky značky prázdne, sa vynechá.')}
          </li>
          <li>
            <code>**text**</code> {tr('je tučné písmo.')}
          </li>
          <li>
            <code>[Text](https://…)</code> {tr('je odkaz; ak je sám na riadku, zobrazí sa ako tlačidlo vo farbe klubu.')}
          </li>
          <li>
            <code>![Popis](https://…)</code> {tr('vloží obrázok (adresu skopírujete v Knižnici médií).')}
          </li>
          <li>
            <code>- položka</code> {tr('vytvorí odrážku.')}
          </li>
          <li>{tr('Logo, farby klubu a pätičku pridá systém sám.')}</li>
        </ul>
      </details>
    </div>
  );
};
