// Umiestnenie: frontend/src/api/typy.ts
// Typy odpovedí API.
//
// Odzrkadľujú skutočný tvar dát z backendu. Pri zmene modelu na serveri
// sa chyba objaví hneď pri kompilácii, nie až za behu na produkcii.

// ===== Stránkovanie =====

/**
 * Stránkovanie. Backend ho vracia ako súrodenca `data`, nie ako jeho súčasť,
 * a pre všetky zoznamy má rovnaký tvar.
 */
export interface Strankovanie {
  /** Celkový počet záznamov (nie len tých na tejto stránke). */
  total: number;
  limit: number;
  offset: number;
  /** Počet stránok. */
  pages: number;
  current_page: number;
  has_next: boolean;
  has_prev: boolean;
}

/**
 * Jednotná obálka odpovede z API.
 *
 * `data` je priamo tá vec, o ktorú ide - entita pri detaile, pole pri zozname.
 * `pagination` stojí vedľa nej, nie v nej.
 */
export interface OdpovedApi<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: unknown[];
  pagination?: Strankovanie;
}

// ===== Prehľadové štatistiky =====

export interface Statistiky {
  totalArticles: number;
  publishedArticles: number;
  totalUsers: number;
  totalTeams: number;
  totalPlayers: number;
  totalStaff: number;
  totalLeagues: number;
  totalMatches: number;
  finishedMatches: number;
  upcomingMatches: number;
  lastUpdate: string;
}

// ===== Kategória =====

export interface Kategoria {
  id: number;
  nazov: string;
  slug: string;
  popis: string | null;
  farba: string | null;
  ikona: string | null;
  poradie: number;
  /** Vracia len administrátorský výpis. */
  pocet_clankov?: number;
}

// ===== Článok =====

export type StavClanku = 'draft' | 'published' | 'archived';

/**
 * Článok vo výpise.
 *
 * Administratívny výpis vracia aj obsah a stav, verejný nie —
 * preto sú tie polia voliteľné.
 */
export interface ClanokVoVypise {
  id: number;
  nazov: string;
  slug: string;
  excerpt: string | null;
  obrazok: string | null;
  status?: StavClanku;
  publikovany_datum: string | null;
  views: number;
  featured: boolean;
  autor: { id: number; meno: string } | null;
  kategoria: { id: number; nazov: string; farba?: string | null } | null;
  tags: string[];
  vytvoreny: string;
}

/** Článok v editore — vrátane celého obsahu. */
export interface Clanok extends ClanokVoVypise {
  obsah: string;
  status: StavClanku;
  kategoria_id: number | null;
  /** Voliteľné priradenie článku k tímu (napr. reportáž z jeho zápasu). */
  tim_id?: number | null;
  /** Komentáre sú pri novom článku vypnuté, zapínajú sa vedome. */
  komentare_povolene?: boolean;
  meta_title: string | null;
  meta_description: string | null;
  aktualizovany?: string;
}

/** Údaje pri vytváraní a úprave článku. */
export interface ClanokNaUlozenie {
  nazov: string;
  obsah: string;
  excerpt?: string | null;
  obrazok?: string | null;
  kategoria_id: number | null;
  tim_id?: number | null;
  status: StavClanku;
  publikovany_datum?: string | null;
  featured?: boolean;
  komentare_povolene?: boolean;
  meta_title?: string | null;
  meta_description?: string | null;
  tags?: string[];
}

// ===== Zápas =====

export interface ZapasVoVypise {
  id: number;
  nazov: string;
  datum_cas: string;
  status: 'naplanovany' | 'prebieha' | 'ukonceny' | 'odlozeny' | 'zruseny';
  goly_domaci: number | null;
  goly_hostia: number | null;
  domaci_tim_nazov: string | null;
  hostujuci_tim_nazov: string | null;
  liga_nazov: string | null;
  miesto: string | null;
  kolo: number | null;
}

// ===== Tím =====

export interface Tim {
  id: number;
  nazov: string;
  slug: string;
  typ: string;
  vekova_kategoria: string;
  popis: string | null;
  stadion_id: number | null;
  sezona_id: number | null;
  logo: string | null;
  farba_prva: string | null;
  farba_druha: string | null;
  poradie: number;
  aktivity: boolean;
}

