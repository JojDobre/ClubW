// Umiestnenie: backend/src/models/Video.ts
// Videá klubu — zostrihy, rozhovory, celé zápasy.
//
// Videá neukladáme na server, len odkazy na YouTube alebo Vimeo.
// Ukladanie videosúborov by pri klubovom hostingu rýchlo vyčerpalo priestor.

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type ZdrojVidea = 'youtube' | 'vimeo' | 'ine';

interface VideoAttributes {
  id: number;
  nazov: string;
  popis: string | null;
  url: string;
  zdroj: ZdrojVidea;
  /** Identifikátor pre vloženie prehrávača */
  video_id: string | null;
  nahlad: string | null;
  /** Dĺžka v sekundách */
  dlzka: number | null;
  /** Pôvodná voľná kategória; zostáva pre staré dáta */
  kategoria: string | null;
  /** Rubrika ako väzba - požiadavka žiada rubriku, nie voľný text */
  rubrika_id: number | null;
  zapas_id: number | null;
  publikovane: boolean;
  poradie: number;
  vytvorene: Date;
  aktualizovane: Date;
}

interface VideoCreationAttributes
  extends Optional<
    VideoAttributes,
    'id' | 'popis' | 'zdroj' | 'video_id' | 'nahlad' | 'dlzka' | 'kategoria' | 'rubrika_id'
    | 'zapas_id' | 'publikovane' | 'poradie' | 'vytvorene' | 'aktualizovane'
  > {}

class Video extends Model<VideoAttributes, VideoCreationAttributes> implements VideoAttributes {
  public id!: number;
  public nazov!: string;
  public popis!: string | null;
  public url!: string;
  public zdroj!: ZdrojVidea;
  public video_id!: string | null;
  public nahlad!: string | null;
  public dlzka!: number | null;
  public kategoria!: string | null;
  public rubrika_id!: number | null;
  public zapas_id!: number | null;
  public publikovane!: boolean;
  public poradie!: number;
  public readonly vytvorene!: Date;
  public readonly aktualizovane!: Date;

  /**
   * Vytiahne identifikátor videa z odkazu.
   * Podporuje bežné tvary adries YouTube aj Vimeo.
   */
  public static rozpoznajId(url: string): { zdroj: ZdrojVidea; video_id: string | null } {
    const youtube = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
    );
    if (youtube) return { zdroj: 'youtube', video_id: youtube[1] };

    const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeo) return { zdroj: 'vimeo', video_id: vimeo[1] };

    return { zdroj: 'ine', video_id: null };
  }

  /** Adresa náhľadového obrázka, ak ju vieme odvodiť. */
  public nahladovyObrazok(): string | null {
    if (this.nahlad) return this.nahlad;
    if (this.zdroj === 'youtube' && this.video_id) {
      return `https://img.youtube.com/vi/${this.video_id}/hqdefault.jpg`;
    }
    return null;
  }
}

Video.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nazov: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: { notEmpty: true },
    },
    popis: { type: DataTypes.TEXT, allowNull: true },
    url: {
      type: DataTypes.STRING(400),
      allowNull: false,
      validate: { notEmpty: true },
    },
    zdroj: {
      type: DataTypes.ENUM('youtube', 'vimeo', 'ine'),
      allowNull: false,
      defaultValue: 'youtube',
    },
    video_id: { type: DataTypes.STRING(60), allowNull: true },
    nahlad: { type: DataTypes.STRING(400), allowNull: true },
    dlzka: { type: DataTypes.INTEGER, allowNull: true },
    kategoria: { type: DataTypes.STRING(60), allowNull: true },
    rubrika_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'rubriky', key: 'id' },
    },
    zapas_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'zapasy', key: 'id' },
      onDelete: 'SET NULL',
    },
    publikovane: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    poradie: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    vytvorene: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovane: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'Video',
    tableName: 'videa',
    timestamps: true,
    createdAt: 'vytvorene',
    updatedAt: 'aktualizovane',
    indexes: [
      { fields: ['kategoria'], name: 'videa_kategoria' },
      { fields: ['zapas_id'], name: 'videa_zapas' },
    ],
    hooks: {
      // Zdroj a identifikátor dopĺňame automaticky z odkazu
      beforeValidate: (video: Video) => {
        if (video.url && (!video.video_id || video.changed('url'))) {
          const rozpoznane = Video.rozpoznajId(video.url);
          video.zdroj = rozpoznane.zdroj;
          video.video_id = rozpoznane.video_id;
        }
      },
    },
  }
);

export default Video;
