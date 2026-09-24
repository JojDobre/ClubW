// Umiestnenie: frontend/src/pages/admin/KniznicaMedii.tsx
// Knižnica médií - všetky nahraté súbory (obrázky, dokumenty, ostatné).
//
// Pri každom súbore: názov, alt text, popis, dátum nahratia, autor
// a kde je použitý. Pri obrázkoch aj v koľkých článkoch.

import React, { useEffect, useRef, useState } from 'react';
import {
  PageHeader, Button, Badge, Icon, Input, Textarea, Modal, FilterChips,
  Skeleton, EmptyState, ErrorState, ConfirmDialog, useToast,
} from '../../ui';
import { useAuth } from '../../app/AuthContext';
import { mediaApi } from '../../api/media';
import { souborUrl } from '../../config/api';
import { formatujDatumCas } from '../../utils/datum';
import { kopiruj } from './Formulare';
import type { MediaSubor, MediaDetail } from '../../api/typy';
import { tr, trn } from '../../i18n';
import './KniznicaMedii.css';

type Typ = '' | 'obrazok' | 'dokument' | 'ine';
const NA_STRANU = 60;

/** Veľkosť súboru v čitateľnom tvare. */
export const velkostSuboru = (bajty?: number | null): string => {
  if (!bajty) return '—';
  if (bajty < 1024) return `${bajty} B`;
  if (bajty < 1024 * 1024) return `${Math.round(bajty / 1024)} kB`;
  return `${(bajty / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
};

const pripona = (m: Pick<MediaSubor, 'cesta'>) => (m.cesta.split('.').pop() || '').toUpperCase().slice(0, 5);

/** Úplná adresa súboru - na skopírovanie a vloženie inam. */
const plnaAdresa = (cesta: string) => new URL(souborUrl(cesta), window.location.origin).toString();

export const KniznicaMedii: React.FC = () => {
  const { pouzivatel } = useAuth();
  const jeAdmin = pouzivatel?.rola === 'admin';
  const { uspech, chyba: hlasChybu, varovanie } = useToast();
  const vstup = useRef<HTMLInputElement>(null);

  const [typ, setTyp] = useState<Typ>('');
  const [hladat, setHladat] = useState('');
  const [hladane, setHladane] = useState('');
  const [subory, setSubory] = useState<MediaSubor[]>([]);
  const [celkom, setCelkom] = useState(0);
  const [nacitava, setNacitava] = useState(true);
  const [chyba, setChyba] = useState<string | null>(null);
  const [obnovit, setObnovit] = useState(0);
  const [nahrava, setNahrava] = useState(false);
  const [tahanie, setTahanie] = useState(false);

  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [upravy, setUpravy] = useState({ nazov: '', alt_text: '', popis: '' });
  const [uklada, setUklada] = useState(false);
  const [naZmazanie, setNaZmazanie] = useState<{ subor: MediaDetail; vynutit: boolean } | null>(null);
  const [maze, setMaze] = useState(false);

  // Hľadanie s oneskorením - nie požiadavka po každom písmene
  useEffect(() => {
    const casovac = setTimeout(() => setHladane(hladat.trim()), 300);
    return () => clearTimeout(casovac);
  }, [hladat]);

  useEffect(() => {
    const ovladac = new AbortController();
    setNacitava(true);
    setChyba(null);
    mediaApi
      .vypis({ typ: typ || undefined, hladat: hladane || undefined, limit: NA_STRANU, offset: 0 }, ovladac.signal)
      .then((z) => {
        setSubory(z.polozky);
        setCelkom(z.strankovanie?.total ?? z.polozky.length);
      })
      .catch((e) => e?.name !== 'AbortError' && setChyba(e?.message || tr('Knižnicu sa nepodarilo načítať')))
      .finally(() => !ovladac.signal.aborted && setNacitava(false));
    return () => ovladac.abort();
  }, [typ, hladane, obnovit]);

  const nacitajDalsie = async () => {
    setNacitava(true);
    try {
      const z = await mediaApi.vypis({ typ: typ || undefined, hladat: hladane || undefined, limit: NA_STRANU, offset: subory.length });
      setSubory((s) => [...s, ...z.polozky.filter((n) => !s.some((x) => x.id === n.id))]);
    } catch (e: any) {
      hlasChybu(e?.message || tr('Ďalšie súbory sa nepodarilo načítať'));
    } finally {
      setNacitava(false);
    }
  };

  const nahraj = async (zoznam: FileList | File[] | null) => {
    const pole = Array.from(zoznam ?? []);
    if (pole.length === 0) return;
    const prilisVelke = pole.filter((f) => f.size > 10 * 1024 * 1024);
    if (prilisVelke.length) varovanie(tr('Priveľké súbory (nad 10 MB) sa preskočia: {hodnota}', { hodnota: prilisVelke.map((f) => f.name).join(', ') }));
    const naNahratie = pole.filter((f) => f.size <= 10 * 1024 * 1024);
    if (naNahratie.length === 0) return;

    setNahrava(true);
    try {
      // Server prijme najviac 10 súborov naraz
      let spolu = 0;
      for (let i = 0; i < naNahratie.length; i += 10) {
        const nahrate = await mediaApi.nahraj(naNahratie.slice(i, i + 10));
        spolu += nahrate.length;
      }
      uspech(spolu === 1 ? tr('Súbor bol nahratý') : tr('Nahratých súborov: {spolu}', { spolu }));
      setObnovit((x) => x + 1);
    } catch (e: any) {
      hlasChybu(e?.message || tr('Súbory sa nepodarilo nahrať'));
    } finally {
      setNahrava(false);
      if (vstup.current) vstup.current.value = '';
    }
  };

  const otvorDetail = async (m: MediaSubor) => {
    try {
      const d = await mediaApi.detail(m.id);
      setDetail(d);
      setUpravy({ nazov: d.nazov, alt_text: d.alt_text ?? '', popis: d.popis ?? '' });
    } catch (e: any) {
      hlasChybu(e?.message || tr('Súbor sa nepodarilo načítať'));
    }
  };

  const ulozDetail = async () => {
    if (!detail) return;
    if (!upravy.nazov.trim()) return varovanie(tr('Názov nesmie byť prázdny'));
    setUklada(true);
    try {
      const ulozeny = await mediaApi.uprav(detail.id, {
        nazov: upravy.nazov.trim(),
        alt_text: upravy.alt_text.trim() || null,
        popis: upravy.popis.trim() || null,
      });
      setSubory((s) => s.map((x) => (x.id === ulozeny.id ? { ...x, ...ulozeny, pocet_clankov: x.pocet_clankov } : x)));
      uspech(tr('Údaje súboru boli uložené'));
      setDetail(null);
    } catch (e: any) {
      hlasChybu(e?.message || tr('Zmeny sa nepodarilo uložiť'));
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await mediaApi.zmaz(naZmazanie.subor.id, naZmazanie.vynutit);
      uspech(tr('Súbor bol zmazaný'));
      setSubory((s) => s.filter((x) => x.id !== naZmazanie.subor.id));
      setCelkom((c) => Math.max(0, c - 1));
      setNaZmazanie(null);
      setDetail(null);
    } catch (e: any) {
      hlasChybu(e?.message || tr('Súbor sa nepodarilo zmazať'));
    } finally {
      setMaze(false);
    }
  };

  const pouzitie = detail?.pouzitie;
  const miestaPouzitia = pouzitie
    ? [
        pouzitie.clanky_ako_hlavny_obrazok ? tr('{clanky_ako_hlavny_obrazok}× hlavný obrázok článku', { clanky_ako_hlavny_obrazok: pouzitie.clanky_ako_hlavny_obrazok }) : '',
        pouzitie.clanky_v_texte ? tr('{clanky_v_texte}× v texte článku', { clanky_v_texte: pouzitie.clanky_v_texte }) : '',
        pouzitie.stranky ? tr('{stranky}× na stránke', { stranky: pouzitie.stranky }) : '',
        pouzitie.galerie ? tr('{galerie}× v galérii', { galerie: pouzitie.galerie }) : '',
        pouzitie.dokumenty ? `${pouzitie.dokumenty}× v dokumentoch` : '',
        pouzitie.ine ? tr('{ine}× ako logo alebo fotka (tím, hráč, sponzor…)', { ine: pouzitie.ine }) : '',
      ].filter(Boolean)
    : [];

  return (
    <div
      className={`cw-screen cw-med ${tahanie ? 'is-tahanie' : ''}`}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setTahanie(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setTahanie(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setTahanie(false);
        nahraj(e.dataTransfer.files);
      }}
    >
      <PageHeader
        nadpis={tr('Knižnica médií')}
        podnadpis={tr('Všetky nahraté obrázky a dokumenty. Súbory sem môžete aj pretiahnuť myšou.')}
        akcie={
          <Button ikona={<Icon nazov="nahrat" velkost={16} />} nacitava={nahrava} onClick={() => vstup.current?.click()}>
            {tr('Nahrať súbory')}
          </Button>
        }
      />
      <input
        ref={vstup}
        type="file"
        multiple
        hidden
        aria-label={tr('Nahrať súbory do knižnice')}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.txt,.csv,.zip"
        onChange={(e) => nahraj(e.target.files)}
      />

      <div className="cw-med__lista">
        <FilterChips
          popisSkupiny={tr('Typ súborov')}
          moznosti={[
            { hodnota: '', popis: tr('Všetko') },
            { hodnota: 'obrazok', popis: tr('Obrázky') },
            { hodnota: 'dokument', popis: tr('Dokumenty') },
            { hodnota: 'ine', popis: tr('Ostatné') },
          ]}
          zvolena={typ}
          onZmena={(h) => setTyp(h as Typ)}
        />
        <div className="cw-med__hladat">
          <Input
            value={hladat}
            onChange={(e) => setHladat(e.target.value)}
            placeholder={tr('Hľadať podľa názvu alebo alt textu…')}
            aria-label={tr('Hľadať v knižnici')}
            ikona={<Icon nazov="hladat" velkost={15} />}
          />
        </div>
      </div>

      {chyba ? (
        <ErrorState sprava={tr('Knižnicu sa nepodarilo načítať')} detail={chyba} onSkusZnova={() => setObnovit((x) => x + 1)} />
      ) : nacitava && subory.length === 0 ? (
        <div className="cw-med__mriezka">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="cw-med__karta">
              <Skeleton riadkov={3} />
            </div>
          ))}
        </div>
      ) : subory.length === 0 ? (
        <div className="cw-med__prazdne">
          <EmptyState
            ikona={<Icon nazov="media" velkost={40} />}
            nadpis={hladane || typ ? tr('Nič sa nenašlo') : tr('Knižnica je prázdna')}
            popis={hladane || typ ? tr('Skúste iný filter alebo hľadaný výraz.') : tr('Nahrajte obrázky alebo dokumenty - potom ich použijete v článkoch, galériách aj dokumentoch.')}
            akcia={!hladane && !typ ? <Button onClick={() => vstup.current?.click()}>{tr('Nahrať súbory')}</Button> : undefined}
          />
        </div>
      ) : (
        <>
          <p className="cw-med__pocet">
            {tr('Zobrazené')} {subory.length} z {celkom}
          </p>
          <div className="cw-med__mriezka">
            {subory.map((m) => (
              <button key={m.id} className="cw-med__karta" onClick={() => otvorDetail(m)} aria-label={tr('Detail súboru {nazov}', { nazov: m.nazov })}>
                <span className="cw-med__nahlad">
                  {m.typ === 'obrazok' ? (
                    <img src={souborUrl(m.cesta)} alt={m.alt_text ?? ''} loading="lazy" />
                  ) : (
                    <span className="cw-med__pripona">{pripona(m)}</span>
                  )}
                </span>
                <span className="cw-med__nazov">{m.nazov}</span>
                <span className="cw-med__info">
                  {velkostSuboru(m.velkost)}
                  {m.typ === 'obrazok' && m.sirka && m.vyska ? ` · ${m.sirka}×${m.vyska}` : ''}
                </span>
                {m.typ === 'obrazok' && (
                  <span className="cw-med__stitky">
                    {(m.pocet_clankov ?? 0) > 0 ? (
                      <Badge ton="info">{trn(m.pocet_clankov ?? 0, 'V {n} článku', 'V {n} článkoch', 'V {n} článkoch')}</Badge>
                    ) : (
                      <Badge>{tr('Nepoužitý v článkoch')}</Badge>
                    )}
                    {!m.alt_text && <Badge ton="warning">{tr('Bez alt textu')}</Badge>}
                  </span>
                )}
              </button>
            ))}
          </div>
          {subory.length < celkom && (
            <div className="cw-med__dalsie">
              <Button variant="secondary" nacitava={nacitava} onClick={nacitajDalsie}>
                {tr('Načítať ďalšie')}
              </Button>
            </div>
          )}
        </>
      )}

      {tahanie && <div className="cw-med__drop">{tr('Pustite súbory na nahratie')}</div>}

      {/* ===== Detail súboru ===== */}
      <Modal
        otvorene={detail !== null}
        onZavri={() => setDetail(null)}
        nadpis={detail?.nazov ?? tr('Súbor')}
        sirka="lg"
        pata={
          <>
            {jeAdmin && detail && (
              <Button
                variant="ghost"
                ikona={<Icon nazov="zmazat" velkost={14} />}
                onClick={() => setNaZmazanie({ subor: detail, vynutit: (detail.pouzitie?.spolu ?? 0) > 0 })}
              >
                {tr('Zmazať')}
              </Button>
            )}
            <div style={{ flex: 1 }} />
            <Button variant="secondary" onClick={() => setDetail(null)} disabled={uklada}>
              {tr('Zavrieť')}
            </Button>
            <Button onClick={ulozDetail} nacitava={uklada}>
              {tr('Uložiť')}
            </Button>
          </>
        }
      >
        {detail && (
          <div className="cw-med__detail">
            <div className="cw-med__velky">
              {detail.typ === 'obrazok' ? (
                <img src={souborUrl(detail.cesta)} alt={detail.alt_text ?? ''} />
              ) : (
                <span className="cw-med__pripona cw-med__pripona--velka">{pripona(detail)}</span>
              )}
              <a href={souborUrl(detail.cesta)} target="_blank" rel="noreferrer">
                {tr('Otvoriť súbor v novom okne')}
              </a>
            </div>
            <div className="cw-med__polia">
              <Input
                menovka={tr('Názov')}
                value={upravy.nazov}
                onChange={(e) => setUpravy((u) => ({ ...u, nazov: e.target.value }))}
                povinne
              />
              {detail.typ === 'obrazok' && (
                <Input
                  menovka={tr('Alt text')}
                  value={upravy.alt_text}
                  onChange={(e) => setUpravy((u) => ({ ...u, alt_text: e.target.value }))}
                  napoveda={tr('Krátky opis obrázka pre nevidiacich a vyhľadávače')}
                  maxLength={255}
                />
              )}
              <Textarea
                menovka={tr('Popis')}
                value={upravy.popis}
                onChange={(e) => setUpravy((u) => ({ ...u, popis: e.target.value }))}
                rows={3}
              />

              <dl className="cw-med__udaje">
                <dt>{tr('Nahraté')}</dt>
                <dd>{formatujDatumCas(detail.vytvoreny)}</dd>
                <dt>{tr('Autor')}</dt>
                <dd>{detail.autor?.meno ?? '—'}</dd>
                <dt>{tr('Pôvodný súbor')}</dt>
                <dd>{detail.originalny_nazov}</dd>
                <dt>{tr('Typ')}</dt>
                <dd>{detail.mime_typ ?? pripona(detail)}</dd>
                <dt>{tr('Veľkosť')}</dt>
                <dd>
                  {velkostSuboru(detail.velkost)}
                  {detail.sirka && detail.vyska ? ` · ${detail.sirka}×${detail.vyska} px` : ''}
                </dd>
                <dt>{tr('Použitie')}</dt>
                <dd>
                  {detail.typ === 'obrazok' && (
                    <strong>
                      {trn(detail.pouzitie.clanky, 'V {n} článku', 'V {n} článkoch', 'V {n} článkoch')}
                    </strong>
                  )}
                  {miestaPouzitia.length > 0 ? (
                    <ul>
                      {miestaPouzitia.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="cw-med__nepouzity"> {tr('Nikde nepoužitý')}</span>
                  )}
                </dd>
              </dl>

              <div className="cw-med__adresa">
                <code>{detail.cesta}</code>
                <Button
                  velkost="sm"
                  variant="secondary"
                  ikona={<Icon nazov="kopirovat" velkost={13} />}
                  onClick={async () => {
                    if (await kopiruj(plnaAdresa(detail.cesta))) uspech(tr('Adresa súboru skopírovaná'));
                  }}
                >
                  {tr('Kopírovať adresu')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis={tr('Zmazať súbor?')}
        sprava={
          naZmazanie?.vynutit
            ? tr('Súbor {nazov} je použitý ({hodnota}). Po zmazaní tam zostane prázdne miesto alebo nefunkčný odkaz. Naozaj zmazať?', { nazov: naZmazanie.subor.nazov, hodnota: miestaPouzitia.join(', ') })
            : tr('Súbor {hodnota} bude natrvalo zmazaný.', { hodnota: naZmazanie?.subor.nazov ?? '' })
        }
        potvrdit={naZmazanie?.vynutit ? tr('Aj tak zmazať') : tr('Zmazať')}
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default KniznicaMedii;
