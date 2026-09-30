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
import { stadionyApi, timyApi } from '../../api/sport';
import { kategorieSpravaApi } from '../../api/obsah';
import { kotvaBloku, type BlokStranky } from '../../web/bloky/typy';
import { tr } from '../../i18n';
import './EditorBlokov.css';

type DruhPola = 'text' | 'dlhy' | 'html' | 'obrazok' | 'odkaz' | 'cislo' | 'vyber' | 'prepinac' | 'tabulka' | 'formular' | 'rubrika' | 'tim' | 'stadion';

interface DefPola {
  kluc: string;
  menovka: string;
  druh: DruhPola;
  max?: number;
  moznosti?: Array<{ hodnota: string; popis: string }>;
  napoveda?: string;
  placeholder?: string;
  /** Pole sa zobrazí len vtedy, ak podmienka platí (dostane údaje bloku) */
  ak?: (data: Record<string, unknown>) => boolean;
}

type SkupinaBlokov = 'zaklad' | 'obsah' | 'media' | 'klub';

const SKUPINY_BLOKOV: Array<{ kluc: SkupinaBlokov; nazov: string }> = [
  { kluc: 'zaklad', nazov: tr('Text, tlačidlá a navigácia') },
  { kluc: 'obsah', nazov: tr('Obsah a rozloženie') },
  { kluc: 'media', nazov: tr('Médiá') },
  { kluc: 'klub', nazov: tr('Údaje klubu a automatické bloky') },
];

interface DefBloku {
  typ: string;
  nazov: string;
  popis: string;
  ikona: string;
  skupina: SkupinaBlokov;
  polia: DefPola[];
  polozky?: {
    nazov: string;
    max: number;
    polia: DefPola[];
    titulok: (p: Record<string, unknown>) => string;
    /** Položky sa zobrazia len vtedy, ak podmienka platí */
    ak?: (data: Record<string, unknown>) => boolean;
  };
  /** Údaje nového bloku */
  data?: Record<string, unknown>;
}

// ===== Opakované polia =====

const NADPIS: DefPola = {
  kluc: 'nadpis',
  menovka: tr('Nadpis'),
  druh: 'text',
  max: 150,
};
const UVOD: DefPola = {
  kluc: 'uvod',
  menovka: tr('Úvodný text'),
  druh: 'dlhy',
  max: 600,
};
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
const ODKAZ: DefPola = {
  kluc: 'odkaz',
  menovka: tr('Odkaz'),
  druh: 'odkaz',
  placeholder: tr('/stranka alebo https://…'),
};
const TLACIDLO: DefPola = {
  kluc: 'tlacidlo',
  menovka: tr('Text tlačidla'),
  druh: 'text',
  max: 40,
  placeholder: tr('Viac'),
};
const ZAROVNANIE: DefPola = {
  kluc: 'zarovnanie',
  menovka: tr('Zarovnanie'),
  druh: 'vyber',
  moznosti: [
    { hodnota: 'vlavo', popis: tr('Vľavo') },
    { hodnota: 'stred', popis: tr('Na stred') },
  ],
};
const NIE_KLASICKE = (d: Record<string, unknown>) => d.vzhlad === 'obrazkove' || d.vzhlad === 'velke';

