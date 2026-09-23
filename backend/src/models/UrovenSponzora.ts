// Umiestnenie: backend/src/models/UrovenSponzora.ts
//
// Úroveň partnerstva (Generálny partner, Hlavný partner, Mediálny
// partner...). Klub si úrovne spravuje sám - názov, poradie na webe
// a veľkosť loga.

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type VelkostLoga = 'velke' | 'stredne' | 'male';

interface UrovenSponzoraAttributes {
  id: number;
  nazov: string;
  popis: string | null;
  /** Poradie na webe - nižšie číslo vyššie */
  poradie: number;
  velkost_loga: VelkostLoga;
  aktivity: boolean;
  vytvorena: Date;
  aktualizovana: Date;
}

interface UrovenSponzoraCreationAttributes
  extends Optional<
    UrovenSponzoraAttributes,
    'id' | 'popis' | 'poradie' | 'velkost_loga' | 'aktivity' | 'vytvorena' | 'aktualizovana'
  > {}

class UrovenSponzora
  extends Model<UrovenSponzoraAttributes, UrovenSponzoraCreationAttributes>
  implements UrovenSponzoraAttributes
{
  public id!: number;
  public nazov!: string;
  public popis!: string | null;
  public poradie!: number;
  public velkost_loga!: VelkostLoga;
  public aktivity!: boolean;
  public readonly vytvorena!: Date;
  public readonly aktualizovana!: Date;
}

UrovenSponzora.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nazov: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
      validate: { len: { args: [2, 80], msg: 'Názov úrovne musí mať 2-80 znakov' } },
    },
    popis: { type: DataTypes.TEXT, allowNull: true },
    poradie: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    velkost_loga: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'stredne',
      validate: {
        isIn: { args: [['velke', 'stredne', 'male']], msg: 'Veľkosť loga musí byť veľké, stredné alebo malé' },
      },
    },
    aktivity: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    vytvorena: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovana: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'UrovenSponzora',
    tableName: 'urovne_sponzorov',
    timestamps: true,
    createdAt: 'vytvorena',
    updatedAt: 'aktualizovana',
  }
);

export default UrovenSponzora;
