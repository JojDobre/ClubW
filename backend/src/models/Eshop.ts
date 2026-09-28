// Umiestnenie: backend/src/models/Eshop.ts
// Modely e-shopu: kategórie, produkty, spôsoby doručenia a platby,
// objednávky a ich položky. Tabuľky vytvára migrácia 20260929000001-eshop.
//
// Ceny sú DECIMAL(10,2) - PostgreSQL ich vracia ako reťazec, preto každý
// model v toJSON prevádza sumy na čísla (web aj administrácia počítajú
// s číslami).

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

/** Suma z databázy (reťazec "49.90") ako číslo. */
export const suma = (hodnota: unknown): number => Math.round(Number(hodnota || 0) * 100) / 100;
const sumaAleboNull = (hodnota: unknown): number | null => (hodnota === null || hodnota === undefined ? null : suma(hodnota));

// ===== Kategória =====

interface KategoriaAttributes {
  id: number;
  nazov: string;
  slug: string;
  popis: string | null;
  poradie: number;
  aktivity: boolean;
  vytvorena: Date;
  aktualizovana: Date;
}

export class EshopKategoria
  extends Model<KategoriaAttributes, Optional<KategoriaAttributes, 'id' | 'popis' | 'poradie' | 'aktivity' | 'vytvorena' | 'aktualizovana'>>
  implements KategoriaAttributes
{
  public id!: number;
  public nazov!: string;
  public slug!: string;
  public popis!: string | null;
  public poradie!: number;
  public aktivity!: boolean;
  public readonly vytvorena!: Date;
  public readonly aktualizovana!: Date;
}

EshopKategoria.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nazov: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { len: { args: [2, 100], msg: 'Názov kategórie musí mať 2-100 znakov' } },
    },
    slug: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    popis: { type: DataTypes.TEXT, allowNull: true },
    poradie: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    aktivity: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    vytvorena: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovana: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'EshopKategoria',
    tableName: 'eshop_kategorie',
    timestamps: true,
    createdAt: 'vytvorena',
    updatedAt: 'aktualizovana',
  }
);

// ===== Produkt =====

/** Hodnota vlastnosti (napr. veľkosť XL) - príplatok a vlastný sklad. */
export interface HodnotaVlastnosti {
  id: string;
  nazov: string;
  /** Príplatok k cene produktu (0 = bez príplatku) */
  priplatok: number;
  /** Počet kusov na sklade; null = neobmedzene */
  sklad: number | null;
}

/**
 * Vlastnosť produktu:
 *   vyber - zákazník vyberie jednu z hodnôt (veľkosť, farba)
 *   text  - zákazník napíše text (meno a číslo na dres) s voliteľným príplatkom
 */
export interface VlastnostProduktu {
  id: string;
  nazov: string;
  typ: 'vyber' | 'text';
  povinna: boolean;
  hodnoty: HodnotaVlastnosti[];
  /** Pri texte: príplatok za vyplnenie a najväčšia dĺžka */
  priplatok: number;
  max_dlzka: number | null;
}

interface ProduktAttributes {
  id: number;
  nazov: string;
  slug: string;
  kategoria_id: number | null;
  kratky_popis: string | null;
  popis: string | null;
  cena: number;
  povodna_cena: number | null;
  obrazok: string | null;
  obrazky: string[];
  vlastnosti: VlastnostProduktu[];
  /** Kusy na sklade; null = neobmedzene */
  sklad: number | null;
  /** Kód produktu (SKU) */
  kod: string | null;
  /** Zobrazí sa vo fanshope na úvodnej stránke */
  odporucany: boolean;
  aktivny: boolean;
  poradie: number;
  vytvoreny: Date;
  aktualizovany: Date;
}

type ProduktCreation = Optional<
  ProduktAttributes,
  | 'id' | 'kategoria_id' | 'kratky_popis' | 'popis' | 'povodna_cena' | 'obrazok' | 'obrazky' | 'vlastnosti'
  | 'sklad' | 'kod' | 'odporucany' | 'aktivny' | 'poradie' | 'vytvoreny' | 'aktualizovany'
>;

