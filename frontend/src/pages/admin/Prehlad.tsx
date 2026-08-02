// Umiestnenie: frontend/src/pages/admin/Prehlad.tsx
// Úvodná obrazovka administrácie.
//
// Rozloženie zodpovedá návrhu:
//   1. Pozdrav + tlačidlo na spustenie živého zápasu
//   2. Mriežka štatistických dlaždíc
//   3. Karta najbližšieho zápasu (s prechodom) + graf aktivity
//   4. Najnovšie články + rýchle akcie

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard, Badge, Skeleton, Icon } from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { prehladApi } from '../../api/prehlad';
import { zapasyApi } from '../../api/sport';
import { useAuth } from '../../app/AuthContext';
import { formatujDatum } from '../../utils/datum';
import type { Zapas } from '../../api/typy';
import './Prehlad.css';

const DNI_SKRATKA = ['NE', 'PO', 'UT', 'ST', 'ŠT', 'PI', 'SO'];
const MESIACE_SKRATKA = ['jan', 'feb', 'mar', 'apr', 'máj', 'jún', 'júl', 'aug', 'sep', 'okt', 'nov', 'dec'];

/** Znak tímu z názvu — dve začiatočné písmená. */
const znakTimu = (nazov: string | null | undefined): string => {
  if (!nazov) return '??';
  const slova = nazov.split(/\s+/).filter((s) => s.length > 1);
  if (slova.length >= 2) return (slova[0][0] + slova[1][0]).toUpperCase();
  return nazov.slice(0, 2).toUpperCase();
};

