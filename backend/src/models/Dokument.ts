// Umiestnenie: backend/src/models/Dokument.ts
// Dokumenty na stiahnutie — stanovy, prihlášky, tlačivá.

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface DokumentAttributes {
  id: number;
  nazov: string;
  popis: string | null;
  subor_url: string;
  /** Prípona pre ikonu vo výpise (pdf, docx…) */
  typ_suboru: string | null;
  velkost_kb: number | null;
  kategoria: string | null;
  /** Neverejný dokument uvidia len prihlásení */
  verejny: boolean;
  pocet_stiahnuti: number;
  poradie: number;
  aktivity: boolean;
  vytvoreny: Date;
  aktualizovany: Date;
}

interface DokumentCreationAttributes
  extends Optional<
    DokumentAttributes,
    'id' | 'popis' | 'typ_suboru' | 'velkost_kb' | 'kategoria' | 'verejny'
    | 'pocet_stiahnuti' | 'poradie' | 'aktivity' | 'vytvoreny' | 'aktualizovany'
  > {}

class Dokument extends Model<DokumentAttributes, DokumentCreationAttributes> implements DokumentAttributes {
  public id!: number;
  public nazov!: string;
  public popis!: string | null;
  public subor_url!: string;
  public typ_suboru!: string | null;
  public velkost_kb!: number | null;
  public kategoria!: string | null;
  public verejny!: boolean;
  public pocet_stiahnuti!: number;
  public poradie!: number;
  public aktivity!: boolean;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;
}

Dokument.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nazov: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: { notEmpty: true },
    },
    popis: { type: DataTypes.TEXT, allowNull: true },
    subor_url: { type: DataTypes.STRING(255), allowNull: false },
    typ_suboru: { type: DataTypes.STRING(10), allowNull: true },
    velkost_kb: { type: DataTypes.INTEGER, allowNull: true },
    kategoria: { type: DataTypes.STRING(60), allowNull: true },
    verejny: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    pocet_stiahnuti: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    poradie: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    aktivity: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    vytvoreny: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovany: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'Dokument',
    tableName: 'dokumenty',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
    indexes: [{ fields: ['kategoria'], name: 'dokumenty_kategoria' }],
  }
);

export default Dokument;