export class EshopProdukt extends Model<ProduktAttributes, ProduktCreation> implements ProduktAttributes {
  public id!: number;
  public nazov!: string;
  public slug!: string;
  public kategoria_id!: number | null;
  public kratky_popis!: string | null;
  public popis!: string | null;
  public cena!: number;
  public povodna_cena!: number | null;
  public obrazok!: string | null;
  public obrazky!: string[];
  public vlastnosti!: VlastnostProduktu[];
  public sklad!: number | null;
  public kod!: string | null;
  public odporucany!: boolean;
  public aktivny!: boolean;
  public poradie!: number;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;
  public kategoria?: EshopKategoria | null;

  /**
   * Je produkt vypredaný? Pri vlastnosti so skladom po hodnotách je
   * vypredaný, keď nie je na sklade žiadna hodnota.
   */
  public jeVypredany(): boolean {
    if (this.sklad !== null && this.sklad <= 0) return true;
    return (this.vlastnosti || []).some(
      (v) => v.typ === 'vyber' && v.hodnoty.length > 0 && v.hodnoty.every((h) => h.sklad !== null && h.sklad <= 0)
    );
  }

  public toJSON() {
    const hodnoty = super.toJSON() as any;
    return {
      ...hodnoty,
      cena: suma(hodnoty.cena),
      povodna_cena: sumaAleboNull(hodnoty.povodna_cena),
      obrazky: hodnoty.obrazky ?? [],
      vlastnosti: hodnoty.vlastnosti ?? [],
      vypredany: this.jeVypredany(),
    };
  }
}

EshopProdukt.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nazov: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: { len: { args: [2, 150], msg: 'Názov produktu musí mať 2-150 znakov' } },
    },
    slug: { type: DataTypes.STRING(170), allowNull: false, unique: true },
    kategoria_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'eshop_kategorie', key: 'id' } },
    kratky_popis: {
      type: DataTypes.STRING(300),
      allowNull: true,
      validate: { len: { args: [0, 300], msg: 'Krátky popis môže mať najviac 300 znakov' } },
    },
    popis: { type: DataTypes.TEXT, allowNull: true },
    cena: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: { args: [0], msg: 'Cena nemôže byť záporná' } },
    },
    povodna_cena: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: { min: { args: [0], msg: 'Pôvodná cena nemôže byť záporná' } },
    },
    obrazok: { type: DataTypes.STRING(255), allowNull: true },
    obrazky: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    vlastnosti: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    sklad: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: { args: [0], msg: 'Počet kusov na sklade nemôže byť záporný' } },
    },
    kod: { type: DataTypes.STRING(60), allowNull: true },
    odporucany: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    aktivny: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    poradie: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    vytvoreny: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovany: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'EshopProdukt',
    tableName: 'eshop_produkty',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
  }
);

// ===== Spôsob doručenia =====

interface DorucenieAttributes {
  id: number;
  nazov: string;
  popis: string | null;
  cena: number;
  /** Doprava zadarmo pri objednávke od tejto sumy (null = nikdy) */
  zadarmo_od: number | null;
  /** Kuriér a pošta potrebujú adresu, osobný odber nie */
  vyzaduje_adresu: boolean;
  aktivny: boolean;
  poradie: number;
  vytvorene: Date;
  aktualizovane: Date;
}

export class EshopDorucenie
  extends Model<DorucenieAttributes, Optional<DorucenieAttributes, 'id' | 'popis' | 'cena' | 'zadarmo_od' | 'vyzaduje_adresu' | 'aktivny' | 'poradie' | 'vytvorene' | 'aktualizovane'>>
  implements DorucenieAttributes
{
  public id!: number;
  public nazov!: string;
  public popis!: string | null;
  public cena!: number;
  public zadarmo_od!: number | null;
  public vyzaduje_adresu!: boolean;
  public aktivny!: boolean;
  public poradie!: number;
  public readonly vytvorene!: Date;
  public readonly aktualizovane!: Date;

  /** Cena doručenia pri danej hodnote tovaru. */
  public cenaPre(medzisucet: number): number {
    if (this.zadarmo_od !== null && this.zadarmo_od !== undefined && medzisucet >= suma(this.zadarmo_od)) return 0;
    return suma(this.cena);
  }

  public toJSON() {
    const hodnoty = super.toJSON() as any;
    return { ...hodnoty, cena: suma(hodnoty.cena), zadarmo_od: sumaAleboNull(hodnoty.zadarmo_od) };
  }
}

