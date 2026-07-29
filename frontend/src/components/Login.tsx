// frontend/src/components/Login.tsx
// Moderný prihlasovací formulár s profesionálnym dizajnom

import React, { useState } from 'react';
// Centrálna konfigurácia API adries - žiadne natvrdo zapísané localhost
import { apiUrl } from '../config/api';

interface LoginProps {
  onLoginSuccess: (userData: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    heslo: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success && data.data) {
        localStorage.setItem('clubw_token', data.data.token);
        localStorage.setItem('clubw_user', JSON.stringify(data.data.user));
        onLoginSuccess(data.data.user);
      } else {
        setError(data.message || 'Prihlásenie sa nepodarilo');
      }
    } catch (err) {
      console.error('Chyba pri prihlásení:', err);
      setError('Chyba spojenia so serverom');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (email: string, heslo: string) => {
    setFormData({ email, heslo });
  };

  const inputStyle = {
    width: '100%',
    padding: '16px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '16px',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box' as const,
    background: '#ffffff'
  };

  const focusStyle = {
    borderColor: '#3b82f6',
    outline: 'none',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '24px',
      padding: '48px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      width: '100%',
      maxWidth: '480px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          fontSize: '3rem',
          marginBottom: '16px'
        }}>
          ⚽
        </div>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#1e293b',
          marginBottom: '8px'
        }}>
          ClubW Admin
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#64748b',
          margin: 0
        }}>
          Prihlásenie do administrácie
        </p>
      </div>

      {/* Demo účty */}
      <div style={{
        background: '#f8fafc',
        padding: '20px',
        borderRadius: '16px',
        marginBottom: '32px',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '16px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Demo účty:
        </h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => quickLogin('admin@clubw.sk', 'admin123')}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            👑 Admin
          </button>
          <button
            type="button"
            onClick={() => quickLogin('redaktor@clubw.sk', 'redaktor123')}
            style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            ✍️ Redaktor
          </button>
        </div>
      </div>

      {/* Formulár */}
      <form onSubmit={handleSubmit}>
        {/* Email */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151'
          }}>
            Email adresa
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            style={inputStyle}
            placeholder="admin@clubw.sk"
            onFocus={(e) => Object.assign(e.target.style, focusStyle)}
            onBlur={(e) => {
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Heslo */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151'
          }}>
            Heslo
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              name="heslo"
              value={formData.heslo}
              onChange={handleInputChange}
              required
              style={{
                ...inputStyle,
                paddingRight: '48px'
              }}
              placeholder="••••••••"
              onFocus={(e) => Object.assign(e.target.style, focusStyle)}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = 'none';
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#64748b'
              }}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* Error správa */}
        {error && (
          <div style={{
            background: '#fef2f2',
            color: '#dc2626',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '24px',
            borderLeft: '4px solid #dc2626',
            fontSize: '14px'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
              ❌ Chyba pri prihlásení
            </div>
            {error}
          </div>
        )}

        {/* Submit tlačidlo */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            background: loading 
              ? '#9ca3af' 
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid #ffffff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Prihlasuje...
            </>
          ) : (
            <>
              🔐 Prihlásiť sa
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        marginTop: '32px',
        paddingTop: '24px',
        borderTop: '1px solid #e2e8f0'
      }}>
        <p style={{
          fontSize: '14px',
          color: '#64748b',
          margin: 0
        }}>
          ClubW Admin Panel v1.0
        </p>
        <div style={{
          marginTop: '12px',
          display: 'flex',
          justifyContent: 'center',
          gap: '16px'
        }}>
          <button
            type="button"
            onClick={() => window.open('/clanky', '_blank')}
            style={{
              background: 'none',
              border: 'none',
              color: '#3b82f6',
              cursor: 'pointer',
              fontSize: '14px',
              textDecoration: 'underline'
            }}
          >
            🌐 Zobraziť web
          </button>
        </div>
      </div>

      {/* CSS animácie */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Login;