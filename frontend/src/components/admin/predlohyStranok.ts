// Umiestnenie: frontend/src/components/admin/predlohyStranok.ts
// Predlohy novej stránky z blokov (O klube, Členstvo, Kontakt, Štadión,
// Nábor detí, 2 % z dane, Časté otázky). Texty sú slovenský vzorový obsah
// verejného webu - klub si ich po vytvorení stránky prepíše. Údaje klubu
// (kontakt, IČO, štadión) bloky na webe berú z nastavení.

import type { BlokStranky } from '../../web/bloky/typy';
import { tr } from '../../i18n';

export interface PredlohaStranky {
  kluc: string;
  /** Názov predlohy v administrácii */
  titulok: string;
  popis: string;
  ikona: string;
  stranka: { nazov: string; slug: string; meta_description: string; bloky: BlokStranky[] };
}

export const PREDLOHY_STRANOK: PredlohaStranky[] = [
  {
    kluc: 'o-klube',
    titulok: tr('O klube'),
    popis: tr('História, čísla, vedenie a úspechy klubu'),
    ikona: 'hodiny',
    stranka: {
      nazov: 'O klube',
      slug: 'o-klube',
      meta_description: 'História, vedenie a úspechy klubu.',
      bloky: [
        {
          pozadie: 'biele',
          skryty: false,
          id: 'ok-uvod',
          typ: 'nadpis',
          data: { stitok: 'Od roku 1932', nadpis: 'O klube', text: 'Krátko predstavte klub - kto ste, kde hráte a čo je pre vás dôležité.', zarovnanie: 'vlavo' },
        },
        { pozadie: 'biele', skryty: false, id: 'ok-podmenu', typ: 'podmenu', data: { rezim: 'automaticke', prilepene: true } },
        {
          pozadie: 'biele',
          skryty: false,
          id: 'ok-cisla',
          typ: 'cisla',
          data: { nadpis: 'Klub v číslach' },
          polozky: [
            { hodnota: '1932', popis: 'Rok založenia' },
            { hodnota: '250', popis: 'Členov' },
            { hodnota: '12', popis: 'Družstiev' },
            { hodnota: '3', popis: 'Tituly' },
          ],
        },
        {
          pozadie: 'biele',
          skryty: false,
          id: 'ok-historia',
          typ: 'casova_os',
          data: { nadpis: 'História klubu', uvod: '' },
          polozky: [
            { rok: '1932', nadpis: 'Založenie klubu', text: 'Popíšte začiatky klubu.' },
            { rok: '1975', nadpis: 'Nový štadión', text: '' },
            { rok: '2020', nadpis: 'Postup do vyššej súťaže', text: '' },
          ],
        },
        {
          pozadie: 'biele',
          skryty: false,
          id: 'ok-vedenie',
          typ: 'osoby',
          data: { nadpis: 'Vedenie klubu', uvod: '', stlpce: '4', vzhlad: 'karty' },
          polozky: [
            { meno: 'Meno Priezvisko', funkcia: 'Predseda' },
            { meno: 'Meno Priezvisko', funkcia: 'Podpredseda' },
            { meno: 'Meno Priezvisko', funkcia: 'Sekretár' },
            { meno: 'Meno Priezvisko', funkcia: 'Hospodár' },
          ],
        },
        { pozadie: 'biele', skryty: false, id: 'ok-uspechy', typ: 'uspechy', data: { nadpis: 'Úspechy klubu' }, polozky: [{ rok: '2020', nazov: 'Víťaz súťaže', popis: '' }] },
      ],
    },
  },
  {
    kluc: 'clenstvo',
    titulok: tr('Členstvo'),
    popis: tr('Cenník príspevkov, výhody a registračný formulár'),
    ikona: 'pouzivatelia',
    stranka: {
      nazov: 'Členstvo',
      slug: 'clenstvo',
      meta_description: 'Staňte sa členom klubu - príspevky, výhody a registrácia.',
      bloky: [
        {
          pozadie: 'biele',
          skryty: false,
          id: 'cl-uvod',
          typ: 'nadpis',
          data: { stitok: 'Pridajte sa', nadpis: 'Členstvo v klube', text: 'Podporte klub a získajte výhody pre členov.', zarovnanie: 'vlavo' },
        },
        {
          pozadie: 'biele',
          skryty: false,
          id: 'cl-cennik',
          typ: 'cennik',
          data: { nadpis: 'Členské príspevky', uvod: '' },
          polozky: [
            { nazov: 'Fanúšik', cena: '0 €', obdobie: '', vyhody: 'Novinky e-mailom\nPozvánky na akcie', tlacidlo: 'Registrovať sa', odkaz: '/registracia', zvyraznene: false },
            {
              nazov: 'Člen',
              cena: '20 €',
              obdobie: '/ rok',
              vyhody: 'Členský preukaz\nHlasovacie právo\nZľava vo fanshope',
              tlacidlo: 'Stať sa členom',
              odkaz: '/registracia',
              zvyraznene: true,
            },
            {
              nazov: 'Permanentka',
              cena: '45 €',
              obdobie: '/ sezóna',
              vyhody: 'Voľný vstup na všetky domáce zápasy',
              tlacidlo: 'Mám záujem',
              odkaz: '/kontakt',
              zvyraznene: false,
            },
          ],
        },
        {
          pozadie: 'biele',
          skryty: false,
          id: 'cl-vyhody',
          typ: 'vyhody',
          data: { nadpis: 'Prečo sa stať členom', uvod: '', stlpce: '3' },
          polozky: [
            { nadpis: 'Hlas v klube', text: 'Členovia rozhodujú na členskej schôdzi.' },
            { nadpis: 'Zľavy', text: 'Zvýhodnené ceny vo fanshope.' },
            { nadpis: 'Komunita', text: 'Akcie a stretnutia pre členov.' },
          ],
        },
        {
          pozadie: 'biele',
          skryty: false,
          id: 'cl-registracia',
          typ: 'registracia',
          data: { nadpis: 'Registrácia', text: 'Vyplňte formulár, klub vás bude kontaktovať.', typ: 'vyber' },
        },
      ],
    },
  },
  {
    kluc: 'kontakt',
    titulok: tr('Kontakt'),
    popis: tr('Kontaktné údaje z nastavení, mapa a kontaktné osoby'),
    ikona: 'zvonik',
    stranka: {
      nazov: 'Kontakt',
      slug: 'kontakt',
      meta_description: 'Kontaktné údaje klubu, adresa, mapa a kontaktné osoby.',
      bloky: [
        {
          pozadie: 'biele',
          skryty: false,
          id: 'kontakt-uvod',
          typ: 'nadpis',
          data: { stitok: 'Kontakt', nadpis: 'Spojte sa s nami', text: 'Máte otázku k zápasom, členstvu alebo tréningom detí? Napíšte nám alebo zavolajte.', zarovnanie: 'vlavo' },
        },
        { pozadie: 'biele', skryty: false, id: 'kontakt-udaje', typ: 'kontakt', data: { nadpis: '', text: '', mapa: true, fakturacne: true } },
        {
          pozadie: 'biele',
          skryty: false,
          id: 'kontakt-osoby',
          typ: 'osoby',
          data: { nadpis: 'Kontaktné osoby', uvod: '', stlpce: '3', vzhlad: 'kompaktne' },
          polozky: [
            { meno: 'Meno Priezvisko', funkcia: 'Predseda klubu', email: '', telefon: '' },
            { meno: 'Meno Priezvisko', funkcia: 'Sekretár', email: '', telefon: '' },
            { meno: 'Meno Priezvisko', funkcia: 'Mládež', email: '', telefon: '' },
          ],
        },
      ],
    },
  },
  {
    kluc: 'stadion',
    titulok: tr('Štadión'),
    popis: tr('Údaje o štadióne, vybavenie a pozvánka na zápas'),
    ikona: 'stadion',
    stranka: {
      nazov: 'Štadión',
      slug: 'stadion',
      meta_description: 'Náš štadión - adresa, kapacita, vybavenie a ako sa k nám dostať.',
      bloky: [
        { pozadie: 'biele', skryty: false, id: 'stadion-uvod', typ: 'nadpis', data: { stitok: 'Náš domov', nadpis: 'Štadión', text: '', zarovnanie: 'vlavo' } },
        {
          pozadie: 'biele',
          skryty: false,
          id: 'stadion-udaje',
          typ: 'stadion',
          data: { stadion_id: null, text: '<p>Popíšte históriu štadióna, vstupy pre fanúšikov a parkovanie.</p>', mapa: true },
        },
        {
          pozadie: 'biele',
          skryty: false,
          id: 'stadion-vybavenie',
          typ: 'vyhody',
          data: { nadpis: 'Vybavenie', uvod: '', stlpce: '4' },
          polozky: [
            { nadpis: 'Tribúna', text: 'Kryté miesta na sedenie pre fanúšikov.' },
            { nadpis: 'Parkovisko', text: 'Bezplatné parkovanie pri štadióne.' },
            { nadpis: 'Občerstvenie', text: 'Bufet počas domácich zápasov.' },
            { nadpis: 'Šatne', text: 'Šatne a sprchy pre domácich aj hostí.' },
          ],
        },
        {
          pozadie: 'biele',
          skryty: false,
          id: 'stadion-vyzva',
          typ: 'vyzva',
          data: { nadpis: 'Príďte na najbližší zápas', text: 'Pozrite si program domácich zápasov.', tlacidlo: 'Program zápasov', odkaz: '/matches' },
        },
      ],
    },
  },
  {
    kluc: 'nabor-deti',
    titulok: tr('Nábor detí'),
    popis: tr('Výhody, tabuľka kategórií, postup a otázky rodičov'),
    ikona: 'hraci',
    stranka: {
      nazov: 'Nábor detí',
      slug: 'nabor-deti',
      meta_description: 'Prihláste dieťa do futbalu - kategórie, tréningy a ako sa prihlásiť.',
      bloky: [
        {
          pozadie: 'biele',
          skryty: false,
          id: 'nabor-uvod',
          typ: 'nadpis',
          data: {
            stitok: 'Nábor',
            nadpis: 'Pridaj sa k nám!',
            text: 'Hľadáme chlapcov a dievčatá, ktorí chcú hrať futbal. Prvé tréningy sú bezplatné a nie je potrebná žiadna skúsenosť.',
            zarovnanie: 'vlavo',
          },
        },
        {
          pozadie: 'biele',
          skryty: false,
          id: 'nabor-preco',
          typ: 'vyhody',
          data: { nadpis: 'Prečo práve k nám', uvod: '', stlpce: '3' },
          polozky: [
            { nadpis: 'Kvalifikovaní tréneri', text: 'Deti trénujú tréneri s licenciou.' },
            { nadpis: 'Hra na prvom mieste', text: 'Tréningy sú zábavné a primerané veku.' },
            { nadpis: 'Kamaráti a zápasy', text: 'Turnaje a súťaže počas celej sezóny.' },
          ],
        },
        {
          pozadie: 'biele',
          skryty: false,
          id: 'nabor-kategorie',
          typ: 'tabulka',
          data: {
            nadpis: 'Kategórie a tréningy',
            popis: '',
            pruhovana: true,
            tabulka: {
              hlavicka: ['Kategória', 'Ročník narodenia', 'Tréningy', 'Tréner'],
              riadky: [
                ['Prípravka', '2019 - 2020', 'Po, St 16:00', ''],
                ['U9', '2017 - 2018', 'Po, St 16:30', ''],
                ['U11', '2015 - 2016', 'Ut, Št 16:30', ''],
                ['U13', '2013 - 2014', 'Ut, Št 17:00', ''],
              ],
            },
          },
        },
        {
          pozadie: 'biele',
          skryty: false,
          id: 'nabor-kroky',
          typ: 'kroky',
          data: { nadpis: 'Ako sa prihlásiť', uvod: '' },
          polozky: [
            { nadpis: 'Príďte na tréning', text: 'Stačí športové oblečenie a fľaša s vodou.' },
            { nadpis: 'Vyskúšajte si to', text: 'Prvé tréningy sú bezplatné.' },
            { nadpis: 'Prihláška', text: 'Tréner vám dá prihlášku a informácie o príspevkoch.' },
          ],
        },
        {
          pozadie: 'biele',
          skryty: false,
          id: 'nabor-faq',
          typ: 'faq',
          data: { nadpis: 'Časté otázky rodičov' },
          polozky: [
            { otazka: 'Od koľkých rokov môže dieťa začať?', odpoved: 'Do prípravky prijímame deti od 5 rokov.' },
            { otazka: 'Koľko stojí členstvo?', odpoved: 'Výšku príspevku vám povie tréner kategórie.' },
          ],
        },
        {
          pozadie: 'biele',
          skryty: false,
          id: 'nabor-vyzva',
          typ: 'vyzva',
          data: { nadpis: 'Máte otázky?', text: 'Ozvite sa nám, radi poradíme.', tlacidlo: 'Kontakt', odkaz: '/kontakt' },
        },
      ],
    },
  },
  {
    kluc: '2-percenta',
    titulok: tr('2 % z dane'),
    popis: tr('Údaje prijímateľa a postup v troch krokoch'),
    ikona: 'licencia',
    stranka: {
      nazov: '2 % z dane',
      slug: '2-percenta',
      meta_description: 'Podporte klub 2 % (3 %) z dane - údaje o prijímateľovi a postup.',
      bloky: [
        {
          pozadie: 'biele',
          skryty: false,
          id: 'dane-uvod',
          typ: 'nadpis',
          data: {
            stitok: 'Podporte nás',
            nadpis: 'Darujte klubu 2 % z dane',
            text: 'Nestojí vás to nič navyše - časť dane, ktorú aj tak zaplatíte, poputuje na rozvoj mládeže a klubu.',
            zarovnanie: 'vlavo',
          },
        },
        {
          pozadie: 'biele',
          skryty: false,
          id: 'dane-udaje',
          typ: 'dve_percenta',
          data: {
            nadpis: 'Údaje o prijímateľovi',
            text: '',
            prijimatel: '',
            ico: '',
            pravna_forma: 'Občianske združenie',
            sidlo: '',
            termin: 'do 30. apríla',
            tlacivo: null,
            poznamka: 'Ak ste v uplynulom roku odpracovali ako dobrovoľník aspoň 40 hodín, môžete poukázať 3 %.',
          },
        },
        {
          pozadie: 'biele',
          skryty: false,
          id: 'dane-kroky',
          typ: 'kroky',
          data: { nadpis: 'Ako na to', uvod: '' },
          polozky: [
            { nadpis: 'Požiadajte o potvrdenie', text: 'Zamestnávateľ vám vystaví Potvrdenie o zaplatení dane.' },
            { nadpis: 'Vyplňte vyhlásenie', text: 'Do Vyhlásenia o poukázaní podielu zaplatenej dane uveďte naše údaje.' },
            { nadpis: 'Odovzdajte na daňovom úrade', text: 'Vyhlásenie aj potvrdenie doručte na daňový úrad alebo elektronicky.' },
          ],
        },
        {
          pozadie: 'biele',
          skryty: false,
          id: 'dane-vyzva',
          typ: 'vyzva',
          data: { nadpis: 'Ďakujeme za podporu!', text: 'Vaše 2 % pomáhajú deťom hrať futbal.', tlacidlo: 'Naša mládež', odkaz: '/teams' },
        },
      ],
    },
  },
  {
    kluc: 'caste-otazky',
    titulok: tr('Časté otázky'),
    popis: tr('Otázky a odpovede s výzvou na kontakt'),
    ikona: 'hladat',
    stranka: {
      nazov: 'Časté otázky',
      slug: 'caste-otazky',
      meta_description: 'Odpovede na najčastejšie otázky o klube, zápasoch a členstve.',
      bloky: [
        { pozadie: 'biele', skryty: false, id: 'faq-uvod', typ: 'nadpis', data: { stitok: 'Pomoc', nadpis: 'Časté otázky', text: '', zarovnanie: 'vlavo' } },
        {
          pozadie: 'biele',
          skryty: false,
          id: 'faq-otazky',
          typ: 'faq',
          data: { nadpis: '' },
          polozky: [
            { otazka: 'Koľko stojí vstupné na zápas?', odpoved: 'Aktuálne vstupné nájdete pri každom zápase v programe.' },
            { otazka: 'Ako sa stanem členom klubu?', odpoved: 'Vyplňte registráciu na stránke Registrácia, klub vás bude kontaktovať.' },
            { otazka: 'Kde sa dá zakúpiť klubové oblečenie?', odpoved: 'V našom fanshope na webe alebo počas domácich zápasov.' },
            { otazka: 'Ako prihlásim dieťa na tréning?', odpoved: 'Všetky informácie nájdete na stránke Nábor detí.' },
          ],
        },
        {
          pozadie: 'biele',
          skryty: false,
          id: 'faq-vyzva',
          typ: 'vyzva',
          data: { nadpis: 'Nenašli ste odpoveď?', text: 'Napíšte nám, radi pomôžeme.', tlacidlo: 'Kontakt', odkaz: '/kontakt' },
        },
      ],
    },
  },
];
