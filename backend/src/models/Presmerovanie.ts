// Umiestnenie: backend/src/models/Presmerovanie.ts
//
// PRESMEROVANIE ODKAZU - starý odkaz na nový.
//
// Typicky po zmene URL článku alebo stránky: staré odkazy z Googlu
// a zo sociálnych sietí musia niekam viesť, inak návštevník skončí
// na chybovej stránke.

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PresmerovanieAttributes {
  id: number;
  /** Cesta, ktorá už neplatí, napríklad /stary-clanok */
  stary_odkaz: string;
  /** Kam sa má návštevník poslať */
  novy_odkaz: string;
  /** 301 = trvalé (Google prepíše index), 302 = dočasné */
  kod: number;
  poznamka: string | null;
  /** Koľkokrát sa presmerovanie použilo - ukáže, čo sa ešte odkazuje */
  pocet_pouziti: number;
  posledne_pouzite: Date | null;
  aktivity: boolean;
  vytvorene: Date;
  aktualizovane: Date;
}

interface PresmerovanieCreationAttributes
  extends Optional<
    PresmerovanieAttributes,
    | 'id' | 'kod' | 'poznamka' | 'pocet_pouziti' | 'posledne_pouzite'
    | 'aktivity' | 'vytvorene' | 'aktualizovane'
  > {}

class Presmerovanie
  extends Model<PresmerovanieAttributes, PresmerovanieCreationAttributes>
  implements PresmerovanieAttributes
{
  public id!: number;
  public stary_odkaz!: string;
  public novy_odkaz!: string;
  public kod!: number;
  public poznamka!: string | null;
  public pocet_pouziti!: number;
  public posledne_pouzite!: Date | null;
  public aktivity!: boolean;
  public readonly vytvorene!: Date;
  public readonly aktualizovane!: Date;

  /** Zjednotí zápis cesty: vždy začína lomkou, nikdy ňou nekončí. */
  public static normalizuj(odkaz: string): string {
    let cesta = String(odkaz).trim();
    if (!cesta.startsWith('/') && !/^https?:\/\//i.test(cesta)) {
      cesta = `/${cesta}`;
    }
    if (cesta.length > 1 && cesta.endsWith('/')) {
      cesta = cesta.slice(0, -1);
    }
    return cesta;
  }

  public toSafeJSON() {
    return {
      id: this.id,
      stary_odkaz: this.stary_odkaz,
      novy_odkaz: this.novy_odkaz,
      kod: this.kod,
      poznamka: this.poznamka,
      pocet_pouziti: this.pocet_pouziti,
      posledne_pouzite: this.posledne_pouzite,
      aktivity: this.aktivity,
    };
  }
}

Presmerovanie.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    stary_odkaz: { type: DataTypes.STRING(500), allowNull: false, unique: true },
    novy_odkaz: { type: DataTypes.STRING(500), allowNull: false },
    kod: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 301,
      validate: {
        jePodporovany(hodnota: number) {
          if (![301, 302, 307, 308].includes(Number(hodnota))) {
            throw new Error('Kód presmerovania musí byť 301, 302, 307 alebo 308');
          }
        },
      },
    },
    poznamka: { type: DataTypes.STRING(255), allowNull: true },
    pocet_pouziti: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    posledne_pouzite: { type: DataTypes.DATE, allowNull: true },
    aktivity: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    vytvorene: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovane: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'Presmerovanie',
    tableName: 'presmerovania',
    timestamps: true,
    createdAt: 'vytvorene',
    updatedAt: 'aktualizovane',
    validate: {
      // Presmerovanie na seba samé by vyrobilo nekonečnú slučku
      nieNaSeba(this: Presmerovanie) {
        if (this.stary_odkaz && this.stary_odkaz === this.novy_odkaz) {
          throw new Error('Starý a nový odkaz nemôžu byť rovnaké');
        }
      },
    },
  }
);

export default Presmerovanie;
