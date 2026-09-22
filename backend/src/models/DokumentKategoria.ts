// Umiestnenie: backend/src/models/DokumentKategoria.ts
//
// Kategória dokumentov ako samostatná entita - názov a popis.
// Predtým bola kategória len voľný text na dokumente, takže sa nedala
// pomenovať raz a používať všade rovnako.

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface DokumentKategoriaAttributes {
  id: number;
  nazov: string;
  popis: string | null;
  poradie: number;
  aktivity: boolean;
  vytvorena: Date;
  aktualizovana: Date;
}

interface DokumentKategoriaCreationAttributes
  extends Optional<
    DokumentKategoriaAttributes,
    'id' | 'popis' | 'poradie' | 'aktivity' | 'vytvorena' | 'aktualizovana'
  > {}

class DokumentKategoria
  extends Model<DokumentKategoriaAttributes, DokumentKategoriaCreationAttributes>
  implements DokumentKategoriaAttributes
{
  public id!: number;
  public nazov!: string;
  public popis!: string | null;
  public poradie!: number;
  public aktivity!: boolean;
  public readonly vytvorena!: Date;
  public readonly aktualizovana!: Date;

  public toSafeJSON() {
    return {
      id: this.id,
      nazov: this.nazov,
      popis: this.popis,
      poradie: this.poradie,
      aktivity: this.aktivity,
    };
  }
}

DokumentKategoria.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nazov: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: { len: { args: [2, 100], msg: 'Názov kategórie musí mať 2-100 znakov' } },
    },
    popis: { type: DataTypes.TEXT, allowNull: true },
    poradie: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    aktivity: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    vytvorena: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovana: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'DokumentKategoria',
    tableName: 'dokument_kategorie',
    timestamps: true,
    createdAt: 'vytvorena',
    updatedAt: 'aktualizovana',
  }
);

export default DokumentKategoria;
