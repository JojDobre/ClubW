// Umiestnenie: license-server/src/models/sprava.ts
// Modely administrácie licenčného servera: produkty, verzie, príkazy,
// administrátori, relácie prihlásenia a záznam udalostí.

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import Licencia from './Licencia';

// ===== Produkt =====

export interface PlanProduktu {
  kod: string;
  nazov: string;
  /** Predvolená dĺžka licencie v mesiacoch */
  mesiacov: number;
  /** Funkcie, ktoré plán povoľuje (posielajú sa klientovi v licencii) */
  funkcie: string[];
}

export class Produkt extends Model {
  public id!: number;
  public kod!: string;
  public nazov!: string;
  public popis!: string | null;
  public github_repo!: string | null;
  public plany!: PlanProduktu[];
  public aktualna_verzia_id!: number | null;
  public minimalna_verzia!: string | null;
  public aktivny!: boolean;
  public vytvoreny!: Date;
  public aktualizovany!: Date;
  public aktualna_verzia?: Verzia | null;
}

Produkt.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    kod: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    nazov: { type: DataTypes.STRING(120), allowNull: false },
    popis: { type: DataTypes.TEXT, allowNull: true },
    github_repo: { type: DataTypes.STRING(200), allowNull: true },
    plany: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    aktualna_verzia_id: { type: DataTypes.INTEGER, allowNull: true },
    minimalna_verzia: { type: DataTypes.STRING(40), allowNull: true },
    aktivny: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, tableName: 'produkty', timestamps: true, createdAt: 'vytvoreny', updatedAt: 'aktualizovany' }
);

// ===== Verzia =====

export type StavBaliku = 'ziadny' | 'pripravuje' | 'pripraveny' | 'chyba';

export class Verzia extends Model {
  public id!: number;
  public produkt_id!: number;
  public verzia!: string;
  public tag!: string;
  public nazov!: string | null;
  public poznamky!: string | null;
  public publikovana!: Date | null;
  public predbezna!: boolean;
  public zdroj!: 'release' | 'tag' | 'rucne';
  public commit_sha!: string | null;
  public balik_stav!: StavBaliku;
  public balik_sha256!: string | null;
  public balik_velkost!: number | null;
  public balik_chyba!: string | null;
  public vytvorena!: Date;
  public aktualizovana!: Date;
  public produkt?: Produkt;
}

Verzia.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    produkt_id: { type: DataTypes.INTEGER, allowNull: false },
    verzia: { type: DataTypes.STRING(40), allowNull: false },
    tag: { type: DataTypes.STRING(100), allowNull: false },
    nazov: { type: DataTypes.STRING(200), allowNull: true },
    poznamky: { type: DataTypes.TEXT, allowNull: true },
    publikovana: { type: DataTypes.DATE, allowNull: true },
    predbezna: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    zdroj: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'rucne' },
    commit_sha: { type: DataTypes.STRING(64), allowNull: true },
    balik_stav: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ziadny' },
    balik_sha256: { type: DataTypes.STRING(64), allowNull: true },
    // BIGINT prichádza z Postgresu ako text - prevedieme na číslo
    balik_velkost: {
      type: DataTypes.BIGINT,
      allowNull: true,
      get() {
        const v = this.getDataValue('balik_velkost');
        return v === null || v === undefined ? null : Number(v);
      },
    },
    balik_chyba: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: 'verzie', timestamps: true, createdAt: 'vytvorena', updatedAt: 'aktualizovana' }
);

// ===== Administrátor =====

export class Administrator extends Model {
  public id!: number;
  public email!: string;
  public meno!: string;
  public heslo_hash!: string;
  public totp_tajomstvo!: string | null;
  public totp_aktivne!: boolean;
  public aktivny!: boolean;
  public posledne_prihlasenie!: Date | null;
  public vytvoreny!: Date;
  public aktualizovany!: Date;

  /** Údaje bezpečné na odoslanie do prehliadača (bez hesla a tajomstva 2FA). */
  public verejne() {
    return {
      id: this.id,
      email: this.email,
      meno: this.meno,
      totp_aktivne: this.totp_aktivne,
      aktivny: this.aktivny,
      posledne_prihlasenie: this.posledne_prihlasenie,
      vytvoreny: this.vytvoreny,
    };
  }
}

Administrator.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING(200), allowNull: false, unique: true },
    meno: { type: DataTypes.STRING(120), allowNull: false },
    heslo_hash: { type: DataTypes.STRING(300), allowNull: false },
    totp_tajomstvo: { type: DataTypes.STRING(64), allowNull: true },
    totp_aktivne: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    aktivny: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    posledne_prihlasenie: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: 'administratori', timestamps: true, createdAt: 'vytvoreny', updatedAt: 'aktualizovany' }
);

// ===== Relácia prihlásenia =====

export class Relacia extends Model {
  public id!: number;
  public administrator_id!: number;
  public token_hash!: string;
  public ip!: string | null;
  public prehliadac!: string | null;
  public plati_do!: Date;
  public posledna_aktivita!: Date;
  public vytvorena!: Date;
  public administrator?: Administrator;
}

