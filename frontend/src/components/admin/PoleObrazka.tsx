// Umiestnenie: frontend/src/components/admin/PoleObrazka.tsx
// Pole formulára pre jeden obrázok - fotka hráča, logo tímu, fotka štadióna.
//
// Predtým sa do týchto polí písala cesta k súboru ručne
// („/uploads/images/players/…"), čo bežný redaktor nevedel použiť.
// Tu sa obrázok nahrá do Media knižnice alebo sa vyberie už nahratý.

import React, { useRef, useState } from 'react';
import { Button, Icon, useToast } from '../../ui';
import { mediaApi } from '../../api/media';
import { souborUrl } from '../../config/api';
import { VyberZKniznice } from './VyberZKniznice';
import './PoleObrazka.css';

interface Props {
  menovka: string;
  /** Uložená cesta (/uploads/...) alebo úplná adresa; null = bez obrázka */
  hodnota: string | null | undefined;
  onZmena: (cesta: string | null) => void;
  napoveda?: string;
  /** Tvar náhľadu - okrúhly pre portréty, štvorcový pre logá */
  tvar?: 'kruh' | 'stvorec' | 'siroky';
}

export const PoleObrazka: React.FC<Props> = ({ menovka, hodnota, onZmena, napoveda, tvar = 'stvorec' }) => {
  const { chyba: hlasChybu } = useToast();
  const vstup = useRef<HTMLInputElement>(null);
  const [nahrava, setNahrava] = useState(false);
  const [kniznica, setKniznica] = useState(false);

  const nahraj = async (subor: File | undefined) => {
    if (!subor) return;
    if (!subor.type.startsWith('image/')) {
      hlasChybu('Vyberte obrázok (JPG, PNG, WebP)');
      return;
    }
    setNahrava(true);
    try {
      const [ulozeny] = await mediaApi.nahraj([subor]);
      if (ulozeny?.cesta) onZmena(ulozeny.cesta);
    } catch (e: any) {
      hlasChybu(e?.message || 'Obrázok sa nepodarilo nahrať');
    } finally {
      setNahrava(false);
      if (vstup.current) vstup.current.value = '';
    }
  };

  return (
    <div className="cw-field cw-pole-obr">
      <span className="cw-field__label">{menovka}</span>

      <div className="cw-pole-obr__riadok">
        <div className={`cw-pole-obr__nahlad cw-pole-obr__nahlad--${tvar}`}>
          {hodnota ? (
            <img src={souborUrl(hodnota)} alt="" />
          ) : (
            <Icon nazov="galerie" velkost={24} />
          )}
        </div>

        <div className="cw-pole-obr__akcie">
          <Button
            variant="secondary"
            velkost="sm"
            nacitava={nahrava}
            ikona={<Icon nazov="nahrat" velkost={14} />}
            onClick={() => vstup.current?.click()}
          >
            Nahrať
          </Button>
          <Button variant="secondary" velkost="sm" onClick={() => setKniznica(true)}>
            Z knižnice
          </Button>
          {hodnota && (
            <Button variant="ghost" velkost="sm" onClick={() => onZmena(null)}>
              Odstrániť
            </Button>
          )}
          <input
            ref={vstup}
            type="file"
            accept="image/*"
            hidden
            aria-label={`Nahrať: ${menovka}`}
            onChange={(e) => nahraj(e.target.files?.[0])}
          />
        </div>
      </div>

      {napoveda && <div className="cw-field__hint">{napoveda}</div>}

      <VyberZKniznice
        otvorene={kniznica}
        onZavri={() => setKniznica(false)}
        nadpis={menovka}
        onVyber={(subory) => {
          if (subory[0]) onZmena(subory[0].cesta);
          setKniznica(false);
        }}
      />
    </div>
  );
};

export default PoleObrazka;
