// Umiestnenie: sablony/moderna/src/stranky/Ligy.tsx
// Súťaže klubu - karta každej súťaže s výrezom tabuľky.

import React from 'react';
import { Link } from 'react-router-dom';
import { Chyba, HlavickaStranky, Ikona, Nacitava, Prazdne, TabulkaSutaze, useApi, useTitulok, vyrezTabulky, type Liga, type RiadokTabulky } from '../spolocne';

const TYPY_SUTAZI: Record<string, string> = { sutaz: 'Súťaž', pohar: 'Pohár', priatelska: 'Prípravné zápasy' };

const KartaLigy: React.FC<{ liga: Liga }> = ({ liga }) => {
  const tabulka = useApi<RiadokTabulky[]>(liga.format !== 'turnaj' ? `/leagues/${liga.id}/table` : null);
  const riadky = tabulka.data ?? [];
  return (
    <article className="md-karta md-karta-ligy">
      <div className="md-karta-ligy__hlava">
        <div>
          <div className="md-stitok">{[TYPY_SUTAZI[liga.typ ?? ''] ?? liga.typ_name, liga.sezona].filter(Boolean).join(' · ')}</div>
          <h2>{liga.nazov}</h2>
        </div>
        <Link to={`/leagues/${liga.id}`} className="md-tlacidlo md-tlacidlo--sekundarne md-tlacidlo--male">
          Detail <Ikona nazov="sipka" velkost={16} />
        </Link>
      </div>
      {tabulka.nacitava ? (
        <Nacitava text="Načítavam tabuľku…" />
      ) : riadky.length > 0 ? (
        <TabulkaSutaze riadky={vyrezTabulky(riadky, liga.tim_id, 6)} zvyraznitTim={liga.tim_id} kompaktna lenBody={liga.rezim_tabulky === 'len_body'} />
      ) : (
        <p className="md-tlmene">{liga.popis || 'Tabuľka zatiaľ nie je k dispozícii.'}</p>
      )}
    </article>
  );
};

const Ligy: React.FC = () => {
  const ligy = useApi<Liga[]>('/leagues');
  useTitulok('Súťaže a tabuľky');

  return (
    <div className="md-stranka">
      <HlavickaStranky stitok="Súťaže" nadpis="Tabuľky a súťaže." popis="Kde hráme, ako sa nám darí a kto je v tabuľke pred nami." />
      <div className="md-kontajner">
        {ligy.nacitava ? (
          <Nacitava text="Načítavam súťaže…" />
        ) : ligy.chyba ? (
          <Chyba text={ligy.chyba} />
        ) : (ligy.data ?? []).length === 0 ? (
          <Prazdne nadpis="Zatiaľ tu nie sú žiadne súťaže" />
        ) : (
          <div className="md-mriezka-lig">
            {ligy.data!.map((l) => (
              <KartaLigy key={l.id} liga={l} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Ligy;
