// Umiestnenie: frontend/src/pages/admin/Komentare.tsx
// Schvaľovanie komentárov pod článkami.

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  PageHeader, Button, Badge, Icon, FilterChips,
  Skeleton, EmptyState, ErrorState, ConfirmDialog, useToast,
  type Chip, type TonStitka,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { komentareApi } from '../../api/doplnky';
import { formatujDatumCas } from '../../utils/datum';
import type { Komentar, StavKomentara } from '../../api/typy';
import './Komentare.css';

const STAVY: Array<{ hodnota: StavKomentara; popis: string; ton: TonStitka }> = [
  { hodnota: 'caka', popis: 'Čaká na schválenie', ton: 'warning' },
  { hodnota: 'schvaleny', popis: 'Schválený', ton: 'success' },
  { hodnota: 'zamietnuty', popis: 'Zamietnutý', ton: 'neutral' },
  { hodnota: 'spam', popis: 'Spam', ton: 'danger' },
];

export const Komentare: React.FC = () => {
  const { uspech, chyba: hlasChybu } = useToast();

  const [filter, setFilter] = useState<string>('caka');
  const [naZmazanie, setNaZmazanie] = useState<Komentar | null>(null);
  const [maze, setMaze] = useState(false);
  const [spracuva, setSpracuva] = useState<number | null>(null);

  const komentare = useNacitanie((signal) => komentareApi.vypis('', signal));
  const zoznam = komentare.data?.komentare ?? [];

  const chipy: Chip[] = useMemo(
    () => [
      { hodnota: '', popis: 'Všetky', pocet: zoznam.length },
      ...STAVY.map((s) => ({
        hodnota: s.hodnota,
        popis: s.popis,
        pocet: zoznam.filter((k) => k.stav === s.hodnota).length,
      })),
    ],
    [zoznam]
  );

  const zobrazene = useMemo(
    () => (filter ? zoznam.filter((k) => k.stav === filter) : zoznam),
    [zoznam, filter]
  );

  /** Zmení stav komentára — schválenie, zamietnutie, spam. */
  const zmenStav = async (k: Komentar, stav: StavKomentara) => {
    setSpracuva(k.id);
    try {
      await komentareApi.zmenStav(k.id, stav);
      uspech(
        stav === 'schvaleny' ? 'Komentár bol schválený'
          : stav === 'spam' ? 'Komentár označený ako spam'
            : 'Komentár bol zamietnutý'
      );
      komentare.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Stav sa nepodarilo zmeniť');
    } finally {
      setSpracuva(null);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await komentareApi.zmaz(naZmazanie.id);
      uspech('Komentár bol zmazaný');
      setNaZmazanie(null);
      komentare.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Komentár sa nepodarilo zmazať');
    } finally {
      setMaze(false);
    }
  };

  const cakajucich = zoznam.filter((k) => k.stav === 'caka').length;

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis="Komentáre"
        podnadpis={
          cakajucich > 0
            ? `${cakajucich} komentárov čaká na schválenie.`
            : 'Komentáre návštevníkov pod článkami.'
        }
      />

      <FilterChips
        moznosti={chipy}
        zvolena={filter}
        onZmena={setFilter}
        popisSkupiny="Filtrovať podľa stavu"
      />

      {komentare.chyba ? (
        <ErrorState
          sprava="Komentáre sa nepodarilo načítať"
          detail={komentare.chyba}
          onSkusZnova={komentare.obnov}
        />
      ) : komentare.nacitava ? (
        <div className="cw-kom__zoznam">
          {[0, 1, 2].map((i) => (
            <div key={i} className="cw-kom__karta">
              <Skeleton riadkov={3} />
            </div>
          ))}
        </div>
      ) : zobrazene.length === 0 ? (
        <div className="cw-kom__prazdne">
          <EmptyState
            ikona={<Icon nazov="komentare" velkost={40} />}
            nadpis={filter === 'caka' ? 'Nič nečaká na schválenie' : 'Žiadne komentáre'}
            popis={
              filter === 'caka'
                ? 'Všetky komentáre sú vybavené. Nové sa objavia tu.'
                : 'V tomto stave nie sú žiadne komentáre.'
            }
          />
        </div>
      ) : (
        <div className="cw-kom__zoznam">
          {zobrazene.map((k) => {
            const stav = STAVY.find((s) => s.hodnota === k.stav);
            const prebieha = spracuva === k.id;

            return (
              <article key={k.id} className="cw-kom__karta">
                <div className="cw-kom__hlava">
                  <div className="cw-kom__autor">
                    <span className="cw-kom__avatar" aria-hidden="true">
                      {k.autor_meno.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <div className="cw-kom__meno">{k.autor_meno}</div>
                      <div className="cw-kom__cas">
                        {formatujDatumCas(k.vytvoreny)}
                        {k.clanok && (
                          <>
                            {' · pod článkom '}
                            <Link to={`/admin/clanky/${k.clanok.id}`} className="cw-kom__odkaz">
                              {k.clanok.nazov}
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="cw-kom__stitky">
                    {/* Upravený komentár prišiel znova na schválenie - moderátor
                        by mal vedieť, že nejde o nový, ale o zmenený text */}
                    {k.upraveny_autorom && <Badge ton="info">Upravený autorom</Badge>}
                    {k.rodic_id && <Badge ton="neutral">Odpoveď</Badge>}
                    <Badge ton={stav?.ton ?? 'neutral'}>{stav?.popis ?? k.stav}</Badge>
                  </div>
                </div>

                <p className="cw-kom__obsah">{k.obsah}</p>

                <div className="cw-kom__akcie">
                  {k.stav !== 'schvaleny' && (
                    <Button
                      velkost="sm"
                      onClick={() => zmenStav(k, 'schvaleny')}
                      disabled={prebieha}
                      ikona={<Icon nazov="oko" velkost={14} />}
                    >
                      Schváliť
                    </Button>
                  )}

                  {k.stav !== 'zamietnuty' && (
                    <Button
                      velkost="sm"
                      variant="secondary"
                      onClick={() => zmenStav(k, 'zamietnuty')}
                      disabled={prebieha}
                    >
                      Zamietnuť
                    </Button>
                  )}

                  {k.stav !== 'spam' && (
                    <Button
                      velkost="sm"
                      variant="ghost"
                      onClick={() => zmenStav(k, 'spam')}
                      disabled={prebieha}
                    >
                      Označiť ako spam
                    </Button>
                  )}

                  <div className="cw-kom__medzera" />

                  <Button
                    velkost="sm"
                    variant="ghost"
                    onClick={() => setNaZmazanie(k)}
                    disabled={prebieha}
                    aria-label="Zmazať komentár"
                  >
                    <Icon nazov="zmazat" velkost={15} />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis="Zmazať komentár?"
        sprava={`Komentár od ${naZmazanie?.autor_meno} bude natrvalo odstránený.`}
        potvrdit="Zmazať"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default Komentare;
