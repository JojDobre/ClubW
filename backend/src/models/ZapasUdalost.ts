// Umiestnenie: backend/src/models/ZapasUdalost.ts
//
// VOĽNÉ UDALOSTI ZO ZÁPASU - textový priebeh, ktorý nie je štatistikou
// viazanou na hráča („zápas sa pre dážď prerušil", „domáci vystriedali
// brankára"). Požiadavka hovorí „tiež možnosť písať udalosti zo zápasu".

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface ZapasUdalostAttributes {
  id: number;
  zapas_id: number;
  /** Minúta zápasu; prázdne pri udalosti mimo hracieho času */
  minuta: number | null;
  text: string;
  /** Pre ručné zoradenie udalostí v rovnakej minúte */
  poradie: number;
  vytvorena: Date;
  aktualizovana: Date;
}

interface ZapasUdalostCreationAttributes
  extends Optional<
    ZapasUdalostAttributes,
    'id' | 'minuta' | 'poradie' | 'vytvorena' | 'aktualizovana'
  > {}

class ZapasUdalost
  extends Model<ZapasUdalostAttributes, ZapasUdalostCreationAttributes>
  implements ZapasUdalostAttributes
{
  public id!: number;
  public zapas_id!: number;
  public minuta!: number | null;
  public text!: string;
  public poradie!: number;
  public readonly vytvorena!: Date;
  public readonly aktualizovana!: Date;

  public toSafeJSON() {
    return {
      id: this.id,
      zapas_id: this.zapas_id,
      minuta: this.minuta,
      text: this.text,
      poradie: this.poradie,
      vytvorena: this.vytvorena,
    };
  }
}

ZapasUdalost.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    zapas_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'zapasy', key: 'id' } },
    minuta: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: { args: [0], msg: 'Minúta nemôže byť záporná' },
        max: { args: [150], msg: 'Minúta nemôže presiahnuť 150' },
      },
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { notEmpty: { msg: 'Text udalosti nesmie byť prázdny' } },
    },
    poradie: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    vytvorena: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovana: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'ZapasUdalost',
    tableName: 'zapas_udalosti',
    timestamps: true,
    createdAt: 'vytvorena',
    updatedAt: 'aktualizovana',
  }
);

export default ZapasUdalost;
