// Umiestnenie: frontend/src/pages/admin/RolyOpravnenia.tsx
// Roly a ich oprávnenia po moduloch (čítať / upravovať / mazať).
//
// Klub si vytvorí vlastnú rolu (napr. „Tréner mládeže") a zaškrtne,
// do ktorých sekcií smie. Server tieto práva vynucuje pri každej
// požiadavke, menu administrácie podľa nich skrýva sekcie.

import React, { useState } from 'react';
import {
  Button, Badge, Icon, Modal, Input, Textarea, Skeleton, ErrorState, useToast,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { rolyApi } from '../../api/sprava';
import type { AkciaOpravnenia, MapaOpravneni, RolaSOpravneniami } from '../../api/typy';

/** Názvy modulov pre tabuľku oprávnení. */
export const NAZVY_MODULOV: Record<string, string> = {
  clanky: 'Články',
  rubriky: 'Kategórie',
  komentare: 'Komentáre',
  stranky: 'Stránky',
  galerie: 'Galérie',
  videa: 'Videá',
  media: 'Knižnica médií',
  stadiony: 'Štadióny',
  sezony: 'Sezóny a súpisky',
  timy: 'Tímy',
  hraci: 'Hráči',
  realizacny_tim: 'Realizačný tím',
  ligy: 'Ligy a tabuľky',
  turnaje: 'Turnaje',
  zapasy: 'Zápasy',
  kalendar: 'Kalendár',
  sponzori: 'Sponzori',
  dokumenty: 'Dokumenty',
  formulare: 'Formuláre',
  pouzivatelia: 'Používatelia',
  archiv: 'Archív',
  nastavenia: 'Nastavenia',
  sablony: 'Šablóny webu',
  logy: 'Logy',
  licencia: 'Licencia',
};

const AKCIE: Array<{ kluc: AkciaOpravnenia; popis: string }> = [
  { kluc: 'citat', popis: 'Vidí' },
  { kluc: 'pisat', popis: 'Upravuje' },
  { kluc: 'mazat', popis: 'Maže' },
];

/**
 * Zmena jedného práva so zachovaním zmyslu: upravovať a mazať sa dá
 * len to, čo človek vidí; kto nevidí, nemôže ani upravovať a mazať.
 */
const nastavPravo = (mapa: MapaOpravneni, modul: string, akcia: AkciaOpravnenia, hodnota: boolean): MapaOpravneni => {
  const prava = { citat: false, pisat: false, mazat: false, ...mapa[modul] };
  prava[akcia] = hodnota;
  if (akcia !== 'citat' && hodnota) prava.citat = true;
  if (akcia === 'citat' && !hodnota) {
    prava.pisat = false;
    prava.mazat = false;
  }
  return { ...mapa, [modul]: prava };
};

interface UpravovanaRola {
  id?: number;
  nazov: string;
  popis: string;
  opravnenia: MapaOpravneni;
  je_systemova?: boolean;
  kod?: string;
}

/** Počet modulov, ktoré rola vidí - do súhrnu na karte. */
const suhrnPrav = (r: RolaSOpravneniami, moduly: string[]) => {
  const vidi = moduly.filter((m) => r.opravnenia?.[m]?.citat).length;
  const upravuje = moduly.filter((m) => r.opravnenia?.[m]?.pisat).length;
  if (vidi === 0) return 'Bez prístupu do administrácie';
  if (vidi === moduly.length && upravuje === moduly.length) return 'Plný prístup';
  return `Vidí ${vidi} sekcií, upravuje ${upravuje}`;
};

export const RolyOpravnenia: React.FC<{ smieUpravovat: boolean; onZmena?: () => void }> = ({ smieUpravovat, onZmena }) => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();
  const roly = useNacitanie((signal) => rolyApi.vypis(signal));
  const [upravovana, setUpravovana] = useState<UpravovanaRola | null>(null);
  const [uklada, setUklada] = useState(false);

  const moduly = roly.data?.moduly?.length ? roly.data.moduly : Object.keys(NAZVY_MODULOV);
  const zoznam = roly.data?.roly ?? [];
  const jeSpravca = upravovana?.kod === 'admin';

  const otvor = (r?: RolaSOpravneniami) =>
    setUpravovana(
      r
        ? { id: r.id, nazov: r.nazov, popis: r.popis ?? '', opravnenia: { ...r.opravnenia }, je_systemova: r.je_systemova, kod: r.kod }
        : { nazov: '', popis: '', opravnenia: {} }
    );

  const celyStlpec = (akcia: AkciaOpravnenia, hodnota: boolean) =>
    setUpravovana((u) => u && { ...u, opravnenia: moduly.reduce((m, modul) => nastavPravo(m, modul, akcia, hodnota), u.opravnenia) });

  const uloz = async () => {
    if (!upravovana) return;
    if (upravovana.nazov.trim().length < 2) return varovanie('Názov roly musí mať aspoň 2 znaky');
    setUklada(true);
    try {
      const telo: Partial<RolaSOpravneniami> = {
        nazov: upravovana.nazov.trim(),
        popis: upravovana.popis.trim() || null,
      };
      // Správcovi server oprávnenia meniť nedovolí
      if (!jeSpravca) telo.opravnenia = upravovana.opravnenia;
      if (upravovana.id) {
        await rolyApi.uprav(upravovana.id, telo);
        uspech('Rola bola uložená');
      } else {
        await rolyApi.vytvor(telo);
        uspech('Rola bola vytvorená');
      }
      setUpravovana(null);
      roly.obnov();
      onZmena?.();
    } catch (e: any) {
      hlasChybu(e?.message || 'Rolu sa nepodarilo uložiť');
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async (r: RolaSOpravneniami) => {
    if (!window.confirm(`Zmazať rolu ${r.nazov}?`)) return;
    try {
      await rolyApi.zmaz(r.id);
      uspech('Rola bola zmazaná');
      roly.obnov();
      onZmena?.();
    } catch (e: any) {
      hlasChybu(e?.message || 'Rolu sa nepodarilo zmazať');
    }
  };

  if (roly.chyba) return <ErrorState sprava="Roly sa nepodarilo načítať" detail={roly.chyba} onSkusZnova={roly.obnov} />;
  if (roly.nacitava && !roly.data) return <Skeleton riadkov={6} />;

  return (
    <>
      <div className="cw-roly__lista">
        <p>
          Rola určuje, ktoré sekcie administrácie človek vidí, upravuje a maže. Systémové roly sa nedajú zmazať,
          ich oprávnenia (okrem Správcu) sa však dajú upraviť.
        </p>
        {smieUpravovat && (
          <Button ikona={<Icon nazov="plus" velkost={15} />} onClick={() => otvor()}>
            Nová rola
          </Button>
        )}
      </div>

      <div className="cw-roly__mriezka">
        {zoznam.map((r) => (
          <div key={r.id} className="cw-roly__karta">
            <div className="cw-roly__hlava">
              <strong>{r.nazov}</strong>
              {r.je_systemova && <Badge>Systémová</Badge>}
            </div>
            {r.popis && <p className="cw-roly__popis">{r.popis}</p>}
            <p className="cw-roly__suhrn">{suhrnPrav(r, moduly)}</p>
            <div className="cw-roly__pata">
              <span>{r.pocet_pouzivatelov ?? 0} používateľov</span>
              <div>
                <Button velkost="sm" variant="secondary" onClick={() => otvor(r)}>
                  {smieUpravovat ? 'Upraviť' : 'Zobraziť'}
                </Button>
                {smieUpravovat && !r.je_systemova && (
                  <Button velkost="sm" variant="ghost" onClick={() => zmaz(r)} aria-label={`Zmazať rolu ${r.nazov}`}>
                    <Icon nazov="zmazat" velkost={14} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        otvorene={upravovana !== null}
        onZavri={() => setUpravovana(null)}
        nadpis={upravovana?.id ? `Rola ${upravovana.nazov}` : 'Nová rola'}
        sirka="lg"
        pata={
          <>
            <Button variant="secondary" onClick={() => setUpravovana(null)} disabled={uklada}>
              {smieUpravovat ? 'Zrušiť' : 'Zavrieť'}
            </Button>
            {smieUpravovat && (
              <Button onClick={uloz} nacitava={uklada}>
                {upravovana?.id ? 'Uložiť rolu' : 'Vytvoriť rolu'}
              </Button>
            )}
          </>
        }
      >
        {upravovana && (
          <>
            <div className="cw-roly__polia">
              <Input
                menovka="Názov roly"
                value={upravovana.nazov}
                onChange={(e) => setUpravovana({ ...upravovana, nazov: e.target.value })}
                placeholder="Tréner mládeže"
                disabled={!smieUpravovat}
                povinne
              />
              <Textarea
                menovka="Popis"
                value={upravovana.popis}
                onChange={(e) => setUpravovana({ ...upravovana, popis: e.target.value })}
                rows={2}
                disabled={!smieUpravovat}
              />
            </div>
            {jeSpravca && (
              <p className="cw-roly__poznamka">Správca má vždy plný prístup - je to poistka proti zamknutiu sa mimo administrácie.</p>
            )}
            <div className="cw-roly__tabulka">
              <table>
                <thead>
                  <tr>
                    <th>Sekcia</th>
                    {AKCIE.map((a) => (
                      <th key={a.kluc}>
                        {a.popis}
                        {smieUpravovat && !jeSpravca && (
                          <span className="cw-roly__vsetko">
                            <button type="button" onClick={() => celyStlpec(a.kluc, true)} aria-label={`${a.popis} - všetko`}>
                              všetko
                            </button>
                            <button type="button" onClick={() => celyStlpec(a.kluc, false)} aria-label={`${a.popis} - nič`}>
                              nič
                            </button>
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {moduly.map((m) => (
                    <tr key={m}>
                      <td>{NAZVY_MODULOV[m] ?? m}</td>
                      {AKCIE.map((a) => (
                        <td key={a.kluc}>
                          <input
                            type="checkbox"
                            checked={jeSpravca || Boolean(upravovana.opravnenia[m]?.[a.kluc])}
                            disabled={!smieUpravovat || jeSpravca}
                            onChange={(e) =>
                              setUpravovana({ ...upravovana, opravnenia: nastavPravo(upravovana.opravnenia, m, a.kluc, e.target.checked) })
                            }
                            aria-label={`${NAZVY_MODULOV[m] ?? m}: ${a.popis}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal>
    </>
  );
};

export default RolyOpravnenia;
