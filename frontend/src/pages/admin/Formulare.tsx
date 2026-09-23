// Umiestnenie: frontend/src/pages/admin/Formulare.tsx
// Zoznam formulárov. Každý má vlastnú adresu na webe (/formular/slug)
// a dá sa vložiť do obsahu stránky značkou [formular slug].

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader, Button, Badge, Icon, DataTable, ConfirmDialog, useToast,
  type Stlpec, type AkciaRiadku,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { formulareApi, oznamZmenuFormularov } from '../../api/formulare';
import { formatujDatum } from '../../utils/datum';
import type { Formular } from '../../api/typy';
import './Formulare.css';

/** Značka na vloženie formulára do obsahu stránky alebo článku. */
export const znackaFormulara = (f: Pick<Formular, 'slug'>) => `[formular ${f.slug}]`;

/** Skopíruje text do schránky, aj keď prehliadač nepovolí Clipboard API. */
export const kopiruj = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const pole = document.createElement('textarea');
    pole.value = text;
    document.body.appendChild(pole);
    pole.select();
    const ok = document.execCommand('copy');
    pole.remove();
    return ok;
  }
};

export const Formulare: React.FC = () => {
  const navigate = useNavigate();
  const { uspech, chyba: hlasChybu } = useToast();
  const [naZmazanie, setNaZmazanie] = useState<Formular | null>(null);
  const [maze, setMaze] = useState(false);

  const formulare = useNacitanie((signal) => formulareApi.vypis(signal));

  const skopirujZnacku = async (f: Formular) => {
    if (await kopiruj(znackaFormulara(f))) uspech(`Skopírované: ${znackaFormulara(f)} - vložte do textu stránky`);
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await formulareApi.zmaz(naZmazanie.id);
      uspech('Formulár bol odstránený');
      setNaZmazanie(null);
      formulare.obnov();
      oznamZmenuFormularov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Formulár sa nepodarilo odstrániť');
    } finally {
      setMaze(false);
    }
  };

  const stlpce: Stlpec<Formular>[] = [
    {
      kluc: 'nazov',
      popis: 'Formulár',
      obsah: (f) => (
        <div className="cw-form__nazov">
          <strong>{f.nazov}</strong>
          <span>/formular/{f.slug} · {f.polia.length} polí</span>
        </div>
      ),
      hodnotaNaZoradenie: (f) => f.nazov,
    },
    {
      kluc: 'odpovede',
      popis: 'Vyplnené',
      obsah: (f) => (
        <div className="cw-form__pocty">
          <span>{f.pocet_odpovedi ?? 0}</span>
          {(f.pocet_neprecitanych ?? 0) > 0 && <Badge ton="danger">{f.pocet_neprecitanych} nové</Badge>}
        </div>
      ),
      hodnotaNaZoradenie: (f) => (f.pocet_neprecitanych ?? 0) * 100000 + (f.pocet_odpovedi ?? 0),
      sirka: '160px',
    },
    {
      kluc: 'stav',
      popis: 'Stav',
      obsah: (f) => (f.aktivny ? <Badge ton="success">Prijíma</Badge> : <Badge>Vypnutý</Badge>),
      hodnotaNaZoradenie: (f) => (f.aktivny ? 1 : 0),
      sirka: '120px',
    },
    {
      kluc: 'datum',
      popis: 'Vytvorený',
      obsah: (f) => <span style={{ color: 'var(--muted)' }}>{f.vytvoreny ? formatujDatum(f.vytvoreny) : '—'}</span>,
      hodnotaNaZoradenie: (f) => (f.vytvoreny ? new Date(f.vytvoreny).getTime() : 0),
      sirka: '120px',
      skryTNaMobile: true,
    },
  ];

  const akcieRiadku: AkciaRiadku<Formular>[] = [
    { popis: 'Vyplnené odpovede', ikona: 'komentare', onKlik: (f) => navigate(`/admin/formulare/${f.id}/odpovede`) },
    { popis: 'Upraviť', ikona: 'upravit', onKlik: (f) => navigate(`/admin/formulare/${f.id}`) },
    { popis: 'Kopírovať značku do stránky', ikona: 'kopirovat', onKlik: skopirujZnacku },
    { popis: 'Otvoriť na webe', ikona: 'oko', onKlik: (f) => window.open(`/formular/${f.slug}`, '_blank', 'noopener') },
    { popis: 'Odstrániť', ikona: 'zmazat', nebezpecna: true, onKlik: (f) => setNaZmazanie(f) },
  ];

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis="Formuláre"
        podnadpis="Prihlášky, kontaktné a iné formuláre. Každý má vlastnú adresu a dá sa vložiť do stránky."
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={17} />} onClick={() => navigate('/admin/formulare/novy')}>
            Nový formulár
          </Button>
        }
      />

      <DataTable<Formular>
        data={formulare.data ?? []}
        idZaznamu={(f) => f.id}
        stlpce={stlpce}
        nacitava={formulare.nacitava}
        chyba={formulare.chyba}
        onSkusZnova={formulare.obnov}
        hladatV={(f) => `${f.nazov} ${f.slug} ${f.popis ?? ''}`}
        hladatPlaceholder="Hľadať formulár…"
        akcieRiadku={akcieRiadku}
        onKlikNaRiadok={(f) => navigate(`/admin/formulare/${f.id}/odpovede`)}
        prazdnyNadpis="Zatiaľ žiadne formuláre"
        prazdnyPopis="Vytvorte napríklad prihlášku do klubu alebo kontaktný formulár."
        prazdnaAkcia={<Button onClick={() => navigate('/admin/formulare/novy')}>Vytvoriť formulár</Button>}
      />

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis="Odstrániť formulár?"
        sprava={`Formulár ${naZmazanie?.nazov} zmizne z webu a zo zoznamu. Vyplnené odpovede zostanú uložené v databáze.`}
        potvrdit="Odstrániť"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default Formulare;
