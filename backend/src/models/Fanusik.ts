// Umiestnenie: backend/src/models/Fanusik.ts
// Registrovaní fanúšikovia a členovia klubu.
//
// POZNÁMKA K OCHRANE ÚDAJOV: tabuľka obsahuje kontaktné údaje osôb,
// takže podlieha rovnakým pravidlám ako údaje hráčov. Súhlas so zasielaním
// oznamov evidujeme priamo tu (pole suhlas_oznamy) a dá sa kedykoľvek odvolať.

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type TypClenstva = 'fanusik' | 'clen' | 'vip' | 'cestny';
/** ziadost = registrácia z webu čaká na schválenie */
export type StavFanusika = 'aktivny' | 'ziadost' | 'zamietnuty';

interface FanusikAttributes {
  id: number;
  meno: string;
  priezvisko: string;
  email: string;
  telefon: string | null;
  typ_clenstva: TypClenstva;
  /** Číslo členského preukazu */
  cislo_karty: string | null;
  clenstvo_od: Date | null;
  clenstvo_do: Date | null;
  /** Súhlas so zasielaním klubových oznamov */
  suhlas_oznamy: boolean;
  poznamka: string | null;
  stav: StavFanusika;
  /** Odkiaľ záznam prišiel: administracia | web */
  zdroj: string;
  datum_narodenia: string | null;
  adresa: string | null;
  /** Správa od žiadateľa pri registrácii z webu */
  sprava: string | null;
  aktivity: boolean;
  vytvoreny: Date;
  aktualizovany: Date;
}

interface FanusikCreationAttributes
  extends Optional<
    FanusikAttributes,
    'id' | 'telefon' | 'typ_clenstva' | 'cislo_karty' | 'clenstvo_od' | 'clenstvo_do'
    | 'suhlas_oznamy' | 'poznamka' | 'aktivity' | 'vytvoreny' | 'aktualizovany'
    | 'stav' | 'zdroj' | 'datum_narodenia' | 'adresa' | 'sprava'
  > {}

class Fanusik extends Model<FanusikAttributes, FanusikCreationAttributes> implements FanusikAttributes {
  public id!: number;
  public meno!: string;
  public priezvisko!: string;
  public email!: string;
  public telefon!: string | null;
  public typ_clenstva!: TypClenstva;
  public cislo_karty!: string | null;
  public clenstvo_od!: Date | null;
  public clenstvo_do!: Date | null;
  public suhlas_oznamy!: boolean;
  public poznamka!: string | null;
  public stav!: StavFanusika;
  public zdroj!: string;
  public datum_narodenia!: string | null;
  public adresa!: string | null;
  public sprava!: string | null;
  public aktivity!: boolean;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;

  /** Je členstvo práve platné? */
  public jePlatne(): boolean {
    if (!this.aktivity || this.stav !== 'aktivny') return false;
    if (this.clenstvo_do && new Date(this.clenstvo_do) < new Date()) return false;
    return true;
  }
}

Fanusik.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    meno: { type: DataTypes.STRING(80), allowNull: false, validate: { notEmpty: true } },
    priezvisko: { type: DataTypes.STRING(80), allowNull: false, validate: { notEmpty: true } },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    telefon: { type: DataTypes.STRING(40), allowNull: true },
    typ_clenstva: {
      type: DataTypes.ENUM('fanusik', 'clen', 'vip', 'cestny'),
      allowNull: false,
      defaultValue: 'fanusik',
    },
    cislo_karty: { type: DataTypes.STRING(30), allowNull: true },
    clenstvo_od: { type: DataTypes.DATEONLY, allowNull: true },
    clenstvo_do: { type: DataTypes.DATEONLY, allowNull: true },
    suhlas_oznamy: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    poznamka: { type: DataTypes.TEXT, allowNull: true },
    stav: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'aktivny',
      validate: { isIn: { args: [['aktivny', 'ziadost', 'zamietnuty']], msg: 'Neplatný stav fanúšika' } },
    },
    zdroj: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'administracia' },
    datum_narodenia: { type: DataTypes.DATEONLY, allowNull: true },
    adresa: { type: DataTypes.STRING(255), allowNull: true },
    sprava: { type: DataTypes.TEXT, allowNull: true },
    aktivity: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    vytvoreny: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovany: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'Fanusik',
    tableName: 'fanusikovia',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
    indexes: [
      { fields: ['email'], unique: true, name: 'fanusikovia_email' },
      { fields: ['typ_clenstva'], name: 'fanusikovia_typ' },
    ],
  }
);

export default Fanusik;
