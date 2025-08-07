// backend/src/models/LigaTurnaj.ts
// Model pre turnaje a pavúky - NOVÝ

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// Interface pre atribúty LigaTurnaj
interface LigaTurnajAttributes {
  id: number;
  liga_id: number;                          // FK na ligu
  nazov: string;                            // Názov turnaja/fázy
  typ: 'single_elimination' | 'double_elimination' | 'round_robin' | 'groups_playoff';
  
  // ŠTRUKTÚRA TURNAJA
  pocet_timov: number;                      // Celkový počet tímov
  pocet_postupujucich?: number | null;      // Koľko postupuje do ďalšej fázy
  aktualna_faza: string;                    // "skupina_a", "osemfinale", "finale", atď.
  celkove_fazy: string[];                   // Array všetkých fáz turnaja
  
  // SKUPINOVÉ NASTAVENIA (pre groups_playoff a round_robin)
  pocet_skupin?: number | null;             // Počet skupín
  skupiny_struktura?: string | null;        // JSON s nastavením skupín
  
  // VYRAĎOVACIE NASTAVENIA
  pavuk_struktura?: string | null;          // JSON s pavúkom
  ma_tretie_miesto: boolean;                // Či sa hrá o 3. miesto
  
  // STATUS A METADATA
  status: 'pripravuje' | 'prebiehajuci' | 'ukonceny' | 'pozastaveny';
  datum_start?: Date | null;
  datum_koniec?: Date | null;
  vitaz_id?: number | null;                 // FK na víťazný tím
  druhy_id?: number | null;                 // FK na druhý tím
  treti_id?: number | null;                 // FK na tretí tím
  
  poznamky?: string | null;
  aktivity: boolean;
  vytvoreny: Date;
  aktualizovany: Date;
}

// Interface pre vytvorenie turnaja
interface LigaTurnajCreationAttributes extends Optional<LigaTurnajAttributes,
  'id' | 'pocet_postupujucich' | 'pocet_skupin' | 'skupiny_struktura' | 'pavuk_struktura' |
  'datum_start' | 'datum_koniec' | 'vitaz_id' | 'druhy_id' | 'treti_id' | 'poznamky' |
  'aktivity' | 'vytvoreny' | 'aktualizovany'> {}

// Trieda pre model LigaTurnaj
class LigaTurnaj extends Model<LigaTurnajAttributes, LigaTurnajCreationAttributes> implements LigaTurnajAttributes {
  public id!: number;
  public liga_id!: number;
  public nazov!: string;
  public typ!: 'single_elimination' | 'double_elimination' | 'round_robin' | 'groups_playoff';
  public pocet_timov!: number;
  public pocet_postupujucich!: number | null;
  public aktualna_faza!: string;
  public celkove_fazy!: string[];
  public pocet_skupin!: number | null;
  public skupiny_struktura!: string | null;
  public pavuk_struktura!: string | null;
  public ma_tretie_miesto!: boolean;
  public status!: 'pripravuje' | 'prebiehajuci' | 'ukonceny' | 'pozastaveny';
  public datum_start!: Date | null;
  public datum_koniec!: Date | null;
  public vitaz_id!: number | null;
  public druhy_id!: number | null;
  public treti_id!: number | null;
  public poznamky!: string | null;
  public aktivity!: boolean;
  public vytvoreny!: Date;
  public aktualizovany!: Date;

  // Association properties
  public liga?: any;
  public vitaz?: any;
  public druhy?: any;
  public treti?: any;
  public turnaj_zapasy?: any[];

  // HELPER METHODS
  
  // Získanie názvu typu turnaja
  public getTypNazov(): string {
    const typy = {
      'single_elimination': 'Jednoduché vyraďovačka',
      'double_elimination': 'Dvojitá vyraďovačka',
      'round_robin': 'Každý s každým',
      'groups_playoff': 'Skupiny + Playoff'
    };
    return typy[this.typ] || this.typ;
  }

  // Získanie názvu statusu
  public getStatusNazov(): string {
    const statusy = {
      'pripravuje': 'Príprava',
      'prebiehajuci': 'Prebieha',
      'ukonceny': 'Ukončený',
      'pozastaveny': 'Pozastavený'
    };
    return statusy[this.status] || this.status;
  }

  // Kontrola či je turnaj aktívny
  public isActive(): boolean {
    return this.aktivity && this.status === 'prebiehajuci';
  }

  // Kontrola či je turnaj ukončený
  public isFinished(): boolean {
    return this.status === 'ukonceny' && !!this.vitaz_id;
  }

  // Získanie štruktúry skupín ako JSON
  public getSkupinyStruktura(): any {
    if (!this.skupiny_struktura) return null;
    try {
      return JSON.parse(this.skupiny_struktura);
    } catch {
      return null;
    }
  }

