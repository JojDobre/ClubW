// Umiestnenie: frontend/src/pages/admin/Ankety.tsx
// Ankety pre návštevníkov webu.

import React, { useState } from 'react';
import {
  PageHeader, Button, Badge, Icon, Modal, Input, Switch,
  Skeleton, EmptyState, ErrorState, ConfirmDialog, useToast,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { anketyApi } from '../../api/klub';
import { formatujDatum } from '../../utils/datum';
import type { Anketa, MoznostAnkety } from '../../api/typy';
import './Ankety.css';

/** Nová anketa začína s dvomi prázdnymi možnosťami. */
const prazdnaAnketa = (): Partial<Anketa> => ({
  otazka: '',
  moznosti: [
    { id: crypto.randomUUID().slice(0, 8), text: '', hlasy: 0 },
    { id: crypto.randomUUID().slice(0, 8), text: '', hlasy: 0 },
  ],
  otvorena: true,
  publikovana: false,
});

export const Ankety: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const [upravovana, setUpravovana] = useState<Partial<Anketa> | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<Anketa | null>(null);
  const [uklada, setUklada] = useState(false);
  const [maze, setMaze] = useState(false);

  const ankety = useNacitanie((signal) => anketyApi.vypis(signal));
  const zoznam = ankety.data ?? [];

  const jeNova = upravovana !== null && !upravovana.id;

  /** Podiel hlasov pre danú možnosť v percentách. */
  const podiel = (m: MoznostAnkety, celkom: number): number =>
    celkom > 0 ? Math.round((m.hlasy / celkom) * 100) : 0;

  const zmenMoznost = (index: number, text: string) => {
    setUpravovana((d) => {
      const moznosti = [...(d!.moznosti ?? [])];
      moznosti[index] = { ...moznosti[index], text };
      return { ...d!, moznosti };
    });
  };

  const pridajMoznost = () => {
    setUpravovana((d) => ({
      ...d!,
      moznosti: [
        ...(d!.moznosti ?? []),
        { id: crypto.randomUUID().slice(0, 8), text: '', hlasy: 0 },
      ],
    }));
  };

  const odoberMoznost = (index: number) => {
    setUpravovana((d) => {
      const moznosti = (d!.moznosti ?? []).filter((_, i) => i !== index);
      return { ...d!, moznosti };
    });
  };

  const uloz = async () => {
    if (!upravovana) return;

    if (!upravovana.otazka?.trim() || upravovana.otazka.trim().length < 5) {
      varovanie('Zadajte otázku (aspoň 5 znakov)');
      return;
    }

    const vyplnene = (upravovana.moznosti ?? []).filter((m) => m.text.trim());
    if (vyplnene.length < 2) {
      varovanie('Anketa musí mať aspoň dve vyplnené možnosti');
      return;
    }

    setUklada(true);
    try {
      // Prázdne možnosti pri ukladaní vynecháme
      const naUlozenie = { ...upravovana, moznosti: vyplnene };

      if (jeNova) {
        await anketyApi.vytvor(naUlozenie);
        uspech('Anketa bola vytvorená');
      } else {
        await anketyApi.uprav(upravovana.id!, naUlozenie);
        uspech('Zmeny boli uložené');
      }
      setUpravovana(null);
      ankety.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Anketu sa nepodarilo uložiť');
    } finally {
      setUklada(false);
    }
  };

  const kopirujZnacku = async (id: number) => {
    const znacka = `[anketa ${id}]`;
    try {
      await navigator.clipboard.writeText(znacka);
      uspech(`Značka ${znacka} je skopírovaná - vložte ju do obsahu stránky`);
    } catch {
      uspech(`Vložte do obsahu stránky značku ${znacka}`);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await anketyApi.zmaz(naZmazanie.id);
      uspech('Anketa bola zmazaná');
      setNaZmazanie(null);
      ankety.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Anketu sa nepodarilo zmazať');
    } finally {
      setMaze(false);
    }
  };

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis="Ankety"
        podnadpis="Otázky pre návštevníkov webu a ich výsledky. Najnovšia otvorená anketa sa zobrazí na úvodnej stránke, konkrétnu vložíte do stránky značkou [anketa ID]."
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={17} />} onClick={() => setUpravovana(prazdnaAnketa())}>
            Nová anketa
          </Button>
        }
      />

      {ankety.chyba ? (
        <ErrorState sprava="Ankety sa nepodarilo načítať" detail={ankety.chyba} onSkusZnova={ankety.obnov} />
      ) : ankety.nacitava ? (
        <div className="cw-ank__mriezka">
          {[0, 1].map((i) => (
            <div key={i} className="cw-ank__karta">
              <Skeleton riadkov={4} />
            </div>
          ))}
        </div>
      ) : zoznam.length === 0 ? (
        <div className="cw-ank__prazdne">
          <EmptyState
            ikona={<Icon nazov="komentare" velkost={40} />}
            nadpis="Zatiaľ žiadne ankety"
            popis="Opýtajte sa fanúšikov, kto bol hráčom zápasu alebo aký dres si želajú."
            akcia={<Button onClick={() => setUpravovana(prazdnaAnketa())}>Vytvoriť anketu</Button>}
          />
        </div>
      ) : (
        <div className="cw-ank__mriezka">
          {zoznam.map((a) => (
            <div key={a.id} className="cw-ank__karta">
              <div className="cw-ank__hlava">
                <div className="cw-ank__stitky">
                  {a.publikovana ? <Badge ton="success">Na webe</Badge> : <Badge>Koncept</Badge>}
                  {a.otvorena ? (
                    <Badge ton="info">Otvorená</Badge>
                  ) : (
                    <Badge ton="warning">Uzavretá</Badge>
                  )}
                </div>

                <div className="cw-ank__akcie">
                  <button onClick={() => kopirujZnacku(a.id)} aria-label="Kopírovať značku na vloženie" title={`[anketa ${a.id}]`}>
                    <Icon nazov="odkaz" velkost={15} />
                  </button>
                  <button onClick={() => setUpravovana({ ...a })} aria-label="Upraviť anketu">
                    <Icon nazov="upravit" velkost={15} />
                  </button>
                  <button className="is-danger" onClick={() => setNaZmazanie(a)} aria-label="Zmazať anketu">
                    <Icon nazov="zmazat" velkost={15} />
                  </button>
                </div>
              </div>

              <h3 className="cw-ank__otazka">{a.otazka}</h3>

              {/* Výsledky ako vodorovné pruhy — na prvý pohľad vidno,
                  ktorá možnosť vedie */}
              <ul className="cw-ank__vysledky">
                {a.moznosti.map((m) => {
                  const percent = podiel(m, a.celkom_hlasov);
                  return (
                    <li key={m.id} className="cw-ank__moznost">
                      <div className="cw-ank__moznost-hlava">
                        <span className="cw-ank__moznost-text">{m.text}</span>
                        <span className="cw-ank__moznost-cislo">
                          {m.hlasy} · {percent} %
                        </span>
                      </div>
                      <div className="cw-ank__pruh">
                        <div className="cw-ank__pruh-vypln" style={{ width: `${percent}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="cw-ank__pata">
                <span>{a.celkom_hlasov} hlasov</span>
                <span>{formatujDatum(a.vytvorena)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        otvorene={upravovana !== null}
        onZavri={() => setUpravovana(null)}
        nadpis={jeNova ? 'Nová anketa' : 'Úprava ankety'}
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
              menovka="Otázka"
              value={upravovana.otazka ?? ''}
              onChange={(e) => setUpravovana((d) => ({ ...d!, otazka: e.target.value }))}
              placeholder="Kto bol hráčom zápasu?"
              povinne
            />

            <label className="cw-ank__label">Možnosti</label>
            <div className="cw-ank__moznosti-uprava">
              {(upravovana.moznosti ?? []).map((m, i) => (
                <div key={m.id} className="cw-ank__uprava-riadok">
                  <input
                    className="cw-input"
                    value={m.text}
                    onChange={(e) => zmenMoznost(i, e.target.value)}
                    placeholder={`Možnosť ${i + 1}`}
                    aria-label={`Možnosť ${i + 1}`}
                  />
                  {/* Počet hlasov ukazujeme pri existujúcej ankete */}
                  {m.hlasy > 0 && <span className="cw-ank__uprava-hlasy">{m.hlasy}</span>}
                  <button
                    className="cw-ank__uprava-odobrat"
                    onClick={() => odoberMoznost(i)}
                    disabled={(upravovana.moznosti ?? []).length <= 2}
                    aria-label="Odobrať možnosť"
                    title={
                      (upravovana.moznosti ?? []).length <= 2
                        ? 'Anketa musí mať aspoň dve možnosti'
                        : 'Odobrať možnosť'
                    }
                  >
                    <Icon nazov="zavriet" velkost={14} />
                  </button>
                </div>
              ))}
            </div>

            <Button
              variant="secondary"
              velkost="sm"
              onClick={pridajMoznost}
              ikona={<Icon nazov="plus" velkost={14} />}
              disabled={(upravovana.moznosti ?? []).length >= 12}
            >
              Pridať možnosť
            </Button>

            <div style={{ marginTop: 16 }}>
              <Switch
                zapnute={Boolean(upravovana.otvorena)}
                onZmena={(v) => setUpravovana((d) => ({ ...d!, otvorena: v }))}
                menovka="Otvorená anketa"
                popis="Uzavretá anketa už neprijíma hlasy, výsledky zostanú viditeľné"
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <Switch
                zapnute={Boolean(upravovana.publikovana)}
                onZmena={(v) => setUpravovana((d) => ({ ...d!, publikovana: v }))}
                menovka="Zobraziť na webe"
              />
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis="Zmazať anketu?"
        sprava={`Anketa „${naZmazanie?.otazka}" bude zmazaná aj s odovzdanými hlasmi.`}
        potvrdit="Zmazať"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default Ankety;
