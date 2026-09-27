// Umiestnenie: license-server/admin/src/stranky/Administratori.tsx
// Administrátori licenčného servera: pridanie, deaktivácia, nové heslo.

import React, { useState } from 'react';
import { api, type Administrator } from '../api';
import { ChybaStav, HlavickaStranky, Karta, Nacitava, Okno, Pole, Stitok, Tlacidlo, useNacitaj, useOznamenia, usePotvrdenie } from '../komponenty';
import { predCasom } from '../formaty';
import { usePrihlaseny } from '../App';

const Administratori: React.FC = () => {
  const { admin: ja } = usePrihlaseny();
  const { uspech, chyba } = useOznamenia();
  const { potvrd, okno } = usePotvrdenie();
  const admini = useNacitaj((s) => api.get<Administrator[]>('/administratori', s).then((r) => r.data), []);
  const [novy, setNovy] = useState(false);
  const [heslo, setHeslo] = useState<Administrator | null>(null);

  const uprav = async (a: Administrator, zmeny: Record<string, unknown>, otazka?: [string, string]) => {
    if (otazka && !(await potvrd(otazka[0], otazka[1], 'Potvrdiť', true))) return;
    try {
      const r = await api.put(`/administratori/${a.id}`, zmeny);
      uspech(r.message ?? 'Uložené');
      admini.obnov();
    } catch (e: any) {
      chyba(e.message);
    }
  };

  return (
    <div className="stranka">
      <HlavickaStranky
        nadpis="Administrátori"
        popis="Každý administrátor môže vydávať a meniť licencie. Pridávajte len ľudí, ktorým plne dôverujete."
        akcie={
          <Tlacidlo variant="primarne" ikona="plus" onClick={() => setNovy(true)}>
            Nový administrátor
          </Tlacidlo>
        }
      />
      <Karta>
        {admini.chyba ? (
          <ChybaStav text={admini.chyba} onZnova={admini.obnov} />
        ) : !admini.data ? (
          <Nacitava />
        ) : (
          <div className="tabulka-obal">
            <table className="tabulka">
              <thead>
                <tr>
                  <th>Meno</th>
                  <th>Stav</th>
                  <th>2FA</th>
                  <th>Posledné prihlásenie</th>
                  <th aria-label="Akcie" />
                </tr>
              </thead>
              <tbody>
                {admini.data.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.meno}</strong> {a.id === ja.id && <Stitok ton="modra">vy</Stitok>}
                      <small>{a.email}</small>
                    </td>
                    <td>{a.aktivny ? <Stitok ton="zelena">aktívny</Stitok> : <Stitok>deaktivovaný</Stitok>}</td>
                    <td>{a.totp_aktivne ? <Stitok ton="zelena">zapnuté</Stitok> : <Stitok ton="oranzova">vypnuté</Stitok>}</td>
                    <td>{predCasom(a.posledne_prihlasenie)}</td>
                    <td className="tabulka__akcie">
                      {a.id !== ja.id && (
                        <>
                          <Tlacidlo male variant="jemne" onClick={() => setHeslo(a)}>
                            Nové heslo
                          </Tlacidlo>
                          {a.totp_aktivne && (
                            <Tlacidlo male variant="jemne" onClick={() => uprav(a, { vypnut_2fa: true }, ['Vypnúť dvojstupňové overenie?', `Použite, ak ${a.meno} stratil telefón. Po prihlásení si ho má zapnúť znova.`])}>
                              Vypnúť 2FA
                            </Tlacidlo>
                          )}
                          {a.aktivny ? (
                            <Tlacidlo male variant="nebezpecne" onClick={() => uprav(a, { aktivny: false }, ['Deaktivovať administrátora?', `${a.meno} sa okamžite odhlási a nebude sa môcť prihlásiť.`])}>
                              Deaktivovať
                            </Tlacidlo>
                          ) : (
                            <Tlacidlo male onClick={() => uprav(a, { aktivny: true })}>
                              Aktivovať
                            </Tlacidlo>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Karta>
      {novy && <NovyAdministrator onZavriet={() => setNovy(false)} onHotovo={() => { setNovy(false); admini.obnov(); }} />}
      {heslo && <NoveHeslo admin={heslo} onZavriet={() => setHeslo(null)} onHotovo={() => { setHeslo(null); admini.obnov(); }} />}
      {okno}
    </div>
  );
};

const NovyAdministrator: React.FC<{ onZavriet: () => void; onHotovo: () => void }> = ({ onZavriet, onHotovo }) => {
  const { uspech, chyba } = useOznamenia();
  const [h, setH] = useState({ meno: '', email: '', heslo: '' });
  const [uklada, setUklada] = useState(false);
  const uloz = async (e: React.FormEvent) => {
    e.preventDefault();
    setUklada(true);
    try {
      const r = await api.post('/administratori', h);
      uspech(r.message ?? 'Vytvorené');
      onHotovo();
    } catch (e: any) {
      chyba(e.message);
    } finally {
      setUklada(false);
    }
  };
  return (
    <Okno
      nadpis="Nový administrátor"
      onZavriet={onZavriet}
      paticka={
        <>
          <Tlacidlo onClick={onZavriet}>Zrušiť</Tlacidlo>
          <Tlacidlo variant="primarne" type="submit" form="novy-admin" nacitava={uklada}>
            Vytvoriť
          </Tlacidlo>
        </>
      }
    >
      <form id="novy-admin" className="formular" onSubmit={uloz} noValidate>
        <Pole menovka="Meno" value={h.meno} onChange={(e) => setH({ ...h, meno: e.target.value })} />
        <Pole menovka="E-mail" type="email" value={h.email} onChange={(e) => setH({ ...h, email: e.target.value })} />
        <Pole menovka="Úvodné heslo" type="password" autoComplete="new-password" value={h.heslo} onChange={(e) => setH({ ...h, heslo: e.target.value })} napoveda="Aspoň 12 znakov. Administrátor si ho po prihlásení zmení v Mojom účte." />
      </form>
    </Okno>
  );
};

const NoveHeslo: React.FC<{ admin: Administrator; onZavriet: () => void; onHotovo: () => void }> = ({ admin, onZavriet, onHotovo }) => {
  const { uspech, chyba } = useOznamenia();
  const [heslo, setHeslo] = useState('');
  const [uklada, setUklada] = useState(false);
  const uloz = async (e: React.FormEvent) => {
    e.preventDefault();
    setUklada(true);
    try {
      await api.put(`/administratori/${admin.id}`, { heslo });
      uspech('Heslo bolo nastavené - administrátor bol odhlásený zo všetkých zariadení');
      onHotovo();
    } catch (e: any) {
      chyba(e.message);
    } finally {
      setUklada(false);
    }
  };
  return (
    <Okno
      nadpis={`Nové heslo: ${admin.meno}`}
      onZavriet={onZavriet}
      paticka={
        <>
          <Tlacidlo onClick={onZavriet}>Zrušiť</Tlacidlo>
          <Tlacidlo variant="primarne" type="submit" form="nove-heslo" nacitava={uklada}>
            Nastaviť
          </Tlacidlo>
        </>
      }
    >
      <form id="nove-heslo" className="formular" onSubmit={uloz} noValidate>
        <Pole menovka="Nové heslo" type="password" autoComplete="new-password" value={heslo} onChange={(e) => setHeslo(e.target.value)} napoveda="Aspoň 12 znakov." />
      </form>
    </Okno>
  );
};

export default Administratori;
