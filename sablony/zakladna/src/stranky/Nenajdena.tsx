// Umiestnenie: sablony/zakladna/src/stranky/Nenajdena.tsx
// Stránka nenájdená - najprv skúsi presmerovanie starého odkazu.

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { skusPresmerovat } from '@clubw/jadro';

const NenajdenaStranka: React.FC = () => {
  const [overuje, setOveruje] = useState(true);

  useEffect(() => {
    void skusPresmerovat().then((presmeruje) => !presmeruje && setOveruje(false));
  }, []);

  if (overuje) {
    return (
      <div className="zk-nacitavanie" role="status">
        <span className="zk-nacitavanie__kruh" aria-hidden="true" />
        Načítavam...
      </div>
    );
  }

  return (
    <div className="zk-stranka zk-nenajdena">
      <span className="zk-nenajdena__kod" aria-hidden="true">
        404
      </span>
      <h1>Stránku sme nenašli</h1>
      <p>Stránka, ktorú hľadáte, neexistuje alebo bola presunutá. Skúste ju vyhľadať alebo pokračujte na úvod.</p>
      <div className="zk-nenajdena__tlacidla">
        <Link to="/" className="zk-tlacidlo">
          Na úvod
        </Link>
        <Link to="/hladat" className="zk-tlacidlo zk-tlacidlo--obrys">
          Hľadať na webe
        </Link>
      </div>
    </div>
  );
};

export default NenajdenaStranka;
