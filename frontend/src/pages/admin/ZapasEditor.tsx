// Umiestnenie: frontend/src/pages/admin/ZapasEditor.tsx
// Vytvorenie a úprava zápasu.
//
// Zápas sa zadáva z pohľadu klubu: náš tím, súper (klub mimo databázy
// s vlastným logom, alebo iný náš tím) a či sa hrá doma, vonku, alebo na
// neutrálnej pôde. Na server sa to prekladá na domáci/hosťujúci tím.
//
// Okrem základných údajov: rozhodca, súťaž (z líg alebo vlastná), kolo,
// diváci, stav (automaticky podľa času alebo ručne), výsledok, galéria,
// video, poznámka; zostava (základ / lavička, odohrané minúty, kapitán),
// udalosti hráčov (góly, asistencie, karty, vlastné góly, striedania -
// aj hosťujúcich hráčov) a voľný textový priebeh zápasu.

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Input, Select, Textarea, Icon, Badge,
  Skeleton, ErrorState, ConfirmDialog, useToast,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { zapasyApi, timyApi, ligyApi, hraciApi, stadionyApi } from '../../api/sport';
import { galerieApi } from '../../api/obsah';
import { videaApi } from '../../api/doplnky';
import { ApiChyba } from '../../app/apiKlient';
import { PoleObrazka } from '../../components/admin/PoleObrazka';
import { naVstupDatumCas } from '../../utils/datum';
import { udalostNaUlozenie } from '../../api/typy';
import type {
  Zapas, ZapasNaUlozenie, StavZapasu, UdalostZapasu, UdalostNaUlozenie, TypUdalosti,
  TypZapasu, HracZostavy, TextovaUdalost, Hrac,
} from '../../api/typy';
import './ZapasEditor.css';

const STAVY: Array<{ hodnota: StavZapasu; popis: string }> = [
  { hodnota: 'naplanovany', popis: 'Naplánovaný' },
  { hodnota: 'prebieha', popis: 'Prebieha' },
  { hodnota: 'ukonceny', popis: 'Odohraný' },
  { hodnota: 'odlozeny', popis: 'Odložený' },
  { hodnota: 'zruseny', popis: 'Zrušený' },
];

const MIESTA: Array<{ hodnota: TypZapasu; popis: string }> = [
  { hodnota: 'doma', popis: 'Doma' },
  { hodnota: 'vonku', popis: 'Vonku' },
  { hodnota: 'neutralne', popis: 'Neutrálna pôda' },
];

/** Popisy a symboly typov udalostí. */
export const TYPY_UDALOSTI: Record<TypUdalosti, { popis: string; symbol: string }> = {
  gol: { popis: 'Gól', symbol: '⚽' },
  vlastny_gol: { popis: 'Vlastný gól', symbol: '⚽' },
  asistencia: { popis: 'Asistencia', symbol: '👟' },
  zlta_karta: { popis: 'Žltá karta', symbol: '🟨' },
  cervena_karta: { popis: 'Červená karta', symbol: '🟥' },
  striedanie: { popis: 'Striedanie', symbol: '🔁' },
};

/** Stav podľa času - rovnaké pravidlo ako na serveri. */
const automatickyStav = (datumCas: string): StavZapasu => {
  const zaciatok = new Date(datumCas).getTime();
  if (!datumCas || Number.isNaN(zaciatok) || zaciatok > Date.now()) return 'naplanovany';
  return Date.now() <= zaciatok + 2 * 3600_000 ? 'prebieha' : 'ukonceny';
};

/** Formulár zápasu z pohľadu klubu. */
interface Formular {
  nas_tim_id: number | null;
  typ_zapasu: TypZapasu;
  /** Súper: klub mimo databázy (text + logo), alebo iný náš tím */
  super_typ: 'text' | 'nas';
  super_nazov: string;
  super_tim_id: number | null;
  super_logo: string | null;
  datum: string;
  cas: string;
  stadion_id: number | null;
  miesto: string;
  rozhodca: string;
  liga_id: number | null;
  liga_nazov: string;
  kolo: string;
  pocet_divakov: string;
  /** Góly z pohľadu nášho tímu */
  goly_nas: string;
  goly_super: string;
  /** 'auto' = podľa času, inak ručne zvolený stav */
  stav: 'auto' | StavZapasu;
  fotogaleria_id: number | null;
  video_url: string;
  poznamky: string;
}

const PRAZDNY: Formular = {
  nas_tim_id: null,
  typ_zapasu: 'doma',
  super_typ: 'text',
  super_nazov: '',
  super_tim_id: null,
  super_logo: null,
  datum: '',
  cas: '',
  stadion_id: null,
  miesto: '',
  rozhodca: '',
  liga_id: null,
  liga_nazov: '',
  kolo: '',
  pocet_divakov: '',
  goly_nas: '',
  goly_super: '',
  stav: 'auto',
  fotogaleria_id: null,
  video_url: '',
  poznamky: '',
};

