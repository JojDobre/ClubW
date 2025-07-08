import React from 'react';

// Page wrapper component
const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className='page-wrapper'>
    <div style={{ maxWidth: '1200px', margin: '0 auto' }} className="content-fade-in">
      {children}
    </div>
  </div>
);

const PageTitle: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div style={{ marginBottom: '32px' }}>
    <h1 style={{ 
      color: 'var(--color-text-primary)', 
      fontSize: '32px', 
      fontWeight: '600', 
      marginBottom: '8px',
      fontFamily: 'Inter, sans-serif'
    }}>
      {title}
    </h1>
    {subtitle && (
      <p style={{ 
        color: 'var(--color-text-secondary)', 
        fontSize: '16px', 
        lineHeight: '24px',
        fontFamily: 'Inter, sans-serif'
      }}>
        {subtitle}
      </p>
    )}
  </div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`card-hover ${className}`} style={{ 
    background: 'var(--color-surface)', 
    padding: '24px', 
    borderRadius: '12px', 
    border: '1px solid var(--color-border)',
    marginBottom: '16px'
  }}>
    {children}
  </div>
);

// Dashboard Page
export const DashboardPage: React.FC = () => (
  <PageWrapper>
    <PageTitle 
      title="Dashboard" 
      subtitle="Vitajte v admin dashboarde! Toto je hlavná stránka s prehľadom."
    />
    
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
      gap: '24px' 
    }}>
      <Card>
        <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '8px' }}>Štatistiky</h3>
        <p style={{ color: 'var(--color-text-secondary)' }}>Prehľad hlavných metrík</p>
        <div style={{ marginTop: '16px', fontSize: '24px', fontWeight: '600', color: 'var(--color-primary)' }}>
          42,523
        </div>
      </Card>
      
      <Card>
        <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '16px' }}>Instagram</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Sledovatelia</span>
            <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>8,920</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Príspevky tento mesiac</span>
            <span style={{ fontWeight: '600' }}>31</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Stories views</span>
            <span style={{ fontWeight: '600', color: 'var(--color-success)' }}>2,450</span>
          </div>
        </div>
      </Card>
      
      <Card>
        <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '16px' }}>LinkedIn</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Connections</span>
            <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>1,876</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Príspevky tento mesiac</span>
            <span style={{ fontWeight: '600' }}>12</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Profile views</span>
            <span style={{ fontWeight: '600', color: 'var(--color-success)' }}>567</span>
          </div>
        </div>
      </Card>
    </div>
    
    <Card>
      <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '16px' }}>Posledné príspevky</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[
          { platform: 'Facebook', content: 'Nový článok o web developmente je už dostupný!', likes: 45, shares: 12 },
          { platform: 'Instagram', content: 'Behind the scenes z nášho office', likes: 78, shares: 5 },
          { platform: 'LinkedIn', content: 'Hľadáme nových talentovaných vývojárov', likes: 23, shares: 8 }
        ].map((post, index) => (
          <div key={index} style={{ 
            padding: '16px', 
            background: 'var(--color-background)', 
            borderRadius: '8px',
            border: '1px solid var(--color-border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
              <div style={{ 
                padding: '4px 8px', 
                background: 'var(--color-primary)', 
                color: 'white', 
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                {post.platform}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                {post.likes} likes • {post.shares} shares
              </div>
            </div>
            <p style={{ color: 'var(--color-text-primary)' }}>{post.content}</p>
          </div>
        ))}
      </div>
    </Card>
  </PageWrapper>
);


// eCommerce Page
export const EcommercePage: React.FC = () => (
  <PageWrapper>
    <PageTitle 
      title="eCommerce" 
      subtitle="Správa e-shopu a objednávok."
    />
    
    <Card>
      <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '16px' }}>Objednávky</h3>
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ padding: '16px', background: 'var(--color-primary)', color: 'white', borderRadius: '8px', flex: 1 }}>
          <div style={{ fontSize: '24px', fontWeight: '600' }}>127</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Nové objednávky</div>
        </div>
        <div style={{ padding: '16px', background: 'var(--color-success)', color: 'white', borderRadius: '8px', flex: 1 }}>
          <div style={{ fontSize: '24px', fontWeight: '600' }}>89</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Spracované</div>
        </div>
        <div style={{ padding: '16px', background: 'var(--color-warning)', color: 'white', borderRadius: '8px', flex: 1 }}>
          <div style={{ fontSize: '24px', fontWeight: '600' }}>23</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Čakajúce</div>
        </div>
      </div>
    </Card>
  </PageWrapper>
);

