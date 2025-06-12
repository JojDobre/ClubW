// backend/src/models/User.ts
// Model pre používateľov systému

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import bcrypt from 'bcryptjs';

// Interface pre User atribúty
export interface UserAttributes {
  id: number;
  meno: string;
  email: string;
  heslo: string;
  rola: 'admin' | 'redaktor' | 'trener' | 'uzivatel';
  tim_id?: number | null;  // Voliteľné priradenie k tímu
  aktivity: boolean;
  posledne_prihlasenie?: Date | null;
  vytvoreny: Date;
  aktualizovany: Date;
}

// Interface pre vytvorenie používateľa (bez auto-generovaných polí)
export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'vytvoreny' | 'aktualizovany' | 'posledne_prihlasenie'> {}

// Sequelize Model class
export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public meno!: string;
  public email!: string;
  public heslo!: string;
  public rola!: 'admin' | 'redaktor' | 'trener' | 'uzivatel';
  public tim_id!: number | null;
  public aktivity!: boolean;
  public posledne_prihlasenie!: Date | null;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;

  // Metóda pre overenie hesla
  public async overHeslo(heslo: string): Promise<boolean> {
    return bcrypt.compare(heslo, this.heslo);
  }

  // Statická metóda pre hashovanie hesla
  public static async hashHeslo(heslo: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(heslo, salt);
  }

  // Metóda pre získanie údajov bez hesla
  public toSafeJSON() {
    const { heslo, ...safeUser } = this.toJSON();
    return safeUser;
  }
}

// Definícia modelu v databáze
User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    meno: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    heslo: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [6, 255], // Minimálne 6 znakov
      },
    },
    rola: {
      type: DataTypes.ENUM('admin', 'redaktor', 'trener', 'uzivatel'),
      allowNull: false,
      defaultValue: 'uzivatel',
    },
    tim_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      // Foreign key pridáme neskôr keď budeme vytvárať tabuľku tímov
      // references: {
      //   model: 'timy',
      //   key: 'id',
      // },
    },
    aktivity: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    posledne_prihlasenie: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    vytvoreny: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    aktualizovany: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'pouzivatelia',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
    hooks: {
      // Automatické hashovanie hesla pred uložením
      beforeCreate: async (user: User) => {
        if (user.heslo) {
          user.heslo = await User.hashHeslo(user.heslo);
        }
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('heslo')) {
          user.heslo = await User.hashHeslo(user.heslo);
        }
      },
    },
  }
);

export default User;