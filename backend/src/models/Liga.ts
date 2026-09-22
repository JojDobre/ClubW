// backend/src/models/Liga.ts
// Rozšírený model pre ligy s podporou tabuliek a turnajov - FÁZA 4+

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { overObrazkovySubor } from '../utils/obrazokValidator';

// Interface pre rozšírené atribúty Ligy
interface LigaAttributes {
  id: number;
  nazov: string;
  sezona: string;
  // Väzba na entitu sezóny. Textové pole sezona zostáva kvôli
  // spätnej kompatibilite existujúceho kódu.
  sezona_id?: number | null;
  /** Náš tím, ktorého sa súťaž týka - požiadavka ho žiada pri vytvorení ligy */
  tim_id?: number | null;
  typ: 'sutaz' | 'pohar' | 'priatelska';
  popis?: string | null;
  external_widget_url?: string | null;
  logo?: string | null;
  farba?: string | null;
  poradie: number;
  aktivity: boolean;
  
  // NOVÉ ROZŠÍRENIA PRE SÚŤAŽE
  datum_start?: Date | null;              // Začiatok súťaže
  datum_koniec?: Date | null;             // Koniec súťaže
  format: 'tabulka' | 'turnaj' | 'kombinovany'; // Formát súťaže
  pocet_timov?: number | null;            // Maximálny počet tímov
  
  // BODOVÝ SYSTÉM
  body_za_vitazstvo: number;              // Defaultne 3
  body_za_remizy: number;                 // Defaultne 1
  body_za_prehru: number;                 // Defaultne 0
  
  // NASTAVENIA TABUĽKY
  auto_update_tabulka: boolean;           // Automatická aktualizácia tabuľky
  zobrazit_formu: boolean;                // Zobrazovať formu tímov
  min_zapasov: number;                    // Minimálny počet zápasov pre zaradenie
  
  // TURNAJOVÉ NASTAVENIA
  turnaj_typ?: 'single_elimination' | 'double_elimination' | 'round_robin' | 'groups_playoff' | null;
  turnaj_pocet_postupujucich?: number | null; // Koľko postupuje z skupiny
  
  // IMPORT/EXPORT
  posledny_import?: Date | null;          // Kedy bola naposledy importovaná tabuľka
  external_sync: boolean;                 // Synchronizácia s externým zdrojom
  
  vytvoreny: Date;
  aktualizovany: Date;
}

// Interface pre vytvorenie novej Ligy (bez automatických polí)
interface LigaCreationAttributes extends Optional<LigaAttributes, 
  'id' | 'popis' | 'external_widget_url' | 'logo' | 'farba' | 'poradie' | 'aktivity' |
  'datum_start' | 'datum_koniec' | 'pocet_timov' | 'turnaj_typ' | 'turnaj_pocet_postupujucich' |
  'posledny_import' | 'external_sync' | 'vytvoreny' | 'aktualizovany'> {}

// Trieda pre model Liga
class Liga extends Model<LigaAttributes, LigaCreationAttributes> implements LigaAttributes {
  public id!: number;
  public nazov!: string;
  public sezona!: string;
  public sezona_id!: number | null;
  public tim_id!: number | null;
  public typ!: 'sutaz' | 'pohar' | 'priatelska';
  public popis!: string | null;
  public external_widget_url!: string | null;
  public logo!: string | null;
  public farba!: string | null;
  public poradie!: number;
  public aktivity!: boolean;
  
  // Nové polia
  public datum_start!: Date | null;
  public datum_koniec!: Date | null;
  public format!: 'tabulka' | 'turnaj' | 'kombinovany';
  public pocet_timov!: number | null;
  public body_za_vitazstvo!: number;
  public body_za_remizy!: number;
  public body_za_prehru!: number;
  public auto_update_tabulka!: boolean;
  public zobrazit_formu!: boolean;
  public min_zapasov!: number;
  public turnaj_typ!: 'single_elimination' | 'double_elimination' | 'round_robin' | 'groups_playoff' | null;
  public turnaj_pocet_postupujucich!: number | null;
  public posledny_import!: Date | null;
  public external_sync!: boolean;
  public vytvoreny!: Date;
  public aktualizovany!: Date;

  // Existujúce helper methods
  public getFullName(): string {
    return `${this.nazov} ${this.sezona}`;
  }

