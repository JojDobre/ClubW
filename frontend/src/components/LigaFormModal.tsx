// frontend/src/components/LigaFormModal.tsx
// Multi-step modal pre vytvorenie/editáciu ligy s opraveným ukladaním tabuľky

import React, { useState, useEffect } from 'react';
import { Liga, LigaCreateData, Team, ligaApi } from '../services/ligaApi';
import { teamsApi } from '../services/teamsApi';
import '../styles/components/PlayerModal.css'; // Použije existujúce modal štýly

interface LigaFormModalProps {
  liga?: Liga | null;
  onClose: () => void;
  onSave: () => void;
}

// Kroky modalu
type ModalStep = 'basic' | 'settings' | 'scoring' | 'tournament' | 'table' | 'appearance';

// Form data interface
interface LigaFormData extends LigaCreateData {
  // Rozšírené polia pre formulár
}

// Interface pre tabuľku tímov
interface TableTeam {
  id: string;
  tim_id?: number;
  custom_tim_nazov?: string;
  pozicia: number;
  body: number;
  zapasy: number;
  vitazstva: number;
  remizy: number;
  prehry: number;
  goly_za: number;
  goly_proti: number;
}

const LigaFormModal: React.FC<LigaFormModalProps> = ({ liga, onClose, onSave }) => {
  const [currentStep, setCurrentStep] = useState<ModalStep>('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);
  
  // State pre tabuľku tímov
  const [tableTeams, setTableTeams] = useState<TableTeam[]>([]);
  const [showAddTeamForm, setShowAddTeamForm] = useState(false);
  
  // Form data state
  const [formData, setFormData] = useState<LigaFormData>({
    nazov: liga?.nazov || '',
    sezona: liga?.sezona || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
    typ: liga?.typ || 'sutaz',
    format: liga?.format || 'tabulka',
    popis: liga?.popis || '',
    
    // Časové nastavenia
    datum_start: liga?.datum_start || '',
    datum_koniec: liga?.datum_koniec || '',
    pocet_timov: liga?.pocet_timov || 12,
    tim_id: undefined, // Pre filtrovanie
    
    // Bodovanie
    body_za_vitazstvo: liga?.body_za_vitazstvo || 3,
    body_za_remizy: liga?.body_za_remizy || 1,
    body_za_prehru: liga?.body_za_prehru || 0,
    
    // Nastavenia
    auto_update_tabulka: liga?.auto_update_tabulka ?? true,
    zobrazit_formu: liga?.zobrazit_formu ?? true,
    min_zapasov: liga?.min_zapasov || 0,
    
    // Turnaj
    turnaj_typ: liga?.turnaj_typ || undefined,
    turnaj_pocet_postupujucich: liga?.turnaj_pocet_postupujucich || undefined,
    
    // Vzhľad
    logo: liga?.logo || '',
    farba: liga?.farba || '#3b82f6',
    external_sync: liga?.external_sync || false
  });

  // Definícia krokov
  const steps = [
    { key: 'basic' as ModalStep, label: 'Základné info', icon: '📋' },
    { key: 'settings' as ModalStep, label: 'Nastavenia', icon: '⚙️' },
    { key: 'scoring' as ModalStep, label: 'Bodovanie', icon: '🏆' },
    ...(formData.format === 'turnaj' || formData.format === 'kombinovany' 
      ? [{ key: 'tournament' as ModalStep, label: 'Turnaj', icon: '🥇' }] 
      : []
    ),
    ...(liga && (formData.format === 'tabulka' || formData.format === 'kombinovany')
      ? [{ key: 'table' as ModalStep, label: 'Tabuľka', icon: '📊' }]
      : []
    ),
    { key: 'appearance' as ModalStep, label: 'Vzhľad', icon: '🎨' }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Načítanie tímov a tabuľky pri otvorení modalu
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Načítanie tímov
        const teamsResponse = await teamsApi.getTeams();
        setTeams(teamsResponse.data);

        // Ak editujeme ligu, načítame aj tabuľku
        if (liga && (liga.format === 'tabulka' || liga.format === 'kombinovany')) {
          try {
            const tableResponse = await ligaApi.getLeagueTable(liga.id);
            const tableData = tableResponse.data.map((item: any, index: number) => ({
              id: item.id?.toString() || `temp-${index}`,
              tim_id: item.tim_id,
              custom_tim_nazov: item.custom_tim_nazov,
              pozicia: item.pozicia || index + 1,
              body: item.body || 0,
              zapasy: item.zapasy || 0,
              vitazstva: item.vitazstva || 0,
              remizy: item.remizy || 0,
              prehry: item.prehry || 0,
              goly_za: item.goly_za || 0,
              goly_proti: item.goly_proti || 0
            }));
            setTableTeams(tableData);
            console.log('✅ Načítaná tabuľka:', tableData);
          } catch (tableErr) {
            console.log('Tabuľka zatiaľ neexistuje, vytvoríme prázdnu');
            setTableTeams([]);
          }
        }
      } catch (err) {
        console.error('Chyba pri načítaní dát:', err);
      }
    };

    fetchData();
  }, [liga]);

  // Aktualizácia krokov pri zmene formátu
  useEffect(() => {
    // Ak sa zmení formát z turnaj na tabuľku, preskočíme turnajový krok
    if (currentStep === 'tournament' && formData.format === 'tabulka') {
      setCurrentStep('appearance');
    }
  }, [formData.format, currentStep]);

  // Validácia aktuálneho kroku
  const validateCurrentStep = (): string | null => {
    switch (currentStep) {
      case 'basic':
        if (!formData.nazov.trim()) return 'Názov je povinný';
        if (!formData.sezona.trim()) return 'Sezóna je povinná';
        if (formData.nazov.length < 2) return 'Názov musí mať aspoň 2 znaky';
        if (!/^[0-9/\-\s]+$/.test(formData.sezona)) return 'Sezóna môže obsahovať len čísla, lomky a pomlčky';
        break;
        
      case 'settings':
        if (formData.datum_start && formData.datum_koniec) {
          if (new Date(formData.datum_start) >= new Date(formData.datum_koniec)) {
            return 'Dátum konca musí byť po dátume začiatku';
          }
        }
        if (formData.pocet_timov && (formData.pocet_timov < 2 || formData.pocet_timov > 100)) {
          return 'Počet tímov musí byť medzi 2 a 100';
        }
        break;
        
      case 'scoring':
        if ((formData.body_za_vitazstvo || 0) < 0 || (formData.body_za_vitazstvo || 0) > 10) {
          return 'Body za víťazstvo musia byť medzi 0 a 10';
        }
        if ((formData.body_za_remizy || 0) < 0 || (formData.body_za_remizy || 0) > 10) {
          return 'Body za remízu musia byť medzi 0 a 10';
        }
        if ((formData.body_za_prehru || 0) < 0 || (formData.body_za_prehru || 0) > 10) {
          return 'Body za prehru musia byť medzi 0 a 10';
        }
        if ((formData.min_zapasov || 0) < 0 || (formData.min_zapasov || 0) > 50) {
          return 'Minimálny počet zápasov musí byť medzi 0 a 50';
        }
        break;
        
      case 'tournament':
        if ((formData.format === 'turnaj' || formData.format === 'kombinovany') && !formData.turnaj_typ) {
          return 'Typ turnaja je povinný pre turnajový formát';
        }
        if (formData.format === 'kombinovany' && !formData.turnaj_pocet_postupujucich) {
          return 'Počet postupujúcich je povinný pre kombinovaný formát';
        }
        if (formData.turnaj_pocet_postupujucich && (formData.turnaj_pocet_postupujucich < 1 || formData.turnaj_pocet_postupujucich > 16)) {
          return 'Počet postupujúcich musí byť medzi 1 a 16';
        }
        break;
        
      case 'table':
        // Validácia tabuľky - kontrolujeme duplikáty pozícií
        const pozicie = tableTeams.map(t => t.pozicia);
        const duplicates = pozicie.filter((pos, index) => pozicie.indexOf(pos) !== index);
        if (duplicates.length > 0) {
          return 'Pozície v tabuľke nemôžu byť duplicitné';
        }
        
        // Kontrola či má tabuľka aspoň 2 tímy
        if (tableTeams.length < 2) {
          return 'Tabuľka musí obsahovať aspoň 2 tímy';
        }
        break;
        
      case 'appearance':
        if (formData.logo && !/^https?:\/\/.+/.test(formData.logo)) {
          return 'Logo musí byť platná URL';
        }
        if (formData.farba && !/^#[0-9A-F]{6}$/i.test(formData.farba)) {
          return 'Farba musí byť platný hex kód (napr. #FF6B35)';
        }
        break;
    }
    return null;
  };

  // Prechod na ďalší krok
  const handleNext = () => {
    const validation = validateCurrentStep();
    if (validation) {
      setError(validation);
      return;
    }
    
    setError('');
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].key);
    }
  };

  // Prechod na predchádzajúci krok
  const handlePrevious = () => {
    setError('');
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].key);
    }
  };

  // OPRAVENÉ UKLADANIE - najprv liga, potom tabuľka
  const handleSubmit = async () => {
    // DEBUG INFO
    console.log('🐛 DEBUG: handleSubmit spustené');
    console.log('🐛 Current step:', currentStep);
    console.log('🐛 tableTeams.length:', tableTeams.length);
    console.log('🐛 tableTeams data:', tableTeams);
    console.log('🐛 formData.format:', formData.format);
    
    const validation = validateCurrentStep();
    if (validation) {
      console.log('🐛 Validácia zlyhala:', validation);
      setError(validation);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. NAJPRV ULOŽÍME LIGU
      const apiData: LigaCreateData = {
        nazov: formData.nazov.trim(),
        sezona: formData.sezona.trim(),
        typ: formData.typ,
        format: formData.format,
        popis: formData.popis?.trim() || undefined,
        datum_start: formData.datum_start || undefined,
        datum_koniec: formData.datum_koniec || undefined,
        pocet_timov: formData.pocet_timov || undefined,
        body_za_vitazstvo: formData.body_za_vitazstvo || 3,
        body_za_remizy: formData.body_za_remizy || 1,
        body_za_prehru: formData.body_za_prehru || 0,
        auto_update_tabulka: formData.auto_update_tabulka ?? true,
        zobrazit_formu: formData.zobrazit_formu ?? true,
        min_zapasov: formData.min_zapasov || 0,
        turnaj_typ: formData.turnaj_typ,
        turnaj_pocet_postupujucich: formData.turnaj_pocet_postupujucich,
        logo: formData.logo?.trim() || undefined,
        farba: formData.farba || undefined,
        external_sync: formData.external_sync,
        tim_id: formData.tim_id || undefined
      };

      console.log('🔄 Ukladám ligu:', apiData);

      let savedLiga: Liga;
      if (liga) {
        const updateResponse = await ligaApi.updateLeague(liga.id, apiData);
        savedLiga = updateResponse.data;
        console.log('✅ Liga aktualizovaná:', savedLiga);
      } else {
        const createResponse = await ligaApi.createLeague(apiData);
        savedLiga = createResponse.data;
        console.log('✅ Liga vytvorená:', savedLiga);
      }

      // 2. AK MÁME TABUĽKU, ULOŽÍME JU OSOBNE
      if (tableTeams.length > 0 && (savedLiga.format === 'tabulka' || savedLiga.format === 'kombinovany')) {
        console.log('🔄 Ukladám tabuľku pre ligu ID:', savedLiga.id);
        console.log('📊 Dáta tabuľky:', tableTeams);
        
        // DEBUG: Detailný výpis tableTeams
        console.log('📤 DEBUG: tableTeams pred spracovaním:');
        tableTeams.forEach((team, index) => {
          console.log(`  ${index}: {`);
          console.log(`    id: "${team.id}",`);
          console.log(`    tim_id: ${team.tim_id},`);
          console.log(`    custom_tim_nazov: "${team.custom_tim_nazov}",`);
          console.log(`    pozicia: ${team.pozicia},`);
          console.log(`    body: ${team.body}`);
          console.log(`  }`);
        });

        // Príprava dát pre backend endpoint PUT /api/leagues/:id/table
        const tableApiData = tableTeams.map(team => {
          const isNewRecord = team.id.startsWith('temp-');
          
          if (isNewRecord) {
            // Pre nové záznamy - nepošleme ID
            const newRecord = {
              tim_id: team.tim_id,
              custom_tim_nazov: team.custom_tim_nazov,
              pozicia: team.pozicia,
              body: team.body,
              zapasy: team.zapasy,
              vitazstva: team.vitazstva,
              remizy: team.remizy,
              prehry: team.prehry,
              goly_za: team.goly_za,
              goly_proti: team.goly_proti
            };
            console.log(`📤 Nový záznam:`, newRecord);
            return newRecord;
          } else {
            // Pre existujúce záznamy - pošleme ID
            const existingRecord = {
              id: parseInt(team.id),
              tim_id: team.tim_id,
              custom_tim_nazov: team.custom_tim_nazov,
              pozicia: team.pozicia,
              body: team.body,
              zapasy: team.zapasy,
              vitazstva: team.vitazstva,
              remizy: team.remizy,
              prehry: team.prehry,
              goly_za: team.goly_za,
              goly_proti: team.goly_proti
            };
            console.log(`📤 Existujúci záznam:`, existingRecord);
            return existingRecord;
          }
        });

        console.log('📤 Finálne API dáta:', tableApiData);

        const tableResponse = await ligaApi.updateLeagueTable(savedLiga.id, tableApiData);
        console.log('✅ Tabuľka úspešne uložená:', tableResponse);
      } else {
        console.log('🐛 NEUKLADÁME tabuľku lebo:');
        console.log('🐛 - tableTeams.length:', tableTeams.length);
        console.log('🐛 - format:', savedLiga.format);
      }

      // Úspech!
      console.log('🎉 Liga s tabuľkou úspešne uložená!');
      onSave();

    } catch (err) {
      console.error('🐛 CHYBA v handleSubmit:', err);
      console.error('❌ Chyba pri ukladaní:', err);
      setError(err instanceof Error ? err.message : 'Neočakávaná chyba pri ukladaní');
    } finally {
      setLoading(false);
    }
  };

  // Funkcie pre správu tabuľky
  const handleAddTeamToTable = (teamData: { tim_id?: number; custom_tim_nazov?: string }) => {
    const newTeam: TableTeam = {
      id: `temp-${Date.now()}`,
      tim_id: teamData.tim_id,
      custom_tim_nazov: teamData.custom_tim_nazov,
      pozicia: tableTeams.length + 1,
      body: 0,
      zapasy: 0,
      vitazstva: 0,
      remizy: 0,
      prehry: 0,
      goly_za: 0,
      goly_proti: 0
    };

    setTableTeams([...tableTeams, newTeam]);
    setShowAddTeamForm(false);
  };

  const handleRemoveTeamFromTable = (teamId: string) => {
    const filtered = tableTeams.filter(t => t.id !== teamId);
    // Znovu číslovananie pozícií
    const reordered = filtered.map((team, index) => ({
      ...team,
      pozicia: index + 1
    }));
    setTableTeams(reordered);
  };

  const handleUpdateTeamInTable = (teamId: string, field: keyof TableTeam, value: any) => {
    setTableTeams(prev => prev.map(team => 
      team.id === teamId 
        ? { ...team, [field]: value }
        : team
    ));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* Header s progress indikátorom */}
        <div className="modal-header" style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>
              {liga ? 'Upraviť ligu' : 'Vytvoriť novú ligu'}
            </h2>
            
            {/* Progress indikátor */}
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              marginTop: '12px'
            }}>
              {steps.map((step, index) => (
                <div
                  key={step.key}
                  onClick={() => {
                    if (!loading && (index <= currentStepIndex || index === currentStepIndex + 1)) {
                      setCurrentStep(step.key);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '13px',
                    color: step.key === currentStep ? '#3b82f6' : '#64748b',
                    fontWeight: step.key === currentStep ? '600' : '400',
                    cursor: !loading && (index <= currentStepIndex || index === currentStepIndex + 1) ? 'pointer' : 'default',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    transition: 'all 0.2s',
                    backgroundColor: step.key === currentStep ? '#eff6ff' : 'transparent'
                  }}
                >
                  <span>{step.icon}</span>
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="modal-close-button"
            disabled={loading}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              width: '32px',
              height: '32px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            ✕
          </button>
        </div>

        {/* Telo modalu */}
        <div className="modal-body" style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px'
        }}>
          
          {/* Chybová správa */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <form className="add-user-form">
            
            {/* KROK 1: Základné informácie */}
            {currentStep === 'basic' && (
              <div>
                <h3 style={{ marginBottom: '20px', color: '#1e293b', fontSize: '18px' }}>
                  📋 Základné informácie
                </h3>
                
                {/* Názov ligy */}
                <div className="form-group">
                  <label className="modal-label">
                    Názov ligy <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="modal-input"
                    value={formData.nazov}
                    onChange={(e) => setFormData({ ...formData, nazov: e.target.value })}
                    placeholder="napr. 1. liga muži"
                    required
                  />
                </div>

                {/* Sezóna */}
                <div className="form-group">
                  <label className="modal-label">
                    Sezóna <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="modal-input"
                    value={formData.sezona}
                    onChange={(e) => setFormData({ ...formData, sezona: e.target.value })}
                    placeholder="napr. 2024/2025"
                    required
                  />
                </div>

                {/* Typ súťaže */}
                <div className="form-group">
                  <label className="modal-label">
                    Typ súťaže <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="modal-input"
                    value={formData.typ}
                    onChange={(e) => setFormData({ ...formData, typ: e.target.value as any })}
                    required
                  >
                    <option value="sutaz">Súťaž</option>
                    <option value="pohar">Pohár</option>
                    <option value="priatelska">Priateľská</option>
                  </select>
                </div>

                {/* Formát súťaže */}
                <div className="form-group">
                  <label className="modal-label">
                    Formát súťaže <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="modal-input"
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
                    required
                  >
                    <option value="tabulka">Liga (tabuľka)</option>
                    <option value="turnaj">Turnaj (vyraďovačka)</option>
                    <option value="kombinovany">Kombinovaný (skupiny + vyraďovačka)</option>
                  </select>
                </div>

                {/* Popis */}
                <div className="form-group">
                  <label className="modal-label">Popis</label>
                  <textarea
                    className="modal-input"
                    value={formData.popis || ''}
                    onChange={(e) => setFormData({ ...formData, popis: e.target.value })}
                    placeholder="Krátky popis súťaže..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* KROK 2: Nastavenia */}
            {currentStep === 'settings' && (
              <div>
                <h3 style={{ marginBottom: '20px', color: '#1e293b', fontSize: '18px' }}>
                  ⚙️ Nastavenia súťaže
                </h3>

                {/* Dátumy */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="modal-label">Dátum začiatku</label>
                    <input
                      type="date"
                      className="modal-input"
                      value={formData.datum_start || ''}
                      onChange={(e) => setFormData({ ...formData, datum_start: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="modal-label">Dátum ukončenia</label>
                    <input
                      type="date"
                      className="modal-input"
                      value={formData.datum_koniec || ''}
                      onChange={(e) => setFormData({ ...formData, datum_koniec: e.target.value })}
                    />
                  </div>
                </div>

                {/* Počet tímov */}
                <div className="form-group">
                  <label className="modal-label">Počet tímov</label>
                  <input
                    type="number"
                    className="modal-input"
                    value={formData.pocet_timov || ''}
                    onChange={(e) => setFormData({ ...formData, pocet_timov: parseInt(e.target.value) || undefined })}
                    placeholder="napr. 12"
                    min="2"
                    max="100"
                  />
                </div>

                {/* Checkboxy */}
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={formData.auto_update_tabulka}
                      onChange={(e) => setFormData({ ...formData, auto_update_tabulka: e.target.checked })}
                    />
                    Automaticky aktualizovať tabuľku z výsledkov zápasov
                  </label>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={formData.zobrazit_formu}
                      onChange={(e) => setFormData({ ...formData, zobrazit_formu: e.target.checked })}
                    />
                    Zobrazovať formu tímov (posledných 5 zápasov)
                  </label>
                </div>

                {/* Minimálny počet zápasov */}
                <div className="form-group">
                  <label className="modal-label">Minimálny počet zápasov pre zaradenie do tabuľky</label>
                  <input
                    type="number"
                    className="modal-input"
                    value={formData.min_zapasov || 0}
                    onChange={(e) => setFormData({ ...formData, min_zapasov: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="50"
                  />
                </div>
              </div>
            )}

            {/* KROK 3: Bodovanie */}
            {currentStep === 'scoring' && (
              <div>
                <h3 style={{ marginBottom: '20px', color: '#1e293b', fontSize: '18px' }}>
                  🏆 Bodový systém
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="modal-label">Body za víťazstvo</label>
                    <input
                      type="number"
                      className="modal-input"
                      value={formData.body_za_vitazstvo || 3}
                      onChange={(e) => setFormData({ ...formData, body_za_vitazstvo: parseInt(e.target.value) || 3 })}
                      min="0"
                      max="10"
                    />
                  </div>

                  <div className="form-group">
                    <label className="modal-label">Body za remízu</label>
                    <input
                      type="number"
                      className="modal-input"
                      value={formData.body_za_remizy || 1}
                      onChange={(e) => setFormData({ ...formData, body_za_remizy: parseInt(e.target.value) || 1 })}
                      min="0"
                      max="10"
                    />
                  </div>

                  <div className="form-group">
                    <label className="modal-label">Body za prehru</label>
                    <input
                      type="number"
                      className="modal-input"
                      value={formData.body_za_prehru || 0}
                      onChange={(e) => setFormData({ ...formData, body_za_prehru: parseInt(e.target.value) || 0 })}
                      min="0"
                      max="10"
                    />
                  </div>
                </div>

                {/* Náhľad bodového systému */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px',
                  marginTop: '20px'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>Náhľad:</h4>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>
                    <div>✅ Víťazstvo: <strong>{formData.body_za_vitazstvo || 3} bodov</strong></div>
                    <div>🤝 Remíza: <strong>{formData.body_za_remizy || 1} bod</strong></div>
                    <div>❌ Prehra: <strong>{formData.body_za_prehru || 0} bodov</strong></div>
                  </div>
                </div>
              </div>
            )}

            {/* KROK 4: Turnaj (len ak je potrebný) */}
            {currentStep === 'tournament' && (formData.format === 'turnaj' || formData.format === 'kombinovany') && (
              <div>
                <h3 style={{ marginBottom: '20px', color: '#1e293b', fontSize: '18px' }}>
                  🥇 Nastavenia turnaja
                </h3>

                {/* Typ turnaja */}
                <div className="form-group">
                  <label className="modal-label">
                    Typ turnaja <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="modal-input"
                    value={formData.turnaj_typ || ''}
                    onChange={(e) => setFormData({ ...formData, turnaj_typ: e.target.value as any })}
                    required
                  >
                    <option value="">Vyberte typ turnaja</option>
                    <option value="single_elimination">Jednoduchá vyraďovačka</option>
                    <option value="double_elimination">Dvojitá vyraďovačka</option>
                    <option value="round_robin">Každý s každým</option>
                    <option value="groups_playoff">Skupiny + play-off</option>
                  </select>
                </div>

                {/* Počet postupujúcich (len pre kombinovaný) */}
                {formData.format === 'kombinovany' && (
                  <div className="form-group">
                    <label className="modal-label">
                      Počet postupujúcich zo skupiny <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      className="modal-input"
                      value={formData.turnaj_pocet_postupujucich || ''}
                      onChange={(e) => setFormData({ ...formData, turnaj_pocet_postupujucich: parseInt(e.target.value) || undefined })}
                      placeholder="napr. 2"
                      min="1"
                      max="16"
                      required
                    />
                  </div>
                )}

                {/* Popis typov turnajov */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px',
                  marginTop: '20px'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>Vysvetlenie typov:</h4>
                  <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                    <div><strong>Jednoduchá vyraďovačka:</strong> Jeden zápas = vyradenie</div>
                    <div><strong>Dvojitá vyraďovačka:</strong> Musíte prehrať 2x, aby ste vypadli</div>
                    <div><strong>Každý s každým:</strong> Všetci hrajú proti všetkým</div>
                    <div><strong>Skupiny + play-off:</strong> Najprv skupiny, potom vyraďovačka</div>
                  </div>
                </div>
              </div>
            )}

            {/* KROK 5: Tabuľka (len pri editácii líg s tabuľkou) */}
            {currentStep === 'table' && liga && (formData.format === 'tabulka' || formData.format === 'kombinovany') && (
              <div>
                <h3 style={{ marginBottom: '20px', color: '#1e293b', fontSize: '18px' }}>
                  📊 Úprava tabuľky
                </h3>

                {/* Tlačidlo pridania tímu */}
                <div style={{ marginBottom: '20px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddTeamForm(true)}
                    className="btn-primary"
                    style={{ marginRight: '12px' }}
                  >
                    + Pridať tím
                  </button>
                  
                  {tableTeams.length > 0 && (
                    <span style={{ fontSize: '14px', color: '#64748b' }}>
                      Celkovo {tableTeams.length} tímov v tabuľke
                    </span>
                  )}
                </div>

                {/* Formulár pre pridanie tímu */}
                {showAddTeamForm && (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '20px'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Pridať tím do tabuľky</h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Tím z databázy</label>
                        <select
                          className="modal-input"
                          onChange={(e) => {
                            if (e.target.value) {
                              const selectedTeam = teams.find(t => t.id.toString() === e.target.value);
                              if (selectedTeam) {
                                handleAddTeamToTable({ tim_id: selectedTeam.id });
                              }
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="">Vyberte tím</option>
                          {teams
                            .filter(team => !tableTeams.some(tt => tt.tim_id === team.id))
                            .map(team => (
                              <option key={team.id} value={team.id}>
                                {team.nazov} ({team.vekova_kategoria})
                              </option>
                            ))
                          }
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Alebo vlastný názov</label>
                        <input
                          type="text"
                          className="modal-input"
                          placeholder="napr. Hostujúci tím"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              handleAddTeamToTable({ custom_tim_nazov: e.currentTarget.value.trim() });
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowAddTeamForm(false)}
                        style={{
                          background: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          cursor: 'pointer'
                        }}
                      >
                        Zrušiť
                      </button>
                    </div>
                  </div>
                )}

                {/* Tabuľka tímov */}
                {tableTeams.length > 0 && (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Poz.</th>
                          <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Tím</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>Body</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>Z</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>V</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>R</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>P</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>GZ</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>GP</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>Akcie</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableTeams.map((team, index) => (
                          <tr key={team.id} style={{ borderBottom: index < tableTeams.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: '600' }}>
                              {team.pozicia}
                            </td>
                            <td style={{ padding: '8px' }}>
                              {team.tim_id ? (
                                teams.find(t => t.id === team.tim_id)?.nazov || 'Neznámy tím'
                              ) : (
                                team.custom_tim_nazov || 'Bez názvu'
                              )}
                            </td>
                            <td style={{ padding: '4px', textAlign: 'center' }}>
                              <input
                                type="number"
                                value={team.body}
                                onChange={(e) => handleUpdateTeamInTable(team.id, 'body', parseInt(e.target.value) || 0)}
                                style={{ width: '50px', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '4px', padding: '2px' }}
                                min="0"
                              />
                            </td>
                            <td style={{ padding: '4px', textAlign: 'center' }}>
                              <input
                                type="number"
                                value={team.zapasy}
                                onChange={(e) => handleUpdateTeamInTable(team.id, 'zapasy', parseInt(e.target.value) || 0)}
                                style={{ width: '40px', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '4px', padding: '2px' }}
                                min="0"
                              />
                            </td>
                            <td style={{ padding: '4px', textAlign: 'center' }}>
                              <input
                                type="number"
                                value={team.vitazstva}
                                onChange={(e) => handleUpdateTeamInTable(team.id, 'vitazstva', parseInt(e.target.value) || 0)}
                                style={{ width: '40px', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '4px', padding: '2px' }}
                                min="0"
                              />
                            </td>
                            <td style={{ padding: '4px', textAlign: 'center' }}>
                              <input
                                type="number"
                                value={team.remizy}
                                onChange={(e) => handleUpdateTeamInTable(team.id, 'remizy', parseInt(e.target.value) || 0)}
                                style={{ width: '40px', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '4px', padding: '2px' }}
                                min="0"
                              />
                            </td>
                            <td style={{ padding: '4px', textAlign: 'center' }}>
                              <input
                                type="number"
                                value={team.prehry}
                                onChange={(e) => handleUpdateTeamInTable(team.id, 'prehry', parseInt(e.target.value) || 0)}
                                style={{ width: '40px', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '4px', padding: '2px' }}
                                min="0"
                              />
                            </td>
                            <td style={{ padding: '4px', textAlign: 'center' }}>
                              <input
                                type="number"
                                value={team.goly_za}
                                onChange={(e) => handleUpdateTeamInTable(team.id, 'goly_za', parseInt(e.target.value) || 0)}
                                style={{ width: '40px', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '4px', padding: '2px' }}
                                min="0"
                              />
                            </td>
                            <td style={{ padding: '4px', textAlign: 'center' }}>
                              <input
                                type="number"
                                value={team.goly_proti}
                                onChange={(e) => handleUpdateTeamInTable(team.id, 'goly_proti', parseInt(e.target.value) || 0)}
                                style={{ width: '40px', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '4px', padding: '2px' }}
                                min="0"
                              />
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveTeamFromTable(team.id)}
                                style={{
                                  background: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                Odstrániť
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {tableTeams.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    marginTop: '16px'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
                    <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>Tabuľka je prázdna</div>
                    <div style={{ fontSize: '14px' }}>Pridajte tímy pomocou tlačidla vyššie</div>
                  </div>
                )}
              </div>
            )}

            {/* KROK 6: Vzhľad */}
            {currentStep === 'appearance' && (
              <div>
                <h3 style={{ marginBottom: '20px', color: '#1e293b', fontSize: '18px' }}>
                  🎨 Vzhľad a nastavenia
                </h3>
                
                {/* Logo */}
                <div className="form-group">
                  <label className="modal-label">Logo súťaže</label>
                  <input
                    type="url"
                    className="modal-input"
                    value={formData.logo || ''}
                    onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                {/* Farba */}
                <div className="form-group">
                  <label className="modal-label">Farba súťaže</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={formData.farba || '#3b82f6'}
                      onChange={(e) => setFormData({ ...formData, farba: e.target.value })}
                      style={{ width: '50px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      className="modal-input"
                      value={formData.farba || '#3b82f6'}
                      onChange={(e) => setFormData({ ...formData, farba: e.target.value })}
                      placeholder="#3b82f6"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                {/* External sync */}
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={formData.external_sync || false}
                      onChange={(e) => setFormData({ ...formData, external_sync: e.target.checked })}
                    />
                    Synchronizovať s externým zdrojom dát
                  </label>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 26px' }}>
                    Ak je zapnuté, tabuľka sa bude automaticky aktualizovať z externého zdroja
                  </p>
                </div>

                {/* Náhľad */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '20px',
                  marginTop: '20px'
                }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600' }}>Náhľad súťaže:</h4>
                  <div style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px',
                    borderLeft: `4px solid ${formData.farba || '#3b82f6'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      {formData.logo && (
                        <img 
                          src={formData.logo} 
                          alt="Logo" 
                          style={{ width: '32px', height: '32px', borderRadius: '4px' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                      <div>
                        <h5 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{formData.nazov || 'Názov súťaže'}</h5>
                        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>{formData.sezona || 'Sezóna'}</p>
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      <div><strong>Typ:</strong> {formData.typ === 'sutaz' ? 'Súťaž' : formData.typ === 'pohar' ? 'Pohár' : 'Priateľská'}</div>
                      <div><strong>Formát:</strong> {formData.format === 'tabulka' ? 'Liga (tabuľka)' : formData.format === 'turnaj' ? 'Turnaj (vyraďovačka)' : 'Kombinovaný'}</div>
                      <div><strong>Bodovanie:</strong> {formData.body_za_vitazstvo || 3}-{formData.body_za_remizy || 1}-{formData.body_za_prehru || 0}</div>
                      {formData.pocet_timov && <div><strong>Počet tímov:</strong> {formData.pocet_timov}</div>}
                      {(formData.datum_start || formData.datum_koniec) && (
                        <div><strong>Obdobie:</strong> 
                          {formData.datum_start && ` od ${new Date(formData.datum_start).toLocaleDateString('sk-SK')}`}
                          {formData.datum_koniec && ` do ${new Date(formData.datum_koniec).toLocaleDateString('sk-SK')}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
          </form>
        </div>

        {/* Footer s tlačidlami */}
        <div className="modal-footer" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          gap: '12px'
        }}>
          
          {/* Ľavá strana - Späť button */}
          <button
            type="button"
            onClick={handlePrevious}
            disabled={isFirstStep || loading}
            className="btn-secondary"
            style={{
              opacity: isFirstStep ? 0.5 : 1,
              cursor: isFirstStep ? 'not-allowed' : 'pointer',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px'
            }}
          >
            ← Späť
          </button>

          {/* Stred - Step indicator */}
          <div style={{ 
            fontSize: '14px', 
            color: '#64748b',
            textAlign: 'center'
          }}>
            Krok {currentStepIndex + 1} z {steps.length}
          </div>

          {/* Pravá strana - Ďalej/Uložiť button */}
          {isLastStep ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary"
              style={{
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px'
              }}
            >
              {loading ? 'Ukladám...' : (liga ? 'Uložiť zmeny' : 'Vytvoriť ligu')}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="btn-primary"
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px'
              }}
            >
              Ďalej →
            </button>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default LigaFormModal;