// ===== Štadión =====

export interface Stadion {
  id: number;
  nazov: string;
  adresa: string | null;
  fotka: string | null;
  kapacita: number | null;
  poznamka: string | null;
  aktivity: boolean;
}

// ===== Archív =====

export type TypArchivu = 'timy' | 'hraci' | 'realizacny-tim' | 'ligy' | 'stadiony' | 'sezony' | 'turnaje';

export interface PolozkaArchivu {
  typ: TypArchivu;
  typ_nazov: string;
  id: number;
  nazov: string;
  detail: string | null;
  archivovane: string | null;
}

// ===== Hráč =====

export interface Hrac {
  id: number;
  meno: string;
  priezvisko: string;
  /** Skladá ho backend — meno a priezvisko spolu */
  full_name?: string;
  datum_narodenia: string;
  /** Dopočítaný vek. Pri maloletých ho backend môže vynechať. */
  vek?: number;
  rok_narodenia?: number;
  cislo_dresu: number | null;
  pozicia: string;
  narodnost: string | null;
  vyska: number | null;
  vaha: number | null;
  fotka: string | null;
  tim_id: number;
  datum_pripojenia: string | null;
  datum_odpojenia: string | null;
  stav: 'aktivny' | 'neaktivny';
  poznamky: string | null;
  aktivity: boolean;
  /** Príznaky z filtrovania osobných údajov detí */
  fotka_skryta_bez_suhlasu?: boolean;
  meno_skratene_bez_suhlasu?: boolean;
}

// ===== Liga =====

export type RezimTabulky = 'plna' | 'len_body';

export interface Liga {
  id: number;
  nazov: string;
  /** Názov sezóny, napr. "2026/2027" */
  sezona: string;
  sezona_id: number | null;
  /** Náš tím, ktorého sa súťaž týka */
  tim_id: number | null;
  typ: 'sutaz' | 'pohar' | 'priatelska' | string;
  popis: string | null;
  format: string;
  status: string;
  farba: string | null;
  logo: string | null;
  pocet_timov: number | null;
  body_za_vitazstvo: number;
  body_za_remizy: number;
  body_za_prehru: number;
  auto_update_tabulka: boolean;
  zobrazit_formu: boolean;
  rezim_tabulky: RezimTabulky;
  datum_start: string | null;
  datum_koniec: string | null;
  aktivity: boolean;
}

// ===== Zápas (plný tvar) =====

export type StavZapasu = 'naplanovany' | 'prebieha' | 'ukonceny' | 'odlozeny' | 'zruseny';

export interface Zapas {
  id: number;
  nazov: string;
  datum_cas: string;
  status: StavZapasu;
  /** Stav prepočítaný podľa času — backend ho dopĺňa */
  actual_status?: StavZapasu;
  kolo: number | null;
  miesto: string | null;

  liga_id: number | null;
  liga_nazov: string | null;
  liga_display_name?: string | null;

  domaci_tim_id: number | null;
  domaci_tim_nazov: string | null;
  domaci_tim_display_name?: string | null;

  hostujuci_tim_id: number | null;
  hostujuci_tim_nazov: string | null;
  hostujuci_tim_display_name?: string | null;

  goly_domaci: number | null;
  goly_hostia: number | null;
  /** Textový výsledok, napríklad „3:1" */
  vysledok?: string;
  vitaz?: string | null;

  pocet_divakov: number | null;
  poznamky: string | null;
  video_url: string | null;
  /** Kde sa hrá - pri „doma" sa miesto doplní zo štadióna tímu */
  typ_zapasu?: TypZapasu;
  stadion_id?: number | null;
  rozhodca?: string | null;
  /** Logo súpera, ktorý nie je náš tím */
  supier_logo?: string | null;
  fotogaleria_id?: number | null;
  clanok_id?: number | null;
  /** Stav určil človek - automatika ho nemení */
  stav_rucne?: boolean;
  aktivity: boolean;
}

export type TypZapasu = 'doma' | 'vonku' | 'neutralne';