/** Prevedie zápas zo servera na formulár z pohľadu klubu. */
const zoZapasu = (z: Zapas): Formular => {
  const vonku = z.typ_zapasu === 'vonku';
  // Náš tím je pri zápase vonku hosťujúci, inak domáci. Starý zápas, kde je
  // náš tím len na jednej strane, spoznáme podľa vyplneného id.
  let nasJeDomaci = !vonku;
  if (nasJeDomaci && !z.domaci_tim_id && z.hostujuci_tim_id) nasJeDomaci = false;
  if (!nasJeDomaci && !z.hostujuci_tim_id && z.domaci_tim_id) nasJeDomaci = true;

  const nasId = nasJeDomaci ? z.domaci_tim_id : z.hostujuci_tim_id;
  const superId = nasJeDomaci ? z.hostujuci_tim_id : z.domaci_tim_id;
  const superNazov = nasJeDomaci ? z.hostujuci_tim_nazov : z.domaci_tim_nazov;
  const golyNas = nasJeDomaci ? z.goly_domaci : z.goly_hostia;
  const golySuper = nasJeDomaci ? z.goly_hostia : z.goly_domaci;
  const vstup = naVstupDatumCas(z.datum_cas);

  return {
    nas_tim_id: nasId ?? null,
    typ_zapasu: z.typ_zapasu ?? (nasJeDomaci ? 'doma' : 'vonku'),
    super_typ: superId ? 'nas' : 'text',
    super_nazov: superId ? '' : superNazov ?? '',
    super_tim_id: superId ?? null,
    super_logo: z.supier_logo ?? null,
    datum: vstup.slice(0, 10),
    cas: vstup.slice(11, 16),
    stadion_id: z.stadion_id ?? null,
    miesto: z.miesto ?? '',
    rozhodca: z.rozhodca ?? '',
    liga_id: z.liga_id,
    liga_nazov: z.liga_id ? '' : z.liga_nazov ?? '',
    kolo: z.kolo != null ? String(z.kolo) : '',
    pocet_divakov: z.pocet_divakov != null ? String(z.pocet_divakov) : '',
    goly_nas: golyNas != null ? String(golyNas) : '',
    goly_super: golySuper != null ? String(golySuper) : '',
    stav: z.stav_rucne || z.status === 'zruseny' || z.status === 'odlozeny' ? z.status : 'auto',
    fotogaleria_id: z.fotogaleria_id ?? null,
    video_url: z.video_url ?? '',
    poznamky: z.poznamky ?? '',
  };
};

/** Celé nezáporné číslo z textu; '' = null, inak NaN pri chybe. */
const cisloAleboNull = (t: string): number | null => (t.trim() === '' ? null : Number(t));

/** Nová udalosť hráča vo formulári. */
interface NovaUdalost {
  typ: TypUdalosti;
  kto: 'nas' | 'host';
  hrac_id: string;
  meno: string;
  cislo: string;
  minuta: string;
  za_koho_id: string;
  za_koho_meno: string;
}

const PRAZDNA_UDALOST: NovaUdalost = {
  typ: 'gol', kto: 'nas', hrac_id: '', meno: '', cislo: '', minuta: '', za_koho_id: '', za_koho_meno: '',
};