/** Všetky typy blokov - poradie = poradie v ponuke „Pridať blok". */
export const DEFINICIE_BLOKOV: DefBloku[] = [
  {
    typ: 'text',
    skupina: 'zaklad',
    nazov: tr('Text'),
    popis: tr('Formátovaný text s obrázkami a odkazmi'),
    ikona: 'clanky',
    polia: [{ kluc: 'html', menovka: tr('Text'), druh: 'html' }],
  },
  {
    typ: 'nadpis',
    skupina: 'zaklad',
    nazov: tr('Nadpis sekcie'),
    popis: tr('Štítok, veľký nadpis a krátky úvod'),
    ikona: 'stranky',
    polia: [
      {
        kluc: 'stitok',
        menovka: tr('Štítok nad nadpisom'),
        druh: 'text',
        max: 60,
        placeholder: tr('Od roku 1932'),
      },
      NADPIS,
      { kluc: 'text', menovka: tr('Úvodný text'), druh: 'dlhy', max: 600 },
      ZAROVNANIE,
    ],
  },
  {
    typ: 'casova_os',
    skupina: 'obsah',
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
        {
          kluc: 'rok',
          menovka: tr('Rok alebo dátum'),
          druh: 'text',
          max: 20,
          placeholder: '1932',
        },
        NADPIS,
        { kluc: 'text', menovka: tr('Text'), druh: 'dlhy', max: 1500 },
        {
          kluc: 'obrazok',
          menovka: tr('Obrázok (nepovinné)'),
          druh: 'obrazok',
        },
      ],
    },
  },
  {
    typ: 'osoby',
    skupina: 'obsah',
    nazov: tr('Karty osôb'),
    popis: tr('Vedenie klubu, tréneri, kontakty'),
    ikona: 'pouzivatelia',
    data: { nadpis: tr('Vedenie klubu'), stlpce: '4' },
    polia: [
      NADPIS,
      UVOD,
      STLPCE,
      {
        kluc: 'vzhlad',
        menovka: tr('Vzhľad kariet'),
        druh: 'vyber',
        moznosti: [
          { hodnota: 'karty', popis: tr('Veľké karty s fotkou') },
          {
            hodnota: 'kompaktne',
            popis: tr('Kompaktné - okrúhla fotka vedľa mena'),
          },
        ],
      },
    ],
    polozky: {
      nazov: tr('Osoba'),
      max: 60,
      titulok: (p) => [p.meno, p.funkcia].filter(Boolean).join(' · '),
      polia: [
        { kluc: 'foto', menovka: tr('Fotka'), druh: 'obrazok' },
        {
          kluc: 'meno',
          menovka: tr('Meno a priezvisko'),
          druh: 'text',
          max: 100,
        },
        {
          kluc: 'funkcia',
          menovka: tr('Funkcia'),
          druh: 'text',
          max: 100,
          placeholder: tr('Predseda'),
        },
        { kluc: 'text', menovka: tr('Krátky popis'), druh: 'dlhy', max: 600 },
        { kluc: 'email', menovka: tr('E-mail'), druh: 'text', max: 150 },
        { kluc: 'telefon', menovka: tr('Telefón'), druh: 'text', max: 40 },
      ],
    },
  },
  {
    typ: 'karty',
    skupina: 'obsah',
    nazov: tr('Karty'),
    popis: tr('Karty s obrázkom, textom a odkazom'),
    ikona: 'dashboard',
    data: { stlpce: '3' },
    polia: [
      NADPIS,
      UVOD,
      STLPCE,
      {
        kluc: 'vzhlad',
        menovka: tr('Rozloženie kariet'),
        druh: 'vyber',
        moznosti: [
          { hodnota: 'klasicke', popis: tr('Klasické - obrázok nad textom') },
          { hodnota: 'prekryv', popis: tr('Text cez obrázok') },
          {
            hodnota: 'vodorovne',
            popis: tr('Vodorovné - obrázok vedľa textu'),
          },
          { hodnota: 'jednoduche', popis: tr('Jednoduché - bez rámčeka') },
          { hodnota: 'klub', popis: tr('Odkaz klubu - ovál s názvom a tlačidlom (História, Legendy…)') },
        ],
      },
    ],
    polozky: {
      nazov: tr('Karta'),
      max: 24,
      titulok: (p) => String(p.nadpis || ''),
      polia: [
        {
          kluc: 'obrazok',
          menovka: tr('Obrázok (nepovinné)'),
          druh: 'obrazok',
        },
        NADPIS,
        { kluc: 'text', menovka: tr('Text'), druh: 'dlhy', max: 600 },
        ODKAZ,
        TLACIDLO,
      ],
    },
  },
  {
    typ: 'cisla',
    skupina: 'obsah',
    nazov: tr('Čísla'),
    popis: tr('Klub v číslach - rok založenia, počet členov…'),
    ikona: 'ligy',
    polia: [NADPIS],
    polozky: {
      nazov: tr('Číslo'),
      max: 8,
      titulok: (p) => [p.hodnota, p.popis].filter(Boolean).join(' · '),
      polia: [
        {
          kluc: 'hodnota',
          menovka: tr('Hodnota'),
          druh: 'text',
          max: 20,
          placeholder: '1932',
        },
        {
          kluc: 'popis',
          menovka: tr('Popis'),
          druh: 'text',
          max: 80,
          placeholder: tr('Rok založenia'),
        },
      ],
    },
  },
  {
    typ: 'obrazok_text',
    skupina: 'obsah',
    nazov: tr('Obrázok s textom'),
    popis: tr('Fotka vedľa textu, voliteľne s tlačidlom'),
    ikona: 'media',
    polia: [
      { kluc: 'obrazok', menovka: tr('Obrázok'), druh: 'obrazok' },
      {
        kluc: 'stitok',
        menovka: tr('Štítok nad nadpisom'),
        druh: 'text',
        max: 60,
      },
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
    skupina: 'media',
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
    skupina: 'zaklad',
    nazov: tr('Citát'),
    popis: tr('Výrok s menom a fotkou autora'),
    ikona: 'komentare',
    polia: [
      { kluc: 'text', menovka: tr('Citát'), druh: 'dlhy', max: 1000 },
      { kluc: 'autor', menovka: tr('Autor'), druh: 'text', max: 100 },
      {
        kluc: 'funkcia',
        menovka: tr('Funkcia autora'),
        druh: 'text',
        max: 100,
      },
      { kluc: 'foto', menovka: tr('Fotka autora'), druh: 'obrazok' },
    ],
  },
  {
    typ: 'vyzva',
    skupina: 'zaklad',
    nazov: tr('Výzva s tlačidlom'),
    popis: tr('Výrazný pás s nadpisom a tlačidlom'),
    ikona: 'live',
    polia: [
      NADPIS,
      { kluc: 'text', menovka: tr('Text'), druh: 'dlhy', max: 600 },
      TLACIDLO,
      ODKAZ,
      {
        kluc: 'obrazok',
        menovka: tr('Obrázok na pozadí (nepovinné)'),
        druh: 'obrazok',
      },
    ],
  },
  {
    typ: 'faq',
    skupina: 'obsah',
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
    skupina: 'obsah',
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
        {
          kluc: 'nazov',
          menovka: tr('Názov'),
          druh: 'text',
          max: 150,
          placeholder: tr('Víťaz 5. ligy'),
        },
        { kluc: 'popis', menovka: tr('Popis'), druh: 'text', max: 200 },
      ],
    },
  },
  {
    typ: 'tlacidla',
    skupina: 'zaklad',
    nazov: tr('Tlačidlá a dlaždice'),
    popis: tr('Klasické tlačidlá, obrázkové alebo veľké dlaždice s odkazmi'),
    ikona: 'odkaz',
    data: { vzhlad: 'klasicke', zarovnanie: 'vlavo', stlpce: '3' },
    polia: [
      NADPIS,
      {
        kluc: 'vzhlad',
        menovka: tr('Vzhľad'),
        druh: 'vyber',
        moznosti: [
          { hodnota: 'klasicke', popis: tr('Klasické tlačidlá') },
          { hodnota: 'obrazkove', popis: tr('Obrázkové dlaždice') },
          { hodnota: 'velke', popis: tr('Veľké farebné dlaždice') },
        ],
      },
      { ...ZAROVNANIE, ak: (d) => !NIE_KLASICKE(d) },
      { ...STLPCE, ak: NIE_KLASICKE },
    ],
    polozky: {
      nazov: tr('Tlačidlo'),
      max: 12,
      titulok: (p) => String(p.text || ''),
      polia: [
        {
          kluc: 'text',
          menovka: tr('Text'),
          druh: 'text',
          max: 60,
          placeholder: tr('Registrácia'),
        },
        {
          kluc: 'popis',
          menovka: tr('Popis pod textom'),
          druh: 'text',
          max: 200,
          ak: NIE_KLASICKE,
        },
        ODKAZ,
        {
          kluc: 'obrazok',
          menovka: tr('Obrázok dlaždice'),
          druh: 'obrazok',
          ak: NIE_KLASICKE,
        },
        {
          kluc: 'styl',
          menovka: tr('Farba'),
          druh: 'vyber',
          moznosti: [
            { hodnota: 'hlavne', popis: tr('Hlavná farba klubu') },
            { hodnota: 'obrys', popis: tr('Obrys') },
            { hodnota: 'tmave', popis: tr('Tmavé') },
          ],
        },
        {
          kluc: 'nove_okno',
          menovka: tr('Otvoriť v novom okne'),
          druh: 'prepinac',
        },
      ],
    },
  },
  {
    typ: 'podmenu',
    skupina: 'zaklad',
    nazov: tr('Podmenu stránky'),
    popis: tr('Obsah stránky - odkazy na jednotlivé sekcie'),
    ikona: 'menu',
    data: { rezim: 'automaticke', prilepene: true },
    polia: [
      {
        kluc: 'rezim',
        menovka: tr('Položky podmenu'),
        druh: 'vyber',
        moznosti: [
          {
            hodnota: 'automaticke',
            popis: tr('Automaticky z nadpisov blokov na stránke'),
          },
          { hodnota: 'vlastne', popis: tr('Vlastné odkazy') },
        ],
        napoveda: tr('Automatické podmenu obsahuje každý blok, ktorý má vyplnený nadpis.'),
      },
      {
        kluc: 'prilepene',
        menovka: tr('Pri posúvaní zostane podmenu hore'),
        druh: 'prepinac',
      },
    ],
    polozky: {
      nazov: tr('Odkaz'),
      max: 20,
      titulok: (p) => String(p.text || ''),
      ak: (d) => d.rezim === 'vlastne',
      polia: [
        { kluc: 'text', menovka: tr('Text'), druh: 'text', max: 60 },
        {
          ...ODKAZ,
          napoveda: tr('Na sekciu tejto stránky odkážete cez #blok-… (kotvu nájdete pri bloku).'),
        },
      ],
    },
  },
  {
    typ: 'stlpce',
    skupina: 'zaklad',
    nazov: tr('Text v stĺpcoch'),
    popis: tr('Dva alebo tri stĺpce formátovaného textu vedľa seba'),
    ikona: 'clanky',
    data: { pocet: '2' },
    polia: [
      {
        kluc: 'pocet',
        menovka: tr('Počet stĺpcov'),
        druh: 'vyber',
        moznosti: [
          { hodnota: '2', popis: '2' },
          { hodnota: '3', popis: '3' },
        ],
      },
      { kluc: 'html1', menovka: tr('1. stĺpec'), druh: 'html' },
      { kluc: 'html2', menovka: tr('2. stĺpec'), druh: 'html' },
      {
        kluc: 'html3',
        menovka: tr('3. stĺpec'),
        druh: 'html',
        ak: (d) => d.pocet === '3',
      },
    ],
  },
  {
    typ: 'oddelovac',
    skupina: 'zaklad',
    nazov: tr('Oddeľovač'),
    popis: tr('Čiara alebo voľné miesto medzi blokmi'),
    ikona: 'presunut',
    data: { styl: 'ciara', velkost: 'stredna' },
    polia: [
      {
        kluc: 'styl',
        menovka: tr('Štýl'),
        druh: 'vyber',
        moznosti: [
          { hodnota: 'ciara', popis: tr('Čiara') },
          { hodnota: 'medzera', popis: tr('Len medzera') },
        ],
      },
      {
        kluc: 'velkost',
        menovka: tr('Veľkosť'),
        druh: 'vyber',
        moznosti: [
          { hodnota: 'mala', popis: tr('Malá') },
          { hodnota: 'stredna', popis: tr('Stredná') },
          { hodnota: 'velka', popis: tr('Veľká') },
        ],
      },
    ],
  },
  {
    typ: 'tabulka',
    skupina: 'obsah',
    nazov: tr('Tabuľka'),
    popis: tr('Vlastná tabuľka - tréningy, cenník, rozpis…'),
    ikona: 'kalendar',
    data: {
      pruhovana: true,
      tabulka: { hlavicka: ['', ''], riadky: [['', '']] },
    },
    polia: [
      NADPIS,
      { kluc: 'popis', menovka: tr('Popis'), druh: 'dlhy', max: 600 },
      { kluc: 'tabulka', menovka: tr('Obsah tabuľky'), druh: 'tabulka' },
      {
        kluc: 'pruhovana',
        menovka: tr('Striedať farbu riadkov'),
        druh: 'prepinac',
      },
    ],
  },
  {
    typ: 'kroky',
    skupina: 'obsah',
    nazov: tr('Postup v krokoch'),
    popis: tr('Očíslované kroky - ako sa prihlásiť, ako na to'),
    ikona: 'zapasy',
    data: { nadpis: tr('Ako na to') },
    polia: [NADPIS, UVOD],
    polozky: {
      nazov: tr('Krok'),
      max: 12,
      titulok: (p) => String(p.nadpis || ''),
      polia: [NADPIS, { kluc: 'text', menovka: tr('Text'), druh: 'dlhy', max: 600 }],
    },
  },
  {
    typ: 'vyhody',
    skupina: 'obsah',
    nazov: tr('Výhody a vlastnosti'),
    popis: tr('Mriežka krátkych bodov so značkou'),
    ikona: 'gdpr',
    data: { stlpce: '3' },
    polia: [NADPIS, UVOD, STLPCE],
    polozky: {
      nazov: tr('Výhoda'),
      max: 24,
      titulok: (p) => String(p.nadpis || ''),
      polia: [NADPIS, { kluc: 'text', menovka: tr('Text'), druh: 'dlhy', max: 400 }],
    },
  },
  {
    typ: 'cennik',
    skupina: 'obsah',
    nazov: tr('Cenník / balíčky'),
    popis: tr('Členské príspevky, permanentky alebo balíčky pre partnerov'),
    ikona: 'platba',
    data: { nadpis: tr('Členské príspevky') },
    polia: [NADPIS, UVOD],
    polozky: {
      nazov: tr('Balíček'),
      max: 6,
      titulok: (p) => [p.nazov, p.cena].filter(Boolean).join(' · '),
      polia: [
        {
          kluc: 'nazov',
          menovka: tr('Názov'),
          druh: 'text',
          max: 80,
          placeholder: tr('Člen'),
        },
        {
          kluc: 'cena',
          menovka: tr('Cena'),
          druh: 'text',
          max: 30,
          placeholder: '20 €',
        },
        {
          kluc: 'obdobie',
          menovka: tr('Obdobie'),
          druh: 'text',
          max: 40,
          placeholder: tr('/ rok'),
        },
        {
          kluc: 'vyhody',
          menovka: tr('Čo obsahuje'),
          druh: 'dlhy',
          max: 1500,
          napoveda: tr('Každú položku napíšte na nový riadok.'),
        },
        TLACIDLO,
        ODKAZ,
        {
          kluc: 'zvyraznene',
          menovka: tr('Zvýrazniť (odporúčame)'),
          druh: 'prepinac',
        },
      ],
    },
  },
  {
    typ: 'video',
    skupina: 'media',
    nazov: tr('Video'),
    popis: tr('Video z YouTube alebo Vimeo'),
    ikona: 'videa',
    polia: [
      NADPIS,
      {
        kluc: 'url',
        menovka: tr('Adresa videa'),
        druh: 'text',
        max: 300,
        placeholder: 'https://www.youtube.com/watch?v=…',
      },
      { kluc: 'popis', menovka: tr('Popis'), druh: 'text', max: 200 },
    ],
  },
  {
    typ: 'mapa',
    skupina: 'media',
    nazov: tr('Mapa'),
    popis: tr('Mapa Google podľa adresy'),
    ikona: 'stadion',
    data: { nadpis: tr('Kde nás nájdete') },
    polia: [
      NADPIS,
      {
        kluc: 'adresa',
        menovka: tr('Adresa'),
        druh: 'text',
        max: 200,
        placeholder: tr('Športová 12, Dolina'),
      },
    ],
  },
  {
    typ: 'formular',
    skupina: 'klub',
    nazov: tr('Formulár'),
    popis: tr('Formulár z časti Formuláre'),
    ikona: 'formular',
    polia: [{ kluc: 'slug', menovka: tr('Formulár'), druh: 'formular' }],
  },
  {
    typ: 'clanky',
    skupina: 'klub',
    nazov: tr('Najnovšie články'),
    popis: tr('Automaticky posledné články, aj z jednej rubriky'),
    ikona: 'clanky',
    data: { nadpis: tr('Najnovšie články'), pocet: 3 },
    polia: [NADPIS, { kluc: 'pocet', menovka: tr('Počet článkov'), druh: 'cislo' }, { kluc: 'rubrika', menovka: tr('Rubrika'), druh: 'rubrika' }],
  },
  {
    typ: 'zapasy',
    skupina: 'klub',
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
    skupina: 'klub',
    nazov: tr('Partneri'),
    popis: tr('Logá partnerov z časti Sponzori'),
    ikona: 'timy',
    data: { nadpis: tr('Naši partneri') },
    polia: [NADPIS],
  },
  {
    typ: 'kontakt',
    skupina: 'klub',
    nazov: tr('Kontaktné údaje'),
    popis: tr('Adresa, e-mail, telefón a sociálne siete z nastavení klubu'),
    ikona: 'zvonik',
    data: { mapa: true, fakturacne: true },
    polia: [
      NADPIS,
      { kluc: 'text', menovka: tr('Úvodný text'), druh: 'dlhy', max: 600 },
      { kluc: 'mapa', menovka: tr('Zobraziť mapu'), druh: 'prepinac' },
      {
        kluc: 'fakturacne',
        menovka: tr('Zobraziť fakturačné údaje (IČO, DIČ, účet)'),
        druh: 'prepinac',
      },
    ],
  },
  {
    typ: 'stadion',
    skupina: 'klub',
    nazov: tr('Štadión'),
    popis: tr('Adresa, kapacita, povrch a fotka štadióna z časti Štadióny'),
    ikona: 'stadion',
    data: { mapa: true },
    polia: [
      { kluc: 'stadion_id', menovka: tr('Štadión'), druh: 'stadion' },
      { kluc: 'text', menovka: tr('Doplňujúci text'), druh: 'html' },
      { kluc: 'mapa', menovka: tr('Zobraziť mapu'), druh: 'prepinac' },
    ],
  },
  {
    typ: 'registracia',
    skupina: 'klub',
    nazov: tr('Registrácia fanúšika / člena'),
    popis: tr('Prihláška na web - žiadosti nájdete vo Fanúšikoch'),
    ikona: 'pouzivatelia',
    data: { nadpis: tr('Registrácia'), typ: 'vyber' },
    polia: [
      NADPIS,
      { kluc: 'text', menovka: tr('Úvodný text'), druh: 'dlhy', max: 600 },
      {
        kluc: 'typ',
        menovka: tr('Registrácia pre'),
        druh: 'vyber',
        moznosti: [
          {
            hodnota: 'vyber',
            popis: tr('Fanúšik aj člen - vyberie návštevník'),
          },
          { hodnota: 'fanusik', popis: tr('Len fanúšikov') },
          { hodnota: 'clen', popis: tr('Len členov klubu') },
        ],
      },
    ],
  },
  {
    typ: 'dve_percenta',
    skupina: 'klub',
    nazov: tr('2 % z dane'),
    popis: tr('Údaje prijímateľa s tlačidlami na kopírovanie'),
    ikona: 'licencia',
    data: { nadpis: tr('Údaje o prijímateľovi'), termin: tr('do 30. apríla') },
    polia: [
      NADPIS,
      { kluc: 'text', menovka: tr('Úvodný text'), druh: 'dlhy', max: 600 },
      {
        kluc: 'prijimatel',
        menovka: tr('Názov prijímateľa'),
        druh: 'text',
        max: 200,
        napoveda: tr('Prázdne polia sa doplnia z nastavení klubu.'),
      },
      { kluc: 'ico', menovka: tr('IČO'), druh: 'text', max: 20 },
      {
        kluc: 'pravna_forma',
        menovka: tr('Právna forma'),
        druh: 'text',
        max: 80,
        placeholder: tr('Občianske združenie'),
      },
      { kluc: 'sidlo', menovka: tr('Sídlo'), druh: 'text', max: 200 },
      { kluc: 'termin', menovka: tr('Termín'), druh: 'text', max: 60 },
      {
        kluc: 'tlacivo',
        menovka: tr('Odkaz na tlačivo (vyhlásenie)'),
        druh: 'odkaz',
      },
      { kluc: 'poznamka', menovka: tr('Poznámka'), druh: 'dlhy', max: 600 },
    ],
  },
];

