// Umiestnenie: frontend/src/pages/admin/Videa.tsx
// Videogaléria — zostrihy, rozhovory, celé zápasy.
//
// Videá sa neukladajú na server, len odkazy na YouTube alebo Vimeo.
// Po vložení odkazu si server zistí názov, náhľad a dĺžku videa -
// redaktor ich môže prepísať.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PageHeader, Button, Badge, Icon, Modal, Input, Textarea, Select, Switch, FilterChips,
  Skeleton, EmptyState, ErrorState, ConfirmDialog, useToast, type Chip,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { videaApi } from '../../api/doplnky';
import { zapasyApi } from '../../api/sport';
import { kategorieSpravaApi } from '../../api/obsah';
import { formatujDatum, formatujDatumCas } from '../../utils/datum';
import type { Video, ZisteneVideo } from '../../api/typy';
import './Videa.css';

const PRAZDNE: Partial<Video> = {
  nazov: '',
  popis: '',
  url: '',
  rubrika_id: null,
  zapas_id: null,
  dlzka: null,
  nahlad: null,
  publikovane: true,
  poradie: 0,
};

/** Dĺžku v sekundách prevedie na tvar 12:34 alebo 1:02:03. */
const dlzkaText = (sekundy: number | null | undefined): string => {
  if (sekundy === null || sekundy === undefined || sekundy < 0) return '';
  const h = Math.floor(sekundy / 3600);
  const m = Math.floor((sekundy % 3600) / 60);
  const s = sekundy % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

/** Text 12:34 / 1:02:03 / 95 prevedie na sekundy; null = prázdne, NaN = chyba. */
const textNaDlzku = (text: string): number | null => {
  const t = text.trim();
  if (!t) return null;
  if (!/^\d+(:\d{1,2}){0,2}$/.test(t)) return NaN;
  return t.split(':').map(Number).reduce((spolu, cast) => spolu * 60 + cast, 0);
};

/** Náhľad z YouTube vieme zložiť aj bez servera - pre okamžitú ukážku. */
const youtubeNahlad = (url: string): string | null => {
  const zhoda = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return zhoda ? `https://img.youtube.com/vi/${zhoda[1]}/hqdefault.jpg` : null;
};

export const Videa: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const [upravovane, setUpravovane] = useState<Partial<Video> | null>(null);
  const [dlzkaVstup, setDlzkaVstup] = useState('');
  const [naZmazanie, setNaZmazanie] = useState<Video | null>(null);
  const [hladanie, setHladanie] = useState('');
  const [filter, setFilter] = useState('');
  const [uklada, setUklada] = useState(false);
  const [maze, setMaze] = useState(false);
  const [zistuje, setZistuje] = useState(false);
  const [zistene, setZistene] = useState<ZisteneVideo | null>(null);
  const poslednaAdresa = useRef('');
  const povodnaAdresa = useRef('');

  const videa = useNacitanie((signal) => videaApi.vypis(signal));
  const zapasy = useNacitanie((signal) => zapasyApi.vypis(signal));
  const rubriky = useNacitanie((signal) => kategorieSpravaApi.vypis(signal));

  const vsetky = videa.data ?? [];

  const chipy: Chip[] = useMemo(() => {
    const pouzite = (rubriky.data ?? []).filter((r) => vsetky.some((v) => v.rubrika_id === r.id));
    return [
      { hodnota: '', popis: 'Všetky', pocet: vsetky.length },
      ...pouzite.map((r) => ({
        hodnota: String(r.id),
        popis: r.nazov,
        pocet: vsetky.filter((v) => v.rubrika_id === r.id).length,
      })),
      { hodnota: 'skryte', popis: 'Skryté', pocet: vsetky.filter((v) => !v.publikovane).length },
    ];
  }, [vsetky, rubriky.data]);

  const zoznam = vsetky.filter((v) => {
    if (filter === 'skryte' && v.publikovane) return false;
    if (filter && filter !== 'skryte' && String(v.rubrika_id) !== filter) return false;
    return hladanie.trim()
      ? `${v.nazov} ${v.popis ?? ''}`.toLowerCase().includes(hladanie.trim().toLowerCase())
      : true;
  });

  const moznostiZapasov = useMemo(
    () =>
      [...(zapasy.data ?? [])]
        .sort((a, b) => new Date(b.datum_cas).getTime() - new Date(a.datum_cas).getTime())
        .map((z) => ({ hodnota: z.id, popis: `${formatujDatumCas(z.datum_cas)} · ${z.nazov}` })),
    [zapasy.data]
  );

  const jeNove = upravovane !== null && !upravovane.id;

  const otvor = (video: Partial<Video>) => {
    setUpravovane({ ...video });
    setDlzkaVstup(dlzkaText(video.dlzka));
    setZistene(null);
    poslednaAdresa.current = video.url ?? '';
    povodnaAdresa.current = video.url ?? '';
  };

  /**
   * Zistí údaje z odkazu a doplní prázdne polia formulára.
   * Pri ručnom spustení (tlačidlo) prepíše aj dĺžku a náhľad.
   */
  const zistiZVidea = async (vynutit = false) => {
    const url = upravovane?.url?.trim() ?? '';
    if (!/^https?:\/\/\S+$/i.test(url)) {
      if (vynutit) varovanie('Najprv vložte odkaz na video');
      return;
    }
    if (!vynutit && url === poslednaAdresa.current) return;
    poslednaAdresa.current = url;

    setZistuje(true);
    try {
      const udaje = await videaApi.zisti(url);
      setZistene(udaje);
      setUpravovane((d) =>
        d
          ? {
              ...d,
              nazov: d.nazov?.trim() && !vynutit ? d.nazov : udaje.nazov || d.nazov,
              nahlad: udaje.nahlad || d.nahlad || null,
              dlzka: udaje.dlzka ?? d.dlzka ?? null,
            }
          : d
      );
      if (udaje.dlzka !== null) setDlzkaVstup(dlzkaText(udaje.dlzka));
      if (udaje.zdroj === 'ine') {
        varovanie('Odkaz nie je z YouTube ani Vimeo - názov a dĺžku zadajte ručne');
      } else if (vynutit) {
        uspech(udaje.dlzka !== null ? 'Údaje z videa boli načítané' : 'Názov načítaný, dĺžku sa nepodarilo zistiť');
      }
    } catch (e: any) {
      if (vynutit) hlasChybu(e?.message || 'Údaje z videa sa nepodarilo zistiť');
    } finally {
      setZistuje(false);
    }
  };

  // Po vložení odkazu (s malým oneskorením) si údaje zistíme sami
  useEffect(() => {
    if (!upravovane) return;
    const casovac = setTimeout(() => zistiZVidea(false), 700);
    return () => clearTimeout(casovac);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upravovane?.url]);

  const uloz = async () => {
    if (!upravovane) return;

    const url = upravovane.url?.trim() ?? '';
    if (!url) {
      varovanie('Zadajte odkaz na video');
      return;
    }
    if (!/^https?:\/\/\S+$/i.test(url)) {
      varovanie('Odkaz musí začínať https://');
      return;
    }
    const dlzka = textNaDlzku(dlzkaVstup);
    if (Number.isNaN(dlzka)) {
      varovanie('Dĺžku zadajte v tvare minúty:sekundy, napríklad 4:35');
      return;
    }

    setUklada(true);
    try {
      const naUlozenie: Partial<Video> = {
        url,
        nazov: upravovane.nazov?.trim() ?? '',
        popis: upravovane.popis?.trim() || null,
        rubrika_id: upravovane.rubrika_id ?? null,
        zapas_id: upravovane.zapas_id ?? null,
        dlzka,
        publikovane: Boolean(upravovane.publikovane),
        poradie: Number(upravovane.poradie) || 0,
      };
      // Náhľad posielame len čerstvo zistený; pri zmene odkazu bez neho
      // pošleme null, aby server odvodil náhľad nového videa
      if (zistene?.nahlad) naUlozenie.nahlad = zistene.nahlad;
      else if (!jeNove && url !== povodnaAdresa.current) naUlozenie.nahlad = null;

      if (jeNove) {
        await videaApi.vytvor(naUlozenie);
        uspech('Video bolo pridané');
      } else {
        await videaApi.uprav(upravovane.id!, naUlozenie);
        uspech('Zmeny boli uložené');
      }
      setUpravovane(null);
      videa.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Video sa nepodarilo uložiť');
    } finally {
      setUklada(false);
    }
  };

  /** Rýchle skrytie / zverejnenie priamo z karty. */
  const prepniZverejnenie = async (v: Video) => {
    try {
      await videaApi.uprav(v.id, { publikovane: !v.publikovane });
      uspech(v.publikovane ? 'Video je skryté' : 'Video je zverejnené');
      videa.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Zmena sa nepodarila');
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await videaApi.zmaz(naZmazanie.id);
      uspech('Video bolo odstránené');
      setNaZmazanie(null);
      videa.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Video sa nepodarilo odstrániť');
    } finally {
      setMaze(false);
    }
  };

  const nahladFormulara =
    upravovane?.nahlad || zistene?.nahlad || (upravovane?.url ? youtubeNahlad(upravovane.url) : null);

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis="Videá"
        podnadpis="Zostrihy, rozhovory a záznamy zápasov z YouTube a Vimeo."
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={17} />} onClick={() => otvor(PRAZDNE)}>
            Pridať video
          </Button>
        }
      />

      <div className="cw-vid__nastroje">
        <div className="cw-vid__hladanie">
          <Input
            value={hladanie}
            onChange={(e) => setHladanie(e.target.value)}
            placeholder="Hľadať video…"
            ikona={<Icon nazov="hladat" velkost={15} />}
            aria-label="Hľadať video"
          />
        </div>
        {vsetky.length > 0 && (
          <FilterChips moznosti={chipy} zvolena={filter} onZmena={setFilter} popisSkupiny="Filtrovať videá" />
        )}
      </div>

      {videa.chyba ? (
        <ErrorState sprava="Videá sa nepodarilo načítať" detail={videa.chyba} onSkusZnova={videa.obnov} />
      ) : videa.nacitava ? (
        <div className="cw-vid__mriezka">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="cw-vid__karta">
              <Skeleton vyska="150px" />
            </div>
          ))}
        </div>
      ) : zoznam.length === 0 ? (
        <div className="cw-vid__prazdne">
          <EmptyState
            ikona={<Icon nazov="videa" velkost={40} />}
            nadpis={hladanie || filter ? 'Nič sme nenašli' : 'Zatiaľ žiadne videá'}
            popis={
              hladanie || filter
                ? 'Skúste zmeniť hľadaný text alebo filter.'
                : 'Pridajte odkaz na YouTube alebo Vimeo — názov, náhľad a dĺžka sa doplnia automaticky.'
            }
            akcia={
              hladanie || filter ? (
                <Button variant="secondary" onClick={() => { setHladanie(''); setFilter(''); }}>
                  Zrušiť filter
                </Button>
              ) : (
                <Button onClick={() => otvor(PRAZDNE)}>Pridať video</Button>
              )
            }
          />
        </div>
      ) : (
        <div className="cw-vid__mriezka">
          {zoznam.map((v) => (
            <div key={v.id} className={`cw-vid__karta ${!v.publikovane ? 'is-skryte' : ''}`}>
              <button
                className="cw-vid__nahlad"
                onClick={() => window.open(v.url, '_blank', 'noopener')}
                aria-label={`Prehrať ${v.nazov}`}
              >
                {v.nahlad_url || v.nahlad ? (
                  <img
                    src={v.nahlad_url || v.nahlad || ''}
                    alt=""
                    onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                  />
                ) : (
                  <Icon nazov="videa" velkost={30} />
                )}

                {/* Tlačidlo prehrávania cez náhľad */}
                <span className="cw-vid__play" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>

                {v.dlzka ? <span className="cw-vid__dlzka">{dlzkaText(v.dlzka)}</span> : null}
              </button>

              <div className="cw-vid__telo">
                <span className="cw-vid__nazov" title={v.nazov}>{v.nazov}</span>

                <div className="cw-vid__stitky">
                  {!v.publikovane && <Badge>Skryté</Badge>}
                  {v.rubrika ? (
                    <Badge ton="info">{v.rubrika.nazov}</Badge>
                  ) : v.kategoria ? (
                    <Badge ton="neutral">{v.kategoria}</Badge>
                  ) : null}
                </div>

                {v.zapas && (
                  <div className="cw-vid__zapas" title="Priradený zápas">
                    <Icon nazov="zapasy" velkost={13} /> {v.zapas.nazov}
                  </div>
                )}

                <div className="cw-vid__pata">
                  <span className="cw-vid__datum">{formatujDatum(v.vytvorene)}</span>
                  <div className="cw-vid__akcie">
                    <button
                      onClick={() => prepniZverejnenie(v)}
                      aria-label={v.publikovane ? `Skryť ${v.nazov}` : `Zverejniť ${v.nazov}`}
                      title={v.publikovane ? 'Skryť z webu' : 'Zobraziť na webe'}
                    >
                      <Icon nazov="oko" velkost={15} />
                    </button>
                    <button onClick={() => otvor(v)} aria-label={`Upraviť ${v.nazov}`} title="Upraviť">
                      <Icon nazov="upravit" velkost={15} />
                    </button>
                    <button
                      className="is-danger"
                      onClick={() => setNaZmazanie(v)}
                      aria-label={`Odstrániť ${v.nazov}`}
                      title="Odstrániť"
                    >
                      <Icon nazov="zmazat" velkost={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        otvorene={upravovane !== null}
        onZavri={() => setUpravovane(null)}
        nadpis={jeNove ? 'Nové video' : upravovane?.nazov || 'Video'}
        sirka="md"
        pata={
          <>
            <Button variant="secondary" onClick={() => setUpravovane(null)} disabled={uklada}>
              Zrušiť
            </Button>
            <Button onClick={uloz} nacitava={uklada}>
              {jeNove ? 'Pridať video' : 'Uložiť'}
            </Button>
          </>
        }
      >
        {upravovane && (
          <div className="cw-vid__formular">
            <div className="cw-vid__odkaz">
              <Input
                menovka="Odkaz na video"
                value={upravovane.url ?? ''}
                onChange={(e) => setUpravovane((d) => ({ ...d!, url: e.target.value }))}
                onBlur={() => zistiZVidea(false)}
                placeholder="https://www.youtube.com/watch?v=…"
                povinne
                napoveda={
                  zistuje
                    ? 'Zisťujem údaje z videa…'
                    : 'YouTube alebo Vimeo. Názov, náhľad a dĺžka sa doplnia automaticky.'
                }
              />
              <Button
                variant="secondary"
                velkost="sm"
                onClick={() => zistiZVidea(true)}
                nacitava={zistuje}
              >
                Načítať z videa
              </Button>
            </div>

            <div className="cw-vid__riadok">
              <div className="cw-vid__ukazka">
                {nahladFormulara ? (
                  <img
                    key={nahladFormulara}
                    src={nahladFormulara}
                    alt=""
                    onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                  />
                ) : (
                  <span>
                    <Icon nazov="videa" velkost={26} />
                    Náhľad sa zobrazí po vložení odkazu
                  </span>
                )}
                {textNaDlzku(dlzkaVstup) ? (
                  <span className="cw-vid__dlzka">{dlzkaText(textNaDlzku(dlzkaVstup))}</span>
                ) : null}
              </div>

              <div className="cw-vid__stlpec">
                <Input
                  menovka="Názov"
                  value={upravovane.nazov ?? ''}
                  onChange={(e) => setUpravovane((d) => ({ ...d!, nazov: e.target.value }))}
                  placeholder="Zostrih: Slovan – Rača 3:1"
                  napoveda={jeNove ? 'Keď ostane prázdny, použije sa názov z YouTube' : undefined}
                />
                <Input
                  menovka="Dĺžka"
                  value={dlzkaVstup}
                  onChange={(e) => setDlzkaVstup(e.target.value)}
                  placeholder="4:35"
                  napoveda="Doplní sa z videa; môžete ju zadať ručne (min:sek)"
                />
              </div>
            </div>

            <Textarea
              menovka="Popis"
              value={upravovane.popis ?? ''}
              onChange={(e) => setUpravovane((d) => ({ ...d!, popis: e.target.value }))}
              rows={3}
            />

            <div className="cw-vid__dva">
              <Select
                menovka="Rubrika"
                value={upravovane.rubrika_id ?? ''}
                onChange={(e) =>
                  setUpravovane((d) => ({ ...d!, rubrika_id: e.target.value ? Number(e.target.value) : null }))
                }
                prazdna="Bez rubriky"
                moznosti={(rubriky.data ?? []).map((r) => ({ hodnota: r.id, popis: r.nazov }))}
              />

              <Select
                menovka="Priradený zápas"
                value={upravovane.zapas_id ?? ''}
                onChange={(e) =>
                  setUpravovane((d) => ({ ...d!, zapas_id: e.target.value ? Number(e.target.value) : null }))
                }
                prazdna="Bez zápasu"
                moznosti={moznostiZapasov}
              />
            </div>

            <Switch
              zapnute={Boolean(upravovane.publikovane)}
              onZmena={(v) => setUpravovane((d) => ({ ...d!, publikovane: v }))}
              menovka="Zobraziť na webe"
              popis={upravovane.publikovane ? 'Video uvidia návštevníci webu' : 'Video je skryté, vidí ho len administrácia'}
            />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis="Odstrániť video?"
        sprava={`Video ${naZmazanie?.nazov} bude odstránené zo zoznamu. Samotné video na YouTube zostane.`}
        potvrdit="Odstrániť"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default Videa;
