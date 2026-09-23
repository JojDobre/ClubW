// Umiestnenie: frontend/src/pages/admin/Sezony.tsx
// Sezóny a súpisky hráčov po sezónach.

import React, { useState, useEffect } from 'react';
import {
  PageHeader, Card, Button, Badge, Icon, Modal, Input, Select, Textarea, Switch,
  Skeleton, EmptyState, ErrorState, ConfirmDialog, useToast,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { sezonyApi } from '../../api/sprava';
import { timyApi, hraciApi } from '../../api/sport';
import { formatujDatum } from '../../utils/datum';
import type { Sezona, ZaznamSupisky } from '../../api/typy';
import './Sezony.css';

const PRAZDNA: Partial<Sezona> = { nazov: '', zaciatok: null, koniec: null, poznamka: '' };

export const Sezony: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const [upravovana, setUpravovana] = useState<Partial<Sezona> | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<Sezona | null>(null);
  const [uklada, setUklada] = useState(false);
  const [maze, setMaze] = useState(false);

  // Vybraná sezóna a tím pre zobrazenie súpisky
  const [vybranaSezona, setVybranaSezona] = useState<number | null>(null);
  const [vybranyTim, setVybranyTim] = useState<number | null>(null);

  // Pridanie hráča na súpisku
  const [pridavany, setPridavany] = useState<{ hrac_id: string; cislo: string; kapitan: boolean } | null>(null);

  const sezony = useNacitanie((signal) => sezonyApi.vypis(signal));
  const timy = useNacitanie((signal) => timyApi.vypis(signal));
  const hraci = useNacitanie((signal) => hraciApi.vypis(undefined, signal));

  const zoznamSezon = sezony.data ?? [];
  const zoznamTimov = timy.data ?? [];

  // Po načítaní predvolíme aktuálnu sezónu a prvý tím
  useEffect(() => {
    if (vybranaSezona === null && zoznamSezon.length > 0) {
      setVybranaSezona((zoznamSezon.find((s) => s.aktualna) ?? zoznamSezon[0]).id);
    }
  }, [zoznamSezon, vybranaSezona]);

  useEffect(() => {
    if (vybranyTim === null && zoznamTimov.length > 0) {
      setVybranyTim(zoznamTimov[0].id);
    }
  }, [zoznamTimov, vybranyTim]);

  const supiska = useNacitanie(
    (signal) =>
      vybranyTim !== null && vybranaSezona !== null
        ? sezonyApi.supiska(vybranyTim, vybranaSezona, signal)
        : Promise.resolve([] as ZaznamSupisky[]),
    [vybranyTim, vybranaSezona]
  );

  const jeNova = upravovana !== null && !upravovana.id;
  const zvolenaSezona = zoznamSezon.find((s) => s.id === vybranaSezona);

  const ulozSezonu = async () => {
    if (!upravovana) return;

    if (!upravovana.nazov?.trim()) {
      varovanie('Zadajte názov sezóny, napríklad 2026/2027');
      return;
    }

    setUklada(true);
    try {
      if (jeNova) {
        await sezonyApi.vytvor({
          nazov: upravovana.nazov.trim(),
          zaciatok: upravovana.zaciatok || null,
          koniec: upravovana.koniec || null,
        });
        uspech('Sezóna bola vytvorená');
      } else {
        await sezonyApi.uprav(upravovana.id!, {
          nazov: upravovana.nazov.trim(),
          zaciatok: upravovana.zaciatok || null,
          koniec: upravovana.koniec || null,
          uzavreta: upravovana.uzavreta,
          poznamka: upravovana.poznamka || null,
        });
        uspech('Zmeny boli uložené');
      }
      setUpravovana(null);
      sezony.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Sezónu sa nepodarilo uložiť');
    } finally {
      setUklada(false);
    }
  };

  const nastavAktualnu = async (id: number) => {
    try {
      await sezonyApi.nastavAktualnu(id);
      uspech('Sezóna je teraz aktuálna');
      sezony.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Sezónu sa nepodarilo označiť');
    }
  };

  const zmazSezonu = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await sezonyApi.zmaz(naZmazanie.id);
      uspech('Sezóna bola presunutá do archívu');
      setNaZmazanie(null);
      sezony.obnov();
    } catch (e: any) {
      // Server odmietne zmazať sezónu, na ktorú niečo odkazuje —
      // hláška vysvetľuje, čo ju drží
      hlasChybu(e?.message || 'Sezónu sa nepodarilo archivovať');
    } finally {
      setMaze(false);
    }
  };

  const pridajNaSupisku = async () => {
    if (!pridavany || vybranaSezona === null || vybranyTim === null) return;

    if (!pridavany.hrac_id) {
      varovanie('Vyberte hráča');
      return;
    }

    setUklada(true);
    try {
      await sezonyApi.zapisNaSupisku({
        sezona_id: vybranaSezona,
        tim_id: vybranyTim,
        hrac_id: Number(pridavany.hrac_id),
        cislo_dresu: pridavany.cislo ? Number(pridavany.cislo) : null,
        kapitan: pridavany.kapitan,
      });
      uspech('Hráč bol zapísaný na súpisku');
      setPridavany(null);
      supiska.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Hráča sa nepodarilo zapísať');
    } finally {
      setUklada(false);
    }
  };

  const odoberZoSupisky = async (zaznam: ZaznamSupisky) => {
    try {
      await sezonyApi.zmazZoSupisky(zaznam.id);
      uspech('Hráč bol odobratý zo súpisky');
      supiska.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Hráča sa nepodarilo odobrať');
    }
  };

  if (sezony.chyba) {
    return <ErrorState sprava="Sezóny sa nepodarilo načítať" detail={sezony.chyba} onSkusZnova={sezony.obnov} />;
  }

  // Hráči, ktorí na súpiske ešte nie sú
  const zapisaniIds = new Set((supiska.data ?? []).map((z) => z.hrac_id));
  const dostupniHraci = (hraci.data ?? []).filter((h) => !zapisaniIds.has(h.id));

  return (
    <div className="cw-sezony">
      <PageHeader nadpis="Sezóny a súpisky" podnadpis="Ročníky súťaží a príslušnosť hráčov k tímom." />

      {/* ===== Sezóny ===== */}
      <Card
        nadpis="Sezóny"
        podnadpis="Aktuálna sezóna určuje, čo sa zobrazuje na verejnom webe"
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={15} />} onClick={() => setUpravovana({ ...PRAZDNA })}>
            Nová sezóna
          </Button>
        }
        bezOdsadenia
      >
        {sezony.nacitava ? (
          <div style={{ padding: 'var(--sp-4)' }}>
            <Skeleton riadkov={3} vyska="18px" />
          </div>
        ) : zoznamSezon.length === 0 ? (
          <EmptyState
            ikona={<Icon nazov="sezony" velkost={36} />}
            nadpis="Žiadne sezóny"
            popis="Vytvorte prvú sezónu, napríklad 2026/2027."
            akcia={<Button onClick={() => setUpravovana({ ...PRAZDNA })}>Vytvoriť sezónu</Button>}
          />
        ) : (
          <ul className="cw-sezony__zoznam">
            {zoznamSezon.map((s) => (
              <li key={s.id} className={`cw-sezony__polozka ${s.aktualna ? 'is-aktualna' : ''}`}>
                <div className="cw-sezony__hlavne">
                  <span className="cw-sezony__nazov">{s.nazov}</span>
                  <div className="cw-sezony__stitky">
                    {/* Stav podľa požiadavky: aktívna / neaktívna (archivované sú v Archíve) */}
                    {s.aktualna && !s.uzavreta ? (
                      <Badge ton="success">Aktívna · aktuálna</Badge>
                    ) : (
                      <Badge ton="neutral">Neaktívna</Badge>
                    )}
                    {s.uzavreta && <Badge ton="warning">Uzavretá</Badge>}
                  </div>
                </div>

                <span className="cw-sezony__obdobie">
                  {s.zaciatok || s.koniec
                    ? `${s.zaciatok ? formatujDatum(s.zaciatok) : '?'} – ${s.koniec ? formatujDatum(s.koniec) : '?'}`
                    : 'obdobie nezadané'}
                </span>

                <div className="cw-sezony__akcie">
                  {!s.aktualna && (
                    <Button variant="ghost" velkost="sm" onClick={() => nastavAktualnu(s.id)}>
                      Označiť ako aktuálnu
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    velkost="sm"
                    onClick={() => setUpravovana({ ...s })}
                    aria-label={`Upraviť sezónu ${s.nazov}`}
                  >
                    <Icon nazov="upravit" velkost={15} />
                  </Button>
                  {!s.aktualna && (
                    <Button
                      variant="ghost"
                      velkost="sm"
                      onClick={() => setNaZmazanie(s)}
                      aria-label={`Archivovať sezónu ${s.nazov}`}
                      title="Presunúť do archívu"
                    >
                      <Icon nazov="archiv" velkost={15} />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ===== Súpiska ===== */}
      <Card
        nadpis="Súpiska tímu"
        podnadpis="Príslušnosť hráča k tímu v konkrétnej sezóne — zachováva históriu pri prestupoch"
        akcie={
          <Button
            velkost="sm"
            ikona={<Icon nazov="plus" velkost={14} />}
            onClick={() => setPridavany({ hrac_id: '', cislo: '', kapitan: false })}
            disabled={vybranaSezona === null || vybranyTim === null || zvolenaSezona?.uzavreta}
          >
            Zapísať hráča
          </Button>
        }
      >
        <div className="cw-sezony__vyber">
          <Select
            menovka="Sezóna"
            value={vybranaSezona ?? ''}
            onChange={(e) => setVybranaSezona(e.target.value ? Number(e.target.value) : null)}
            moznosti={zoznamSezon.map((s) => ({
              hodnota: s.id,
              popis: `${s.nazov}${s.aktualna ? ' (aktuálna)' : ''}${s.uzavreta ? ' — uzavretá' : ''}`,
            }))}
          />
          <Select
            menovka="Tím"
            value={vybranyTim ?? ''}
            onChange={(e) => setVybranyTim(e.target.value ? Number(e.target.value) : null)}
            moznosti={zoznamTimov.map((t) => ({
              hodnota: t.id,
              popis: `${t.nazov} (${t.vekova_kategoria})`,
            }))}
          />
        </div>

        {zvolenaSezona?.uzavreta && (
          <div className="cw-sezony__uzavreta">
            <Icon nazov="licencia" velkost={15} />
            <span>Sezóna je uzavretá. Súpisku už nemožno meniť — slúži len na čítanie v archíve.</span>
          </div>
        )}

        {supiska.nacitava ? (
          <Skeleton riadkov={4} vyska="18px" />
        ) : (supiska.data ?? []).length === 0 ? (
          <p className="cw-sezony__prazdne">
            Na súpiske tohto tímu v zvolenej sezóne zatiaľ nikto nie je.
          </p>
        ) : (
          <ul className="cw-sezony__supiska">
            {(supiska.data ?? []).map((z) => (
              <li key={z.id} className="cw-sezony__hrac">
                <span className="cw-sezony__cislo">
                  {z.cislo_dresu !== null ? z.cislo_dresu : '—'}
                </span>
                <span className="cw-sezony__hrac-meno">
                  {z.hrac ? `${z.hrac.meno} ${z.hrac.priezvisko}` : `Hráč #${z.hrac_id}`}
                  {z.kapitan && <Badge ton="primary">Kapitán</Badge>}
                </span>
                <span className="cw-sezony__pozicia">{z.pozicia ?? ''}</span>
                {!zvolenaSezona?.uzavreta && (
                  <button
                    className="cw-sezony__odobrat"
                    onClick={() => odoberZoSupisky(z)}
                    aria-label="Odobrať zo súpisky"
                  >
                    <Icon nazov="zavriet" velkost={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ===== Okno sezóny ===== */}
      <Modal
        otvorene={upravovana !== null}
        onZavri={() => setUpravovana(null)}
        nadpis={jeNova ? 'Nová sezóna' : `Sezóna ${upravovana?.nazov}`}
        sirka="sm"
        pata={
          <>
            <Button variant="secondary" onClick={() => setUpravovana(null)} disabled={uklada}>
              Zrušiť
            </Button>
            <Button onClick={ulozSezonu} nacitava={uklada}>
              {jeNova ? 'Vytvoriť' : 'Uložiť'}
            </Button>
          </>
        }
      >
        {upravovana && (
          <>
            <Input
              menovka="Názov sezóny"
              value={upravovana.nazov ?? ''}
              onChange={(e) => setUpravovana((d) => ({ ...d!, nazov: e.target.value }))}
              placeholder="2026/2027"
              povinne
              napoveda="Odporúčaný tvar: 2026/2027"
            />

            <div className="cw-sezony__row">
              <Input
                menovka="Začiatok"
                type="date"
                value={upravovana.zaciatok?.slice(0, 10) ?? ''}
                onChange={(e) => setUpravovana((d) => ({ ...d!, zaciatok: e.target.value || null }))}
              />
              <Input
                menovka="Koniec"
                type="date"
                value={upravovana.koniec?.slice(0, 10) ?? ''}
                onChange={(e) => setUpravovana((d) => ({ ...d!, koniec: e.target.value || null }))}
              />
            </div>

            {!jeNova && (
              <>
                <Switch
                  zapnute={Boolean(upravovana.uzavreta)}
                  onZmena={(v) => setUpravovana((d) => ({ ...d!, uzavreta: v }))}
                  menovka="Uzavretá sezóna"
                  popis="Uzavretú sezónu už nemožno upravovať — zostane len na čítanie"
                />

                <Textarea
                  menovka="Poznámka"
                  value={upravovana.poznamka ?? ''}
                  onChange={(e) => setUpravovana((d) => ({ ...d!, poznamka: e.target.value }))}
                  rows={2}
                />
              </>
            )}
          </>
        )}
      </Modal>

      {/* ===== Okno zápisu na súpisku ===== */}
      <Modal
        otvorene={pridavany !== null}
        onZavri={() => setPridavany(null)}
        nadpis="Zapísať hráča na súpisku"
        podnadpis={`${zvolenaSezona?.nazov ?? ''} · ${zoznamTimov.find((t) => t.id === vybranyTim)?.nazov ?? ''}`}
        sirka="sm"
        pata={
          <>
            <Button variant="secondary" onClick={() => setPridavany(null)} disabled={uklada}>
              Zrušiť
            </Button>
            <Button onClick={pridajNaSupisku} nacitava={uklada}>
              Zapísať
            </Button>
          </>
        }
      >
        {pridavany && (
          <>
            <Select
              menovka="Hráč"
              value={pridavany.hrac_id}
              onChange={(e) => setPridavany((d) => ({ ...d!, hrac_id: e.target.value }))}
              prazdna="Vyberte hráča"
              moznosti={dostupniHraci.map((h) => ({
                hodnota: h.id,
                popis: `${h.meno} ${h.priezvisko}`,
              }))}
              povinne
              napoveda={
                dostupniHraci.length === 0
                  ? 'Všetci hráči už sú na súpiske tohto tímu'
                  : undefined
              }
            />

            <Input
              menovka="Číslo dresu"
              type="number"
              min={1}
              max={99}
              value={pridavany.cislo}
              onChange={(e) => setPridavany((d) => ({ ...d!, cislo: e.target.value }))}
              napoveda="Číslo sa môže medzi sezónami meniť"
            />

            <Switch
              zapnute={pridavany.kapitan}
              onZmena={(v) => setPridavany((d) => ({ ...d!, kapitan: v }))}
              menovka="Kapitán tímu"
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis="Archivovať sezónu?"
        sprava={`Sezóna ${naZmazanie?.nazov} bude archivovaná. Súpisky a výsledky zostanú zachované a sezónu môžete obnoviť v Archíve.`}
        potvrdit="Archivovať"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmazSezonu}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default Sezony;