const definicia = (typ: string) => DEFINICIE_BLOKOV.find((d) => d.typ === typ);

/** Predvyplnené bloky v ponuke - existujúci typ s pripraveným vzhľadom a položkami. */
interface RychlyBlok {
  kluc: string;
  typ: string;
  nazov: string;
  popis: string;
  ikona: string;
  skupina: SkupinaBlokov;
  data: Record<string, unknown>;
  polozky?: Array<Record<string, unknown>>;
}

const RYCHLE_BLOKY: RychlyBlok[] = [
  {
    kluc: 'odkaz_klubu',
    typ: 'karty',
    nazov: tr('Odkaz klubu'),
    popis: tr('Karty s oválom a tlačidlom Objaviť - História, Legendy, Trofeje'),
    ikona: 'ligy',
    skupina: 'obsah',
    data: { nadpis: tr('Odkaz klubu'), stlpce: '3', vzhlad: 'klub' },
    polozky: [
      { nadpis: tr('História'), tlacidlo: tr('Objaviť') },
      { nadpis: tr('Legendy'), tlacidlo: tr('Objaviť') },
      { nadpis: tr('Trofeje'), tlacidlo: tr('Objaviť') },
    ],
  },
];

const noveId = () => `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Krátky popis bloku v zbalenom stave. */
const zhrnutie = (b: BlokStranky): string => {
  const d = b.data ?? {};
  const html = typeof d.html === 'string' ? d.html : typeof d.html1 === 'string' ? d.html1 : '';
  const text = d.nadpis || d.autor || d.adresa || d.slug || d.prijimatel || html.replace(/<[^>]*>/g, ' ');
  const pocet = b.polozky?.length ? ` · ${b.polozky.length}×` : '';
  return `${String(text).replace(/\s+/g, ' ').trim().slice(0, 80)}${pocet}`;
};

// ===== Pole formulára =====

interface Zdroje {
  formulare: Array<{ hodnota: string; popis: string }>;
  rubriky: Array<{ hodnota: string; popis: string }>;
  timy: Array<{ hodnota: string; popis: string }>;
  stadiony: Array<{ hodnota: string; popis: string }>;
}

// ===== Editor tabuľky =====

const MAX_STLPCOV = 8;
const MAX_RIADKOV = 100;

interface Tabulka {
  hlavicka: string[];
  riadky: string[][];
}

const nacitajTabulku = (hodnota: unknown): Tabulka => {
  const t = hodnota && typeof hodnota === 'object' ? (hodnota as Partial<Tabulka>) : {};
  const hlavicka = Array.isArray(t.hlavicka) && t.hlavicka.length ? t.hlavicka.map((h) => String(h ?? '')) : ['', ''];
  const riadky = (Array.isArray(t.riadky) ? t.riadky : []).map((r) => hlavicka.map((_, i) => String((Array.isArray(r) ? r[i] : '') ?? '')));
  return { hlavicka, riadky };
};

/** Mriežka na úpravu tabuľky - hlavička, bunky, pridanie/odobratie stĺpcov a riadkov, vloženie z Excelu. */
const EditorTabulky: React.FC<{
  menovka: string;
  hodnota: unknown;
  onZmena: (t: Tabulka) => void;
}> = ({ menovka, hodnota, onZmena }) => {
  const t = nacitajTabulku(hodnota);
  const stlpcov = t.hlavicka.length;

  const nastavBunku = (riadok: number, stlpec: number, text: string) => {
    if (riadok < 0)
      onZmena({
        ...t,
        hlavicka: t.hlavicka.map((h, i) => (i === stlpec ? text : h)),
      });
    else
      onZmena({
        ...t,
        riadky: t.riadky.map((r, ri) => (ri === riadok ? r.map((c, ci) => (ci === stlpec ? text : c)) : r)),
      });
  };

  // Vloženie viacerých buniek naraz (skopírované z Excelu alebo Tabuliek Google)
  const vlozenie = (riadok: number, stlpec: number) => (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text.includes('\t') && !text.includes('\n')) return;
    e.preventDefault();
    const data = text
      .replace(/\r/g, '')
      .replace(/\n+$/, '')
      .split('\n')
      .map((r) => r.split('\t'));
    const sirka = Math.min(MAX_STLPCOV, Math.max(stlpcov, stlpec + Math.max(...data.map((r) => r.length))));
    const hlavicka = Array.from({ length: sirka }, (_, i) => t.hlavicka[i] ?? '');
    const riadky = t.riadky.map((r) => Array.from({ length: sirka }, (_, i) => r[i] ?? ''));
    data.forEach((r, di) => {
      const ciel = riadok + di;
      if (ciel >= MAX_RIADKOV) return;
      if (ciel >= 0) while (riadky.length <= ciel) riadky.push(Array(sirka).fill(''));
      r.forEach((bunka, dj) => {
        const s = stlpec + dj;
        if (s >= sirka) return;
        if (ciel < 0) hlavicka[s] = bunka.trim();
        else riadky[ciel][s] = bunka.trim();
      });
    });
    onZmena({ hlavicka, riadky });
  };

  const pridajStlpec = () =>
    onZmena({
      hlavicka: [...t.hlavicka, ''],
      riadky: t.riadky.map((r) => [...r, '']),
    });
  const odoberStlpec = (i: number) =>
    onZmena({
      hlavicka: t.hlavicka.filter((_, j) => j !== i),
      riadky: t.riadky.map((r) => r.filter((_, j) => j !== i)),
    });
  const pridajRiadok = () => onZmena({ ...t, riadky: [...t.riadky, Array(stlpcov).fill('')] });
  const odoberRiadok = (i: number) => onZmena({ ...t, riadky: t.riadky.filter((_, j) => j !== i) });
  const posunRiadok = (i: number, smer: -1 | 1) => {
    const ciel = i + smer;
    if (ciel < 0 || ciel >= t.riadky.length) return;
    const riadky = [...t.riadky];
    [riadky[i], riadky[ciel]] = [riadky[ciel], riadky[i]];
    onZmena({ ...t, riadky });
  };

  return (
    <div className="cw-field cw-tabulka">
      <span className="cw-field__label">{menovka}</span>
      <div className="cw-tabulka__obal">
        <table>
          <thead>
            <tr>
              {t.hlavicka.map((h, i) => (
                <th key={i}>
                  <div className="cw-tabulka__bunka">
                    <input
                      value={h}
                      maxLength={100}
                      placeholder={tr('Stĺpec {n}', { n: i + 1 })}
                      aria-label={tr('Stĺpec {n}', { n: i + 1 })}
                      onChange={(e) => nastavBunku(-1, i, e.target.value)}
                      onPaste={vlozenie(-1, i)}
                    />
                    {stlpcov > 1 && (
                      <button type="button" className="cw-tabulka__odober" onClick={() => odoberStlpec(i)} aria-label={tr('Odstrániť stĺpec')} title={tr('Odstrániť stĺpec')}>
                        <Icon nazov="zavriet" velkost={12} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="cw-tabulka__akcie" />
            </tr>
          </thead>
          <tbody>
            {t.riadky.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, ci) => (
                  <td key={ci}>
                    <input
                      value={c}
                      maxLength={300}
                      aria-label={tr('Riadok {r}, stĺpec {s}', {
                        r: ri + 1,
                        s: ci + 1,
                      })}
                      onChange={(e) => nastavBunku(ri, ci, e.target.value)}
                      onPaste={vlozenie(ri, ci)}
                    />
                  </td>
                ))}
                <td className="cw-tabulka__akcie">
                  <button type="button" disabled={ri === 0} onClick={() => posunRiadok(ri, -1)} aria-label={tr('Posunúť vyššie')}>
                    ↑
                  </button>
                  <button type="button" disabled={ri === t.riadky.length - 1} onClick={() => posunRiadok(ri, 1)} aria-label={tr('Posunúť nižšie')}>
                    ↓
                  </button>
                  <button type="button" onClick={() => odoberRiadok(ri)} aria-label={tr('Odstrániť riadok')}>
                    <Icon nazov="zmazat" velkost={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cw-tabulka__tlacidla">
        <Button velkost="sm" variant="secondary" ikona={<Icon nazov="plus" velkost={14} />} onClick={pridajRiadok} disabled={t.riadky.length >= MAX_RIADKOV}>
          {tr('Pridať riadok')}
        </Button>
        <Button velkost="sm" variant="secondary" ikona={<Icon nazov="plus" velkost={14} />} onClick={pridajStlpec} disabled={stlpcov >= MAX_STLPCOV}>
          {tr('Pridať stĺpec')}
        </Button>
        <small>{tr('Tip: bunky môžete skopírovať z Excelu a vložiť naraz.')}</small>
      </div>
    </div>
  );
};

const PoleBloku: React.FC<{
  pole: DefPola;
  hodnota: unknown;
  onZmena: (h: unknown) => void;
  zdroje: Zdroje;
}> = ({ pole, hodnota, onZmena, zdroje }) => {
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
      return (
        <Textarea
          menovka={pole.menovka}
          value={text}
          rows={3}
          maxLength={pole.max}
          placeholder={pole.placeholder}
          napoveda={pole.napoveda}
          onChange={(e) => onZmena(e.target.value)}
        />
      );
    case 'obrazok':
      return <PoleObrazka menovka={pole.menovka} hodnota={text || null} onZmena={onZmena} tvar="siroky" napoveda={pole.napoveda} />;
    case 'cislo':
      return <Input menovka={pole.menovka} type="number" min={1} max={12} value={text} onChange={(e) => onZmena(e.target.value === '' ? null : Number(e.target.value))} />;
    case 'prepinac':
      return (
        <div className="cw-blok__prepinac-pole">
          <Switch zapnute={hodnota === true} onZmena={onZmena} menovka={pole.menovka} />
          {pole.napoveda && <small>{pole.napoveda}</small>}
        </div>
      );
    case 'tabulka':
      return <EditorTabulky menovka={pole.menovka} hodnota={hodnota} onZmena={onZmena} />;
    case 'stadion':
      return (
        <Select
          menovka={pole.menovka}
          value={text && text !== '0' ? text : ''}
          prazdna={tr('Prvý štadión klubu')}
          moznosti={zdroje.stadiony}
          onChange={(e) => onZmena(e.target.value ? Number(e.target.value) : null)}
        />
      );
    case 'vyber':
      return (
        <Select menovka={pole.menovka} value={text || pole.moznosti![0].hodnota} moznosti={pole.moznosti!} napoveda={pole.napoveda} onChange={(e) => onZmena(e.target.value)} />
      );
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

export const EditorBlokov: React.FC<{
  bloky: BlokStranky[];
  onZmena: (bloky: BlokStranky[]) => void;
}> = ({ bloky, onZmena }) => {
  const [rozbalene, setRozbalene] = useState<Set<string>>(new Set());
  const [rozbalenePolozky, setRozbalenePolozky] = useState<Set<string>>(new Set());
  const [ponuka, setPonuka] = useState(false);

  const formulare = useNacitanie((signal) => formulareApi.vypis(signal));
  const rubriky = useNacitanie((signal) => kategorieSpravaApi.vypis(signal));
  const timy = useNacitanie((signal) => timyApi.vypis(signal));
  const stadiony = useNacitanie((signal) => stadionyApi.vypis(signal));
  const [hladanyTyp, setHladanyTyp] = useState('');
  const zdroje: Zdroje = {
    formulare: (formulare.data ?? []).map((f) => ({
      hodnota: f.slug,
      popis: f.nazov,
    })),
    rubriky: (rubriky.data ?? []).map((r) => ({
      hodnota: r.slug,
      popis: r.nazov,
    })),
    timy: (timy.data ?? []).map((t) => ({
      hodnota: String(t.id),
      popis: t.nazov,
    })),
    stadiony: (stadiony.data ?? []).map((s) => ({
      hodnota: String(s.id),
      popis: s.nazov,
    })),
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
  const pridaj = (typ: string, rychly?: RychlyBlok) => {
    const def = definicia(typ)!;
    const blok: BlokStranky = {
      id: noveId(),
      typ,
      data: { ...(def.data ?? {}), ...(rychly?.data ?? {}) },
      pozadie: 'biele',
      skryty: false,
    };
    const sPolozkami = def.polozky && (!def.polozky.ak || def.polozky.ak(blok.data));
    if (sPolozkami) blok.polozky = rychly?.polozky ? rychly.polozky.map((x) => ({ ...x })) : [{}];
    onZmena([...bloky, blok]);
    setRozbalene(new Set(rozbalene).add(blok.id));
    if (sPolozkami) setRozbalenePolozky(new Set(rozbalenePolozky).add(`${blok.id}:0`));
    setPonuka(false);
    setHladanyTyp('');
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
                  {def.polia
                    .filter((pole) => !pole.ak || pole.ak(b.data ?? {}))
                    .map((pole) => (
                      <PoleBloku key={pole.kluc} pole={pole} hodnota={b.data?.[pole.kluc]} zdroje={zdroje} onZmena={(h) => uprav(i, { data: { ...b.data, [pole.kluc]: h } })} />
                    ))}

                  {def.polozky && (!def.polozky.ak || def.polozky.ak(b.data ?? {})) && (
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
                              <Button
                                velkost="sm"
                                variant="ghost"
                                disabled={j === 0}
                                onClick={() => upravPolozky(polozky.map((x, k) => (k === j - 1 ? polozky[j] : k === j ? polozky[j - 1] : x)))}
                                aria-label={tr('Posunúť vyššie')}
                              >
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
                                {def
                                  .polozky!.polia.filter((pole) => !pole.ak || pole.ak(b.data ?? {}))
                                  .map((pole) => (
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
                          {tr('Pridať: {nazov}', {
                            nazov: def.polozky.nazov.toLowerCase(),
                          })}
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="cw-blok__vzhlad">
                    <Select
                      menovka={tr('Pozadie bloku')}
                      value={b.pozadie || 'biele'}
                      onChange={(e) =>
                        uprav(i, {
                          pozadie: e.target.value as BlokStranky['pozadie'],
                        })
                      }
                      moznosti={[
                        { hodnota: 'biele', popis: tr('Svetlé') },
                        { hodnota: 'sive', popis: tr('Sivé') },
                        { hodnota: 'tmave', popis: tr('Tmavé') },
                      ]}
                    />
                    <Switch zapnute={Boolean(b.skryty)} onZmena={(v) => uprav(i, { skryty: v })} menovka={tr('Skryť blok na webe')} />
                  </div>
                  <small className="cw-blok__kotva">
                    {tr('Odkaz na tento blok:')} <code>#{kotvaBloku(b)}</code>
                  </small>
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
          <Input value={hladanyTyp} onChange={(e) => setHladanyTyp(e.target.value)} placeholder={tr('Hľadať blok…')} aria-label={tr('Hľadať blok…')} autoFocus />
          {SKUPINY_BLOKOV.map((skupina) => {
            const hladane = hladanyTyp.trim().toLowerCase();
            const sedi = (d: { nazov: string; popis: string }) => !hladane || `${d.nazov} ${d.popis}`.toLowerCase().includes(hladane);
            const typy = [
              ...DEFINICIE_BLOKOV.filter((d) => d.skupina === skupina.kluc && sedi(d)).map((d) => ({ kluc: d.typ, typ: d.typ, nazov: d.nazov, popis: d.popis, ikona: d.ikona, rychly: undefined as RychlyBlok | undefined })),
              ...RYCHLE_BLOKY.filter((r) => r.skupina === skupina.kluc && sedi(r)).map((r) => ({ ...r, rychly: r })),
            ];
            if (typy.length === 0) return null;
            return (
              <div key={skupina.kluc} className="cw-bloky__skupina">
                <span className="cw-bloky__skupina-nazov">{skupina.nazov}</span>
                <div className="cw-bloky__typy">
                  {typy.map((d) => (
                    <button key={d.kluc} type="button" className="cw-bloky__typ" onClick={() => pridaj(d.typ, d.rychly)}>
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
            );
          })}
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
