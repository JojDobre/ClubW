// Umiestnenie: frontend/src/components/admin/VyberZKniznice.tsx
// Okno na výber obrázkov z Media knižnice.
//
// Požiadavka hovorí „môžem vybrať aj existujúci obrázok" - fotka nahratá
// raz (k článku, do inej galérie) sa tak dá použiť znova bez opätovného
// nahrávania. Okno je spoločné, aby ho mohli použiť aj ďalšie obrazovky.

import React, { useEffect, useState } from 'react';
import { Modal, Button, Input, Icon, Skeleton, EmptyState } from '../../ui';
import { mediaApi } from '../../api/media';
import { souborUrl } from '../../config/api';
import type { MediaSubor } from '../../api/typy';
import { tr } from '../../i18n';
import './VyberZKniznice.css';

interface Props {
  otvorene: boolean;
  onZavri: () => void;
  /** Vybrané súbory - pri jednom výbere pole s jedným prvkom. */
  onVyber: (subory: MediaSubor[]) => void | Promise<void>;
  /** Dovoliť vybrať viac obrázkov naraz (galéria). */
  viac?: boolean;
  nadpis?: string;
}

export const VyberZKniznice: React.FC<Props> = ({
  otvorene, onZavri, onVyber, viac = false, nadpis = tr('Vybrať z knižnice'),
}) => {
  const [hladat, setHladat] = useState('');
  const [subory, setSubory] = useState<MediaSubor[]>([]);
  const [nacitava, setNacitava] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [vybrane, setVybrane] = useState<number[]>([]);
  const [potvrdzuje, setPotvrdzuje] = useState(false);

  // Pri otvorení a pri zmene hľadania načítame obrázky (s malým oneskorením,
  // aby sa pri písaní neposielala požiadavka po každom písmene)
  useEffect(() => {
    if (!otvorene) return;
    const ovladac = new AbortController();
    const casovac = setTimeout(async () => {
      setNacitava(true);
      setChyba(null);
      try {
        const { polozky } = await mediaApi.vypis(
          { typ: 'obrazok', hladat: hladat.trim() || undefined, limit: 120 },
          ovladac.signal
        );
        setSubory(polozky);
      } catch (e: any) {
        if (e?.name !== 'AbortError') setChyba(e?.message || tr('Knižnicu sa nepodarilo načítať'));
      } finally {
        setNacitava(false);
      }
    }, 250);
    return () => {
      clearTimeout(casovac);
      ovladac.abort();
    };
  }, [otvorene, hladat]);

  // Pri zatvorení výber vymažeme
  useEffect(() => {
    if (!otvorene) {
      setVybrane([]);
      setHladat('');
    }
  }, [otvorene]);

  const prepni = (id: number) =>
    setVybrane((v) =>
      viac ? (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]) : v.includes(id) ? [] : [id]
    );

  const potvrd = async () => {
    const vyber = subory.filter((s) => vybrane.includes(s.id));
    if (vyber.length === 0) return;
    setPotvrdzuje(true);
    try {
      await onVyber(vyber);
    } finally {
      setPotvrdzuje(false);
    }
  };

  return (
    <Modal
      otvorene={otvorene}
      onZavri={onZavri}
      nadpis={nadpis}
      sirka="lg"
      pata={
        <>
          <span className="cw-kniznica__pocet">
            {vybrane.length > 0 ? tr('Vybrané: {length}', { length: vybrane.length }) : ''}
          </span>
          <Button variant="secondary" onClick={onZavri} disabled={potvrdzuje}>
            {tr('Zrušiť')}
          </Button>
          <Button onClick={potvrd} disabled={vybrane.length === 0} nacitava={potvrdzuje}>
            {viac ? tr('Pridať vybrané') : tr('Použiť obrázok')}
          </Button>
        </>
      }
    >
      <Input
        value={hladat}
        onChange={(e) => setHladat(e.target.value)}
        placeholder={tr('Hľadať podľa názvu…')}
        ikona={<Icon nazov="hladat" velkost={15} />}
        aria-label={tr('Hľadať v knižnici')}
      />

      {chyba ? (
        <p className="cw-kniznica__chyba">{chyba}</p>
      ) : nacitava && subory.length === 0 ? (
        <div className="cw-kniznica__mriezka">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} vyska="110px" />
          ))}
        </div>
      ) : subory.length === 0 ? (
        <EmptyState
          ikona={<Icon nazov="galerie" velkost={36} />}
          nadpis={hladat ? tr('Nič sme nenašli') : tr('Knižnica je prázdna')}
          popis={hladat ? tr('Skúste iný hľadaný text.') : tr('Obrázky sa sem dostanú nahratím k článku alebo do galérie.')}
        />
      ) : (
        <div className="cw-kniznica__mriezka" role="listbox" aria-multiselectable={viac}>
          {subory.map((s) => {
            const jeVybrany = vybrane.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={jeVybrany}
                className={`cw-kniznica__polozka${jeVybrany ? ' is-vybrana' : ''}`}
                onClick={() => prepni(s.id)}
                title={s.nazov}
              >
                <img src={souborUrl(s.cesta)} alt={s.alt_text || s.nazov} loading="lazy" />
                {jeVybrany && <span className="cw-kniznica__znacka">✓</span>}
                <span className="cw-kniznica__nazov">{s.nazov}</span>
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
};

export default VyberZKniznice;
