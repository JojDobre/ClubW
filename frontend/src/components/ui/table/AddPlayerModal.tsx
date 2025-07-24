// Umiestnenie: frontend/src/components/ui/table/AddPlayerModal.tsx
// Nový súbor - komponent pre pridanie hráča

import React, { useState } from 'react';
import Modal from './Modal';

export interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (playerData: PlayerFormData) => void;
  teams: Team[];
  loading?: boolean;
}

export interface PlayerFormData {
  meno: string;
  priezvisko: string;
  datum_narodenia: string;
  pozicia: string;
  tim_id: number;
  cislo_dresu: string;
  narodnost: string;
  vaha: string;
  vyska: string;
  poznamky: string;
  fotka?: string | null;
}

interface Team {
  id: number;
  nazov: string;
  vekova_kategoria?: string;
}

const AddPlayerModal: React.FC<AddPlayerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  teams,
  loading = false
}) => {
  const [formData, setFormData] = useState<PlayerFormData>({
    meno: '',
    priezvisko: '',
    datum_narodenia: '',
    pozicia: '',
    tim_id: 0,
    cislo_dresu: '',
    narodnost: '',
    vaha: '',
    vyska: '',
    poznamky: '',
    fotka: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const positions = [
    'brankár', 'obranca', 'stredopoliar', 'útočník', 'libero', 'stoper',
    'wingback', 'defenzívny stredopoliar', 'ofenzívny stredopoliar', 'krídelník', 'druhý útočník'
  ];

  const handleInputChange = (field: keyof PlayerFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Vymaž chybu pre dané pole
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle avatar upload
    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setAvatarFile(file);
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setFormData(prev => ({
          ...prev,
          avatar: previewUrl
        }));
      }
    };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.meno.trim()) newErrors.meno = 'Meno je povinné';
    if (!formData.priezvisko.trim()) newErrors.priezvisko = 'Priezvisko je povinné';
    if (!formData.datum_narodenia) newErrors.datum_narodenia = 'Dátum narodenia je povinný';
    if (!formData.pozicia) newErrors.pozicia = 'Pozícia je povinná';
    if (!formData.tim_id || formData.tim_id === 0) newErrors.tim_id = 'Tím je povinný';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    onSave(formData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      meno: '',
      priezvisko: '',
      datum_narodenia: '',
      pozicia: '',
      tim_id: 0,
      cislo_dresu: '',
      narodnost: '',
      vaha: '',
      vyska: '',
      poznamky: '',
      fotka: ''
    });
    setErrors({});
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title="Nový hráč"
      className="add-user-modal"
    >
      <div className="add-user-form">
        {/* Avatar Upload */}
        <div className="avatar-upload-section">
          <div className="avatar-upload">
            <input
              type="file"
              id="avatar-input"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="avatar-input"
            />
            <label htmlFor="avatar-input" className="avatar-label">
              {formData.fotka ? (
                <img 
                  src={formData.fotka} 
                  alt="Avatar preview" 
                  className="avatar-preview"
                />
              ) : (
                <div className="avatar-placeholder">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path 
                      d="M16 16C19.3137 16 22 13.3137 22 10C22 6.68629 19.3137 4 16 4C12.6863 4 10 6.68629 10 10C10 13.3137 12.6863 16 16 16Z" 
                      fill="currentColor"
                    />
                    <path 
                      d="M16 18C10.477 18 6 22.477 6 28H26C26 22.477 21.523 18 16 18Z" 
                      fill="currentColor"
                    />
                  </svg>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Základné informácie */}
        <div className="form-row">
          <div className="form-field">
            <input
              type="text"
              value={formData.meno}
              onChange={(e) => handleInputChange('meno', e.target.value)}
              className={`form-input ${errors.meno ? 'error' : ''}`}
              placeholder="Meno"
            />
            {errors.meno && <span className="form-error">{errors.meno}</span>}
          </div>
          
          <div className="form-field">
            <input
              type="text"
              value={formData.priezvisko}
              onChange={(e) => handleInputChange('priezvisko', e.target.value)}
              className={`form-input ${errors.priezvisko ? 'error' : ''}`}
              placeholder="Priezvisko"
            />
            {errors.priezvisko && <span className="form-error">{errors.priezvisko}</span>}
          </div>
        </div>

        {/* Tim a pozícia */}
        <div className="form-row">
            <div className="form-field">
                <select
                value={formData.tim_id}
                onChange={(e) => handleInputChange('tim_id', Number(e.target.value))}
                className={`form-input ${errors.tim_id ? 'error' : ''}`}
                >
                <option value={0}>Tím</option>
                {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                    {team.nazov} {team.vekova_kategoria}
                    </option>
                ))}
                </select>
                {errors.tim_id && <span className="form-error">{errors.tim_id}</span>}
            </div>

            <div className="form-field">
                <select
                value={formData.pozicia}
                onChange={(e) => handleInputChange('pozicia', e.target.value)}
                className={`form-input ${errors.pozicia ? 'error' : ''}`}
                >
                <option value="">Pozícia</option>
                {positions.map((position) => (
                    <option key={position} value={position}>
                    {position}
                    </option>
                ))}
                </select>
                {errors.pozicia && <span className="form-error">{errors.pozicia}</span>}
            </div>
        </div>

        {/* Datum a nartodnost */}
        <div className="form-row">
            <div className="form-field">
                <label className="form-label">Dátum narodenia</label>
                    <div className="date-input-wrapper">
                    <input
                        type="date"
                        value={formData.datum_narodenia}
                        onChange={(e) => handleInputChange('datum_narodenia', e.target.value)}
                        className={`form-input date-input ${errors.datum_narodenia ? 'error' : ''}`}
                        />
                        {errors.datum_narodenia && <span className="form-error">{errors.datum_narodenia}</span>}
                </div>
            </div>

            <div className="form-field">
                <label className="form-label">Národnosť</label>
                <input
                    type="text"
                    value={formData.narodnost}
                    onChange={(e) => handleInputChange('narodnost', e.target.value)}
                    className="form-input"
                    placeholder="Slovensko"
                />
            </div>
            
        </div>

        {/* Národnosť a fyzické parametre */}
        <div className="form-row">
            <div className="form-field">
                <input
                type="number"
                min="1"
                max="99"
                value={formData.cislo_dresu}
                onChange={(e) => handleInputChange('cislo_dresu', e.target.value)}
                className="form-input"
                placeholder="Číslo dresu (1-99)"
                />
            </div>
          
          <div className="form-field">
            <input
              type="number"
              min="30"
              max="200"
              step="0.1"
              value={formData.vaha}
              onChange={(e) => handleInputChange('vaha', e.target.value)}
              className="form-input"
              placeholder="Váha (kg)"
            />
          </div>

          <div className="form-field">
            <input
                type="number"
                min="100"
                max="250"
                step="0.1"
                value={formData.vyska}
                onChange={(e) => handleInputChange('vyska', e.target.value)}
                className="form-input"
                placeholder="Výška (cm)"
            />
          </div>
        </div>

        {/* Poznámky */}
          <textarea
            rows={3}
            value={formData.poznamky}
            onChange={(e) => handleInputChange('poznamky', e.target.value)}
            className="form-input"
            placeholder="Poznámky"
          />

        {/* Tlačidlá */}
        <div className="form-actions">
          <button 
            type="button" 
            onClick={handleClose}
            className="form-button cancel-button"
            disabled={loading}
          >
            Zrušiť
          </button>
          <button 
            type="button" 
            onClick={handleSave}
            className="form-button save-button"
            disabled={loading}
          >
            {loading ? 'Ukladám...' : 'Pridať hráča'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddPlayerModal;