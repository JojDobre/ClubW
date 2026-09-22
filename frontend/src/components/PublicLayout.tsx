// frontend/src/components/PublicLayout.tsx
// Verejný layout pre zobrazovanie stránok s navigáciou

import React, { useState, useEffect } from 'react';
// Centrálna konfigurácia API adries - žiadne natvrdo zapísané localhost
import { apiUrl } from '../config/api';
// Link namiesto <a href> - bez neho každý klik znovu načíta celú aplikáciu
import { Link } from 'react-router-dom';
// Sledovanie šírky obrazovky tak, aby React reagoval na zmenu veľkosti okna
import { useJeMobil } from '../hooks/useMediaQuery';

interface PublicLayoutProps {
  children: React.ReactNode;
}

interface MenuPage {
  id: number;
  nazov: string;
  slug: string;
  url: string;
  poradie_menu: number;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  // Reaguje na zmenu veľkosti okna (otočenie telefónu, zmena šírky)
  const jeMobil = useJeMobil();

  const [menuPages, setMenuPages] = useState<MenuPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Načítanie menu stránok z API
  useEffect(() => {
    const fetchMenuPages = async () => {
      try {
        const response = await fetch(apiUrl('/pages/menu'));
        const data = await response.json();
        
        if (data.success) {
          setMenuPages(data.data);
        }
      } catch (error) {
        console.error('Chyba pri načítavaní menu:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuPages();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f7fafc' }}>
      {/* Header s navigáciou */}
      <header style={{
        background: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px'
        }}>
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '70px'
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Link to="/" style={{
                textDecoration: 'none',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#2d3748',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ fontSize: '2rem' }}>🏆</span>
                ClubW
              </Link>
            </div>

            {/* Desktop Menu */}
            <div style={{
              display: jeMobil ? 'none' : 'flex',
              alignItems: 'center',
              gap: '30px'
            }}>
              {/* Hlavné odkazy */}
              <Link to="/" style={{
                textDecoration: 'none',
                color: '#4a5568',
                fontWeight: '500',
                padding: '8px 0',
                borderBottom: '2px solid transparent',
                transition: 'all 0.2s'
              }}>
                Domov
              </Link>
              
              <Link to="/clanky" style={{
                textDecoration: 'none',
                color: '#4a5568',
                fontWeight: '500',
                padding: '8px 0',
                borderBottom: '2px solid transparent',
                transition: 'all 0.2s'
              }}>
                Články
              </Link>

              {/* Dynamické menu stránky */}
              {!loading && menuPages.map((page) => (
                <a 
                  key={page.id}
                  href={page.url} 
                  style={{
                    textDecoration: 'none',
                    color: '#4a5568',
                    fontWeight: '500',
                    padding: '8px 0',
                    borderBottom: '2px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  {page.nazov}
                </a>
              ))}

              {/* Admin odkaz */}
              <Link to="/admin" style={{
                textDecoration: 'none',
                color: '#3182ce',
                fontWeight: '500',
                padding: '8px 16px',
                border: '1px solid #3182ce',
                borderRadius: '6px',
                transition: 'all 0.2s'
              }}>
                ⚙️ Admin
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                display: jeMobil ? 'block' : 'none',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '8px'
              }}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </nav>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div style={{
              display: jeMobil ? 'block' : 'none',
              background: 'white',
              borderTop: '1px solid #e2e8f0',
              padding: '20px 0'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '15px'
              }}>
                <Link to="/" style={{
                  textDecoration: 'none',
                  color: '#4a5568',
                  fontWeight: '500',
                  padding: '10px 0'
                }}>
                  🏠 Domov
                </Link>
                
                <Link to="/clanky" style={{
                  textDecoration: 'none',
                  color: '#4a5568',
                  fontWeight: '500',
                  padding: '10px 0'
                }}>
                  📰 Články
                </Link>

                {/* Dynamické menu stránky */}
                {!loading && menuPages.map((page) => (
                  <a 
                    key={page.id}
                    href={page.url} 
                    style={{
                      textDecoration: 'none',
                      color: '#4a5568',
                      fontWeight: '500',
                      padding: '10px 0'
                    }}
                  >
                    📄 {page.nazov}
                  </a>
                ))}

                <Link to="/admin" style={{
                  textDecoration: 'none',
                  color: '#3182ce',
                  fontWeight: '500',
                  padding: '10px 0'
                }}>
                  ⚙️ Admin
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={{ minHeight: 'calc(100vh - 140px)' }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        background: '#2d3748',
        color: 'white',
        padding: '40px 20px 20px',
        marginTop: '60px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '30px',
            marginBottom: '30px'
          }}>
            <div>
              <h3 style={{ marginBottom: '15px', color: '#e2e8f0' }}>ClubW</h3>
              <p style={{ color: '#a0aec0', fontSize: '14px' }}>
                Moderná platforma pre správu športových klubov. 
                Všetko čo potrebujete na jednom mieste.
              </p>
            </div>
            
            <div>
              <h4 style={{ marginBottom: '15px', color: '#e2e8f0' }}>Rýchle odkazy</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Link to="/" style={{ color: '#a0aec0', textDecoration: 'none', fontSize: '14px' }}>
                  Domov
                </Link>
                <Link to="/clanky" style={{ color: '#a0aec0', textDecoration: 'none', fontSize: '14px' }}>
                  Články
                </Link>
                {menuPages.slice(0, 3).map((page) => (
                  <a 
                    key={page.id}
                    href={page.url} 
                    style={{ color: '#a0aec0', textDecoration: 'none', fontSize: '14px' }}
                  >
                    {page.nazov}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ marginBottom: '15px', color: '#e2e8f0' }}>Kontakt</h4>
              <div style={{ color: '#a0aec0', fontSize: '14px' }}>
                <p>📧 info@clubw.sk</p>
                <p>📞 +421 900 123 456</p>
                <p>📍 Bratislava, Slovensko</p>
              </div>
            </div>
          </div>

          <div style={{
            borderTop: '1px solid #4a5568',
            paddingTop: '20px',
            color: '#a0aec0',
            fontSize: '14px'
          }}>
            <p>&copy; 2024 ClubW. Všetky práva vyhradené.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;