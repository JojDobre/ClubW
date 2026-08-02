// Umiestnenie: frontend/src/pages/admin/Galerie.tsx
// Fotogalérie klubu.

import React, { useState } from 'react';
import {
  PageHeader, Button, Badge, Icon, Modal, Input, Textarea, Switch,
  Skeleton, EmptyState, ErrorState, ConfirmDialog, useToast,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { galerieApi } from '../../api/obsah';
import { formatujDatum } from '../../utils/datum';
import type { Galeria } from '../../api/typy';
import './Galerie.css';

const PRAZDNA: Partial<Galeria> = { nazov: '', popis: '', nahladovy_obrazok: '', aktivity: true };

export const Galerie: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const [upravovana, setUpravovana] = useState<Partial<Galeria> | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<Galeria | null>(null);
  const [hladanie, setHladanie] = useState('');
  const [uklada, setUklada] = useState(false);
  const [maze, setMaze] = useState(false);

  const galerie = useNacitanie((signal) => galerieApi.vypis(signal));

  // Galérie zobrazujeme ako dlaždice s náhľadmi, nie ako tabuľku —
  // pri obrazovom obsahu je to prehľadnejšie
  const zoznam = (galerie.data ?? []).filter((g) =>
    hladanie.trim()
      ? `${g.nazov} ${g.popis ?? ''}`.toLowerCase().includes(hladanie.trim().toLowerCase())
      : true
  );

  const jeNova = upravovana !== null && !upravovana.id;

  const uloz = async () => {
    if (!upravovana) return;

    if (!upravovana.nazov?.trim()) {
      varovanie('Zadajte názov galérie');
      return;
    }

    setUklada(true);
    try {
      const naUlozenie = {
        ...upravovana,
        popis: upravovana.popis?.trim() || null,
        nahladovy_obrazok: upravovana.nahladovy_obrazok?.trim() || null,
      };

      if (jeNova) {
        await galerieApi.vytvor(naUlozenie);
        uspech('Galéria bola vytvorená');
      } else {
        await galerieApi.uprav(upravovana.id!, naUlozenie);
        uspech('Zmeny boli uložené');
      }
      setUpravovana(null);
      galerie.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Galériu sa nepodarilo uložiť');
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await galerieApi.zmaz(naZmazanie.id);
      uspech('Galéria bola zmazaná');
      setNaZmazanie(null);
      galerie.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Galériu sa nepodarilo zmazať');
    } finally {
      setMaze(false);
    }
  };

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis="Galérie"
        podnadpis="Fotogalérie zo zápasov, turnajov a klubových podujatí."
        akcie={
          <Button ikona={<Icon nazov="plus" velkost={15} />} onClick={() => setUpravovana({ ...PRAZDNA })}>
            Nová galéria
          </Button>
        }
      />

      <div className="cw-gal__hladanie">
        <Input
          value={hladanie}
          onChange={(e) => setHladanie(e.target.value)}
          placeholder="Hľadať galériu…"
          ikona={<Icon nazov="hladat" velkost={15} />}
          aria-label="Hľadať galériu"
        />
      </div>

      {galerie.chyba ? (
        <ErrorState
          sprava="Galérie sa nepodarilo načítať"
          detail={galerie.chyba}
          onSkusZnova={galerie.obnov}
        />
      ) : galerie.nacitava ? (
        <div className="cw-gal__mriezka">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="cw-gal__karta">
              <Skeleton vyska="150px" />
            </div>
          ))}
        </div>
      ) : zoznam.length === 0 ? (
        <div className="cw-gal__prazdne">
          <EmptyState
            ikona={<Icon nazov="galerie" velkost={40} />}
            nadpis={hladanie ? 'Nič sme nenašli' : 'Zatiaľ žiadne galérie'}
            popis={
              hladanie
                ? 'Skúste zmeniť hľadaný text.'
                : 'Vytvorte galériu a nahrajte do nej fotky zo zápasu alebo podujatia.'
            }
            akcia={
              hladanie ? (
                <Button variant="secondary" onClick={() => setHladanie('')}>
                  Vymazať hľadanie
                </Button>
              ) : (
                <Button onClick={() => setUpravovana({ ...PRAZDNA })}>Vytvoriť galériu</Button>
              )
            }
          />
        </div>
      ) : (
        <div className="cw-gal__mriezka">
          {zoznam.map((g) => (
            <div key={g.id} className="cw-gal__karta">
              <button className="cw-gal__nahlad" onClick={() => setUpravovana({ ...g })}>
                {g.nahladovy_obrazok ? (
                  <img
                    src={g.nahladovy_obrazok}
                    alt=""
                    onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                  />
                ) : (
                  <Icon nazov="galerie" velkost={30} />
                )}

                {g.pocet_obrazkov !== undefined && (
                  <span className="cw-gal__pocet">{g.pocet_obrazkov} fotiek</span>
                )}
              </button>

              <div className="cw-gal__telo">
                <div className="cw-gal__hlava">
                  <span className="cw-gal__nazov">{g.nazov}</span>
                  {!g.aktivity && <Badge>Skrytá</Badge>}
                </div>

                {g.popis && <p className="cw-gal__popis">{g.popis}</p>}

                <div className="cw-gal__pata">
                  <span className="cw-gal__datum">
                    {formatujDatum(g.vytvoreny)}
                  </span>
                  <div className="cw-gal__akcie">
                    <button
                      onClick={() => setUpravovana({ ...g })}
                      aria-label={`Upraviť galériu ${g.nazov}`}
                    >
                      <Icon nazov="upravit" velkost={15} />
                    </button>
                    <button
                      className="is-danger"
                      onClick={() => setNaZmazanie(g)}
                      aria-label={`Zmazať galériu ${g.nazov}`}
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
        otvorene={upravovana !== null}
        onZavri={() => setUpravovana(null)}
        nadpis={jeNova ? 'Nová galéria' : upravovana?.nazov ?? 'Galéria'}
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
              menovka="Názov galérie"
              value={upravovana.nazov ?? ''}
              onChange={(e) => setUpravovana((d) => ({ ...d!, nazov: e.target.value }))}
              placeholder="Napríklad: Zápas s Račou"
              povinne
            />

            <Textarea
              menovka="Popis"
              value={upravovana.popis ?? ''}
              onChange={(e) => setUpravovana((d) => ({ ...d!, popis: e.target.value }))}
              rows={2}
            />

            <Input
              menovka="Titulný obrázok"
              value={upravovana.nahladovy_obrazok ?? ''}
              onChange={(e) => setUpravovana((d) => ({ ...d!, nahladovy_obrazok: e.target.value }))}
              placeholder="/uploads/images/galleries/…"
              napoveda="Nahrávanie fotiek pribudne v ďalšej fáze"
            />

            <Switch
              zapnute={upravovana.aktivity !== false}
              onZmena={(v) => setUpravovana((d) => ({ ...d!, aktivity: v }))}
              menovka="Zobraziť na webe"
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis="Zmazať galériu?"
        sprava={`Galéria ${naZmazanie?.nazov} bude odstránená aj so všetkými fotkami.`}
        potvrdit="Zmazať"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default Galerie;