EshopDorucenie.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nazov: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { len: { args: [2, 100], msg: 'Názov doručenia musí mať 2-100 znakov' } },
    },
    popis: { type: DataTypes.STRING(300), allowNull: true },
    cena: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, validate: { min: { args: [0], msg: 'Cena nemôže byť záporná' } } },
    zadarmo_od: { type: DataTypes.DECIMAL(10, 2), allowNull: true, validate: { min: { args: [0], msg: 'Suma nemôže byť záporná' } } },
    vyzaduje_adresu: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    aktivny: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    poradie: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    vytvorene: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovane: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'EshopDorucenie',
    tableName: 'eshop_dorucenia',
    timestamps: true,
    createdAt: 'vytvorene',
    updatedAt: 'aktualizovane',
  }
);

// ===== Spôsob platby =====

export const TYPY_PLATBY = ['prevod', 'dobierka', 'hotovost', 'brana', 'ine'] as const;
export type TypPlatby = (typeof TYPY_PLATBY)[number];

interface PlatbaAttributes {
  id: number;
  nazov: string;
  popis: string | null;
  typ: TypPlatby;
  poplatok: number;
  /** Pokyny zákazníkovi po objednávke - podporujú značky {{suma}}, {{vs}}... */
  pokyny: string | null;
  /** Platobná brána: HTML/JS kód od poskytovateľa (tlačidlo, formulár) */
  brana_html: string | null;
  /** Tajný kľúč pre oznámenie o zaplatení od brány */
  brana_kluc: string | null;
  /** Povolené spôsoby doručenia (id); prázdne = všetky */
  dorucenia: number[];
  aktivny: boolean;
  poradie: number;
  vytvorena: Date;
  aktualizovana: Date;
}

export class EshopPlatba
  extends Model<
    PlatbaAttributes,
    Optional<PlatbaAttributes, 'id' | 'popis' | 'typ' | 'poplatok' | 'pokyny' | 'brana_html' | 'brana_kluc' | 'dorucenia' | 'aktivny' | 'poradie' | 'vytvorena' | 'aktualizovana'>
  >
  implements PlatbaAttributes
{
  public id!: number;
  public nazov!: string;
  public popis!: string | null;
  public typ!: TypPlatby;
  public poplatok!: number;
  public pokyny!: string | null;
  public brana_html!: string | null;
  public brana_kluc!: string | null;
  public dorucenia!: number[];
  public aktivny!: boolean;
  public poradie!: number;
  public readonly vytvorena!: Date;
  public readonly aktualizovana!: Date;

  /** Dá sa platba použiť s daným doručením? */
  public povolenaPre(dorucenieId: number): boolean {
    const zoznam = this.dorucenia || [];
    return zoznam.length === 0 || zoznam.includes(dorucenieId);
  }

  /** Údaje pre administráciu (s kľúčom brány). */
  public toJSON() {
    const hodnoty = super.toJSON() as any;
    return { ...hodnoty, poplatok: suma(hodnoty.poplatok), dorucenia: hodnoty.dorucenia ?? [] };
  }

  /** Údaje pre web - bez HTML brány a bez tajného kľúča. */
  public verejne() {
    return {
      id: this.id,
      nazov: this.nazov,
      popis: this.popis,
      typ: this.typ,
      poplatok: suma(this.poplatok),
      dorucenia: this.dorucenia ?? [],
    };
  }
}

EshopPlatba.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nazov: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { len: { args: [2, 100], msg: 'Názov platby musí mať 2-100 znakov' } },
    },
    popis: { type: DataTypes.STRING(300), allowNull: true },
    typ: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'prevod',
      validate: { isIn: { args: [TYPY_PLATBY as unknown as string[]], msg: 'Neplatný typ platby' } },
    },
    poplatok: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, validate: { min: { args: [0], msg: 'Poplatok nemôže byť záporný' } } },
    pokyny: { type: DataTypes.TEXT, allowNull: true },
    brana_html: { type: DataTypes.TEXT, allowNull: true },
    brana_kluc: { type: DataTypes.STRING(64), allowNull: true },
    dorucenia: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    aktivny: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    poradie: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    vytvorena: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovana: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'EshopPlatba',
    tableName: 'eshop_platby',
    timestamps: true,
    createdAt: 'vytvorena',
    updatedAt: 'aktualizovana',
  }
);

