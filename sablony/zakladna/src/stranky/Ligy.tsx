// Umiestnenie: sablony/zakladna/src/stranky/Ligy.tsx
// Súťaže klubu: karta každej súťaže s výrezom tabuľky okolo nášho tímu
// (tabuľka v štýle tabuľky sezóny z profilu hráča).

import React from 'react';
import { Link } from 'react-router-dom';
import { Chyba, HlavickaStranky, Nacitava, Prazdne, Sekcia, TabulkaSutaze, vyrezTabulky } from '../casti';
import { Ikona, useApi, useTitulok, useUpravy, type Liga, type RiadokTabulky } from '../spolocne';

export const TYPY_SUTAZI: Record<string, string> = { sutaz: 'Súťaž', pohar: 'Pohár', priatelska: 'Prípravné zápasy' };

const KartaLigy: React.FC<{ liga: Liga }> = ({ liga }) => {
  const u = useUpravy();
  const tabulka = useApi<RiadokTabulky[]>(liga.format !== 'turnaj' ? `/leagues/${liga.id}/table` : null);
  const riadky = tabulka.data ?? [];
  return (
    <article className="zs-liga-karta">
      <div className="zs-liga-karta__hlava">
        <div>
          <span className="zs-clanok__kategoria">{[TYPY_SUTAZI[liga.typ ?? ''] ?? liga.typ_name, liga.sezona].filter(Boolean).join(' · ')}</span>
          <h2>{liga.nazov}</h2>
        </div>
        <Link to={`/leagues/${liga.id}`} className="zs-tlacidlo-obrys zs-tlacidlo-obrys--male">
          {u.text('text_detail_sutaze', 'Detail súťaže')}
          <Ikona nazov="sipka" velkost={12} />
        </Link>
      </div>
      {tabulka.nacitava ? (
        <Nacitava text="Načítavam tabuľku…" />
      ) : riadky.length > 0 ? (
        <TabulkaSutaze riadky={vyrezTabulky(riadky, liga.tim_id, 6)} zvyraznitTim={liga.tim_id} kompaktna lenBody={liga.rezim_tabulky === 'len_body'} />
      ) : (
        <p className="zs-liga-karta__popis">{liga.popis || 'Tabuľka zatiaľ nie je k dispozícii.'}</p>
      )}
    </article>
  );
};

const Ligy: React.FC = () => {
  const u = useUpravy();
  const ligy = useApi<Liga[]>('/leagues');
  useTitulok('Súťaže a tabuľky');

  return (
    <div className="zs-stranka zs-ligy">
      <HlavickaStranky stitok={u.text('stranka_ligy_stitok', 'Súťaže')} nadpis={u.text('stranka_ligy_nadpis', 'Tabuľky')} />
      <Sekcia className="zs-sekcia--hore zs-sekcia--mriezka">
        {ligy.nacitava ? (
          <Nacitava text="Načítavam súťaže…" />
        ) : ligy.chyba ? (
          <Chyba text={ligy.chyba} />
        ) : (ligy.data ?? []).length === 0 ? (
          <Prazdne nadpis="Zatiaľ tu nie sú žiadne súťaže" />
        ) : (
          <div className="zs-mriezka-lig">
            {ligy.data!.map((l) => (
              <KartaLigy key={l.id} liga={l} />
            ))}
          </div>
        )}
      </Sekcia>
    </div>
  );
};

export default Ligy;
