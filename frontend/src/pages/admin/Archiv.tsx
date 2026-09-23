// Umiestnenie: frontend/src/pages/admin/Archiv.tsx
// Archív - archivované tímy, hráči, realizačný tím, ligy, štadióny a sezóny.
//
// Mazanie týchto záznamov je mäkké: záznam zmizne z webu aj zo zoznamov,
// ale história (zápasy, súpisky, štatistiky) zostáva. Tu sa dá obnoviť.

import React, { useMemo, useState } from 'react';
import {
  PageHeader, Button, Badge, Icon, Input, FilterChips,
  Skeleton, EmptyState, ErrorState, ConfirmDialog, useToast, type Chip,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { useAuth } from '../../app/AuthContext';
import { archivApi } from '../../api/sport';
import { formatujDatum } from '../../utils/datum';
import type { PolozkaArchivu, TypArchivu } from '../../api/typy';
import './Archiv.css';

const TYPY: Array<{ hodnota: TypArchivu; popis: string }> = [
  { hodnota: 'sezony', popis: 'Sezóny' },
  { hodnota: 'timy', popis: 'Tímy' },
  { hodnota: 'hraci', popis: 'Hráči' },
  { hodnota: 'realizacny-tim', popis: 'Realizačný tím' },
  { hodnota: 'stadiony', popis: 'Štadióny' },
  { hodnota: 'ligy', popis: 'Ligy' },
  { hodnota: 'turnaje', popis: 'Turnaje' },
];

export const Archiv: React.FC = () => {
  const { uspech, chyba: hlasChybu } = useToast();
  const { pouzivatel } = useAuth();
  const jeAdmin = pouzivatel?.rola === 'admin';

  const [filter, setFilter] = useState('');
  const [hladat, setHladat] = useState('');
  const [spracuva, setSpracuva] = useState<string | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<PolozkaArchivu | null>(null);

  const archiv = useNacitanie((signal) => archivApi.vypis(signal));
  const vsetky = archiv.data ?? [];

  const chipy: Chip[] = useMemo(
    () => [
      { hodnota: '', popis: 'Všetko', pocet: vsetky.length },
      ...TYPY.map((t) => ({ hodnota: t.hodnota, popis: t.popis, pocet: vsetky.filter((p) => p.typ === t.hodnota).length }))
        .filter((c) => c.pocet > 0),
    ],
    [vsetky]
  );

  const zoznam = vsetky.filter(
    (p) =>
      (!filter || p.typ === filter) &&
      (!hladat.trim() || p.nazov.toLowerCase().includes(hladat.trim().toLowerCase()))
  );

  const kluc = (p: PolozkaArchivu) => `${p.typ}-${p.id}`;

  const obnov = async (p: PolozkaArchivu) => {
    setSpracuva(kluc(p));
    try {
      await archivApi.obnov(p.typ, p.id);
      uspech(`${p.typ_nazov} ${p.nazov} bol obnovený`);
      archiv.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Obnovenie sa nepodarilo');
    } finally {
      setSpracuva(null);
    }
  };

  const zmazTrvalo = async () => {
    if (!naZmazanie) return;
    setSpracuva(kluc(naZmazanie));
    try {
      await archivApi.zmazTrvalo(naZmazanie.typ, naZmazanie.id);
      uspech('Záznam bol natrvalo zmazaný');
      setNaZmazanie(null);
      archiv.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || 'Záznam sa nepodarilo zmazať');
    } finally {
      setSpracuva(null);
    }
  };

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis="Archív"
        podnadpis="Archivované záznamy. Nezobrazujú sa na webe, ale história zostáva a dajú sa obnoviť."
      />

      <div className="cw-arch__nastroje">
        <div className="cw-arch__hladat">
          <Input
            value={hladat}
            onChange={(e) => setHladat(e.target.value)}
            placeholder="Hľadať v archíve…"
            ikona={<Icon nazov="hladat" velkost={15} />}
            aria-label="Hľadať v archíve"
          />
        </div>
        {vsetky.length > 0 && (
          <FilterChips moznosti={chipy} zvolena={filter} onZmena={setFilter} popisSkupiny="Typ záznamu" />
        )}
      </div>

      {archiv.chyba ? (
        <ErrorState sprava="Archív sa nepodarilo načítať" detail={archiv.chyba} onSkusZnova={archiv.obnov} />
      ) : archiv.nacitava ? (
        <div className="cw-arch__zoznam">
          <Skeleton riadkov={4} />
        </div>
      ) : zoznam.length === 0 ? (
        <div className="cw-arch__zoznam">
          <EmptyState
            ikona={<Icon nazov="archiv" velkost={40} />}
            nadpis={vsetky.length === 0 ? 'Archív je prázdny' : 'Nič sme nenašli'}
            popis={
              vsetky.length === 0
                ? 'Keď archivujete tím, hráča, štadión či sezónu, nájdete ich tu.'
                : 'Skúste iné hľadanie alebo filter.'
            }
          />
        </div>
      ) : (
        <ul className="cw-arch__zoznam">
          {zoznam.map((p) => (
            <li key={kluc(p)} className="cw-arch__polozka">
              <div className="cw-arch__info">
                <div className="cw-arch__nazov">
                  {p.nazov} <Badge ton="neutral">{p.typ_nazov}</Badge>
                </div>
                <div className="cw-arch__detail">
                  {p.detail && <span>{p.detail}</span>}
                  {p.archivovane && <span>archivované {formatujDatum(p.archivovane)}</span>}
                </div>
              </div>
              <div className="cw-arch__akcie">
                <Button
                  velkost="sm"
                  variant="secondary"
                  ikona={<Icon nazov="obnovit" velkost={14} />}
                  nacitava={spracuva === kluc(p)}
                  onClick={() => obnov(p)}
                >
                  Obnoviť
                </Button>
                {jeAdmin && (
                  <Button
                    velkost="sm"
                    variant="ghost"
                    onClick={() => setNaZmazanie(p)}
                    aria-label={`Natrvalo zmazať ${p.nazov}`}
                    title="Natrvalo zmazať"
                  >
                    <Icon nazov="zmazat" velkost={15} />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis="Natrvalo zmazať?"
        sprava={`${naZmazanie?.typ_nazov} ${naZmazanie?.nazov} bude zmazaný natrvalo a nedá sa obnoviť. Ak na neho odkazujú zápasy alebo súpisky, server zmazanie odmietne.`}
        potvrdit="Zmazať natrvalo"
        nebezpecne
        nacitava={naZmazanie !== null && spracuva === kluc(naZmazanie)}
        onPotvrd={zmazTrvalo}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default Archiv;