export const ZapasEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const jeNovy = id === 'novy' || id === undefined;
  const idCislo = jeNovy ? null : Number(id);

  const [formular, setFormular] = useState<Formular>(PRAZDNY);
  const [udalosti, setUdalosti] = useState<UdalostNaUlozenie[]>([]);
  const [zostava, setZostava] = useState<HracZostavy[]>([]);
  const [priebeh, setPriebeh] = useState<TextovaUdalost[]>([]);
  const [chybyPoli, setChybyPoli] = useState<string[]>([]);
  const [uklada, setUklada] = useState(false);
  const [zmazatOtvorene, setZmazatOtvorene] = useState(false);
  const [maze, setMaze] = useState(false);

  const [novaUdalost, setNovaUdalost] = useState<NovaUdalost>(PRAZDNA_UDALOST);
  const [novyHost, setNovyHost] = useState({ meno: '', cislo: '', zaradenie: 'zakladna' as HracZostavy['zaradenie'] });
  const [novyText, setNovyText] = useState({ minuta: '', text: '' });

  const timy = useNacitanie((signal) => timyApi.vypis(signal));
  const ligy = useNacitanie((signal) => ligyApi.vypis(signal));
  const hraci = useNacitanie((signal) => hraciApi.vypis(undefined, signal));
  const stadiony = useNacitanie((signal) => stadionyApi.vypis(signal));
  const galerie = useNacitanie((signal) => galerieApi.vypis(signal));
  const videa = useNacitanie((signal) => videaApi.vypis(signal));

  const zapas = useNacitanie(
    (signal) => (idCislo !== null ? zapasyApi.detail(idCislo, signal) : Promise.resolve(null)),
    [idCislo]
  );
  const statistiky = useNacitanie(
    (signal) => (idCislo !== null ? zapasyApi.statistiky(idCislo, signal) : Promise.resolve(null)),
    [idCislo]
  );
  const zostavaServer = useNacitanie(
    (signal) => (idCislo !== null ? zapasyApi.zostava(idCislo, signal) : Promise.resolve(null)),
    [idCislo]
  );
  const priebehServer = useNacitanie(
    (signal) => (idCislo !== null ? zapasyApi.textoveUdalosti(idCislo, signal) : Promise.resolve(null)),
    [idCislo]
  );

  // Naplnenie formulára po načítaní
  useEffect(() => {
    if (zapas.data) setFormular(zoZapasu(zapas.data as Zapas));
  }, [zapas.data]);

  useEffect(() => {
    const s = statistiky.data;
    if (s?.vsetky) setUdalosti(s.vsetky.map((u: UdalostZapasu) => udalostNaUlozenie(u)));
  }, [statistiky.data]);

  useEffect(() => {
    if (zostavaServer.data?.vsetky) setZostava(zostavaServer.data.vsetky);
  }, [zostavaServer.data]);

  useEffect(() => {
    if (priebehServer.data) setPriebeh(priebehServer.data);
  }, [priebehServer.data]);

  // Nový zápas: predvolíme prvý tím
  useEffect(() => {
    if (jeNovy && formular.nas_tim_id === null && (timy.data ?? []).length > 0) {
      setFormular((f) => ({ ...f, nas_tim_id: timy.data![0].id }));
    }
  }, [jeNovy, timy.data, formular.nas_tim_id]);

  const zmen = <K extends keyof Formular>(pole: K, hodnota: Formular[K]) =>
    setFormular((d) => ({ ...d, [pole]: hodnota }));

  const zoznamTimov = timy.data ?? [];
  const zoznamHracov = hraci.data ?? [];
  const nasTim = zoznamTimov.find((t) => t.id === formular.nas_tim_id);
  const superNazov =
    formular.super_typ === 'nas'
      ? zoznamTimov.find((t) => t.id === formular.super_tim_id)?.nazov ?? 'Súper'
      : formular.super_nazov.trim() || 'Súper';

  // Naša strana v zostave podľa miesta zápasu
  const nasaStrana: HracZostavy['strana'] = formular.typ_zapasu === 'vonku' ? 'hostia' : 'domaci';

  /** Hráči nášho tímu - navrchu tí, čo sú v zostave. */
  const hraciTimu = useMemo(
    () => zoznamHracov.filter((h) => h.tim_id === formular.nas_tim_id && (h.stav ?? 'aktivny') === 'aktivny'),
    [zoznamHracov, formular.nas_tim_id]
  );

  const menoHraca = (hracId: number | null | undefined): string => {
    const h = zoznamHracov.find((x) => x.id === hracId);
    if (!h) return hracId ? `Hráč #${hracId}` : '—';
    return `${h.meno} ${h.priezvisko}${h.cislo_dresu ? ` (${h.cislo_dresu})` : ''}`;
  };

  const menoVUdalosti = (u: UdalostNaUlozenie): string =>
    u.hrac_id
      ? menoHraca(u.hrac_id)
      : `${u.hostujuci_hrac_meno ?? '?'}${u.hostujuci_hrac_cislo != null ? ` (${u.hostujuci_hrac_cislo})` : ''} · hosť`;

  // Hráči na výber v udalostiach: najprv zostava, potom zvyšok tímu
  const hraciNaVyber = useMemo(() => {
    const vZostave = new Set(zostava.filter((z) => z.hrac_id).map((z) => z.hrac_id));
    const zoradeni = [...hraciTimu].sort((a, b) => Number(vZostave.has(b.id)) - Number(vZostave.has(a.id)));
    // Ak má udalosť hráča z iného tímu (napr. starší záznam), musí byť v zozname
    const ostatni = zoznamHracov.filter((h) => !hraciTimu.includes(h) && udalosti.some((u) => u.hrac_id === h.id));
    return [...zoradeni, ...ostatni].map((h: Hrac) => ({
      hodnota: h.id,
      popis: `${h.meno} ${h.priezvisko}${h.cislo_dresu ? ` (${h.cislo_dresu})` : ''}${vZostave.has(h.id) ? '' : ' – mimo zostavy'}`,
    }));
  }, [hraciTimu, zostava, zoznamHracov, udalosti]);

  const zoradeneUdalosti = useMemo(
    () =>
      udalosti
        .map((u, index) => ({ u, index }))
        .sort((a, b) => (a.u.minuta ?? 999) - (b.u.minuta ?? 999)),
    [udalosti]
  );

  // ===== Udalosti hráčov =====

  const pridajUdalost = () => {
    const n = novaUdalost;
    const minuta = cisloAleboNull(n.minuta);
    if (minuta !== null && (!Number.isInteger(minuta) || minuta < 1 || minuta > 130)) {
      varovanie('Minúta musí byť celé číslo 1 – 130');
      return;
    }

    const udalost: UdalostNaUlozenie = { typ: n.typ, minuta, hrac_id: null };
    if (n.kto === 'nas') {
      if (!n.hrac_id) {
        varovanie('Vyberte hráča');
        return;
      }
      udalost.hrac_id = Number(n.hrac_id);
    } else {
      if (!n.meno.trim()) {
        varovanie('Zadajte meno hosťujúceho hráča');
        return;
      }
      const cislo = cisloAleboNull(n.cislo);
      if (cislo !== null && (!Number.isInteger(cislo) || cislo < 0 || cislo > 999)) {
        varovanie('Číslo dresu musí byť 0 – 999');
        return;
      }
      udalost.hostujuci_hrac_meno = n.meno.trim();
      udalost.hostujuci_hrac_cislo = cislo;
    }

    if (n.typ === 'striedanie') {
      if (n.za_koho_id) udalost.striedany_hrac_id = Number(n.za_koho_id);
      else if (n.za_koho_meno.trim()) udalost.striedany_hrac_meno = n.za_koho_meno.trim();
      else {
        varovanie('Pri striedaní vyberte aj hráča, ktorý odchádza');
        return;
      }
    }

    setUdalosti((d) => [...d, udalost]);
    // Typ a „kto" necháme - pri zápise viacerých gólov netreba vyberať znova
    setNovaUdalost((d) => ({ ...PRAZDNA_UDALOST, typ: d.typ, kto: d.kto }));
  };

  // ===== Zostava =====

  const vZostave = (hracId: number) => zostava.find((z) => z.hrac_id === hracId);

  const prepniVZostave = (hrac: Hrac, zaradenie: HracZostavy['zaradenie'] | null) => {
    setZostava((z) => {
      const bez = z.filter((x) => x.hrac_id !== hrac.id);
      if (!zaradenie) return bez;
      const povodny = z.find((x) => x.hrac_id === hrac.id);
      return [...bez, { ...(povodny ?? {}), strana: nasaStrana, hrac_id: hrac.id, zaradenie }];
    });
  };

  const upravZostavu = (kluc: (x: HracZostavy) => boolean, zmeny: Partial<HracZostavy>) =>
    setZostava((z) => z.map((x) => (kluc(x) ? { ...x, ...zmeny } : x)));

  const pridajHosta = () => {
    if (!novyHost.meno.trim()) {
      varovanie('Zadajte meno hráča');
      return;
    }
    const cislo = cisloAleboNull(novyHost.cislo);
    if (cislo !== null && (!Number.isInteger(cislo) || cislo < 0 || cislo > 999)) {
      varovanie('Číslo dresu musí byť 0 – 999');
      return;
    }
    setZostava((z) => [
      ...z,
      { strana: nasaStrana, hrac_id: null, hostujuci_hrac_meno: novyHost.meno.trim(), hostujuci_hrac_cislo: cislo, zaradenie: novyHost.zaradenie },
    ]);
    setNovyHost({ meno: '', cislo: '', zaradenie: novyHost.zaradenie });
  };

  const hostiaVZostave = zostava.filter((z) => !z.hrac_id);
  const pocetZaklad = zostava.filter((z) => z.zaradenie === 'zakladna').length;

  // ===== Textový priebeh =====

  const pridajText = () => {
    const minuta = cisloAleboNull(novyText.minuta);
    if (minuta !== null && (!Number.isInteger(minuta) || minuta < 0 || minuta > 150)) {
      varovanie('Minúta musí byť celé číslo 0 – 150');
      return;
    }
    if (!novyText.text.trim()) {
      varovanie('Napíšte text udalosti');
      return;
    }
    setPriebeh((p) => [...p, { minuta, text: novyText.text.trim(), poradie: p.length }]);
    setNovyText({ minuta: '', text: '' });
  };

  const zoradenyPriebeh = [...priebeh]
    .map((p, index) => ({ p, index }))
    .sort((a, b) => (a.p.minuta ?? 999) - (b.p.minuta ?? 999) || a.index - b.index);

  // ===== Uloženie =====

  const uloz = async () => {
    setChybyPoli([]);
    const f = formular;

    if (!f.nas_tim_id) return varovanie('Vyberte náš tím');
    if (f.super_typ === 'text' && f.super_nazov.trim().length < 2) return varovanie('Zadajte názov súpera');
    if (f.super_typ === 'nas' && !f.super_tim_id) return varovanie('Vyberte súpera');
    if (f.super_typ === 'nas' && f.super_tim_id === f.nas_tim_id) return varovanie('Súper nemôže byť ten istý tím');
    if (!f.datum) return varovanie('Zadajte dátum zápasu');
    if (!f.liga_id && f.liga_nazov.trim().length < 2) return varovanie('Vyberte súťaž alebo zadajte jej názov');

    const golyNas = cisloAleboNull(f.goly_nas);
    const golySuper = cisloAleboNull(f.goly_super);
    const kolo = cisloAleboNull(f.kolo);
    const divaci = cisloAleboNull(f.pocet_divakov);
    for (const [hodnota, popis] of [[golyNas, 'Góly'], [golySuper, 'Góly'], [kolo, 'Kolo'], [divaci, 'Počet divákov']] as const) {
      if (hodnota !== null && (!Number.isInteger(hodnota) || hodnota < 0)) return varovanie(`${popis}: zadajte celé nezáporné číslo`);
    }
    if ((golyNas === null) !== (golySuper === null)) return varovanie('Zadajte skóre oboch tímov, alebo nechajte obe prázdne');
    if (f.video_url.trim() && !/^https?:\/\//i.test(f.video_url.trim())) return varovanie('Odkaz na video musí začínať https://');

    const datumCas = new Date(`${f.datum}T${f.cas || '00:00'}`).toISOString();
    const stav: StavZapasu = f.stav === 'auto' ? automatickyStav(datumCas) : f.stav;
    if (stav === 'ukonceny' && golyNas === null) return varovanie('Odohraný zápas musí mať zadaný výsledok');

    const nasJeDomaci = f.typ_zapasu !== 'vonku';
    const nas = { id: f.nas_tim_id };
    const superStrana =
      f.super_typ === 'nas'
        ? { id: f.super_tim_id, nazov: null as string | null }
        : { id: null, nazov: f.super_nazov.trim() };

    const udaje: ZapasNaUlozenie = {
      nazov: nasJeDomaci ? `${nasTim?.nazov ?? ''} – ${superNazov}` : `${superNazov} – ${nasTim?.nazov ?? ''}`,
      datum_cas: datumCas,
      typ_zapasu: f.typ_zapasu,
      status: stav,
      stav_rucne: f.stav !== 'auto',
      domaci_tim_id: nasJeDomaci ? nas.id : superStrana.id,
      domaci_tim_nazov: nasJeDomaci ? null : superStrana.nazov,
      hostujuci_tim_id: nasJeDomaci ? superStrana.id : nas.id,
      hostujuci_tim_nazov: nasJeDomaci ? superStrana.nazov : null,
      supier_logo: f.super_typ === 'text' ? f.super_logo : null,
      goly_domaci: nasJeDomaci ? golyNas : golySuper,
      goly_hostia: nasJeDomaci ? golySuper : golyNas,
      stadion_id: f.stadion_id,
      miesto: f.miesto.trim() || null,
      rozhodca: f.rozhodca.trim() || null,
      liga_id: f.liga_id,
      liga_nazov: f.liga_id ? null : f.liga_nazov.trim(),
      kolo,
      pocet_divakov: divaci,
      fotogaleria_id: f.fotogaleria_id,
      video_url: f.video_url.trim() || null,
      poznamky: f.poznamky.trim() || null,
    };

    setUklada(true);
    try {
      let zapasId = idCislo;
      if (jeNovy) {
        const vytvoreny = await zapasyApi.vytvor(udaje);
        zapasId = (vytvoreny as any).id;
      } else {
        await zapasyApi.uprav(idCislo!, udaje);
      }

      // Zostava, udalosti a priebeh sa ukladajú samostatne - chyba v nich
      // nesmie zhodiť už uložený zápas
      const chyby: string[] = [];
      if (zapasId) {
        const strany = zostava.map((z) => ({ ...z, strana: z.hrac_id || !z.strana ? nasaStrana : z.strana }));
        await zapasyApi.ulozZostavu(zapasId, strany).catch((e) => chyby.push(`zostava: ${e?.message}`));
        await zapasyApi.ulozStatistiky(zapasId, udalosti).catch((e) => chyby.push(`udalosti: ${e?.message}`));
        await zapasyApi
          .ulozTextoveUdalosti(zapasId, priebeh.map((p, i) => ({ minuta: p.minuta, text: p.text, poradie: i })))
          .catch((e) => chyby.push(`priebeh: ${e?.message}`));
      }

      if (chyby.length) hlasChybu(`Zápas uložený, ale nie všetko: ${chyby.join('; ')}`);
      else uspech(jeNovy ? 'Zápas bol vytvorený' : 'Zmeny boli uložené');

      if (jeNovy && zapasId) {
        navigate(`/admin/zapasy/${zapasId}`, { replace: true });
      } else {
        zapas.obnov();
        statistiky.obnov();
        zostavaServer.obnov();
        priebehServer.obnov();
      }
    } catch (e: unknown) {
      if (e instanceof ApiChyba) {
        hlasChybu(e.message);
        if (e.chybyPoli) setChybyPoli(e.chybyPoli);
      } else {
        hlasChybu('Zápas sa nepodarilo uložiť');
      }
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async () => {
    setMaze(true);
    try {
      await zapasyApi.zmaz(idCislo!);
      uspech('Zápas bol vymazaný');
      navigate('/admin/zapasy', { replace: true });
    } catch (e: any) {
      hlasChybu(e?.message || 'Zápas sa nepodarilo vymazať');
      setMaze(false);
    }
  };

  if (zapas.chyba) {
    return <ErrorState sprava="Zápas sa nepodarilo načítať" detail={zapas.chyba} onSkusZnova={zapas.obnov} />;
  }

  if (!jeNovy && zapas.nacitava) {
    return (
      <div className="cw-zed__panel">
        <Skeleton riadkov={8} vyska="18px" />
      </div>
    );
  }

  const nasDomaci = formular.typ_zapasu !== 'vonku';
  const nazovDomacich = nasDomaci ? nasTim?.nazov ?? 'Náš tím' : superNazov;
  const nazovHosti = nasDomaci ? superNazov : nasTim?.nazov ?? 'Náš tím';
  const datumIso = formular.datum ? new Date(`${formular.datum}T${formular.cas || '00:00'}`).toISOString() : '';
  const autoStav = STAVY.find((s) => s.hodnota === automatickyStav(datumIso))?.popis ?? '';
  const videaZapasu = (videa.data ?? []).filter((v) => idCislo && v.zapas_id === idCislo);
  const golyVstup = (pole: 'goly_nas' | 'goly_super', menovka: string) => (
    <Input
      menovka={menovka}
      inputMode="numeric"
      value={formular[pole]}
      onChange={(e) => zmen(pole, e.target.value)}
      placeholder="—"
    />
  );

  return (
    <div className="cw-zed">
      {/* ===== Lišta akcií ===== */}
      <div className="cw-ced__bar">
        <button className="cw-ced__spat" onClick={() => navigate('/admin/zapasy')}>
          <Icon nazov="sipkaVlavo" velkost={15} />
          Späť
        </button>

        <h1 className="cw-zed__nadpis">{jeNovy ? 'Nový zápas' : `${nazovDomacich} – ${nazovHosti}`}</h1>

        {zapas.data?.actual_status === 'prebieha' && <Badge ton="danger" zivy>Prebieha</Badge>}

        <div className="cw-ced__medzera" />

        {!jeNovy && (
          <button className="cw-ced__btn" onClick={() => navigate(`/admin/zapasy/${idCislo}/live`)}>
            <Icon nazov="live" velkost={15} />
            Živý záznam
          </button>
        )}

        {!jeNovy && (
          <button
            className="cw-ced__btn cw-ced__btn--nebezpecne"
            onClick={() => setZmazatOtvorene(true)}
            aria-label="Vymazať zápas"
          >
            <Icon nazov="zmazat" velkost={15} />
          </button>
        )}

        <button className="cw-ced__btn cw-ced__btn--hlavne" onClick={uloz} disabled={uklada}>
          <Icon nazov="ulozit" velkost={15} />
          {uklada ? 'Ukladám…' : 'Uložiť zápas'}
        </button>
      </div>

      {chybyPoli.length > 0 && (
        <div className="cw-ced__chyby" role="alert">
          <strong>Server odmietol uloženie:</strong>
          <ul>
            {chybyPoli.map((ch, i) => (
              <li key={i}>{ch}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="cw-zed__grid">
        <div className="cw-zed__hlavne">
          {/* ===== Základné údaje ===== */}
          <div className="cw-zed__panel">
            <div className="cw-zed__panel-nadpis">Zápas</div>
            <div className="cw-zed__row">
              <Select
                menovka="Náš tím"
                value={formular.nas_tim_id ?? ''}
                onChange={(e) => zmen('nas_tim_id', e.target.value ? Number(e.target.value) : null)}
                prazdna="Vyberte tím"
                moznosti={zoznamTimov.map((t) => ({ hodnota: t.id, popis: `${t.nazov} (${t.vekova_kategoria})` }))}
                povinne
              />
              <Select
                menovka="Kde sa hrá"
                value={formular.typ_zapasu}
                onChange={(e) => zmen('typ_zapasu', e.target.value as TypZapasu)}
                moznosti={MIESTA}
              />
            </div>

            <div className="cw-zed__row">
              <Select
                menovka="Súper je"
                value={formular.super_typ}
                onChange={(e) => zmen('super_typ', e.target.value as Formular['super_typ'])}
                moznosti={[
                  { hodnota: 'text', popis: 'Iný klub' },
                  { hodnota: 'nas', popis: 'Náš tím (interný zápas)' },
                ]}
              />
              {formular.super_typ === 'text' ? (
                <Input
                  menovka="Súper"
                  value={formular.super_nazov}
                  onChange={(e) => zmen('super_nazov', e.target.value)}
                  placeholder="Napríklad: FK Rača"
                  povinne
                />
              ) : (
                <Select
                  menovka="Súper"
                  value={formular.super_tim_id ?? ''}
                  onChange={(e) => zmen('super_tim_id', e.target.value ? Number(e.target.value) : null)}
                  prazdna="Vyberte tím"
                  moznosti={zoznamTimov
                    .filter((t) => t.id !== formular.nas_tim_id)
                    .map((t) => ({ hodnota: t.id, popis: `${t.nazov} (${t.vekova_kategoria})` }))}
                  povinne
                />
              )}
            </div>

            {formular.super_typ === 'text' && (
              <PoleObrazka
                menovka="Logo súpera"
                hodnota={formular.super_logo}
                onZmena={(cesta) => zmen('super_logo', cesta)}
              />
            )}

            <div className="cw-zed__row">
              <Input
                menovka="Dátum"
                type="date"
                value={formular.datum}
                onChange={(e) => zmen('datum', e.target.value)}
                povinne
              />
              <Input
                menovka="Čas výkopu"
                type="time"
                value={formular.cas}
                onChange={(e) => zmen('cas', e.target.value)}
              />
            </div>

            <div className="cw-zed__row">
              {formular.typ_zapasu === 'doma' ? (
                <Select
                  menovka="Štadión"
                  value={formular.stadion_id ?? ''}
                  onChange={(e) => zmen('stadion_id', e.target.value ? Number(e.target.value) : null)}
                  prazdna="Domáci štadión tímu"
                  moznosti={(stadiony.data ?? []).map((s) => ({ hodnota: s.id, popis: s.nazov }))}
                  napoveda="Bez výberu sa použije štadión nastavený pri tíme"
                />
              ) : (
                <Input
                  menovka="Miesto konania"
                  value={formular.miesto}
                  onChange={(e) => zmen('miesto', e.target.value)}
                  placeholder={formular.typ_zapasu === 'vonku' ? 'Štadión súpera' : 'Napríklad: NTC Poprad'}
                />
              )}
              <Input
                menovka="Rozhodca"
                value={formular.rozhodca}
                onChange={(e) => zmen('rozhodca', e.target.value)}
                placeholder="Nepovinné"
              />
            </div>
          </div>

          {/* ===== Zostava ===== */}
          <div className="cw-zed__panel">
            <div className="cw-zed__panel-nadpis">
              Zostava {nasTim ? `· ${nasTim.nazov}` : ''}
              <span className="cw-zed__pocet">{pocetZaklad} v základe · {zostava.length - pocetZaklad} na lavičke</span>
            </div>
            <p className="cw-zed__panel-popis">
              Kto nastúpil v základnej zostave a kto bol na lavičke. Odohrané minúty sú nepovinné.
            </p>

            {!formular.nas_tim_id ? (
              <p className="cw-zed__prazdne">Najprv vyberte náš tím.</p>
            ) : hraciTimu.length === 0 && hostiaVZostave.length === 0 ? (
              <p className="cw-zed__prazdne">Tím nemá žiadnych aktívnych hráčov. Pridajte ich v sekcii Hráči alebo pridajte hosťujúceho hráča.</p>
            ) : (
              <div className="cw-zed__zostava-wrap">
                <table className="cw-zed__zostava">
                  <thead>
                    <tr>
                      <th>Hráč</th>
                      <th>Zaradenie</th>
                      <th>Minúty</th>
                      <th>Kapitán</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hraciTimu.map((h) => {
                      const z = vZostave(h.id);
                      return (
                        <tr key={h.id} className={z ? '' : 'is-mimo'}>
                          <td>
                            <span className="cw-zed__cislo">{h.cislo_dresu ?? '–'}</span> {h.meno} {h.priezvisko}
                          </td>
                          <td>
                            <select
                              className="cw-zed__mini"
                              value={z?.zaradenie ?? ''}
                              onChange={(e) => prepniVZostave(h, (e.target.value || null) as HracZostavy['zaradenie'] | null)}
                              aria-label={`Zaradenie – ${h.meno} ${h.priezvisko}`}
                            >
                              <option value="">Nehral</option>
                              <option value="zakladna">Základ</option>
                              <option value="lavicka">Lavička</option>
                            </select>
                          </td>
                          <td>
                            <input
                              className="cw-zed__mini cw-zed__mini--cislo"
                              inputMode="numeric"
                              disabled={!z}
                              value={z?.odohrane_minuty ?? ''}
                              onChange={(e) =>
                                upravZostavu((x) => x.hrac_id === h.id, {
                                  odohrane_minuty: e.target.value === '' ? null : Number(e.target.value),
                                })
                              }
                              aria-label={`Minúty – ${h.meno} ${h.priezvisko}`}
                            />
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              disabled={!z}
                              checked={Boolean(z?.kapitan)}
                              onChange={(e) =>
                                setZostava((zs) => zs.map((x) => ({ ...x, kapitan: x.hrac_id === h.id ? e.target.checked : e.target.checked ? false : x.kapitan })))
                              }
                              aria-label={`Kapitán – ${h.meno} ${h.priezvisko}`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                    {hostiaVZostave.map((z, i) => (
                      <tr key={`host-${i}`}>
                        <td>
                          <span className="cw-zed__cislo">{z.hostujuci_hrac_cislo ?? '–'}</span> {z.hostujuci_hrac_meno}{' '}
                          <Badge>hosť</Badge>
                        </td>
                        <td>
                          <select
                            className="cw-zed__mini"
                            value={z.zaradenie}
                            onChange={(e) =>
                              e.target.value
                                ? upravZostavu((x) => x === z, { zaradenie: e.target.value as HracZostavy['zaradenie'] })
                                : setZostava((zs) => zs.filter((x) => x !== z))
                            }
                            aria-label={`Zaradenie – ${z.hostujuci_hrac_meno}`}
                          >
                            <option value="">Odstrániť</option>
                            <option value="zakladna">Základ</option>
                            <option value="lavicka">Lavička</option>
                          </select>
                        </td>
                        <td>
                          <input
                            className="cw-zed__mini cw-zed__mini--cislo"
                            inputMode="numeric"
                            value={z.odohrane_minuty ?? ''}
                            onChange={(e) =>
                              upravZostavu((x) => x === z, { odohrane_minuty: e.target.value === '' ? null : Number(e.target.value) })
                            }
                            aria-label={`Minúty – ${z.hostujuci_hrac_meno}`}
                          />
                        </td>
                        <td />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="cw-zed__host">
              <Input
                menovka="Hosťujúci hráč"
                value={novyHost.meno}
                onChange={(e) => setNovyHost((h) => ({ ...h, meno: e.target.value }))}
                placeholder="Meno hráča mimo súpisky"
              />
              <Input
                menovka="Číslo"
                inputMode="numeric"
                value={novyHost.cislo}
                onChange={(e) => setNovyHost((h) => ({ ...h, cislo: e.target.value }))}
              />
              <Select
                menovka="Zaradenie"
                value={novyHost.zaradenie}
                onChange={(e) => setNovyHost((h) => ({ ...h, zaradenie: e.target.value as HracZostavy['zaradenie'] }))}
                moznosti={[
                  { hodnota: 'zakladna', popis: 'Základ' },
                  { hodnota: 'lavicka', popis: 'Lavička' },
                ]}
              />
              <Button variant="secondary" onClick={pridajHosta} ikona={<Icon nazov="plus" velkost={15} />}>
                Pridať
              </Button>
            </div>
          </div>

          {/* ===== Udalosti hráčov ===== */}
          <div className="cw-zed__panel">
            <div className="cw-zed__panel-nadpis">Udalosti hráčov</div>
            <p className="cw-zed__panel-popis">
              Góly, asistencie, karty, vlastné góly a striedania. Zobrazia sa na webe a v štatistikách hráčov.
            </p>

            <div className="cw-zed__udalost-form cw-zed__udalost-form--siroky">
              <Select
                menovka="Udalosť"
                value={novaUdalost.typ}
                onChange={(e) => setNovaUdalost((d) => ({ ...d, typ: e.target.value as TypUdalosti }))}
                moznosti={(Object.keys(TYPY_UDALOSTI) as TypUdalosti[]).map((t) => ({
                  hodnota: t,
                  popis: `${TYPY_UDALOSTI[t].symbol} ${TYPY_UDALOSTI[t].popis}`,
                }))}
              />
              <Select
                menovka={novaUdalost.typ === 'striedanie' ? 'Prichádza' : 'Hráč je'}
                value={novaUdalost.kto}
                onChange={(e) => setNovaUdalost((d) => ({ ...d, kto: e.target.value as NovaUdalost['kto'] }))}
                moznosti={[
                  { hodnota: 'nas', popis: 'Z našej súpisky' },
                  { hodnota: 'host', popis: 'Hosť (meno a číslo)' },
                ]}
              />
              {novaUdalost.kto === 'nas' ? (
                <Select
                  menovka="Hráč"
                  value={novaUdalost.hrac_id}
                  onChange={(e) => setNovaUdalost((d) => ({ ...d, hrac_id: e.target.value }))}
                  prazdna="Vyberte hráča"
                  moznosti={hraciNaVyber}
                />
              ) : (
                <>
                  <Input
                    menovka="Meno hráča"
                    value={novaUdalost.meno}
                    onChange={(e) => setNovaUdalost((d) => ({ ...d, meno: e.target.value }))}
                  />
                  <Input
                    menovka="Číslo"
                    inputMode="numeric"
                    value={novaUdalost.cislo}
                    onChange={(e) => setNovaUdalost((d) => ({ ...d, cislo: e.target.value }))}
                  />
                </>
              )}
              {novaUdalost.typ === 'striedanie' && (
                <>
                  <Select
                    menovka="Odchádza"
                    value={novaUdalost.za_koho_id}
                    onChange={(e) => setNovaUdalost((d) => ({ ...d, za_koho_id: e.target.value }))}
                    prazdna="Hosť – napíšte meno →"
                    moznosti={hraciNaVyber}
                  />
                  {!novaUdalost.za_koho_id && (
                    <Input
                      menovka="Meno odchádzajúceho"
                      value={novaUdalost.za_koho_meno}
                      onChange={(e) => setNovaUdalost((d) => ({ ...d, za_koho_meno: e.target.value }))}
                    />
                  )}
                </>
              )}
              <Input
                menovka="Minúta"
                inputMode="numeric"
                value={novaUdalost.minuta}
                onChange={(e) => setNovaUdalost((d) => ({ ...d, minuta: e.target.value }))}
                placeholder="—"
              />
              <Button variant="secondary" onClick={pridajUdalost} ikona={<Icon nazov="plus" velkost={15} />}>
                Pridať
              </Button>
            </div>

            {statistiky.nacitava ? (
              <Skeleton riadkov={3} />
            ) : zoradeneUdalosti.length === 0 ? (
              <p className="cw-zed__prazdne">Zatiaľ žiadne udalosti.</p>
            ) : (
              <ul className="cw-zed__udalosti">
                {zoradeneUdalosti.map(({ u, index }) => (
                  <li key={index} className="cw-zed__udalost">
                    <span className="cw-zed__minuta">{u.minuta != null ? `${u.minuta}'` : '—'}</span>
                    <span className="cw-zed__symbol" aria-hidden="true">{TYPY_UDALOSTI[u.typ]?.symbol}</span>
                    <span className="cw-zed__typ">{TYPY_UDALOSTI[u.typ]?.popis ?? u.typ}</span>
                    <span className="cw-zed__hrac">
                      {menoVUdalosti(u)}
                      {u.typ === 'striedanie' && (
                        <> ↔ {u.striedany_hrac_id ? menoHraca(u.striedany_hrac_id) : u.striedany_hrac_meno ?? '?'}</>
                      )}
                    </span>
                    <button
                      className="cw-zed__odobrat"
                      onClick={() => setUdalosti((d) => d.filter((_, i) => i !== index))}
                      aria-label="Odobrať udalosť"
                    >
                      <Icon nazov="zavriet" velkost={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ===== Priebeh zápasu (voľný text) ===== */}
          <div className="cw-zed__panel">
            <div className="cw-zed__panel-nadpis">Priebeh zápasu</div>
            <p className="cw-zed__panel-popis">
              Voľné poznámky k priebehu, napríklad „20' Tyčka Nováka" alebo „Prerušenie pre dážď".
            </p>
            <div className="cw-zed__text-form">
              <Input
                menovka="Minúta"
                inputMode="numeric"
                value={novyText.minuta}
                onChange={(e) => setNovyText((t) => ({ ...t, minuta: e.target.value }))}
                placeholder="—"
              />
              <Input
                menovka="Text udalosti"
                value={novyText.text}
                onChange={(e) => setNovyText((t) => ({ ...t, text: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && pridajText()}
              />
              <Button variant="secondary" onClick={pridajText} ikona={<Icon nazov="plus" velkost={15} />}>
                Pridať
              </Button>
            </div>
            {zoradenyPriebeh.length === 0 ? (
              <p className="cw-zed__prazdne">Zatiaľ žiadne poznámky k priebehu.</p>
            ) : (
              <ul className="cw-zed__udalosti">
                {zoradenyPriebeh.map(({ p, index }) => (
                  <li key={index} className="cw-zed__udalost cw-zed__udalost--text">
                    <span className="cw-zed__minuta">{p.minuta != null ? `${p.minuta}'` : '—'}</span>
                    <span className="cw-zed__hrac">{p.text}</span>
                    <button
                      className="cw-zed__odobrat"
                      onClick={() => setPriebeh((d) => d.filter((_, i) => i !== index))}
                      aria-label="Odobrať poznámku"
                    >
                      <Icon nazov="zavriet" velkost={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ===== Bočný panel ===== */}
        <div className="cw-zed__bok">
          <div className="cw-zed__panel">
            <div className="cw-zed__panel-nadpis">Výsledok</div>
            <div className="cw-zed__skore">
              {nasDomaci ? golyVstup('goly_nas', nazovDomacich) : golyVstup('goly_super', nazovDomacich)}
              <span className="cw-zed__dvojbodka">:</span>
              {nasDomaci ? golyVstup('goly_super', nazovHosti) : golyVstup('goly_nas', nazovHosti)}
            </div>

            <Select
              menovka="Stav zápasu"
              value={formular.stav}
              onChange={(e) => zmen('stav', e.target.value as Formular['stav'])}
              moznosti={[
                { hodnota: 'auto', popis: `Automaticky podľa času${autoStav ? ` (${autoStav})` : ''}` },
                ...STAVY.map((s) => ({ hodnota: s.hodnota, popis: `Ručne: ${s.popis}` })),
              ]}
              napoveda="Automatika prepne zápas na odohraný 2 hodiny po výkope. Ručne zvolený stav sa nemení."
            />
          </div>

          <div className="cw-zed__panel">
            <div className="cw-zed__panel-nadpis">Súťaž</div>
            <Select
              menovka="Súťaž"
              value={formular.liga_id ?? ''}
              onChange={(e) => zmen('liga_id', e.target.value ? Number(e.target.value) : null)}
              prazdna="Vlastná súťaž →"
              moznosti={(ligy.data ?? []).map((l) => ({ hodnota: l.id, popis: `${l.nazov} (${l.sezona})` }))}
            />
            {!formular.liga_id && (
              <Input
                menovka="Názov súťaže"
                value={formular.liga_nazov}
                onChange={(e) => zmen('liga_nazov', e.target.value)}
                placeholder="Napríklad: Priateľský zápas"
              />
            )}
            <div className="cw-zed__row">
              <Input
                menovka="Kolo"
                inputMode="numeric"
                value={formular.kolo}
                onChange={(e) => zmen('kolo', e.target.value)}
                placeholder="—"
              />
              <Input
                menovka="Diváci"
                inputMode="numeric"
                value={formular.pocet_divakov}
                onChange={(e) => zmen('pocet_divakov', e.target.value)}
                placeholder="—"
              />
            </div>
          </div>

          <div className="cw-zed__panel">
            <div className="cw-zed__panel-nadpis">Galéria a video</div>
            <Select
              menovka="Fotogaléria"
              value={formular.fotogaleria_id ?? ''}
              onChange={(e) => zmen('fotogaleria_id', e.target.value ? Number(e.target.value) : null)}
              prazdna="Bez galérie"
              moznosti={(galerie.data ?? []).map((g) => ({ hodnota: g.id, popis: g.nazov }))}
            />
            <Input
              menovka="Odkaz na video"
              value={formular.video_url}
              onChange={(e) => zmen('video_url', e.target.value)}
              placeholder="https://youtube.com/…"
            />
            {videaZapasu.length > 0 && (
              <div className="cw-zed__videa">
                Videá priradené v Videogalérii: {videaZapasu.map((v) => v.nazov).join(', ')}
              </div>
            )}
          </div>

          <div className="cw-zed__panel">
            <div className="cw-zed__panel-nadpis">Poznámka</div>
            <Textarea
              menovka="Poznámka k zápasu"
              value={formular.poznamky}
              onChange={(e) => zmen('poznamky', e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        otvorene={zmazatOtvorene}
        nadpis="Vymazať zápas?"
        sprava="Zápas bude odstránený. Ak patrí do ligy, tabuľka sa automaticky prepočíta."
        potvrdit="Vymazať"
        nebezpecne
        nacitava={maze}
        onPotvrd={zmaz}
        onZrus={() => setZmazatOtvorene(false)}
      />
    </div>
  );
};

export default ZapasEditor;