  // Nastavenie štruktúry skupín
  public setSkupinyStruktura(struktura: any): void {
    this.skupiny_struktura = JSON.stringify(struktura);
  }

  // Získanie štruktúry pavúka ako JSON
  public getPavukStruktura(): any {
    if (!this.pavuk_struktura) return null;
    try {
      return JSON.parse(this.pavuk_struktura);
    } catch {
      return null;
    }
  }

  // Nastavenie štruktúry pavúka
  public setPavukStruktura(struktura: any): void {
    this.pavuk_struktura = JSON.stringify(struktura);
  }

  // Generovanie základnej štruktúry turnaja
  public generateTournamentStructure(timy: number[]): void {
    const struktura: any = {};

    switch (this.typ) {
      case 'single_elimination':
        struktura.rounds = this.generateEliminationRounds(timy.length);
        struktura.matches = this.generateEliminationMatches(timy);
        break;

      case 'round_robin':
        struktura.matches = this.generateRoundRobinMatches(timy);
        break;

      case 'groups_playoff':
        struktura.groups = this.generateGroupStructure(timy);
        struktura.playoff = this.generatePlayoffStructure();
        break;

      case 'double_elimination':
        struktura.winners_bracket = this.generateEliminationRounds(timy.length);
        struktura.losers_bracket = this.generateLosersBracket(timy.length);
        struktura.matches = this.generateDoubleEliminationMatches(timy);
        break;
    }

    this.setPavukStruktura(struktura);
  }

  // Generovanie kôl pre vyraďovačku
  private generateEliminationRounds(pocetTimov: number): string[] {
    const rounds: string[] = [];
    let currentRound = pocetTimov;

    while (currentRound > 1) {
      if (currentRound === 2) {
        rounds.push('finale');
      } else if (currentRound === 4) {
        rounds.push('semifinale');
      } else if (currentRound === 8) {
        rounds.push('stvrtfinale');
      } else if (currentRound === 16) {
        rounds.push('osemfinale');
      } else {
        rounds.push(`${currentRound}-finále`);
      }
      currentRound = Math.ceil(currentRound / 2);
    }

    return rounds.reverse();
  }

  // Generovanie zápasov pre vyraďovačku
  private generateEliminationMatches(timy: number[]): any[] {
    const matches: any[] = [];
    let currentRound = 0;
    let currentTeams = [...timy];

    while (currentTeams.length > 1) {
      const roundMatches: any[] = [];
      
      for (let i = 0; i < currentTeams.length; i += 2) {
        if (i + 1 < currentTeams.length) {
          roundMatches.push({
            id: `r${currentRound}_m${Math.floor(i/2)}`,
            round: currentRound,
            team1_id: currentTeams[i],
            team2_id: currentTeams[i + 1],
            winner_id: null,
            next_match_id: currentRound > 0 ? `r${currentRound-1}_m${Math.floor(Math.floor(i/2)/2)}` : null
          });
        }
      }

      matches.push(...roundMatches);
      currentTeams = new Array(Math.ceil(currentTeams.length / 2)).fill(null);
      currentRound++;
    }

    return matches;
  }

  // Generovanie zápasov pre každý s každým
  private generateRoundRobinMatches(timy: number[]): any[] {
    const matches: any[] = [];
    let matchId = 0;

    for (let i = 0; i < timy.length; i++) {
      for (let j = i + 1; j < timy.length; j++) {
        matches.push({
          id: `rr_${matchId}`,
          team1_id: timy[i],
          team2_id: timy[j],
          played: false,
          result: null
        });
        matchId++;
      }
    }

    return matches;
  }

  // Generovanie štruktúry skupín
  private generateGroupStructure(timy: number[]): any {
    const pocetSkupin = this.pocet_skupin || Math.ceil(timy.length / 4);
    const skupiny: any = {};
    
    // Rozdelenie tímov do skupín
    for (let i = 0; i < pocetSkupin; i++) {
      const groupLetter = String.fromCharCode(65 + i); // A, B, C, ...
      skupiny[`skupina_${groupLetter.toLowerCase()}`] = {
        nazov: `Skupina ${groupLetter}`,
        timy: [],
        tabulka: [],
        matches: []
      };
    }

    // Priradenie tímov do skupín (round-robin)
    timy.forEach((tim, index) => {
      const skupinaIndex = index % pocetSkupin;
      const skupinaKey = Object.keys(skupiny)[skupinaIndex];
      skupiny[skupinaKey].timy.push(tim);
    });

    // Generovanie zápasov pre každú skupinu
    Object.keys(skupiny).forEach(skupinaKey => {
      const skupina = skupiny[skupinaKey];
      const timySkupiny = skupina.timy;
      let matchId = 0;

      for (let i = 0; i < timySkupiny.length; i++) {
        for (let j = i + 1; j < timySkupiny.length; j++) {
          skupina.matches.push({
            id: `${skupinaKey}_${matchId}`,
            team1_id: timySkupiny[i],
            team2_id: timySkupiny[j],
            played: false,
            result: null
          });
          matchId++;
        }
      }
    });

    return skupiny;
  }

