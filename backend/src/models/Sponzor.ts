// Umiestnenie: backend/src/models/Sponzor.ts
// Sponzori a partneri klubu.

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

/** Úroveň partnerstva určuje veľkosť loga na webe. */
export type UrovenSponzora = 'generalny' | 'hlavny' | 'partner' | 'dodavatel';

interface SponzorAttributes {
  id: number;
  nazov: string;
  uroven: UrovenSponzora;
  logo: string | null;
  web_url: string | null;
  popis: string | null;
  /** Obdobie partnerstva */
  platny_od: Date | null;
  platny_do: Date | null;
  poradie: number;
  aktivity: boolean;
  vytvoreny: Date;
  aktualizovany: Date;
}

interface SponzorCreationAttributes
  extends Optional<
    SponzorAttributes,
    'id' | 'logo' | 'web_url' | 'popis' | 'platny_od' | 'platny_do'
    | 'poradie' | 'aktivity' | 'vytvoreny' | 'aktualizovany'
  > {}

class Sponzor extends Model<SponzorAttributes, SponzorCreationAttributes> implements SponzorAttributes {
  public id!: number;
  public nazov!: string;
  public uroven!: UrovenSponzora;
  public logo!: string | null;
  public web_url!: string | null;
  public popis!: string | null;
  public platny_od!: Date | null;
  public platny_do!: Date | null;
  public poradie!: number;
  public aktivity!: boolean;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;
}

Sponzor.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nazov: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: { notEmpty: true, len: [2, 150] },
    },
    uroven: {
      type: DataTypes.ENUM('generalny', 'hlavny', 'partner', 'dodavatel'),
      allowNull: false,
      defaultValue: 'partner',
    },
    logo: { type: DataTypes.STRING(255), allowNull: true },
    web_url: { type: DataTypes.STRING(255), allowNull: true },
    popis: { type: DataTypes.TEXT, allowNull: true },
    platny_od: { type: DataTypes.DATEONLY, allowNull: true },
    platny_do: { type: DataTypes.DATEONLY, allowNull: true },
    poradie: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    aktivity: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    vytvoreny: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovany: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'Sponzor',
    tableName: 'sponzori',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
    indexes: [{ fields: ['uroven', 'poradie'], name: 'sponzori_uroven_poradie' }],
  }
);

export default Sponzor;