// Projects Page
export const ProjectsPage: React.FC = () => (
  <PageWrapper>
    <PageTitle 
      title="Projekty" 
      subtitle="Správa a prehľad všetkých projektov."
    />
    
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
      gap: '20px' 
    }}>
      {[
        { name: 'Website Redesign', progress: 75, status: 'V procese' },
        { name: 'Mobile App', progress: 45, status: 'Vývoj' },
        { name: 'Dashboard UI', progress: 90, status: 'Testovanie' },
        { name: 'API Development', progress: 60, status: 'V procese' },
        { name: 'E-commerce Platform', progress: 30, status: 'Začiatok' },
        { name: 'Analytics Dashboard', progress: 85, status: 'Finalizácia' }
      ].map((project, index) => (
        <Card key={index}>
          <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '8px', fontSize: '18px' }}>
            {project.name}
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
          </p>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{project.status}</span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{project.progress}%</span>
          </div>
          <div style={{ 
            width: '100%', 
            height: '6px', 
            background: 'var(--color-border)', 
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              width: `${project.progress}%`, 
              height: '100%', 
              background: 'var(--color-primary)',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </Card>
      ))}
    </div>
  </PageWrapper>
);

// Online Courses Page
export const OnlineCoursesPage: React.FC = () => (
  <PageWrapper>
    <PageTitle 
      title="Online Kurzy" 
      subtitle="Správa vzdelávacieho obsahu a kurzov."
    />
    
    <div>
      {[
        { name: 'React Základy', lessons: 12, hours: 8, students: 245 },
        { name: 'Advanced TypeScript', lessons: 18, hours: 12, students: 156 },
        { name: 'UI/UX Design', lessons: 15, hours: 10, students: 389 },
        { name: 'Node.js Backend', lessons: 20, hours: 15, students: 198 },
        { name: 'Database Design', lessons: 14, hours: 9, students: 267 },
        { name: 'DevOps Fundamentals', lessons: 16, hours: 11, students: 145 }
      ].map((course, index) => (
        <Card key={index}>
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '4px' }}>{course.name}</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                {course.lessons} lekcií • {course.hours} hodín • {course.students} študentov
              </p>
            </div>
            <div style={{ 
              padding: '8px 16px', 
              background: 'var(--color-primary)', 
              color: 'white', 
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}>
              Spravovať
            </div>
          </div>
        </Card>
      ))}
    </div>
  </PageWrapper>
);

// User Profile Page
export const UserProfilePage: React.FC = () => (
  <PageWrapper>
    <PageTitle title="Používateľský Profil" />
    
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ 
          width: '80px', 
          height: '80px', 
          borderRadius: '50%', 
          background: 'var(--color-primary)',
          marginRight: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '32px',
          fontWeight: '600'
        }}>
          BW
        </div>
        <div>
          <h2 style={{ color: 'var(--color-text-primary)', marginBottom: '4px' }}>ByeWind</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>admin@byewind.com</p>
        </div>
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '16px' 
      }}>
        <div>
          <label style={{ color: 'var(--color-text-primary)', display: 'block', marginBottom: '8px' }}>Meno</label>
          <input 
            type="text" 
            value="ByeWind" 
            style={{ 
              width: '100%', 
              padding: '12px', 
              border: '1px solid var(--color-border)', 
              borderRadius: '8px',
              background: 'var(--color-background)',
              color: 'var(--color-text-primary)'
            }}
          />
        </div>
        <div>
          <label style={{ color: 'var(--color-text-primary)', display: 'block', marginBottom: '8px' }}>Email</label>
          <input 
            type="email" 
            value="admin@byewind.com" 
            style={{ 
              width: '100%', 
              padding: '12px', 
              border: '1px solid var(--color-border)', 
              borderRadius: '8px',
              background: 'var(--color-background)',
              color: 'var(--color-text-primary)'
            }}
          />
        </div>
      </div>
    </Card>
  </PageWrapper>
);

// User Profile Subpages
export const UserProfileOverviewPage: React.FC = () => (
  <PageWrapper>
    <PageTitle 
      title="User Profile - Overview" 
      subtitle="Prehľad aktivít a základných informácií používateľa."
    />
    
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      <Card>
        <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '16px' }}>Aktivity</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {['Prihlásenie do systému', 'Upravený profil', 'Vytvorený nový projekt', 'Odoslané správy'].map((activity, index) => (
            <div key={index} style={{ 
              padding: '12px', 
              background: 'var(--color-background)', 
              borderRadius: '8px',
              fontSize: '14px',
              color: 'var(--color-text-secondary)'
            }}>
              {activity}
            </div>
          ))}
        </div>
      </Card>
      
      <Card>
        <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '16px' }}>Štatistiky</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Projektov dokončených</span>
              <span style={{ fontWeight: '600' }}>12</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Hodín odpracovaných</span>
              <span style={{ fontWeight: '600' }}>245</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Úloh splnených</span>
              <span style={{ fontWeight: '600' }}>89</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </PageWrapper>
);

