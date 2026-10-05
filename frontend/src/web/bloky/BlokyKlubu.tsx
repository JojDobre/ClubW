// Umiestnenie: frontend/src/web/bloky/BlokyKlubu.tsx
// Automatické bloky s údajmi klubu - tabuľka ligy, strelci, sezóna
// v číslach, káder, videá, fotogalérie, produkty fanshopu a udalosti.
//
// Slúžia na stránkach aj ako vlastné sekcie úvodnej stránky šablóny.
// Používajú rovnaké sémantické triedy ako ostatné bloky (.blok__mriezka,
// .blok__karta, .blok__tabulka, .blok__cisla, .blok__osoba…), takže ich
// každá šablóna zobrazí vo svojom dizajne bez ďalšieho kódu.

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../pomocky';
import { useNastavenia } from '../../context/NastaveniaContext';
import { cenaText } from '../eshop';
import { HlavickaBloku, Obr, OdkazBloku, obrazokBloku, odkazVsetkychBloku } from './pomocky';
import type { KomponentBloku } from './typy';

const datumKratky = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const pocetZ = (hodnota: unknown, predvolene: number, max: number) => Math.min(max, Math.max(1, Number(hodnota) || predvolene));
const kladneId = (hodnota: unknown) => (Number(hodnota) > 0 ? Number(hodnota) : null);

/** Odkaz „Zobraziť všetky" vedľa nadpisu - len keď ho správca v bloku zapol. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vsetky = (data: Record<string, any>, adresa: string | null) => (data.odkaz_vsetky === true && adresa ? adresa : null);

// ===== Výber tímu a ligy =====

interface TimBloku {
  id: number;
  nazov: string;
  typ?: string | null;
  vekova_kategoria?: string | null;
  poradie?: number | null;
}

interface LigaBloku {
  id: number;
  nazov: string;
  tim_id?: number | null;
  format?: string | null;
  status?: string | null;
  poradie?: number | null;
}

const jeSeniorska = (k?: string | null) => ['seniori', 'muzi'].includes((k || 'seniori').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());

/** Vybraný tím, inak hlavný tím klubu (A tím mužov, inak prvý podľa poradia). */
export const useTimBloku = (timId: unknown): number | null => {
  const id = kladneId(timId);
  const timy = useData<TimBloku[]>(id ? null : '/teams');
  if (id) return id;
  const zoradene = [...(timy.data ?? [])].sort((a, b) => (a.poradie ?? 0) - (b.poradie ?? 0) || a.id - b.id);
  return (zoradene.find((t) => t.typ === 'muzi' && jeSeniorska(t.vekova_kategoria)) ?? zoradene[0])?.id ?? null;
};

/** Vybraná liga, inak liga (nie turnaj) hlavného tímu, inak prvá aktívna. */
export const useLigaBloku = (ligaId: unknown): LigaBloku | null => {
  const id = kladneId(ligaId);
  const ligy = useData<LigaBloku[]>('/leagues');
  // S vybranou ligou hlavný tím netreba (nenulové id = bez načítania tímov)
  const hlavnyTim = useTimBloku(id ?? null);
  const zoznam = (ligy.data ?? []).filter((l) => l.format !== 'turnaj');
  if (id) return (ligy.data ?? []).find((l) => l.id === id) ?? { id, nazov: '' };
  return zoznam.find((l) => l.tim_id === hlavnyTim) ?? zoznam.find((l) => l.status === 'active') ?? zoznam[0] ?? null;
};

// ===== Tabuľka ligy =====

interface RiadokTabulkyBloku {
  id: number;
  pozicia: number;
  tim_id?: number | null;
  tim_nazov?: string | null;
  custom_tim_nazov?: string | null;
  tim_logo?: string | null;
  zapasy: number;
  vitazstva: number;
  remizy: number;
  prehry: number;
  goly_za: number;
  goly_proti: number;
  body: number;
}

