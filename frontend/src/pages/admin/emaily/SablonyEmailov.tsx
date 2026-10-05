// Umiestnenie: frontend/src/pages/admin/emaily/SablonyEmailov.tsx
// E-maily → Šablóny: zoznam automatických e-mailov (podľa skupín)
// a editor jedného e-mailu - predmet, text so značkami, náhľad, skúška,
// vypnutie a návrat k predvolenému textu.

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader, Badge, Button, Card, Skeleton, ErrorState, Switch, Input, ConfirmDialog, Icon, useToast } from '../../../ui';
import { useNacitanie } from '../../../app/useNacitanie';
import { useAuth } from '../../../app/AuthContext';
import { emailyApi, type SablonaEmailu } from '../../../api/emaily';
import { formatujDatum } from '../../../utils/datum';
import { tr } from '../../../i18n';
import { EditorEmailu, KOMU, NahladEmailu, PasStavu, POPIS_SABLON, SKUPINY_SABLON, useNahlad } from './spolocne';
import './Emaily.css';

export const SablonyEmailov: React.FC = () => {
  const sablony = useNacitanie((signal) => emailyApi.sablony(signal));
  const stav = useNacitanie((signal) => emailyApi.stav(signal));

  const skupiny = useMemo(() => {
    const mapa = new Map<string, SablonaEmailu[]>();
    for (const s of sablony.data ?? []) mapa.set(s.skupina, [...(mapa.get(s.skupina) ?? []), s]);
    return [...mapa.entries()];
  }, [sablony.data]);

  return (
    <div className="cw-screen">
      <PageHeader
        nadpis={tr('Šablóny e-mailov')}
        podnadpis={tr('Texty e-mailov, ktoré web posiela sám. Každý môžete prepísať po svojom - logo, farby a pätičku pridá systém.')}
      />
      <PasStavu stav={stav.data} />
      {sablony.chyba ? (
        <ErrorState sprava={tr('Šablóny sa nepodarilo načítať')} detail={sablony.chyba} onSkusZnova={sablony.obnov} />
      ) : sablony.nacitava ? (
        <Skeleton vyska="420px" />
      ) : (
        skupiny.map(([skupina, zoznam]) => (
          <Card key={skupina} nadpis={SKUPINY_SABLON[skupina] ?? skupina} bezOdsadenia className="cw-em-skupina">
            <ul className="cw-em-sablony">
              {zoznam.map((s) => (
                <li key={s.kluc}>
                  <Link to={`/admin/emaily/sablony/${s.kluc}`} className="cw-em-sablona">
                    <span className="cw-em-sablona__nazov">{POPIS_SABLON[s.kluc]?.nazov ?? s.kluc}</span>
                    <span className="cw-em-sablona__popis">
                      {POPIS_SABLON[s.kluc]?.popis} {tr('Posiela sa {komu}.', { komu: KOMU[s.komu] ?? s.komu })}
                    </span>
                    <span className="cw-em-sablona__predmet">
                      {tr('Predmet')}: {s.predmet}
                    </span>
                    <span className="cw-em-sablona__stav">
                      {!s.aktivna && <Badge ton="neutral">{tr('Vypnutý')}</Badge>}
                      {s.upravena ? <Badge ton="primary">{tr('Upravený')}</Badge> : <Badge ton="neutral">{tr('Predvolený')}</Badge>}
                      <Icon nazov="upravit" velkost={16} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}
    </div>
  );
};

export const SablonaEmailuEditor: React.FC = () => {
  const { kluc = '' } = useParams();
  const navigate = useNavigate();
  const { uspech, chyba: hlasChybu } = useToast();
  const { pouzivatel } = useAuth();
  const detail = useNacitanie((signal) => emailyApi.sablona(kluc, signal), [kluc]);
  const [predmet, setPredmet] = useState('');
  const [obsah, setObsah] = useState('');
  const [aktivna, setAktivna] = useState(true);
  const [uklada, setUklada] = useState(false);
  const [obnovit, setObnovit] = useState(false);
  const [prijemca, setPrijemca] = useState(pouzivatel?.email ?? '');
  const [testuje, setTestuje] = useState(false);

  useEffect(() => {
    if (!detail.data) return;
    setPredmet(detail.data.predmet);
    setObsah(detail.data.obsah);
    setAktivna(detail.data.aktivna);
  }, [detail.data]);

  const nahlad = useNahlad((signal) => emailyApi.nahladSablony(kluc, { predmet, obsah }, signal), [kluc, predmet, obsah]);
  const d = detail.data;
  const zmenene = Boolean(d && (predmet !== d.predmet || obsah !== d.obsah || aktivna !== d.aktivna));

  const uloz = async () => {
    setUklada(true);
    try {
      await emailyApi.ulozSablonu(kluc, { predmet, obsah, aktivna });
      uspech(tr('Šablóna e-mailu bola uložená'));
      detail.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Šablónu sa nepodarilo uložiť'));
    } finally {
      setUklada(false);
    }
  };

  const obnov = async () => {
    try {
      await emailyApi.obnovSablonu(kluc);
      uspech(tr('Obnovený predvolený text e-mailu'));
      setObnovit(false);
      detail.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Šablónu sa nepodarilo obnoviť'));
    }
  };

  const otestuj = async () => {
    setTestuje(true);
    try {
      await emailyApi.testSablony(kluc, prijemca.trim(), { predmet, obsah });
      uspech(tr('Skúšobný e-mail bol odoslaný na {email}', { email: prijemca.trim() }));
    } catch (e: any) {
      hlasChybu(e?.message || tr('E-mail sa nepodarilo odoslať'));
    } finally {
      setTestuje(false);
    }
  };

  if (detail.chyba) {
    return (
      <div className="cw-screen">
        <ErrorState sprava={tr('Šablónu sa nepodarilo načítať')} detail={detail.chyba} onSkusZnova={detail.obnov} />
      </div>
    );
  }
  if (!d) {
    return (
      <div className="cw-screen">
        <Skeleton vyska="520px" />
      </div>
    );
  }

  return (
    <div className="cw-screen">
      <Link to="/admin/emaily/sablony" className="cw-em-spat">
        <Icon nazov="sipkaVlavo" velkost={14} /> {tr('Šablóny e-mailov')}
      </Link>
      <PageHeader
        nadpis={POPIS_SABLON[kluc]?.nazov ?? kluc}
        podnadpis={`${POPIS_SABLON[kluc]?.popis ?? ''} ${tr('Posiela sa {komu}.', { komu: KOMU[d.komu] ?? d.komu })}`}
        akcie={
          <div className="cw-em-akcie">
            {d.upravena && (
              <Button variant="ghost" onClick={() => setObnovit(true)}>
                {tr('Obnoviť predvolený text')}
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate('/admin/emaily/sablony')}>
              {tr('Späť')}
            </Button>
            <Button onClick={uloz} nacitava={uklada} disabled={!zmenene}>
              {tr('Uložiť')}
            </Button>
          </div>
        }
      />

      <div className="cw-em-editor-stranka">
        <Card>
          {d.vypnutelna ? (
            <Switch
              zapnute={aktivna}
              onZmena={setAktivna}
              menovka={tr('Posielať tento e-mail')}
              popis={tr('Vypnutý e-mail sa nebude posielať vôbec.')}
            />
          ) : (
            <p className="cw-em-male">{tr('Tento e-mail sa vypnúť nedá - bez neho by sa ľudia nedostali k svojmu účtu alebo objednávke.')}</p>
          )}
          <EditorEmailu
            predmet={predmet}
            obsah={obsah}
            onPredmet={setPredmet}
            onObsah={setObsah}
            znacky={d.znacky}
            spolocneZnacky={d.spolocne_znacky}
          />
          {d.upravena && d.aktualizovany && <p className="cw-em-male">{tr('Naposledy upravené {datum}', { datum: formatujDatum(d.aktualizovany) })}</p>}
          <div className="cw-em-heslo">
            <Input menovka={tr('Skúšobný e-mail na')} type="email" value={prijemca} onChange={(e) => setPrijemca(e.target.value)} />
            <Button variant="secondary" ikona={<Icon nazov="odoslat" velkost={16} />} onClick={otestuj} nacitava={testuje} disabled={!prijemca.includes('@')}>
              {tr('Poslať skúšku')}
            </Button>
          </div>
          <p className="cw-em-male">{tr('Náhľad aj skúšobný e-mail používajú vymyslené údaje.')}</p>
        </Card>
        <NahladEmailu email={nahlad.email} nacitava={nahlad.nacitava} />
      </div>

      <ConfirmDialog
        otvorene={obnovit}
        nadpis={tr('Obnoviť predvolený text?')}
        sprava={tr('Vaše úpravy predmetu aj textu sa zahodia a e-mail sa bude posielať s pôvodným textom.')}
        potvrdit={tr('Obnoviť')}
        onPotvrd={obnov}
        onZrus={() => setObnovit(false)}
      />
    </div>
  );
};

export default SablonyEmailov;
