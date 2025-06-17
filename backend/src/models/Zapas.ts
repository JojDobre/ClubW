// backend/src/models/Zapas.ts
// Model pre zápasy - FÁZA 4

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// Interface pre atribúty Zápasu
interface ZapasAttributes {
  id: number;
  nazov: string;
  liga_id: number;
  kolo?: string | null;
  datum_cas: Date;
  miesto?: string | null;
  domaci_tim_id: number;
  hostujuci_tim_id: number;
  goly_domaci?: number | null;
  goly_hostia?: number | null;
  status: 'naplanovany' | 'prebieha' | 'ukonceny' | 'odlozeny' | 'zruseny';
  pocet_divakov?: number | null;
  poznamky?: string | null;
  video_url?: string | null;
  clanok_id?: number | null;
  galeria_id?: number | null;
  aktivity: boolean;
  vytvoreny: Date;
  aktualizovany: Date;
}

// Interface pre vytvorenie nového Zápasu (bez automatických polí)
interface ZapasCreationAttributes extends Optional<ZapasAttributes, 'id' | 'kolo' | 'miesto' | 'goly_domaci' | 'goly_hostia' | 'pocet_divakov' | 'poznamky' | 'video_url' | 'clanok_id' | 'galeria_id' | 'aktivity' | 'vytvoreny' | 'aktualizovany'> {}

// Trieda pre model Zapas
class Zapas extends Model<ZapasAttributes, ZapasCreationAttributes> implements ZapasAttributes {
  public id!: number;
  public nazov!: string;
  public liga_id!: number;
  public kolo!: string | null;
  public datum_cas!: Date;
  public miesto!: string | null;
  public domaci_tim_id!: number;
  public hostujuci_tim_id!: number;
  public goly_domaci!: number | null;
  public goly_hostia!: number | null;
  public status!: 'naplanovany' | 'prebieha' | 'ukonceny' | 'odlozeny' | 'zruseny';
  public pocet_divakov!: number | null;
  public poznamky!: string | null;
  public video_url!: string | null;
  public clanok_id!: number | null;
  public galeria_id!: number | null;
  public aktivity!: boolean;
  public vytvoreny!: Date;
  public aktualizovany!: Date;

  // Association properties (pridáme neskôr)
  public liga?: any;
  public domaci_tim?: any;
  public hostujuci_tim?: any;
  public clanok?: any;
  public galeria?: any;

  // Helper method - vracia výsledok zápasu
  public getVysledok(): string {
    if (this.goly_domaci === null || this.goly_hostia === null) {
      return '-:-';
    }
    return `${this.goly_domaci}:${this.goly_hostia}`;
  }

  // Helper method - vracia názov zápasu s výsledkom
  public getFullName(): string {
    const vysledok = this.getVysledok();
    if (vysledok === '-:-') {
      return this.nazov;
    }
    return `${this.nazov} (${vysledok})`;
  }

  // Helper method - kontroluje či je zápas ukončený
  public isUkonceny(): boolean {
    return this.status === 'ukonceny';
  }

  // Helper method - kontroluje či má zápas výsledok
  public hasVysledok(): boolean {
    return this.goly_domaci !== null && this.goly_hostia !== null;
  }

  // Helper method - vracia víťaza zápasu
  public getVitaz(): 'domaci' | 'hostia' | 'remiza' | 'neukonceny' {
    if (!this.hasVysledok()) {
      return 'neukonceny';
    }
    
    if (this.goly_domaci! > this.goly_hostia!) {
      return 'domaci';
    } else if (this.goly_hostia! > this.goly_domaci!) {
      return 'hostia';
    } else {
      return 'remiza';
    }
  }

  // Helper method - kontroluje či je zápas v budúcnosti
  public isBuduci(): boolean {
    return this.datum_cas > new Date();
  }

  // Helper method - vracia status čitateľne
  public getStatusName(): string {
    const statusNames = {
      'naplanovany': 'Naplánovaný',
      'prebieha': 'Prebieha',
      'ukonceny': 'Ukončený',
      'odlozeny': 'Odložený',
      'zruseny': 'Zrušený'
    };
    return statusNames[this.status] || this.status;
  }

  // Helper method pre JSON response (bez citlivých dát)
  public toSafeJSON() {
    return {
      id: this.id,
      nazov: this.nazov,
      liga_id: this.liga_id,
      kolo: this.kolo,
      datum_cas: this.datum_cas,
      miesto: this.miesto,
      domaci_tim_id: this.domaci_tim_id,
      hostujuci_tim_id: this.hostujuci_tim_id,
      goly_domaci: this.goly_domaci,
      goly_hostia: this.goly_hostia,
      status: this.status,
      pocet_divakov: this.pocet_divakov,
      poznamky: this.poznamky,
      video_url: this.video_url,
      clanok_id: this.clanok_id,
      galeria_id: this.galeria_id,
      aktivity: this.aktivity,
      // Helper fields
      vysledok: this.getVysledok(),
      full_name: this.getFullName(),
      is_ukonceny: this.isUkonceny(),
      has_vysledok: this.hasVysledok(),
      vitaz: this.getVitaz(),
      is_buduci: this.isBuduci(),
      status_name: this.getStatusName(),
      vytvoreny: this.vytvoreny,
      aktualizovany: this.aktualizovany,
    };
  }
}

// Definícia modelu v databáze
Zapas.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nazov: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [5, 200],
      },
    },
    liga_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ligy',
        key: 'id',
      },
    },
    kolo: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    datum_cas: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true,
      },
    },
    miesto: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    domaci_tim_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'timy',
        key: 'id',
      },
    },
    hostujuci_tim_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'timy',
        key: 'id',
      },
      validate: {
        // Validácia že domáci a hosťujúci tím nie sú rovnaké
        notSameAsHome(value: number) {
          if (value === this.domaci_tim_id) {
            throw new Error('Domáci a hosťujúci tím nemôžu byť rovnaké');
          }
        }
      }
    },
    goly_domaci: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 50, // Rozumný limit
      },
    },
    goly_hostia: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 50, // Rozumný limit
      },
    },
    status: {
      type: DataTypes.ENUM('naplanovany', 'prebieha', 'ukonceny', 'odlozeny', 'zruseny'),
      allowNull: false,
      defaultValue: 'naplanovany',
    },
    pocet_divakov: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 200000, // Rozumný limit
      },
    },
    poznamky: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    video_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    clanok_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'clanky',
        key: 'id',
      },
    },
    galeria_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      // TODO: Pridáme referenciu na galérie v budúcej fáze
    },
    aktivity: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
    tableName: 'zapasy',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
    indexes: [
      {
        fields: ['liga_id'],
      },
      {
        fields: ['domaci_tim_id'],
      },
      {
        fields: ['hostujuci_tim_id'],
      },
      {
        fields: ['datum_cas'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['aktivity'],
      },
    ],
    hooks: {
      // Hook pre validáciu výsledku
      beforeSave: async (zapas: Zapas) => {
        // Ak je zápas ukončený, musí mať výsledok
        if (zapas.status === 'ukonceny' && (!zapas.hasVysledok())) {
          throw new Error('Ukončený zápas musí mať zadaný výsledok');
        }
        
        // Ak je zápas naplánovaný a má výsledok, zmeň status na ukončený
        if (zapas.status === 'naplanovany' && zapas.hasVysledok()) {
          zapas.status = 'ukonceny';
        }
      },
    },
  }
);

export default Zapas;