/** Údaje pri vytváraní a úprave zápasu. */
export interface ZapasNaUlozenie {
  nazov?: string;
  datum_cas?: string;
  status?: StavZapasu;
  kolo?: number | null;
  miesto?: string | null;
  liga_id?: number | null;
  liga_nazov?: string | null;
  domaci_tim_id?: number | null;
  domaci_tim_nazov?: string | null;
  hostujuci_tim_id?: number | null;
  hostujuci_tim_nazov?: string | null;
  goly_domaci?: number | null;
  goly_hostia?: number | null;
  pocet_divakov?: number | null;
  poznamky?: string | null;
  video_url?: string | null;
  typ_zapasu?: TypZapasu;
  stadion_id?: number | null;
  rozhodca?: string | null;
  supier_logo?: string | null;
  fotogaleria_id?: number | null;
  stav_rucne?: boolean;
}

// ===== Štatistika zápasu =====

export type TypUdalosti =
  | 'gol' | 'vlastny_gol' | 'asistencia' | 'zlta_karta' | 'cervena_karta' | 'striedanie';

export interface UdalostZapasu {
  id: number;
  zapas_id: number;
  /** Náš hráč; pri hosťujúcom hráčovi null a platí meno nižšie */
  hrac_id: number | null;
  hostujuci_hrac_meno?: string | null;
  hostujuci_hrac_cislo?: number | null;
  typ: TypUdalosti;
  /** Pri striedaní: hráč, ktorý odchádza z ihriska */
  striedany_hrac_id?: number | null;
  striedany_hrac_meno?: string | null;
  minuta: number | null;
  poznamka: string | null;
  hrac?: {
    id: number;
    meno: string;
    priezvisko: string;
    cislo_dresu: number | null;
    tim_id?: number;
  } | null;
}

/** Udalosť pri odosielaní na server. */
export interface UdalostNaUlozenie {
  hrac_id: number | null;
  hostujuci_hrac_meno?: string | null;
  hostujuci_hrac_cislo?: number | null;
  typ: TypUdalosti;
  striedany_hrac_id?: number | null;
  striedany_hrac_meno?: string | null;
  minuta?: number | null;
  poznamka?: string | null;
}

/** Uložená udalosť v tvare na opätovné odoslanie - zachová aj hosťa a striedanie. */
export const udalostNaUlozenie = (u: UdalostZapasu | UdalostNaUlozenie): UdalostNaUlozenie => ({
  hrac_id: u.hrac_id ?? null,
  hostujuci_hrac_meno: u.hostujuci_hrac_meno ?? null,
  hostujuci_hrac_cislo: u.hostujuci_hrac_cislo ?? null,
  typ: u.typ,
  striedany_hrac_id: u.striedany_hrac_id ?? null,
  striedany_hrac_meno: u.striedany_hrac_meno ?? null,
  minuta: u.minuta ?? null,
  poznamka: u.poznamka ?? null,
});

/** Hráč v zostave zápasu. */
export interface HracZostavy {
  id?: number;
  strana: 'domaci' | 'hostia';
  hrac_id: number | null;
  hostujuci_hrac_meno?: string | null;
  hostujuci_hrac_cislo?: number | null;
  zaradenie: 'zakladna' | 'lavicka';
  odohrane_minuty?: number | null;
  kapitan?: boolean;
  poznamka?: string | null;
  hrac?: { id: number; meno: string; priezvisko: string; cislo_dresu: number | null } | null;
}

/** Voľná textová udalosť priebehu zápasu. */
export interface TextovaUdalost {
  id?: number;
  minuta: number | null;
  text: string;
  poradie?: number;
}

export interface StatistikyZapasu {
  zapas_id: number;
  vsetky: UdalostZapasu[];
  podla_typu: {
    goly: UdalostZapasu[];
    vlastne_goly: UdalostZapasu[];
    asistencie: UdalostZapasu[];
    zlte_karty: UdalostZapasu[];
    cervene_karty: UdalostZapasu[];
  };
  pocet: number;
}

// ===== Používateľ =====

export type RolaPouzivatela = 'admin' | 'redaktor' | 'trener' | 'uzivatel';

export type AkciaOpravnenia = 'citat' | 'pisat' | 'mazat';
export type MapaOpravneni = Record<string, Partial<Record<AkciaOpravnenia, boolean>>>;

