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
import { tr } from '../../i18n';
import './Komentare.css';

const STAVY: Array<{ hodnota: StavKomentara; popis: string; ton: TonStitka }> = [
  { hodnota: 'caka', popis: tr('Čaká na schválenie'), ton: 'warning' },
  { hodnota: 'schvaleny', popis: tr('Schválený'), ton: 'success' },
  { hodnota: 'zamietnuty', popis: tr('Zamietnutý'), ton: 'neutral' },
  { hodnota: 'spam', popis: tr('Spam'), ton: 'danger' },
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
      { hodnota: '', popis: tr('Všetky'), pocet: zoznam.length },
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
        stav === 'schvaleny' ? tr('Komentár bol schválený')
          : stav === 'spam' ? tr('Komentár označený ako spam')
            : tr('Komentár bol zamietnutý')
      );
      komentare.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Stav sa nepodarilo zmeniť'));
    } finally {
      setSpracuva(null);
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    setMaze(true);
    try {
      await komentareApi.zmaz(naZmazanie.id);
      uspech(tr('Komentár bol zmazaný'));
      setNaZmazanie(null);
      komentare.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Komentár sa nepodarilo zmazať'));
    } finally {
      setMaze(false);
    }
  };

  const cakajucich = zoznam.filter((k) => k.stav === 'caka').length;

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis={tr('Komentáre')}
        podnadpis={
          cakajucich > 0
            ? tr('{cakajucich} komentárov čaká na schválenie.', { cakajucich })
            : tr('Komentáre návštevníkov pod článkami.')
        }
      />

      <FilterChips
        moznosti={chipy}
        zvolena={filter}
        onZmena={setFilter}
        popisSkupiny={tr('Filtrovať podľa stavu')}
      />

      {komentare.chyba ? (
        <ErrorState
          sprava={tr('Komentáre sa nepodarilo načítať')}
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
            nadpis={filter === 'caka' ? tr('Nič nečaká na schválenie') : tr('Žiadne komentáre')}
            popis={
              filter === 'caka'
                ? tr('Všetky komentáre sú vybavené. Nové sa objavia tu.')
                : tr('V tomto stave nie sú žiadne komentáre.')
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
                            {tr(' · pod článkom ')}
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
                    {k.upraveny_autorom && <Badge ton="info">{tr('Upravený autorom')}</Badge>}
                    {k.rodic_id && <Badge ton="neutral">{tr('Odpoveď')}</Badge>}
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
                      {tr('Schváliť')}
                    </Button>
                  )}

                  {k.stav !== 'zamietnuty' && (
                    <Button
                      velkost="sm"
                      variant="secondary"
                      onClick={() => zmenStav(k, 'zamietnuty')}
                      disabled={prebieha}
                    >
                      {tr('Zamietnuť')}
                    </Button>
                  )}

                  {k.stav !== 'spam' && (
                    <Button
                      velkost="sm"
                      variant="ghost"
                      onClick={() => zmenStav(k, 'spam')}
                      disabled={prebieha}
                    >
                      {tr('Označiť ako spam')}
                    </Button>
                  )}

                  <div className="cw-kom__medzera" />

                  <Button
                    velkost="sm"
                    variant="ghost"
                    onClick={() => setNaZmazanie(k)}
                    disabled={prebieha}
                    aria-label={tr('Zmazať komentár')}
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
        nadpis={tr('Zmazať komentár?')}
        sprava={tr('Komentár od {autor_meno} bude natrvalo odstránený.', { autor_meno: naZmazanie?.autor_meno })}
        potvrdit={tr('Zmazať')}
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default Komentare;
