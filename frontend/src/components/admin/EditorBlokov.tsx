// Umiestnenie: frontend/src/components/admin/EditorBlokov.tsx
// Editor blokov stránky - časová os, karty osôb, čísla, galéria, otázky…
//
// Každý typ bloku je opísaný v DEFINICIE_BLOKOV (polia bloku a jeho
// položiek). Formuláre sa z tejto definície skladajú samy, takže nový typ
// bloku = nová položka v zozname (+ rovnaký typ v schéme na serveri,
// backend/src/services/blokyStranky.ts, a zobrazenie v @clubw/jadro).

import React, { useState } from 'react';
import { Badge, Button, Editor, Icon, Input, Select, Switch, Textarea } from '../../ui';
import { PoleObrazka } from './PoleObrazka';
import { useNacitanie } from '../../app/useNacitanie';
import { formulareApi } from '../../api/formulare';
import { timyApi } from '../../api/sport';
import { kategorieSpravaApi } from '../../api/obsah';
import type { BlokStranky } from '../../web/bloky/typy';
import { tr } from '../../i18n';
import './EditorBlokov.css';

type DruhPola = 'text' | 'dlhy' | 'html' | 'obrazok' | 'odkaz' | 'cislo' | 'vyber' | 'formular' | 'rubrika' | 'tim';

interface DefPola {
  kluc: string;
  menovka: string;
  druh: DruhPola;
  max?: number;
  moznosti?: Array<{ hodnota: string; popis: string }>;
  napoveda?: string;
  placeholder?: string;
}

interface DefBloku {
  typ: string;
  nazov: string;
  popis: string;
  ikona: string;
  polia: DefPola[];
  polozky?: { nazov: string; max: number; polia: DefPola[]; titulok: (p: Record<string, unknown>) => string };
  /** Údaje nového bloku */
  data?: Record<string, unknown>;
}

// ===== Opakované polia =====

const NADPIS: DefPola = { kluc: 'nadpis', menovka: tr('Nadpis'), druh: 'text', max: 150 };
const UVOD: DefPola = { kluc: 'uvod', menovka: tr('Úvodný text'), druh: 'dlhy', max: 600 };
const STLPCE: DefPola = {
  kluc: 'stlpce',
  menovka: tr('Počet stĺpcov'),
  druh: 'vyber',
  moznosti: [
    { hodnota: '2', popis: '2' },
    { hodnota: '3', popis: '3' },
    { hodnota: '4', popis: '4' },
  ],
};
const ODKAZ: DefPola = { kluc: 'odkaz', menovka: tr('Odkaz'), druh: 'odkaz', placeholder: tr('/stranka alebo https://…') };
const TLACIDLO: DefPola = { kluc: 'tlacidlo', menovka: tr('Text tlačidla'), druh: 'text', max: 40, placeholder: tr('Viac') };

