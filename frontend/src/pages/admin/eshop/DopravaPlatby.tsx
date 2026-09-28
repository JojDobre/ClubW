// Umiestnenie: frontend/src/pages/admin/eshop/DopravaPlatby.tsx
// Spôsoby doručenia (cena, doprava zadarmo od, potreba adresy) a spôsoby
// platby (prevod, dobierka, hotovosť, platobná brána). Pri platbe sa
// nastavujú pokyny pre zákazníka a pri bráne jej HTML/JS kód a adresa
// pre oznámenie o zaplatení.

import React, { useState } from 'react';
import { PageHeader, Badge, Button, Card, Icon, Modal, Input, Select, Textarea, Switch, Skeleton, ErrorState, ConfirmDialog, useToast } from '../../../ui';
import { useNacitanie } from '../../../app/useNacitanie';
import { useAuth } from '../../../app/AuthContext';
import { apiUrl } from '../../../config/api';
import { cenaText, eshopDoruceniaApi, eshopPlatbyApi, type EshopDorucenie, type EshopPlatba, type TypPlatby } from '../../../api/eshop';
import { tr } from '../../../i18n';
import { TYPY_PLATBY, sumaZVstupu, typPlatby } from './spolocne';
import './Eshop.css';

/** Značky, ktoré sa v pokynoch a v kóde brány nahradia údajmi objednávky. */
const ZNACKY: Array<[string, string]> = [
  ['{{suma}}', tr('suma na zaplatenie (49.90)')],
  ['{{suma_text}}', tr('suma s čiarkou (49,90)')],
  ['{{suma_centy}}', tr('suma v centoch (4990)')],
  ['{{mena}}', tr('mena (EUR)')],
  ['{{vs}}', tr('variabilný symbol')],
  ['{{cislo}}', tr('číslo objednávky')],
  ['{{iban}}', tr('IBAN klubu z Nastavení')],
  ['{{meno}}', tr('meno zákazníka')],
  ['{{email}}', tr('e-mail zákazníka')],
  ['{{popis}}', tr('„Objednávka 20260001"')],
  ['{{navrat_url}}', tr('stránka objednávky - návrat z brány')],
  ['{{oznamenie_url}}', tr('adresa pre oznámenie o zaplatení')],
];

interface FormularDorucenia {
  id?: number;
  nazov: string;
  popis: string;
  cena: string;
  zadarmo_od: string;
  vyzaduje_adresu: boolean;
  aktivny: boolean;
}

interface FormularPlatby {
  id?: number;
  nazov: string;
  popis: string;
  typ: TypPlatby;
  poplatok: string;
  pokyny: string;
  brana_html: string;
  brana_kluc: string | null;
  dorucenia: number[];
  aktivny: boolean;
}

const suma = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));