  // Generovanie playoff štruktúry
  private generatePlayoffStructure(): any {
    const postupujucich = this.pocet_postupujucich || 2;
    const celkemPostupujucich = postupujucich * (this.pocet_skupin || 4);
    
    return {
      pocet_postupujucich_zo_skupiny: postupujucich,
      celkem_postupujucich: celkemPostupujucich,
      rounds: this.generateEliminationRounds(celkemPostupujucich),
      matches: [] // Budú generované po skončení skupinovej fázy
    };
  }

  // Generovanie losers bracket pre double elimination
  private generateLosersBracket(pocetTimov: number): any[] {
    // Zložitejšia logika pre double elimination
    // Pre jednoduchost zatiaľ vrátime prázdny array
    return [];
  }

  // Generovanie zápasov pre double elimination
  private generateDoubleEliminationMatches(timy: number[]): any[] {
    // Kombinácia winners a losers bracket
    // Pre jednoduchost zatiaľ použijeme single elimination
    return this.generateEliminationMatches(timy);
  }

  // Získanie aktuálnej fázy ako čitateľný text
  public getCurrentPhaseDisplay(): string {
    const fazy: {[key: string]: string} = {
      'skupina_a': 'Skupina A',
      'skupina_b': 'Skupina B', 
      'skupina_c': 'Skupina C',
      'skupina_d': 'Skupina D',
      'osemfinale': 'Osemfinále',
      'stvrtfinale': 'Štvrťfinále',
      'semifinale': 'Semifinále',
      'finale': 'Finále',
      'o_tretie_miesto': 'O 3. miesto'
    };
    
    return fazy[this.aktualna_faza] || this.aktualna_faza;
  }

  // Kontrola či je možné postúpiť do ďalšej fázy
  public canAdvanceToNextPhase(): boolean {
    if (this.status !== 'prebiehajuci') return false;
    
    const struktura = this.getPavukStruktura();
    if (!struktura) return false;

    // Pre groups_playoff kontrolujeme či sú všetky skupiny ukončené
    if (this.typ === 'groups_playoff' && struktura.groups) {
      return Object.values(struktura.groups).every((skupina: any) => 
        skupina.matches.every((match: any) => match.played)
      );
    }

    return false;
  }

  // Postup do ďalšej fázy
  public advanceToNextPhase(): boolean {
    if (!this.canAdvanceToNextPhase()) return false;

    const currentIndex = this.celkove_fazy.indexOf(this.aktualna_faza);
    if (currentIndex === -1 || currentIndex === this.celkove_fazy.length - 1) {
      // Posledná fáza - ukončujeme turnaj
      this.status = 'ukonceny';
      return true;
    }

    this.aktualna_faza = this.celkove_fazy[currentIndex + 1];
    return true;
  }

  // Export do JSON pre bezpečné API
  public toSafeJSON() {
    return {
      id: this.id,
      liga_id: this.liga_id,
      nazov: this.nazov,
      typ: this.typ,
      pocet_timov: this.pocet_timov,
      pocet_postupujucich: this.pocet_postupujucich,
      aktualna_faza: this.aktualna_faza,
      celkove_fazy: this.celkove_fazy,
      pocet_skupin: this.pocet_skupin,
      ma_tretie_miesto: this.ma_tretie_miesto,
      status: this.status,
      datum_start: this.datum_start,
      datum_koniec: this.datum_koniec,
      vitaz_id: this.vitaz_id,
      druhy_id: this.druhy_id,
      treti_id: this.treti_id,
      poznamky: this.poznamky,
      aktivity: this.aktivity,
      vytvoreny: this.vytvoreny,
      aktualizovany: this.aktualizovany,
      
      // Helper polia
      typ_nazov: this.getTypNazov(),
      status_nazov: this.getStatusNazov(),
      is_active: this.isActive(),
      is_finished: this.isFinished(),
      current_phase_display: this.getCurrentPhaseDisplay(),
      can_advance: this.canAdvanceToNextPhase(),
      
      // Štruktúry (bez citlivých dát)
      skupiny_struktura: this.getSkupinyStruktura(),
      pavuk_struktura: this.getPavukStruktura(),
    };
  }

  // STATICKÉ METÓDY