  public getTypeName(): string {
    const types = {
      'sutaz': 'Súťaž',
      'pohar': 'Pohár', 
      'priatelska': 'Priateľská'
    };
    return types[this.typ] || this.typ;
  }

  public hasExternalWidget(): boolean {
    return !!(this.external_widget_url && this.external_widget_url.length > 0);
  }

  // NOVÉ HELPER METHODS
  
  // Získanie názvu formátu
  public getFormatName(): string {
    const formats = {
      'tabulka': 'Liga (tabuľka)',
      'turnaj': 'Turnaj (vyraďovačka)',
      'kombinovany': 'Kombinovaný (skupiny + playoff)'
    };
    return formats[this.format] || this.format;
  }

  // Získanie názvu turnajového typu
  public getTurnajTypeName(): string {
    if (!this.turnaj_typ) return 'N/A';
    
    const types = {
      'single_elimination': 'Jednoduché vyraďovačka',
      'double_elimination': 'Dvojitá vyraďovačka', 
      'round_robin': 'Každý s každým',
      'groups_playoff': 'Skupiny + Playoff'
    };
    return types[this.turnaj_typ] || this.turnaj_typ;
  }

  // Kontrola či je súťaž aktívna (podľa dátumu)
  public isActiveByDate(): boolean {
    const now = new Date();
    
    if (!this.datum_start && !this.datum_koniec) {
      return this.aktivity; // Ak nie sú nastavené dátumy, spoliehame sa na aktivity flag
    }
    
    if (this.datum_start && now < this.datum_start) {
      return false; // Ešte nezačala
    }
    
    if (this.datum_koniec && now > this.datum_koniec) {
      return false; // Už skončila
    }
    
    return this.aktivity;
  }

  // Získanie statusu súťaže
  public getStatus(): 'upcoming' | 'active' | 'finished' | 'inactive' {
    if (!this.aktivity) return 'inactive';
    
    const now = new Date();
    
    if (this.datum_start && now < this.datum_start) {
      return 'upcoming';
    }
    
    if (this.datum_koniec && now > this.datum_koniec) {
      return 'finished';
    }
    
    return 'active';
  }

  // Kontrola či má ligu nastavenú automatickú aktualizáciu tabuľky
  public hasAutoUpdateEnabled(): boolean {
    return this.auto_update_tabulka && this.format !== 'turnaj';
  }

  // Kontrola či má nastavený custom bodový systém
  public hasCustomScoring(): boolean {
    return this.body_za_vitazstvo !== 3 || this.body_za_remizy !== 1 || this.body_za_prehru !== 0;
  }

  // Helper method pre rozšírený JSON response
  public toSafeJSON() {
    return {
      id: this.id,
      nazov: this.nazov,
      sezona: this.sezona,
      sezona_id: this.sezona_id,
      // Náš tím, ktorého sa súťaž týka
      tim_id: this.tim_id,
      typ: this.typ,
      popis: this.popis,
      external_widget_url: this.external_widget_url,
      logo: this.logo,
      farba: this.farba,
      poradie: this.poradie,
      aktivity: this.aktivity,
      
      // Nové polia
      datum_start: this.datum_start,
      datum_koniec: this.datum_koniec,
      format: this.format,
      pocet_timov: this.pocet_timov,
      body_za_vitazstvo: this.body_za_vitazstvo,
      body_za_remizy: this.body_za_remizy,
      body_za_prehru: this.body_za_prehru,
      auto_update_tabulka: this.auto_update_tabulka,
      zobrazit_formu: this.zobrazit_formu,
      min_zapasov: this.min_zapasov,
      turnaj_typ: this.turnaj_typ,
      turnaj_pocet_postupujucich: this.turnaj_pocet_postupujucich,
      posledny_import: this.posledny_import,
      external_sync: this.external_sync,
      
      // Helper polia
      full_name: this.getFullName(),
      typ_name: this.getTypeName(),
      format_name: this.getFormatName(),
      turnaj_typ_name: this.getTurnajTypeName(),
      has_external_widget: this.hasExternalWidget(),
      status: this.getStatus(),
      is_active_by_date: this.isActiveByDate(),
      has_auto_update: this.hasAutoUpdateEnabled(),
      has_custom_scoring: this.hasCustomScoring(),
      
      vytvoreny: this.vytvoreny,
      aktualizovany: this.aktualizovany,
    };
  }
}

