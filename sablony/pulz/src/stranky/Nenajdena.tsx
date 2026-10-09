// Umiestnenie: sablony/pulz/src/stranky/Nenajdena.tsx
// Stránka nenájdená. Najprv sa skúsi presmerovanie starého odkazu
// (Presmerovania v administrácii), až potom sa ukáže oznámenie
// v tmavej hlavičke s veľkým červeným 404.

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { skusPresmerovat } from '@clubw/jadro';
import { Nacitava } from '../casti';
import { Ikona, useTitulok } from '../spolocne';

/** Oznámenie „nenájdené" - použijú ho aj detaily (článok, hráč...), keď záznam neexistuje. */
export const NenajdenyObsah: React.FC<{ nadpis?: string; text?: string; spat?: { odkaz: string; text: string } }> = ({
  nadpis = 'Túto stránku sme nenašli',
  text = 'Odkaz je možno starý alebo stránka bola presunutá. Skúste začať na úvodnej stránke.',
  spat,
}) => {
  useTitulok('Stránka nenájdená');
  return (
    <div className="pz-stranka">
      <header className="pz-hlava pz-nenajdena">
        <div className="pz-kontajner">
          <span className="pz-nenajdena__kod" aria-hidden="true">
            404
          </span>
          <span className="pz-hlava__stitok">Nenájdené</span>
          <h1>{nadpis}</h1>
          <p className="pz-hlava__popis">{text}</p>
          <div className="pz-nenajdena__akcie">
            <Link to="/" className="pz-tlacidlo pz-tlacidlo--akcent">
              Na úvodnú stránku
            </Link>
            {spat && (
              <Link to={spat.odkaz} className="pz-tlacidlo pz-tlacidlo--obrys-svetle">
                <Ikona nazov="vlavo" velkost={14} />
                {spat.text}
              </Link>
            )}
          </div>
        </div>
      </header>
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
