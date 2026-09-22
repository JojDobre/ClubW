// Umiestnenie: backend/src/models/ZapasZostava.ts
//
// ZOSTAVA ZÁPASU - kto nastúpil v základe, kto bol na lavičke
// a koľko minút kto odohral.
//
// Hráč môže byť náš (hrac_id) alebo hosťujúci, ktorý v našej databáze
// nie je - vtedy sa zapíše len meno a číslo dresu. Presne to žiadala
// požiadavka „z hosťujúceho tímu možnosť pridať aj vlastné meno a číslo".

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface ZapasZostavaAttributes {
  id: number;
  zapas_id: number;
  /** Za ktorý tím hráč nastúpil */
  strana: 'domaci' | 'hostia';
  /** Náš hráč; pri hosťujúcom zostáva prázdne */
  hrac_id: number | null;
  /** Meno hosťujúceho hráča, ktorý nie je v našej databáze */
  hostujuci_hrac_meno: string | null;
  hostujuci_hrac_cislo: number | null;
  /** Základná zostava alebo lavička */
  zaradenie: 'zakladna' | 'lavicka';
  /** Voliteľné - požiadavka hovorí „volitelne" */
  odohrane_minuty: number | null;
  kapitan: boolean;
  poznamka: string | null;
  vytvoreny: Date;
  aktualizovany: Date;
}

interface ZapasZostavaCreationAttributes
  extends Optional<
    ZapasZostavaAttributes,
    | 'id' | 'hrac_id' | 'hostujuci_hrac_meno' | 'hostujuci_hrac_cislo'
    | 'zaradenie' | 'odohrane_minuty' | 'kapitan' | 'poznamka'
    | 'vytvoreny' | 'aktualizovany'
  > {}

class ZapasZostava
  extends Model<ZapasZostavaAttributes, ZapasZostavaCreationAttributes>
  implements ZapasZostavaAttributes
{
  public id!: number;
  public zapas_id!: number;
  public strana!: 'domaci' | 'hostia';
  public hrac_id!: number | null;
  public hostujuci_hrac_meno!: string | null;
  public hostujuci_hrac_cislo!: number | null;
  public zaradenie!: 'zakladna' | 'lavicka';
  public odohrane_minuty!: number | null;
  public kapitan!: boolean;
  public poznamka!: string | null;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;

  public hrac?: any;

  public toSafeJSON() {
    return {
      id: this.id,
      zapas_id: this.zapas_id,
      strana: this.strana,
      hrac_id: this.hrac_id,
      hostujuci_hrac_meno: this.hostujuci_hrac_meno,
      hostujuci_hrac_cislo: this.hostujuci_hrac_cislo,
      zaradenie: this.zaradenie,
      odohrane_minuty: this.odohrane_minuty,
      kapitan: this.kapitan,
      poznamka: this.poznamka,
      hrac: this.hrac
        ? { id: this.hrac.id, meno: this.hrac.meno, priezvisko: this.hrac.priezvisko, cislo_dresu: this.hrac.cislo_dresu }
        : null,
    };
  }
}

ZapasZostava.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    zapas_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'zapasy', key: 'id' } },
    strana: { type: DataTypes.ENUM('domaci', 'hostia'), allowNull: false },
    hrac_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'hraci', key: 'id' } },
    hostujuci_hrac_meno: { type: DataTypes.STRING(100), allowNull: true },
    hostujuci_hrac_cislo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: { args: [0], msg: 'Číslo dresu nemôže byť záporné' }, max: { args: [999], msg: 'Číslo dresu je príliš vysoké' } },
    },
    zaradenie: { type: DataTypes.ENUM('zakladna', 'lavicka'), allowNull: false, defaultValue: 'zakladna' },
    odohrane_minuty: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: { args: [0], msg: 'Odohrané minúty nemôžu byť záporné' },
        // 150 pokrýva aj predĺženie
        max: { args: [150], msg: 'Odohrané minúty nemôžu presiahnuť 150' },
      },
    },
    kapitan: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    poznamka: { type: DataTypes.STRING(255), allowNull: true },
    vytvoreny: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovany: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'ZapasZostava',
    tableName: 'zapas_zostavy',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
  }
);

export default ZapasZostava;
