// Umiestnenie: frontend/src/pages/admin/Dokumenty.tsx
// Dokumenty na stiahnutie — stanovy, prihlášky, tlačivá.
//
// Dokument: názov, popis, nahratý súbor, kategória (samostatná entita
// s názvom a popisom) a či je verejný. Súbor sa nahrá do knižnice médií,
// adresu už netreba písať ručne.

import React, { useRef, useState } from 'react';
import {
  PageHeader, Button, Badge, Icon, DataTable, Modal, Input, Textarea, Select, Switch,
  ConfirmDialog, useToast, type Stlpec, type AkciaRiadku,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { dokumentyApi, kategorieDokumentovApi } from '../../api/klub';
import { mediaApi } from '../../api/media';
import { souborUrl, apiUrl } from '../../config/api';
import { formatujDatum } from '../../utils/datum';
import type { Dokument, KategoriaDokumentu } from '../../api/typy';
import { tr, trn } from '../../i18n';
import './Dokumenty.css';

const PRAZDNY: Partial<Dokument> = {
  nazov: '',
  popis: '',
  subor_url: '',
  typ_suboru: null,
  velkost_kb: null,
  kategoria_id: null,
  verejny: true,
  poradie: 0,
  aktivity: true,
};

/** Veľkosť súboru v čitateľnom tvare. */
const velkost = (kb: number | null): string => {
  if (!kb) return '—';
  if (kb < 1024) return `${kb} kB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const PRIJIMANE = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.txt,.csv,.zip,image/*';

export const Dokumenty: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();
  const vstup = useRef<HTMLInputElement>(null);

  const [upravovany, setUpravovany] = useState<Partial<Dokument> | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<Dokument | null>(null);
  const [uklada, setUklada] = useState(false);
  const [nahrava, setNahrava] = useState(false);
  const [maze, setMaze] = useState(false);
  const [kategorieOtvorene, setKategorieOtvorene] = useState(false);
  const [novaKategoria, setNovaKategoria] = useState({ nazov: '', popis: '' });
  const [upravovanaKat, setUpravovanaKat] = useState<KategoriaDokumentu | null>(null);

  const dokumenty = useNacitanie((signal) => dokumentyApi.vypis(signal));
  const kategorie = useNacitanie((signal) => kategorieDokumentovApi.vypis(signal));
  const zoznam = dokumenty.data ?? [];
  const zoznamKat = (kategorie.data ?? []).filter((k) => k.aktivity !== false);

  const nazovKategorie = (d: Dokument) =>
    (d.kategoria_id ? zoznamKat.find((k) => k.id === d.kategoria_id)?.nazov : null) ?? d.kategoria ?? null;

  const jeNovy = upravovany !== null && !upravovany.id;

  // ===== Nahratie súboru =====
  const nahraj = async (subor: File | undefined) => {
    if (!subor) return;
    setNahrava(true);
    try {
      const [ulozeny] = await mediaApi.nahraj([subor]);
      if (!ulozeny) throw new Error(tr('Súbor sa nepodarilo uložiť'));
      setUpravovany((d) => ({
        ...d!,
        subor_url: ulozeny.cesta,
        velkost_kb: Math.max(1, Math.round(Number(ulozeny.velkost ?? subor.size) / 1024)),
        typ_suboru: (subor.name.split('.').pop() || '').toLowerCase().slice(0, 10) || null,
        // Prázdny názov doplníme z mena súboru
        nazov: d?.nazov?.trim() ? d.nazov : subor.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
      }));
      uspech(tr('Súbor bol nahratý'));
    } catch (e: any) {
      hlasChybu(e?.message || tr('Súbor sa nepodarilo nahrať'));
    } finally {
      setNahrava(false);
      if (vstup.current) vstup.current.value = '';
    }
  };

  const uloz = async () => {
    if (!upravovany) return;
    if (!upravovany.nazov?.trim()) return varovanie(tr('Zadajte názov dokumentu'));
    if (!upravovany.subor_url?.trim()) return varovanie(tr('Nahrajte súbor dokumentu'));

    setUklada(true);
    try {
      const naUlozenie: Partial<Dokument> = {
        nazov: upravovany.nazov.trim(),
        popis: upravovany.popis?.trim() || null,
        subor_url: upravovany.subor_url.trim(),
        typ_suboru: upravovany.typ_suboru || upravovany.subor_url.split('.').pop()?.toLowerCase().slice(0, 10) || null,
        velkost_kb: upravovany.velkost_kb ?? null,
        kategoria_id: upravovany.kategoria_id ?? null,
        verejny: Boolean(upravovany.verejny),
        aktivity: upravovany.aktivity !== false,
        poradie: Number(upravovany.poradie) || 0,
      };
      if (jeNovy) {
        await dokumentyApi.vytvor(naUlozenie);
        uspech(tr('Dokument bol pridaný'));
      } else {
        await dokumentyApi.uprav(upravovany.id!, naUlozenie);
        uspech(tr('Zmeny boli uložené'));
      }
      setUpravovany(null);
      dokumenty.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Dokument sa nepodarilo uložiť'));
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await dokumentyApi.zmaz(naZmazanie.id);
      uspech(tr('Dokument bol odstránený'));
      setNaZmazanie(null);
      dokumenty.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Dokument sa nepodarilo odstrániť'));
    } finally {
      setMaze(false);
    }
  };

  // ===== Kategórie =====
  const pridajKategoriu = async () => {
    if (novaKategoria.nazov.trim().length < 2) return varovanie(tr('Názov kategórie musí mať aspoň 2 znaky'));
    try {
      await kategorieDokumentovApi.vytvor({
        nazov: novaKategoria.nazov.trim(),
        popis: novaKategoria.popis.trim() || null,
        poradie: zoznamKat.length + 1,
      });
      setNovaKategoria({ nazov: '', popis: '' });
      kategorie.obnov();
      uspech(tr('Kategória bola pridaná'));
    } catch (e: any) {
      hlasChybu(e?.message || tr('Kategóriu sa nepodarilo pridať'));
    }
  };

  const ulozKategoriu = async () => {
    if (!upravovanaKat) return;
    if (upravovanaKat.nazov.trim().length < 2) return varovanie(tr('Názov kategórie musí mať aspoň 2 znaky'));
    try {
      await kategorieDokumentovApi.uprav(upravovanaKat.id, {
        nazov: upravovanaKat.nazov.trim(),
        popis: upravovanaKat.popis?.trim() || null,
      });
      setUpravovanaKat(null);
      kategorie.obnov();
      uspech(tr('Kategória bola uložená'));
    } catch (e: any) {
      hlasChybu(e?.message || tr('Kategóriu sa nepodarilo uložiť'));
    }
  };

  const zmazKategoriu = async (k: KategoriaDokumentu) => {
    const pouzitie = zoznam.filter((d) => d.kategoria_id === k.id).length;
    if (!window.confirm(pouzitie ? tr('Kategóriu {nazov} má {pouzitie} dokumentov - zostanú bez kategórie. Zmazať?', { nazov: k.nazov, pouzitie }) : tr('Zmazať kategóriu {nazov}?', { nazov: k.nazov }))) return;
    try {
      await kategorieDokumentovApi.zmaz(k.id);
      kategorie.obnov();
      dokumenty.obnov();
      uspech(tr('Kategória bola zmazaná'));
    } catch (e: any) {
      hlasChybu(e?.message || tr('Kategóriu sa nepodarilo zmazať'));
    }
  };

  const stlpce: Stlpec<Dokument>[] = [
    {
      kluc: 'nazov',
      popis: tr('Dokument'),
      obsah: (d) => (
        <div className="cw-hraci__hrac">
          <div className="cw-hraci__avatar" aria-hidden="true">
            <span style={{ fontSize: 10 }}>{(d.typ_suboru ?? '?').toUpperCase()}</span>
          </div>
          <div className="cw-hraci__meno">
            <span className="cw-hraci__meno-text">{d.nazov}</span>
            {d.popis && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--muted)' }}>{d.popis}</span>}
          </div>
        </div>
      ),
      hodnotaNaZoradenie: (d) => d.nazov,
    },
    {
      kluc: 'kategoria',
      popis: tr('Kategória'),
      obsah: (d) => (nazovKategorie(d) ? <Badge>{nazovKategorie(d)}</Badge> : <span style={{ color: 'var(--muted)' }}>—</span>),
      hodnotaNaZoradenie: (d) => nazovKategorie(d),
      sirka: '190px',
    },
    {
      kluc: 'velkost',
      popis: tr('Veľkosť'),
      obsah: (d) => <span style={{ color: 'var(--muted)' }}>{velkost(d.velkost_kb)}</span>,
      hodnotaNaZoradenie: (d) => d.velkost_kb,
      zarovnanie: 'right',
      sirka: '100px',
      skryTNaMobile: true,
    },
    {
      kluc: 'pristup',
      popis: tr('Prístup'),
      obsah: (d) =>
        !d.aktivity ? <Badge>{tr('Skrytý')}</Badge> : d.verejny ? <Badge ton="success">{tr('Verejný')}</Badge> : <Badge ton="warning">{tr('Interný')}</Badge>,
      hodnotaNaZoradenie: (d) => (d.verejny ? 1 : 0),
      sirka: '120px',
    },
    {
      kluc: 'stiahnutia',
      popis: tr('Stiahnutí'),
      obsah: (d) => d.pocet_stiahnuti,
      hodnotaNaZoradenie: (d) => d.pocet_stiahnuti,
      zarovnanie: 'center',
      sirka: '110px',
      skryTNaMobile: true,
    },
    {
      kluc: 'datum',
      popis: tr('Pridaný'),
      obsah: (d) => <span style={{ color: 'var(--muted)' }}>{formatujDatum(d.vytvoreny)}</span>,
      hodnotaNaZoradenie: (d) => new Date(d.vytvoreny).getTime(),
      sirka: '120px',
      skryTNaMobile: true,
    },
  ];

  const akcieRiadku: AkciaRiadku<Dokument>[] = [
    { popis: tr('Upraviť'), ikona: 'upravit', onKlik: (d) => setUpravovany({ ...d }) },
    { popis: tr('Otvoriť súbor'), ikona: 'oko', onKlik: (d) => window.open(souborUrl(d.subor_url), '_blank', 'noopener') },
    { popis: tr('Odstrániť'), ikona: 'zmazat', nebezpecna: true, onKlik: (d) => setNaZmazanie(d) },
  ];

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis={tr('Dokumenty')}
        podnadpis={tr('Stanovy, prihlášky a tlačivá na stiahnutie. Verejné sú na webe na adrese /dokumenty.')}
        akcie={
          <>
            <Button variant="secondary" onClick={() => setKategorieOtvorene(true)}>
              {tr('Kategórie')}
            </Button>
            <Button ikona={<Icon nazov="plus" velkost={17} />} onClick={() => setUpravovany({ ...PRAZDNY })}>
              {tr('Nový dokument')}
            </Button>
          </>
        }
      />

      <DataTable<Dokument>
        data={zoznam}
        idZaznamu={(d) => d.id}
        stlpce={stlpce}
        nacitava={dokumenty.nacitava}
        chyba={dokumenty.chyba}
        onSkusZnova={dokumenty.obnov}
        hladatV={(d) => `${d.nazov} ${d.popis ?? ''}`}
        hladatPlaceholder={tr('Hľadať dokument…')}
        filtre={[
          { kluc: 'kategoria', popis: tr('Všetky kategórie'), moznosti: zoznamKat.map((k) => ({ hodnota: String(k.id), popis: k.nazov })) },
          {
            kluc: 'pristup',
            popis: tr('Verejné aj interné'),
            moznosti: [
              { hodnota: 'verejny', popis: tr('Verejné') },
              { hodnota: 'interny', popis: tr('Interné') },
            ],
          },
        ]}
        filtrujZaznam={(d, kluc, hodnota) => {
          if (kluc === 'kategoria') return String(d.kategoria_id) === hodnota;
          if (kluc === 'pristup') return hodnota === 'verejny' ? d.verejny : !d.verejny;
          return true;
        }}
        akcieRiadku={akcieRiadku}
        onKlikNaRiadok={(d) => setUpravovany({ ...d })}
        prazdnyNadpis={tr('Zatiaľ žiadne dokumenty')}
        prazdnyPopis={tr('Pridajte stanovy, prihlášky alebo iné tlačivá na stiahnutie.')}
        prazdnaAkcia={<Button onClick={() => setUpravovany({ ...PRAZDNY })}>{tr('Pridať dokument')}</Button>}
      />

      {/* ===== Dokument ===== */}
      <Modal
        otvorene={upravovany !== null}
        onZavri={() => setUpravovany(null)}
        nadpis={jeNovy ? tr('Nový dokument') : upravovany?.nazov ?? tr('Dokument')}
        pata={
          <>
            <Button variant="secondary" onClick={() => setUpravovany(null)} disabled={uklada}>
              {tr('Zrušiť')}
            </Button>
            <Button onClick={uloz} nacitava={uklada}>
              {jeNovy ? tr('Pridať') : tr('Uložiť')}
            </Button>
          </>
        }
      >
        {upravovany && (
          <>
            <div className="cw-field">
              <span className="cw-field__label">{tr('Súbor *')}</span>
              <div className="cw-dok__subor">
                {upravovany.subor_url ? (
                  <a href={souborUrl(upravovany.subor_url)} target="_blank" rel="noreferrer">
                    📄 {upravovany.subor_url.split('/').pop()} {upravovany.velkost_kb ? `(${velkost(upravovany.velkost_kb)})` : ''}
                  </a>
                ) : (
                  <span style={{ color: 'var(--muted)' }}>{tr('Zatiaľ nenahratý')}</span>
                )}
                <Button variant="secondary" velkost="sm" nacitava={nahrava} ikona={<Icon nazov="nahrat" velkost={14} />} onClick={() => vstup.current?.click()}>
                  {upravovany.subor_url ? tr('Nahradiť súbor') : tr('Nahrať súbor')}
                </Button>
                <input ref={vstup} type="file" hidden accept={PRIJIMANE} aria-label={tr('Nahrať súbor dokumentu')} onChange={(e) => nahraj(e.target.files?.[0])} />
              </div>
              <div className="cw-field__hint">{tr('PDF, Word, Excel, PowerPoint alebo obrázok, najviac 10 MB')}</div>
            </div>

            <Input
              menovka={tr('Názov')}
              value={upravovany.nazov ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, nazov: e.target.value }))}
              placeholder={tr('Napríklad: Stanovy klubu')}
              povinne
            />
            <Textarea
              menovka={tr('Popis')}
              value={upravovany.popis ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, popis: e.target.value }))}
              rows={2}
            />
            <Select
              menovka={tr('Kategória')}
              value={upravovany.kategoria_id ?? ''}
              onChange={(e) => setUpravovany((d) => ({ ...d!, kategoria_id: e.target.value ? Number(e.target.value) : null }))}
              prazdna={upravovany.kategoria && !upravovany.kategoria_id ? tr('{kategoria} (pôvodná)', { kategoria: upravovany.kategoria }) : tr('Bez kategórie')}
              moznosti={zoznamKat.map((k) => ({ hodnota: k.id, popis: k.nazov }))}
              napoveda={tr('Kategórie spravujete tlačidlom Kategórie')}
            />
            <Switch
              zapnute={Boolean(upravovany.verejny)}
              onZmena={(v) => setUpravovany((d) => ({ ...d!, verejny: v }))}
              menovka={tr('Verejný dokument')}
              popis={upravovany.verejny ? tr('Stiahne si ho ktokoľvek na webe') : tr('Len pre administráciu (interný)')}
            />
            <Switch
              zapnute={upravovany.aktivity !== false}
              onZmena={(v) => setUpravovany((d) => ({ ...d!, aktivity: v }))}
              menovka={tr('Zobrazený')}
            />
          </>
        )}
      </Modal>

      {/* ===== Kategórie ===== */}
      <Modal otvorene={kategorieOtvorene} onZavri={() => setKategorieOtvorene(false)} nadpis={tr('Kategórie dokumentov')}>
        <ul className="cw-dok__kategorie">
          {zoznamKat.length === 0 && <li className="cw-dok__prazdne">{tr('Zatiaľ žiadne kategórie.')}</li>}
          {zoznamKat.map((k) =>
            upravovanaKat?.id === k.id ? (
              <li key={k.id} className="cw-dok__kat-uprava">
                <Input menovka={tr('Názov')} value={upravovanaKat.nazov} onChange={(e) => setUpravovanaKat({ ...upravovanaKat, nazov: e.target.value })} />
                <Input menovka={tr('Popis')} value={upravovanaKat.popis ?? ''} onChange={(e) => setUpravovanaKat({ ...upravovanaKat, popis: e.target.value })} />
                <div className="cw-dok__kat-akcie">
                  <Button velkost="sm" variant="secondary" onClick={() => setUpravovanaKat(null)}>{tr('Zrušiť')}</Button>
                  <Button velkost="sm" onClick={ulozKategoriu}>{tr('Uložiť')}</Button>
                </div>
              </li>
            ) : (
              <li key={k.id}>
                <div>
                  <strong>{k.nazov}</strong>
                  {k.popis && <span>{k.popis}</span>}
                  <span>{trn(zoznam.filter((d) => d.kategoria_id === k.id).length, '{n} dokument', '{n} dokumenty', '{n} dokumentov')}</span>
                </div>
                <div className="cw-dok__kat-akcie">
                  <Button velkost="sm" variant="ghost" onClick={() => setUpravovanaKat({ ...k })} aria-label={tr('Upraviť {nazov}', { nazov: k.nazov })}>
                    <Icon nazov="upravit" velkost={14} />
                  </Button>
                  <Button velkost="sm" variant="ghost" onClick={() => zmazKategoriu(k)} aria-label={tr('Zmazať {nazov}', { nazov: k.nazov })}>
                    <Icon nazov="zmazat" velkost={14} />
                  </Button>
                </div>
              </li>
            )
          )}
        </ul>
        <div className="cw-dok__nova">
          <Input menovka={tr('Nová kategória')} value={novaKategoria.nazov} onChange={(e) => setNovaKategoria((n) => ({ ...n, nazov: e.target.value }))} placeholder={tr('Prihlášky a tlačivá')} />
          <Input menovka={tr('Popis kategórie')} value={novaKategoria.popis} onChange={(e) => setNovaKategoria((n) => ({ ...n, popis: e.target.value }))} />
          <Button onClick={pridajKategoriu} ikona={<Icon nazov="plus" velkost={14} />}>{tr('Pridať kategóriu')}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis={tr('Odstrániť dokument?')}
        sprava={tr('Dokument {nazov} bude odstránený zo zoznamu. Súbor zostane v knižnici médií.', { nazov: naZmazanie?.nazov })}
        potvrdit={tr('Odstrániť')}
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

/** Adresa na stiahnutie s počítadlom - pre verejný web. */
export const odkazNaStiahnutie = (d: Dokument) => apiUrl(`/documents/${d.id}/download`);

export default Dokumenty;