/** Rola z tabuľky rolí - názov a oprávnenia po moduloch. */
export interface RolaSOpravneniami {
  id: number;
  nazov: string;
  kod: string;
  popis: string | null;
  opravnenia: MapaOpravneni;
  je_systemova: boolean;
  poradie: number;
  pocet_pouzivatelov?: number;
}

export interface Pouzivatel {
  id: number;
  meno: string;
  priezvisko?: string | null;
  email: string;
  rola: RolaPouzivatela;
  rola_id?: number | null;
  /** Oprávnenia roly - posiela ich /auth/me a prihlásenie */
  opravnenia?: MapaOpravneni;
  rola_nazov?: string;
  tim_id: number | null;
  aktivity: boolean;
  posledne_prihlasenie: string | null;
  vytvoreny: string;
}

// ===== Licencia =====

export interface StavLicencie {
  povolene: boolean;
  dovod: string;
  plan: string | null;
  funkcie: string[];
  platnaDo: string | null;
  dniDoVyprsania: number | null;
  poslednyUspesnyKontakt: number | null;
}

// ===== Nastavenia klubu =====

export interface NastaveniaAdmin {
  id: number;
  nazov: string;
  skratka: string | null;
  slogan: string | null;
  rok_zalozenia: number | null;
  logo: string | null;
  favicon: string | null;
  farba_primarna: string;
  farba_sekundarna: string;
  farba_akcent: string;
  farba_primarna_kontrast: string;
  farba_akcent_kontrast: string;
  email: string | null;
  telefon: string | null;
  adresa: string | null;
  ico: string | null;
  dic: string | null;
  /** Oficiálny názov organizácie (napr. občianske združenie) */
  pravny_nazov: string | null;
  ic_dph: string | null;
  iban: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  x_url: string | null;
  tiktok_url: string | null;
  meta_popis: string | null;
  google_analytics_id: string | null;
  /** Dodatkové farby šablóny - kľúč → #RRGGBB, v CSS ako --club-extra-<kľúč> */
  dodatkove_farby: Record<string, string>;
}

// ===== Sezóna =====

export interface Sezona {
  id: number;
  nazov: string;
  zaciatok: string | null;
  koniec: string | null;
  aktualna: boolean;
  uzavreta: boolean;
  poznamka: string | null;
  /** Odvodený stav, ktorý dopĺňa server */
  stav?: 'aktivna' | 'neaktivna' | 'archivovana';
}

export interface ZaznamSupisky {
  id: number;
  sezona_id: number;
  tim_id: number;
  hrac_id: number;
  cislo_dresu: number | null;
  pozicia: string | null;
  kapitan: boolean;
  aktivny: boolean;
  hrac?: { id: number; meno: string; priezvisko: string; fotka: string | null };
  tim?: { id: number; nazov: string; vekova_kategoria: string };
  sezona?: { id: number; nazov: string; aktualna: boolean };
}

// ===== Súhlasy (GDPR) =====

export type DruhSuhlasu =
  | 'zverejnenie_fotky'
  | 'zverejnenie_mena'
  | 'spracovanie_udajov'
  | 'kontaktne_udaje'
  | 'marketing';

export interface Suhlas {
  id: number | null;
  druh: DruhSuhlasu;
  udeleny: boolean;
  platny: boolean;
  udelil_meno: string | null;
  udelil_vztah: string | null;
  datum_udelenia: string | null;
  datum_odvolania: string | null;
  platny_do: string | null;
  zdroj: string | null;
}

export interface PrehladSuhlasov {
  hrac: { id: number; meno: string; priezvisko: string };
  /** Pole prichádza zo servera s diakritikou v názve */
  'maloletý': boolean;
  suhlasy: Suhlas[];
}

export interface AuditnyZaznam {
  id: number;
  pouzivatel_id: number | null;
  pouzivatel_email: string | null;
  akcia: string;
  entita: string;
  entita_id: number | null;
  popis: string | null;
  ip_adresa: string | null;
  vytvoreny: string;
}

// ===== Stránka =====

export interface Stranka {
  id: number;
  nazov: string;
  slug: string;
  obsah?: string;
  excerpt?: string | null;
  v_menu: boolean;
  poradie_menu: number | null;
  publikovany: boolean;
  /** Server vracia aj tieto odvodené príznaky */
  is_published?: boolean;
  is_in_menu?: boolean;
  url?: string;
  word_count?: number;
  meta_title: string | null;
  meta_description: string | null;
  vytvoreny: string;
}

