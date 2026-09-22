// Umiestnenie: backend/src/models/Media.ts
//
// MEDIA KNIŽNICA - jeden záznam pre každý nahratý súbor.
//
// Bez tejto tabuľky sa nedalo zistiť, čo je vlastne nahraté, znovu
// použiť existujúci obrázok, ani k nemu pridať alt text a popis.

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type TypMedia = 'obrazok' | 'dokument' | 'ine';

interface MediaAttributes {
  id: number;
  /** Zobrazovaný názov, predvolene odvodený z názvu súboru */
  nazov: string;
  /** Pôvodný názov, ktorý mal súbor u používateľa */
  originalny_nazov: string;
  /** Cesta pre web, napríklad /uploads/media/2026/09/foto.jpg */
  cesta: string;
  typ: TypMedia;
  mime_typ: string;
  /** Veľkosť v bajtoch */
  velkost: number;
  sirka: number | null;
  vyska: number | null;
  /** Alternatívny text pre čítačky a vyhľadávače */
  alt_text: string | null;
  popis: string | null;
  /** Kto súbor nahral */
  autor_id: number | null;
  aktivity: boolean;
  vytvoreny: Date;
  aktualizovany: Date;
}

interface MediaCreationAttributes
  extends Optional<
    MediaAttributes,
    | 'id' | 'typ' | 'velkost' | 'sirka' | 'vyska' | 'alt_text' | 'popis'
    | 'autor_id' | 'aktivity' | 'vytvoreny' | 'aktualizovany'
  > {}

class Media extends Model<MediaAttributes, MediaCreationAttributes> implements MediaAttributes {
  public id!: number;
  public nazov!: string;
  public originalny_nazov!: string;
  public cesta!: string;
  public typ!: TypMedia;
  public mime_typ!: string;
  public velkost!: number;
  public sirka!: number | null;
  public vyska!: number | null;
  public alt_text!: string | null;
  public popis!: string | null;
  public autor_id!: number | null;
  public aktivity!: boolean;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;

  public autor?: any;

  /** Veľkosť v kilobajtoch, zaokrúhlená - do výpisu v administrácii. */
  public velkostKb(): number {
    return Math.round(Number(this.velkost) / 1024);
  }

  public toSafeJSON() {
    return {
      id: this.id,
      nazov: this.nazov,
      originalny_nazov: this.originalny_nazov,
      cesta: this.cesta,
      typ: this.typ,
      mime_typ: this.mime_typ,
      velkost: Number(this.velkost),
      velkost_kb: this.velkostKb(),
      sirka: this.sirka,
      vyska: this.vyska,
      alt_text: this.alt_text,
      popis: this.popis,
      autor_id: this.autor_id,
      autor: this.autor ? { id: this.autor.id, meno: this.autor.meno } : null,
      vytvoreny: this.vytvoreny,
      aktualizovany: this.aktualizovany,
    };
  }
}

Media.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nazov: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: { len: { args: [1, 200], msg: 'Názov súboru musí mať 1-200 znakov' } },
    },
    originalny_nazov: { type: DataTypes.STRING(255), allowNull: false },
    cesta: { type: DataTypes.STRING(500), allowNull: false, unique: true },
    typ: {
      type: DataTypes.ENUM('obrazok', 'dokument', 'ine'),
      allowNull: false,
      defaultValue: 'obrazok',
    },
    mime_typ: { type: DataTypes.STRING(100), allowNull: false },
    velkost: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    sirka: { type: DataTypes.INTEGER, allowNull: true },
    vyska: { type: DataTypes.INTEGER, allowNull: true },
    alt_text: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: { len: { args: [0, 255], msg: 'Alt text môže mať najviac 255 znakov' } },
    },
    popis: { type: DataTypes.TEXT, allowNull: true },
    autor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'pouzivatelia', key: 'id' },
    },
    aktivity: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    vytvoreny: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovany: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'Media',
    tableName: 'media',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
  }
);

export default Media;
