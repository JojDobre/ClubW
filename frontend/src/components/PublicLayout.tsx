// frontend/src/components/PublicLayout.tsx
// Verejný layout pre zobrazovanie stránok s navigáciou

import React, { useState, useEffect } from 'react';
// Centrálna konfigurácia API adries - žiadne natvrdo zapísané localhost
import { apiUrl, souborUrl } from '../config/api';
import { useNastavenia } from '../context/NastaveniaContext';
import './PublicLayout.css';
import WebDoplnky from './WebDoplnky';
// Link namiesto <a href> - bez neho každý klik znovu načíta celú aplikáciu
import { Link } from 'react-router-dom';
// Sledovanie šírky obrazovky tak, aby React reagoval na zmenu veľkosti okna
import { useJeMobil } from '../hooks/useMediaQuery';

interface PublicLayoutProps {
  children: React.ReactNode;
}

/** Položka menu nastaveného v administrácii (Menu webu). */
interface PolozkaMenuWebu {
  id: number;
  nazov: string;
  odkaz: string | null;
  otvorit_v_novom: boolean;
  deti?: PolozkaMenuWebu[];
}

/** Odkaz z menu - interný cez Link, externý alebo do nového okna cez <a>. */
const OdkazMenu: React.FC<{ p: PolozkaMenuWebu; className?: string; onClick?: () => void; children?: React.ReactNode }> = ({
  p, className, onClick, children,
}) => {
  const adresa = p.odkaz || '#';
  if (adresa.startsWith('/') && !p.otvorit_v_novom) {
    return <Link to={adresa} className={className} onClick={onClick}>{children ?? p.nazov}</Link>;
  }
  return (
    <a
      href={adresa}
      className={className}
      onClick={onClick}
      {...(p.otvorit_v_novom ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children ?? p.nazov}
    </a>
  );
};

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
  const { nastavenia } = useNastavenia();
  const kontakt = nastavenia.kontakt ?? { email: null, telefon: null, adresa: null };
  const siete = Object.entries({
    Facebook: nastavenia.socialne_siete?.facebook,
    Instagram: nastavenia.socialne_siete?.instagram,
    YouTube: nastavenia.socialne_siete?.youtube,
    X: nastavenia.socialne_siete?.x,
    TikTok: nastavenia.socialne_siete?.tiktok,
  }).filter(([, url]) => Boolean(url)) as Array<[string, string]>;
  const udaje = nastavenia.udaje;
  // Stránky klubu mimo dynamického menu
  const klubOdkazy = [
    { cesta: '/turnaje', nazov: 'Turnaje' },
    { cesta: '/dokumenty', nazov: 'Dokumenty' },
    { cesta: '/sponzori', nazov: 'Partneri' },
  ];

  const [menuPages, setMenuPages] = useState<MenuPage[]>([]);
  // Menu nastavené v administrácii; prázdne = predvolené odkazy
  const [menuWebu, setMenuWebu] = useState<PolozkaMenuWebu[]>([]);
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
    fetch(apiUrl('/menu'))
      .then((r) => r.json())
      .then((d) => d?.success && Array.isArray(d.data) && setMenuWebu(d.data))
      .catch(() => undefined);
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
                {nastavenia.logo ? (
                  <img src={souborUrl(nastavenia.logo)} alt="" style={{ height: '44px', width: '44px', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: '2rem' }}>🏆</span>
                )}
                {nastavenia.nazov}
              </Link>
            </div>

            {/* Desktop Menu */}
            <div style={{
              display: jeMobil ? 'none' : 'flex',
              alignItems: 'center',
              gap: '30px'
            }}>
              {menuWebu.length > 0 ? (
                menuWebu.map((p) => (
                  <div key={p.id} className="pl-menu__polozka">
                    <OdkazMenu p={p} className="pl-menu__odkaz" />
                    {(p.deti?.length ?? 0) > 0 && (
                      <div className="pl-menu__podmenu">
                        {p.deti!.map((d) => (
                          <OdkazMenu key={d.id} p={d} className="pl-menu__pododkaz" />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
              <>
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

              {klubOdkazy.map((o) => (
                <Link key={o.cesta} to={o.cesta} style={{ textDecoration: 'none', color: '#4a5568', fontWeight: '500', padding: '8px 0' }}>
                  {o.nazov}
                </Link>
              ))}
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
              </>
              )}
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
                {menuWebu.length > 0 ? (
                  menuWebu.map((p) => (
                    <React.Fragment key={p.id}>
                      <OdkazMenu p={p} className="pl-menu__mobil" onClick={() => setMobileMenuOpen(false)} />
                      {p.deti?.map((d) => (
                        <OdkazMenu key={d.id} p={d} className="pl-menu__mobil pl-menu__mobil--vnorena" onClick={() => setMobileMenuOpen(false)} />
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                <>
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

                {klubOdkazy.map((o) => (
                  <Link key={o.cesta} to={o.cesta} style={{ textDecoration: 'none', color: '#4a5568', fontWeight: '500', padding: '10px 0' }}>
                    {o.nazov}
                  </Link>
                ))}
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
                </>
                )}
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

      <WebDoplnky />
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
              <h3 style={{ marginBottom: '15px', color: '#e2e8f0' }}>{nastavenia.nazov}</h3>
              {(nastavenia.slogan || nastavenia.meta_popis) && (
                <p style={{ color: '#a0aec0', fontSize: '14px' }}>{nastavenia.slogan || nastavenia.meta_popis}</p>
              )}
              {nastavenia.rok_zalozenia && (
                <p style={{ color: '#a0aec0', fontSize: '14px' }}>Založený v roku {nastavenia.rok_zalozenia}</p>
              )}
              {siete.length > 0 && (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '12px' }}>
                  {siete.map(([nazov, url]) => (
                    <a key={nazov} href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#e2e8f0', fontSize: '14px' }}>
                      {nazov}
                    </a>
                  ))}
                </div>
              )}
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
                {klubOdkazy.map((o) => (
                  <Link key={o.cesta} to={o.cesta} style={{ color: '#a0aec0', textDecoration: 'none', fontSize: '14px' }}>
                    {o.nazov}
                  </Link>
                ))}
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
                {kontakt.email && (
                  <p>📧 <a href={`mailto:${kontakt.email}`} style={{ color: 'inherit' }}>{kontakt.email}</a></p>
                )}
                {kontakt.telefon && (
                  <p>📞 <a href={`tel:${kontakt.telefon.replace(/\s+/g, '')}`} style={{ color: 'inherit' }}>{kontakt.telefon}</a></p>
                )}
                {kontakt.adresa && <p>📍 {kontakt.adresa}</p>}
                {udaje?.pravny_nazov && <p>{udaje.pravny_nazov}</p>}
                {(udaje?.ico || udaje?.dic || udaje?.ic_dph) && (
                  <p>
                    {[udaje?.ico && `IČO: ${udaje.ico}`, udaje?.dic && `DIČ: ${udaje.dic}`, udaje?.ic_dph && `IČ DPH: ${udaje.ic_dph}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                {udaje?.iban && <p>IBAN: {udaje.iban.replace(/(.{4})/g, '$1 ').trim()}</p>}
              </div>
            </div>
          </div>

          <div style={{
            borderTop: '1px solid #4a5568',
            paddingTop: '20px',
            color: '#a0aec0',
            fontSize: '14px'
          }}>
            <p>&copy; {new Date().getFullYear()} {nastavenia.nazov}. Všetky práva vyhradené.</p>
            {(nastavenia.gdpr?.odkaz_zasad || nastavenia.gdpr?.kontakt_zodpovednej_osoby) && (
              <p>
                {nastavenia.gdpr?.odkaz_zasad && (
                  <a href={nastavenia.gdpr.odkaz_zasad} style={{ color: 'inherit' }}>Ochrana osobných údajov</a>
                )}
                {nastavenia.gdpr?.odkaz_zasad && nastavenia.gdpr?.kontakt_zodpovednej_osoby && ' · '}
                {nastavenia.gdpr?.kontakt_zodpovednej_osoby && <>Zodpovedná osoba: {nastavenia.gdpr.kontakt_zodpovednej_osoby}</>}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                try { localStorage.removeItem('clubw_cookies'); } catch { /* nič */ }
                window.location.reload();
              }}
              style={{ background: 'none', border: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer', font: 'inherit', padding: 0 }}
            >
              Nastavenia cookies
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;