// ===== Galéria =====

export interface Galeria {
  id: number;
  nazov: string;
  slug: string;
  popis: string | null;
  /** Server používa názov nahladovy_obrazok, nie obrazok */
  nahladovy_obrazok: string | null;
  pocit_obrazkov?: number;
  pocet_obrazkov: number;
  /** Väzba na tím, článok alebo zápas — galéria môže byť aj voľná */
  tim_id: number | null;
  clanok_id: number | null;
  zapas_id: number | null;
  typ_priradenia: string;
  /** Zobrazuje sa na webe? (skrytie - nie zmazanie) */
  zobrazit_na_webe: boolean;
  aktivity: boolean;
  vytvoreny: string;
}

/** Fotka v galérii. Cesty sú celé (/uploads/...). */
export interface GaleriaObrazok {
  id: number;
  galeria_id: number;
  nazov: string | null;
  /** Popis pod fotkou */
  popis: string | null;
  cesta_suboru: string;
  nahladovy_maly: string | null;
  nahladovy_stredny: string | null;
  poradie: number;
  je_nahladovy: boolean;
  sirka: number | null;
  vyska: number | null;
}

/** Súbor v Media knižnici. */
export interface MediaSubor {
  id: number;
  nazov: string;
  originalny_nazov: string;
  cesta: string;
  typ: 'obrazok' | 'dokument' | 'ine';
  mime_typ?: string;
  /** Veľkosť v bajtoch */
  velkost?: number;
  velkost_kb?: number;
  sirka: number | null;
  vyska: number | null;
  alt_text: string | null;
  popis?: string | null;
  autor_id?: number | null;
  autor?: { id: number; meno: string } | null;
  /** Počet článkov, v ktorých je súbor použitý (vo výpise knižnice) */
  pocet_clankov?: number;
  vytvoreny: string;
  aktualizovany?: string;
}

/** Kde všade je súbor použitý - detail v knižnici médií. */
export interface PouzitieMedia {
  clanky: number;
  clanky_ako_hlavny_obrazok: number;
  clanky_v_texte: number;
  stranky: number;
  galerie: number;
  dokumenty: number;
  /** Logá a fotky tímov, hráčov, sponzorov a pod. */
  ine: number;
  spolu: number;
}

export interface MediaDetail extends MediaSubor {
  pouzitie: PouzitieMedia;
}

// ===== Realizačný tím =====

export interface ClenRealizacnehoTimu {
  id: number;
  meno: string;
  priezvisko: string;
  funkcia: string;
  tim_id: number | null;
  email: string | null;
  telefon: string | null;
  datum_narodenia: string | null;
  narodnost: string | null;
  datum_pripojenia: string | null;
  datum_odpojenia: string | null;
  sezona_id: number | null;
  kvalifikacia: string | null;
  fotka: string | null;
  poradie: number;
  aktivity: boolean;
}

// ===== Riadok ligovej tabuľky =====

export interface RiadokTabulky {
  id: number;
  liga_id: number;
  tim_id: number | null;
  custom_tim_nazov: string | null;
  custom_tim_logo: string | null;
  /** Názov a logo tímu - z nášho tímu alebo zadané ručne */
  tim_nazov?: string | null;
  tim_logo?: string | null;
  pozicia: number;
  body: number;
  skutocne_body?: number;
  zapasy: number;
  vitazstva: number;
  remizy: number;
  prehry: number;
  goly_za: number;
  goly_proti: number;
  goly_rozdiel: number;
  forma: string | null;
  penalizacne_body: number;
  bonus_body?: number;
  manualne_upravene: boolean;
  tim?: { id: number; nazov: string; logo: string | null };
}

/** Riadok tabuľky pri úprave - nový riadok má dočasné id "temp-…" */
export type RiadokNaUlozenie = Partial<Omit<RiadokTabulky, 'id'>> & { id?: number | string };

// ===== Sekcia KLUB =====

/** Pôvodná pevná úroveň - nahradila ju spravovateľná UrovenPartnerstva */
export type UrovenSponzora = 'generalny' | 'hlavny' | 'partner' | 'dodavatel';

export type VelkostLoga = 'velke' | 'stredne' | 'male';

