// Umiestnenie: frontend/src/api/emaily.ts
// Volania API sekcie E-MAILY (nastavenia, šablóny, odoslané, hromadné).

import api from '../app/apiKlient';

export type ZabezpecenieSmtp = 'auto' | 'ssl' | 'starttls' | 'ziadne';

export interface StavEmailov {
  nastavene: boolean;
  zdroj: 'administracia' | 'env' | null;
  server: string | null;
  odosielatel: string | null;
  /** Vývoj bez SMTP - e-maily sa vypisujú do konzoly servera */
  vyvoj: boolean;
  caka: number;
  chyby_24h: number;
  odoslane_24h: number;
  posledna_chyba: string | null;
  posledna_chyba_cas: string | null;
}

export interface NastaveniaEmailov {
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_zabezpecenie: ZabezpecenieSmtp;
  smtp_pouzivatel: string | null;
  ma_heslo: boolean;
  odosielatel_meno: string | null;
  odosielatel_email: string | null;
  odpovedat_na: string | null;
  pata: string | null;
  limit_za_minutu: number;
  /** SMTP nastavené v súbore .env na serveri (použije sa, keď je formulár prázdny) */
  env: { host: string; port: string; pouzivatel: string | null } | null;
}

export type UlozenieNastaveni = Partial<Omit<NastaveniaEmailov, 'ma_heslo' | 'env'>> & { heslo?: string; zmazat_heslo?: boolean };

export type SkupinaSablony = 'administracia' | 'formulare' | 'eshop' | 'fanusikovia';

export interface SablonaEmailu {
  kluc: string;
  skupina: SkupinaSablony;
  komu: 'klub' | 'pouzivatel' | 'zakaznik' | 'fanusik';
  vypnutelna: boolean;
  upravena: boolean;
  aktivna: boolean;
  predmet: string;
  aktualizovany: string | null;
}

export interface DetailSablony extends SablonaEmailu {
  obsah: string;
  znacky: string[];
  spolocne_znacky: string[];
  predvoleny_predmet: string;
  predvoleny_obsah: string;
  ukazka: Record<string, string>;
}

export interface HotovyEmail {
  predmet: string;
  text: string;
  html: string;
}

export type StavZaznamu = 'caka' | 'odosiela' | 'odoslany' | 'chyba' | 'konzola';

export interface ZaznamEmailu {
  id: number;
  prijemca: string;
  predmet: string;
  sablona: string | null;
  kampan_id: number | null;
  stav: StavZaznamu;
  pokusy: number;
  posledna_chyba: string | null;
  odoslat_po: string;
  odoslany: string | null;
  vytvoreny: string;
  html?: string | null;
  text?: string;
}

export interface ZoznamOdoslanych {
  polozky: ZaznamEmailu[];
  celkom: number;
  pocty: { odoslany: number; caka: number; chyba: number };
}

export interface AdresatiKampane {
  typy: string[];
  len_platne: boolean;
}

export interface Kampan {
  id: number;
  nazov: string;
  predmet: string;
  obsah: string;
  adresati: AdresatiKampane;
  stav: 'koncept' | 'odosiela' | 'odoslana';
  pocet_adresatov: number;
  odoslana: string | null;
  vytvoreny: string;
  statistika: { odoslane: number; caka: number; chyby: number };
}

const Z = '/admin/email';

