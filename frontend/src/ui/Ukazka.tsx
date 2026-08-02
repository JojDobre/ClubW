// Umiestnenie: frontend/src/ui/Ukazka.tsx
// Prehľad všetkých prvkov rozhrania na jednej obrazovke.
//
// Slúži na vizuálnu kontrolu počas vývoja — dá sa na nej overiť,
// že prvky vyzerajú rovnako v svetlom aj tmavom režime, bez toho
// aby bolo treba preklikať celú administráciu.
//
// Dostupné na /ui-kit (len vo vývojovom režime).

import React, { useState } from 'react';
import {
  Button, Input, Select, Textarea, Switch, Card, StatCard,
  Badge, Skeleton, EmptyState, ErrorState, Modal, ConfirmDialog,
  useToast, Icon, DataTable, type Stlpec,
} from './index';


// ===== Ukážkové dáta pre tabuľku =====

interface UkazkovyZaznam {
  id: number;
  nazov: string;
  autor: string;
  stav: 'published' | 'draft';
  datum: string;
  precitani: number;
}

const UKAZKOVE_DATA: UkazkovyZaznam[] = [
  { id: 1, nazov: 'Víťazstvo nad Račou 3:1', autor: 'Peter Novák', stav: 'published', datum: '12. 3. 2026', precitani: 1240 },
  { id: 2, nazov: 'Nová posila v zálohe', autor: 'Mária Kováčová', stav: 'published', datum: '8. 3. 2026', precitani: 892 },
  { id: 3, nazov: 'Rozhovor s trénerom', autor: 'Peter Novák', stav: 'draft', datum: '5. 3. 2026', precitani: 0 },
  { id: 4, nazov: 'Zimná príprava vyhodnotená', autor: 'Ján Baláž', stav: 'published', datum: '1. 3. 2026', precitani: 654 },
  { id: 5, nazov: 'Turnaj prípravky U9', autor: 'Mária Kováčová', stav: 'published', datum: '25. 2. 2026', precitani: 431 },
  { id: 6, nazov: 'Pozvánka na členskú schôdzu', autor: 'Ján Baláž', stav: 'draft', datum: '20. 2. 2026', precitani: 0 },
  { id: 7, nazov: 'Prestupové okno uzavreté', autor: 'Peter Novák', stav: 'published', datum: '15. 2. 2026', precitani: 1105 },
];

const STLPCE_UKAZKY: Stlpec<UkazkovyZaznam>[] = [
  {
    kluc: 'nazov',
    popis: 'Názov',
    obsah: (z) => <strong>{z.nazov}</strong>,
    hodnotaNaZoradenie: (z) => z.nazov,
  },
  {
    kluc: 'autor',
    popis: 'Autor',
    obsah: (z) => z.autor,
    hodnotaNaZoradenie: (z) => z.autor,
  },
  {
    kluc: 'stav',
    popis: 'Stav',
    obsah: (z) =>
      z.stav === 'published' ? <Badge ton="success">Publikované</Badge> : <Badge>Koncept</Badge>,
    hodnotaNaZoradenie: (z) => z.stav,
  },
  {
    kluc: 'datum',
    popis: 'Dátum',
    obsah: (z) => <span style={{ color: 'var(--muted)' }}>{z.datum}</span>,
  },
  {
    kluc: 'precitani',
    popis: 'Prečítaní',
    obsah: (z) => z.precitani.toLocaleString('sk-SK'),
    hodnotaNaZoradenie: (z) => z.precitani,
    zarovnanie: 'right',
  },
];

