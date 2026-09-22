// backend/src/models/Zapas.ts
// Model pre zápasy - FÁZA 4 (OPRAVENÝ)

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { overObrazkovySubor } from '../utils/obrazokValidator';

// Interface pre atribúty Zápasu
interface ZapasAttributes {
  id: number;
  nazov: string;
  
  // Liga môže byť z databázy alebo custom
  liga_id?: number | null;
  liga_nazov?: string | null;
  
  kolo?: string | null;
  datum_cas: Date;
  miesto?: string | null;
  /** Kde sa hrá. Pri „doma" sa miesto dopĺňa zo štadióna domáceho tímu. */
  typ_zapasu: 'doma' | 'vonku' | 'neutralne';
  /** Štadión, na ktorom sa hrá - pri domácom zápase sa doplní sám */
  stadion_id?: number | null;
  /** Rozhodca, voliteľné textové pole */
  rozhodca?: string | null;
  /** Logo súpera, ktorý nie je náš tím */
  supier_logo?: string | null;
  
  // Tímy môžu byť z databázy alebo custom
  domaci_tim_id?: number | null;
  domaci_tim_nazov?: string | null;
  hostujuci_tim_id?: number | null;
  hostujuci_tim_nazov?: string | null;
  
  goly_domaci?: number | null;
  goly_hostia?: number | null;
  status: 'naplanovany' | 'prebieha' | 'ukonceny' | 'odlozeny' | 'zruseny';
  pocet_divakov?: number | null;
  poznamky?: string | null;
  video_url?: string | null;
  clanok_id?: number | null;
  fotogaleria_id?: number | null;
  aktivity: boolean;
  vytvoreny: Date;
  aktualizovany: Date;
}

// Interface pre vytvorenie nového Zápasu (bez automatických polí)
interface ZapasCreationAttributes extends Optional<ZapasAttributes, 
  'id' | 'liga_id' | 'liga_nazov' | 'kolo' | 'miesto' |
  'typ_zapasu' | 'stadion_id' | 'rozhodca' | 'supier_logo' | 
  'domaci_tim_id' | 'domaci_tim_nazov' | 'hostujuci_tim_id' | 'hostujuci_tim_nazov' | 
  'goly_domaci' | 'goly_hostia' | 'pocet_divakov' | 'poznamky' | 'video_url' | 
  'clanok_id' | 'fotogaleria_id' | 'aktivity' | 'vytvoreny' | 'aktualizovany'> {}

// Trieda pre model Zapas
class Zapas extends Model<ZapasAttributes, ZapasCreationAttributes> implements ZapasAttributes {
  public id!: number;
  public nazov!: string;
  
  // Liga handling
  public liga_id!: number | null;
  public liga_nazov!: string | null;
  
  public kolo!: string | null;
  public datum_cas!: Date;
  public miesto!: string | null;
  public typ_zapasu!: 'doma' | 'vonku' | 'neutralne';
  public stadion_id!: number | null;
  public rozhodca!: string | null;
  public supier_logo!: string | null;
  
  // Tím handling
  public domaci_tim_id!: number | null;
  public domaci_tim_nazov!: string | null;
  public hostujuci_tim_id!: number | null;
  public hostujuci_tim_nazov!: string | null;
  
  public goly_domaci!: number | null;
  public goly_hostia!: number | null;
  public status!: 'naplanovany' | 'prebieha' | 'ukonceny' | 'odlozeny' | 'zruseny';
  public pocet_divakov!: number | null;
  public poznamky!: string | null;
  public video_url!: string | null;
  public clanok_id!: number | null;
  public fotogaleria_id!: number | null;
  public aktivity!: boolean;
  public vytvoreny!: Date;
  public aktualizovany!: Date;

  // Association properties (pridáme neskôr)
  public liga?: any;
  public domaci_tim?: any;
  public hostujuci_tim?: any;
  public clanok?: any;
  public fotogaleria?: any;

  // Helper method - vracia slovenský názov statusu zápasu (chýbala, volali ju skripty)
  public getStatusName(): string {
    const statusNames: Record<string, string> = {
      naplanovany: 'Naplánovaný',
      prebieha: 'Prebieha',
      ukonceny: 'Ukončený',
      odlozeny: 'Odložený',
      zruseny: 'Zrušený',
    };
    return statusNames[this.status] || this.status;
  }

