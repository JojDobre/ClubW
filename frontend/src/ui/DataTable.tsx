// Umiestnenie: frontend/src/ui/DataTable.tsx
// Univerzálna dátová tabuľka administrácie.
//
// Použije ju šesť obrazoviek (články, tímy, hráči, ligy, zápasy,
// používatelia), preto rieši všetko, čo tabuľka v administrácii potrebuje:
// vyhľadávanie, filtre, zoradenie, výber riadkov s hromadnými akciami,
// stránkovanie, akcie v riadku a stavy načítavania, prázdna, chyby.
//
// PREČO GENERICKÁ: bez toho by každá obrazovka mala vlastnú tabuľku
// s vlastnými chybami. Pôvodná administrácia mala tri rôzne implementácie
// zoznamu a v každej sa výber riadkov správal inak.
//
// Na mobile sa tabuľka mení na karty — vodorovné posúvanie stĺpcov
// je na telefóne nepoužiteľné.

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Button from './Button';
import { Input, Select } from './Field';
import { Badge, Skeleton, EmptyState, ErrorState } from './Feedback';
import Icon from './Icon';
import './DataTable.css';

// ===== Popis stĺpca =====

export interface Stlpec<T> {
  /** Kľúč stĺpca — musí byť jedinečný v rámci tabuľky */
  kluc: string;
  /** Text v hlavičke */
  popis: string;
  /** Vykreslenie obsahu bunky */
  obsah: (zaznam: T) => React.ReactNode;
  /**
   * Hodnota na zoradenie. Ak chýba, stĺpec sa nedá zoradiť.
   * Vracia reťazec alebo číslo — nie React prvok.
   */
  hodnotaNaZoradenie?: (zaznam: T) => string | number | null;
  /** Šírka stĺpca, napríklad '180px' alebo '20%' */
  sirka?: string;
  /** Zarovnanie obsahu */
  zarovnanie?: 'left' | 'center' | 'right';
  /** Na mobile sa stĺpec nezobrazí ako riadok karty */
  skryTNaMobile?: boolean;
}

// ===== Filter =====

export interface Filter {
  kluc: string;
  popis: string
  moznosti: Array<{ hodnota: string; popis: string }>;
}

// ===== Akcia v riadku =====

export interface AkciaRiadku<T> {
  popis: string;
  ikona?: string;
  /** true = akcia je nezvratná, zobrazí sa červeno */
  nebezpecna?: boolean;
  onKlik: (zaznam: T) => void;
  /** Skryje akciu pri konkrétnom záznamu */
  zobrazit?: (zaznam: T) => boolean;
}

// ===== Hromadná akcia =====

export interface HromadnaAkcia {
  popis: string;
  ikona?: string;
  nebezpecna?: boolean;
  onKlik: (vybraneId: number[]) => void;
}

interface DataTableProps<T> {
  /** Zoznam záznamov */
  data: T[];
  stlpce: Stlpec<T>[];
  /** Funkcia vracajúca jedinečný identifikátor záznamu */
  idZaznamu: (zaznam: T) => number;

  nacitava?: boolean;
  chyba?: string | null;
  onSkusZnova?: () => void;

  /** Zapne vyhľadávacie pole. Funkcia vracia text, v ktorom sa hľadá. */
  hladatV?: (zaznam: T) => string;
  hladatPlaceholder?: string;

  filtre?: Filter[];
  /** Vyhodnotenie filtra — vracia true, ak záznam prejde */
  filtrujZaznam?: (zaznam: T, kluc: string, hodnota: string) => boolean;

  akcieRiadku?: AkciaRiadku<T>[];
  hromadneAkcie?: HromadnaAkcia[];

  /** Počet záznamov na stránku. 0 = bez stránkovania. */
  naStranu?: number;

  /** Kliknutie na riadok — napríklad otvorenie detailu */
  onKlikNaRiadok?: (zaznam: T) => void;

  /** Obsah prázdneho stavu */
  prazdnyNadpis?: string;
  prazdnyPopis?: string;
  prazdnaAkcia?: React.ReactNode;
}