// ===== Objednávka =====

export const STAVY_OBJEDNAVKY = ['nova', 'potvrdena', 'pripravena', 'odoslana', 'vybavena', 'zrusena'] as const;
export type StavObjednavky = (typeof STAVY_OBJEDNAVKY)[number];
export const STAVY_PLATBY = ['neuhradena', 'uhradena', 'vratena'] as const;
export type StavPlatby = (typeof STAVY_PLATBY)[number];

interface ObjednavkaAttributes {
  id: number;
  cislo: string;
  /** Tajný kód do odkazu, cez ktorý zákazník vidí stav objednávky */
  token: string;
  stav: StavObjednavky;
  stav_platby: StavPlatby;
  meno: string;
  email: string;
  telefon: string | null;
  ulica: string | null;
  mesto: string | null;
  psc: string | null;
  krajina: string | null;
  poznamka: string | null;
  dorucenie_id: number | null;
  dorucenie_nazov: string;
  dorucenie_cena: number;
  platba_id: number | null;
  platba_nazov: string;
  platba_typ: TypPlatby;
  platba_poplatok: number;
  medzisucet: number;
  spolu: number;
  mena: string;
  variabilny_symbol: string;
  platba_referencia: string | null;
  uhradena: Date | null;
  /** Pri zrušení sa kusy vrátia na sklad - len raz */
  sklad_vrateny: boolean;
  poznamka_interna: string | null;
  vytvorena: Date;
  aktualizovana: Date;
}

type ObjednavkaCreation = Optional<
  ObjednavkaAttributes,
  | 'id' | 'stav' | 'stav_platby' | 'telefon' | 'ulica' | 'mesto' | 'psc' | 'krajina' | 'poznamka'
  | 'dorucenie_id' | 'platba_id' | 'mena' | 'platba_referencia' | 'uhradena' | 'sklad_vrateny'
  | 'poznamka_interna' | 'vytvorena' | 'aktualizovana'
>;

export class EshopObjednavka extends Model<ObjednavkaAttributes, ObjednavkaCreation> implements ObjednavkaAttributes {
  public id!: number;
  public cislo!: string;
  public token!: string;
  public stav!: StavObjednavky;
  public stav_platby!: StavPlatby;
  public meno!: string;
  public email!: string;
  public telefon!: string | null;
  public ulica!: string | null;
  public mesto!: string | null;
  public psc!: string | null;
  public krajina!: string | null;
  public poznamka!: string | null;
  public dorucenie_id!: number | null;
  public dorucenie_nazov!: string;
  public dorucenie_cena!: number;
  public platba_id!: number | null;
  public platba_nazov!: string;
  public platba_typ!: TypPlatby;
  public platba_poplatok!: number;
  public medzisucet!: number;
  public spolu!: number;
  public mena!: string;
  public variabilny_symbol!: string;
  public platba_referencia!: string | null;
  public uhradena!: Date | null;
  public sklad_vrateny!: boolean;
  public poznamka_interna!: string | null;
  public readonly vytvorena!: Date;
  public readonly aktualizovana!: Date;
  public polozky?: EshopPolozka[];

  public toJSON() {
    const hodnoty = super.toJSON() as any;
    return {
      ...hodnoty,
      dorucenie_cena: suma(hodnoty.dorucenie_cena),
      platba_poplatok: suma(hodnoty.platba_poplatok),
      medzisucet: suma(hodnoty.medzisucet),
      spolu: suma(hodnoty.spolu),
    };
  }
}

