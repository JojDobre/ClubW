// backend/src/models/LigaTabulka.ts
// Model pre tabuľky súťaží s poradím tímov - NOVÝ

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// Interface pre atribúty LigaTabulka
interface LigaTabulkaAttributes {
  id: number;
  liga_id: number;                  // FK na ligu
  tim_id?: number | null;                  // FK na tím (voliteľné - môže byť aj custom názov)
  custom_tim_nazov?: string | null; // Pre tímy mimo systému
  
  // POZÍCIA A ZÁKLADNÉ ÚDAJE
  pozicia: number;                  // Aktuálna pozícia v tabuľke
  body: number;                     // Celkové body
  
  // ZÁPASY
  zapasy: number;                   // Počet odohratých zápasov
  vitazstva: number;
  remizy: number;  
  prehry: number;
  
  // GÓLY
  goly_za: number;                  // Góly strelené
  goly_proti: number;               // Góly inkasované
  goly_rozdiel: number;             // Computed: goly_za - goly_proti
  
  // DETAILNÉ ŠTATISTIKY
  domace_zapasy?: number | null;    // Zápasy doma
  domace_vitazstva?: number | null;
  domace_remizy?: number | null;
  domace_prehry?: number | null;
  domace_goly_za?: number | null;
  domace_goly_proti?: number | null;
  
  vonkajsie_zapasy?: number | null; // Zápasy vonku
  vonkajsie_vitazstva?: number | null;
  vonkajsie_remizy?: number | null;
  vonkajsie_prehry?: number | null;
  vonkajsie_goly_za?: number | null;
  vonkajsie_goly_proti?: number | null;
  
  // FORMA A TRENDY
  forma?: string | null;            // Posledných 5 zápasov "WLDWW" (W=win, L=loss, D=draw)
  serie_zapasov?: number | null;    // Aktuálna séria (pozitívne = víťazstvá, negatívne = prehry)
  
  // PENALIZÁCIE A BONUSY
  penalizacne_body?: number | null; // Odobraté body (záporné číslo)
  bonus_body?: number | null;       // Bonusové body
  
  // METADATA
  posledny_zapas?: Date | null;     // Dátum posledného zápasu
  manualne_upravene: boolean;       // Či bola tabuľka manuálne upravená
  poznamky?: string | null;         // Poznámky k pozícii
  
  aktualizovany: Date;
  vytvoreny: Date;
}

// Interface pre vytvorenie záznamu (bez automatických polí)
interface LigaTabulkaCreationAttributes extends Optional<LigaTabulkaAttributes,
  'id' | 'custom_tim_nazov' | 'domace_zapasy' | 'domace_vitazstva' | 'domace_remizy' | 'domace_prehry' |
  'domace_goly_za' | 'domace_goly_proti' | 'vonkajsie_zapasy' | 'vonkajsie_vitazstva' | 'vonkajsie_remizy' |
  'vonkajsie_prehry' | 'vonkajsie_goly_za' | 'vonkajsie_goly_proti' | 'forma' | 'serie_zapasov' |
  'penalizacne_body' | 'bonus_body' | 'posledny_zapas' | 'poznamky' | 'vytvoreny' | 'aktualizovany'> {}

// Trieda pre model LigaTabulka
class LigaTabulka extends Model<LigaTabulkaAttributes, LigaTabulkaCreationAttributes> implements LigaTabulkaAttributes {
  public id!: number;
  public liga_id!: number;
  public tim_id!: number | null; 
  public custom_tim_nazov!: string | null;
  
  public pozicia!: number;
  public body!: number;
  
  public zapasy!: number;
  public vitazstva!: number;
  public remizy!: number;
  public prehry!: number;
  
  public goly_za!: number;
  public goly_proti!: number;
  public goly_rozdiel!: number;
  
  public domace_zapasy!: number | null;
  public domace_vitazstva!: number | null;
  public domace_remizy!: number | null;
  public domace_prehry!: number | null;
  public domace_goly_za!: number | null;
  public domace_goly_proti!: number | null;
  