const PREDVOLENE_NA_STRANU = 20;

export function DataTable<T>({
  data,
  stlpce,
  idZaznamu,
  nacitava = false,
  chyba = null,
  onSkusZnova,
  hladatV,
  hladatPlaceholder = 'Hľadať…',
  filtre = [],
  filtrujZaznam,
  akcieRiadku = [],
  hromadneAkcie = [],
  naStranu = PREDVOLENE_NA_STRANU,
  onKlikNaRiadok,
  prazdnyNadpis = 'Nič sme nenašli',
  prazdnyPopis,
  prazdnaAkcia,
}: DataTableProps<T>) {
  const [hladanie, setHladanie] = useState('');
  const [aktivneFiltre, setAktivneFiltre] = useState<Record<string, string>>({});
  const [zoradenie, setZoradenie] = useState<{ kluc: string; smer: 'asc' | 'desc' } | null>(null);
  const [vybrane, setVybrane] = useState<Set<number>>(new Set());
  const [stranka, setStranka] = useState(1);
  const [otvorenaPonuka, setOtvorenaPonuka] = useState<number | null>(null);

  const ponukaRef = useRef<HTMLDivElement>(null);

  // ===== Filtrovanie a zoradenie =====

  const spracovaneData = useMemo(() => {
    let vysledok = [...data];

    // Vyhľadávanie — bez diakritiky a bez ohľadu na veľkosť písmen,
    // aby „zilina" našlo aj „Žilina"
    if (hladanie.trim() && hladatV) {
      const hladane = hladanie
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

      vysledok = vysledok.filter((z) =>
        hladatV(z)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .includes(hladane)
      );
    }

    // Filtre
    if (filtrujZaznam) {
      for (const [kluc, hodnota] of Object.entries(aktivneFiltre)) {
        if (!hodnota) continue;
        vysledok = vysledok.filter((z) => filtrujZaznam(z, kluc, hodnota));
      }
    }

    // Zoradenie
    if (zoradenie) {
      const stlpec = stlpce.find((s) => s.kluc === zoradenie.kluc);
      if (stlpec?.hodnotaNaZoradenie) {
        const nasobitel = zoradenie.smer === 'asc' ? 1 : -1;

        vysledok.sort((a, b) => {
          const ha = stlpec.hodnotaNaZoradenie!(a);
          const hb = stlpec.hodnotaNaZoradenie!(b);

          // Prázdne hodnoty idú vždy na konec, nezávisle od smeru
          if (ha === null || ha === undefined) return 1;
          if (hb === null || hb === undefined) return -1;

          if (typeof ha === 'number' && typeof hb === 'number') {
            return (ha - hb) * nasobitel;
          }

          // localeCompare zoradí slovenské znaky správne (č za c, š za s)
          return String(ha).localeCompare(String(hb), 'sk') * nasobitel;
        });
      }
    }

    return vysledok;
  }, [data, hladanie, hladatV, aktivneFiltre, filtrujZaznam, zoradenie, stlpce]);

  // ===== Stránkovanie =====

  const pocetStran = naStranu > 0 ? Math.max(1, Math.ceil(spracovaneData.length / naStranu)) : 1;

  // Po zmene filtra sa počet stránok zmenší — musíme sa vrátiť na platnú
  useEffect(() => {
    if (stranka > pocetStran) setStranka(1);
  }, [stranka, pocetStran]);

  const zobrazeneData = useMemo(() => {
    if (naStranu <= 0) return spracovaneData;
    const od = (stranka - 1) * naStranu;
    return spracovaneData.slice(od, od + naStranu);
  }, [spracovaneData, stranka, naStranu]);

  // ===== Výber riadkov =====

  const idZobrazenych = useMemo(
    () => zobrazeneData.map(idZaznamu),
    [zobrazeneData, idZaznamu]
  );

  const vsetkyVybrane =
    idZobrazenych.length > 0 && idZobrazenych.every((id) => vybrane.has(id));

  const prepniVsetky = useCallback(() => {
    setVybrane((doterajsie) => {
      const nove = new Set(doterajsie);
      if (vsetkyVybrane) {
        idZobrazenych.forEach((id) => nove.delete(id));
      } else {
        idZobrazenych.forEach((id) => nove.add(id));
      }
      return nove;
    });
  }, [vsetkyVybrane, idZobrazenych]);

  const prepniJeden = useCallback((id: number) => {
    setVybrane((doterajsie) => {
      const nove = new Set(doterajsie);
      nove.has(id) ? nove.delete(id) : nove.add(id);
      return nove;
    });
  }, []);

  // ===== Zoradenie kliknutím na hlavičku =====

  const prepniZoradenie = (kluc: string) => {
    setZoradenie((doterajsie) => {
      if (doterajsie?.kluc !== kluc) return { kluc, smer: 'asc' };
      // Tretie kliknutie zoradenie zruší
      if (doterajsie.smer === 'asc') return { kluc, smer: 'desc' };
      return null;
    });
  };

  // Zatvorenie ponuky akcií pri kliknutí inam
  useEffect(() => {
    if (otvorenaPonuka === null) return;

    const naKlik = (e: MouseEvent) => {
      if (ponukaRef.current && !ponukaRef.current.contains(e.target as Node)) {
        setOtvorenaPonuka(null);
      }
    };
    const naKlaves = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOtvorenaPonuka(null);
    };

    document.addEventListener('mousedown', naKlik);
    document.addEventListener('keydown', naKlaves);
    return () => {
      document.removeEventListener('mousedown', naKlik);
      document.removeEventListener('keydown', naKlaves);
    };
  }, [otvorenaPonuka]);

  const jeFiltrovane = Boolean(hladanie.trim()) || Object.values(aktivneFiltre).some(Boolean);

  const vycistiFiltre = () => {
    setHladanie('');
    setAktivneFiltre({});
    setStranka(1);
  };

  // ===== Vykreslenie =====

  if (chyba) {
    return <ErrorState sprava="Údaje sa nepodarilo načítať" detail={chyba} onSkusZnova={onSkusZnova} />;
  }

  return (
    <div className="cw-dt">
      {/* ===== Panel nástrojov ===== */}
      {(hladatV || filtre.length > 0) && (
        <div className="cw-dt__toolbar">
          {hladatV && (
            <div className="cw-dt__search">
              <Input
                value={hladanie}
                onChange={(e) => {
                  setHladanie(e.target.value);
                  setStranka(1);
                }}
                placeholder={hladatPlaceholder}
                ikona={<Icon nazov="hladat" velkost={15} />}
                aria-label="Hľadať v tabuľke"
              />
            </div>
          )}

          {filtre.map((f) => (
            <div key={f.kluc} className="cw-dt__filter">
              <Select
                value={aktivneFiltre[f.kluc] || ''}
                onChange={(e) => {
                  setAktivneFiltre((doterajsie) => ({ ...doterajsie, [f.kluc]: e.target.value }));
                  setStranka(1);
                }}
                prazdna={f.popis}
                moznosti={f.moznosti.map((m) => ({ hodnota: m.hodnota, popis: m.popis }))}
                aria-label={f.popis}
              />
            </div>
          ))}

          {jeFiltrovane && (
            <Button variant="ghost" velkost="sm" onClick={vycistiFiltre}>
              Vymazať filter
            </Button>
          )}
        </div>
      )}

      {/* ===== Lišta hromadných akcií ===== */}
      {vybrane.size > 0 && hromadneAkcie.length > 0 && (
        <div className="cw-dt__bulk">
          <span className="cw-dt__bulk-count">
            {vybrane.size}{' '}
            {vybrane.size === 1 ? 'označený' : vybrane.size < 5 ? 'označené' : 'označených'}
          </span>

          <div className="cw-dt__bulk-actions">
            {hromadneAkcie.map((a) => (
              <Button
                key={a.popis}
                velkost="sm"
                variant={a.nebezpecna ? 'danger' : 'secondary'}
                ikona={a.ikona ? <Icon nazov={a.ikona} velkost={14} /> : undefined}
                onClick={() => {
                  a.onKlik(Array.from(vybrane));
                  setVybrane(new Set());
                }}
              >
                {a.popis}
              </Button>
            ))}
            <Button variant="ghost" velkost="sm" onClick={() => setVybrane(new Set())}>
              Zrušiť výber
            </Button>
          </div>
        </div>
      )}

      {/* ===== Načítavanie ===== */}
      {nacitava && (
        <div className="cw-dt__loading">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="cw-dt__loading-row">
              <Skeleton vyska="16px" />
            </div>
          ))}
        </div>
      )}

      {/* ===== Prázdny stav ===== */}
      {!nacitava && zobrazeneData.length === 0 && (
        <EmptyState
          ikona={<Icon nazov={jeFiltrovane ? 'hladat' : 'clanky'} velkost={38} />}
          nadpis={jeFiltrovane ? 'Nič sme nenašli' : prazdnyNadpis}
          popis={
            jeFiltrovane
              ? 'Skúste zmeniť hľadaný text alebo zrušiť filtre.'
              : prazdnyPopis
          }
          akcia={
            jeFiltrovane ? (
              <Button variant="secondary" onClick={vycistiFiltre}>
                Vymazať filter
              </Button>
            ) : (
              prazdnaAkcia
            )
          }
        />
      )}

      {/* ===== Tabuľka ===== */}
      {!nacitava && zobrazeneData.length > 0 && (
        <>
          <div className="cw-dt__wrap">
            <table className="cw-dt__table">
              <thead>
                <tr>
                  {hromadneAkcie.length > 0 && (
                    <th className="cw-dt__check-col">
                      <input
                        type="checkbox"
                        checked={vsetkyVybrane}
                        onChange={prepniVsetky}
                        aria-label="Označiť všetky na tejto stránke"
                      />
                    </th>
                  )}

                  {stlpce.map((s) => {
                    const daSaZoradit = Boolean(s.hodnotaNaZoradenie);
                    const aktivne = zoradenie?.kluc === s.kluc;

                    return (
                      <th
                        key={s.kluc}
                        style={{ width: s.sirka, textAlign: s.zarovnanie }}
                        className={daSaZoradit ? 'cw-dt__th--sortable' : undefined}
                        onClick={daSaZoradit ? () => prepniZoradenie(s.kluc) : undefined}
                        // Čítačka obrazovky ohlási smer zoradenia
                        aria-sort={
                          aktivne
                            ? zoradenie!.smer === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : undefined
                        }
                      >
                        <span className="cw-dt__th-inner">
                          {s.popis}
                          {daSaZoradit && (
                            <span className={`cw-dt__sort ${aktivne ? 'is-active' : ''}`}>
                              {aktivne && zoradenie!.smer === 'desc' ? '↓' : '↑'}
                            </span>
                          )}
                        </span>
                      </th>
                    );
                  })}

                  {akcieRiadku.length > 0 && <th className="cw-dt__actions-col" />}
                </tr>
              </thead>

              <tbody>
                {zobrazeneData.map((zaznam) => {
                  const id = idZaznamu(zaznam);
                  const jeVybrany = vybrane.has(id);

                  return (
                    <tr
                      key={id}
                      className={[
                        jeVybrany ? 'is-selected' : '',
                        onKlikNaRiadok ? 'is-clickable' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={onKlikNaRiadok ? () => onKlikNaRiadok(zaznam) : undefined}
                    >
                      {hromadneAkcie.length > 0 && (
                        <td
                          className="cw-dt__check-col"
                          // Kliknutie na políčko nesmie otvoriť detail riadku
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={jeVybrany}
                            onChange={() => prepniJeden(id)}
                            aria-label="Označiť riadok"
                          />
                        </td>
                      )}

                      {stlpce.map((s) => (
                        <td key={s.kluc} style={{ textAlign: s.zarovnanie }}>
                          {s.obsah(zaznam)}
                        </td>
                      ))}

                      {akcieRiadku.length > 0 && (
                        <td className="cw-dt__actions-col" onClick={(e) => e.stopPropagation()}>
                          <div className="cw-dt__row-actions" ref={otvorenaPonuka === id ? ponukaRef : undefined}>
                            <button
                              className="cw-dt__more"
                              onClick={() => setOtvorenaPonuka(otvorenaPonuka === id ? null : id)}
                              aria-label="Ďalšie akcie"
                              aria-expanded={otvorenaPonuka === id}
                            >
                              <Icon nazov="viac" velkost={16} />
                            </button>

                            {otvorenaPonuka === id && (
                              <div className="cw-dt__menu" role="menu">
                                {akcieRiadku
                                  .filter((a) => !a.zobrazit || a.zobrazit(zaznam))
                                  .map((a) => (
                                    <button
                                      key={a.popis}
                                      role="menuitem"
                                      className={`cw-dt__menu-item ${a.nebezpecna ? 'is-danger' : ''}`}
                                      onClick={() => {
                                        setOtvorenaPonuka(null);
                                        a.onKlik(zaznam);
                                      }}
                                    >
                                      {a.ikona && <Icon nazov={a.ikona} velkost={15} />}
                                      {a.popis}
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ===== Karty pre mobil ===== */}
          <div className="cw-dt__cards">
            {zobrazeneData.map((zaznam) => {
              const id = idZaznamu(zaznam);

              return (
                <div
                  key={id}
                  className={`cw-dt__card ${vybrane.has(id) ? 'is-selected' : ''}`}
                  onClick={onKlikNaRiadok ? () => onKlikNaRiadok(zaznam) : undefined}
                >
                  {hromadneAkcie.length > 0 && (
                    <div className="cw-dt__card-check" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={vybrane.has(id)}
                        onChange={() => prepniJeden(id)}
                        aria-label="Označiť záznam"
                      />
                    </div>
                  )}

                  {stlpce
                    .filter((s) => !s.skryTNaMobile)
                    .map((s, index) => (
                      <div key={s.kluc} className="cw-dt__card-row">
                        {/* Prvý stĺpec je nadpis karty, ostatné majú menovku */}
                        {index > 0 && <span className="cw-dt__card-label">{s.popis}</span>}
                        <span className={index === 0 ? 'cw-dt__card-title' : 'cw-dt__card-value'}>
                          {s.obsah(zaznam)}
                        </span>
                      </div>
                    ))}

                  {akcieRiadku.length > 0 && (
                    <div className="cw-dt__card-actions" onClick={(e) => e.stopPropagation()}>
                      {akcieRiadku
                        .filter((a) => !a.zobrazit || a.zobrazit(zaznam))
                        .map((a) => (
                          <Button
                            key={a.popis}
                            velkost="sm"
                            variant={a.nebezpecna ? 'danger' : 'secondary'}
                            ikona={a.ikona ? <Icon nazov={a.ikona} velkost={14} /> : undefined}
                            onClick={() => a.onKlik(zaznam)}
                          >
                            {a.popis}
                          </Button>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ===== Stránkovanie ===== */}
          {naStranu > 0 && spracovaneData.length > naStranu && (
            <div className="cw-dt__pager">
              <span className="cw-dt__pager-info">
                {(stranka - 1) * naStranu + 1}–
                {Math.min(stranka * naStranu, spracovaneData.length)} z {spracovaneData.length}
              </span>

              <div className="cw-dt__pager-btns">
                <Button
                  variant="secondary"
                  velkost="sm"
                  disabled={stranka === 1}
                  onClick={() => setStranka((s) => s - 1)}
                >
                  Predošlá
                </Button>
                <span className="cw-dt__pager-page">
                  {stranka} / {pocetStran}
                </span>
                <Button
                  variant="secondary"
                  velkost="sm"
                  disabled={stranka === pocetStran}
                  onClick={() => setStranka((s) => s + 1)}
                >
                  Ďalšia
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DataTable;
