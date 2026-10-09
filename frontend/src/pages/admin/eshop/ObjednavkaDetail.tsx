// Umiestnenie: frontend/src/pages/admin/eshop/ObjednavkaDetail.tsx
// Detail objednávky: položky a súčty, zákazník, doručenie a platba,
// zmena stavu objednávky a platby, interná poznámka. Zrušenie vráti
// tovar na sklad. Pri zmene stavu sa dá zákazníkovi poslať e-mail.

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader, Badge, Button, Card, Icon, Select, Switch, Textarea, Skeleton, ErrorState, ConfirmDialog, useToast } from '../../../ui';
import { useNacitanie } from '../../../app/useNacitanie';
import { cenaText, eshopObjednavkyApi, type StavObjednavky, type StavPlatby } from '../../../api/eshop';
import { formatujDatumCas } from '../../../utils/datum';
import { tr } from '../../../i18n';
import { STAVY_OBJEDNAVKY, STAVY_PLATBY, stavObjednavky, stavPlatby, stavPlatbyObjednavky, typPlatby } from './spolocne';
import './Eshop.css';

export const ObjednavkaDetail: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { uspech, chyba: hlasChybu } = useToast();
  const objednavka = useNacitanie((signal) => eshopObjednavkyApi.detail(Number(id), signal), [id]);
  const o = objednavka.data;

  const [stav, setStav] = useState<StavObjednavky>('nova');
  const [platba, setPlatba] = useState<StavPlatby>('neuhradena');
  const [poznamka, setPoznamka] = useState('');
  const [upozornit, setUpozornit] = useState(true);
  const [uklada, setUklada] = useState(false);
  const [potvrditZrusenie, setPotvrditZrusenie] = useState(false);

  useEffect(() => {
    if (!o) return;
    setStav(o.stav);
    setPlatba(o.stav_platby);
    setPoznamka(o.poznamka_interna ?? '');
  }, [o]);

  const zmenene = o && (stav !== o.stav || platba !== o.stav_platby || poznamka !== (o.poznamka_interna ?? ''));

  const uloz = async () => {
    if (!o) return;
    if (stav === 'zrusena' && o.stav !== 'zrusena' && !potvrditZrusenie) {
      setPotvrditZrusenie(true);
      return;
    }
    setPotvrditZrusenie(false);
    setUklada(true);
    try {
      const nova = await eshopObjednavkyApi.uprav(o.id, {
        stav: stav !== o.stav ? stav : undefined,
        stav_platby: platba !== o.stav_platby ? platba : undefined,
        poznamka_interna: poznamka,
        upozornit_zakaznika: stav !== o.stav ? upozornit : false,
      });
      objednavka.nastavData(nova);
      uspech(stav !== o.stav && upozornit ? tr('Uložené, zákazník dostane e-mail o zmene stavu') : tr('Objednávka bola uložená'));
    } catch (e: any) {
      hlasChybu(e?.message || tr('Objednávku sa nepodarilo uložiť'));
    } finally {
      setUklada(false);
    }
  };

  if (objednavka.chyba) {
    return (
      <div className="cw-screen">
        <ErrorState sprava={tr('Objednávku sa nepodarilo načítať')} detail={objednavka.chyba} onSkusZnova={objednavka.obnov} />
      </div>
    );
  }
  if (!o) {
    return (
      <div className="cw-screen">
        <Skeleton vyska="320px" />
      </div>
    );
  }

  const zrusena = o.stav === 'zrusena';

  return (
    <div className="cw-screen cw-es">
      <div className="cw-es__spat-riadok">
        <button type="button" className="cw-es__spat" onClick={() => navigate('/admin/eshop/objednavky')}>
          <Icon nazov="presunut" velkost={14} /> {tr('Objednávky')}
        </button>
      </div>
      <PageHeader
        nadpis={tr('Objednávka {cislo}', { cislo: o.cislo })}
        podnadpis={tr('Prijatá {datum}', { datum: formatujDatumCas(o.vytvorena) })}
        akcie={
          <div className="cw-es__stavy">
            <Badge ton={stavObjednavky(o.stav).ton}>{stavObjednavky(o.stav).popis}</Badge>
            <Badge ton={stavPlatbyObjednavky(o).ton}>{stavPlatbyObjednavky(o).popis}</Badge>
          </div>
        }
      />

      <div className="cw-es__detail">
        <div className="cw-es__hlavne">
          <Card nadpis={tr('Položky')} bezOdsadenia>
            <div className="cw-es__polozky">
              {(o.polozky ?? []).map((p) => (
                <div key={p.id} className="cw-es__polozka">
                  <div>
                    <strong>{p.nazov}</strong>
                    {p.vlastnosti.length > 0 && <small>{p.vlastnosti.map((v) => `${v.nazov}: ${v.hodnota}`).join(' · ')}</small>}
                    {p.kod && <small>{tr('Kód {kod}', { kod: p.kod })}</small>}
                  </div>
                  <span className="cw-es__tlmene">
                    {p.pocet} × {cenaText(p.cena_za_kus, o.mena)}
                  </span>
                  <span className="cw-es__suma">{cenaText(p.spolu, o.mena)}</span>
                </div>
              ))}
              <dl className="cw-es__sucty">
                <div>
                  <dt>{tr('Tovar')}</dt>
                  <dd>{cenaText(o.medzisucet, o.mena)}</dd>
                </div>
                <div>
                  <dt>{o.dorucenie_nazov}</dt>
                  <dd>{o.dorucenie_cena > 0 ? cenaText(o.dorucenie_cena, o.mena) : tr('Zadarmo')}</dd>
                </div>
                {o.platba_poplatok > 0 && (
                  <div>
                    <dt>{o.platba_nazov}</dt>
                    <dd>{cenaText(o.platba_poplatok, o.mena)}</dd>
                  </div>
                )}
                <div className="cw-es__spolu">
                  <dt>{tr('Spolu')}</dt>
                  <dd>{cenaText(o.spolu, o.mena)}</dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card nadpis={tr('Zákazník')}>
            <dl className="cw-es__udaje">
              <div>
                <dt>{tr('Meno')}</dt>
                <dd>{o.meno}</dd>
              </div>
              <div>
                <dt>{tr('E-mail')}</dt>
                <dd>
                  <a href={`mailto:${o.email}`}>{o.email}</a>
                </dd>
              </div>
              {o.telefon && (
                <div>
                  <dt>{tr('Telefón')}</dt>
                  <dd>
                    <a href={`tel:${o.telefon.replace(/\s+/g, '')}`}>{o.telefon}</a>
                  </dd>
                </div>
              )}
              {o.ulica && (
                <div>
                  <dt>{tr('Adresa')}</dt>
                  <dd>
                    {o.ulica}
                    <br />
                    {o.psc} {o.mesto}
                    {o.krajina && (
                      <>
                        <br />
                        {o.krajina}
                      </>
                    )}
                  </dd>
                </div>
              )}
              {o.poznamka && (
                <div>
                  <dt>{tr('Poznámka zákazníka')}</dt>
                  <dd className="cw-es__poznamka">{o.poznamka}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>

        <div className="cw-es__bok">
          <Card nadpis={tr('Stav')}>
            <Select
              menovka={tr('Stav objednávky')}
              value={stav}
              onChange={(e) => setStav(e.target.value as StavObjednavky)}
              moznosti={STAVY_OBJEDNAVKY.map((s) => ({ hodnota: s.hodnota, popis: s.popis }))}
              disabled={zrusena}
              napoveda={zrusena ? tr('Zrušená objednávka už vrátila tovar na sklad') : tr('Zrušenie vráti tovar na sklad')}
            />
            <Select
              menovka={tr('Platba')}
              value={platba}
              onChange={(e) => setPlatba(e.target.value as StavPlatby)}
              moznosti={STAVY_PLATBY.map((s) => ({ hodnota: s.hodnota, popis: s.popis }))}
            />
            {stav !== o.stav && (
              <Switch zapnute={upozornit} onZmena={setUpozornit} menovka={tr('Poslať zákazníkovi e-mail')} popis={tr('O novom stave objednávky')} />
            )}
            <Textarea
              menovka={tr('Interná poznámka')}
              value={poznamka}
              onChange={(e) => setPoznamka(e.target.value)}
              rows={3}
              napoveda={tr('Vidí ju len administrácia')}
            />
            <Button onClick={uloz} nacitava={uklada} disabled={!zmenene}>
              {tr('Uložiť zmeny')}
            </Button>
          </Card>

          <Card nadpis={tr('Doručenie a platba')}>
            <dl className="cw-es__udaje">
              <div>
                <dt>{tr('Doručenie')}</dt>
                <dd>{o.dorucenie_nazov}</dd>
              </div>
              <div>
                <dt>{tr('Platba')}</dt>
                <dd>
                  {o.platba_nazov} <small className="cw-es__tlmene">({typPlatby(o.platba_typ).popis})</small>
                </dd>
              </div>
              <div>
                <dt>{tr('Variabilný symbol')}</dt>
                <dd>{o.variabilny_symbol}</dd>
              </div>
              {o.uhradena && (
                <div>
                  <dt>{tr('Uhradená')}</dt>
                  <dd>{formatujDatumCas(o.uhradena)}</dd>
                </div>
              )}
              {o.platba_referencia && (
                <div>
                  <dt>{tr('Referencia platby')}</dt>
                  <dd>{o.platba_referencia}</dd>
                </div>
              )}
            </dl>
            <a className="cw-es__odkaz" href={`/objednavka/${o.token}`} target="_blank" rel="noopener noreferrer">
              <Icon nazov="odkaz" velkost={14} /> {tr('Stránka objednávky pre zákazníka')}
            </a>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        otvorene={potvrditZrusenie}
        nadpis={tr('Zrušiť objednávku?')}
        sprava={tr('Objednávka {cislo} bude zrušená a tovar sa vráti na sklad. Zrušenie sa nedá vrátiť späť.', { cislo: o.cislo })}
        potvrdit={tr('Zrušiť objednávku')}
        nebezpecne
        nacitava={uklada}
        onPotvrd={uloz}
        onZrus={() => setPotvrditZrusenie(false)}
      />
    </div>
  );
};

export default ObjednavkaDetail;