const TabulkaLigy: KomponentBloku = ({ blok: { data } }) => {
  const liga = useLigaBloku(data.liga_id);
  const tabulka = useData<RiadokTabulkyBloku[]>(liga ? `/leagues/${liga.id}/table` : null);
  const riadky = tabulka.data ?? [];
  if (!liga || riadky.length === 0) return null;
  const kompaktna = data.kompaktna === true;
  return (
    <>
      <HlavickaBloku
        nadpis={data.nadpis || liga.nazov || 'Tabuľka'}
        uvod={data.nadpis && liga.nazov ? liga.nazov : undefined}
        odkaz={vsetky(data, `/leagues/${liga.id}`)}
        textOdkazu={data.text_odkazu || 'Celá súťaž'}
      />
      <div className="blok__tabulka-obal">
        <table className="blok__tabulka blok__tabulka--liga">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Tím</th>
              <th scope="col">Z</th>
              {!kompaktna && (
                <>
                  <th scope="col">V</th>
                  <th scope="col">R</th>
                  <th scope="col">P</th>
                  <th scope="col">Skóre</th>
                </>
              )}
              <th scope="col">Body</th>
            </tr>
          </thead>
          <tbody>
            {riadky.map((r) => (
              <tr key={r.id}>
                <td data-stlpec="#">{r.pozicia}.</td>
                <td data-stlpec="Tím" className="blok__tabulka-tim">
                  {r.tim_logo && <Obr src={r.tim_logo} className="blok__tabulka-logo" />}
                  <span>{r.custom_tim_nazov || r.tim_nazov}</span>
                </td>
                <td data-stlpec="Z">{r.zapasy}</td>
                {!kompaktna && (
                  <>
                    <td data-stlpec="V">{r.vitazstva}</td>
                    <td data-stlpec="R">{r.remizy}</td>
                    <td data-stlpec="P">{r.prehry}</td>
                    <td data-stlpec="Skóre">
                      {r.goly_za}:{r.goly_proti}
                    </td>
                  </>
                )}
                <td data-stlpec="Body">
                  <strong>{r.body}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

// ===== Strelci =====

interface StrelecBloku {
  poradie: number;
  pocet: number;
  hrac: { id: number; meno: string; priezvisko: string; cislo_dresu?: number | null; tim?: { nazov: string } | null };
}

const Strelci: KomponentBloku = ({ blok: { data } }) => {
  const liga = useLigaBloku(data.liga_id);
  const typ = data.typ === 'asistencia' ? 'asistencia' : 'gol';
  const pocet = pocetZ(data.pocet, 5, 20);
  const strelci = useData<StrelecBloku[]>(liga ? `/leagues/${liga.id}/top-scorers?typ=${typ}&limit=${pocet}` : null);
  const zoznam = (strelci.data ?? []).slice(0, pocet);
  if (zoznam.length === 0) return null;
  return (
    <>
      <HlavickaBloku
        nadpis={data.nadpis || (typ === 'gol' ? 'Najlepší strelci' : 'Najviac asistencií')}
        uvod={liga?.nazov || undefined}
        odkaz={vsetky(data, liga ? `/leagues/${liga.id}` : null)}
        textOdkazu={data.text_odkazu}
      />
      <div className="blok__tabulka-obal">
        <table className="blok__tabulka blok__tabulka--strelci">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Hráč</th>
              <th scope="col">Tím</th>
              <th scope="col">{typ === 'gol' ? 'Góly' : 'Asist.'}</th>
            </tr>
          </thead>
          <tbody>
            {zoznam.map((s) => (
              <tr key={s.hrac.id}>
                <td data-stlpec="#">{s.poradie}.</td>
                <td data-stlpec="Hráč">
                  <Link to={`/players/${s.hrac.id}`}>
                    {s.hrac.meno} {s.hrac.priezvisko}
                  </Link>
                </td>
                <td data-stlpec="Tím">{s.hrac.tim?.nazov ?? ''}</td>
                <td data-stlpec={typ === 'gol' ? 'Góly' : 'Asist.'}>
                  <strong>{s.pocet}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

// ===== Sezóna v číslach =====

interface ZapasBloku {
  id: number;
  datum_cas: string;
  domaci_tim_id?: number | null;
  hostujuci_tim_id?: number | null;
  goly_domaci: number | null;
  goly_hostia: number | null;
}

const StatistikyTimu: KomponentBloku = ({ blok: { data } }) => {
  const timId = useTimBloku(data.tim_id);
  const zapasy = useData<ZapasBloku[]>(timId ? `/matches?tim_id=${timId}&status=ukonceny&limit=100` : null);
  const cisla = useMemo(() => {
    const s = { zapasy: 0, vyhry: 0, remizy: 0, prehry: 0, za: 0, proti: 0, nula: 0 };
    for (const z of zapasy.data ?? []) {
      if (z.goly_domaci === null || z.goly_hostia === null) continue;
      // Klub je domáci, keď je domáci tím jeho (alebo súper nie je tím klubu)
      const domaci = z.domaci_tim_id === timId || (Boolean(z.domaci_tim_id) && z.hostujuci_tim_id !== timId);
      const nase = domaci ? z.goly_domaci : z.goly_hostia;
      const ich = domaci ? z.goly_hostia : z.goly_domaci;
      s.zapasy++;
      s.za += nase;
      s.proti += ich;
      if (ich === 0) s.nula++;
      if (nase > ich) s.vyhry++;
      else if (nase === ich) s.remizy++;
      else s.prehry++;
    }
    return s;
  }, [zapasy.data, timId]);
  if (cisla.zapasy === 0) return null;
  const polozky: Array<[number | string, string]> = [
    [cisla.zapasy, 'odohraných zápasov'],
    [cisla.vyhry, 'výhier'],
    [cisla.remizy, 'remíz'],
    [cisla.prehry, 'prehier'],
    [`${cisla.za}:${cisla.proti}`, 'skóre'],
    [cisla.nula, 'čistých kont'],
  ];
  return (
    <>
      <HlavickaBloku nadpis={data.nadpis || 'Sezóna v číslach'} odkaz={vsetky(data, `/matches?tim=${timId}&zobrazit=vysledky`)} textOdkazu={data.text_odkazu || 'Všetky výsledky'} />
      <dl className="blok__cisla blok__cisla--sezona">
        {polozky.map(([hodnota, popis]) => (
          <div key={popis} className="blok__polozka">
            <dt>{hodnota}</dt>
            <dd>{popis}</dd>
          </div>
        ))}
      </dl>
    </>
  );
};

// ===== Káder =====

interface HracBloku {
  id: number;
  meno: string;
  priezvisko: string;
  cislo_dresu?: number | null;
  pozicia?: string | null;
  fotka?: string | null;
}

const POZICIE: Record<string, [number, string]> = {
  brankar: [1, 'Brankár'],
  obranca: [2, 'Obranca'],
  stredopoliar: [3, 'Stredopoliar'],
  utocnik: [4, 'Útočník'],
};

const Hraci: KomponentBloku = ({ blok: { data } }) => {
  const timId = useTimBloku(data.tim_id);
  const hraci = useData<{ hraci: HracBloku[] }>(timId ? `/teams/${timId}/players` : null);
  const pocet = pocetZ(data.pocet, 8, 40);
  const zoznam = [...(hraci.data?.hraci ?? [])]
    .sort((a, b) => (POZICIE[a.pozicia ?? '']?.[0] ?? 9) - (POZICIE[b.pozicia ?? '']?.[0] ?? 9) || (a.cislo_dresu ?? 99) - (b.cislo_dresu ?? 99))
    .slice(0, pocet);
  if (zoznam.length === 0) return null;
  return (
    <>
      <HlavickaBloku nadpis={data.nadpis || 'Káder'} odkaz={vsetky(data, `/teams/${timId}`)} textOdkazu={data.text_odkazu || 'Celý káder'} />
      <div className="blok__mriezka blok__mriezka--4 blok__osoby--karty blok__hraci">
        {zoznam.map((h) => (
          <Link key={h.id} to={`/players/${h.id}`} className="blok__polozka blok__osoba">
            <div className="blok__foto">
              {obrazokBloku(h.fotka) ? <Obr src={h.fotka} alt={`${h.meno} ${h.priezvisko}`} /> : <span className="blok__iniciely">{h.cislo_dresu ?? `${h.meno[0] ?? ''}${h.priezvisko[0] ?? ''}`}</span>}
            </div>
            <div className="blok__obsah">
              <span className="blok__funkcia">
                {h.cislo_dresu !== null && h.cislo_dresu !== undefined ? `#${h.cislo_dresu} · ` : ''}
                {POZICIE[h.pozicia ?? '']?.[1] ?? 'Hráč'}
              </span>
              <h3>
                {h.meno} {h.priezvisko}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
};

// ===== Karty médií a produktov =====

interface KartaUdaj {
  kluc: string | number;
  odkaz: string;
  obrazok?: string | null;
  nadpis: string;
  nad?: string;
  text?: string;
}

const KartyUdajov: React.FC<{ nadpis: string; polozky: KartaUdaj[]; viac?: { to: string | null; text: string }; trieda: string }> = ({ nadpis, polozky, viac, trieda }) => (
  <>
    <HlavickaBloku nadpis={nadpis} odkaz={viac?.to} textOdkazu={viac?.text} />
    <div className={`blok__mriezka blok__mriezka--${polozky.length === 4 || polozky.length > 6 ? 4 : 3} blok__karty--klasicke ${trieda}`}>
      {polozky.map((p) => (
        <OdkazBloku key={p.kluc} to={p.odkaz} className="blok__polozka blok__karta">
          {obrazokBloku(p.obrazok) ? (
            <div className="blok__karta-obrazok">
              <Obr src={p.obrazok} alt={p.nadpis} />
            </div>
          ) : (
            <div className="blok__karta-obrazok blok__karta-obrazok--prazdne" aria-hidden="true" />
          )}
          <div className="blok__obsah">
            {p.nad && <small>{p.nad}</small>}
            <h3>{p.nadpis}</h3>
            {p.text && <p>{p.text}</p>}
          </div>
        </OdkazBloku>
      ))}
    </div>
  </>
);

interface VideoBloku {
  id: number;
  nazov: string;
  url: string;
  nahlad?: string | null;
  nahlad_url?: string | null;
  kategoria?: string | null;
  vytvorene?: string;
}

const Videa: KomponentBloku = ({ blok: { data } }) => {
  const pocet = pocetZ(data.pocet, 3, 12);
  const videa = useData<VideoBloku[]>(`/videos?limit=${pocet}`);
  const zoznam = (videa.data ?? []).slice(0, pocet);
  if (zoznam.length === 0) return null;
  return (
    <KartyUdajov
      nadpis={data.nadpis || 'Videá'}
      trieda="blok__videa"
      viac={{ to: odkazVsetkychBloku('videa', data), text: data.text_odkazu || 'Všetky videá' }}
      polozky={zoznam.map((v) => ({ kluc: v.id, odkaz: v.url, obrazok: v.nahlad_url || v.nahlad, nadpis: v.nazov, nad: v.kategoria || datumKratky(v.vytvorene) }))}
    />
  );
};

interface GaleriaBloku {
  id: number;
  nazov: string;
  pocet_obrazkov?: number;
  nahladovy_obrazok?: string | null;
  vytvoreny?: string;
}

const Galerie: KomponentBloku = ({ blok: { data } }) => {
  const pocet = pocetZ(data.pocet, 3, 12);
  const galerie = useData<GaleriaBloku[]>(`/galleries?limit=${pocet}`);
  const zoznam = (galerie.data ?? []).slice(0, pocet);
  if (zoznam.length === 0) return null;
  return (
    <KartyUdajov
      nadpis={data.nadpis || 'Fotogalérie'}
      trieda="blok__galerie"
      viac={{ to: odkazVsetkychBloku('galerie', data), text: data.text_odkazu || 'Všetky galérie' }}
      polozky={zoznam.map((g) => ({
        kluc: g.id,
        odkaz: `/galleries/${g.id}`,
        obrazok: g.nahladovy_obrazok,
        nadpis: g.nazov,
        nad: g.pocet_obrazkov ? `${g.pocet_obrazkov} fotiek` : datumKratky(g.vytvoreny),
      }))}
    />
  );
};

interface ProduktBloku {
  id: number;
  nazov: string;
  slug: string;
  cena: number | string;
  obrazok?: string | null;
  kategoria?: { nazov: string } | null;
}

const Produkty: KomponentBloku = ({ blok: { data } }) => {
  const { nastavenia } = useNastavenia();
  const zapnuty = Boolean(nastavenia.eshop?.zapnuty);
  const pocet = pocetZ(data.pocet, 4, 12);
  const produkty = useData<ProduktBloku[]>(zapnuty ? `/eshop/produkty?limit=${pocet}` : null);
  const zoznam = (produkty.data ?? []).slice(0, pocet);
  if (zoznam.length === 0) return null;
  const mena = nastavenia.eshop?.mena ?? 'EUR';
  return (
    <KartyUdajov
      nadpis={data.nadpis || 'Fanshop'}
      trieda="blok__produkty"
      viac={{ to: odkazVsetkychBloku('produkty', data), text: data.text_odkazu || 'Do obchodu' }}
      polozky={zoznam.map((p) => ({
        kluc: p.id,
        odkaz: `/obchod/${p.slug}`,
        obrazok: p.obrazok,
        nadpis: p.nazov,
        nad: p.kategoria?.nazov,
        text: cenaText(Number(p.cena), mena),
      }))}
    />
  );
};

// ===== Udalosti z kalendára =====

interface UdalostBloku {
  id: number;
  nazov: string;
  datum_vyskytu: string;
  cas_od?: string | null;
  miesto?: string | null;
}

const Udalosti: KomponentBloku = ({ blok: { data } }) => {
  const pocet = pocetZ(data.pocet, 4, 12);
  const od = new Date().toISOString().slice(0, 10);
  const doKedy = new Date(Date.now() + 120 * 86_400_000).toISOString().slice(0, 10);
  const udalosti = useData<UdalostBloku[]>(`/calendar/events?od=${od}&do=${doKedy}`);
  const zoznam = [...(udalosti.data ?? [])].sort((a, b) => a.datum_vyskytu.localeCompare(b.datum_vyskytu)).slice(0, pocet);
  if (zoznam.length === 0) return null;
  return (
    <>
      <HlavickaBloku nadpis={data.nadpis || 'Pripravujeme'} odkaz={odkazVsetkychBloku('udalosti', data)} textOdkazu={data.text_odkazu || 'Celý kalendár'} />
      <ul className="blok__zapasy blok__udalosti">
        {zoznam.map((u) => (
          <li key={`${u.id}-${u.datum_vyskytu}`} className="blok__polozka">
            <Link to="/calendar">
              <small>
                {datumKratky(u.datum_vyskytu)}
                {u.cas_od ? ` · ${u.cas_od.slice(0, 5)}` : ''}
              </small>
              <strong>{u.nazov}</strong>
              {u.miesto && <small>{u.miesto}</small>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
};

export const BLOKY_KLUBU: Record<string, KomponentBloku> = {
  tabulka_ligy: TabulkaLigy,
  strelci: Strelci,
  statistiky_timu: StatistikyTimu,
  hraci: Hraci,
  videa: Videa,
  galerie: Galerie,
  produkty: Produkty,
  udalosti: Udalosti,
};
