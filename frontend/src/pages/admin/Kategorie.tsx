// Umiestnenie: frontend/src/pages/admin/Kategorie.tsx
// Rubriky článkov.

import React, { useState } from 'react';
import {
  PageHeader, Button, Badge, Icon, DataTable, Modal, Input, Textarea,
  useToast, type Stlpec, type AkciaRiadku,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { kategorieSpravaApi } from '../../api/obsah';
import type { Kategoria } from '../../api/typy';
import './Kategorie.css';

const PRAZDNA: Partial<Kategoria> = {
  nazov: '',
  popis: '',
  farba: '#1b5e20',
  poradie: 0,
};

export const Kategorie: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const [upravovana, setUpravovana] = useState<Partial<Kategoria> | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<Kategoria | null>(null);
  const [uklada, setUklada] = useState(false);
  const [maze, setMaze] = useState(false);
  /** Kam presunúť články zmazávanej kategórie. */
  const [presunutDo, setPresunutDo] = useState<number | null>(null);

  const kategorie = useNacitanie((signal) => kategorieSpravaApi.vypis(signal));

  const zoznam = kategorie.data ?? [];

  /**
   * Počet článkov v kategórii — dôležité pri mazaní.
   * Počíta ho server; predtým sa ťahalo prvých 500 článkov a počítalo sa
   * na klientovi, takže pri väčšom archíve čísla nesedeli.
   */
  const pocetClankov = (id: number): number =>
    zoznam.find((k) => k.id === id)?.pocet_clankov ?? 0;

  /** Otvorí potvrdenie mazania a predvyberie prvú inú kategóriu ako cieľ. */
  const otvorMazanie = (k: Kategoria) => {
    setNaZmazanie(k);
    setPresunutDo(zoznam.find((x) => x.id !== k.id)?.id ?? null);
  };

  const jeNova = upravovana !== null && !upravovana.id;

  const uloz = async () => {
    if (!upravovana) return;

    if (!upravovana.nazov?.trim()) {
      varovanie('Zadajte názov kategórie');
      return;
    }

    setUklada(true);
    try {
      const naUlozenie = {
        ...upravovana,
        popis: upravovana.popis?.trim() || null,
      };

      if (jeNova) {
        await kategorieSpravaApi.vytvor(naUlozenie);
        uspech('Kategória bola vytvorená');
      } else {
        await kategorieSpravaApi.uprav(upravovana.id!, naUlozenie);
        uspech('Zmeny boli uložené');
      }
      setUpravovana(null);
      kategorie.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Kategóriu sa nepodarilo uložiť');
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      const maClanky = pocetClankov(naZmazanie.id) > 0;
      if (maClanky && !presunutDo) {
        varovanie('Vyberte kategóriu, do ktorej sa články presunú');
        setMaze(false);
        return;
      }
      await kategorieSpravaApi.zmaz(naZmazanie.id, maClanky ? presunutDo : null);
      uspech(maClanky ? 'Kategória bola zmazaná a články presunuté' : 'Kategória bola zmazaná');
      setNaZmazanie(null);
      kategorie.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Kategóriu sa nepodarilo zmazať');
    } finally {
      setMaze(false);
    }
  };

  const stlpce: Stlpec<Kategoria>[] = [
    {
      kluc: 'nazov',
      popis: 'Kategória',
      obsah: (k) => (
        <div className="cw-kat__nazov">
          {/* Farebný bod ukazuje, ako sa kategória zobrazí na webe */}
          <span
            className="cw-kat__bod"
            style={{ background: k.farba || 'var(--muted)' }}
            aria-hidden="true"
          />
          <span className="cw-kat__text">{k.nazov}</span>
        </div>
      ),
      hodnotaNaZoradenie: (k) => k.nazov,
    },
    {
      kluc: 'slug',
      popis: 'Adresa',
      obsah: (k) => <code className="cw-kat__slug">/{k.slug}</code>,
      sirka: '200px',
      skryTNaMobile: true,
    },
    {
      kluc: 'popis',
      popis: 'Popis',
      obsah: (k) =>
        k.popis ? k.popis : <span style={{ color: 'var(--muted)' }}>—</span>,
      skryTNaMobile: true,
    },
    {
      kluc: 'clanky',
      popis: 'Článkov',
      obsah: (k) => {
        const pocet = pocetClankov(k.id);
        return pocet > 0 ? <Badge ton="primary">{pocet}</Badge> : <span style={{ color: 'var(--muted)' }}>0</span>;
      },
      hodnotaNaZoradenie: (k) => pocetClankov(k.id),
      zarovnanie: 'center',
      sirka: '110px',
    },
    {
      kluc: 'poradie',
      popis: 'Poradie',
      obsah: (k) => k.poradie,
      hodnotaNaZoradenie: (k) => k.poradie,
      zarovnanie: 'center',
      sirka: '100px',
      skryTNaMobile: true,
    },
  ];

  const akcieRiadku: AkciaRiadku<Kategoria>[] = [
    { popis: 'Upraviť', ikona: 'upravit', onKlik: (k) => setUpravovana({ ...k }) },
    { popis: 'Zmazať', ikona: 'zmazat', nebezpecna: true, onKlik: otvorMazanie },
  ];

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis="Kategórie"
        podnadpis="Rubriky, do ktorých sa zaraďujú články."
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={15} />} onClick={() => setUpravovana({ ...PRAZDNA })}>
            Nová kategória
          </Button>
        }
      />

      <DataTable<Kategoria>
        data={zoznam}
        idZaznamu={(k) => k.id}
        stlpce={stlpce}
        nacitava={kategorie.nacitava}
        chyba={kategorie.chyba}
        onSkusZnova={kategorie.obnov}
        hladatV={(k) => `${k.nazov} ${k.popis ?? ''}`}
        hladatPlaceholder="Hľadať kategóriu…"
        akcieRiadku={akcieRiadku}
        onKlikNaRiadok={(k) => setUpravovana({ ...k })}
        prazdnyNadpis="Zatiaľ žiadne kategórie"
        prazdnyPopis="Vytvorte rubriky, do ktorých budete zaraďovať články."
        prazdnaAkcia={<Button onClick={() => setUpravovana({ ...PRAZDNA })}>Vytvoriť kategóriu</Button>}
      />

      <Modal
        otvorene={upravovana !== null}
        onZavri={() => setUpravovana(null)}
        nadpis={jeNova ? 'Nová kategória' : upravovana?.nazov ?? 'Kategória'}
        sirka="sm"
        pata={
          <>
            <Button variant="secondary" onClick={() => setUpravovana(null)} disabled={uklada}>
              Zrušiť
            </Button>
            <Button onClick={uloz} nacitava={uklada}>
              {jeNova ? 'Vytvoriť' : 'Uložiť'}
            </Button>
          </>
        }
      >
        {upravovana && (
          <>
            <Input
              menovka="Názov"
              value={upravovana.nazov ?? ''}
              onChange={(e) => setUpravovana((d) => ({ ...d!, nazov: e.target.value }))}
              placeholder="Napríklad: Zápasy"
              povinne
            />

            <Textarea
              menovka="Popis"
              value={upravovana.popis ?? ''}
              onChange={(e) => setUpravovana((d) => ({ ...d!, popis: e.target.value }))}
              placeholder="Krátky popis rubriky…"
              rows={2}
            />

            <div className="cw-kat__row">
              <div className="cw-field">
                <label className="cw-field__label" htmlFor="kat-farba">Farba</label>
                <input
                  id="kat-farba"
                  type="color"
                  value={upravovana.farba || '#1b5e20'}
                  onChange={(e) => setUpravovana((d) => ({ ...d!, farba: e.target.value }))}
                  className="cw-kat__farba"
                />
              </div>

              <Input
                menovka="Poradie"
                type="number"
                min={0}
                value={upravovana.poradie ?? 0}
                onChange={(e) => setUpravovana((d) => ({ ...d!, poradie: Number(e.target.value) }))}
                napoveda="Nižšie číslo = vyššie v zozname"
              />
            </div>
          </>
        )}
      </Modal>

      {/* Článok bez kategórie existovať nemôže - pri mazaní kategórie
          s článkami preto treba vybrať, kam sa presunú */}
      <Modal
        otvorene={naZmazanie !== null}
        onZavri={() => setNaZmazanie(null)}
        nadpis="Zmazať kategóriu?"
        sirka="sm"
        pata={
          <>
            <Button variant="secondary" onClick={() => setNaZmazanie(null)} disabled={maze}>
              Zrušiť
            </Button>
            <Button variant="danger" onClick={zmaz} nacitava={maze}>
              {naZmazanie && pocetClankov(naZmazanie.id) > 0 ? 'Presunúť a zmazať' : 'Zmazať'}
            </Button>
          </>
        }
      >
        {naZmazanie && pocetClankov(naZmazanie.id) > 0 ? (
          zoznam.length > 1 ? (
            <>
              <p className="cw-kat__upozornenie">
                Kategória <strong>{naZmazanie.nazov}</strong> obsahuje{' '}
                {pocetClankov(naZmazanie.id)} článkov. Pred zmazaním ich presuňte do inej kategórie.
              </p>
              <div className="cw-field">
                <label className="cw-field__label" htmlFor="kat-presun">
                  Presunúť články do
                </label>
                <select
                  id="kat-presun"
                  className="cw-select"
                  value={presunutDo ?? ''}
                  onChange={(e) => setPresunutDo(e.target.value ? Number(e.target.value) : null)}
                >
                  {zoznam
                    .filter((k) => k.id !== naZmazanie.id)
                    .map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nazov}
                      </option>
                    ))}
                </select>
              </div>
            </>
          ) : (
            <p className="cw-kat__upozornenie">
              Kategória <strong>{naZmazanie.nazov}</strong> obsahuje {pocetClankov(naZmazanie.id)} článkov
              a inú kategóriu, kam by sa dali presunúť, zatiaľ nemáte. Najprv vytvorte novú kategóriu.
            </p>
          )
        ) : (
          <p className="cw-kat__upozornenie">
            Kategória <strong>{naZmazanie?.nazov}</strong> bude zmazaná.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default Kategorie;