  // Helper method - kontroluje, či je zápas ukončený (chýbala, volali ju skripty)
  public isUkonceny(): boolean {
    return this.status === 'ukonceny';
  }

  // Helper method - kontroluje, či je zápas v budúcnosti (naplánovaný a ešte nezačal)
  public isBuduci(): boolean {
    return this.status === 'naplanovany' && new Date(this.datum_cas) > new Date();
  }

  // Helper method - vracia názov ligy (databáza alebo custom)
  public getLigaNazov(): string | null {
    if (this.liga?.nazov) {
      return this.liga.nazov;
    }
    return this.liga_nazov;
  }

  // Helper method - vracia názov domáceho tímu
  public getDomaciTimNazov(): string | null {
    if (this.domaci_tim?.nazov) {
      return this.domaci_tim.nazov;
    }
    return this.domaci_tim_nazov;
  }

  // Helper method - vracia názov hosťujúceho tímu
  public getHostujuciTimNazov(): string | null {
    if (this.hostujuci_tim?.nazov) {
      return this.hostujuci_tim.nazov;
    }
    return this.hostujuci_tim_nazov;
  }

  // Helper method - vracia výsledok zápasu
  public getVysledok(): string {
    if (this.goly_domaci === null || this.goly_hostia === null) {
      return '-:-';
    }
    return `${this.goly_domaci}:${this.goly_hostia}`;
  }

  // Helper method - vracia názov zápasu s výsledkom
  public getFullName(): string {
    const domaciNazov = this.getDomaciTimNazov() || 'Neznámy tím';
    const hostujuciNazov = this.getHostujuciTimNazov() || 'Neznámy tím';
    const vysledok = this.getVysledok();
    
    if (vysledok === '-:-') {
      return `${domaciNazov} vs ${hostujuciNazov}`;
    }
    return `${domaciNazov} vs ${hostujuciNazov} (${vysledok})`;
  }

  // Helper method - vracia automatický status na základe času
  public getAutoStatus(): 'naplanovany' | 'prebieha' | 'ukonceny' {
    const now = new Date();
    const matchTime = new Date(this.datum_cas);
    const twoHoursAfter = new Date(matchTime.getTime() + 2 * 60 * 60 * 1000);

    if (matchTime > now) {
      return 'naplanovany';
    } else if (now <= twoHoursAfter) {
      return 'prebieha';
    } else {
      return 'ukonceny';
    }
  }

