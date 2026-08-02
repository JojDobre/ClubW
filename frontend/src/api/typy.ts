// Umiestnenie: frontend/src/api/typy.ts
// Typy odpovedí API.
//
// Odzrkadľujú skutočný tvar dát z backendu. Pri zmene modelu na serveri
// sa chyba objaví hneď pri kompilácii, nie až za behu na produkcii.

// ===== Stránkovanie =====

export interface Strankovanie {
  currentPage: number;
  totalPages: number;
  /** Celkový počet záznamov. Názov poľa sa medzi endpointmi líši. */
  totalArticles?: number;
  total?: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
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
  status: StavClanku;
  publikovany_datum?: string | null;
  featured?: boolean;
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
  logo: string | null;
  farba_prva: string | null;
  farba_druha: string | null;
  poradie: number;
  aktivity: boolean;
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
  poznamky: string | null;
  aktivity: boolean;
  /** Príznaky z filtrovania osobných údajov detí */
  fotka_skryta_bez_suhlasu?: boolean;
  meno_skratene_bez_suhlasu?: boolean;
}

// ===== Liga =====

export interface Liga {
  id: number;
  nazov: string;
  sezona: string;
  typ: string;
  format: string;
  status: string;
  farba: string | null;
  logo: string | null;
  pocet_timov: number | null;
  body_za_vitazstvo: number;
  body_za_remizy: number;
  auto_update_tabulka: boolean;
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
  aktivity: boolean;
}

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
}

// ===== Štatistika zápasu =====

export type TypUdalosti = 'gol' | 'vlastny_gol' | 'asistencia' | 'zlta_karta' | 'cervena_karta';

export interface UdalostZapasu {
  id: number;
  zapas_id: number;
  hrac_id: number;
  typ: TypUdalosti;
  minuta: number | null;
  poznamka: string | null;
  hrac?: {
    id: number;
    meno: string;
    priezvisko: string;
    cislo_dresu: number | null;
    tim_id?: number;
  };
}

/** Udalosť pri odosielaní na server. */
export interface UdalostNaUlozenie {
  hrac_id: number;
  typ: TypUdalosti;
  minuta?: number | null;
  poznamka?: string | null;
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

export interface Pouzivatel {
  id: number;
  meno: string;
  email: string;
  rola: RolaPouzivatela;
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
  facebook_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  x_url: string | null;
  meta_popis: string | null;
  google_analytics_id: string | null;
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
  aktivity: boolean;
  vytvoreny: string;
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
  pozicia: number;
  body: number;
  zapasy: number;
  vitazstva: number;
  remizy: number;
  prehry: number;
  goly_za: number;
  goly_proti: number;
  goly_rozdiel: number;
  forma: string | null;
  penalizacne_body: number;
  manualne_upravene: boolean;
  tim?: { id: number; nazov: string; logo: string | null };
}

// ===== Sekcia KLUB =====

export type UrovenSponzora = 'generalny' | 'hlavny' | 'partner' | 'dodavatel';

export interface Sponzor {
  id: number;
  nazov: string;
  uroven: UrovenSponzora;
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
  kategoria: string | null;
  verejny: boolean;
  pocet_stiahnuti: number;
  poradie: number;
  aktivity: boolean;
  vytvoreny: string;
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
  kategoria: string | null;
  zapas_id: number | null;
  publikovane: boolean;
  poradie: number;
  vytvorene: string;
}

export type TypTurnaja = 'single_elimination' | 'double_elimination' | 'round_robin' | 'groups_playoff';
export type StavTurnaja = 'pripravuje' | 'prebiehajuci' | 'ukonceny' | 'pozastaveny';

export interface Turnaj {
  id: number;
  liga_id: number;
  nazov: string;
  typ: TypTurnaja;
  pocet_timov: number;
  pocet_postupujucich: number | null;
  pocet_skupin: number | null;
  ma_tretie_miesto: boolean;
  aktualna_faza: string;
  status: StavTurnaja;
  datum_start: string | null;
  liga?: { id: number; nazov: string; sezona: string };
}
