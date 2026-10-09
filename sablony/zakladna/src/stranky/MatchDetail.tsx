// Umiestnenie: sablony/zakladna/src/stranky/MatchDetail.tsx
// Detail zápasu: výsledková tabuľa, živý prenos (fáza, minúta, video),
// odpočet pred výkopom, priebeh a zostava, poznámky, video a článok.
// Počas zápasu sa skóre aj priebeh samy obnovujú.

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ZapasPriebeh, ZivyPrenos, useData, useTeraz, useZivaObnova, zivaMinuta, NAZVY_FAZ } from '@clubw/jadro';
import { Ikona } from '../ikony';
import {
  ErbTimu,
  STAVY,
  cas,
  maVysledok,
  nazovStrany,
  nazovSutaze,
  stavZapasu,
  useTitulok,
  type ZapasZakladny,
} from '../zapasy';
import NenajdenaStranka from './Nenajdena';
import './MatchDetail.css';

interface DetailZapasu extends ZapasZakladny {
  poznamky?: string | null;
  video_url?: string | null;
  fotogaleria_id?: number | null;
  clanok?: { nazov: string; slug: string } | null;
}

const Odpocet: React.FC<{ kedy: string }> = ({ kedy }) => {
  const teraz = useTeraz(30_000);
  const zostava = new Date(kedy).getTime() - teraz;
  if (zostava <= 0) return null;
  const casti: Array<[number, string]> = [
    [Math.floor(zostava / 86_400_000), 'dní'],
    [Math.floor((zostava % 86_400_000) / 3_600_000), 'hod'],
    [Math.floor((zostava % 3_600_000) / 60_000), 'min'],
  ];
  return (
    <div className="zk-odpocet zk-detail-zapasu__odpocet" role="timer" aria-label="Do výkopu zostáva">
      {casti.map(([n, s]) => (
        <span key={s}>
          <strong>{String(n).padStart(2, '0')}</strong>
          <small>{s}</small>
        </span>
      ))}
    </div>
  );
};