export const Ukazka: React.FC = () => {
  const [tmavy, setTmavy] = useState(false);
  const [modalOtvoreny, setModalOtvoreny] = useState(false);
  const [potvrdenieOtvorene, setPotvrdenieOtvorene] = useState(false);
  const [prepinac, setPrepinac] = useState(true);
  const { uspech, chyba, info, varovanie } = useToast();

  // Prepnutie režimu nastavíme na koreňový prvok stránky
  const prepniRezim = (dark: boolean) => {
    setTmavy(dark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  };

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26 }}>Prvky rozhrania</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>
            Kontrolná obrazovka — overenie vzhľadu v oboch režimoch
          </p>
        </div>
        <Switch zapnute={tmavy} onZmena={prepniRezim} menovka="Tmavý režim" />
      </header>

      <div style={{ display: 'grid', gap: 20 }}>
        <Card nadpis="Tlačidlá">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <Button>Primárne</Button>
            <Button variant="secondary">Sekundárne</Button>
            <Button variant="ghost">Priehľadné</Button>
            <Button variant="danger">Nebezpečné</Button>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button velkost="sm" ikona={<Icon nazov="plus" velkost={15} />}>Malé s ikonou</Button>
            <Button nacitava>Načítava</Button>
            <Button disabled>Zablokované</Button>
          </div>
        </Card>

        <Card nadpis="Formulárové prvky">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <Input menovka="Názov" placeholder="Zadajte názov" povinne />
            <Input menovka="Hľadať" placeholder="Hľadať…" ikona={<Icon nazov="hladat" velkost={15} />} />
            <Input menovka="S chybou" defaultValue="zle@" chyba="Neplatná e-mailová adresa" />
            <Select
              menovka="Stav"
              prazdna="Vyberte stav"
              moznosti={[
                { hodnota: 'draft', popis: 'Koncept' },
                { hodnota: 'published', popis: 'Publikované' },
              ]}
            />
          </div>
          <Textarea menovka="Popis" placeholder="Krátky popis…" napoveda="Zobrazí sa vo výpise článkov" />
          <Switch zapnute={prepinac} onZmena={setPrepinac} menovka="Zobraziť v menu" popis="Stránka sa objaví v hlavnej navigácii" />
        </Card>

        <Card nadpis="Štatistické dlaždice">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <StatCard menovka="Články" hodnota={128} zmena="+12 tento mesiac" ikona={<Icon nazov="clanky" velkost={16} />} />
            <StatCard menovka="Hráči" hodnota={87} zmena="-3 oproti minulej sezóne" zmenaKladna={false} ikona={<Icon nazov="hraci" velkost={16} />} />
            <StatCard menovka="Načítava sa" hodnota="—" nacitava ikona={<Icon nazov="timy" velkost={16} />} />
          </div>
        </Card>

        <Card nadpis="Štítky stavov">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Badge>Koncept</Badge>
            <Badge ton="success">Publikované</Badge>
            <Badge ton="warning">Čaká na schválenie</Badge>
            <Badge ton="danger">Zrušené</Badge>
            <Badge ton="info">Naplánované</Badge>
            <Badge ton="primary">Odporúčané</Badge>
            <Badge ton="danger" zivy>Prebieha</Badge>
          </div>
        </Card>

        <Card nadpis="Načítavanie a prázdne stavy">
          <div style={{ marginBottom: 20 }}>
            <Skeleton riadkov={3} />
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16 }}>
            <EmptyState
              ikona={<Icon nazov="clanky" velkost={40} />}
              nadpis="Zatiaľ žiadne články"
              popis="Keď vytvoríte prvý článok, objaví sa v tomto zozname."
              akcia={<Button ikona={<Icon nazov="plus" velkost={15} />}>Nový článok</Button>}
            />
          </div>
          <ErrorState
            sprava="Údaje sa nepodarilo načítať"
            detail="Server neodpovedal (HTTP 503)"
            onSkusZnova={() => info('Skúšam znova…')}
          />
        </Card>

        <Card nadpis="Okná a oznámenia">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => setModalOtvoreny(true)}>Otvoriť okno</Button>
            <Button variant="secondary" onClick={() => setPotvrdenieOtvorene(true)}>Potvrdenie</Button>
            <Button variant="ghost" onClick={() => uspech('Článok bol uložený')}>Úspech</Button>
            <Button variant="ghost" onClick={() => chyba('Uloženie zlyhalo — skontrolujte pripojenie')}>Chyba</Button>
            <Button variant="ghost" onClick={() => varovanie('Zápas ešte nemá výsledok')}>Varovanie</Button>
          </div>
        </Card>


        <Card nadpis="Dátová tabuľka" podnadpis="Vyhľadávanie, filtre, zoradenie, výber riadkov, stránkovanie" bezOdsadenia>
          <DataTable<UkazkovyZaznam>
            data={UKAZKOVE_DATA}
            idZaznamu={(z) => z.id}
            stlpce={STLPCE_UKAZKY}
            hladatV={(z) => `${z.nazov} ${z.autor}`}
            hladatPlaceholder="Hľadať článok alebo autora…"
            filtre={[
              {
                kluc: 'stav',
                popis: 'Filtrovať podľa stavu',
                moznosti: [
                  { hodnota: 'published', popis: 'Publikované' },
                  { hodnota: 'draft', popis: 'Koncept' },
                ],
              },
            ]}
            filtrujZaznam={(z, kluc, hodnota) => (kluc === 'stav' ? z.stav === hodnota : true)}
            akcieRiadku={[
              { popis: 'Upraviť', ikona: 'upravit', onKlik: (z) => info(`Upraviť: ${z.nazov}`) },
              { popis: 'Duplikovať', ikona: 'kopirovat', onKlik: (z) => info(`Duplikovať: ${z.nazov}`) },
              { popis: 'Vymazať', ikona: 'zmazat', nebezpecna: true, onKlik: (z) => chyba(`Vymazať: ${z.nazov}`) },
            ]}
            hromadneAkcie={[
              { popis: 'Publikovať', ikona: 'oko', onKlik: (ids) => uspech(`Publikovaných: ${ids.length}`) },
              { popis: 'Vymazať', ikona: 'zmazat', nebezpecna: true, onKlik: (ids) => chyba(`Vymazaných: ${ids.length}`) },
            ]}
            naStranu={5}
            onKlikNaRiadok={(z) => info(`Otvoriť: ${z.nazov}`)}
          />
        </Card>

        <Card nadpis="Ikony">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: 'var(--muted)' }}>
            {['dashboard', 'clanky', 'zapasy', 'hraci', 'timy', 'ligy', 'kalendar', 'galerie',
              'pouzivatelia', 'licencia', 'nastavenia', 'gdpr', 'sezony', 'live', 'hodiny',
              'upravit', 'zmazat', 'kopirovat', 'hladat', 'filter', 'ulozit', 'oko'].map((n) => (
              <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: 68 }}>
                <Icon nazov={n} velkost={20} />
                <span style={{ fontSize: 10 }}>{n}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal
        otvorene={modalOtvoreny}
        onZavri={() => setModalOtvoreny(false)}
        nadpis="Ukážkové okno"
        podnadpis="Zatvorí sa klávesom Escape alebo kliknutím mimo"
        pata={
          <>
            <Button variant="secondary" onClick={() => setModalOtvoreny(false)}>Zrušiť</Button>
            <Button onClick={() => { setModalOtvoreny(false); uspech('Uložené'); }}>Uložiť</Button>
          </>
        }
      >
        <Input menovka="Názov" placeholder="Zameranie skočí sem po otvorení" />
        <Textarea menovka="Poznámka" placeholder="Voliteľná poznámka…" />
      </Modal>

      <ConfirmDialog
        otvorene={potvrdenieOtvorene}
        nadpis="Vymazať článok?"
        sprava="Táto akcia sa nedá vrátiť späť. Článok bude natrvalo odstránený."
        potvrdit="Vymazať"
        nebezpecne
        onPotvrd={() => { setPotvrdenieOtvorene(false); uspech('Článok bol vymazaný'); }}
        onZrus={() => setPotvrdenieOtvorene(false)}
      />
    </div>
  );
};

export default Ukazka;