/** Úroveň partnerstva, ktorú si klub spravuje sám. */
export interface UrovenPartnerstva {
  id: number;
  nazov: string;
  popis: string | null;
  /** Poradie na webe - nižšie číslo vyššie */
  poradie: number;
  velkost_loga: VelkostLoga;
  aktivity: boolean;
}

export interface Sponzor {
  id: number;
  nazov: string;
  uroven?: UrovenSponzora | null;
  uroven_id: number | null;
  logo: string | null;
  web_url: string | null;
  popis: string | null;
  platny_od: string | null;
  platny_do: string | null;
  poradie: number;
  aktivity: boolean;
}

export interface Dokument {
  id: number;
  nazov: string;
  popis: string | null;
  subor_url: string;
  typ_suboru: string | null;
  velkost_kb: number | null;
  /** Staršia voľná kategória - nové dokumenty používajú kategoria_id */
  kategoria: string | null;
  kategoria_id: number | null;
  verejny: boolean;
  pocet_stiahnuti: number;
  poradie: number;
  aktivity: boolean;
  vytvoreny: string;
}

export interface KategoriaDokumentu {
  id: number;
  nazov: string;
  popis: string | null;
  poradie: number;
  aktivity: boolean;
}

export interface MoznostAnkety {
  id: string;
  text: string;
  hlasy: number;
}

export interface Anketa {
  id: number;
  otazka: string;
  moznosti: MoznostAnkety[];
  otvorena: boolean;
  publikovana: boolean;
  platna_od: string | null;
  platna_do: string | null;
  celkom_hlasov: number;
  vytvorena: string;
}

export type TypClenstva = 'fanusik' | 'clen' | 'vip' | 'cestny';

export interface Fanusik {
  id: number;
  meno: string;
  priezvisko: string;
  email: string;
  telefon: string | null;
  typ_clenstva: TypClenstva;
  cislo_karty: string | null;
  clenstvo_od: string | null;
  clenstvo_do: string | null;
  suhlas_oznamy: boolean;
  poznamka: string | null;
  aktivity: boolean;
  vytvoreny: string;
}

// ===== Komentáre, videá, turnaje =====

export type StavKomentara = 'caka' | 'schvaleny' | 'zamietnuty' | 'spam';

export interface Komentar {
  id: number;
  clanok_id: number;
  autor_meno: string;
  autor_email: string | null;
  obsah: string;
  stav: StavKomentara;
  rodic_id: number | null;
  /** Kedy autor naposledy upravil text (vtedy ide komentár znova na schválenie). */
  upraveny_autorom?: string | null;
  vytvoreny: string;
  clanok?: { id: number; nazov: string; slug: string };
}

export type ZdrojVidea = 'youtube' | 'vimeo' | 'ine';

export interface Video {
  id: number;
  nazov: string;
  popis: string | null;
  url: string;
  zdroj: ZdrojVidea;
  video_id: string | null;
  nahlad: string | null;
  /** Adresu náhľadu dopĺňa server — pri YouTube ju vie odvodiť */
  nahlad_url?: string | null;
  dlzka: number | null;
  /** Pôvodná voľná kategória - len pre staré záznamy */
  kategoria: string | null;
  rubrika_id: number | null;
  rubrika?: { id: number; nazov: string; slug: string; farba: string | null } | null;
  zapas_id: number | null;
  zapas?: { id: number; nazov: string; datum_cas: string } | null;
  publikovane: boolean;
  poradie: number;
  vytvorene: string;
}

/** Čo server zistí z odkazu na video. */
export interface ZisteneVideo {
  zdroj: ZdrojVidea;
  video_id: string | null;
  nazov: string | null;
  nahlad: string | null;
  dlzka: number | null;
}

export type TypTurnaja = 'single_elimination' | 'double_elimination' | 'round_robin' | 'groups_playoff';
export type StavTurnaja = 'pripravuje' | 'prebiehajuci' | 'ukonceny' | 'pozastaveny';