/** Všetky typy blokov - poradie = poradie v ponuke „Pridať blok". */
export const DEFINICIE_BLOKOV: DefBloku[] = [
  {
    typ: 'text',
    nazov: tr('Text'),
    popis: tr('Formátovaný text s obrázkami a odkazmi'),
    ikona: 'clanky',
    polia: [{ kluc: 'html', menovka: tr('Text'), druh: 'html' }],
  },
  {
    typ: 'nadpis',
    nazov: tr('Nadpis sekcie'),
    popis: tr('Štítok, veľký nadpis a krátky úvod'),
    ikona: 'stranky',
    polia: [
      { kluc: 'stitok', menovka: tr('Štítok nad nadpisom'), druh: 'text', max: 60, placeholder: tr('Od roku 1932') },
      NADPIS,
      { kluc: 'text', menovka: tr('Úvodný text'), druh: 'dlhy', max: 600 },
      {
        kluc: 'zarovnanie',
        menovka: tr('Zarovnanie'),
        druh: 'vyber',
        moznosti: [
          { hodnota: 'vlavo', popis: tr('Vľavo') },
          { hodnota: 'stred', popis: tr('Na stred') },
        ],
      },
    ],
  },
  {
    typ: 'casova_os',
    nazov: tr('Časová os / história'),
    popis: tr('Míľniky klubu po rokoch'),
    ikona: 'hodiny',
    data: { nadpis: tr('História klubu') },
    polia: [NADPIS, UVOD],
    polozky: {
      nazov: tr('Míľnik'),
      max: 60,
      titulok: (p) => [p.rok, p.nadpis].filter(Boolean).join(' · '),
      polia: [
        { kluc: 'rok', menovka: tr('Rok alebo dátum'), druh: 'text', max: 20, placeholder: '1932' },
        NADPIS,
        { kluc: 'text', menovka: tr('Text'), druh: 'dlhy', max: 1500 },
        { kluc: 'obrazok', menovka: tr('Obrázok (nepovinné)'), druh: 'obrazok' },
      ],
    },
  },
  {
    typ: 'osoby',
    nazov: tr('Karty osôb'),
    popis: tr('Vedenie klubu, tréneri, kontakty'),
    ikona: 'pouzivatelia',
    data: { nadpis: tr('Vedenie klubu'), stlpce: '4' },
    polia: [NADPIS, UVOD, STLPCE],
    polozky: {
      nazov: tr('Osoba'),
      max: 60,
      titulok: (p) => [p.meno, p.funkcia].filter(Boolean).join(' · '),
      polia: [
        { kluc: 'foto', menovka: tr('Fotka'), druh: 'obrazok' },
        { kluc: 'meno', menovka: tr('Meno a priezvisko'), druh: 'text', max: 100 },
        { kluc: 'funkcia', menovka: tr('Funkcia'), druh: 'text', max: 100, placeholder: tr('Predseda') },
        { kluc: 'text', menovka: tr('Krátky popis'), druh: 'dlhy', max: 600 },
        { kluc: 'email', menovka: tr('E-mail'), druh: 'text', max: 150 },
        { kluc: 'telefon', menovka: tr('Telefón'), druh: 'text', max: 40 },
      ],
    },
  },
  {
    typ: 'karty',
    nazov: tr('Karty'),
    popis: tr('Karty s obrázkom, textom a odkazom'),
    ikona: 'dashboard',
    data: { stlpce: '3' },
    polia: [NADPIS, UVOD, STLPCE],
    polozky: {
      nazov: tr('Karta'),
      max: 24,
      titulok: (p) => String(p.nadpis || ''),
      polia: [
        { kluc: 'obrazok', menovka: tr('Obrázok (nepovinné)'), druh: 'obrazok' },
        NADPIS,
        { kluc: 'text', menovka: tr('Text'), druh: 'dlhy', max: 600 },
        ODKAZ,
        TLACIDLO,
      ],
    },
  },
  {
    typ: 'cisla',
    nazov: tr('Čísla'),
    popis: tr('Klub v číslach - rok založenia, počet členov…'),
    ikona: 'ligy',
    polia: [NADPIS],
    polozky: {
      nazov: tr('Číslo'),
      max: 8,
      titulok: (p) => [p.hodnota, p.popis].filter(Boolean).join(' · '),
      polia: [
        { kluc: 'hodnota', menovka: tr('Hodnota'), druh: 'text', max: 20, placeholder: '1932' },
        { kluc: 'popis', menovka: tr('Popis'), druh: 'text', max: 80, placeholder: tr('Rok založenia') },
      ],
    },
  },
  {
    typ: 'obrazok_text',
    nazov: tr('Obrázok s textom'),
    popis: tr('Fotka vedľa textu, voliteľne s tlačidlom'),
    ikona: 'media',
    polia: [
      { kluc: 'obrazok', menovka: tr('Obrázok'), druh: 'obrazok' },
      { kluc: 'stitok', menovka: tr('Štítok nad nadpisom'), druh: 'text', max: 60 },
      NADPIS,
      { kluc: 'html', menovka: tr('Text'), druh: 'html' },
      {
        kluc: 'strana',
        menovka: tr('Obrázok je'),
        druh: 'vyber',
        moznosti: [
          { hodnota: 'vlavo', popis: tr('Vľavo') },
          { hodnota: 'vpravo', popis: tr('Vpravo') },
        ],
      },
      TLACIDLO,
      ODKAZ,
    ],
  },
  {
    typ: 'galeria',
    nazov: tr('Galéria obrázkov'),
    popis: tr('Mriežka fotiek so zväčšením po kliknutí'),
    ikona: 'galerie',
    data: { stlpce: '4' },
    polia: [NADPIS, STLPCE],
    polozky: {
      nazov: tr('Obrázok'),
      max: 60,
      titulok: (p) => String(p.popis || p.obrazok || ''),
      polia: [
        { kluc: 'obrazok', menovka: tr('Obrázok'), druh: 'obrazok' },
        { kluc: 'popis', menovka: tr('Popis'), druh: 'text', max: 150 },
      ],
    },
  },
  {
    typ: 'citat',
    nazov: tr('Citát'),
    popis: tr('Výrok s menom a fotkou autora'),
    ikona: 'komentare',
    polia: [
      { kluc: 'text', menovka: tr('Citát'), druh: 'dlhy', max: 1000 },
      { kluc: 'autor', menovka: tr('Autor'), druh: 'text', max: 100 },
      { kluc: 'funkcia', menovka: tr('Funkcia autora'), druh: 'text', max: 100 },
      { kluc: 'foto', menovka: tr('Fotka autora'), druh: 'obrazok' },
    ],
  },
  {
    typ: 'vyzva',
    nazov: tr('Výzva s tlačidlom'),
    popis: tr('Výrazný pás s nadpisom a tlačidlom'),
    ikona: 'live',
    polia: [NADPIS, { kluc: 'text', menovka: tr('Text'), druh: 'dlhy', max: 600 }, TLACIDLO, ODKAZ, { kluc: 'obrazok', menovka: tr('Obrázok na pozadí (nepovinné)'), druh: 'obrazok' }],
  },
  {
    typ: 'faq',
    nazov: tr('Otázky a odpovede'),
    popis: tr('Rozbaľovacie časté otázky'),
    ikona: 'hladat',
    data: { nadpis: tr('Časté otázky') },
    polia: [NADPIS],
    polozky: {
      nazov: tr('Otázka'),
      max: 40,
      titulok: (p) => String(p.otazka || ''),
      polia: [
        { kluc: 'otazka', menovka: tr('Otázka'), druh: 'text', max: 200 },
        { kluc: 'odpoved', menovka: tr('Odpoveď'), druh: 'dlhy', max: 3000 },
      ],
    },
  },
  {
    typ: 'uspechy',
    nazov: tr('Úspechy a trofeje'),
    popis: tr('Tituly, postupy a ocenenia'),
    ikona: 'ligy',
    data: { nadpis: tr('Úspechy klubu') },
    polia: [NADPIS],
    polozky: {
      nazov: tr('Úspech'),
      max: 60,
      titulok: (p) => [p.rok, p.nazov].filter(Boolean).join(' · '),
      polia: [
        { kluc: 'rok', menovka: tr('Rok'), druh: 'text', max: 20 },
        { kluc: 'nazov', menovka: tr('Názov'), druh: 'text', max: 150, placeholder: tr('Víťaz 5. ligy') },
        { kluc: 'popis', menovka: tr('Popis'), druh: 'text', max: 200 },
      ],
    },
  },
  {
    typ: 'video',
    nazov: tr('Video'),
    popis: tr('Video z YouTube alebo Vimeo'),
    ikona: 'videa',
    polia: [
      NADPIS,
      { kluc: 'url', menovka: tr('Adresa videa'), druh: 'text', max: 300, placeholder: 'https://www.youtube.com/watch?v=…' },
      { kluc: 'popis', menovka: tr('Popis'), druh: 'text', max: 200 },
    ],
  },
  {
    typ: 'mapa',
    nazov: tr('Mapa'),
    popis: tr('Mapa Google podľa adresy'),
    ikona: 'stadion',
    data: { nadpis: tr('Kde nás nájdete') },
    polia: [NADPIS, { kluc: 'adresa', menovka: tr('Adresa'), druh: 'text', max: 200, placeholder: tr('Športová 12, Dolina') }],
  },
  {
    typ: 'formular',
    nazov: tr('Formulár'),
    popis: tr('Formulár z časti Formuláre'),
    ikona: 'formular',
    polia: [{ kluc: 'slug', menovka: tr('Formulár'), druh: 'formular' }],
  },
  {
    typ: 'clanky',
    nazov: tr('Najnovšie články'),
    popis: tr('Automaticky posledné články, aj z jednej rubriky'),
    ikona: 'clanky',
    data: { nadpis: tr('Najnovšie články'), pocet: 3 },
    polia: [NADPIS, { kluc: 'pocet', menovka: tr('Počet článkov'), druh: 'cislo' }, { kluc: 'rubrika', menovka: tr('Rubrika'), druh: 'rubrika' }],
  },
  {
    typ: 'zapasy',
    nazov: tr('Zápasy'),
    popis: tr('Automaticky najbližšie zápasy alebo posledné výsledky'),
    ikona: 'zapasy',
    data: { nadpis: tr('Najbližšie zápasy'), rezim: 'program', pocet: 3 },
    polia: [
      NADPIS,
      {
        kluc: 'rezim',
        menovka: tr('Zobraziť'),
        druh: 'vyber',
        moznosti: [
          { hodnota: 'program', popis: tr('Najbližšie zápasy') },
          { hodnota: 'vysledky', popis: tr('Posledné výsledky') },
        ],
      },
      { kluc: 'tim_id', menovka: tr('Tím'), druh: 'tim' },
      { kluc: 'pocet', menovka: tr('Počet zápasov'), druh: 'cislo' },
    ],
  },
  {
    typ: 'partneri',
    nazov: tr('Partneri'),
    popis: tr('Logá partnerov z časti Sponzori'),
    ikona: 'timy',
    data: { nadpis: tr('Naši partneri') },
    polia: [NADPIS],
  },
];

