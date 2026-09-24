// Umiestnenie: frontend/src/pages/admin/Clanky.tsx
// Zoznam článkov.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader, Card, Button, Badge, Icon, DataTable, ConfirmDialog, useToast,
  type Stlpec, type AkciaRiadku, type HromadnaAkcia,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { clankyApi, kategorieApi } from '../../api/clanky';
import { formatujDatum } from '../../utils/datum';
import type { ClanokVoVypise, Kategoria, StavClanku } from '../../api/typy';
import { tr, lokalita } from '../../i18n';

/** Popisné názvy stavov a ich farebné tóny. */
const STAVY: Record<StavClanku, { popis: string; ton: 'success' | 'neutral' | 'warning' }> = {
  published: { popis: tr('Publikované'), ton: 'success' },
  draft: { popis: tr('Koncept'), ton: 'neutral' },
  archived: { popis: tr('Archivované'), ton: 'warning' },
};

export const Clanky: React.FC = () => {
  const navigate = useNavigate();
  const { uspech, chyba: hlasChybu } = useToast();

  const [naZmazanie, setNaZmazanie] = useState<ClanokVoVypise | null>(null);
  const [hromadneNaZmazanie, setHromadneNaZmazanie] = useState<number[] | null>(null);
  const [maze, setMaze] = useState(false);

  // Načítavame naraz veľkú dávku a filtrujeme na klientovi — pri objeme
  // článkov jedného klubu je to rýchlejšie než dotaz pri každom písmene
  const clanky = useNacitanie((signal) => clankyApi.vypis({ limit: 500 }, signal));
  const kategorie = useNacitanie((signal) => kategorieApi.vypis(signal));

  const zoznam = clanky.data?.polozky ?? [];

  const zoznamKategorii: Kategoria[] = kategorie.data ?? [];

  // ===== Mazanie =====

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await clankyApi.zmaz(naZmazanie.id);
      uspech(tr('Článok „{nazov}" bol vymazaný', { nazov: naZmazanie.nazov }));
      setNaZmazanie(null);
      clanky.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Článok sa nepodarilo vymazať'));
    } finally {
      setMaze(false);
    }
  };

  const zmazHromadne = async () => {
    if (!hromadneNaZmazanie) return;
    setMaze(true);

    // Výsledky sledujeme jednotlivo — ak zlyhá jeden článok, ostatné
    // sa aj tak zmažú a používateľ sa dozvie presný počet
    const vysledky = await Promise.allSettled(
      hromadneNaZmazanie.map((id) => clankyApi.zmaz(id))
    );

    const uspesne = vysledky.filter((v) => v.status === 'fulfilled').length;
    const zlyhane = vysledky.length - uspesne;

    if (uspesne > 0) uspech(tr('Vymazaných článkov: {uspesne}', { uspesne }));
    if (zlyhane > 0) hlasChybu(tr('Nepodarilo sa vymazať: {zlyhane}', { zlyhane }));

    setHromadneNaZmazanie(null);
    setMaze(false);
    clanky.obnov();
  };

  // ===== Stĺpce =====

  const stlpce: Stlpec<ClanokVoVypise>[] = [
    {
      kluc: 'nazov',
      popis: tr('Názov'),
      obsah: (c) => (
        <div className="cw-clanky__nazov">
          <span className="cw-clanky__nazov-text">{c.nazov}</span>
          {c.featured && (
            <span title={tr('Odporúčaný článok')}>
              <Badge ton="primary">{tr('Odporúčaný')}</Badge>
            </span>
          )}
        </div>
      ),
      hodnotaNaZoradenie: (c) => c.nazov,
    },
    {
      kluc: 'kategoria',
      popis: tr('Kategória'),
      obsah: (c) => (c.kategoria ? <Badge>{c.kategoria.nazov}</Badge> : <span style={{ color: 'var(--muted)' }}>—</span>),
      hodnotaNaZoradenie: (c) => c.kategoria?.nazov ?? null,
      sirka: '160px',
    },
    {
      kluc: 'autor',
      popis: tr('Autor'),
      obsah: (c) => c.autor?.meno ?? '—',
      hodnotaNaZoradenie: (c) => c.autor?.meno ?? null,
      sirka: '150px',
    },
    {
      kluc: 'status',
      popis: tr('Stav'),
      obsah: (c) => {
        const stav = STAVY[c.status ?? 'draft'];
        return <Badge ton={stav.ton}>{stav.popis}</Badge>;
      },
      hodnotaNaZoradenie: (c) => c.status ?? 'draft',
      sirka: '130px',
    },
    {
      kluc: 'datum',
      popis: tr('Dátum'),
      obsah: (c) => (
        <span style={{ color: 'var(--muted)' }}>
          {formatujDatum(c.publikovany_datum || c.vytvoreny)}
        </span>
      ),
      hodnotaNaZoradenie: (c) =>
        new Date(c.publikovany_datum || c.vytvoreny).getTime(),
      sirka: '120px',
    },
    {
      kluc: 'views',
      popis: tr('Zobrazení'),
      obsah: (c) => c.views.toLocaleString(lokalita()),
      hodnotaNaZoradenie: (c) => c.views,
      zarovnanie: 'right',
      sirka: '110px',
      skryTNaMobile: true,
    },
  ];

  const akcieRiadku: AkciaRiadku<ClanokVoVypise>[] = [
    {
      popis: tr('Upraviť'),
      ikona: 'upravit',
      onKlik: (c) => navigate(`/admin/clanky/${c.id}`),
    },
    {
      popis: tr('Zobraziť na webe'),
      ikona: 'oko',
      // Koncept na verejnom webe neexistuje, odkaz by viedol na chybu
      zobrazit: (c) => c.status === 'published',
      onKlik: (c) => window.open(`/clanky/${c.slug}`, '_blank', 'noopener'),
    },
    {
      popis: tr('Vymazať'),
      ikona: 'zmazat',
      nebezpecna: true,
      onKlik: (c) => setNaZmazanie(c),
    },
  ];

  const hromadneAkcie: HromadnaAkcia[] = [
    {
      popis: tr('Vymazať'),
      ikona: 'zmazat',
      nebezpecna: true,
      onKlik: (ids) => setHromadneNaZmazanie(ids),
    },
  ];

  return (
    <>
      <PageHeader
        nadpis={tr('Články')}
        podnadpis={tr('Spravujte novinky a reportáže na webe klubu.')}
        akcie={
          <Button
            ikona={<Icon nazov="plus" velkost={15} />}
            onClick={() => navigate('/admin/clanky/novy')}
          >
            {tr('Nový článok')}
          </Button>
        }
      />

      <DataTable<ClanokVoVypise>
        data={zoznam}
        idZaznamu={(c) => c.id}
        stlpce={stlpce}
        nacitava={clanky.nacitava}
        chyba={clanky.chyba}
        onSkusZnova={clanky.obnov}
        hladatV={(c) => `${c.nazov} ${c.autor?.meno ?? ''} ${c.kategoria?.nazov ?? ''}`}
        hladatPlaceholder={tr('Hľadať podľa názvu, autora alebo kategórie…')}
        filtre={[
          {
            kluc: 'status',
            popis: tr('Všetky stavy'),
            moznosti: [
              { hodnota: 'published', popis: tr('Publikované') },
              { hodnota: 'draft', popis: tr('Koncepty') },
              { hodnota: 'archived', popis: tr('Archivované') },
            ],
          },
          {
            kluc: 'kategoria',
            popis: tr('Všetky kategórie'),
            moznosti: zoznamKategorii.map((k) => ({
              hodnota: String(k.id),
              popis: k.nazov,
            })),
          },
        ]}
        filtrujZaznam={(c, kluc, hodnota) => {
          if (kluc === 'status') return (c.status ?? 'draft') === hodnota;
          if (kluc === 'kategoria') return String(c.kategoria?.id ?? '') === hodnota;
          return true;
        }}
        akcieRiadku={akcieRiadku}
        hromadneAkcie={hromadneAkcie}
        onKlikNaRiadok={(c) => navigate(`/admin/clanky/${c.id}`)}
        prazdnyNadpis={tr('Zatiaľ žiadne články')}
        prazdnyPopis={tr('Keď napíšete prvý článok, objaví sa v tomto zozname.')}
        prazdnaAkcia={
          <Button onClick={() => navigate('/admin/clanky/novy')}>{tr('Napísať prvý článok')}</Button>
        }
      />

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis={tr('Vymazať článok?')}
        sprava={tr('Článok „{nazov}" bude odstránený. Túto akciu nemožno vrátiť späť.', { nazov: naZmazanie?.nazov })}
        potvrdit={tr('Vymazať')}
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />

      <ConfirmDialog
        otvorene={hromadneNaZmazanie !== null}
        nadpis={tr('Vymazať označené články?')}
        sprava={tr('Bude odstránených {hodnota} článkov. Túto akciu nemožno vrátiť späť.', { hodnota: hromadneNaZmazanie?.length ?? 0 })}
        potvrdit={tr('Vymazať všetky')}
        nebezpecne
        nacitava={maze}
        onPotvrd={zmazHromadne}
        onZrus={() => setHromadneNaZmazanie(null)}
      />
    </>
  );
};

export default Clanky;
