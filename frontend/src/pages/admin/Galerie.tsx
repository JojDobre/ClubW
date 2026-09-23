// Umiestnenie: frontend/src/pages/admin/Galerie.tsx
// Fotogalérie klubu.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader, Button, Badge, Icon, Input,
  Skeleton, EmptyState, ErrorState, ConfirmDialog, useToast,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { galerieApi } from '../../api/obsah';
import { formatujDatum } from '../../utils/datum';
import { souborUrl } from '../../config/api';
import type { Galeria } from '../../api/typy';
import './Galerie.css';

/** Krátky popis, ku čomu galéria patrí. */
const priradenie = (g: Galeria): string | null =>
  g.zapas_id ? 'Zápas' : g.tim_id ? 'Tím' : g.clanok_id ? 'Článok' : null;

export const Galerie: React.FC = () => {
  const { uspech, chyba: hlasChybu } = useToast();
  const navigate = useNavigate();

  const [naZmazanie, setNaZmazanie] = useState<Galeria | null>(null);
  const [hladanie, setHladanie] = useState('');
  const [maze, setMaze] = useState(false);

  const otvor = (g: Galeria) => navigate(`/admin/galerie/${g.id}`);
  const nova = () => navigate('/admin/galerie/nova');

  const galerie = useNacitanie((signal) => galerieApi.vypis(signal));

  // Galérie zobrazujeme ako dlaždice s náhľadmi, nie ako tabuľku —
  // pri obrazovom obsahu je to prehľadnejšie
  const zoznam = (galerie.data ?? []).filter((g) =>
    hladanie.trim()
      ? `${g.nazov} ${g.popis ?? ''}`.toLowerCase().includes(hladanie.trim().toLowerCase())
      : true
  );

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
          <Button ikona={<Icon nazov="plus" velkost={15} />} onClick={nova}>
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
                <Button onClick={nova}>Vytvoriť galériu</Button>
              )
            }
          />
        </div>
      ) : (
        <div className="cw-gal__mriezka">
          {zoznam.map((g) => (
            <div key={g.id} className="cw-gal__karta">
              <button className="cw-gal__nahlad" onClick={() => otvor(g)}>
                {g.nahladovy_obrazok ? (
                  <img
                    src={souborUrl(g.nahladovy_obrazok)}
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
                  <span className="cw-gal__nazov" title={g.nazov}>{g.nazov}</span>
                </div>
                {(g.zobrazit_na_webe === false || priradenie(g)) && (
                  <div className="cw-gal__stitky">
                    {g.zobrazit_na_webe === false && <Badge>Skrytá</Badge>}
                    {priradenie(g) && <Badge ton="info">{priradenie(g)}</Badge>}
                  </div>
                )}

                {g.popis && <p className="cw-gal__popis">{g.popis}</p>}

                <div className="cw-gal__pata">
                  <span className="cw-gal__datum">
                    {formatujDatum(g.vytvoreny)}
                  </span>
                  <div className="cw-gal__akcie">
                    <button
                      onClick={() => otvor(g)}
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

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis="Zmazať galériu?"
        sprava={`Galéria ${naZmazanie?.nazov} bude zmazaná aj so všetkými fotkami. Súbory v Media knižnici zostanú.`}
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