EshopObjednavka.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    cislo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    token: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    stav: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'nova',
      validate: { isIn: { args: [STAVY_OBJEDNAVKY as unknown as string[]], msg: 'Neplatný stav objednávky' } },
    },
    stav_platby: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'neuhradena',
      validate: { isIn: { args: [STAVY_PLATBY as unknown as string[]], msg: 'Neplatný stav platby' } },
    },
    meno: { type: DataTypes.STRING(150), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false, validate: { isEmail: { msg: 'E-mail nie je platný' } } },
    telefon: { type: DataTypes.STRING(40), allowNull: true },
    ulica: { type: DataTypes.STRING(200), allowNull: true },
    mesto: { type: DataTypes.STRING(100), allowNull: true },
    psc: { type: DataTypes.STRING(20), allowNull: true },
    krajina: { type: DataTypes.STRING(80), allowNull: true },
    poznamka: { type: DataTypes.TEXT, allowNull: true },
    dorucenie_id: { type: DataTypes.INTEGER, allowNull: true },
    dorucenie_nazov: { type: DataTypes.STRING(100), allowNull: false },
    dorucenie_cena: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    platba_id: { type: DataTypes.INTEGER, allowNull: true },
    platba_nazov: { type: DataTypes.STRING(100), allowNull: false },
    platba_typ: { type: DataTypes.STRING(20), allowNull: false },
    platba_poplatok: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    medzisucet: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    spolu: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    mena: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'EUR' },
    variabilny_symbol: { type: DataTypes.STRING(10), allowNull: false },
    platba_referencia: { type: DataTypes.STRING(120), allowNull: true },
    uhradena: { type: DataTypes.DATE, allowNull: true },
    sklad_vrateny: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    poznamka_interna: { type: DataTypes.TEXT, allowNull: true },
    vytvorena: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovana: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'EshopObjednavka',
    tableName: 'eshop_objednavky',
    timestamps: true,
    createdAt: 'vytvorena',
    updatedAt: 'aktualizovana',
  }
);

// ===== Položka objednávky =====

/** Zvolená vlastnosť v objednávke - kópia textov a odkaz na hodnotu kvôli skladu. */
export interface ZvolenaVlastnost {
  vlastnost_id: string;
  nazov: string;
  hodnota: string;
  hodnota_id: string | null;
}

interface PolozkaAttributes {
  id: number;
  objednavka_id: number;
  produkt_id: number | null;
  nazov: string;
  kod: string | null;
  vlastnosti: ZvolenaVlastnost[];
  cena_za_kus: number;
  pocet: number;
  spolu: number;
}

export class EshopPolozka
  extends Model<PolozkaAttributes, Optional<PolozkaAttributes, 'id' | 'produkt_id' | 'kod' | 'vlastnosti'>>
  implements PolozkaAttributes
{
  public id!: number;
  public objednavka_id!: number;
  public produkt_id!: number | null;
  public nazov!: string;
  public kod!: string | null;
  public vlastnosti!: ZvolenaVlastnost[];
  public cena_za_kus!: number;
  public pocet!: number;
  public spolu!: number;

  public toJSON() {
    const hodnoty = super.toJSON() as any;
    return { ...hodnoty, cena_za_kus: suma(hodnoty.cena_za_kus), spolu: suma(hodnoty.spolu), vlastnosti: hodnoty.vlastnosti ?? [] };
  }
}

EshopPolozka.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    objednavka_id: { type: DataTypes.INTEGER, allowNull: false },
    produkt_id: { type: DataTypes.INTEGER, allowNull: true },
    nazov: { type: DataTypes.STRING(150), allowNull: false },
    kod: { type: DataTypes.STRING(60), allowNull: true },
    vlastnosti: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    cena_za_kus: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    pocet: { type: DataTypes.INTEGER, allowNull: false },
    spolu: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  },
  {
    sequelize,
    modelName: 'EshopPolozka',
    tableName: 'eshop_polozky',
    timestamps: false,
  }
);

// ===== Vzťahy =====

EshopKategoria.hasMany(EshopProdukt, { foreignKey: 'kategoria_id', as: 'produkty', constraints: false });
EshopProdukt.belongsTo(EshopKategoria, { foreignKey: 'kategoria_id', as: 'kategoria', constraints: false });
EshopObjednavka.hasMany(EshopPolozka, { foreignKey: 'objednavka_id', as: 'polozky', onDelete: 'CASCADE' });
EshopPolozka.belongsTo(EshopObjednavka, { foreignKey: 'objednavka_id', as: 'objednavka' });