  public vonkajsie_zapasy!: number | null;
  public vonkajsie_vitazstva!: number | null;
  public vonkajsie_remizy!: number | null;
  public vonkajsie_prehry!: number | null;
  public vonkajsie_goly_za!: number | null;
  public vonkajsie_goly_proti!: number | null;
  
  public forma!: string | null;
  public serie_zapasov!: number | null;
  
  public penalizacne_body!: number | null;
  public bonus_body!: number | null;
  
  public posledny_zapas!: Date | null;
  public manualne_upravene!: boolean;
  public poznamky!: string | null;
  
  public aktualizovany!: Date;
  public vytvoreny!: Date;

  // Association properties (pridáme v index.ts)
  public liga?: any;
  public tim?: any;

  // HELPER METHODS
  
  // Získanie názvu tímu (z DB alebo custom)
  public getTimNazov(): string {
    if (this.tim && this.tim.nazov) {
      return this.tim.nazov;
    }
    return this.custom_tim_nazov || 'Neznámy tím';
  }

  // Výpočet skutočných bodov (základné + bonus - penalizácie)
  public getSkutocneBody(): number {
    let body = this.body;
    if (this.penalizacne_body) body += this.penalizacne_body; // penalizačné body sú záporné
    if (this.bonus_body) body += this.bonus_body;
    return Math.max(0, body); // Body nemôžu byť záporné
  }

  // Kontrola či je záznam manuálne upravený
  public isManualnayUpravene(): boolean {
    return this.manualne_upravene;
  }

  // Formátovanie formy pre zobrazenie
  public getFormaDisplay(): string {
    if (!this.forma) return 'N/A';
    return this.forma
      .split('')
      .map(char => {
        switch (char) {
          case 'W': return '✅';
          case 'L': return '❌';
          case 'D': return '🤝';
          default: return char;
        }
      })
      .join(' ');
  }

  // Získanie priemeru gólov na zápas
  public getPriemerGolovNaZapas(): number {
    return this.zapasy > 0 ? Number((this.goly_za / this.zapasy).toFixed(2)) : 0;
  }

  // Získanie priemeru inkasovaných gólov na zápas
  public getPriemerInkasovanychNaZapas(): number {
    return this.zapasy > 0 ? Number((this.goly_proti / this.zapasy).toFixed(2)) : 0;
  }

  // Získanie percentuálnej úspešnosti
  public getUspesnost(): number {
    if (this.zapasy === 0) return 0;
    return Math.round((this.vitazstva / this.zapasy) * 100);
  }

  // Získanie formy ako array objektov
  public getFormaArray(): Array<{result: 'W' | 'D' | 'L', color: string}> {
    if (!this.forma) return [];
    
    return this.forma.split('').map(char => {
      switch (char) {
        case 'W': return { result: 'W' as const, color: '#10b981' }; // Zelená
        case 'D': return { result: 'D' as const, color: '#f59e0b' }; // Žltá  
        case 'L': return { result: 'L' as const, color: '#ef4444' }; // Červená
        default: return { result: 'D' as const, color: '#6b7280' }; // Sivá
      }
    });
  }

  // Kontrola či je tím v dobrej forme (viac W ako L v posledných 5)
  public jeVDobreJForme(): boolean {
    if (!this.forma) return false;
    const wins = (this.forma.match(/W/g) || []).length;
    const losses = (this.forma.match(/L/g) || []).length;
    return wins > losses;
  }

  // Získanie trendu (stúpa/klesá na základe série)
  public getTrend(): 'up' | 'down' | 'stable' {
    if (!this.serie_zapasov) return 'stable';
    if (this.serie_zapasov > 2) return 'up';
    if (this.serie_zapasov < -2) return 'down';
    return 'stable';
  }

  // Kontrola či má tím dostatok zápasov pre oficiálne zaradenie
  public splnaMinimumZapasov(minZapasov: number): boolean {
    return this.zapasy >= minZapasov;
  }