const definicia = (typ: string) => DEFINICIE_BLOKOV.find((d) => d.typ === typ);

const noveId = () => `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Krátky popis bloku v zbalenom stave. */
const zhrnutie = (b: BlokStranky): string => {
  const d = b.data ?? {};
  const text = d.nadpis || d.autor || d.adresa || d.slug || (typeof d.html === 'string' ? d.html.replace(/<[^>]*>/g, ' ') : '');
  const pocet = b.polozky?.length ? ` · ${b.polozky.length}×` : '';
  return `${String(text).replace(/\s+/g, ' ').trim().slice(0, 80)}${pocet}`;
};

// ===== Pole formulára =====

interface Zdroje {
  formulare: Array<{ hodnota: string; popis: string }>;
  rubriky: Array<{ hodnota: string; popis: string }>;
  timy: Array<{ hodnota: string; popis: string }>;
}

const PoleBloku: React.FC<{ pole: DefPola; hodnota: unknown; onZmena: (h: unknown) => void; zdroje: Zdroje }> = ({ pole, hodnota, onZmena, zdroje }) => {
  const text = hodnota === null || hodnota === undefined ? '' : String(hodnota);
  switch (pole.druh) {
    case 'html':
      return (
        <div className="cw-field">
          <span className="cw-field__label">{pole.menovka}</span>
          <Editor hodnota={text} onZmena={onZmena} minVyska={160} />
        </div>
      );
    case 'dlhy':
      return <Textarea menovka={pole.menovka} value={text} rows={3} maxLength={pole.max} placeholder={pole.placeholder} onChange={(e) => onZmena(e.target.value)} />;
    case 'obrazok':
      return <PoleObrazka menovka={pole.menovka} hodnota={text || null} onZmena={onZmena} tvar="siroky" napoveda={pole.napoveda} />;
    case 'cislo':
      return <Input menovka={pole.menovka} type="number" min={1} max={12} value={text} onChange={(e) => onZmena(e.target.value === '' ? null : Number(e.target.value))} />;
    case 'vyber':
      return <Select menovka={pole.menovka} value={text || pole.moznosti![0].hodnota} moznosti={pole.moznosti!} onChange={(e) => onZmena(e.target.value)} />;
    case 'formular':
      return <Select menovka={pole.menovka} value={text} prazdna={tr('Vyberte formulár')} moznosti={zdroje.formulare} onChange={(e) => onZmena(e.target.value)} />;
    case 'rubrika':
      return <Select menovka={pole.menovka} value={text} prazdna={tr('Všetky rubriky')} moznosti={zdroje.rubriky} onChange={(e) => onZmena(e.target.value)} />;
    case 'tim':
      return (
        <Select
          menovka={pole.menovka}
          value={text && text !== '0' ? text : ''}
          prazdna={tr('Všetky tímy')}
          moznosti={zdroje.timy}
          onChange={(e) => onZmena(e.target.value ? Number(e.target.value) : null)}
        />
      );
    default:
      return (
        <Input
          menovka={pole.menovka}
          value={text}
          maxLength={pole.max}
          placeholder={pole.placeholder}
          napoveda={pole.druh === 'odkaz' ? tr('Začína / (stránka tohto webu), https://, mailto: alebo tel:') : pole.napoveda}
          onChange={(e) => onZmena(e.target.value)}
        />
      );
  }
};

// ===== Editor =====

export const EditorBlokov: React.FC<{ bloky: BlokStranky[]; onZmena: (bloky: BlokStranky[]) => void }> = ({ bloky, onZmena }) => {
  const [rozbalene, setRozbalene] = useState<Set<string>>(new Set());
  const [rozbalenePolozky, setRozbalenePolozky] = useState<Set<string>>(new Set());
  const [ponuka, setPonuka] = useState(false);

  const formulare = useNacitanie((signal) => formulareApi.vypis(signal));
  const rubriky = useNacitanie((signal) => kategorieSpravaApi.vypis(signal));
  const timy = useNacitanie((signal) => timyApi.vypis(signal));
  const zdroje: Zdroje = {
    formulare: (formulare.data ?? []).map((f) => ({ hodnota: f.slug, popis: f.nazov })),
    rubriky: (rubriky.data ?? []).map((r) => ({ hodnota: r.slug, popis: r.nazov })),
    timy: (timy.data ?? []).map((t) => ({ hodnota: String(t.id), popis: t.nazov })),
  };

  const prepni = (mnozina: Set<string>, nastav: (s: Set<string>) => void, kluc: string) => {
    const nova = new Set(mnozina);
    if (nova.has(kluc)) nova.delete(kluc);
    else nova.add(kluc);
    nastav(nova);
  };

  const uprav = (index: number, zmena: Partial<BlokStranky>) => onZmena(bloky.map((b, i) => (i === index ? { ...b, ...zmena } : b)));
  const presun = (index: number, smer: -1 | 1) => {
    const ciel = index + smer;
    if (ciel < 0 || ciel >= bloky.length) return;
    const nove = [...bloky];
    [nove[index], nove[ciel]] = [nove[ciel], nove[index]];
    onZmena(nove);
  };
  const pridaj = (typ: string) => {
    const def = definicia(typ)!;
    const blok: BlokStranky = { id: noveId(), typ, data: { ...(def.data ?? {}) }, pozadie: 'biele', skryty: false };
    if (def.polozky) blok.polozky = [{}];
    onZmena([...bloky, blok]);
    setRozbalene(new Set(rozbalene).add(blok.id));
    if (def.polozky) setRozbalenePolozky(new Set(rozbalenePolozky).add(`${blok.id}:0`));
    setPonuka(false);
  };
  const duplikuj = (index: number) => {
    const kopia: BlokStranky = JSON.parse(JSON.stringify(bloky[index]));
    kopia.id = noveId();
    onZmena([...bloky.slice(0, index + 1), kopia, ...bloky.slice(index + 1)]);
  };

  return (
    <div className="cw-bloky">
      <div className="cw-bloky__hlava">
        <span className="cw-field__label">{tr('Bloky stránky')}</span>
        <small>{tr('Zobrazia sa pod textom stránky v tomto poradí.')}</small>
      </div>

      {bloky.length === 0 && <p className="cw-bloky__prazdne">{tr('Stránka zatiaľ nemá žiadne bloky. Pridajte napríklad časovú os histórie alebo karty vedenia klubu.')}</p>}

      <ol className="cw-bloky__zoznam">
        {bloky.map((b, i) => {
          const def = definicia(b.typ);
          const otvoreny = rozbalene.has(b.id);
          if (!def) return null;
          return (
            <li key={b.id} className={`cw-blok${b.skryty ? ' is-skryty' : ''}${otvoreny ? ' is-otvoreny' : ''}`}>
              <div className="cw-blok__hlava">
                <button type="button" className="cw-blok__prepinac" onClick={() => prepni(rozbalene, setRozbalene, b.id)} aria-expanded={otvoreny}>
                  <span className="cw-blok__ikona">
                    <Icon nazov={def.ikona} velkost={16} />
                  </span>
                  <span className="cw-blok__nazov">
                    <strong>{def.nazov}</strong>
                    <small>{zhrnutie(b) || def.popis}</small>
                  </span>
                </button>
                {b.skryty && <Badge>{tr('Skrytý')}</Badge>}
                <div className="cw-blok__akcie">
                  <Button velkost="sm" variant="ghost" disabled={i === 0} onClick={() => presun(i, -1)} aria-label={tr('Posunúť blok vyššie')}>
                    ↑
                  </Button>
                  <Button velkost="sm" variant="ghost" disabled={i === bloky.length - 1} onClick={() => presun(i, 1)} aria-label={tr('Posunúť blok nižšie')}>
                    ↓
                  </Button>
                  <Button velkost="sm" variant="ghost" onClick={() => duplikuj(i)} aria-label={tr('Duplikovať blok')}>
                    <Icon nazov="kopirovat" velkost={14} />
                  </Button>
                  <Button velkost="sm" variant="ghost" onClick={() => onZmena(bloky.filter((_, j) => j !== i))} aria-label={tr('Odstrániť blok')}>
                    <Icon nazov="zmazat" velkost={14} />
                  </Button>
                </div>
              </div>

              {otvoreny && (
                <div className="cw-blok__telo">
                  {def.polia.map((pole) => (
                    <PoleBloku key={pole.kluc} pole={pole} hodnota={b.data?.[pole.kluc]} zdroje={zdroje} onZmena={(h) => uprav(i, { data: { ...b.data, [pole.kluc]: h } })} />
                  ))}

                  {def.polozky && (
                    <div className="cw-blok__polozky">
                      <span className="cw-field__label">
                        {def.polozky.nazov} ({(b.polozky ?? []).length})
                      </span>
                      {(b.polozky ?? []).map((p, j) => {
                        const kluc = `${b.id}:${j}`;
                        const otvorena = rozbalenePolozky.has(kluc);
                        const polozky = b.polozky ?? [];
                        const upravPolozky = (nove: Array<Record<string, unknown>>) => uprav(i, { polozky: nove });
                        return (
                          <div key={j} className={`cw-polozka${otvorena ? ' is-otvorena' : ''}`}>
                            <div className="cw-polozka__hlava">
                              <button type="button" className="cw-polozka__prepinac" onClick={() => prepni(rozbalenePolozky, setRozbalenePolozky, kluc)} aria-expanded={otvorena}>
                                <span className="cw-polozka__cislo">{j + 1}</span>
                                <span>{def.polozky!.titulok(p) || tr('Nová položka')}</span>
                              </button>
                              <Button velkost="sm" variant="ghost" disabled={j === 0} onClick={() => upravPolozky(polozky.map((x, k) => (k === j - 1 ? polozky[j] : k === j ? polozky[j - 1] : x)))} aria-label={tr('Posunúť vyššie')}>
                                ↑
                              </Button>
                              <Button
                                velkost="sm"
                                variant="ghost"
                                disabled={j === polozky.length - 1}
                                onClick={() => upravPolozky(polozky.map((x, k) => (k === j + 1 ? polozky[j] : k === j ? polozky[j + 1] : x)))}
                                aria-label={tr('Posunúť nižšie')}
                              >
                                ↓
                              </Button>
                              <Button velkost="sm" variant="ghost" onClick={() => upravPolozky(polozky.filter((_, k) => k !== j))} aria-label={tr('Odstrániť položku')}>
                                <Icon nazov="zmazat" velkost={14} />
                              </Button>
                            </div>
                            {otvorena && (
                              <div className="cw-polozka__telo">
                                {def.polozky!.polia.map((pole) => (
                                  <PoleBloku
                                    key={pole.kluc}
                                    pole={pole}
                                    hodnota={p[pole.kluc]}
                                    zdroje={zdroje}
                                    onZmena={(h) => upravPolozky(polozky.map((x, k) => (k === j ? { ...x, [pole.kluc]: h } : x)))}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {(b.polozky ?? []).length < def.polozky.max && (
                        <Button
                          velkost="sm"
                          variant="secondary"
                          ikona={<Icon nazov="plus" velkost={14} />}
                          onClick={() => {
                            const nove = [...(b.polozky ?? []), {}];
                            uprav(i, { polozky: nove });
                            setRozbalenePolozky(new Set(rozbalenePolozky).add(`${b.id}:${nove.length - 1}`));
                          }}
                        >
                          {tr('Pridať: {nazov}', { nazov: def.polozky.nazov.toLowerCase() })}
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="cw-blok__vzhlad">
                    <Select
                      menovka={tr('Pozadie bloku')}
                      value={b.pozadie || 'biele'}
                      onChange={(e) => uprav(i, { pozadie: e.target.value as BlokStranky['pozadie'] })}
                      moznosti={[
                        { hodnota: 'biele', popis: tr('Svetlé') },
                        { hodnota: 'sive', popis: tr('Sivé') },
                        { hodnota: 'tmave', popis: tr('Tmavé') },
                      ]}
                    />
                    <Switch zapnute={Boolean(b.skryty)} onZmena={(v) => uprav(i, { skryty: v })} menovka={tr('Skryť blok na webe')} />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {ponuka ? (
        <div className="cw-bloky__ponuka">
          <div className="cw-bloky__ponuka-hlava">
            <strong>{tr('Vyberte typ bloku')}</strong>
            <Button velkost="sm" variant="ghost" onClick={() => setPonuka(false)} aria-label={tr('Zavrieť')}>
              <Icon nazov="zavriet" velkost={14} />
            </Button>
          </div>
          <div className="cw-bloky__typy">
            {DEFINICIE_BLOKOV.map((d) => (
              <button key={d.typ} type="button" className="cw-bloky__typ" onClick={() => pridaj(d.typ)}>
                <span className="cw-blok__ikona">
                  <Icon nazov={d.ikona} velkost={16} />
                </span>
                <span>
                  <strong>{d.nazov}</strong>
                  <small>{d.popis}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <Button variant="secondary" ikona={<Icon nazov="plus" velkost={15} />} onClick={() => setPonuka(true)} disabled={bloky.length >= 60}>
          {tr('Pridať blok')}
        </Button>
      )}
    </div>
  );
};

export default EditorBlokov;