  // Helper method - vracia skutočný status (auto alebo manuálny)
  public getActualStatus(): 'naplanovany' | 'prebieha' | 'ukonceny' | 'odlozeny' | 'zruseny' {
    // Ak je status manuálne nastavený na zrušený/odložený, ponechaj to
    if (this.status === 'zruseny' || this.status === 'odlozeny') {
      return this.status;
    }
    
    // Inak použij automatický status
    return this.getAutoStatus();
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

  // Helper method - kontroluje či je tím z databázy alebo custom
  public hasDbTeams(): boolean {
    return this.domaci_tim_id !== null && this.hostujuci_tim_id !== null;
  }

  // Helper method - kontroluje či je liga z databázy alebo custom  
  public hasDbLiga(): boolean {
    return this.liga_id !== null;
  }

  // Helper method pre JSON response (bez citlivých dát)
  public toSafeJSON() {
    return {
      id: this.id,
      nazov: this.nazov,
      liga_id: this.liga_id,
      liga_nazov: this.liga_nazov,
      kolo: this.kolo,
      datum_cas: this.datum_cas,
      miesto: this.miesto,
      typ_zapasu: this.typ_zapasu,
      stadion_id: this.stadion_id,
      rozhodca: this.rozhodca,
      supier_logo: this.supier_logo,
      domaci_tim_id: this.domaci_tim_id,
      domaci_tim_nazov: this.domaci_tim_nazov,
      hostujuci_tim_id: this.hostujuci_tim_id,
      hostujuci_tim_nazov: this.hostujuci_tim_nazov,
      goly_domaci: this.goly_domaci,
      goly_hostia: this.goly_hostia,
      status: this.status,
      actual_status: this.getActualStatus(), // PRIDANÉ: skutočný status
      pocet_divakov: this.pocet_divakov,
      poznamky: this.poznamky,
      video_url: this.video_url,
      clanok_id: this.clanok_id,
      fotogaleria_id: this.fotogaleria_id,
      aktivity: this.aktivity,
      // Computed properties
      vysledok: this.getVysledok(),
      vitaz: this.getVitaz(),
      full_name: this.getFullName(),
      has_db_teams: this.hasDbTeams(),
      has_db_liga: this.hasDbLiga(),
      liga_display_name: this.getLigaNazov(),
      domaci_tim_display_name: this.getDomaciTimNazov(),
      hostujuci_tim_display_name: this.getHostujuciTimNazov(),
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
    // Liga handling - buď ID alebo custom názov
    liga_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'ligy',
        key: 'id',
      },
      validate: {
        customLigaValidation(value: any) {
          // Aspoň jeden z týchto polí musí byť vyplnený
          if (!value && !this.liga_nazov) {
            throw new Error('Liga ID alebo Liga názov musí byť zadaný');
          }
        }
      }
    },
    liga_nazov: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [2, 100],
      },
    },
    kolo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: [1, 50],
      },
    },
    datum_cas: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        notEmpty: true,
        isDate: true,
      },
    },
    miesto: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [2, 100],
      },
    },
    typ_zapasu: {
      // Pri "doma" sa miesto konania doplní zo štadióna domáceho tímu,
      // pri "vonku" a "neutralne" ho zadáva používateľ.
      type: DataTypes.ENUM('doma', 'vonku', 'neutralne'),
      allowNull: false,
      defaultValue: 'doma',
    },
    stadion_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'stadiony', key: 'id' },
    },
    rozhodca: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    supier_logo: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        jePlatnyObrazok: overObrazkovySubor,
      },
    },
    // Domáci tím handling - buď ID alebo custom názov
    domaci_tim_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'timy',
        key: 'id',
      },
      validate: {
        customDomaciTimValidation(value: any) {
          // Aspoň jeden z týchto polí musí byť vyplnený
          if (!value && !this.domaci_tim_nazov) {
            throw new Error('Domáci tím ID alebo názov musí byť zadaný');
          }
        }
      }
    },
    domaci_tim_nazov: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [2, 100],
      },
    },
    // Hosťujúci tím handling - buď ID alebo custom názov
    hostujuci_tim_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'timy',
        key: 'id',
      },
      validate: {
        customHostujuciTimValidation(value: any) {
          // Aspoň jeden z týchto polí musí byť vyplnený
          if (!value && !this.hostujuci_tim_nazov) {
            throw new Error('Hosťujúci tím ID alebo názov musí byť zadaný');
          }
        }
      }
    },
    hostujuci_tim_nazov: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [2, 100],
      },
    },
    goly_domaci: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 50,
      },
    },
    goly_hostia: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 50,
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
        max: 200000,
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
    fotogaleria_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      // TODO: Pridať referenciu na fotogalériu keď bude implementovaná
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
    modelName: 'Zapas',
    tableName: 'zapasy',
    timestamps: false, // Používame vlastné polia vytvoreny/aktualizovany
    hooks: {
      beforeUpdate: (zapas: Zapas) => {
        zapas.aktualizovany = new Date();
      },
      beforeCreate: (zapas: Zapas) => {
        const now = new Date();
        zapas.vytvoreny = now;
        zapas.aktualizovany = now;
        
        // Automatické generovanie názvu ak nie je zadaný
        if (!zapas.nazov) {
          const domaciNazov = zapas.domaci_tim_nazov || 'Domáci tím';
          const hostujuciNazov = zapas.hostujuci_tim_nazov || 'Hosťujúci tím';
          zapas.nazov = `${domaciNazov} vs ${hostujuciNazov}`;
        }
      },
    },
    indexes: [
      {
        fields: ['datum_cas'],
      },
      {
        fields: ['status'],
      },
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
        fields: ['aktivity'],
      },
    ],
  }
);

export default Zapas;