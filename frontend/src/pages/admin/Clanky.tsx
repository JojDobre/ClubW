// Umiestnenie: frontend/src/pages/admin/Clanky.tsx
// Zoznam článkov.

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader, Card, Button, Badge, Icon, DataTable, ConfirmDialog, useToast,
  type Stlpec, type AkciaRiadku, type HromadnaAkcia,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { clankyApi, kategorieApi } from '../../api/clanky';
import { formatujDatum } from '../../utils/datum';
import type { ClanokVoVypise, Kategoria, StavClanku } from '../../api/typy';

/** Popisné názvy stavov a ich farebné tóny. */
const STAVY: Record<StavClanku, { popis: string; ton: 'success' | 'neutral' | 'warning' }> = {
  published: { popis: 'Publikované', ton: 'success' },
  draft: { popis: 'Koncept', ton: 'neutral' },
  archived: { popis: 'Archivované', ton: 'warning' },
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

  const zoznam = clanky.data?.articles ?? [];

  const zoznamKategorii: Kategoria[] = useMemo(() => {
    const d = kategorie.data;
    if (!d) return [];
    return Array.isArray(d) ? d : (d as any).categories ?? [];
  }, [kategorie.data]);

  // ===== Mazanie =====

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await clankyApi.zmaz(naZmazanie.id);
      uspech(`Článok „${naZmazanie.nazov}" bol vymazaný`);
      setNaZmazanie(null);
      clanky.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Článok sa nepodarilo vymazať');
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

    if (uspesne > 0) uspech(`Vymazaných článkov: ${uspesne}`);
    if (zlyhane > 0) hlasChybu(`Nepodarilo sa vymazať: ${zlyhane}`);

    setHromadneNaZmazanie(null);
    setMaze(false);
    clanky.obnov();
  };

  // ===== Stĺpce =====

  const stlpce: Stlpec<ClanokVoVypise>[] = [
    {
      kluc: 'nazov',
      popis: 'Názov',
      obsah: (c) => (
        <div className="cw-clanky__nazov">
          <span className="cw-clanky__nazov-text">{c.nazov}</span>
          {c.featured && (
            <span title="Odporúčaný článok">
              <Badge ton="primary">Odporúčaný</Badge>
            </span>
          )}
        </div>
      ),
      hodnotaNaZoradenie: (c) => c.nazov,
    },
    {
      kluc: 'kategoria',
      popis: 'Kategória',
      obsah: (c) => (c.kategoria ? <Badge>{c.kategoria.nazov}</Badge> : <span style={{ color: 'var(--muted)' }}>—</span>),
      hodnotaNaZoradenie: (c) => c.kategoria?.nazov ?? null,
      sirka: '160px',
    },
    {
      kluc: 'autor',
      popis: 'Autor',
      obsah: (c) => c.autor?.meno ?? '—',
      hodnotaNaZoradenie: (c) => c.autor?.meno ?? null,
      sirka: '150px',
    },
    {
      kluc: 'status',
      popis: 'Stav',
      obsah: (c) => {
        const stav = STAVY[c.status ?? 'draft'];
        return <Badge ton={stav.ton}>{stav.popis}</Badge>;
      },
      hodnotaNaZoradenie: (c) => c.status ?? 'draft',
      sirka: '130px',
    },
    {
      kluc: 'datum',
      popis: 'Dátum',
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
      popis: 'Zobrazení',
      obsah: (c) => c.views.toLocaleString('sk-SK'),
      hodnotaNaZoradenie: (c) => c.views,
      zarovnanie: 'right',
      sirka: '110px',
      skryTNaMobile: true,
    },
  ];

  const akcieRiadku: AkciaRiadku<ClanokVoVypise>[] = [
    {
      popis: 'Upraviť',
      ikona: 'upravit',
      onKlik: (c) => navigate(`/admin/clanky/${c.id}`),
    },
    {
      popis: 'Zobraziť na webe',
      ikona: 'oko',
      // Koncept na verejnom webe neexistuje, odkaz by viedol na chybu
      zobrazit: (c) => c.status === 'published',
      onKlik: (c) => window.open(`/clanky/${c.slug}`, '_blank', 'noopener'),
    },
    {
      popis: 'Vymazať',
      ikona: 'zmazat',
      nebezpecna: true,
      onKlik: (c) => setNaZmazanie(c),
    },
  ];

  const hromadneAkcie: HromadnaAkcia[] = [
    {
      popis: 'Vymazať',
      ikona: 'zmazat',
      nebezpecna: true,
      onKlik: (ids) => setHromadneNaZmazanie(ids),
    },
  ];

  return (
    <>
      <PageHeader
        nadpis="Články"
        podnadpis="Spravujte novinky a reportáže na webe klubu."
        akcie={
          <Button
            ikona={<Icon nazov="plus" velkost={15} />}
            onClick={() => navigate('/admin/clanky/novy')}
          >
            Nový článok
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
        hladatPlaceholder="Hľadať podľa názvu, autora alebo kategórie…"
        filtre={[
          {
            kluc: 'status',
            popis: 'Všetky stavy',
            moznosti: [
              { hodnota: 'published', popis: 'Publikované' },
              { hodnota: 'draft', popis: 'Koncepty' },
              { hodnota: 'archived', popis: 'Archivované' },
            ],
          },
          {
            kluc: 'kategoria',
            popis: 'Všetky kategórie',
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
        prazdnyNadpis="Zatiaľ žiadne články"
        prazdnyPopis="Keď napíšete prvý článok, objaví sa v tomto zozname."
        prazdnaAkcia={
          <Button onClick={() => navigate('/admin/clanky/novy')}>Napísať prvý článok</Button>
        }
      />

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis="Vymazať článok?"
        sprava={`Článok „${naZmazanie?.nazov}" bude odstránený. Túto akciu nemožno vrátiť späť.`}
        potvrdit="Vymazať"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />

      <ConfirmDialog
        otvorene={hromadneNaZmazanie !== null}
        nadpis="Vymazať označené články?"
        sprava={`Bude odstránených ${hromadneNaZmazanie?.length ?? 0} článkov. Túto akciu nemožno vrátiť späť.`}
        potvrdit="Vymazať všetky"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmazHromadne}
        onZrus={() => setHromadneNaZmazanie(null)}
      />
    </>
  );
};

export default Clanky;