// Definícia modelu v databáze
Liga.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nazov: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    sezona: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [4, 20], // napr. "2024/2025" alebo "2024"
        is: /^[0-9/\-\s]+$/, // Len čísla, lomky, pomlčky a medzery
      },
    },
    sezona_id: {
      // Odkaz na tabuľku sezón. Nullable kvôli existujúcim záznamom,
      // migrácia ho pri všetkých ligách naplní.
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'sezony', key: 'id' },
    },
    tim_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'timy', key: 'id' },
    },
    typ: {
      type: DataTypes.ENUM('sutaz', 'pohar', 'priatelska'),
      allowNull: false,
      defaultValue: 'sutaz',
    },
    popis: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    external_widget_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    logo: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        // Logo býva nahraté do uploads, nie externá adresa
        jePlatnyObrazok: overObrazkovySubor,
      },
    },
    farba: {
      type: DataTypes.STRING(7), // Pre hex farby #RRGGBB
      allowNull: true,
      validate: {
        is: /^#[0-9A-F]{6}$/i,
      },
    },
    poradie: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    aktivity: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    
    // NOVÉ POLIA PRE ROZŠÍRENÚ FUNKCIONALITU
    datum_start: {
      type: DataTypes.DATEONLY, // Len dátum bez času
      allowNull: true,
      validate: {
        isDate: true,
      },
    },
    datum_koniec: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      validate: {
        isDate: true,
        isAfterStart(value: string) {
          // @ts-ignore - this context v Sequelize validácii
          if (value && this.datum_start && new Date(value) <= new Date(this.datum_start)) {
            throw new Error('Dátum ukončenia musí byť po dátume začiatku');  
          }
}
      },
    },
        format: {
      type: DataTypes.ENUM('tabulka', 'turnaj', 'kombinovany'),
      allowNull: false,
      defaultValue: 'tabulka',
    },
    pocet_timov: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 2,
        max: 100,
      },
    },
    
    // BODOVÝ SYSTÉM
    body_za_vitazstvo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      validate: {
        min: 0,
        max: 10,
      },
    },
    body_za_remizy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 0,
        max: 10,
      },
    },
    body_za_prehru: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 10,
      },
    },
    
    // NASTAVENIA TABUĽKY
    auto_update_tabulka: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    zobrazit_formu: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    min_zapasov: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 50,
      },
    },
    
    // TURNAJOVÉ NASTAVENIA
    turnaj_typ: {
      type: DataTypes.ENUM('single_elimination', 'double_elimination', 'round_robin', 'groups_playoff'),
      allowNull: true,
    },
    turnaj_pocet_postupujucich: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 32,
      },
    },
    
    // IMPORT/EXPORT
    posledny_import: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    external_sync: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    tableName: 'ligy',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
    indexes: [
      {
        unique: true,
        fields: ['nazov', 'sezona'], // Jedinečná kombinácia názvu a sezóny
      },
      {
        fields: ['typ'],
      },
      {
        fields: ['aktivity'],
      },
      {
        fields: ['poradie'],
      },
      {
        fields: ['format'],
      },
      {
        fields: ['datum_start'],
      },
      {
        fields: ['datum_koniec'],
      },
    ],
    hooks: {
      // Hook pre automatické generovanie poradia
      beforeCreate: async (liga: Liga) => {
        if (liga.poradie === 0) {
          const maxPoradie = await Liga.max('poradie', {
            where: { aktivity: true }
          }) as number;
          liga.poradie = (maxPoradie || 0) + 1;
        }
      },
      
      // Validácia turnajových nastavení
      beforeSave: async (liga: Liga) => {
        // Ak je formát turnaj, turnaj_typ je povinný
        if (liga.format === 'turnaj' && !liga.turnaj_typ) {
          throw new Error('Pre turnajový formát je potrebné zvoliť typ turnaja');
        }
        
        // Ak je kombinovaný formát, potrebujeme nastavenia
        if (liga.format === 'kombinovany' && (!liga.turnaj_typ || !liga.turnaj_pocet_postupujucich)) {
          throw new Error('Pre kombinovaný formát je potrebné nastaviť typ turnaja a počet postupujúcich');
        }
        
        // Pre tabuľku nie je potrebný turnaj_typ
        if (liga.format === 'tabulka') {
          liga.turnaj_typ = null;
          liga.turnaj_pocet_postupujucich = null;
        }
      },
    },
  }
);

export default Liga;