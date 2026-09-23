// Umiestnenie: backend/src/models/Rola.ts
//
// ROLA S OPRÁVNENIAMI
//
// Role boli doteraz pevný PostgreSQL enum, takže sa nedala vytvoriť
// vlastná ani povedať „tréner smie upravovať zápasy, ale nie články".
//
// Oprávnenia sú mapa modul -> {citat, pisat, mazat}. Zodpovedá to
// zaškrtávacej tabuľke v administrácii; chýbajúci modul znamená
// „žiadne právo", takže pridanie nového modulu nikomu nič neotvorí.

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

/** Moduly administrácie, na ktoré sa práva nastavujú. */
export const MODULY = [
  'clanky', 'rubriky', 'komentare', 'stranky', 'galerie', 'videa',
  'media', 'stadiony', 'sezony', 'timy', 'hraci', 'realizacny_tim',
  'ligy', 'turnaje', 'zapasy', 'kalendar', 'sponzori', 'dokumenty',
  'formulare', 'pouzivatelia', 'archiv', 'nastavenia', 'sablony', 'logy', 'licencia',
] as const;

export type Modul = (typeof MODULY)[number];
export type Akcia = 'citat' | 'pisat' | 'mazat';

export interface PravaModulu {
  citat: boolean;
  pisat: boolean;
  mazat: boolean;
}

export type MapaOpravneni = Record<string, PravaModulu>;

interface RolaAttributes {
  id: number;
  nazov: string;
  /** Strojový kód, napríklad "admin" - používa sa v kóde a pri migrácii */
  kod: string;
  popis: string | null;
  opravnenia: MapaOpravneni;
  /** Systémovú rolu nemožno zmazať - inak by sa dal odstrihnúť prístup */
  je_systemova: boolean;
  poradie: number;
  aktivity: boolean;
  vytvorena: Date;
  aktualizovana: Date;
}

interface RolaCreationAttributes
  extends Optional<
    RolaAttributes,
    'id' | 'popis' | 'opravnenia' | 'je_systemova' | 'poradie' | 'aktivity' | 'vytvorena' | 'aktualizovana'
  > {}

class Rola extends Model<RolaAttributes, RolaCreationAttributes> implements RolaAttributes {
  public id!: number;
  public nazov!: string;
  public kod!: string;
  public popis!: string | null;
  public opravnenia!: MapaOpravneni;
  public je_systemova!: boolean;
  public poradie!: number;
  public aktivity!: boolean;
  public readonly vytvorena!: Date;
  public readonly aktualizovana!: Date;

  /**
   * Smie táto rola vykonať akciu nad modulom?
   *
   * Chýbajúci modul znamená NIE - pridanie nového modulu tak nikomu
   * automaticky neotvorí prístup.
   */
  public smie(modul: string, akcia: Akcia): boolean {
    const prava = this.opravnenia?.[modul];
    if (!prava) return false;
    return prava[akcia] === true;
  }

  /** Má rola aspoň jedno právo? Bez toho nemá do administrácie čo robiť. */
  public maNejakePravo(): boolean {
    return Object.values(this.opravnenia || {}).some(
      (p) => p.citat || p.pisat || p.mazat
    );
  }

  public toSafeJSON() {
    return {
      id: this.id,
      nazov: this.nazov,
      kod: this.kod,
      popis: this.popis,
      opravnenia: this.opravnenia,
      je_systemova: this.je_systemova,
      poradie: this.poradie,
      aktivity: this.aktivity,
    };
  }

  /** Prázdna mapa práv pre všetky moduly - základ nového formulára. */
  public static prazdneOpravnenia(): MapaOpravneni {
    return MODULY.reduce((mapa, modul) => {
      mapa[modul] = { citat: false, pisat: false, mazat: false };
      return mapa;
    }, {} as MapaOpravneni);
  }

  /**
   * Očistí mapu práv od neznámych modulov a nelogických hodnôt.
   *
   * Právo PÍSAŤ alebo MAZAŤ bez práva ČÍTAŤ nedáva zmysel - kto smie
   * záznam zmeniť, musí ho vedieť aj zobraziť. Čítanie sa preto dopĺňa.
   */
  public static ocistiOpravnenia(vstup: unknown): MapaOpravneni {
    const vysledok = Rola.prazdneOpravnenia();
    if (!vstup || typeof vstup !== 'object') return vysledok;

    for (const [modul, prava] of Object.entries(vstup as Record<string, any>)) {
      if (!MODULY.includes(modul as Modul)) continue;
      if (!prava || typeof prava !== 'object') continue;

      const pisat = prava.pisat === true;
      const mazat = prava.mazat === true;

      vysledok[modul] = {
        citat: prava.citat === true || pisat || mazat,
        pisat,
        mazat,
      };
    }

    return vysledok;
  }
}

Rola.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nazov: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
      validate: { len: { args: [2, 80], msg: 'Názov roly musí mať 2-80 znakov' } },
    },
    kod: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
      validate: {
        is: {
          args: /^[a-z0-9_-]+$/,
          msg: 'Kód roly smie obsahovať len malé písmená, číslice, pomlčku a podčiarkovník',
        },
      },
    },
    popis: { type: DataTypes.TEXT, allowNull: true },
    opravnenia: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    je_systemova: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    poradie: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    aktivity: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    vytvorena: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovana: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'Rola',
    tableName: 'roly',
    timestamps: true,
    createdAt: 'vytvorena',
    updatedAt: 'aktualizovana',
  }
);

export default Rola;