  // Vytvorenie nového turnaja s automatickou štruktúrou
  static async createWithStructure(
    data: LigaTurnajCreationAttributes & { timy: number[] }
  ): Promise<LigaTurnaj> {
    const { timy, ...turnajData } = data;
    
    // Automatické nastavenie celkových fáz
    if (turnajData.typ === 'single_elimination') {
      const rounds = Math.ceil(Math.log2(timy.length));
      turnajData.celkove_fazy = new Array(rounds).fill(0).map((_, i) => `round_${i + 1}`);
      turnajData.aktualna_faza = 'round_1';
    } else if (turnajData.typ === 'groups_playoff') {
      turnajData.celkove_fazy = ['skupinova_faza', 'playoff'];
      turnajData.aktualna_faza = 'skupinova_faza';
    }

    const turnaj = await LigaTurnaj.create(turnajData);
    
    // Generovanie štruktúry
    turnaj.generateTournamentStructure(timy);
    await turnaj.save();

    return turnaj;
  }

  // Získanie turnaja pre ligu
  static async getForLeague(ligaId: number): Promise<LigaTurnaj | null> {
    return await LigaTurnaj.findOne({
      where: { 
        liga_id: ligaId,
        aktivity: true
      },
      include: [
        {
          model: require('./Team').default,
          as: 'vitaz',
          attributes: ['id', 'nazov', 'logo'],
          required: false
        },
        {
          model: require('./Team').default,
          as: 'druhy', 
          attributes: ['id', 'nazov', 'logo'],
          required: false
        },
        {
          model: require('./Team').default,
          as: 'treti',
          attributes: ['id', 'nazov', 'logo'], 
          required: false
        }
      ]
    });
  }
}

// Definícia modelu v databáze
LigaTurnaj.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    liga_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ligy',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    nazov: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    typ: {
      type: DataTypes.ENUM('single_elimination', 'double_elimination', 'round_robin', 'groups_playoff'),
      allowNull: false,
    },
    pocet_timov: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 2,
        max: 64,
      },
    },
    pocet_postupujucich: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 16,
      },
    },
    aktualna_faza: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'round_1',
    },
    celkove_fazy: {
      type: DataTypes.JSON, // Pre PostgreSQL/MySQL s JSON podporou
      allowNull: false,
      defaultValue: [],
    },
    pocet_skupin: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 2,
        max: 8,
      },
    },
    skupiny_struktura: {
      type: DataTypes.TEXT, // JSON ako text pre univerzálnosť
      allowNull: true,
    },
    pavuk_struktura: {
      type: DataTypes.TEXT, // JSON ako text
      allowNull: true,
    },
    ma_tretie_miesto: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    status: {
      type: DataTypes.ENUM('pripravuje', 'prebiehajuci', 'ukonceny', 'pozastaveny'),
      allowNull: false,
      defaultValue: 'pripravuje',
    },
    datum_start: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    datum_koniec: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    vitaz_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'timy',
        key: 'id',
      },
    },
    druhy_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'timy', 
        key: 'id',
      },
    },
    treti_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'timy',
        key: 'id',
      },
    },
    poznamky: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    tableName: 'liga_turnaje',
    timestamps: true,
    createdAt: 'vytvoreny',
    updatedAt: 'aktualizovany',
    indexes: [
      {
        unique: true,
        fields: ['liga_id'], // Jedna liga môže mať len jeden aktívny turnaj
        where: {
          aktivity: true
        }
      },
      {
        fields: ['liga_id'],
      },
      {
        fields: ['typ'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['aktualna_faza'],
      },
    ],
    hooks: {
      // Validácia pred vytvorením
      beforeCreate: async (turnaj: LigaTurnaj) => {
        // Pre groups_playoff je počet skupín povinný
        if (turnaj.typ === 'groups_playoff' && !turnaj.pocet_skupin) {
          throw new Error('Pre typ "groups_playoff" je potrebné zadať počet skupín');
        }
        
        // Pre groups_playoff je počet postupujúcich povinný
        if (turnaj.typ === 'groups_playoff' && !turnaj.pocet_postupujucich) {
          throw new Error('Pre typ "groups_playoff" je potrebné zadať počet postupujúcich zo skupiny');
        }
        
        // Kontrola logických limitov
        if (turnaj.pocet_skupin && turnaj.pocet_timov < turnaj.pocet_skupin * 2) {
          throw new Error('Počet tímov musí byť aspoň 2x väčší ako počet skupín');
        }
      },
      
      // Validácia pred uložením
      beforeSave: async (turnaj: LigaTurnaj) => {
        // Kontrola dátumov
        if (turnaj.datum_start && turnaj.datum_koniec && turnaj.datum_start >= turnaj.datum_koniec) {
          throw new Error('Dátum ukončenia musí byť po dátume začiatku');
        }
      },
    },
  }
);

export default LigaTurnaj;