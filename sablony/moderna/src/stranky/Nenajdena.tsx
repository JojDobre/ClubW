// Umiestnenie: sablony/moderna/src/stranky/Nenajdena.tsx
// Stránka nenájdená. Najprv sa skúsi presmerovanie starého odkazu
// (Presmerovania v administrácii), až potom sa ukáže oznámenie.

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { skusPresmerovat } from '@clubw/jadro';
import { Nacitava, useTitulok } from '../spolocne';

/** Oznámenie „nenájdené" - použijú ho aj detaily (článok, hráč...), keď záznam neexistuje. */
export const NenajdenyObsah: React.FC<{ nadpis?: string; text?: string; spat?: { odkaz: string; text: string } }> = ({
  nadpis = 'Túto stránku sme nenašli.',
  text = 'Odkaz je možno starý alebo stránka bola presunutá. Skúste začať na úvode alebo použite vyhľadávanie.',
  spat,
}) => {
  useTitulok('Stránka nenájdená');
  return (
    <div className="md-nenajdena md-kontajner">
      <span className="md-nenajdena__kod" aria-hidden="true">
        404
      </span>
      <div className="md-stitok">Nenájdené</div>
      <h1>{nadpis}</h1>
      <p>{text}</p>
      <div className="md-nenajdena__akcie">
        <Link to="/" className="md-tlacidlo md-tlacidlo--primarne">
          Na úvodnú stránku
        </Link>
        {spat && (
          <Link to={spat.odkaz} className="md-tlacidlo md-tlacidlo--sekundarne">
            {spat.text}
          </Link>
        )}
      </div>
    </div>
  );
};

const Nenajdena: React.FC = () => {
  const [overuje, setOveruje] = useState(true);

  useEffect(() => {
    let zruseny = false;
    void skusPresmerovat().then((presmeruje) => !presmeruje && !zruseny && setOveruje(false));
    return () => {
      zruseny = true;
    };
  }, []);

  return overuje ? <Nacitava /> : <NenajdenyObsah />;
};

export default Nenajdena;
