// Umiestnenie: backend/src/models/MenuPolozka.ts
//
// POLOŽKA MENU
//
// Menu sa doteraz skladalo výhradne z Page.v_menu a poradie_menu, takže
// sa nedalo vnoriť, pomenovať inak než stránka ani pridať vlastný odkaz.
// Položka menu je preto samostatná entita: odkazuje na stránku, rubriku
// alebo ľubovoľnú adresu a môže mať rodiča.

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type TypPolozky = 'stranka' | 'url' | 'rubrika';

interface MenuPolozkaAttributes {
  id: number;
  nazov: string;
  typ: TypPolozky;
  stranka_id: number | null;
  rubrika_id: number | null;
  url: string | null;
  /** Rodič pri vnorenej položke; prázdne = prvá úroveň */
  rodic_id: number | null;
  poradie: number;
  otvorit_v_novom: boolean;
  aktivity: boolean;
  vytvorena: Date;
  aktualizovana: Date;
}

interface MenuPolozkaCreationAttributes
  extends Optional<
    MenuPolozkaAttributes,
    | 'id' | 'typ' | 'stranka_id' | 'rubrika_id' | 'url' | 'rodic_id'
    | 'poradie' | 'otvorit_v_novom' | 'aktivity' | 'vytvorena' | 'aktualizovana'
  > {}

class MenuPolozka
  extends Model<MenuPolozkaAttributes, MenuPolozkaCreationAttributes>
  implements MenuPolozkaAttributes
{
  public id!: number;
  public nazov!: string;
  public typ!: TypPolozky;
  public stranka_id!: number | null;
  public rubrika_id!: number | null;
  public url!: string | null;
  public rodic_id!: number | null;
  public poradie!: number;
  public otvorit_v_novom!: boolean;
  public aktivity!: boolean;
  public readonly vytvorena!: Date;
  public readonly aktualizovana!: Date;

  public stranka?: any;
  public rubrika?: any;

  /**
   * Adresa, na ktorú položka vedie.
   *
   * Pri stránke a rubrike sa skladá zo slugu, takže premenovanie URL
   * stránky sa premietne do menu samo.
   */
  public odkaz(): string | null {
    if (this.typ === 'url') return this.url;
    if (this.typ === 'stranka') return this.stranka ? `/${this.stranka.slug}` : null;
    if (this.typ === 'rubrika') return this.rubrika ? `/rubrika/${this.rubrika.slug}` : null;
    return null;
  }

  public toSafeJSON() {
    return {
      id: this.id,
      nazov: this.nazov,
      typ: this.typ,
      stranka_id: this.stranka_id,
      rubrika_id: this.rubrika_id,
      url: this.url,
      odkaz: this.odkaz(),
      rodic_id: this.rodic_id,
      poradie: this.poradie,
      otvorit_v_novom: this.otvorit_v_novom,
      aktivity: this.aktivity,
    };
  }
}

MenuPolozka.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nazov: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { len: { args: [1, 100], msg: 'Názov položky menu musí mať 1-100 znakov' } },
    },
    typ: {
      type: DataTypes.ENUM('stranka', 'url', 'rubrika'),
      allowNull: false,
      defaultValue: 'stranka',
    },
    stranka_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'pages', key: 'id' } },
    rubrika_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'rubriky', key: 'id' } },
    url: { type: DataTypes.STRING(500), allowNull: true },
    rodic_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'menu_polozky', key: 'id' } },
    poradie: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    otvorit_v_novom: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    aktivity: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    vytvorena: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    aktualizovana: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'MenuPolozka',
    tableName: 'menu_polozky',
    timestamps: true,
    createdAt: 'vytvorena',
    updatedAt: 'aktualizovana',
    validate: {
      // Položka musí vedieť, kam vedie
      maCiel(this: MenuPolozka) {
        if (this.typ === 'stranka' && !this.stranka_id) {
          throw new Error('Položka typu „stranka" musí mať zvolenú stránku');
        }
        if (this.typ === 'rubrika' && !this.rubrika_id) {
          throw new Error('Položka typu „rubrika" musí mať zvolenú rubriku');
        }
        if (this.typ === 'url' && !this.url) {
          throw new Error('Položka typu „url" musí mať vyplnenú adresu');
        }
      },
    },
  }
);

export default MenuPolozka;