export const Prehlad: React.FC = () => {
  const navigate = useNavigate();
  const { pouzivatel } = useAuth();

  const statistiky = useNacitanie((signal) => prehladApi.statistiky(signal));
  const clanky = useNacitanie((signal) => prehladApi.najnovsieClanky(4, signal));
  const zapasy = useNacitanie((signal) => zapasyApi.vypis(signal));

  const s = statistiky.data;
  const zoznamClankov = clanky.data?.articles ?? [];

  /** Najbližší zápas, ktorý ešte neskončil. */
  const najblizsi: Zapas | null = useMemo(() => {
    const vsetky = zapasy.data ?? [];
    const teraz = Date.now();

    return (
      vsetky
        .filter((z) => {
          const stav = z.actual_status ?? z.status;
          return stav !== 'ukonceny' && stav !== 'zruseny';
        })
        // Zápas, ktorý začal pred menej ako tromi hodinami, ešte môže prebiehať
        .filter((z) => z.datum_cas && new Date(z.datum_cas).getTime() >= teraz - 3 * 3600_000)
        .sort((a, b) => new Date(a.datum_cas).getTime() - new Date(b.datum_cas).getTime())[0] ?? null
    );
  }, [zapasy.data]);

  /** Zápas na spustenie naživo — prebiehajúci má prednosť pred najbližším. */
  const zapasNaZivo = useMemo(() => {
    const vsetky = zapasy.data ?? [];
    return vsetky.find((z) => (z.actual_status ?? z.status) === 'prebieha') ?? najblizsi;
  }, [zapasy.data, najblizsi]);

  /**
   * Body pre graf.
   *
   * POZNÁMKA: backend zatiaľ nemeria návštevnosť webu. Graf preto zobrazuje
   * počet odohraných zápasov po týždňoch — je to skutočný údaj z databázy,
   * nie vymyslené číslo. Keď pribudne meranie návštevnosti, mení sa len
   * tento výpočet.
   */
  const graf = useMemo(() => {
    const vsetky = zapasy.data ?? [];
    const teraz = new Date();
    const body: number[] = [];

    for (let i = 11; i >= 0; i--) {
      const od = new Date(teraz.getTime() - (i + 1) * 7 * 86400_000);
      const doKedy = new Date(teraz.getTime() - i * 7 * 86400_000);
      body.push(
        vsetky.filter((z) => {
          if (!z.datum_cas) return false;
          const d = new Date(z.datum_cas);
          return d >= od && d < doKedy;
        }).length
      );
    }

    if (body.length === 0) return { ciara: '', plocha: '', suma: 0 };

    const sirka = 300;
    const vyska = 90;
    const max = Math.max(...body, 1);
    const krok = sirka / Math.max(body.length - 1, 1);

    const suradnice = body.map((h, i) => {
      const x = i * krok;
      // Odstup 8 px zhora, aby sa čiara nedotýkala okraja
      const y = vyska - 8 - (h / max) * (vyska - 16);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const ciara = `M${suradnice.join(' L')}`;
    return {
      ciara,
      plocha: `${ciara} L${sirka},${vyska} L0,${vyska} Z`,
      suma: body.reduce((a, b) => a + b, 0),
    };
  }, [zapasy.data]);

  const nazovTimu = (z: Zapas, strana: 'domaci' | 'hostujuci'): string =>
    (strana === 'domaci'
      ? z.domaci_tim_display_name || z.domaci_tim_nazov
      : z.hostujuci_tim_display_name || z.hostujuci_tim_nazov) || '—';

  const rychleAkcie = [
    { popis: 'Nový článok', ikona: 'clanky', cesta: '/admin/clanky/novy' },
    { popis: 'Pridať zápas', ikona: 'zapasy', cesta: '/admin/zapasy/novy' },
    { popis: 'Pridať hráča', ikona: 'hraci', cesta: '/admin/hraci' },
    { popis: 'Nová galéria', ikona: 'galerie', cesta: '/admin/galerie' },
    { popis: 'Upraviť tímy', ikona: 'timy', cesta: '/admin/timy' },
    { popis: 'Nastavenia', ikona: 'nastavenia', cesta: '/admin/nastavenia' },
  ];

  const krstneMeno = pouzivatel?.meno?.split(' ')[0] ?? '';

  return (
    <div className="cw-dash">
      {/* ===== 1. Pozdrav a živý zápas ===== */}
      <div className="cw-dash__hlava">
        <div>
          <h1 className="cw-dash__pozdrav">
            Dobrý deň{krstneMeno && `, ${krstneMeno}`} 👋
          </h1>
          <p className="cw-dash__lead">Toto sa deje na webe klubu dnes.</p>
        </div>

        {zapasNaZivo && (
          <button
            className="cw-dash__live"
            onClick={() => navigate(`/admin/zapasy/${zapasNaZivo.id}/live`)}
          >
            <span className="cw-dash__live-bod" aria-hidden="true" />
            Spustiť LIVE zápas
          </button>
        )}
      </div>

      {/* ===== 2. Štatistické dlaždice ===== */}
      <div className="cw-dash__staty">
        <StatCard
          menovka="Články"
          hodnota={s?.totalArticles ?? '—'}
          zmena={s ? `${s.publishedArticles} publik.` : undefined}
          ikona={<Icon nazov="clanky" velkost={19} />}
          nacitava={statistiky.nacitava}
          onClick={() => navigate('/admin/clanky')}
        />
        <StatCard
          menovka="Aktívne tímy"
          hodnota={s?.totalTeams ?? '—'}
          ikona={<Icon nazov="timy" velkost={19} />}
          nacitava={statistiky.nacitava}
          onClick={() => navigate('/admin/timy')}
        />
        <StatCard
          menovka="Hráči"
          hodnota={s?.totalPlayers ?? '—'}
          ikona={<Icon nazov="hraci" velkost={19} />}
          nacitava={statistiky.nacitava}
          onClick={() => navigate('/admin/hraci')}
        />
        <StatCard
          menovka="Aktívne súťaže"
          hodnota={s?.totalLeagues ?? '—'}
          ikona={<Icon nazov="ligy" velkost={19} />}
          nacitava={statistiky.nacitava}
          onClick={() => navigate('/admin/ligy')}
        />
        <StatCard
          menovka="Zápasy"
          hodnota={s?.totalMatches ?? '—'}
          zmena={s ? `${s.finishedMatches} odohr.` : undefined}
          ikona={<Icon nazov="zapasy" velkost={19} />}
          nacitava={statistiky.nacitava}
          onClick={() => navigate('/admin/zapasy')}
        />
        <StatCard
          menovka="Používatelia"
          hodnota={s?.totalUsers ?? '—'}
          ikona={<Icon nazov="pouzivatelia" velkost={19} />}
          nacitava={statistiky.nacitava}
          onClick={() => navigate('/admin/pouzivatelia')}
        />
      </div>

      {/* ===== 3. Najbližší zápas + graf ===== */}
      <div className="cw-dash__mriezka">
        <div className="cw-dash__zapas">
          <div className="cw-dash__zapas-kruh" aria-hidden="true" />

          <div className="cw-dash__zapas-obsah">
            <div className="cw-dash__zapas-hlava">
              <span className="cw-dash__zapas-stitok">Najbližší zápas</span>
              {najblizsi && (
                <span className="cw-dash__zapas-liga">
                  {najblizsi.liga_display_name || najblizsi.liga_nazov || '—'}
                  {najblizsi.kolo !== null && ` · ${najblizsi.kolo}. kolo`}
                </span>
              )}
            </div>

            {zapasy.nacitava ? (
              <div className="cw-dash__zapas-nacitava">
                <Skeleton vyska="80px" />
              </div>
            ) : !najblizsi ? (
              <div className="cw-dash__zapas-prazdne">
                <p>Žiadny naplánovaný zápas</p>
                <button className="cw-dash__zapas-btn" onClick={() => navigate('/admin/zapasy/novy')}>
                  Pridať zápas
                </button>
              </div>
            ) : (
              <>
                <div className="cw-dash__zapas-timy">
                  <div className="cw-dash__zapas-tim">
                    <div className="cw-dash__zapas-znak">{znakTimu(nazovTimu(najblizsi, 'domaci'))}</div>
                    <div className="cw-dash__zapas-nazov">{nazovTimu(najblizsi, 'domaci')}</div>
                  </div>

                  <div className="cw-dash__zapas-cas">
                    <div className="cw-dash__zapas-hodina">
                      {DNI_SKRATKA[new Date(najblizsi.datum_cas).getDay()]}{' '}
                      {new Date(najblizsi.datum_cas).toLocaleTimeString('sk-SK', {
                        timeZone: 'Europe/Bratislava',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div className="cw-dash__zapas-datum">
                      {najblizsi.domaci_tim_id ? 'Domáci' : 'Vonku'} ·{' '}
                      {new Date(najblizsi.datum_cas).getDate()}.{' '}
                      {MESIACE_SKRATKA[new Date(najblizsi.datum_cas).getMonth()]}
                    </div>
                  </div>

                  <div className="cw-dash__zapas-tim">
                    <div className="cw-dash__zapas-znak">{znakTimu(nazovTimu(najblizsi, 'hostujuci'))}</div>
                    <div className="cw-dash__zapas-nazov">{nazovTimu(najblizsi, 'hostujuci')}</div>
                  </div>
                </div>

                <div className="cw-dash__zapas-akcie">
                  <button
                    className="cw-dash__zapas-btn"
                    onClick={() => navigate(`/admin/zapasy/${najblizsi.id}/live`)}
                  >
                    Zadať výsledok
                  </button>
                  <button
                    className="cw-dash__zapas-btn cw-dash__zapas-btn--obrys"
                    onClick={() => navigate(`/admin/zapasy/${najblizsi.id}`)}
                  >
                    Detail
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="cw-dash__graf">
          <div className="cw-dash__graf-hlava">
            <div>
              <div className="cw-dash__graf-nadpis">Aktivita klubu</div>
              <div className="cw-dash__graf-popis">odohrané zápasy za 12 týždňov</div>
            </div>
            {graf.suma > 0 && <span className="cw-dash__graf-zmena">{graf.suma} zápasov</span>}
          </div>

          <div className="cw-dash__graf-cislo">{s?.finishedMatches ?? '—'}</div>

          <svg
            viewBox="0 0 300 90"
            preserveAspectRatio="none"
            className="cw-dash__graf-svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="cw-graf-vypln" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--pri)" stopOpacity="0.28" />
                <stop offset="1" stopColor="var(--pri)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {graf.plocha && <path d={graf.plocha} fill="url(#cw-graf-vypln)" />}
            {graf.ciara && (
              <path
                d={graf.ciara}
                fill="none"
                stroke="var(--pri)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </div>
      </div>

      {/* ===== 4. Články + rýchle akcie ===== */}
      <div className="cw-dash__mriezka">
        <div className="cw-dash__panel">
          <div className="cw-dash__panel-hlava">
            <div className="cw-dash__panel-nadpis">Najnovšie články</div>
            <button className="cw-dash__panel-odkaz" onClick={() => navigate('/admin/clanky')}>
              Zobraziť všetky
            </button>
          </div>

          {clanky.nacitava ? (
            <div className="cw-dash__clanok">
              <Skeleton riadkov={3} />
            </div>
          ) : zoznamClankov.length === 0 ? (
            <div className="cw-dash__prazdne">
              <p>Zatiaľ žiadne články</p>
              <button className="cw-dash__panel-odkaz" onClick={() => navigate('/admin/clanky/novy')}>
                Napísať prvý
              </button>
            </div>
          ) : (
            zoznamClankov.map((a) => (
              <button
                key={a.id}
                className="cw-dash__clanok"
                onClick={() => navigate(`/admin/clanky/${a.id}`)}
              >
                <div className="cw-dash__clanok-nahlad">
                  {a.obrazok ? (
                    <img
                      src={a.obrazok}
                      alt=""
                      onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                    />
                  ) : (
                    <Icon nazov="galerie" velkost={18} />
                  )}
                </div>

                <div className="cw-dash__clanok-text">
                  <div className="cw-dash__clanok-nazov">{a.nazov}</div>
                  <div className="cw-dash__clanok-meta">
                    {a.autor?.meno && `${a.autor.meno} · `}
                    {formatujDatum(a.publikovany_datum || a.vytvoreny)}
                    {a.views > 0 && ` · ${a.views.toLocaleString('sk-SK')} zobrazení`}
                  </div>
                </div>

                {a.status === 'published' ? (
                  <Badge ton="success">Publikované</Badge>
                ) : (
                  <Badge>Koncept</Badge>
                )}
              </button>
            ))
          )}
        </div>

        <div className="cw-dash__panel cw-dash__panel--odsadeny">
          <div className="cw-dash__panel-nadpis cw-dash__akcie-nadpis">Rýchle akcie</div>

          <div className="cw-dash__akcie">
            {rychleAkcie.map((a) => (
              <button key={a.popis} className="cw-dash__akcia" onClick={() => navigate(a.cesta)}>
                <span className="cw-dash__akcia-ikona">
                  <Icon nazov={a.ikona} velkost={17} />
                </span>
                <span className="cw-dash__akcia-popis">{a.popis}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Prehlad;
