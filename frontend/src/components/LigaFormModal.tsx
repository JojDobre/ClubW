// frontend/src/components/LigaFormModal.tsx
// Multi-step modal pre vytvorenie/editáciu ligy

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

const LigaFormModal: React.FC<LigaFormModalProps> = ({ liga, onClose, onSave }) => {
  const [currentStep, setCurrentStep] = useState<ModalStep>('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);
  
  // State pre tabuľku tímov (len pri editácii)
  const [tableTeams, setTableTeams] = useState<Array<{
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
  }>>([]);

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

  // Uloženie formulára
  const handleSubmit = async () => {
    const validation = validateCurrentStep();
    if (validation) {
      setError(validation);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Príprava dát pre API (odstránenie undefined hodnôt)
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

      console.log('Odosielajú sa dáta ligy:', apiData);

      if (liga) {
        await ligaApi.updateLeague(liga.id, apiData);
        console.log('✅ Liga aktualizovaná');
      } else {
        await ligaApi.createLeague(apiData);
        console.log('✅ Liga vytvorená');
      }

      onSave();
    } catch (err) {
      console.error('Chyba pri ukladaní ligy:', err);
      setError(err instanceof Error ? err.message : 'Chyba pri ukladaní ligy');
    } finally {
      setLoading(false);
    }
  };

  // Progress bar calculation
  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px', width: '90vw' }}>
        
        {/* Header s progress barom */}
        <div className="modal-header">
          <div style={{ flex: 1 }}>
            <h2 className="modal-title">
              {liga ? 'Upraviť ligu' : 'Nová liga'}
            </h2>
            
            {/* Progress bar */}
            <div style={{ 
              marginTop: '12px',
              background: '#f1f5f9',
              borderRadius: '8px',
              height: '6px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div 
                style={{
                  background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                  height: '100%',
                  borderRadius: '8px',
                  width: `${progressPercentage}%`,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
            
            {/* Step indicators */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginTop: '8px',
              fontSize: '11px',
              color: '#64748b'
            }}>
              {steps.map((step, index) => (
                <div 
                  key={step.key}
                  onClick={() => {
                    // Povoliť prekliknutie len ak nie sme v loading stave
                    if (!loading) {
                      // Ak ideme na predchádzajúci krok alebo na už dokončený krok
                      if (index <= currentStepIndex || index === currentStepIndex + 1) {
                        // Pre ďalší krok validujeme aktuálny
                        if (index === currentStepIndex + 1) {
                          const validation = validateCurrentStep();
                          if (validation) {
                            setError(validation);
                            return;
                          }
                          setError('');
                        }
                        setCurrentStep(step.key);
                      }
                    }
                  }}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    color: index <= currentStepIndex ? '#3b82f6' : '#64748b',
                    fontWeight: step.key === currentStep ? '600' : '400',
                    cursor: !loading && (index <= currentStepIndex || index === currentStepIndex + 1) ? 'pointer' : 'default',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    transition: 'all 0.2s',
                    backgroundColor: step.key === currentStep ? '#eff6ff' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && (index <= currentStepIndex || index === currentStepIndex + 1)) {
                      e.currentTarget.style.backgroundColor = step.key === currentStep ? '#eff6ff' : '#f8fafc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = step.key === currentStep ? '#eff6ff' : 'transparent';
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
          >
            ✕
          </button>
        </div>

        {/* Telo modalu */}
        <div className="modal-body">
          
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
                    placeholder="napr. Fortuna Liga"
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
                  <small style={{ color: '#64748b', fontSize: '12px' }}>
                    Použite formát: 2024/2025, 2024-25 alebo 2024
                  </small>
                </div>

                {/* Typ ligy */}
                <div className="form-group">
                  <label className="modal-label">
                    Typ súťaže <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="modal-select"
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
                    className="modal-select"
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
                    required
                  >
                    <option value="tabulka">Liga (tabuľka)</option>
                    <option value="turnaj">Turnaj (vyraďovačka)</option>
                    <option value="kombinovany">Kombinovaný (skupiny + playoff)</option>
                  </select>
                </div>

                {/* Popis */}
                <div className="form-group">
                  <label className="modal-label">Popis súťaže</label>
                  <textarea
                    className="modal-textarea"
                    value={formData.popis}
                    onChange={(e) => setFormData({ ...formData, popis: e.target.value })}
                    placeholder="Stručný popis súťaže..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* KROK 2: Časové nastavenia & Tímy */}
            {currentStep === 'settings' && (
              <div>
                <h3 style={{ marginBottom: '20px', color: '#1e293b', fontSize: '18px' }}>
                  ⚙️ Časové nastavenia & Tímy
                </h3>
                
                {/* Dátumy */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="modal-label">Dátum začiatku</label>
                    <input
                      type="date"
                      className="modal-input"
                      value={formData.datum_start}
                      onChange={(e) => setFormData({ ...formData, datum_start: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="modal-label">Dátum ukončenia</label>
                    <input
                      type="date"
                      className="modal-input"
                      value={formData.datum_koniec}
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
                    value={formData.pocet_timov || 12}
                    onChange={(e) => setFormData({ ...formData, pocet_timov: Number(e.target.value) || 12 })}
                    min={2}
                    max={100}
                    placeholder="12"
                  />
                  <small style={{ color: '#64748b', fontSize: '12px' }}>
                    Maximálny počet tímov v súťaži (2-100)
                  </small>
                </div>

                {/* Priradenie k tímu (pre filtrovanie) */}
                <div className="form-group">
                  <label className="modal-label">Priradenie k tímu</label>
                  <select
                    className="modal-select"
                    value={formData.tim_id || ''}
                    onChange={(e) => setFormData({ ...formData, tim_id: e.target.value ? Number(e.target.value) : undefined })}
                  >
                    <option value="">Všetky tímy</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.nazov} ({team.vekova_kategoria})
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#64748b', fontSize: '12px' }}>
                    Voliteľne - pre filtrovanie súťaže podľa konkrétneho tímu
                  </small>
                </div>
              </div>
            )}

            {/* KROK 3: Bodovanie */}
            {currentStep === 'scoring' && (
              <div>
                <h3 style={{ marginBottom: '20px', color: '#1e293b', fontSize: '18px' }}>
                  🏆 Bodovanie a pravidlá
                </h3>
                
                {/* Bodovací systém */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="modal-label">Body za víťazstvo</label>
                    <input
                      type="number"
                      className="modal-input"
                      value={formData.body_za_vitazstvo || 3}
                      onChange={(e) => setFormData({ ...formData, body_za_vitazstvo: Number(e.target.value) || 3 })}
                      min={0}
                      max={10}
                    />
                  </div>

                  <div className="form-group">
                    <label className="modal-label">Body za remízu</label>
                    <input
                      type="number"
                      className="modal-input"
                      value={formData.body_za_remizy || 1}
                      onChange={(e) => setFormData({ ...formData, body_za_remizy: Number(e.target.value) || 1 })}
                      min={0}
                      max={10}
                    />
                  </div>

                  <div className="form-group">
                    <label className="modal-label">Body za prehru</label>
                    <input
                      type="number"
                      className="modal-input"
                      value={formData.body_za_prehru || 0}
                      onChange={(e) => setFormData({ ...formData, body_za_prehru: Number(e.target.value) || 0 })}
                      min={0}
                      max={10}
                    />
                  </div>
                </div>

                {/* Nastavenia tabuľky */}
                <div className="form-group">
                  <div className="modal-checkbox">
                    <input
                      type="checkbox"
                      id="auto-update"
                      checked={formData.auto_update_tabulka}
                      onChange={(e) => setFormData({ ...formData, auto_update_tabulka: e.target.checked })}
                    />
                    <div className="checkbox-custom"></div>
                    <div className="checkbox-text">
                      <span>Automatická aktualizácia tabuľky</span>
                      <small>Tabuľka sa automaticky prepočíta po každom zápase</small>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <div className="modal-checkbox">
                    <input
                      type="checkbox"
                      id="show-form"
                      checked={formData.zobrazit_formu}
                      onChange={(e) => setFormData({ ...formData, zobrazit_formu: e.target.checked })}
                    />
                    <div className="checkbox-custom"></div>
                    <div className="checkbox-text">
                      <span>Zobraziť formu tímov</span>
                      <small>Posledných 5 výsledkov tímov (W-D-L)</small>
                    </div>
                  </div>
                </div>

                {/* Minimálny počet zápasov */}
                <div className="form-group">
                  <label className="modal-label">Minimálny počet zápasov</label>
                  <input
                    type="number"
                    className="modal-input"
                    value={formData.min_zapasov || 0}
                    onChange={(e) => setFormData({ ...formData, min_zapasov: Number(e.target.value) || 0 })}
                    min={0}
                    max={50}
                    placeholder="0"
                  />
                  <small style={{ color: '#64748b', fontSize: '12px' }}>
                    Minimálny počet zápasov pre oficiálne zaradenie do tabuľky
                  </small>
                </div>
              </div>
            )}

            {/* KROK 4: Turnajové nastavenia */}
            {currentStep === 'tournament' && (formData.format === 'turnaj' || formData.format === 'kombinovany') && (
              <div>
                <h3 style={{ marginBottom: '20px', color: '#1e293b', fontSize: '18px' }}>
                  🥇 Turnajové nastavenia
                </h3>
                
                {/* Typ turnaja */}
                <div className="form-group">
                  <label className="modal-label">
                    Typ turnaja <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="modal-select"
                    value={formData.turnaj_typ || ''}
                    onChange={(e) => setFormData({ ...formData, turnaj_typ: e.target.value as any })}
                    required
                  >
                    <option value="">Vyberte typ turnaja</option>
                    <option value="single_elimination">Jednoduché vyraďovačka</option>
                    <option value="double_elimination">Dvojitá vyraďovačka</option>
                    <option value="round_robin">Každý s každým</option>
                    <option value="groups_playoff">Skupiny + Playoff</option>
                  </select>
                </div>

                {/* Počet postupujúcich (pre kombinovaný formát) */}
                {formData.format === 'kombinovany' && (
                  <div className="form-group">
                    <label className="modal-label">
                      Počet postupujúcich zo skupiny <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      className="modal-input"
                      value={formData.turnaj_pocet_postupujucich || ''}
                      onChange={(e) => setFormData({ ...formData, turnaj_pocet_postupujucich: Number(e.target.value) })}
                      min={1}
                      max={16}
                      placeholder="2"
                      required
                    />
                    <small style={{ color: '#64748b', fontSize: '12px' }}>
                      Koľko tímov postupuje zo skupiny do playoff fázy
                    </small>
                  </div>
                )}

                {/* Info o type turnaja */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '13px',
                  color: '#475569'
                }}>
                  <strong>Typy turnajov:</strong>
                  <ul style={{ margin: '8px 0', paddingLeft: '16px' }}>
                    <li><strong>Jednoduché vyraďovačka:</strong> Klasický vyraďovací systém</li>
                    <li><strong>Dvojitá vyraďovačka:</strong> Tím môže prehrať raz</li>
                    <li><strong>Každý s každým:</strong> Všetci hrajú so všetkými</li>
                    <li><strong>Skupiny + Playoff:</strong> Skupinová fáza + vyraďovačka</li>
                  </ul>
                </div>
              </div>
            )}

            {/* KROK: Úprava tabuľky (len pri editácii tabulkových líg) */}
            {currentStep === 'table' && liga && (formData.format === 'tabulka' || formData.format === 'kombinovany') && (
              <div>
                <h3 style={{ marginBottom: '20px', color: '#1e293b', fontSize: '18px' }}>
                  📊 Úprava tabuľky
                </h3>
                
                {/* Tlačidlo pridania nového tímu */}
                <div style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddTeamForm(!showAddTeamForm)}
                    className="btn-secondary"
                    style={{ fontSize: '14px' }}
                  >
                    {showAddTeamForm ? '✕ Zrušiť' : '+ Pridať tím'}
                  </button>
                  
                  {tableTeams.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        // Automatické zoradenie podľa bodov
                        const sorted = [...tableTeams].sort((a, b) => {
                          if (a.body !== b.body) return b.body - a.body;
                          const aRozd = a.goly_za - a.goly_proti;
                          const bRozd = b.goly_za - b.goly_proti;
                          if (aRozd !== bRozd) return bRozd - aRozd;
                          return b.goly_za - a.goly_za;
                        });
                        
                        // Aktualizácia pozícií
                        const updatedTeams = sorted.map((team, index) => ({
                          ...team,
                          pozicia: index + 1
                        }));
                        
                        setTableTeams(updatedTeams);
                      }}
                      className="btn-secondary"
                      style={{ fontSize: '14px' }}
                    >
                      🔄 Auto-zoradiť podľa bodov
                    </button>
                  )}
                </div>

                {/* Formulár pre pridanie nového tímu */}
                {showAddTeamForm && (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '16px'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Pridať nový tím</h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label className="modal-label">Tím zo systému</label>
                        <select
                          className="modal-select"
                          onChange={(e) => {
                            if (e.target.value) {
                              const selectedTeam = teams.find(t => t.id === Number(e.target.value));
                              if (selectedTeam) {
                                const newTeam = {
                                  id: `new-${Date.now()}`,
                                  tim_id: selectedTeam.id,
                                  custom_tim_nazov: undefined,
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
                                e.target.value = '';
                              }
                            }
                          }}
                        >
                          <option value="">Vyberte tím...</option>
                          {teams.filter(team => 
                            !tableTeams.some(tt => tt.tim_id === team.id)
                          ).map(team => (
                            <option key={team.id} value={team.id}>
                              {team.nazov} ({team.vekova_kategoria})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="modal-label">Alebo vlastný názov</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            className="modal-input"
                            placeholder="Názov tímu..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                const customName = e.currentTarget.value.trim();
                                const newTeam = {
                                  id: `custom-${Date.now()}`,
                                  tim_id: undefined,
                                  custom_tim_nazov: customName,
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
                                e.currentTarget.value = '';
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              const input = (e.target as HTMLElement).parentElement?.querySelector('input') as HTMLInputElement;
                              if (input?.value.trim()) {
                                const customName = input.value.trim();
                                const newTeam = {
                                  id: `custom-${Date.now()}`,
                                  tim_id: undefined,
                                  custom_tim_nazov: customName,
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
                                input.value = '';
                              }
                            }}
                            className="btn-primary"
                            style={{ fontSize: '14px', padding: '6px 12px' }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tabuľka tímov */}
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', width: '40px' }}>Pos.</th>
                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Tím</th>
                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', width: '60px' }}>Body</th>
                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', width: '50px' }}>Z</th>
                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', width: '50px' }}>V</th>
                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', width: '50px' }}>R</th>
                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', width: '50px' }}>P</th>
                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', width: '60px' }}>GZ</th>
                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', width: '60px' }}>GP</th>
                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', width: '40px' }}>Akcie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableTeams
                        .sort((a, b) => a.pozicia - b.pozicia)
                        .map((team, index) => {
                          const teamName = team.custom_tim_nazov || 
                            teams.find(t => t.id === team.tim_id)?.nazov || 
                            `Tím ${team.tim_id}`;
                          
                          return (
                            <tr key={team.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px' }}>
                                <input
                                  type="number"
                                  value={team.pozicia}
                                  onChange={(e) => {
                                    const newPos = Number(e.target.value);
                                    setTableTeams(teams => teams.map(t => 
                                      t.id === team.id ? { ...t, pozicia: newPos } : t
                                    ));
                                  }}
                                  style={{ width: '40px', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '4px', padding: '2px' }}
                                  min="1"
                                />
                              </td>
                              <td style={{ padding: '8px', fontWeight: '500' }}>{teamName}</td>
                              <td style={{ padding: '8px' }}>
                                <input
                                  type="number"
                                  value={team.body}
                                  onChange={(e) => {
                                    const newBody = Number(e.target.value);
                                    setTableTeams(teams => teams.map(t => 
                                      t.id === team.id ? { ...t, body: newBody } : t
                                    ));
                                  }}
                                  style={{ width: '50px', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '4px', padding: '2px' }}
                                  min="0"
                                />
                              </td>
                              <td style={{ padding: '8px' }}>
                                <input
                                  type="number"
                                  value={team.zapasy}
                                  onChange={(e) => {
                                    const newZapasy = Number(e.target.value);
                                    setTableTeams(teams => teams.map(t => 
                                      t.id === team.id ? { ...t, zapasy: newZapasy } : t
                                    ));
                                  }}
                                  style={{ width: '40px', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '4px', padding: '2px' }}
                                  min="0"
                                />
                              </td>
                              <td style={{ padding: '8px' }}>
                                <input
                                  type="number"
                                  value={team.vitazstva}
                                  onChange={(e) => {
                                    const newV = Number(e.target.value);
                                    setTableTeams(teams => teams.map(t => 
                                      t.id === team.id ? { ...t, vitazstva: newV } : t
                                    ));
                                  }}
                                  style={{ width: '40px', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '4px', padding: '2px' }}
                                  min="0"
                                />
                              </td>
                              <td style={{ padding: '8px' }}>
                                <input
                                  type="number"
                                  value={team.remizy}
                                  onChange={(e) => {
                                    const newR = Number(e.target.value);
                                    setTableTeams(teams => teams.map(t => 
                                      t.id === team.id ? { ...t, remizy: newR } : t
                                    ));
                                  }}
                                  style={{ width: '40px', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '4px', padding: '2px' }}
                                  min="0"
                                />
                              </td>
                              <td style={{ padding: '8px' }}>
                                <input
                                  type="number"
                                  value={team.prehry}
                                  onChange={(e) => {
                                    const newP = Number(e.target.value);
                                    setTableTeams(teams => teams.map(t => 
                                      t.id === team.id ? { ...t, prehry: newP } : t
                                    ));
                                  }}
                                  style={{ width: '40px', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '4px', padding: '2px' }}
                                  min="0"
                                />
                              </td>
                              <td style={{ padding: '8px' }}>
                                <input
                                  type="number"
                                  value={team.goly_za}
                                  onChange={(e) => {
                                    const newGZ = Number(e.target.value);
                                    setTableTeams(teams => teams.map(t => 
                                      t.id === team.id ? { ...t, goly_za: newGZ } : t
                                    ));
                                  }}
                                  style={{ width: '50px', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '4px', padding: '2px' }}
                                  min="0"
                                />
                              </td>
                              <td style={{ padding: '8px' }}>
                                <input
                                  type="number"
                                  value={team.goly_proti}
                                  onChange={(e) => {
                                    const newGP = Number(e.target.value);
                                    setTableTeams(teams => teams.map(t => 
                                      t.id === team.id ? { ...t, goly_proti: newGP } : t
                                    ));
                                  }}
                                  style={{ width: '50px', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '4px', padding: '2px' }}
                                  min="0"
                                />
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTableTeams(teams => teams.filter(t => t.id !== team.id));
                                  }}
                                  style={{
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    width: '24px',
                                    height: '24px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                  }}
                                  title="Odstrániť tím"
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

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

            {/* KROK 5: Vzhľad */}
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
                    value={formData.logo}
                    onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                  <small style={{ color: '#64748b', fontSize: '12px' }}>
                    URL obrázka pre logo súťaže
                  </small>
                </div>

                {/* Farba */}
                <div className="form-group">
                  <label className="modal-label">Farba súťaže</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={formData.farba}
                      onChange={(e) => setFormData({ ...formData, farba: e.target.value })}
                      style={{
                        width: '50px',
                        height: '40px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    />
                    <input
                      type="text"
                      className="modal-input"
                      value={formData.farba}
                      onChange={(e) => setFormData({ ...formData, farba: e.target.value })}
                      placeholder="#3b82f6"
                      pattern="^#[0-9A-F]{6}$"
                      style={{ flex: 1 }}
                    />
                  </div>
                  <small style={{ color: '#64748b', fontSize: '12px' }}>
                    Hex kód farby (napr. #FF6B35)
                  </small>
                </div>

                {/* Prednastavené farby */}
                <div className="form-group">
                  <label className="modal-label">Prednastavené farby</label>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(6, 1fr)', 
                    gap: '8px',
                    marginTop: '8px'
                  }}>
                    {[
                      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
                      '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
                      '#6366f1', '#ec4899', '#14b8a6', '#f87171'
                    ].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, farba: color })}
                        style={{
                          width: '40px',
                          height: '40px',
                          backgroundColor: color,
                          border: formData.farba === color ? '3px solid #1e293b' : '2px solid #e5e7eb',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {/* Externá synchronizácia */}
                <div className="form-group">
                  <div className="modal-checkbox">
                    <input
                      type="checkbox"
                      id="external-sync"
                      checked={formData.external_sync}
                      onChange={(e) => setFormData({ ...formData, external_sync: e.target.checked })}
                    />
                    <div className="checkbox-custom"></div>
                    <div className="checkbox-text">
                      <span>Externá synchronizácia</span>
                      <small>Údaje sa budú synchronizovať s externým zdrojom</small>
                    </div>
                  </div>
                </div>

                {/* Shrnutie */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px',
                  marginTop: '20px'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: '16px' }}>
                    📝 Shrnutie ligy
                  </h4>
                  
                  <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
                    <div><strong>Názov:</strong> {formData.nazov || 'Neuvedené'}</div>
                    <div><strong>Sezóna:</strong> {formData.sezona || 'Neuvedené'}</div>
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
              cursor: isFirstStep ? 'not-allowed' : 'pointer'
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
                cursor: loading ? 'not-allowed' : 'pointer'
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