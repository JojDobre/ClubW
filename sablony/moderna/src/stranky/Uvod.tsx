// Umiestnenie: sablony/moderna/src/stranky/Uvod.tsx
// Úvodná stránka šablóny Moderná.
//
// Poradie sekcií: veľký úvod s najbližším zápasom, rýchle odkazy,
// Match Centre (hlavný prvok šablóny), správy, hráči, tabuľka s anketou,
// fotky a videá, tmavý panel s výzvou a partneri. Každú voliteľnú
// sekciu si správca zapne alebo vypne v nastaveniach šablóny.

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnketaWeb, souborUrl, useNastavenia, useNastaveniaSablony } from '@clubw/jadro';
import {
  Erb,
  Ikona,
  KartaClanku,
  KartaHraca,
  NadpisSekcie,
  RiadokZapasu,
  TabulkaSutaze,
  cas,
  datum,
  denVTyzdni,
  logoStrany,
  maVysledok,
  nazovDomacich,
  nazovHosti,
  sklon,
  skryObrazok,
  useApi,
  useTitulok,
  vyberHlavnyTim,
  vyrezTabulky,
  vysledokKlubu,
  zaKolko,
  type Clanok,
  type Hrac,
  type Liga,
  type RiadokTabulky,
  type Tim,
  type Zapas,
} from '../spolocne';

interface Nastavenia extends Record<string, string | number | boolean | null> {
  uvodna_fotka: string | null;
  stitok_uvodu: string | null;
  titulok_uvodu: string | null;
  podtitulok_uvodu: string | null;
  tim_uvodu: number | null;
  pocet_clankov: number | null;
  ukazat_tabulku: boolean;
  ukazat_hracov: boolean;
  ukazat_media: boolean;
  ukazat_anketu: boolean;
  ukazat_partnerov: boolean;
  panel_nadpis: string | null;
  panel_text: string | null;
  panel_tlacidlo: string | null;
  panel_odkaz: string | null;
}

interface Galeria {
  id: number;
  nazov: string;
  pocet_obrazkov: number;
  nahladovy_obrazok: string | null;
}

interface Video {
  id: number;
  nazov: string;
  nahlad_url?: string | null;
  nahlad?: string | null;
  dlzka?: number | null;
}

interface Partner {
  id: number;
  nazov: string;
  logo: string | null;
  web_url: string | null;
}

