// Umiestnenie: frontend/src/pages/admin/Profil.tsx
// Môj profil - vlastné meno, zmena hesla a odhlásenie zo všetkých
// zariadení. Dostupné každému prihlásenému.
//
// Predtým „Môj profil" viedol na správu používateľov, kam má prístup len
// správca - ostatní si nemali kde zmeniť heslo.

import React, { useState } from 'react';
import { PageHeader, Card, Button, Input, Badge, Select, useToast } from '../../ui';
import { useAuth } from '../../app/AuthContext';
import api from '../../app/apiKlient';
import { NAZVY_MODULOV } from './RolyOpravnenia';
import { formatujDatumCas } from '../../utils/datum';
import { tr, JAZYKY } from '../../i18n';
import './Profil.css';

export const Profil: React.FC = () => {
  const { pouzivatel, aktualizuj, odhlas } = useAuth();
  const { uspech, chyba: hlasChybu, varovanie } = useToast();

  const [meno, setMeno] = useState(pouzivatel?.meno ?? '');
  const [priezvisko, setPriezvisko] = useState(pouzivatel?.priezvisko ?? '');
  const [ukladaProfil, setUkladaProfil] = useState(false);

  const [stare, setStare] = useState('');
  const [nove, setNove] = useState('');
  const [znova, setZnova] = useState('');
  const [meniHeslo, setMeniHeslo] = useState(false);
  const [odhlasuje, setOdhlasuje] = useState(false);
  const [meniJazyk, setMeniJazyk] = useState(false);

  if (!pouzivatel) return null;

  const ulozProfil = async () => {
    if (meno.trim().length < 2) return varovanie(tr('Meno musí mať aspoň 2 znaky'));
    setUkladaProfil(true);
    try {
      const novy = await api.uprav<any>('/auth/profil', { meno: meno.trim(), priezvisko: priezvisko.trim() || null });
      aktualizuj({ pouzivatel: novy });
      uspech(tr('Profil bol uložený'));
    } catch (e: any) {
      hlasChybu(e?.message || tr('Profil sa nepodarilo uložiť'));
    } finally {
      setUkladaProfil(false);
    }
  };

  const zmenHeslo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stare) return varovanie(tr('Zadajte súčasné heslo'));
    if (nove.length < 10) return varovanie(tr('Nové heslo musí mať aspoň 10 znakov'));
    if (nove !== znova) return varovanie(tr('Nové heslá sa nezhodujú'));
    setMeniHeslo(true);
    try {
      const tokeny = await api.vytvor<{ token: string; refreshToken: string }>('/auth/zmena-hesla', {
        stareHeslo: stare,
        noveHeslo: nove,
      });
      // Server vydal nové tokeny - ostatné zariadenia odhlásil
      aktualizuj({ token: tokeny.token, refreshToken: tokeny.refreshToken });
      setStare('');
      setNove('');
      setZnova('');
      uspech(tr('Heslo bolo zmenené. Ostatné zariadenia boli odhlásené.'));
    } catch (e: any) {
      const detail = Array.isArray(e?.chybyPoli) && e.chybyPoli.length ? ` ${e.chybyPoli.join(' ')}` : '';
      hlasChybu((e?.message || tr('Heslo sa nepodarilo zmeniť')) + detail);
    } finally {
      setMeniHeslo(false);
    }
  };

  /** Uloží jazyk do profilu - administrácia sa potom načíta v novom jazyku. */
  const zmenJazykProfilu = async (jazyk: string) => {
    setMeniJazyk(true);
    try {
      const novy = await api.uprav<any>('/auth/profil', { jazyk: jazyk || null });
      aktualizuj({ pouzivatel: novy });
    } catch (e: any) {
      hlasChybu(e?.message || tr('Jazyk sa nepodarilo zmeniť'));
    } finally {
      setMeniJazyk(false);
    }
  };

  const odhlasVsade = async () => {
    if (!window.confirm(tr('Odhlásiť vás na všetkých zariadeniach vrátane tohto?'))) return;
    setOdhlasuje(true);
    try {
      await api.vytvor('/auth/odhlas-vsade', {});
    } catch {
      /* odhlásime aj tak */
    }
    await odhlas();
  };

  const opravnenia = pouzivatel.opravnenia ?? {};
  const moduly = Object.keys(NAZVY_MODULOV).filter((m) => pouzivatel.rola === 'admin' || opravnenia[m]?.citat);

  return (
    <div className="cw-screen cw-profil">
      <PageHeader nadpis={tr('Môj profil')} podnadpis={tr('Vaše meno, heslo a prístupy.')} />

      <div className="cw-profil__grid">
        <Card nadpis={tr('Osobné údaje')}>
          <div className="cw-profil__riadok">
            <Input menovka={tr('Meno')} value={meno} onChange={(e) => setMeno(e.target.value)} povinne />
            <Input menovka={tr('Priezvisko')} value={priezvisko} onChange={(e) => setPriezvisko(e.target.value)} />
          </div>
          <Input menovka="E-mail" value={pouzivatel.email} disabled napoveda={tr('E-mail na prihlásenie mení správca')} />
          <Button onClick={ulozProfil} nacitava={ukladaProfil}>
            {tr('Uložiť')}
          </Button>
        </Card>

        <Card nadpis={tr('Jazyk administrácie')}>
          <Select
            menovka={tr('Jazyk')}
            value={pouzivatel.jazyk ?? ''}
            disabled={meniJazyk}
            onChange={(e) => zmenJazykProfilu(e.target.value)}
            moznosti={[
              { hodnota: '', popis: tr('Podľa nastavenia klubu') },
              ...JAZYKY.map((j) => ({ hodnota: j.kod, popis: j.nazov })),
            ]}
            napoveda={tr('Administrácia sa po zmene znovu načíta v zvolenom jazyku.')}
          />
        </Card>

        <Card nadpis={tr('Zmena hesla')}>
          <form onSubmit={zmenHeslo} noValidate>
            <Input menovka={tr('Súčasné heslo')} type="password" value={stare} onChange={(e) => setStare(e.target.value)} autoComplete="current-password" />
            <Input
              menovka={tr('Nové heslo')}
              type="password"
              value={nove}
              onChange={(e) => setNove(e.target.value)}
              autoComplete="new-password"
              napoveda={tr('Aspoň 10 znakov. Dlhá zapamätateľná fráza je bezpečnejšia než krátka zmes znakov.')}
            />
            <Input menovka={tr('Nové heslo znova')} type="password" value={znova} onChange={(e) => setZnova(e.target.value)} autoComplete="new-password" />
            <Button type="submit" nacitava={meniHeslo}>
              {tr('Zmeniť heslo')}
            </Button>
          </form>
        </Card>

        <Card nadpis={tr('Rola a prístupy')}>
          <p className="cw-profil__rola">
            <Badge ton={pouzivatel.rola === 'admin' ? 'danger' : 'primary'}>
              {pouzivatel.rola_nazov ? tr(pouzivatel.rola_nazov) : pouzivatel.rola === 'admin' ? tr('Správca') : pouzivatel.rola}
            </Badge>
            {pouzivatel.posledne_prihlasenie && (
              <span>{tr('Naposledy prihlásený')} {formatujDatumCas(pouzivatel.posledne_prihlasenie)}</span>
            )}
          </p>
          {moduly.length === 0 ? (
            <p className="cw-profil__nic">{tr('Vaša rola nemá prístup do žiadnej sekcie administrácie.')}</p>
          ) : (
            <ul className="cw-profil__moduly">
              {moduly.map((m) => {
                const p = pouzivatel.rola === 'admin' ? { citat: true, pisat: true, mazat: true } : opravnenia[m];
                return (
                  <li key={m}>
                    <span>{NAZVY_MODULOV[m]}</span>
                    <small>{p?.mazat ? tr('upravuje a maže') : p?.pisat ? tr('upravuje') : tr('len vidí')}</small>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card nadpis={tr('Zariadenia')}>
          <p className="cw-profil__nic">
            {tr('Ak ste sa prihlásili na cudzom počítači alebo stratili telefón, odhláste sa zo všetkých zariadení naraz.')}
          </p>
          <Button variant="secondary" onClick={odhlasVsade} nacitava={odhlasuje}>
            {tr('Odhlásiť sa všade')}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Profil;