const MatchDetail: React.FC = () => {
  const { id = '' } = useParams();
  const [zivy, setZivy] = useState(false);
  const tik = useZivaObnova(zivy);
  const teraz = useTeraz();
  const zapas = useData<DetailZapasu>(/^\d+$/.test(id) ? `/matches/${id}${tik ? `?t=${tik}` : ''}` : null);
  const z = zapas.data;
  useEffect(() => setZivy(z?.status === 'prebieha'), [z?.status]);
  useTitulok(z ? `${nazovStrany(z, 'domaci')} – ${nazovStrany(z, 'hostia')}${maVysledok(z) ? ` ${z.goly_domaci}:${z.goly_hostia}` : ''}` : null);

  if (!/^\d+$/.test(id)) return <NenajdenaStranka />;
  if (zapas.nacitava && !z) {
    return (
      <div className="zk-nacitavanie" role="status">
        <span className="zk-nacitavanie__kruh" aria-hidden="true" />
        Načítavam zápas...
      </div>
    );
  }
  if (!z) {
    return (
      <div className="zk-stranka">
        <p className="zk-prazdne">Tento zápas sme nenašli alebo sa ho nepodarilo načítať.</p>
      </div>
    );
  }

  const stav = stavZapasu(z);
  const skore = maVysledok(z) && (stav === 'ukonceny' || stav === 'prebieha');
  const minuta = stav === 'prebieha' ? zivaMinuta(z, teraz) : null;
  const datumDlhy = new Date(z.datum_cas).toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const detaily: Array<[string, string, string | null | undefined]> = [
    ['kalendar', 'Výkop', `${datumDlhy}, ${cas(z.datum_cas)}`],
    ['miesto', 'Miesto', z.miesto],
    ['ucet', 'Rozhodca', z.rozhodca],
    ['ucet', 'Diváci', z.pocet_divakov ? z.pocet_divakov.toLocaleString('sk-SK') : null],
  ];

  return (
    <div className="zk-stranka zk-detail-zapasu">
      <Link to="/matches" className="zk-spat">
        <Ikona nazov="sipka" /> Všetky zápasy
      </Link>

      <section className={`zk-tabula is-${stav}`} aria-label="Výsledok zápasu">
        <div className="zk-tabula__hlava">
          <span>{nazovSutaze(z) || 'Zápas'}</span>
          {stav === 'prebieha' ? (
            <span className="zk-live">
              <i aria-hidden="true" /> Naživo
            </span>
          ) : (
            <span className={`zk-stav zk-stav--${stav}`}>{STAVY[stav] ?? stav}</span>
          )}
        </div>
        <div className="zk-tabula__timy">
          <div className="zk-tabula__tim">
            <ErbTimu z={z} strana="domaci" velky />
            {z.domaci_tim_id ? <Link to={`/teams/${z.domaci_tim_id}`}>{nazovStrany(z, 'domaci')}</Link> : <strong>{nazovStrany(z, 'domaci')}</strong>}
            <small>Domáci</small>
          </div>
          <div className="zk-tabula__stred">
            {skore ? (
              <span className="zk-tabula__skore">
                {z.goly_domaci}
                <i>:</i>
                {z.goly_hostia}
              </span>
            ) : (
              <span className="zk-tabula__cas">{cas(z.datum_cas)}</span>
            )}
            <small>
              {stav === 'prebieha'
                ? [minuta, z.live_faza ? NAZVY_FAZ[z.live_faza] : null].filter(Boolean).join(' · ') || 'Zápas prebieha'
                : new Date(z.datum_cas).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}
            </small>
          </div>
          <div className="zk-tabula__tim">
            <ErbTimu z={z} strana="hostia" velky />
            {z.hostujuci_tim_id ? <Link to={`/teams/${z.hostujuci_tim_id}`}>{nazovStrany(z, 'hostia')}</Link> : <strong>{nazovStrany(z, 'hostia')}</strong>}
            <small>Hostia</small>
          </div>
        </div>
        {stav === 'naplanovany' && <Odpocet kedy={z.datum_cas} />}
      </section>

      <ZivyPrenos zapas={z} className="zk-zivy-prenos" />

      <div className="zk-detail-zapasu__mriezka">
        <div className="zk-detail-zapasu__hlavny">
          <ZapasPriebeh zapasId={z.id} domaci={nazovStrany(z, 'domaci')} hostia={nazovStrany(z, 'hostia')} obnova={tik} />
          {z.poznamky && (
            <section className="zk-karta-obsah">
              <h2 className="zk-detail-zapasu__nadpis">Poznámky</h2>
              <p className="zk-detail-zapasu__text">{z.poznamky}</p>
            </section>
          )}
        </div>

        <aside className="zk-detail-zapasu__bok">
          <section className="zk-karta-obsah">
            <h2 className="zk-detail-zapasu__nadpis">O zápase</h2>
            <dl className="zk-detaily">
              {detaily
                .filter(([, , hodnota]) => Boolean(hodnota))
                .map(([ikona, nazov, hodnota]) => (
                  <div key={nazov}>
                    <dt>
                      <Ikona nazov={ikona} /> {nazov}
                    </dt>
                    <dd>{hodnota}</dd>
                  </div>
                ))}
            </dl>
          </section>

          {(z.video_url || z.clanok || z.fotogaleria_id) && (
            <section className="zk-karta-obsah zk-detail-zapasu__odkazy">
              <h2 className="zk-detail-zapasu__nadpis">Viac k zápasu</h2>
              {z.clanok && (
                <Link to={`/clanek/${z.clanok.slug}`}>
                  <span>Článok</span>
                  {z.clanok.nazov}
                </Link>
              )}
              {z.video_url && (
                <a href={z.video_url} target="_blank" rel="noopener noreferrer">
                  <span>Video</span>
                  Pozrieť záznam zápasu
                </a>
              )}
              {z.fotogaleria_id && (
                <Link to={`/galleries/${z.fotogaleria_id}`}>
                  <span>Fotogaléria</span>
                  Fotky zo zápasu
                </Link>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};

export default MatchDetail;
