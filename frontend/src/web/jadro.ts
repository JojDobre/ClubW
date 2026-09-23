// Umiestnenie: frontend/src/web/jadro.ts
// Rozhranie jadra pre šablóny - modul „@clubw/jadro".
//
// Všetko, čo šablóna od systému potrebuje, ide odtiaľto: adresy API,
// nastavenia klubu, menu, formuláre, ankety, komentáre... Šablóna tak
// nezávisí od vnútornej štruktúry frontendu a jadro sa môže meniť bez
// toho, aby sa šablóny rozbili.
//
// Základná šablóna sa zostavuje spolu s webom - import „@clubw/jadro"
// v nej vedie priamo sem. Nahraté šablóny sú zostavené zvlášť a ten istý
// import v nich vedie na window.ClubW.jadro (pozri WebApp.tsx).
//
// ZMENY: čo tu raz je, sa nemaže ani nemení nekompatibilne - šablóny
// tretích strán by prestali fungovať. Pri nekompatibilnej zmene treba
// zvýšiť API_SABLON na backende (services/sablony.ts).

// ===== Šablóna =====
export { Cast, useSablona, useNastaveniaSablony, registrujSablonu, ukonciNahlad } from './SablonaKontext';
export type { CastiSablony, NazovCasti, DefiniciaSablony, AktivnaSablona, HodnotaNastavenia } from './typy';

// ===== Adresy servera =====
export { apiUrl, souborUrl, API_BASE_URL } from '../config/api';

// ===== Nastavenia klubu (názov, logo, farby, kontakt, sociálne siete) =====
export { useNastavenia } from '../context/NastaveniaContext';
export type { NastaveniaKlubu, FarbyKlubu } from '../context/NastaveniaContext';

// ===== Pomôcky =====
export { useMenuWebu, OdkazMenu, otvorNastaveniaCookies, jePrihlaseny, useData } from './pomocky';
export type { PolozkaMenu } from './pomocky';
export { useMediaQuery, useJeMobil } from '../hooks/useMediaQuery';
export { sanitizeHtml, sanitizedHtmlProps } from '../utils/sanitize';
export { skusPresmerovat } from '../utils/presmerovanie';
export {
  ligaApi,
  getAvailableSeasons,
  formatTypLigy,
  formatFormatLigy,
  formatStatusLigy,
  formatDate,
  formatObdobie,
} from '../services/ligaApi';
export type { Liga } from '../services/ligaApi';
export type { Strankovanie } from '../api/typy';

// ===== Hotové súčasti webu =====
// Obsah stránky/článku so značkami [formular slug] a [anketa ID]
export { FormularWeb, ObsahSFormularmi } from '../components/FormularWeb';
export { AnketaWeb } from '../components/AnketaWeb';
export { KomentarePodClankom } from '../components/KomentarePodClankom';
export { default as ZapasPriebeh } from '../components/ZapasPriebeh';

/** Verzia rozhrania šablón (zhodná s API_SABLON na serveri). */
export const VERZIA_ROZHRANIA = 1;
