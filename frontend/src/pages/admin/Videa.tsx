// Umiestnenie: frontend/src/pages/admin/Videa.tsx
// Videá klubu — zostrihy, rozhovory, celé zápasy.

import React, { useState } from 'react';
import {
  PageHeader, Button, Badge, Icon, Modal, Input, Textarea, Select, Switch,
  Skeleton, EmptyState, ErrorState, ConfirmDialog, useToast,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { videaApi } from '../../api/doplnky';
import { zapasyApi } from '../../api/sport';
import { formatujDatum } from '../../utils/datum';
import type { Video } from '../../api/typy';
import './Videa.css';

const KATEGORIE = [
  { hodnota: 'zostrih', popis: 'Zostrih zo zápasu' },
  { hodnota: 'goly', popis: 'Góly' },
  { hodnota: 'rozhovor', popis: 'Rozhovor' },
  { hodnota: 'trening', popis: 'Tréning' },
  { hodnota: 'zaznam', popis: 'Celý zápas' },
  { hodnota: 'ine', popis: 'Ostatné' },
];

const PRAZDNE: Partial<Video> = {
  nazov: '',
  popis: '',
  url: '',
  kategoria: 'zostrih',
  zapas_id: null,
  publikovane: true,
  poradie: 0,
};

/** Dĺžku v sekundách prevedie na tvar 12:34. */
const dlzkaText = (sekundy: number | null): string | null => {
  if (!sekundy) return null;
  const m = Math.floor(sekundy / 60);
  const s = sekundy % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const Videa: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const [upravovane, setUpravovane] = useState<Partial<Video> | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<Video | null>(null);
  const [hladanie, setHladanie] = useState('');
  const [uklada, setUklada] = useState(false);
  const [maze, setMaze] = useState(false);

  const videa = useNacitanie((signal) => videaApi.vypis(signal));
  const zapasy = useNacitanie((signal) => zapasyApi.vypis(signal));

  const zoznam = (videa.data ?? []).filter((v) =>
    hladanie.trim()
      ? `${v.nazov} ${v.popis ?? ''}`.toLowerCase().includes(hladanie.trim().toLowerCase())
      : true
  );

  const jeNove = upravovane !== null && !upravovane.id;

  const uloz = async () => {
    if (!upravovane) return;

    if (!upravovane.nazov?.trim()) {
      varovanie('Zadajte názov videa');
      return;
    }
    if (!upravovane.url?.trim()) {
      varovanie('Zadajte odkaz na video');
      return;
    }

    setUklada(true);
    try {
      const naUlozenie = {
        ...upravovane,
        popis: upravovane.popis?.trim() || null,
        url: upravovane.url.trim(),
      };

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

  const zoznamZapasov = zapasy.data ?? [];

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis="Videá"
        podnadpis="Zostrihy, rozhovory a záznamy zápasov."
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={17} />} onClick={() => setUpravovane({ ...PRAZDNE })}>
            Pridať video
          </Button>
        }
      />

      <div className="cw-vid__hladanie">
        <Input
          value={hladanie}
          onChange={(e) => setHladanie(e.target.value)}
          placeholder="Hľadať video…"
          ikona={<Icon nazov="hladat" velkost={15} />}
          aria-label="Hľadať video"
        />
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
            nadpis={hladanie ? 'Nič sme nenašli' : 'Zatiaľ žiadne videá'}
            popis={
              hladanie
                ? 'Skúste zmeniť hľadaný text.'
                : 'Pridajte odkaz na YouTube alebo Vimeo — video sa zobrazí na webe klubu.'
            }
            akcia={
              hladanie ? (
                <Button variant="secondary" onClick={() => setHladanie('')}>
                  Vymazať hľadanie
                </Button>
              ) : (
                <Button onClick={() => setUpravovane({ ...PRAZDNE })}>Pridať video</Button>
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

                {dlzkaText(v.dlzka) && <span className="cw-vid__dlzka">{dlzkaText(v.dlzka)}</span>}
              </button>

              <div className="cw-vid__telo">
                <div className="cw-vid__hlava">
                  <span className="cw-vid__nazov">{v.nazov}</span>
                  {!v.publikovane && <Badge>Skryté</Badge>}
                </div>

                {v.kategoria && (
                  <div className="cw-vid__kategoria">
                    {KATEGORIE.find((k) => k.hodnota === v.kategoria)?.popis ?? v.kategoria}
                  </div>
                )}

                <div className="cw-vid__pata">
                  <span className="cw-vid__datum">{formatujDatum(v.vytvorene)}</span>
                  <div className="cw-vid__akcie">
                    <button onClick={() => setUpravovane({ ...v })} aria-label={`Upraviť ${v.nazov}`}>
                      <Icon nazov="upravit" velkost={15} />
                    </button>
                    <button
                      className="is-danger"
                      onClick={() => setNaZmazanie(v)}
                      aria-label={`Odstrániť ${v.nazov}`}
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
        nadpis={jeNove ? 'Nové video' : upravovane?.nazov ?? 'Video'}
        sirka="sm"
        pata={
          <>
            <Button variant="secondary" onClick={() => setUpravovane(null)} disabled={uklada}>
              Zrušiť
            </Button>
            <Button onClick={uloz} nacitava={uklada}>
              {jeNove ? 'Pridať' : 'Uložiť'}
            </Button>
          </>
        }
      >
        {upravovane && (
          <>
            <Input
              menovka="Odkaz na video"
              value={upravovane.url ?? ''}
              onChange={(e) => setUpravovane((d) => ({ ...d!, url: e.target.value }))}
              placeholder="https://youtube.com/watch?v=…"
              povinne
              napoveda="Podporujeme YouTube a Vimeo. Náhľad sa doplní automaticky."
            />

            <Input
              menovka="Názov"
              value={upravovane.nazov ?? ''}
              onChange={(e) => setUpravovane((d) => ({ ...d!, nazov: e.target.value }))}
              placeholder="Zostrih: Slovan – Rača 3:1"
              povinne
            />

            <Textarea
              menovka="Popis"
              value={upravovane.popis ?? ''}
              onChange={(e) => setUpravovane((d) => ({ ...d!, popis: e.target.value }))}
              rows={2}
            />

            <Select
              menovka="Kategória"
              value={upravovane.kategoria ?? 'zostrih'}
              onChange={(e) => setUpravovane((d) => ({ ...d!, kategoria: e.target.value }))}
              moznosti={KATEGORIE}
            />

            <Select
              menovka="Súvisiaci zápas"
              value={upravovane.zapas_id ?? ''}
              onChange={(e) =>
                setUpravovane((d) => ({ ...d!, zapas_id: e.target.value ? Number(e.target.value) : null }))
              }
              prazdna="Bez väzby na zápas"
              moznosti={zoznamZapasov.slice(0, 100).map((z) => ({
                hodnota: z.id,
                popis: `${z.domaci_tim_nazov ?? '?'} — ${z.hostujuci_tim_nazov ?? '?'}`,
              }))}
            />

            <Input
              menovka="Dĺžka (sekundy)"
              type="number"
              min={0}
              value={upravovane.dlzka ?? ''}
              onChange={(e) =>
                setUpravovane((d) => ({
                  ...d!,
                  dlzka: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
              napoveda="Voliteľné — zobrazí sa na náhľade"
            />

            <Switch
              zapnute={Boolean(upravovane.publikovane)}
              onZmena={(v) => setUpravovane((d) => ({ ...d!, publikovane: v }))}
              menovka="Zobraziť na webe"
            />
          </>
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