export const UserProfileProjectsPage: React.FC = () => (
  <PageWrapper>
    <PageTitle 
      title="User Profile - Projects" 
      subtitle="Projekty priradené používateľovi."
    />
    
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
      {['Website Redesign', 'Mobile App Development', 'API Integration'].map((project, index) => (
        <Card key={index}>
          <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '8px' }}>{project}</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
            Projekt priradený používateľovi s vysokou prioritou.
          </p>
          <div style={{ 
            padding: '8px 12px', 
            background: 'var(--color-success)', 
            color: 'white', 
            borderRadius: '6px',
            fontSize: '12px',
            display: 'inline-block'
          }}>
            Aktívny
          </div>
        </Card>
      ))}
    </div>
  </PageWrapper>
);

export const UserProfileCampaignsPage: React.FC = () => (
  <PageWrapper>
    <PageTitle 
      title="User Profile - Campaigns" 
      subtitle="Marketingové kampane a ich výsledky."
    />
    
    <div>
      {['Summer Sale 2024', 'Black Friday Campaign', 'New Product Launch'].map((campaign, index) => (
        <Card key={index}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '8px' }}>{campaign}</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                CTR: {(Math.random() * 5 + 2).toFixed(2)}% • Conversion: {(Math.random() * 15 + 5).toFixed(1)}%
              </p>
            </div>
            <div style={{ 
              padding: '4px 8px', 
              background: index === 0 ? 'var(--color-success)' : 'var(--color-warning)', 
              color: 'white', 
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              {index === 0 ? 'Aktívna' : 'Naplánovaná'}
            </div>
          </div>
        </Card>
      ))}
    </div>
  </PageWrapper>
);