Relacia.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    administrator_id: { type: DataTypes.INTEGER, allowNull: false },
    token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    ip: { type: DataTypes.STRING(64), allowNull: true },
    prehliadac: { type: DataTypes.STRING(300), allowNull: true },
    plati_do: { type: DataTypes.DATE, allowNull: false },
    posledna_aktivita: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'relacie', timestamps: true, createdAt: 'vytvorena', updatedAt: false }
);

// ===== Príkaz pre inštaláciu =====

export type TypPrikazu = 'aktualizacia';
export type StavPrikazu = 'caka' | 'prevzaty' | 'prebieha' | 'hotovo' | 'chyba' | 'zruseny';
export const NEUKONCENE_STAVY: StavPrikazu[] = ['caka', 'prevzaty', 'prebieha'];

export class Prikaz extends Model {
  public id!: number;
  public licencia_id!: number;
  public typ!: TypPrikazu;
  public verzia_id!: number | null;
  public stav!: StavPrikazu;
  public sprava!: string | null;
  public vytvoril_id!: number | null;
  public vytvoreny!: Date;
  public prevzaty!: Date | null;
  public dokonceny!: Date | null;
  public aktualizovany!: Date;
  public verzia?: Verzia | null;
  public licencia?: Licencia;
  public vytvoril?: Administrator | null;
}

Prikaz.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    licencia_id: { type: DataTypes.INTEGER, allowNull: false },
    typ: { type: DataTypes.STRING(30), allowNull: false },
    verzia_id: { type: DataTypes.INTEGER, allowNull: true },
    stav: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'caka' },
    sprava: { type: DataTypes.TEXT, allowNull: true },
    vytvoril_id: { type: DataTypes.INTEGER, allowNull: true },
    prevzaty: { type: DataTypes.DATE, allowNull: true },
    dokonceny: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: 'prikazy', timestamps: true, createdAt: 'vytvoreny', updatedAt: 'aktualizovany' }
);

// ===== Udalosť (záznam o zmenách a dôležitých okamihoch) =====

export class Udalost extends Model {
  public id!: number;
  public administrator_id!: number | null;
  public licencia_id!: number | null;
  public produkt_id!: number | null;
  public typ!: string;
  public popis!: string;
  public detaily!: Record<string, unknown> | null;
  public ip!: string | null;
  public vytvorena!: Date;
}

Udalost.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      get() {
        return Number(this.getDataValue('id'));
      },
    },
    administrator_id: { type: DataTypes.INTEGER, allowNull: true },
    licencia_id: { type: DataTypes.INTEGER, allowNull: true },
    produkt_id: { type: DataTypes.INTEGER, allowNull: true },
    typ: { type: DataTypes.STRING(50), allowNull: false },
    popis: { type: DataTypes.TEXT, allowNull: false },
    detaily: { type: DataTypes.JSONB, allowNull: true },
    ip: { type: DataTypes.STRING(64), allowNull: true },
  },
  { sequelize, tableName: 'udalosti', timestamps: true, createdAt: 'vytvorena', updatedAt: false }
);

// ===== Vzťahy =====

Produkt.hasMany(Verzia, { foreignKey: 'produkt_id', as: 'verzie' });
Verzia.belongsTo(Produkt, { foreignKey: 'produkt_id', as: 'produkt' });
Produkt.belongsTo(Verzia, { foreignKey: 'aktualna_verzia_id', as: 'aktualna_verzia', constraints: false });

Produkt.hasMany(Licencia, { foreignKey: 'produkt_id', as: 'licencie' });
Licencia.belongsTo(Produkt, { foreignKey: 'produkt_id', as: 'produkt' });
Licencia.belongsTo(Verzia, { foreignKey: 'pripnuta_verzia_id', as: 'pripnuta_verzia', constraints: false });

Licencia.hasMany(Prikaz, { foreignKey: 'licencia_id', as: 'prikazy' });
Prikaz.belongsTo(Licencia, { foreignKey: 'licencia_id', as: 'licencia' });
Prikaz.belongsTo(Verzia, { foreignKey: 'verzia_id', as: 'verzia' });
Prikaz.belongsTo(Administrator, { foreignKey: 'vytvoril_id', as: 'vytvoril' });

Relacia.belongsTo(Administrator, { foreignKey: 'administrator_id', as: 'administrator' });

Udalost.belongsTo(Administrator, { foreignKey: 'administrator_id', as: 'administrator' });
Udalost.belongsTo(Licencia, { foreignKey: 'licencia_id', as: 'licencia' });
Udalost.belongsTo(Produkt, { foreignKey: 'produkt_id', as: 'produkt' });

/**
 * Zapíše udalosť do záznamu. Chyba zápisu nesmie zhodiť samotnú akciu -
 * záznam je doplnok, nie podmienka.
 */
export const zaznamenaj = async (udalost: {
  typ: string;
  popis: string;
  administrator_id?: number | null;
  licencia_id?: number | null;
  produkt_id?: number | null;
  detaily?: Record<string, unknown> | null;
  ip?: string | null;
}): Promise<void> => {
  try {
    await Udalost.create(udalost);
  } catch (chyba) {
    console.error('Udalosť sa nepodarilo zapísať:', chyba);
  }
};