  // Výpočet domácej bilancie ako percentá
  public getDomacaBilancia(): { uspesnost: number, body: number, zapasy: number } {
    const zapasy = this.domace_zapasy || 0;
    const vitazstva = this.domace_vitazstva || 0;
    const remizy = this.domace_remizy || 0;
    
    if (zapasy === 0) return { uspesnost: 0, body: 0, zapasy: 0 };
    
    const body = (vitazstva * 3) + remizy;
    const uspesnost = Number(((body / (zapasy * 3)) * 100).toFixed(1));
    
    return { uspesnost, body, zapasy };
  }

  // Výpočet vonkajšej bilancie ako percentá  
  public getVonkajsiaBilancia(): { uspesnost: number, body: number, zapasy: number } {
    const zapasy = this.vonkajsie_zapasy || 0;
    const vitazstva = this.vonkajsie_vitazstva || 0;
    const remizy = this.vonkajsie_remizy || 0;
    
    if (zapasy === 0) return { uspesnost: 0, body: 0, zapasy: 0 };
    
    const body = (vitazstva * 3) + remizy;
    const uspesnost = Number(((body / (zapasy * 3)) * 100).toFixed(1));
    
    return { uspesnost, body, zapasy };
  }

  // Helper method pre bezpečný JSON export
  public toSafeJSON() {
    return {
      id: this.id,
      liga_id: this.liga_id,
      tim_id: this.tim_id,
      custom_tim_nazov: this.custom_tim_nazov,
      tim_nazov: this.getTimNazov(),
      
      pozicia: this.pozicia,
      body: this.body,
      skutocne_body: this.getSkutocneBody(),
      
      zapasy: this.zapasy,
      vitazstva: this.vitazstva,
      remizy: this.remizy,
      prehry: this.prehry,
      uspesnost: this.getUspesnost(),
      
      goly_za: this.goly_za,
      goly_proti: this.goly_proti,
      goly_rozdiel: this.goly_rozdiel,
      
      domace_zapasy: this.domace_zapasy,
      domace_vitazstva: this.domace_vitazstva,
      domace_remizy: this.domace_remizy,
      domace_prehry: this.domace_prehry,
      domace_goly_za: this.domace_goly_za,
      domace_goly_proti: this.domace_goly_proti,
      
      vonkajsie_zapasy: this.vonkajsie_zapasy,
      vonkajsie_vitazstva: this.vonkajsie_vitazstva,
      vonkajsie_remizy: this.vonkajsie_remizy,
      vonkajsie_prehry: this.vonkajsie_prehry,
      vonkajsie_goly_za: this.vonkajsie_goly_za,
      vonkajsie_goly_proti: this.vonkajsie_goly_proti,
      
      forma: this.forma,
      forma_display: this.getFormaDisplay(),
      serie_zapasov: this.serie_zapasov,
      penalizacne_body: this.penalizacne_body,
      bonus_body: this.bonus_body,
      posledny_zapas: this.posledny_zapas,
      manualne_upravene: this.manualne_upravene,
      poznamky: this.poznamky,
      
      vytvoreny: this.vytvoreny,
      aktualizovany: this.aktualizovany,

      // Ak je načítaný tím
      tim: this.tim ? {
        id: this.tim.id,
        nazov: this.tim.nazov,
        vekova_kategoria: this.tim.vekova_kategoria,
        logo: this.tim.logo,
        farba_prva: this.tim.farba_prva
      } : null
      
    };
  }

  // STATICKÉ METÓDY PRE PRÁCU S TABUĽKOU
  