export const UserProfileDocumentsPage: React.FC = () => (
  <PageWrapper>
    <PageTitle 
      title="User Profile - Documents" 
      subtitle="Dokumenty a súbory používateľa."
    />
    
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
      {[
        { name: 'Kontrakt_2024.pdf', size: '2.4 MB', type: 'PDF' },
        { name: 'Presentation.pptx', size: '15.2 MB', type: 'PowerPoint' },
        { name: 'Budget_Q4.xlsx', size: '856 KB', type: 'Excel' },
        { name: 'Meeting_Notes.docx', size: '1.2 MB', type: 'Word' },
        { name: 'Design_Assets.zip', size: '45.6 MB', type: 'Archive' },
        { name: 'Report_Final.pdf', size: '3.8 MB', type: 'PDF' }
      ].map((doc, index) => (
        <Card key={index}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              background: 'var(--color-primary)', 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {doc.type}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: 'var(--color-text-primary)', fontSize: '14px', fontWeight: '500' }}>
                {doc.name}
              </div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                {doc.size}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  </PageWrapper>
);

export const UserProfileFollowersPage: React.FC = () => (
  <PageWrapper>
    <PageTitle 
      title="User Profile - Followers" 
      subtitle="Sledovatelia a kontakty používateľa."
    />
    
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
      {[
        { name: 'Anna Nováková', email: 'anna@example.com', role: 'Designer' },
        { name: 'Peter Svoboda', email: 'peter@example.com', role: 'Developer' },
        { name: 'Mária Krásna', email: 'maria@example.com', role: 'Project Manager' },
        { name: 'Tomáš Veselý', email: 'tomas@example.com', role: 'Marketing' },
        { name: 'Eva Múdra', email: 'eva@example.com', role: 'Analyst' },
        { name: 'Lukáš Šikovný', email: 'lukas@example.com', role: 'QA Engineer' }
      ].map((follower, index) => (
        <Card key={index}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: '50px', 
              height: '50px', 
              borderRadius: '50%', 
              background: `hsl(${index * 60}, 70%, 60%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '600'
            }}>
              {follower.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div style={{ color: 'var(--color-text-primary)', fontWeight: '500', marginBottom: '4px' }}>
                {follower.name}
              </div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '2px' }}>
                {follower.email}
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                {follower.role}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  </PageWrapper>
);

// Other main pages
export const AccountPage: React.FC = () => (
  <PageWrapper>
    <PageTitle 
      title="Account" 
      subtitle="Správa účtu a nastavení."
    />
    
    <Card>
      <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '16px' }}>Nastavenia účtu</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ color: 'var(--color-text-primary)', display: 'block', marginBottom: '8px' }}>
            Zmena hesla
          </label>
          <input 
            type="password" 
            placeholder="Nové heslo"
            style={{ 
              width: '100%', 
              padding: '12px', 
              border: '1px solid var(--color-border)', 
              borderRadius: '8px',
              background: 'var(--color-background)',
              color: 'var(--color-text-primary)'
            }}
          />
        </div>
        <div>
          <label style={{ color: 'var(--color-text-primary)', display: 'block', marginBottom: '8px' }}>
            Potvrdiť heslo
          </label>
          <input 
            type="password" 
            placeholder="Potvrdiť heslo"
            style={{ 
              width: '100%', 
              padding: '12px', 
              border: '1px solid var(--color-border)', 
              borderRadius: '8px',
              background: 'var(--color-background)',
              color: 'var(--color-text-primary)'
            }}
          />
        </div>
      </div>
    </Card>
  </PageWrapper>
);

export const CorporatePage: React.FC = () => (
  <PageWrapper>
    <PageTitle 
      title="Corporate" 
      subtitle="Firemné informácie a nastavenia."
    />
    
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      <Card>
        <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '16px' }}>Informácie o firme</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Názov firmy</label>
            <div style={{ color: 'var(--color-text-primary)', fontWeight: '500' }}>ByeWind Technologies</div>
          </div>
          <div>
            <label style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>IČO</label>
            <div style={{ color: 'var(--color-text-primary)', fontWeight: '500' }}>12345678</div>
          </div>
          <div>
            <label style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Adresa</label>
            <div style={{ color: 'var(--color-text-primary)', fontWeight: '500' }}>Bratislava, Slovensko</div>
          </div>
        </div>
      </Card>
      
      <Card>
        <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '16px' }}>Štatistiky firmy</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Počet zamestnancov</span>
            <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>47</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Aktívnych projektov</span>
            <span style={{ fontWeight: '600', color: 'var(--color-success)' }}>12</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Mesačný obrat</span>
            <span style={{ fontWeight: '600', color: 'var(--color-warning)' }}>€85,000</span>
          </div>
        </div>
      </Card>
    </div>
  </PageWrapper>
);

export const BlogPage: React.FC = () => (
  <PageWrapper>
    <PageTitle 
      title="Blog" 
      subtitle="Správa blog článkov a obsahu."
    />
    
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {[
        {
          title: 'Ako začať s React developmentom',
          excerpt: 'Kompletný sprievodca pre začiatočníkov v React frameworku.',
          date: '15. December 2024',
          views: 1250,
          status: 'Publikované'
        },
        {
          title: 'TypeScript best practices',
          excerpt: 'Najlepšie postupy pre efektívny vývoj v TypeScript.',
          date: '12. December 2024',
          views: 890,
          status: 'Publikované'
        },
        {
          title: 'UI/UX trendy roku 2024',
          excerpt: 'Prehľad najnovších trendov v dizajne používateľských rozhraní.',
          date: '8. December 2024',
          views: 2100,
          status: 'Koncept'
        }
      ].map((article, index) => (
        <Card key={index}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '8px', fontSize: '20px' }}>
                {article.title}
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '12px', lineHeight: '1.5' }}>
                {article.excerpt}
              </p>
              <div style={{ 
                display: 'flex', 
                gap: '16px', 
                fontSize: '14px', 
                color: 'var(--color-text-muted)' 
              }}>
                <span>{article.date}</span>
                <span>{article.views} zobrazení</span>
              </div>
            </div>
            <div style={{ 
              padding: '6px 12px', 
              background: article.status === 'Publikované' ? 'var(--color-success)' : 'var(--color-warning)', 
              color: 'white', 
              borderRadius: '6px',
              fontSize: '12px',
              marginLeft: '16px'
            }}>
              {article.status}
            </div>
          </div>
        </Card>
      ))}
    </div>
  </PageWrapper>
);





export const SocialPage: React.FC = () => (
  <PageWrapper>
    <PageTitle 
      title="Social" 
      subtitle="Správa sociálnych sietí a komunikácie."
    />
    
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
      <Card>
        <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '16px' }}>Facebook</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Sledovatelia</span>
            <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>12,450</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Príspevky tento mesiac</span>
            <span style={{ fontWeight: '600' }}>23</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Engagement rate</span>
            <span style={{ fontWeight: '600', color: 'var(--color-success)' }}>4.2%</span>
          </div>
        </div>
      </Card>
    </div>
  </PageWrapper>
);