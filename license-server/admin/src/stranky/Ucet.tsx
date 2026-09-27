// Umiestnenie: license-server/admin/src/stranky/Ucet.tsx
// Môj účet: meno, zmena hesla a dvojstupňové overenie.

import React, { useState } from 'react';
import { api, type Administrator } from '../api';
import { HlavickaStranky, Karta, Kopirovat, Pole, Stitok, Tlacidlo, useOznamenia } from '../komponenty';
import { usePrihlaseny } from '../App';

const Ucet: React.FC = () => {
  const { admin, nastav } = usePrihlaseny();
  const { uspech, chyba } = useOznamenia();
  const [meno, setMeno] = useState(admin.meno);
  const [hesla, setHesla] = useState({ stare: '', nove: '', znova: '' });
  const [priprava, setPriprava] = useState<{ tajomstvo: string; odkaz: string } | null>(null);
  const [kod, setKod] = useState('');
  const [hesloVypnutia, setHesloVypnutia] = useState('');
  const [akcia, setAkcia] = useState<string | null>(null);

  const vykonaj = async (nazov: string, fn: () => Promise<void>) => {
    setAkcia(nazov);
    try {
      await fn();
    } catch (e: any) {
      chyba(e.message);
    } finally {
      setAkcia(null);
    }
  };

  const ulozMeno = (e: React.FormEvent) => {
    e.preventDefault();
    vykonaj('meno', async () => {
      const r = await api.put<Administrator>('/ja', { meno });
      nastav(r.data);
      uspech(r.message ?? 'Uložené');
    });
  };

  const zmenHeslo = (e: React.FormEvent) => {
    e.preventDefault();
    if (hesla.nove !== hesla.znova) return chyba('Nové heslá sa nezhodujú');
    vykonaj('heslo', async () => {
      const r = await api.put('/ja/heslo', { stare: hesla.stare, nove: hesla.nove });
      setHesla({ stare: '', nove: '', znova: '' });
      uspech(r.message ?? 'Heslo bolo zmenené');
    });
  };

  return (
    <div className="stranka">
      <HlavickaStranky nadpis="Môj účet" popis={admin.email} />
      <div className="mriezka-2">
        <div className="stlpec">
          <Karta nadpis="Údaje">
            <form className="formular" onSubmit={ulozMeno}>
              <Pole menovka="Meno" value={meno} onChange={(e) => setMeno(e.target.value)} />
              <div>
                <Tlacidlo type="submit" variant="primarne" nacitava={akcia === 'meno'}>
                  Uložiť
                </Tlacidlo>
              </div>
            </form>
          </Karta>
          <Karta nadpis="Zmena hesla">
            <form className="formular" onSubmit={zmenHeslo}>
              <Pole menovka="Súčasné heslo" type="password" autoComplete="current-password" value={hesla.stare} onChange={(e) => setHesla({ ...hesla, stare: e.target.value })} />
              <Pole menovka="Nové heslo" type="password" autoComplete="new-password" value={hesla.nove} onChange={(e) => setHesla({ ...hesla, nove: e.target.value })} napoveda="Aspoň 12 znakov. Ostatné zariadenia sa odhlásia." />
              <Pole menovka="Nové heslo znova" type="password" autoComplete="new-password" value={hesla.znova} onChange={(e) => setHesla({ ...hesla, znova: e.target.value })} />
              <div>
                <Tlacidlo type="submit" variant="primarne" nacitava={akcia === 'heslo'}>
                  Zmeniť heslo
                </Tlacidlo>
              </div>
            </form>
          </Karta>
        </div>

        <Karta nadpis={<>Dvojstupňové overenie {admin.totp_aktivne ? <Stitok ton="zelena">zapnuté</Stitok> : <Stitok ton="oranzova">vypnuté</Stitok>}</>}>
          {admin.totp_aktivne ? (
            <form
              className="formular"
              onSubmit={(e) => {
                e.preventDefault();
                vykonaj('vypnut', async () => {
                  const r = await api.post<Administrator>('/ja/2fa/vypni', { heslo: hesloVypnutia });
                  nastav(r.data);
                  setHesloVypnutia('');
                  uspech(r.message ?? 'Vypnuté');
                });
              }}
            >
              <p>Pri prihlásení sa okrem hesla vyžaduje kód z aplikácie v telefóne. Aj keby niekto získal vaše heslo, bez telefónu sa neprihlási.</p>
              <Pole menovka="Heslo na potvrdenie vypnutia" type="password" autoComplete="current-password" value={hesloVypnutia} onChange={(e) => setHesloVypnutia(e.target.value)} />
              <div>
                <Tlacidlo type="submit" variant="nebezpecne" nacitava={akcia === 'vypnut'}>
                  Vypnúť dvojstupňové overenie
                </Tlacidlo>
              </div>
            </form>
          ) : !priprava ? (
            <div className="formular">
              <p>Kto má prístup do tejto administrácie, vie vydávať licencie a spúšťať aktualizácie u všetkých klientov. Dvojstupňové overenie preto odporúčame zapnúť každému administrátorovi.</p>
              <p className="tlmene">Budete potrebovať aplikáciu Google Authenticator, Microsoft Authenticator, Aegis alebo podobnú.</p>
              <div>
                <Tlacidlo
                  variant="primarne"
                  nacitava={akcia === 'priprav'}
                  onClick={() =>
                    vykonaj('priprav', async () => {
                      const r = await api.post<{ tajomstvo: string; odkaz: string }>('/ja/2fa/priprav');
                      setPriprava(r.data);
                    })
                  }
                >
                  Zapnúť dvojstupňové overenie
                </Tlacidlo>
              </div>
            </div>
          ) : (
            <form
              className="formular"
              onSubmit={(e) => {
                e.preventDefault();
                vykonaj('zapnut', async () => {
                  const r = await api.post<Administrator>('/ja/2fa/zapni', { kod });
                  nastav(r.data);
                  setPriprava(null);
                  setKod('');
                  uspech(r.message ?? 'Zapnuté');
                });
              }}
            >
              <ol className="kroky">
                <li>
                  V aplikácii pridajte nový účet a zvoľte <strong>Zadať kľúč</strong> (Enter a setup key). Na telefóne môžete otvoriť aj{' '}
                  <a href={priprava.odkaz}>tento odkaz</a>.
                </li>
                <li>
                  Kľúč:
                  <div className="kluc">
                    <code className="kluc__hodnota">{priprava.tajomstvo.match(/.{1,4}/g)?.join(' ')}</code>
                    <Kopirovat text={priprava.tajomstvo} />
                  </div>
                  <small className="tlmene">Typ: podľa času (TOTP), 6 číslic.</small>
                </li>
                <li>Zadajte kód, ktorý aplikácia zobrazí:</li>
              </ol>
              <Pole menovka="Kód z aplikácie" inputMode="numeric" maxLength={6} value={kod} onChange={(e) => setKod(e.target.value.replace(/\D/g, ''))} autoComplete="one-time-code" />
              <div className="formular__tlacidla">
                <Tlacidlo onClick={() => setPriprava(null)}>Zrušiť</Tlacidlo>
                <Tlacidlo type="submit" variant="primarne" nacitava={akcia === 'zapnut'} disabled={kod.length !== 6}>
                  Overiť a zapnúť
                </Tlacidlo>
              </div>
            </form>
          )}
        </Karta>
      </div>
    </div>
  );
};

export default Ucet;
