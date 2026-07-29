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
  /**
   * Prepočíta ligovú tabuľku zo všetkých ukončených zápasov.
   *
   * ČO SA ZMENILO OPROTI PÔVODNEJ VERZII:
   * 1. Započítavajú sa aj zápasy s custom tímami (súperi zadaní ako text,
   *    ktorí nie sú v databáze). Pôvodne sa takéto zápasy úplne preskočili
   *    a custom tímy z tabuľky po prepočte zmizli.
   * 2. Riadky označené ako manualne_upravene sa zachovajú - pôvodne ich
   *    prepočet zmazal spolu so všetkými ručnými korekciami.
   * 3. Tímy bez odohraného zápasu ostanú v tabuľke s nulami - pôvodne
   *    zmizli tímy pridané cez createInitialTable.
   * 4. Celý zápis prebieha v transakcii - pôvodne mohlo zlyhanie zápisu
   *    nechať ligu s úplne prázdnou tabuľkou.
   * 5. Do bodov sa započítavajú penalizačné a bonusové body.
   *
   * @param ligaId - ID ligy
   * @param bodyZaVitazstvo - počet bodov za víťazstvo (predvolene 3)
   * @param bodyZaRemizy - počet bodov za remízu (predvolene 1)
   */
  static async recalculateTable(ligaId: number, bodyZaVitazstvo: number = 3, bodyZaRemizy: number = 1): Promise<void> {
    const { Op } = require('sequelize');
    const sequelize = require('../config/database').default;

    // Modely načítavame takto kvôli cyklickým závislostiam medzi súbormi
    const Zapas = require('./Zapas').default;
    const Team = require('./Team').default;

    // ===== KROK 1: Načítanie ukončených zápasov ligy =====
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

    // ===== KROK 2: Načítanie existujúcich riadkov tabuľky =====
    // Potrebujeme ich kvôli dvom veciam:
    //  - manuálne upravené riadky sa nesmú prepísať
    //  - tímy pridané cez createInitialTable musia ostať aj bez odohraného zápasu
    const existujuceRiadky = await LigaTabulka.findAll({ where: { liga_id: ligaId } });

    // Kľúč riadku: buď "tim:5" (tím z databázy), alebo "custom:Názov tímu"
    const vytvorKluc = (timId?: number | null, customNazov?: string | null): string | null => {
      if (timId) return `tim:${timId}`;
      if (customNazov && customNazov.trim()) return `custom:${customNazov.trim()}`;
      return null;
    };

    // Riadky, ktoré admin ručne upravil - tie prepočet nechá tak, ako sú
    const manualneRiadky = existujuceRiadky.filter((r: any) => r.manualne_upravene);
    const manualneKluce = new Set(
      manualneRiadky
        .map((r: any) => vytvorKluc(r.tim_id, r.custom_tim_nazov))
        .filter((k: string | null): k is string => k !== null)
    );

    // ===== KROK 3: Príprava prázdnych štatistík =====
    const timyStats = new Map<string, any>();

    const prazdneStatistiky = (timId: number | null, customNazov: string | null) => ({
      tim_id: timId,
      custom_tim_nazov: customNazov,
      zapasy: 0, vitazstva: 0, remizy: 0, prehry: 0,
      goly_za: 0, goly_proti: 0, body: 0,
      domace_zapasy: 0, domace_vitazstva: 0, domace_remizy: 0, domace_prehry: 0,
      domace_goly_za: 0, domace_goly_proti: 0,
      vonkajsie_zapasy: 0, vonkajsie_vitazstva: 0, vonkajsie_remizy: 0, vonkajsie_prehry: 0,
      vonkajsie_goly_za: 0, vonkajsie_goly_proti: 0,
      penalizacne_body: 0, bonus_body: 0,
      forma: '', serie_zapasov: 0, posledne_zapasy: [] as any[]
    });

    // Zabezpečí, že pre daný tím existuje záznam v mape
    const zabezpecTim = (timId: number | null, customNazov: string | null): string | null => {
      const kluc = vytvorKluc(timId, customNazov);
      if (!kluc) return null;
      // Manuálne upravené tímy sa neprepočítavajú - ich riadok pridáme
      // nezmenený až na konci. Bez tejto kontroly by tím mal v tabuľke
      // dva riadky: jeden manuálny a jeden vypočítaný.
      if (manualneKluce.has(kluc)) return null;
      if (!timyStats.has(kluc)) {
        timyStats.set(kluc, prazdneStatistiky(timId, customNazov));
      }
      return kluc;
    };

    // Do tabuľky patria aj tímy, ktoré ešte neodohrali zápas
    // (napríklad pridané cez createInitialTable na začiatku sezóny)
    for (const riadok of existujuceRiadky) {
      if (riadok.manualne_upravene) continue; // manuálne riešime osobitne
      const kluc = zabezpecTim(riadok.tim_id, riadok.custom_tim_nazov);
      if (kluc) {
        // Prenesieme penalizácie a bonusy - tie prepočet zápasov nezistí
        const stats = timyStats.get(kluc);
        stats.penalizacne_body = riadok.penalizacne_body || 0;
        stats.bonus_body = riadok.bonus_body || 0;
      }
    }

    // ===== KROK 4: Spracovanie zápasov =====
    for (const zapas of zapasy) {
      const golyDomaci = zapas.goly_domaci;
      const golyHostia = zapas.goly_hostia;

      // Tím môže byť z databázy (tim_id) alebo zadaný ako text (tim_nazov)
      const klucDomaci = zabezpecTim(zapas.domaci_tim_id, zapas.domaci_tim_nazov);
      const klucHostia = zabezpecTim(zapas.hostujuci_tim_id, zapas.hostujuci_tim_nazov);

      // Domáci tím
      if (klucDomaci) {
        const s = timyStats.get(klucDomaci);
        s.zapasy++;
        s.domace_zapasy++;
        s.goly_za += golyDomaci;
        s.goly_proti += golyHostia;
        s.domace_goly_za += golyDomaci;
        s.domace_goly_proti += golyHostia;

        s.posledne_zapasy.push({
          datum: zapas.datum_cas,
          vysledok: golyDomaci > golyHostia ? 'W' : golyDomaci === golyHostia ? 'D' : 'L'
        });

        if (golyDomaci > golyHostia) {
          s.vitazstva++; s.domace_vitazstva++; s.body += bodyZaVitazstvo;
        } else if (golyDomaci === golyHostia) {
          s.remizy++; s.domace_remizy++; s.body += bodyZaRemizy;
        } else {
          s.prehry++; s.domace_prehry++;
        }
      }

      // Hosťujúci tím
      if (klucHostia) {
        const s = timyStats.get(klucHostia);
        s.zapasy++;
        s.vonkajsie_zapasy++;
        s.goly_za += golyHostia;
        s.goly_proti += golyDomaci;
        s.vonkajsie_goly_za += golyHostia;
        s.vonkajsie_goly_proti += golyDomaci;

        s.posledne_zapasy.push({
          datum: zapas.datum_cas,
          vysledok: golyHostia > golyDomaci ? 'W' : golyHostia === golyDomaci ? 'D' : 'L'
        });

        if (golyHostia > golyDomaci) {
          s.vitazstva++; s.vonkajsie_vitazstva++; s.body += bodyZaVitazstvo;
        } else if (golyHostia === golyDomaci) {
          s.remizy++; s.vonkajsie_remizy++; s.body += bodyZaRemizy;
        } else {
          s.prehry++; s.vonkajsie_prehry++;
        }
      }
    }

    // ===== KROK 5: Výpočet formy a série =====
    for (const stats of timyStats.values()) {
      // Zoradenie od najnovšieho zápasu
      stats.posledne_zapasy.sort(
        (a: any, b: any) => new Date(b.datum).getTime() - new Date(a.datum).getTime()
      );

      const poslednych5 = stats.posledne_zapasy.slice(0, 5);
      stats.forma = poslednych5.map((z: any) => z.vysledok).join('');

      // Séria: kladné číslo = víťazstvá po sebe, záporné = prehry po sebe
      let seria = 0;
      for (const z of poslednych5) {
        if (z.vysledok === 'W') {
          seria = seria <= 0 ? 1 : seria + 1;
        } else if (z.vysledok === 'L') {
          seria = seria >= 0 ? -1 : seria - 1;
        } else {
          break; // Remíza sériu prerušuje
        }
      }
      stats.serie_zapasov = seria;
    }

    // ===== KROK 6: Zostavenie riadkov tabuľky =====
    const vypocitaneRiadky = Array.from(timyStats.values()).map((s: any) => {
      // Konečné body zahŕňajú aj penalizácie (záporné) a bonusy
      const celkoveBody = s.body + (s.bonus_body || 0) + (s.penalizacne_body || 0);
      return {
        liga_id: ligaId,
        tim_id: s.tim_id,
        custom_tim_nazov: s.custom_tim_nazov,
        pozicia: 0, // Doplníme po zoradení
        body: celkoveBody,
        zapasy: s.zapasy,
        vitazstva: s.vitazstva,
        remizy: s.remizy,
        prehry: s.prehry,
        goly_za: s.goly_za,
        goly_proti: s.goly_proti,
        goly_rozdiel: s.goly_za - s.goly_proti,
        domace_zapasy: s.domace_zapasy,
        domace_vitazstva: s.domace_vitazstva,
        domace_remizy: s.domace_remizy,
        domace_prehry: s.domace_prehry,
        domace_goly_za: s.domace_goly_za,
        domace_goly_proti: s.domace_goly_proti,
        vonkajsie_zapasy: s.vonkajsie_zapasy,
        vonkajsie_vitazstva: s.vonkajsie_vitazstva,
        vonkajsie_remizy: s.vonkajsie_remizy,
        vonkajsie_prehry: s.vonkajsie_prehry,
        vonkajsie_goly_za: s.vonkajsie_goly_za,
        vonkajsie_goly_proti: s.vonkajsie_goly_proti,
        penalizacne_body: s.penalizacne_body || 0,
        bonus_body: s.bonus_body || 0,
        forma: s.forma,
        serie_zapasov: s.serie_zapasov,
        manualne_upravene: false,
        posledny_zapas: s.posledne_zapasy[0]?.datum || null
      };
    });

    // K vypočítaným riadkom pridáme manuálne upravené (tie ostávajú nezmenené)
    const manualneData = manualneRiadky.map((r: any) => ({
      liga_id: ligaId,
      tim_id: r.tim_id,
      custom_tim_nazov: r.custom_tim_nazov,
      pozicia: 0,
      body: r.body,
      zapasy: r.zapasy,
      vitazstva: r.vitazstva,
      remizy: r.remizy,
      prehry: r.prehry,
      goly_za: r.goly_za,
      goly_proti: r.goly_proti,
      goly_rozdiel: r.goly_rozdiel,
      domace_zapasy: r.domace_zapasy,
      domace_vitazstva: r.domace_vitazstva,
      domace_remizy: r.domace_remizy,
      domace_prehry: r.domace_prehry,
      domace_goly_za: r.domace_goly_za,
      domace_goly_proti: r.domace_goly_proti,
      vonkajsie_zapasy: r.vonkajsie_zapasy,
      vonkajsie_vitazstva: r.vonkajsie_vitazstva,
      vonkajsie_remizy: r.vonkajsie_remizy,
      vonkajsie_prehry: r.vonkajsie_prehry,
      vonkajsie_goly_za: r.vonkajsie_goly_za,
      vonkajsie_goly_proti: r.vonkajsie_goly_proti,
      penalizacne_body: r.penalizacne_body || 0,
      bonus_body: r.bonus_body || 0,
      forma: r.forma,
      serie_zapasov: r.serie_zapasov,
      manualne_upravene: true, // Príznak zostáva - riadok sa nemá prepočítavať
      poznamky: r.poznamky,
      posledny_zapas: r.posledny_zapas
    }));

    const tabulkaData = [...vypocitaneRiadky, ...manualneData];

    // ===== KROK 7: Zoradenie a pridelenie pozícií =====
    // Poradie: body → gólový rozdiel → strelené góly → počet víťazstiev
    tabulkaData.sort((a: any, b: any) => {
      if (a.body !== b.body) return b.body - a.body;
      if (a.goly_rozdiel !== b.goly_rozdiel) return b.goly_rozdiel - a.goly_rozdiel;
      if (a.goly_za !== b.goly_za) return b.goly_za - a.goly_za;
      return b.vitazstva - a.vitazstva;
    });

    tabulkaData.forEach((item: any, index: number) => {
      item.pozicia = index + 1;
    });

    // ===== KROK 8: Zápis do databázy v transakcii =====
    // Mazanie a vytváranie musia prebehnúť ako jeden celok. Ak by zlyhalo
    // vytváranie, transakcia sa vráti späť a tabuľka ostane v pôvodnom stave
    // namiesto toho, aby ostala prázdna.
    await sequelize.transaction(async (t: any) => {
      await LigaTabulka.destroy({
        where: { liga_id: ligaId },
        transaction: t
      });

      if (tabulkaData.length > 0) {
        await LigaTabulka.bulkCreate(tabulkaData as any, { transaction: t });
      }
    });
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