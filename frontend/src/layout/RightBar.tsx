// Umiestnenie: frontend/src/layout/RightBar.tsx
// Pravý panel s nedávnou aktivitou.
//
// Podľa návrhu je administrácia trojstĺpcová: menu, obsah a panel
// s poslednými akciami. Dáta berieme z auditného záznamu — ten
// zaznamenáva prácu s osobnými údajmi a zmeny obsahu.
//
// Panel sa skrýva pod 1280 px, kde už na obsah nezostáva miesto.

import React from 'react';
import { useNacitanie } from '../app/useNacitanie';
import { gdprApi } from '../api/sprava';
import { useAuth } from '../app/AuthContext';
import { Skeleton, Icon } from '../ui';
import './RightBar.css';

/** Slovné popisy akcií z auditu. */
const POPISY_AKCII: Record<string, string> = {
  vytvorenie: 'vytvoril záznam',
  uprava: 'upravil záznam',
  zmazanie: 'zmazal záznam',
  anonymizacia: 'anonymizoval údaje',
  export_udajov: 'exportoval údaje',
  zmena_suhlasu: 'zmenil súhlas',
  prihlasenie: 'sa prihlásil',
  zmena_hesla: 'zmenil heslo',
};

/** Iniciály z e-mailu alebo mena pre koliesko pri zázname. */
const iniciály = (email: string | null): string => {
  if (!email) return 'SY'; // systémová akcia
  const cast = email.split('@')[0];
  const casti = cast.split(/[._-]/).filter(Boolean);
  if (casti.length >= 2) return (casti[0][0] + casti[1][0]).toUpperCase();
  return cast.slice(0, 2).toUpperCase();
};

/** Koľko času uplynulo — „pred 5 min", „pred 2 h". */
const predAko = (kedy: string): string => {
  const rozdiel = Date.now() - new Date(kedy).getTime();
  const minuty = Math.floor(rozdiel / 60_000);

  if (minuty < 1) return 'práve teraz';
  if (minuty < 60) return `pred ${minuty} min`;

  const hodiny = Math.floor(minuty / 60);
  if (hodiny < 24) return `pred ${hodiny} h`;

  const dni = Math.floor(hodiny / 24);
  if (dni === 1) return 'včera';
  if (dni < 7) return `pred ${dni} dňami`;

  return new Date(kedy).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' });
};

export const RightBar: React.FC = () => {
  const { maRolu } = useAuth();

  // Auditný záznam je dostupný len administrátorovi — pri ostatných
  // rolách by volanie skončilo chybou 403
  const jeAdmin = maRolu('admin');

  const aktivita = useNacitanie(
    (signal) => (jeAdmin ? gdprApi.audit({ limit: 12 }, signal) : Promise.resolve([])),
    [jeAdmin]
  );

  // Panel nezobrazujeme nikomu, kto naň nemá právo
  if (!jeAdmin) return null;

  const zaznamy = aktivita.data ?? [];

  return (
    <aside className="cw-rightbar" aria-label="Nedávna aktivita">
      <div className="cw-rightbar__hlava">
        <span className="cw-rightbar__nadpis">Nedávna aktivita</span>
      </div>

      <div className="cw-rightbar__telo">
        {aktivita.nacitava ? (
          <div className="cw-rightbar__nacitava">
            <Skeleton riadkov={5} vyska="14px" />
          </div>
        ) : zaznamy.length === 0 ? (
          <div className="cw-rightbar__prazdne">
            <Icon nazov="hodiny" velkost={22} />
            <span>Zatiaľ žiadna aktivita</span>
          </div>
        ) : (
          zaznamy.map((z) => (
            <div key={z.id} className="cw-rightbar__zaznam">
              <div className="cw-rightbar__znak" aria-hidden="true">
                {iniciály(z.pouzivatel_email)}
              </div>

              <div className="cw-rightbar__text">
                <div className="cw-rightbar__popis">
                  <strong>{z.pouzivatel_email?.split('@')[0] ?? 'Systém'}</strong>{' '}
                  {POPISY_AKCII[z.akcia] ?? z.akcia.replace(/_/g, ' ')}
                </div>
                {z.popis && <div className="cw-rightbar__detail">{z.popis}</div>}
                <div className="cw-rightbar__cas">{predAko(z.vytvoreny)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

export default RightBar;
