// backend/src/models/Player.ts
// Model pre hráčov - FÁZA 3

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// Forward declaration pre TypeScript association
class Team extends Model {}

// Interface pre Player atribúty
export interface PlayerAttributes {
  id: number;
  meno: string;
  priezvisko: string;
  datum_narodenia: Date;
  cislo_dresu?: number | null;
  pozicia: string; // Napríklad: brankár, obranca, stredopoliar, útočník
  narodnost?: string | null;
  vaha?: number | null; // v kg
  vyska?: number | null; // v cm
  fotka?: string | null; // URL fotky hráča
  tim_id: number; // Foreign key na tím
  /** Kedy hráč prišiel do klubu */
  datum_pripojenia?: Date | null;
  /** Kedy z klubu odišiel - prestupom, archiváciou alebo ukončením */
  datum_odpojenia?: Date | null;
  /**
   * Stav v rámci kádra. NIE JE to archivácia.
   * Neaktívny hráč (zranený, na hosťovaní) sa naďalej zobrazuje
   * a má štatistiky, len nie je súčasťou aktuálneho kádra.
   */
  stav: 'aktivny' | 'neaktivny';
  /** Archivácia - false znamená „schované, ale dáta zostávajú" */
  aktivity: boolean;
  poznamky?: string | null; // Interné poznámky
  vytvoreny: Date;
  aktualizovany: Date;
}

// Interface pre vytvorenie hráča (bez auto-generovaných polí)
// 'stav' ma v databaze predvolenu hodnotu 'aktivny', takze sa pri
// vytvarani zadavat nemusi - rovnako ako 'aktivity'.
export interface PlayerCreationAttributes extends Optional<PlayerAttributes, 'id' | 'aktivity' | 'stav' | 'vytvoreny' | 'aktualizovany'> {}

// Sequelize Model class
export class Player extends Model<PlayerAttributes, PlayerCreationAttributes> implements PlayerAttributes {
  public id!: number;
  public meno!: string;
  public priezvisko!: string;
  public datum_narodenia!: Date;
  public cislo_dresu!: number | null;
  public pozicia!: string;
  public narodnost!: string | null;
  public vaha!: number | null;
  public vyska!: number | null;
  public fotka!: string | null;
  public tim_id!: number;
  public datum_pripojenia!: Date | null;
  public datum_odpojenia!: Date | null;
  public stav!: 'aktivny' | 'neaktivny';
  public aktivity!: boolean;
  public poznamky!: string | null;
  public readonly vytvoreny!: Date;
  public readonly aktualizovany!: Date;

  // Association properties (pre TypeScript)
  public tim?: Team;

  // Metóda pre získanie celého mena
  public getFullName(): string {
    return `${this.meno} ${this.priezvisko}`;
  }

