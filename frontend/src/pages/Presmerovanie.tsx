// Umiestnenie: frontend/src/pages/Presmerovanie.tsx
// Odkaz na obrazovku, ktorá ešte žije v pôvodnej administrácii.
//
// Niektoré obrazovky (kategórie, stránky, galérie, realizačný tím, ligy)
// nie sú v novom návrhu a zostávajú v pôvodnej verzii, kým sa neprepíšu.
// Namiesto prázdnej stránky ponúkneme odkaz, ktorý tam používateľa presmeruje.

import React from 'react';
import { Card, EmptyState, Button, Icon } from '../ui';

interface PresmerovanieProps {
  /** Cesta v pôvodnej administrácii */
  na: string;
}

export const Presmerovanie: React.FC<PresmerovanieProps> = ({ na }) => (
  <Card>
    <EmptyState
      ikona={<Icon nazov="sipkaVpravo" velkost={38} />}
      nadpis="Táto obrazovka je ešte v pôvodnej administrácii"
      popis="Prepisuje sa do nového vzhľadu. Dovtedy je plne funkčná v pôvodnej verzii."
      akcia={
        <Button
          // Zámerne celé načítanie stránky — pôvodná administrácia
          // má vlastný router a nedá sa do nej prejsť cez react-router
          onClick={() => { window.location.href = na; }}
          ikona={<Icon nazov="sipkaVpravo" velkost={15} />}
        >
          Prejsť do pôvodnej administrácie
        </Button>
      }
    />
  </Card>
);

export default Presmerovanie;
