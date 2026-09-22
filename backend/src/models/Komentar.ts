// Umiestnenie: backend/src/models/Komentar.ts
// Komentáre návštevníkov pod článkami.
//
// Komentáre čakajú na schválenie, kým sa zobrazia na webe. Bez toho
// by sa na klubovom webe objavil spam v priebehu pár dní.

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type StavKomentara = 'caka' | 'schvaleny' | 'zamietnuty' | 'spam';

interface KomentarAttributes {
  id: number;
  clanok_id: number;
  /** Prihlásený autor; bez neho ide o komentár nespárovaný s účtom */
  pouzivatel_id: number | null;
  /** Kedy komentár naposledy upravil jeho autor */
  upraveny_autorom: Date | null;
  autor_meno: string;
  autor_email: string | null;
  obsah: string;
  stav: StavKomentara;
  ip_adresa: string | null;
  /** Odpoveď na iný komentár */
  rodic_id: number | null;
  vytvoreny: Date;
  aktualizovany: Date;
}

interface KomentarCreationAttributes
  extends Optional<
    KomentarAttributes,
    'id' | 'autor_email' | 'stav' | 'ip_adresa' | 'rodic_id'
    | 'pouzivatel_id' | 'upraveny_autorom' | 'vytvoreny' | 'aktualizovany'
  > {}

class Komentar extends Model<KomentarAttributes, KomentarCreationAttributes> implements KomentarAttributes {
  public id!: number;
  public clanok_id!: number;
  public pouzivatel_id!: number | null;
  public upraveny_autorom!: Date | null;
  public autor_meno!: string;
  public autor_email!: string | null;
  public obsah!: string;
  public stav!: StavKomentara;
  public ip_adresa!: string | null;
  public rodic_id!: number | null;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;
}

Komentar.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clanok_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'clanky', key: 'id' },
      onDelete: 'CASCADE',
    },
    pouzivatel_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'pouzivatelia', key: 'id' },
    },
    upraveny_autorom: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    autor_meno: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true, len: [2, 100] },
    },
    autor_email: {
      type: DataTypes.STRING(150),
      allowNull: true,
      validate: { isEmail: true },
    },
    obsah: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { notEmpty: true, len: [2, 3000] },
    },
    stav: {
      type: DataTypes.ENUM('caka', 'schvaleny', 'zamietnuty', 'spam'),
      allowNull: false,
      // Nový komentár čaká na schválenie — ochrana pred spamom
      defaultValue: 'caka',
    },
    ip_adresa: { type: DataTypes.STRING(45), allowNull: true },
    rodic_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'komentare', key: 'id' },
      onDelete: 'CASCADE',
    },
    vytvoreny: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovany: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'Komentar',
    tableName: 'komentare',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
    indexes: [
      { fields: ['clanok_id'], name: 'komentare_clanok' },
      { fields: ['stav'], name: 'komentare_stav' },
    ],
  }
);

export default Komentar;