  // Metóda pre výpočet veku
  public getAge(): number {
    const today = new Date();
    const birthDate = new Date(this.datum_narodenia);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  // Metóda pre získanie bezpečných údajov
  public toSafeJSON() {
    return {
      id: this.id,
      meno: this.meno,
      priezvisko: this.priezvisko,
      datum_narodenia: this.datum_narodenia,
      cislo_dresu: this.cislo_dresu,
      pozicia: this.pozicia,
      narodnost: this.narodnost,
      vaha: this.vaha,
      vyska: this.vyska,
      fotka: this.fotka,
      tim_id: this.tim_id,
      datum_pripojenia: this.datum_pripojenia,
      datum_odpojenia: this.datum_odpojenia,
      stav: this.stav,
      aktivity: this.aktivity,
      poznamky: this.poznamky,
      vytvoreny: this.vytvoreny,
      aktualizovany: this.aktualizovany,
      // Vypočítané hodnoty
      full_name: this.getFullName(),
      vek: this.getAge(),
    };
  }

  // Statická metóda pre validáciu URL fotky (flexibilnejšia než Sequelize default)
  public static isValidPhotoUrl(url: string): boolean {
    if (!url || url.trim() === '') {
      return true; // Prázdne URL je v poriadku
    }

    try {
      // Ak začína s http:// alebo https://, je to absolútne URL
      if (url.startsWith('http://') || url.startsWith('https://')) {
        new URL(url); // Skúsi parsnúť ako URL - ak sa nepodarí, hodí error
        return true;
      }
      
      // Ak začína s /, je to relatívna cesta
      if (url.startsWith('/')) {
        return true;
      }
      
      // Ak obsahuje uploads/, považujeme to za platné
      if (url.includes('uploads/')) {
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  // Statická metóda pre validáciu čísla dresu v tíme
  public static async validateJerseyNumber(cislo_dresu: number, tim_id: number, excludePlayerId?: number): Promise<boolean> {
    const whereCondition: any = {
      cislo_dresu,
      tim_id,
      aktivity: true
    };

    // Ak aktualizujeme existujúceho hráča, vylúčime ho z kontroly
    if (excludePlayerId) {
      whereCondition.id = { [require('sequelize').Op.ne]: excludePlayerId };
    }

    const existingPlayer = await Player.findOne({
      where: whereCondition
    });

    return !existingPlayer; // Vráti true ak číslo je dostupné
  }
}

// Definícia modelu v databáze
Player.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    meno: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 50],
      },
    },
    priezvisko: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 50],
      },
    },
    datum_narodenia: {
      type: DataTypes.DATEONLY, // Len dátum bez času
      allowNull: false,
      validate: {
        isDate: true,
        isBefore: new Date().toISOString(), // Nemôže byť v budúcnosti
      },
    },
    cislo_dresu: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 99,
      },
      comment: 'Číslo dresu (1-99), unikátne v rámci tímu'
    },
    pozicia: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 30],
      },
      comment: 'Pozícia hráča (brankár, obranca, stredopoliar, útočník)'
    },
    narodnost: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: [2, 50],
      },
    },
    vaha: {
      type: DataTypes.DECIMAL(5, 2), // XXX.XX kg
      allowNull: true,
      validate: {
        min: 30,
        max: 200,
      },
      comment: 'Váha v kilogramoch'
    },
    vyska: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 120,
        max: 250,
      },
      comment: 'Výška v centimetroch'
    },
    fotka: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        // UPRAVENÁ VALIDÁCIA - flexibilnejšia
        customPhotoUrlValidation(value: string | null) {
          if (value && !Player.isValidPhotoUrl(value)) {
            throw new Error('Neplatná URL adresa fotky. Musí začínať s http://, https:// alebo obsahovať uploads/');
          }
        }
      },
      comment: 'URL adresa fotky hráča'
    },
    tim_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'timy',
        key: 'id',
      },
      onDelete: 'CASCADE', // Ak sa vymaže tím, vymažú sa aj hráči
      onUpdate: 'CASCADE',
    },
    datum_pripojenia: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    datum_odpojenia: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    stav: {
      // Stav v kádri. Oddelený od archivácie zámerne - zranený hráč sa
      // má naďalej zobrazovať, len nehrá.
      type: DataTypes.ENUM('aktivny', 'neaktivny'),
      allowNull: false,
      defaultValue: 'aktivny',
    },
    aktivity: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    poznamky: {
      type: DataTypes.TEXT,
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
    tableName: 'hraci',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
    hooks: {
      // Validácia čísla dresu pred vytvorením
      beforeCreate: async (player: Player) => {
        if (player.cislo_dresu) {
          const isValid = await Player.validateJerseyNumber(player.cislo_dresu, player.tim_id);
          if (!isValid) {
            throw new Error(`Číslo dresu ${player.cislo_dresu} je už obsadené v tomto tíme`);
          }
        }
      },
      // Validácia čísla dresu pred aktualizáciou
      beforeUpdate: async (player: Player) => {
        if (player.changed('cislo_dresu') && player.cislo_dresu) {
          const isValid = await Player.validateJerseyNumber(player.cislo_dresu, player.tim_id, player.id);
          if (!isValid) {
            throw new Error(`Číslo dresu ${player.cislo_dresu} je už obsadené v tomto tíme`);
          }
        }
      },
    },
    indexes: [
      {
        fields: ['tim_id']
      },
      {
        fields: ['aktivity']
      },
      {
        fields: ['pozicia']
      },
      {
        unique: true,
        fields: ['cislo_dresu', 'tim_id'],
        name: 'unique_jersey_per_team',
        where: {
          cislo_dresu: {
            [require('sequelize').Op.ne]: null
          },
          aktivity: true
        }
      }
    ]
  }
);

export default Player;