  // Automatické prepočítanie tabuľky na základe zápasov
  static async recalculateTable(ligaId: number, bodyZaVitazstvo: number = 3, bodyZaRemizy: number = 1): Promise<void> {
    const { Op } = require('sequelize');
    
    // Importujeme modely (musíme to urobiť takto kvôli circular dependencies)
    const Zapas = require('./Zapas').default;
    const Team = require('./Team').default;
    
    // Načítame všetky zápasy pre túto ligu
    const zapasy = await Zapas.findAll({
      where: {
        liga_id: ligaId,
        status: 'ukonceny',
        aktivity: true,
        goly_domaci: { [Op.ne]: null },
        goly_hostia: { [Op.ne]: null }
      },
      include: [
        { model: Team, as: 'domaci_tim', required: false },
        { model: Team, as: 'hostujuci_tim', required: false }
      ]
    });

    // Získame všetky tímy ktoré hrali v tejto lige
    const timyStats = new Map();

    // Spracujeme každý zápas
    for (const zapas of zapasy) {
      const domaciId = zapas.domaci_tim_id;
      const hostujuciId = zapas.hostujuci_tim_id;
      const golyDomaci = zapas.goly_domaci;
      const golyHostia = zapas.goly_hostia;

      // Inicializujeme štatistiky ak neexistujú
      if (domaciId && !timyStats.has(domaciId)) {
        timyStats.set(domaciId, {
          tim_id: domaciId,
          zapasy: 0, vitazstva: 0, remizy: 0, prehry: 0,
          goly_za: 0, goly_proti: 0, body: 0,
          domace_zapasy: 0, domace_vitazstva: 0, domace_remizy: 0, domace_prehry: 0,
          domace_goly_za: 0, domace_goly_proti: 0,
          vonkajsie_zapasy: 0, vonkajsie_vitazstva: 0, vonkajsie_remizy: 0, vonkajsie_prehry: 0,
          vonkajsie_goly_za: 0, vonkajsie_goly_proti: 0,
          forma: [], posledne_zapasy: []
        });
      }

      if (hostujuciId && !timyStats.has(hostujuciId)) {
        timyStats.set(hostujuciId, {
          tim_id: hostujuciId,
          zapasy: 0, vitazstva: 0, remizy: 0, prehry: 0,
          goly_za: 0, goly_proti: 0, body: 0,
          domace_zapasy: 0, domace_vitazstva: 0, domace_remizy: 0, domace_prehry: 0,
          domace_goly_za: 0, domace_goly_proti: 0,
          vonkajsie_zapasy: 0, vonkajsie_vitazstva: 0, vonkajsie_remizy: 0, vonkajsie_prehry: 0,
          vonkajsie_goly_za: 0, vonkajsie_goly_proti: 0,
          forma: [], posledne_zapasy: []
        });
      }

      // Aktualizujeme štatistiky domáceho tímu
      if (domaciId) {
        const domaciStats = timyStats.get(domaciId);
        domaciStats.zapasy++;
        domaciStats.domace_zapasy++;
        domaciStats.goly_za += golyDomaci;
        domaciStats.goly_proti += golyHostia;
        domaciStats.domace_goly_za += golyDomaci;
        domaciStats.domace_goly_proti += golyHostia;
        
        domaciStats.posledne_zapasy.push({
          datum: zapas.datum_cas,
          vysledok: golyDomaci > golyHostia ? 'W' : golyDomaci === golyHostia ? 'D' : 'L'
        });

        if (golyDomaci > golyHostia) {
          domaciStats.vitazstva++;
          domaciStats.domace_vitazstva++;
          domaciStats.body += bodyZaVitazstvo;
        } else if (golyDomaci === golyHostia) {
          domaciStats.remizy++;
          domaciStats.domace_remizy++;
          domaciStats.body += bodyZaRemizy;
        } else {
          domaciStats.prehry++;
          domaciStats.domace_prehry++;
        }
      }

      // Aktualizujeme štatistiky hosťujúceho tímu
      if (hostujuciId) {
        const hostujuciStats = timyStats.get(hostujuciId);
        hostujuciStats.zapasy++;
        hostujuciStats.vonkajsie_zapasy++;
        hostujuciStats.goly_za += golyHostia;
        hostujuciStats.goly_proti += golyDomaci;
        hostujuciStats.vonkajsie_goly_za += golyHostia;
        hostujuciStats.vonkajsie_goly_proti += golyDomaci;
        
        hostujuciStats.posledne_zapasy.push({
          datum: zapas.datum_cas,
          vysledok: golyHostia > golyDomaci ? 'W' : golyHostia === golyDomaci ? 'D' : 'L'
        });

        if (golyHostia > golyDomaci) {
          hostujuciStats.vitazstva++;
          hostujuciStats.vonkajsie_vitazstva++;
          hostujuciStats.body += bodyZaVitazstvo;
        } else if (golyHostia === golyDomaci) {
          hostujuciStats.remizy++;
          hostujuciStats.vonkajsie_remizy++;
          hostujuciStats.body += bodyZaRemizy;
        } else {
          hostujuciStats.prehry++;
          hostujuciStats.vonkajsie_prehry++;
        }
      }
    }

    // Vypočítame formu pre každý tím (posledných 5 zápasov)
    for (const [timId, stats] of timyStats) {
      // Zoradíme zápasy podľa dátumu
      stats.posledne_zapasy.sort((a: any, b: any) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
      
      // Vezmeme posledných 5 zápasov
      const poslednych5 = stats.posledne_zapasy.slice(0, 5);
      stats.forma = poslednych5.map((z: any) => z.vysledok).join('');
      
      // Výpočet série
      let seria = 0;
      for (const zapas of poslednych5) {
        if (zapas.vysledok === 'W') {
          seria = seria <= 0 ? 1 : seria + 1;
        } else if (zapas.vysledok === 'L') {
          seria = seria >= 0 ? -1 : seria - 1;
        } else {
          break; // Remíza prerušuje sériu
        }
      }
      stats.serie_zapasov = seria;
    }

    // Vymazanie existujúcich záznamov pre túto ligu
    await LigaTabulka.destroy({
      where: { liga_id: ligaId }
    });

    // Vytvorenie nových záznamov
    const tabulkaData = Array.from(timyStats.values()).map((stats: any, index) => ({
      liga_id: ligaId,
      tim_id: stats.tim_id,
      pozicia: index + 1, // Zatiaľ dočasné, zoradíme neskôr
      body: stats.body,
      zapasy: stats.zapasy,
      vitazstva: stats.vitazstva,
      remizy: stats.remizy,
      prehry: stats.prehry,
      goly_za: stats.goly_za,
      goly_proti: stats.goly_proti,
      goly_rozdiel: stats.goly_za - stats.goly_proti,
      domace_zapasy: stats.domace_zapasy,
      domace_vitazstva: stats.domace_vitazstva,
      domace_remizy: stats.domace_remizy,
      domace_prehry: stats.domace_prehry,
      domace_goly_za: stats.domace_goly_za,
      domace_goly_proti: stats.domace_goly_proti,
      vonkajsie_zapasy: stats.vonkajsie_zapasy,
      vonkajsie_vitazstva: stats.vonkajsie_vitazstva,
      vonkajsie_remizy: stats.vonkajsie_remizy,
      vonkajsie_prehry: stats.vonkajsie_prehry,
      vonkajsie_goly_za: stats.vonkajsie_goly_za,
      vonkajsie_goly_proti: stats.vonkajsie_goly_proti,
      forma: stats.forma,
      serie_zapasov: stats.serie_zapasov,
      manualne_upravene: false,
      posledny_zapas: stats.posledne_zapasy[0]?.datum || null
    }));

    // Zoradenie podľa bodov, gólovej bilancie, strelených gólov
    tabulkaData.sort((a, b) => {
      if (a.body !== b.body) return b.body - a.body;
      if (a.goly_rozdiel !== b.goly_rozdiel) return b.goly_rozdiel - a.goly_rozdiel;
      return b.goly_za - a.goly_za;
    });

    // Nastavenie správnych pozícií
    tabulkaData.forEach((item, index) => {
      item.pozicia = index + 1;
    });

    // Vytvorenie záznamov v databáze
    await LigaTabulka.bulkCreate(tabulkaData);
  }

  // Vytvorenie počiatočnej tabuľky pre ligu s tímami
  static async createInitialTable(ligaId: number, timy: number[]): Promise<void> {
    const tabulkaData = timy.map((timId, index) => ({
      liga_id: ligaId,
      tim_id: timId,
      pozicia: index + 1,
      body: 0,
      zapasy: 0,
      vitazstva: 0,
      remizy: 0,
      prehry: 0,
      goly_za: 0,
      goly_proti: 0,
      goly_rozdiel: 0,
      manualne_upravene: false
    }));

    // Zoradenie podľa pozície
    tabulkaData.forEach((item, index) => {
      item.pozicia = index + 1;
    });

    // Vytvorenie záznamov v databáze
    await LigaTabulka.bulkCreate(tabulkaData);
  }

  // Získanie tabuľky pre ligu
  static async getTableForLeague(ligaId: number, includeTeams: boolean = true) {
    const includeOptions = [];
    
    if (includeTeams) {
      const Team = require('./Team').default;
      includeOptions.push({
        model: Team,
        as: 'tim',
        attributes: ['id', 'nazov', 'vekova_kategoria', 'logo', 'farba_prva'],
        required: false  // DÔLEŽITÉ: LEFT JOIN aby zobrazilo aj custom tímy s tim_id = NULL
      });
    }

    return await LigaTabulka.findAll({
      where: { liga_id: ligaId },
      include: includeOptions,
      order: [['pozicia', 'ASC']]
    });
  }
}

// Definícia modelu v databáze
LigaTabulka.init(
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
    tim_id: {
      type: DataTypes.INTEGER,
      allowNull: true,  // OPRAVENÉ: teraz môže byť NULL
      references: {
        model: 'timy',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      validate: {
        // Custom validácia: musí byť buď tim_id alebo custom_tim_nazov
        customTimValidation(value: any) {
          if (!value && !this.custom_tim_nazov) {
            throw new Error('Musí byť zadaný buď tím z databázy alebo vlastný názov tímu');
          }
        }
      }
    },
    custom_tim_nazov: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [2, 100],
      },
    },
    pozicia: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 100,
      },
    },
    body: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    zapasy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    vitazstva: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    remizy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    prehry: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    goly_za: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    goly_proti: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    goly_rozdiel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    
    // DETAILNÉ ŠTATISTIKY - DOMÁCE ZÁPASY
    domace_zapasy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    domace_vitazstva: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    domace_remizy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    domace_prehry: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    domace_goly_za: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    domace_goly_proti: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    
    // DETAILNÉ ŠTATISTIKY - VONKAJŠIE ZÁPASY
    vonkajsie_zapasy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    vonkajsie_vitazstva: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    vonkajsie_remizy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    vonkajsie_prehry: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    vonkajsie_goly_za: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    vonkajsie_goly_proti: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    
    // FORMA A TRENDY
    forma: {
      type: DataTypes.STRING(10), // Pre "WLDWW" až do 10 zápasov
      allowNull: true,
      validate: {
        is: /^[WLD]*$/, // Len W, L, D znaky
      },
    },
    serie_zapasov: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Pozitívne = séria víťazstiev, negatívne = séria prehier',
    },
    
    // PENALIZÁCIE A BONUSY
    penalizacne_body: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Odobraté body - záporné číslo',
    },
    bonus_body: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Bonusové body - kladné číslo',
    },
    
    // METADATA
    posledny_zapas: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    manualne_upravene: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    }
  },
  {
    sequelize,
    modelName: 'LigaTabulka',
    tableName: 'liga_tabulky',
    timestamps: false, // Používame vlastné polia vytvoreny/aktualizovany
    hooks: {
      beforeUpdate: (tabulka: LigaTabulka) => {
        tabulka.aktualizovany = new Date();
        
        // Automatický výpočet gólovej bilancie
        tabulka.goly_rozdiel = tabulka.goly_za - tabulka.goly_proti;
      },
      beforeCreate: (tabulka: LigaTabulka) => {
        const now = new Date();
        tabulka.vytvoreny = now;
        tabulka.aktualizovany = now;
        
        // Automatický výpočet gólovej bilancie
        tabulka.goly_rozdiel = tabulka.goly_za - tabulka.goly_proti;
      },
    },
    indexes: [
      // Index na ligu + pozíciu pre rýchle zoradenie
      {
        fields: ['liga_id', 'pozicia'],
        unique: true,
        name: 'liga_tabulky_liga_pozicia'
      },
      // Index na tím (môže byť null pre custom tímy)
      {
        fields: ['tim_id'],
        name: 'liga_tabulky_tim_id'
      },
      // Index na body pre zoradenie
      {
        fields: ['liga_id', 'body', 'goly_rozdiel'],
        name: 'liga_tabulky_ranking'
      },
    ],
  }
);

export default LigaTabulka;