const dnes = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Zostávajúci čas do výkopu, obnovuje sa každých 30 sekúnd. */
const Odpocet: React.FC<{ kedy: string; svetly?: boolean }> = ({ kedy, svetly = false }) => {
  const [teraz, setTeraz] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setTeraz(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const zostava = new Date(kedy).getTime() - teraz;
  if (zostava <= 0) return null;
  const dni = Math.floor(zostava / 86_400_000);
  const hodiny = Math.floor((zostava % 86_400_000) / 3_600_000);
  const minuty = Math.floor((zostava % 3_600_000) / 60_000);
  const casti: Array<[number, string]> = [
    [dni, sklon(dni, 'deň', 'dni', 'dní')],
    [hodiny, sklon(hodiny, 'hodina', 'hodiny', 'hodín')],
    [minuty, sklon(minuty, 'minúta', 'minúty', 'minút')],
  ];
  return (
    <div className={`md-odpocet${svetly ? ' md-odpocet--svetly' : ''}`} role="timer" aria-label={`Do výkopu zostáva ${casti.map(([n, s]) => `${n} ${s}`).join(', ')}`}>
      {casti.map(([n, s]) => (
        <span key={s}>
          <strong>{String(n).padStart(2, '0')}</strong>
          <small>{s}</small>
        </span>
      ))}
    </div>
  );
};

const Uvod: React.FC = () => {
  const { nastavenia } = useNastavenia();
  const s = useNastaveniaSablony<Nastavenia>();
  useTitulok(nastavenia.nazov);

  const pocetClankov = Math.min(Math.max(Number(s.pocet_clankov) || 5, 3), 9);

  const timy = useApi<Tim[]>('/teams');
  const hlavny = vyberHlavnyTim(timy.data, s.tim_uvodu);
  const filterTimu = hlavny ? `&tim_id=${hlavny.id}` : '';
  const timyNacitane = !timy.nacitava;

  const buduce = useApi<Zapas[]>(timyNacitane ? `/matches?status=naplanovany&od_datumu=${dnes()}&limit=50${filterTimu}` : null);
  const vysledky = useApi<Zapas[]>(timyNacitane ? `/matches?status=ukonceny&limit=1${filterTimu}` : null);
  const clanky = useApi<Clanok[]>(`/articles?limit=${pocetClankov}`);
  const hraci = useApi<{ hraci: Hrac[] }>(s.ukazat_hracov && hlavny ? `/teams/${hlavny.id}/players` : null);
  const ligy = useApi<Liga[]>(s.ukazat_tabulku ? '/leagues' : null);
  const liga =
    (ligy.data ?? []).find((l) => hlavny && l.tim_id === hlavny.id && l.format !== 'turnaj') ??
    (ligy.data ?? []).find((l) => l.format !== 'turnaj') ??
    null;
  const tabulka = useApi<RiadokTabulky[]>(liga ? `/leagues/${liga.id}/table` : null);
  const galerie = useApi<Galeria[]>(s.ukazat_media ? '/galleries?limit=1' : null);
  const videa = useApi<Video[]>(s.ukazat_media ? '/videos?limit=2' : null);
  const partneri = useApi<Partner[]>(s.ukazat_partnerov ? '/sponsors' : null);
  const stranky = useApi<Array<{ id: number; nazov: string; slug: string }>>('/pages/menu');

  const program = [...(buduce.data ?? [])].sort((a, b) => a.datum_cas.localeCompare(b.datum_cas));
  const najblizsi = program[0] ?? null;
  const posledny = vysledky.data?.[0] ?? null;
  const zapasovyDen = najblizsi ? zaKolko(najblizsi.datum_cas) === 'dnes' : false;

  const titulok = s.titulok_uvodu || nastavenia.slogan || nastavenia.nazov;
  const podtitulok = s.podtitulok_uvodu || (s.titulok_uvodu ? nastavenia.slogan : null) || nastavenia.meta_popis;

  const hraciUvodu = [...(hraci.data?.hraci ?? [])]
    .sort((a, b) => Number(Boolean(b.fotka)) - Number(Boolean(a.fotka)) || (a.cislo_dresu ?? 99) - (b.cislo_dresu ?? 99))
    .slice(0, 4);

  const [hlavnyClanok, ...ostatneClanky] = clanky.data ?? [];
  const strankaKlubu = stranky.data?.[0];

  return (
    <div className="md-uvod">
      {/* ===== Úvod ===== */}
      <section
        className={`md-hero${s.uvodna_fotka ? ' md-hero--fotka' : ''}`}
        style={s.uvodna_fotka ? ({ '--md-hero-fotka': `url("${souborUrl(s.uvodna_fotka)}")` } as React.CSSProperties) : undefined}
      >
        <div className="md-hero__obsah md-kontajner">
          <div className="md-hero__text">
            <div className="md-hero__stitky">
              <span className="md-pill">{s.stitok_uvodu || nastavenia.nazov}</span>
              {zapasovyDen && <span className="md-pill md-pill--zapas">Zápasový deň</span>}
            </div>
            <h1>{titulok}</h1>
            {podtitulok && <p className="md-hero__popis">{podtitulok}</p>}
            <div className="md-hero__tlacidla">
              <Link to="/matches" className="md-tlacidlo md-tlacidlo--klub">
                Zápasy a výsledky
              </Link>
              <Link to="/clanky" className="md-tlacidlo md-tlacidlo--sklo">
                Najnovšie správy
              </Link>
            </div>
          </div>

          {najblizsi && (
            <Link to={`/matches/${najblizsi.id}`} className="md-hero-zapas">
              <span className="md-hero-zapas__hlava">
                <span className="md-stitok md-stitok--svetly">Najbližší zápas</span>
                <span>
                  {denVTyzdni(najblizsi.datum_cas)} · {cas(najblizsi.datum_cas)}
                </span>
              </span>
              <span className="md-hero-zapas__timy">
                <span>
                  <Erb nazov={nazovDomacich(najblizsi)} logo={logoStrany(najblizsi, 'domaci', nastavenia.logo)} velkost="md" />
                  <strong>{nazovDomacich(najblizsi)}</strong>
                </span>
                <em>vs</em>
                <span>
                  <Erb nazov={nazovHosti(najblizsi)} logo={logoStrany(najblizsi, 'hostia', nastavenia.logo)} velkost="md" />
                  <strong>{nazovHosti(najblizsi)}</strong>
                </span>
              </span>
              <span className="md-hero-zapas__miesto">
                {[najblizsi.miesto, najblizsi.liga_nazov].filter(Boolean).join(' · ') || datum(najblizsi.datum_cas)}
              </span>
            </Link>
          )}
        </div>
      </section>

      {/* ===== Rýchle odkazy ===== */}
      <nav className="md-rychle" aria-label="Rýchle odkazy">
        <div className="md-kontajner md-rychle__mriezka">
          <Link to="/matches" className="md-rychle__polozka">
            <span>
              <strong>Zápasy a výsledky</strong>
              <small>Program, výsledky a tabuľky</small>
            </span>
            <Ikona nazov="sipka_hore" />
          </Link>
          <Link to={hlavny ? `/teams/${hlavny.id}` : '/teams'} className="md-rychle__polozka">
            <span>
              <strong>{hlavny ? hlavny.nazov : 'Tímy'}</strong>
              <small>Káder a realizačný tím</small>
            </span>
            <Ikona nazov="sipka_hore" />
          </Link>
          <Link to="/galleries" className="md-rychle__polozka">
            <span>
              <strong>Fotky a videá</strong>
              <small>Galérie a zostrihy</small>
            </span>
            <Ikona nazov="sipka_hore" />
          </Link>
          <Link to={strankaKlubu ? `/${strankaKlubu.slug}` : '/sponzori'} className="md-rychle__polozka">
            <span>
              <strong>{strankaKlubu ? strankaKlubu.nazov : 'Partneri'}</strong>
              <small>{strankaKlubu ? 'História a informácie o klube' : 'Ďakujeme za podporu'}</small>
            </span>
            <Ikona nazov="sipka_hore" />
          </Link>
        </div>
      </nav>

      {/* ===== Match Centre ===== */}
      {(najblizsi || posledny) && (
        <section className="md-sekcia md-aurora" aria-labelledby="md-mc">
          <div className="md-kontajner">
            <NadpisSekcie stitok="Match Centre" nadpis="Všetko dôležité pred výkopom." odkaz="/matches" textOdkazu="Všetky zápasy" id="md-mc" />
            <MatchCentre hlavny={najblizsi ?? posledny!} />
            <div className="md-mc-pod">
              {posledny && najblizsi && (
                <div className="md-karta md-mc-pod__vysledok">
                  <div className="md-stitok">Posledný výsledok</div>
                  <PoslednyVysledok zapas={posledny} />
                </div>
              )}
              {program.length > 1 && (
                <div className="md-karta md-mc-pod__program">
                  <div className="md-stitok">Ďalšie zápasy</div>
                  <div className="md-zoznam-zapasov">
                    {program.slice(1, 4).map((z) => (
                      <RiadokZapasu key={z.id} zapas={z} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===== Správy ===== */}
      <section className="md-sekcia" aria-labelledby="md-spravy">
        <div className="md-kontajner">
          <NadpisSekcie stitok="Správy" nadpis="Príbehy z klubu." odkaz="/clanky" textOdkazu="Všetky správy" id="md-spravy" />
          {clanky.nacitava ? (
            <div className="md-kostra md-kostra--spravy" aria-hidden="true" />
          ) : !hlavnyClanok ? (
            <p className="md-tlmene">Zatiaľ tu nie sú žiadne správy.</p>
          ) : (
            <div className={`md-spravy md-spravy--${Math.min(ostatneClanky.length, 4)}`}>
              <KartaClanku clanok={hlavnyClanok} velka />
              {ostatneClanky.slice(0, 4).map((c) => (
                <KartaClanku key={c.id} clanok={c} />
              ))}
            </div>
          )}
          {ostatneClanky.length > 4 && (
            <div className="md-spravy-zoznam">
              {ostatneClanky.slice(4).map((c) => (
                <KartaClanku key={c.id} clanok={c} bezObrazka />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== Hráči ===== */}
      {s.ukazat_hracov && hlavny && hraciUvodu.length > 0 && (
        <section className="md-sekcia md-mesh" aria-labelledby="md-hraci">
          <div className="md-kontajner">
            <NadpisSekcie stitok={hlavny.nazov} nadpis="Ľudia za naším erbom." odkaz={`/teams/${hlavny.id}`} textOdkazu="Celý káder" id="md-hraci" />
            <div className="md-hraci md-posuvnik">
              {hraciUvodu.map((h) => (
                <KartaHraca key={h.id} hrac={h} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== Tabuľka a anketa ===== */}
      {((s.ukazat_tabulku && liga && (tabulka.data ?? []).length > 0) || s.ukazat_anketu) && (
        <section className="md-sekcia" aria-label="Tabuľka a anketa">
          <div className="md-kontajner md-uvod-tabulka">
            {s.ukazat_tabulku && liga && (tabulka.data ?? []).length > 0 && (
              <div className="md-uvod-tabulka__tabulka">
                <NadpisSekcie stitok={liga.sezona ? `Sezóna ${liga.sezona}` : 'Tabuľka'} nadpis={liga.nazov} odkaz={`/leagues/${liga.id}`} textOdkazu="Celá tabuľka" />
                <div className="md-karta md-karta--tabulka">
                  <TabulkaSutaze
                    riadky={vyrezTabulky(tabulka.data!, hlavny?.id ?? liga.tim_id, 7)}
                    zvyraznitTim={hlavny?.id ?? liga.tim_id}
                    kompaktna
                    lenBody={liga.rezim_tabulky === 'len_body'}
                  />
                </div>
              </div>
            )}
            {s.ukazat_anketu && (
              <div className="md-uvod-tabulka__anketa">
                <AnketaWeb najnovsia />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===== Fotky a videá ===== */}
      {s.ukazat_media && ((galerie.data ?? []).length > 0 || (videa.data ?? []).length > 0) && (
        <section className="md-sekcia md-sekcia--tmava" aria-labelledby="md-media">
          <div className="md-kontajner">
            <NadpisSekcie stitok="Médiá" nadpis="Zápasy tak, ako ste ich zažili." odkaz="/galleries" textOdkazu="Všetky galérie" id="md-media" />
            <div className="md-media">
              {(galerie.data ?? []).slice(0, 1).map((g) => (
                <Link key={g.id} to={`/galleries/${g.id}`} className="md-media__dlazdica md-media__dlazdica--velka">
                  {g.nahladovy_obrazok ? <img src={souborUrl(g.nahladovy_obrazok)} alt="" loading="lazy" /> : <span className="md-obrazok--prazdny" />}
                  <span className="md-media__text">
                    <span className="md-stitok md-stitok--svetly">
                      <Ikona nazov="foto" velkost={14} /> {g.pocet_obrazkov} {sklon(g.pocet_obrazkov, 'fotka', 'fotky', 'fotiek')}
                    </span>
                    <strong>{g.nazov}</strong>
                  </span>
                </Link>
              ))}
              {(videa.data ?? []).map((v) => (
                <Link key={v.id} to="/videa" className="md-media__dlazdica">
                  {(v.nahlad_url || v.nahlad) && <img src={v.nahlad_url || v.nahlad || ''} alt="" loading="lazy" onError={skryObrazok} />}
                  <span className="md-media__hrat" aria-hidden="true">
                    <Ikona nazov="hrat" velkost={22} />
                  </span>
                  <span className="md-media__text">
                    <span className="md-stitok md-stitok--svetly">Video</span>
                    <strong>{v.nazov}</strong>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== Tmavý panel s výzvou ===== */}
      {s.panel_nadpis && (
        <section className="md-sekcia md-sekcia--bez-hornej">
          <div className="md-kontajner">
            <div className="md-panel">
              <div className="md-panel__obsah">
                <div className="md-stitok md-stitok--svetly">{nastavenia.nazov}</div>
                <h2>{s.panel_nadpis}</h2>
                {s.panel_text && <p>{s.panel_text}</p>}
                {s.panel_odkaz && s.panel_tlacidlo && <OdkazPanelu odkaz={s.panel_odkaz} text={s.panel_tlacidlo} />}
              </div>
              {nastavenia.logo && <img src={souborUrl(nastavenia.logo)} alt="" className="md-panel__erb" aria-hidden="true" />}
            </div>
          </div>
        </section>
      )}

      {/* ===== Partneri ===== */}
      {s.ukazat_partnerov && (partneri.data ?? []).length > 0 && (
        <section className="md-sekcia md-sekcia--partneri" aria-labelledby="md-partneri">
          <div className="md-kontajner">
            <NadpisSekcie stitok="Partneri" nadpis="Ďakujeme, že ste s nami." odkaz="/sponzori" textOdkazu="Všetci partneri" id="md-partneri" />
            <div className="md-partneri">
              {partneri.data!.slice(0, 12).map((p) => {
                const obsah = p.logo ? <img src={souborUrl(p.logo)} alt={p.nazov} loading="lazy" /> : <span>{p.nazov}</span>;
                return p.web_url ? (
                  <a key={p.id} href={p.web_url} target="_blank" rel="noopener noreferrer" title={p.nazov} className="md-partneri__logo">
                    {obsah}
                  </a>
                ) : (
                  <span key={p.id} title={p.nazov} className="md-partneri__logo">
                    {obsah}
                  </span>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

/** Odkaz z nastavení - interný cez router, externý v novom okne. */
const OdkazPanelu: React.FC<{ odkaz: string; text: string }> = ({ odkaz, text }) =>
  odkaz.startsWith('/') && !odkaz.startsWith('//') ? (
    <Link to={odkaz} className="md-tlacidlo md-tlacidlo--biele">
      {text}
    </Link>
  ) : /^https?:\/\//.test(odkaz) ? (
    <a href={odkaz} className="md-tlacidlo md-tlacidlo--biele" target="_blank" rel="noopener noreferrer">
      {text}
    </a>
  ) : null;

/** Veľká karta zápasu: najbližší zápas s odpočtom, alebo posledný výsledok. */
const MatchCentre: React.FC<{ hlavny: Zapas }> = ({ hlavny: z }) => {
  const { nastavenia } = useNastavenia();
  const odohrany = maVysledok(z) && z.status !== 'naplanovany';
  return (
    <div className="md-match-centre">
      <div className="md-match-centre__hlava">
        <div>
          <strong>{[z.liga_nazov || 'Zápas', z.kolo ? `${z.kolo}. kolo` : null].filter(Boolean).join(' · ')}</strong>
          <span>
            {datum(z.datum_cas, { weekday: 'long', day: 'numeric', month: 'long' })}
            {z.miesto && ` · ${z.miesto}`}
          </span>
        </div>
        <Link to={`/matches/${z.id}`} className="md-tlacidlo md-tlacidlo--sekundarne">
          Detail zápasu
        </Link>
      </div>
      <div className="md-match-centre__timy">
        <div className="md-match-centre__tim">
          <Erb nazov={nazovDomacich(z)} logo={logoStrany(z, 'domaci', nastavenia.logo)} velkost="xl" />
          <strong>{nazovDomacich(z)}</strong>
          <small>Domáci</small>
        </div>
        <div className="md-match-centre__stred">
          {odohrany ? (
            <>
              <span className="md-match-centre__skore">
                {z.goly_domaci}
                <i>:</i>
                {z.goly_hostia}
              </span>
              <small>{z.status === 'prebieha' ? 'Práve sa hrá' : 'Koniec zápasu'}</small>
            </>
          ) : (
            <>
              <span className="md-match-centre__cas">{cas(z.datum_cas)}</span>
              <small>{zaKolko(z.datum_cas) || datum(z.datum_cas, { day: 'numeric', month: 'short' })}</small>
            </>
          )}
        </div>
        <div className="md-match-centre__tim">
          <Erb nazov={nazovHosti(z)} logo={logoStrany(z, 'hostia', nastavenia.logo)} velkost="xl" />
          <strong>{nazovHosti(z)}</strong>
          <small>Hostia</small>
        </div>
      </div>
      {!odohrany && <Odpocet kedy={z.datum_cas} />}
    </div>
  );
};

const PoslednyVysledok: React.FC<{ zapas: Zapas }> = ({ zapas: z }) => {
  const { nastavenia } = useNastavenia();
  const vysledok = vysledokKlubu(z);
  const popis = { V: 'Výhra', R: 'Remíza', P: 'Prehra' } as const;
  return (
    <Link to={`/matches/${z.id}`} className="md-posledny">
      <span className="md-posledny__tim">
        <Erb nazov={nazovDomacich(z)} logo={logoStrany(z, 'domaci', nastavenia.logo)} velkost="sm" />
        {nazovDomacich(z)}
      </span>
      <span className={`md-posledny__skore${vysledok ? ` md-skore--${vysledok}` : ''}`}>
        {z.goly_domaci}:{z.goly_hostia}
      </span>
      <span className="md-posledny__tim md-posledny__tim--hostia">
        {nazovHosti(z)}
        <Erb nazov={nazovHosti(z)} logo={logoStrany(z, 'hostia', nastavenia.logo)} velkost="sm" />
      </span>
      <small>
        {[vysledok ? popis[vysledok] : null, datum(z.datum_cas, { day: 'numeric', month: 'long' }), z.liga_nazov].filter(Boolean).join(' · ')}
      </small>
    </Link>
  );
};

export default Uvod;