export const DopravaPlatby: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();
  const { pouzivatel } = useAuth();
  const jeSpravca = pouzivatel?.rola === 'admin';
  const dorucenia = useNacitanie((signal) => eshopDoruceniaApi.vypis(signal));
  const platby = useNacitanie((signal) => eshopPlatbyApi.vypis(signal));
  const [dorucenie, setDorucenie] = useState<FormularDorucenia | null>(null);
  const [platba, setPlatba] = useState<FormularPlatby | null>(null);
  const [naZmazanie, setNaZmazanie] = useState<{ typ: 'dorucenie' | 'platba'; id: number; nazov: string } | null>(null);
  const [uklada, setUklada] = useState(false);

  const zoznamDoruceni = dorucenia.data ?? [];
  const zoznamPlatieb = platby.data ?? [];

  const ulozDorucenie = async () => {
    if (!dorucenie) return;
    if (dorucenie.nazov.trim().length < 2) return varovanie(tr('Názov musí mať aspoň 2 znaky'));
    const cena = sumaZVstupu(dorucenie.cena) ?? 0;
    const zadarmo = sumaZVstupu(dorucenie.zadarmo_od);
    if (Number.isNaN(cena) || cena < 0 || Number.isNaN(zadarmo as number)) return varovanie(tr('Zadajte platnú sumu'));
    setUklada(true);
    try {
      const udaje: Partial<EshopDorucenie> = {
        nazov: dorucenie.nazov.trim(),
        popis: dorucenie.popis.trim() || null,
        cena,
        zadarmo_od: zadarmo,
        vyzaduje_adresu: dorucenie.vyzaduje_adresu,
        aktivny: dorucenie.aktivny,
      };
      if (dorucenie.id) await eshopDoruceniaApi.uprav(dorucenie.id, udaje);
      else await eshopDoruceniaApi.vytvor({ ...udaje, poradie: zoznamDoruceni.length + 1 });
      setDorucenie(null);
      dorucenia.obnov();
      uspech(tr('Spôsob doručenia bol uložený'));
    } catch (e: any) {
      hlasChybu(e?.message || tr('Spôsob doručenia sa nepodarilo uložiť'));
    } finally {
      setUklada(false);
    }
  };

  const ulozPlatbu = async () => {
    if (!platba) return;
    if (platba.nazov.trim().length < 2) return varovanie(tr('Názov musí mať aspoň 2 znaky'));
    const poplatok = sumaZVstupu(platba.poplatok) ?? 0;
    if (Number.isNaN(poplatok) || poplatok < 0) return varovanie(tr('Zadajte platnú sumu'));
    setUklada(true);
    try {
      const udaje: Partial<EshopPlatba> = {
        nazov: platba.nazov.trim(),
        popis: platba.popis.trim() || null,
        typ: platba.typ,
        poplatok,
        pokyny: platba.pokyny.trim() || null,
        brana_html: platba.typ === 'brana' ? platba.brana_html.trim() || null : null,
        dorucenia: platba.dorucenia,
        aktivny: platba.aktivny,
      };
      const ulozena = platba.id ? await eshopPlatbyApi.uprav(platba.id, udaje) : await eshopPlatbyApi.vytvor({ ...udaje, poradie: zoznamPlatieb.length + 1 });
      platby.obnov();
      uspech(tr('Spôsob platby bol uložený'));
      // Nová brána dostala kľúč - okno necháme otvorené, aby ho správca videl
      if (ulozena.typ === 'brana' && !platba.id) setPlatba({ ...platba, id: ulozena.id, brana_kluc: ulozena.brana_kluc });
      else setPlatba(null);
    } catch (e: any) {
      hlasChybu(e?.message || tr('Spôsob platby sa nepodarilo uložiť'));
    } finally {
      setUklada(false);
    }
  };

  const novyKluc = async () => {
    if (!platba?.id || !window.confirm(tr('Vytvoriť nový kľúč? Starý prestane platiť a brána ho musí mať zmenený tiež.'))) return;
    try {
      const nova = await eshopPlatbyApi.novyKluc(platba.id);
      setPlatba({ ...platba, brana_kluc: nova.brana_kluc });
      platby.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Kľúč sa nepodarilo vytvoriť'));
    }
  };

  const zmaz = async () => {
    if (!naZmazanie) return;
    try {
      if (naZmazanie.typ === 'dorucenie') await eshopDoruceniaApi.zmaz(naZmazanie.id);
      else await eshopPlatbyApi.zmaz(naZmazanie.id);
      setNaZmazanie(null);
      dorucenia.obnov();
      platby.obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Nepodarilo sa zmazať'));
    }
  };

  const presun = async <T extends { id: number; poradie: number }>(zoznam: T[], index: number, smer: -1 | 1, uprav: (id: number, u: { poradie: number }) => Promise<unknown>, obnov: () => void) => {
    const nove = [...zoznam];
    if (!nove[index + smer]) return;
    [nove[index], nove[index + smer]] = [nove[index + smer], nove[index]];
    try {
      await Promise.all(nove.map((x, i) => (x.poradie !== i + 1 ? uprav(x.id, { poradie: i + 1 }) : null)));
      obnov();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Poradie sa nepodarilo zmeniť'));
    }
  };

  // Bráne treba celú adresu (API môže byť relatívne k webu)
  const adresaOznamenia = platba?.id ? new URL(apiUrl(`/eshop/platby/${platba.id}/oznamenie`), window.location.origin).href : null;
  const kopiruj = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => uspech(tr('Skopírované')), () => undefined);
  };

  return (
    <div className="cw-screen cw-es">
      <PageHeader nadpis={tr('Doprava a platba')} podnadpis={tr('Ako sa tovar dostane k zákazníkovi a ako zaplatí. Zákazník si vyberá v pokladni.')} />

      <div className="cw-es__dva-stlpce">
        <Card
          nadpis={tr('Doručenie')}
          akcie={
            <Button
              velkost="sm"
              ikona={<Icon nazov="plus" velkost={14} />}
              onClick={() => setDorucenie({ nazov: '', popis: '', cena: '', zadarmo_od: '', vyzaduje_adresu: true, aktivny: true })}
            >
              {tr('Pridať')}
            </Button>
          }
          bezOdsadenia
        >
          {dorucenia.chyba ? (
            <ErrorState sprava={tr('Doručenie sa nepodarilo načítať')} detail={dorucenia.chyba} onSkusZnova={dorucenia.obnov} />
          ) : dorucenia.nacitava ? (
            <Skeleton vyska="120px" />
          ) : (
            <ul className="cw-es__sposoby">
              {zoznamDoruceni.length === 0 && <li className="cw-es__tlmene">{tr('Zatiaľ žiadny spôsob doručenia - obchod bez neho nevie prijať objednávku.')}</li>}
              {zoznamDoruceni.map((d, i) => (
                <li key={d.id} className={d.aktivny ? '' : 'is-skryty'}>
                  <span className="cw-es__sposob-ikona">
                    <Icon nazov="doprava" velkost={18} />
                  </span>
                  <div className="cw-es__sposob-text">
                    <strong>{d.nazov}</strong>
                    <small>
                      {d.cena > 0 ? cenaText(d.cena) : tr('Zadarmo')}
                      {d.zadarmo_od !== null && d.cena > 0 ? ` · ${tr('zadarmo od {suma}', { suma: cenaText(d.zadarmo_od) })}` : ''}
                      {' · '}
                      {d.vyzaduje_adresu ? tr('s adresou') : tr('bez adresy')}
                    </small>
                  </div>
                  {!d.aktivny && <Badge ton="neutral">{tr('Vypnuté')}</Badge>}
                  <div className="cw-es__riadok-akcii">
                    <Button velkost="sm" variant="ghost" disabled={i === 0} onClick={() => presun(zoznamDoruceni, i, -1, eshopDoruceniaApi.uprav, dorucenia.obnov)} aria-label={tr('Posunúť {nazov} vyššie', { nazov: d.nazov })}>
                      ↑
                    </Button>
                    <Button
                      velkost="sm"
                      variant="ghost"
                      onClick={() =>
                        setDorucenie({
                          id: d.id,
                          nazov: d.nazov,
                          popis: d.popis ?? '',
                          cena: suma(d.cena),
                          zadarmo_od: suma(d.zadarmo_od),
                          vyzaduje_adresu: d.vyzaduje_adresu,
                          aktivny: d.aktivny,
                        })
                      }
                      aria-label={tr('Upraviť {nazov}', { nazov: d.nazov })}
                    >
                      <Icon nazov="upravit" velkost={14} />
                    </Button>
                    <Button velkost="sm" variant="ghost" onClick={() => setNaZmazanie({ typ: 'dorucenie', id: d.id, nazov: d.nazov })} aria-label={tr('Zmazať {nazov}', { nazov: d.nazov })}>
                      <Icon nazov="zmazat" velkost={14} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          nadpis={tr('Platba')}
          akcie={
            jeSpravca ? (
              <Button
                velkost="sm"
                ikona={<Icon nazov="plus" velkost={14} />}
                onClick={() => setPlatba({ nazov: '', popis: '', typ: 'prevod', poplatok: '', pokyny: '', brana_html: '', brana_kluc: null, dorucenia: [], aktivny: true })}
              >
                {tr('Pridať')}
              </Button>
            ) : undefined
          }
          bezOdsadenia
        >
          {platby.chyba ? (
            <ErrorState sprava={tr('Platby sa nepodarilo načítať')} detail={platby.chyba} onSkusZnova={platby.obnov} />
          ) : platby.nacitava ? (
            <Skeleton vyska="120px" />
          ) : (
            <ul className="cw-es__sposoby">
              {zoznamPlatieb.length === 0 && <li className="cw-es__tlmene">{tr('Zatiaľ žiadny spôsob platby.')}</li>}
              {zoznamPlatieb.map((p, i) => (
                <li key={p.id} className={p.aktivny ? '' : 'is-skryty'}>
                  <span className="cw-es__sposob-ikona">
                    <Icon nazov="platba" velkost={18} />
                  </span>
                  <div className="cw-es__sposob-text">
                    <strong>{p.nazov}</strong>
                    <small>
                      {typPlatby(p.typ).popis}
                      {p.poplatok > 0 ? ` · +${cenaText(p.poplatok)}` : ''}
                      {p.dorucenia.length > 0 ? ` · ${zoznamDoruceni.filter((d) => p.dorucenia.includes(d.id)).map((d) => d.nazov).join(', ')}` : ''}
                    </small>
                  </div>
                  {!p.aktivny && <Badge ton="neutral">{tr('Vypnutá')}</Badge>}
                  {p.typ === 'brana' && !p.brana_html && <Badge ton="warning">{tr('Chýba kód brány')}</Badge>}
                  {jeSpravca && (
                    <div className="cw-es__riadok-akcii">
                      <Button velkost="sm" variant="ghost" disabled={i === 0} onClick={() => presun(zoznamPlatieb, i, -1, eshopPlatbyApi.uprav, platby.obnov)} aria-label={tr('Posunúť {nazov} vyššie', { nazov: p.nazov })}>
                        ↑
                      </Button>
                      <Button
                        velkost="sm"
                        variant="ghost"
                        onClick={() =>
                          setPlatba({
                            id: p.id,
                            nazov: p.nazov,
                            popis: p.popis ?? '',
                            typ: p.typ,
                            poplatok: p.poplatok ? suma(p.poplatok) : '',
                            pokyny: p.pokyny ?? '',
                            brana_html: p.brana_html ?? '',
                            brana_kluc: p.brana_kluc,
                            dorucenia: p.dorucenia,
                            aktivny: p.aktivny,
                          })
                        }
                        aria-label={tr('Upraviť {nazov}', { nazov: p.nazov })}
                      >
                        <Icon nazov="upravit" velkost={14} />
                      </Button>
                      <Button velkost="sm" variant="ghost" onClick={() => setNaZmazanie({ typ: 'platba', id: p.id, nazov: p.nazov })} aria-label={tr('Zmazať {nazov}', { nazov: p.nazov })}>
                        <Icon nazov="zmazat" velkost={14} />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!jeSpravca && <p className="cw-es__tlmene cw-es__male cw-es__odsadene">{tr('Spôsoby platby môže meniť len správca.')}</p>}
        </Card>
      </div>

      {/* ===== Doručenie ===== */}
      <Modal
        otvorene={dorucenie !== null}
        onZavri={() => setDorucenie(null)}
        nadpis={dorucenie?.id ? dorucenie.nazov : tr('Nový spôsob doručenia')}
        sirka="sm"
        pata={
          <>
            <Button variant="secondary" onClick={() => setDorucenie(null)} disabled={uklada}>
              {tr('Zrušiť')}
            </Button>
            <Button onClick={ulozDorucenie} nacitava={uklada}>
              {tr('Uložiť')}
            </Button>
          </>
        }
      >
        {dorucenie && (
          <>
            <Input menovka={tr('Názov')} value={dorucenie.nazov} onChange={(e) => setDorucenie({ ...dorucenie, nazov: e.target.value })} placeholder={tr('Napríklad: Kuriér na adresu')} povinne />
            <Input menovka={tr('Popis')} value={dorucenie.popis} onChange={(e) => setDorucenie({ ...dorucenie, popis: e.target.value })} placeholder={tr('Doručenie do 2 - 3 pracovných dní')} />
            <div className="cw-es__riadok-poli">
              <Input menovka={tr('Cena')} value={dorucenie.cena} onChange={(e) => setDorucenie({ ...dorucenie, cena: e.target.value })} inputMode="decimal" placeholder="0" />
              <Input
                menovka={tr('Zadarmo od')}
                value={dorucenie.zadarmo_od}
                onChange={(e) => setDorucenie({ ...dorucenie, zadarmo_od: e.target.value })}
                inputMode="decimal"
                napoveda={tr('Hodnota tovaru - prázdne = nikdy')}
              />
            </div>
            <Switch
              zapnute={dorucenie.vyzaduje_adresu}
              onZmena={(h) => setDorucenie({ ...dorucenie, vyzaduje_adresu: h })}
              menovka={tr('Vyžaduje adresu')}
              popis={tr('Kuriér a pošta áno, osobný odber nie')}
            />
            <Switch zapnute={dorucenie.aktivny} onZmena={(h) => setDorucenie({ ...dorucenie, aktivny: h })} menovka={tr('Ponúkať v pokladni')} />
          </>
        )}
      </Modal>

      {/* ===== Platba ===== */}
      <Modal
        otvorene={platba !== null}
        onZavri={() => setPlatba(null)}
        nadpis={platba?.id ? platba.nazov : tr('Nový spôsob platby')}
        sirka="md"
        pata={
          <>
            <Button variant="secondary" onClick={() => setPlatba(null)} disabled={uklada}>
              {tr('Zavrieť')}
            </Button>
            <Button onClick={ulozPlatbu} nacitava={uklada}>
              {tr('Uložiť')}
            </Button>
          </>
        }
      >
        {platba && (
          <>
            <div className="cw-es__riadok-poli">
              <Input menovka={tr('Názov')} value={platba.nazov} onChange={(e) => setPlatba({ ...platba, nazov: e.target.value })} placeholder={tr('Napríklad: Platba kartou')} povinne />
              <Select
                menovka={tr('Typ')}
                value={platba.typ}
                onChange={(e) => setPlatba({ ...platba, typ: e.target.value as TypPlatby })}
                moznosti={TYPY_PLATBY.map((t) => ({ hodnota: t.hodnota, popis: t.popis }))}
                napoveda={typPlatby(platba.typ).napoveda}
              />
            </div>
            <div className="cw-es__riadok-poli">
              <Input menovka={tr('Popis v pokladni')} value={platba.popis} onChange={(e) => setPlatba({ ...platba, popis: e.target.value })} />
              <Input menovka={tr('Poplatok')} value={platba.poplatok} onChange={(e) => setPlatba({ ...platba, poplatok: e.target.value })} inputMode="decimal" placeholder="0" />
            </div>
            <Textarea
              menovka={tr('Pokyny pre zákazníka')}
              value={platba.pokyny}
              onChange={(e) => setPlatba({ ...platba, pokyny: e.target.value })}
              rows={3}
              placeholder={tr('Sumu {{suma_text}} {{mena}} pošlite na účet {{iban}}, variabilný symbol {{vs}}.')}
              napoveda={tr('Zobrazia sa po objednávke a v potvrdzujúcom e-maile, kým objednávka nie je zaplatená.')}
            />

            {platba.typ === 'brana' && (
              <div className="cw-es__brana">
                <h3>{tr('Platobná brána')}</h3>
                <p className="cw-es__tlmene cw-es__male">
                  {tr('Vložte HTML/JS kód, ktorý dostanete od poskytovateľa brány (tlačidlo alebo formulár na zaplatenie). Zákazník ho uvidí po odoslaní objednávky. Kód beží v izolovanom rámci, nemá prístup k webu ani k prihláseniu.')}
                </p>
                <Textarea
                  menovka={tr('Kód brány')}
                  value={platba.brana_html}
                  onChange={(e) => setPlatba({ ...platba, brana_html: e.target.value })}
                  rows={8}
                  className="cw-es__kod"
                  placeholder={'<form action="https://brana.example/platba" method="post" target="_top">\n  <input type="hidden" name="suma" value="{{suma}}">\n  <input type="hidden" name="vs" value="{{vs}}">\n  <input type="hidden" name="navrat" value="{{navrat_url}}">\n  <button>Zaplatiť kartou</button>\n</form>'}
                />
                <details className="cw-es__znacky">
                  <summary>{tr('Značky, ktoré sa nahradia údajmi objednávky')}</summary>
                  <dl>
                    {ZNACKY.map(([znacka, popis]) => (
                      <div key={znacka}>
                        <dt>
                          <code>{znacka}</code>
                        </dt>
                        <dd>{popis}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
                {adresaOznamenia && platba.brana_kluc ? (
                  <div className="cw-es__oznamenie">
                    <strong>{tr('Oznámenie o zaplatení')}</strong>
                    <p className="cw-es__tlmene cw-es__male">
                      {tr('Brána po zaplatení pošle POST na túto adresu s hlavičkou X-ClubW-Kluc (alebo poľom kluc), číslom objednávky (cislo alebo vs) a stavom (stav: paid). Objednávka sa označí ako uhradená.')}
                    </p>
                    <div className="cw-es__kopia">
                      <code>{adresaOznamenia}</code>
                      <Button velkost="sm" variant="ghost" onClick={() => kopiruj(adresaOznamenia)} aria-label={tr('Kopírovať adresu')}>
                        <Icon nazov="kopirovat" velkost={14} />
                      </Button>
                    </div>
                    <div className="cw-es__kopia">
                      <code>{platba.brana_kluc}</code>
                      <Button velkost="sm" variant="ghost" onClick={() => kopiruj(platba.brana_kluc!)} aria-label={tr('Kopírovať kľúč')}>
                        <Icon nazov="kopirovat" velkost={14} />
                      </Button>
                      <Button velkost="sm" variant="ghost" onClick={novyKluc}>
                        {tr('Nový kľúč')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="cw-es__tlmene cw-es__male">{tr('Adresa a kľúč pre oznámenie o zaplatení sa zobrazia po uložení.')}</p>
                )}
              </div>
            )}

            <div className="cw-es__povolene">
              <span className="cw-es__menovka">{tr('Povolené pri doručení')}</span>
              <p className="cw-es__tlmene cw-es__male">{tr('Nič nezaškrtnuté = pri všetkých spôsoboch doručenia.')}</p>
              {zoznamDoruceni.map((d) => (
                <label key={d.id} className="cw-es__zaskrtnutie">
                  <input
                    type="checkbox"
                    checked={platba.dorucenia.includes(d.id)}
                    onChange={(e) =>
                      setPlatba({ ...platba, dorucenia: e.target.checked ? [...platba.dorucenia, d.id] : platba.dorucenia.filter((x) => x !== d.id) })
                    }
                  />
                  {d.nazov}
                </label>
              ))}
            </div>
            <Switch zapnute={platba.aktivny} onZmena={(h) => setPlatba({ ...platba, aktivny: h })} menovka={tr('Ponúkať v pokladni')} />
          </>
        )}
      </Modal>

      <ConfirmDialog
        otvorene={naZmazanie !== null}
        nadpis={tr('Zmazať {nazov}?', { nazov: naZmazanie?.nazov })}
        sprava={tr('Staré objednávky si ponechajú názov a cenu, v pokladni sa už neukáže.')}
        potvrdit={tr('Zmazať')}
        nebezpecne
        onPotvrd={zmaz}
        onZrus={() => setNaZmazanie(null)}
      />
    </div>
  );
};

export default DopravaPlatby;