export interface Turnaj {
  id: number;
  liga_id: number | null;
  nazov: string;
  popis: string | null;
  logo: string | null;
  sezona_id: number | null;
  /** Náš tím v turnaji */
  tim_id: number | null;
  typ: TypTurnaja;
  pocet_timov: number;
  pocet_postupujucich: number | null;
  pocet_skupin: number | null;
  ma_tretie_miesto: boolean;
  aktualna_faza: string;
  status: StavTurnaja;
  datum_start: string | null;
  datum_koniec: string | null;
  zobrazit_na_webe: boolean;
  vitaz_nazov: string | null;
  poznamky: string | null;
  /** Len vo výpise */
  ma_pavuka?: boolean;
  pocet_skupin_realne?: number;
  liga?: { id: number; nazov: string; sezona: string } | null;
}

/** Tím v turnaji - náš (tim_id) alebo klub zadaný menom. */
export interface TimTurnaja {
  nazov: string;
  tim_id: number | null;
  logo: string | null;
}

export interface ZapasPavuka {
  kod: string;
  domaci: TimTurnaja | null;
  hostia: TimTurnaja | null;
  skore_domaci: number | null;
  skore_hostia: number | null;
  vitaz: 'domaci' | 'hostia' | null;
  postupuje_do: string | null;
  zapas_id?: number | null;
}

export interface PavukTurnaja {
  kola: Array<{ nazov: string; poradie: number; zapasy: ZapasPavuka[] }>;
  o_tretie?: ZapasPavuka | null;
}

export interface ZapasSkupiny {
  kod: string;
  kolo: number;
  domaci: number;
  hostia: number;
  skore_domaci: number | null;
  skore_hostia: number | null;
  zapas_id?: number | null;
}

export interface RiadokSkupiny {
  poradie: number;
  tim: TimTurnaja;
  zapasy: number;
  vyhry: number;
  remizy: number;
  prehry: number;
  goly_za: number;
  goly_proti: number;
  body: number;
  postupuje: boolean;
}

export interface SkupinaTurnaja {
  nazov: string;
  timy: TimTurnaja[];
  zapasy: ZapasSkupiny[];
  tabulka: RiadokSkupiny[];
}

/** Turnaj so skupinami a pavúkom (detail). */
export interface TurnajDetail extends Turnaj {
  skupiny: { postupuju: number; skupiny: SkupinaTurnaja[] };
  pavuk: PavukTurnaja;
}

// ===== Kalendár =====

export type TypOpakovania = 'ziadne' | 'denne' | 'tyzdenne' | 'dvojtyzdenne' | 'mesacne';

/** Vlastná udalosť kalendára (tréning, stretnutie…). */
export interface UdalostKalendara {
  id: number;
  nazov: string;
  popis: string | null;
  tim_id: number | null;
  /** Dátum prvého výskytu (RRRR-MM-DD) */
  datum: string;
  cas_od: string | null;
  cas_do: string | null;
  miesto: string | null;
  opakovanie: TypOpakovania;
  opakovanie_do: string | null;
  tim?: { id: number; nazov: string; farba: string | null } | null;
  /** Pri výpise za obdobie: konkrétny deň výskytu opakovanej udalosti */
  datum_vyskytu?: string;
  farba?: string | null;
}

// ===== Formuláre =====

export type TypPolaFormulara =
  | 'text' | 'textarea' | 'email' | 'telefon' | 'cislo'
  | 'datum' | 'vyber' | 'zaskrtavacie' | 'suhlas';

export interface PoleFormulara {
  /** Kľúč v uložených odpovediach - pri úprave sa nemení */
  kod: string;
  nazov: string;
  typ: TypPolaFormulara;
  popis?: string | null;
  povinne?: boolean;
  moznosti?: string[];
}

export interface Formular {
  id: number;
  nazov: string;
  /** Adresa na webe: /formular/{slug} */
  slug: string;
  popis: string | null;
  polia: PoleFormulara[];
  sprava_po_odoslani: string | null;
  email_pre_notifikacie?: string | null;
  /** Vypnutý formulár sa zobrazí, ale neprijíma odpovede */
  aktivny: boolean;
  vytvoreny?: string;
  aktualizovany?: string;
  pocet_odpovedi?: number;
  pocet_neprecitanych?: number;
}

export interface OdpovedFormulara {
  id: number;
  formular_id: number;
  udaje: Record<string, string | string[] | boolean>;
  precitane: boolean;
  ip_adresa: string | null;
  vytvorena: string;
}