export const emailyApi = {
  stav: (signal?: AbortSignal) => api.ziskaj<StavEmailov>(`${Z}/stav`, { signal }),

  nastavenia: (signal?: AbortSignal) => api.ziskaj<NastaveniaEmailov>(`${Z}/nastavenia`, { signal }),
  ulozNastavenia: (udaje: UlozenieNastaveni) => api.uprav<NastaveniaEmailov>(`${Z}/nastavenia`, udaje),
  /** Skúšobný e-mail; s údajmi formulára otestuje aj neuložené nastavenia. */
  testNastaveni: (prijemca: string, udaje?: UlozenieNastaveni) => api.vytvor<void>(`${Z}/nastavenia/test`, { prijemca, ...(udaje ?? {}) }),

  sablony: (signal?: AbortSignal) => api.ziskaj<SablonaEmailu[]>(`${Z}/sablony`, { signal }),
  sablona: (kluc: string, signal?: AbortSignal) => api.ziskaj<DetailSablony>(`${Z}/sablony/${kluc}`, { signal }),
  ulozSablonu: (kluc: string, udaje: { predmet: string; obsah: string; aktivna: boolean }) => api.uprav<void>(`${Z}/sablony/${kluc}`, udaje),
  obnovSablonu: (kluc: string) => api.zmaz(`${Z}/sablony/${kluc}`),
  nahladSablony: (kluc: string, udaje: { predmet: string; obsah: string }, signal?: AbortSignal) =>
    api.vytvor<HotovyEmail>(`${Z}/sablony/${kluc}/nahlad`, udaje, { signal }),
  testSablony: (kluc: string, prijemca: string, udaje: { predmet: string; obsah: string }) =>
    api.vytvor<void>(`${Z}/sablony/${kluc}/test`, { prijemca, ...udaje }),

  odoslane: async (
    parametre: { stav?: string; hladat?: string; strana?: number; kampan_id?: number },
    signal?: AbortSignal
  ): Promise<ZoznamOdoslanych> => {
    const obalka = await api.ziskajObalku<ZaznamEmailu[]>(`${Z}/odoslane`, {
      parametre: Object.fromEntries(Object.entries(parametre).filter(([, h]) => h !== undefined && h !== '')) as Record<string, string | number>,
      signal,
    });
    const meta = (obalka as unknown as { meta?: { celkom: number; pocty: ZoznamOdoslanych['pocty'] } }).meta;
    return {
      polozky: Array.isArray(obalka.data) ? obalka.data : [],
      celkom: meta?.celkom ?? 0,
      pocty: meta?.pocty ?? { odoslany: 0, caka: 0, chyba: 0 },
    };
  },
  detailEmailu: (id: number, signal?: AbortSignal) => api.ziskaj<ZaznamEmailu>(`${Z}/odoslane/${id}`, { signal }),
  posliZnova: (id: number) => api.vytvor<ZaznamEmailu>(`${Z}/odoslane/${id}/znova`, {}),
  spracujFrontu: () => api.vytvor<{ odoslane: number }>(`${Z}/fronta/spracuj`, {}),

  kampane: (signal?: AbortSignal) => api.ziskaj<Kampan[]>(`${Z}/kampane`, { signal }),
  kampan: (id: number, signal?: AbortSignal) => api.ziskaj<Kampan>(`${Z}/kampane/${id}`, { signal }),
  znackyKampane: (signal?: AbortSignal) => api.ziskaj<{ znacky: string[]; spolocne_znacky: string[] }>(`${Z}/kampane/znacky`, { signal }),
  vytvorKampan: (udaje: Pick<Kampan, 'nazov' | 'predmet' | 'obsah' | 'adresati'>) => api.vytvor<Kampan>(`${Z}/kampane`, udaje),
  upravKampan: (id: number, udaje: Pick<Kampan, 'nazov' | 'predmet' | 'obsah' | 'adresati'>) => api.uprav<Kampan>(`${Z}/kampane/${id}`, udaje),
  zmazKampan: (id: number) => api.zmaz(`${Z}/kampane/${id}`),
  pocetAdresatov: (adresati: AdresatiKampane, signal?: AbortSignal) => api.vytvor<{ pocet: number }>(`${Z}/kampane/pocet`, { adresati }, { signal }),
  nahladKampane: (udaje: { predmet: string; obsah: string }, signal?: AbortSignal) => api.vytvor<HotovyEmail>(`${Z}/kampane/nahlad`, udaje, { signal }),
  testKampane: (id: number, prijemca: string) => api.vytvor<void>(`${Z}/kampane/${id}/test`, { prijemca }),
  odosliKampan: (id: number) => api.vytvor<{ pocet: number }>(`${Z}/kampane/${id}/odoslat`, {}),
  zastavKampan: (id: number) => api.vytvor<void>(`${Z}/kampane/${id}/zastavit`, {}),
  kopirujKampan: (id: number) => api.vytvor<Kampan>(`${Z}/kampane/${id}/kopia`, {}),
};
