// frontend/src/components/PublicLayout.tsx
// Verejný layout pre zobrazovanie stránok s navigáciou

import React, { useState, useEffect } from 'react';

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
  const [menuPages, setMenuPages] = useState<MenuPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Načítanie menu stránok z API
  useEffect(() => {
    const fetchMenuPages = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/pages/menu');
        const data = await response.json();
        
        if (data.success) {
          setMenuPages(data.data.pages);
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
              <a href="/" style={{
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
              </a>
            </div>

            {/* Desktop Menu */}
            <div style={{
              display: window.innerWidth > 768 ? 'flex' : 'none',
              alignItems: 'center',
              gap: '30px'
            }}>
              {/* Hlavné odkazy */}
              <a href="/" style={{
                textDecoration: 'none',
                color: '#4a5568',
                fontWeight: '500',
                padding: '8px 0',
                borderBottom: '2px solid transparent',
                transition: 'all 0.2s'
              }}>
                Domov
              </a>
              
              <a href="/clanky" style={{
                textDecoration: 'none',
                color: '#4a5568',
                fontWeight: '500',
                padding: '8px 0',
                borderBottom: '2px solid transparent',
                transition: 'all 0.2s'
              }}>
                Články
              </a>

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
              <a href="/admin" style={{
                textDecoration: 'none',
                color: '#3182ce',
                fontWeight: '500',
                padding: '8px 16px',
                border: '1px solid #3182ce',
                borderRadius: '6px',
                transition: 'all 0.2s'
              }}>
                ⚙️ Admin
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                display: window.innerWidth <= 768 ? 'block' : 'none',
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
              display: window.innerWidth <= 768 ? 'block' : 'none',
              background: 'white',
              borderTop: '1px solid #e2e8f0',
              padding: '20px 0'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '15px'
              }}>
                <a href="/" style={{
                  textDecoration: 'none',
                  color: '#4a5568',
                  fontWeight: '500',
                  padding: '10px 0'
                }}>
                  🏠 Domov
                </a>
                
                <a href="/clanky" style={{
                  textDecoration: 'none',
                  color: '#4a5568',
                  fontWeight: '500',
                  padding: '10px 0'
                }}>
                  📰 Články
                </a>

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

                <a href="/admin" style={{
                  textDecoration: 'none',
                  color: '#3182ce',
                  fontWeight: '500',
                  padding: '10px 0'
                }}>
                  ⚙️ Admin
                </a>
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
                <a href="/" style={{ color: '#a0aec0', textDecoration: 'none', fontSize: '14px' }}>
                  Domov
                </a>
                <a href="/clanky" style={{ color: '#a0aec0', textDecoration: 'none', fontSize: '14px' }}>
                  Články
                </a>
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