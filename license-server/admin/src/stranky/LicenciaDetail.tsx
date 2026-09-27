// Umiestnenie: license-server/admin/src/stranky/LicenciaDetail.tsx
// Detail licencie: údaje, inštalácia, nastavenie pre klienta,
// aktualizácie a história. Akcie: upraviť, predĺžiť, pozastaviť,
// obnoviť, zrušiť, nový kľúč, aktualizovať, zmazať.

import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, type Licencia, type Prikaz, type Produkt, type Udalost } from '../api';
import { ChybaStav, HlavickaStranky, Ikona, Karta, Kopirovat, Nacitava, Okno, Pole, Stitok, Tlacidlo, useInterval, useNacitaj, useOznamenia, usePotvrdenie } from '../komponenty';
import { STAVY_LICENCIE, STAVY_PRIKAZU, datum, datumCas, porovnajVerzie, predCasom, sklon } from '../formaty';
import { UpravaLicencie } from './NovaLicencia';

interface Detail extends Licencia {
  cielova_verzia: { id: number; verzia: string; balik_stav: string } | null;
  prikazy: Prikaz[];
  udalosti: Udalost[];
}

const NAZVY_INSTALACIE: Record<string, string> = {
  adresa: 'Adresa webu',
  domena: 'Doména',
  node: 'Node.js',
  platforma: 'Systém',
  prostredie: 'Prostredie',
  aktualizacie: 'Aktualizácie z webu',
  sposob: 'Spôsob inštalácie',
};

const LicenciaDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { uspech, chyba } = useOznamenia();
  const { potvrd, okno } = usePotvrdenie();
  const detail = useNacitaj((s) => api.get<Detail>(`/licencie/${id}`, s).then((r) => r.data), [id]);
  const produkty = useNacitaj((s) => api.get<Produkt[]>('/produkty', s).then((r) => r.data), []);
  const verejnyKluc = useNacitaj((s) => fetch('/api/public-key', { signal: s }).then((r) => r.json()).then((j) => j.verejnyKluc as string), []);
  const [uprava, setUprava] = useState(false);
  const [predlzenie, setPredlzenie] = useState(false);
  const [akcia, setAkcia] = useState<string | null>(null);
  const [zobrazitKluc, setZobrazitKluc] = useState(Boolean((state as any)?.nova));

  // Kým beží aktualizácia, obnovujeme priebeh
  const bezi = detail.data?.prikazy.some((p) => ['caka', 'prevzaty', 'prebieha'].includes(p.stav));
  useInterval(detail.obnov, bezi ? 8000 : null);
  useEffect(() => window.scrollTo(0, 0), [id]);

  if (detail.nacitava && !detail.data) return <Nacitava />;
  if (detail.chyba) return <ChybaStav text={detail.chyba} onZnova={detail.obnov} />;
  const l = detail.data!;
  const stav = STAVY_LICENCIE[l.vypocitany_stav];

  const vykonaj = async (nazov: string, volanie: () => Promise<{ message?: string }>) => {
    setAkcia(nazov);
    try {
      const r = await volanie();
      uspech(r.message ?? 'Hotovo');
      detail.obnov();
    } catch (e: any) {
      chyba(e.message);
    } finally {
      setAkcia(null);
    }
  };

  const pozastav = async () => {
    if (await potvrd('Pozastaviť licenciu?', <>Web <strong>{l.nazov_klienta}</strong> pri najbližšom overení (do 24 hodín) zablokuje úpravy obsahu. Verejný web ostane dostupný. Licenciu môžete kedykoľvek obnoviť.</>, 'Pozastaviť', true)) {
      vykonaj('pozastavit', () => api.post(`/licencie/${l.id}/pozastavit`));
    }
  };
  const zrus = async () => {
    if (await potvrd('Zrušiť licenciu?', <>Licencia <strong>{l.nazov_klienta}</strong> prestane platiť natrvalo a rozpracované aktualizácie sa zrušia. Záznam ostane v histórii.</>, 'Zrušiť licenciu', true)) {
      vykonaj('zrusit', () => api.post(`/licencie/${l.id}/zrusit`));
    }
  };
  const novyKluc = async () => {
    if (await potvrd('Vymeniť licenčný kľúč?', 'Starý kľúč okamžite prestane platiť. Klient musí nový kľúč zadať do svojho webu (LICENSE_KEY v .env), inak sa mu zablokujú úpravy obsahu. Použite napríklad pri úniku kľúča.', 'Vymeniť kľúč', true)) {
      setZobrazitKluc(true);
      vykonaj('kluc', () => api.post(`/licencie/${l.id}/novy-kluc`));
    }
  };
  const zmaz = async () => {
    if (await potvrd('Zmazať licenciu?', 'Licenciu ešte žiadna inštalácia nepoužila, dá sa zmazať úplne.', 'Zmazať', true)) {
      try {
        await api.delete(`/licencie/${l.id}`);
        uspech('Licencia bola zmazaná');
        navigate('/licencie');
      } catch (e: any) {
        chyba(e.message);
      }
    }
  };
  const aktualizuj = async () => {
    if (!l.cielova_verzia) return;
    if (await potvrd('Aktualizovať inštaláciu?', <>Inštalácia <strong>{l.nazov_klienta}</strong> prejde z verzie {l.nainstalovana_verzia ?? '?'} na <strong>{l.cielova_verzia.verzia}</strong>. Príkaz si vyzdvihne pri najbližšom overení licencie; pred aktualizáciou si urobí zálohu a pri chybe sa vráti späť.</>, 'Aktualizovať')) {
      vykonaj('aktualizovat', () => api.post(`/licencie/${l.id}/aktualizovat`));
    }
  };

  const mozeAktualizovat =
    l.vypocitany_stav === 'aktivna' && l.cielova_verzia && l.cielova_verzia.balik_stav === 'pripraveny' && l.nainstalovana_verzia && porovnajVerzie(l.cielova_verzia.verzia, l.nainstalovana_verzia) > 0;

  const env = [
    `LICENSE_KEY=${l.kluc}`,
    `LICENSE_SERVER_URL=${window.location.origin}`,
    ...(l.domena ? [`CLIENT_DOMAIN=${l.domena}`] : []),
    `LICENSE_PUBLIC_KEY="${(verejnyKluc.data ?? '…').trim().replace(/\n/g, '\\n')}"`,
  ].join('\n');

  return (
    <div className="stranka">
      <HlavickaStranky
        spat={
          <Link to="/licencie" className="spat">
            <Ikona nazov="spat" velkost={16} /> Licencie
          </Link>
        }
        nadpis={
          <>
            {l.nazov_klienta} <Stitok ton={stav.ton}>{stav.nazov}</Stitok>
          </>
        }
        popis={
          <>
            {l.produkt?.nazov} · plán {l.plan} · {l.email_klienta}
          </>
        }
        akcie={
          <>
            <Tlacidlo onClick={() => setUprava(true)}>Upraviť</Tlacidlo>
            <Tlacidlo onClick={() => setPredlzenie(true)}>Predĺžiť</Tlacidlo>
            {l.stav === 'aktivna' ? (
              <Tlacidlo onClick={pozastav} nacitava={akcia === 'pozastavit'}>
                Pozastaviť
              </Tlacidlo>
            ) : (
              <Tlacidlo variant="primarne" onClick={() => vykonaj('obnovit', () => api.post(`/licencie/${l.id}/obnovit`))} nacitava={akcia === 'obnovit'}>
                Obnoviť licenciu
              </Tlacidlo>
            )}
          </>
        }
      />

      {l.vypocitany_stav === 'aktivna' && l.dni_do_vyprsania <= 30 && (
        <div className="upozornenie upozornenie--oranzova">
          <Ikona nazov="hodiny" velkost={16} />
          Licencia vyprší o {l.dni_do_vyprsania} {sklon(l.dni_do_vyprsania, 'deň', 'dni', 'dní')} ({datum(l.platna_do)}).
        </div>
      )}

      <div className="mriezka-detail">
        <div className="stlpec">
          <Karta nadpis="Licenčný kľúč">
            <div className="kluc">
              <code className="kluc__hodnota">{zobrazitKluc ? l.kluc : `${l.kluc.slice(0, 11)}•••• •••• ••••`}</code>
              <Tlacidlo male variant="jemne" onClick={() => setZobrazitKluc((z) => !z)}>
                {zobrazitKluc ? 'Skryť' : 'Zobraziť'}
              </Tlacidlo>
              <Kopirovat text={l.kluc} />
            </div>
            {(state as any)?.nova && <p className="tlmene">Licencia je vytvorená. Pošlite klientovi kľúč, alebo mu nastavte web podľa bloku Nastavenie pre klienta.</p>}
          </Karta>

          <Karta nadpis="Údaje licencie">
            <dl className="udaje">
              <div>
                <dt>Platnosť</dt>
                <dd>
                  {datum(l.platna_od)} – {datum(l.platna_do)}
                </dd>
              </div>
              <div>
                <dt>Doména</dt>
                <dd>{l.domena ?? 'ľubovoľná'}</dd>
              </div>
              <div>
                <dt>Plán</dt>
                <dd>{l.produkt?.plany?.find((p) => p.kod === l.plan)?.nazov ?? l.plan}</dd>
              </div>
              <div>
                <dt>Funkcie</dt>
                <dd>{l.funkcie.length ? l.funkcie.map((f) => <Stitok key={f}>{f}</Stitok>) : <span className="tlmene">bez obmedzenia</span>}</dd>
              </div>
              <div>
                <dt>Aktualizácie</dt>
                <dd>
                  {l.pripnuta_verzia ? `Pripnutá na ${l.pripnuta_verzia.verzia}` : l.automaticke_aktualizacie ? 'Automatické' : 'Na pokyn administrátora'}
                </dd>
              </div>
              <div>
                <dt>Vytvorená</dt>
                <dd>{datumCas(l.vytvoreny)}</dd>
              </div>
            </dl>
            {l.poznamka && <p className="poznamka">{l.poznamka}</p>}
          </Karta>

          <Karta nadpis="Nastavenie pre klienta" akcie={<Kopirovat text={env} popis="Kopírovať .env" />}>
            <p className="tlmene">Tieto riadky patria do súboru backend/.env na serveri klienta. Po zmene treba backend reštartovať.</p>
            <pre className="kod">{env}</pre>
          </Karta>

          <Karta nadpis="Ďalšie akcie">
            <div className="akcie-riadky">
              <div>
                <strong>Vymeniť kľúč</strong>
                <p>Starý kľúč prestane platiť okamžite.</p>
                <Tlacidlo male onClick={novyKluc} nacitava={akcia === 'kluc'}>
                  Nový kľúč
                </Tlacidlo>
              </div>
              {l.stav !== 'zrusena' && (
                <div>
                  <strong>Zrušiť licenciu</strong>
                  <p>Natrvalo, napríklad po ukončení zmluvy.</p>
                  <Tlacidlo male variant="nebezpecne" onClick={zrus} nacitava={akcia === 'zrusit'}>
                    Zrušiť
                  </Tlacidlo>
                </div>
              )}
              {l.pocet_kontrol === 0 && (
                <div>
                  <strong>Zmazať</strong>
                  <p>Len kým ju žiadna inštalácia nepoužila.</p>
                  <Tlacidlo male variant="nebezpecne" onClick={zmaz}>
                    Zmazať
                  </Tlacidlo>
                </div>
              )}
            </div>
          </Karta>
        </div>

        <div className="stlpec">
          <Karta
            nadpis="Inštalácia"
            akcie={
              mozeAktualizovat ? (
                <Tlacidlo variant="primarne" male ikona="aktualizacie" onClick={aktualizuj} nacitava={akcia === 'aktualizovat'}>
                  Aktualizovať na {l.cielova_verzia!.verzia}
                </Tlacidlo>
              ) : undefined
            }
          >
            {l.pocet_kontrol === 0 ? (
              <p className="tlmene">Inštalácia sa ešte neozvala. Hneď po nastavení kľúča a reštarte webu sa tu objaví.</p>
            ) : (
              <dl className="udaje">
                <div>
                  <dt>Verzia</dt>
                  <dd>
                    <span className="mono">{l.nainstalovana_verzia ?? 'neznáma'}</span>{' '}
                    {l.cielova_verzia && l.nainstalovana_verzia && porovnajVerzie(l.cielova_verzia.verzia, l.nainstalovana_verzia) > 0 ? (
                      <Stitok ton="modra">dostupná {l.cielova_verzia.verzia}</Stitok>
                    ) : l.cielova_verzia ? (
                      <Stitok ton="zelena">aktuálna</Stitok>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt>Posledný kontakt</dt>
                  <dd>
                    <Stitok ton={l.online ? 'zelena' : 'seda'} bodka>
                      {predCasom(l.posledna_kontrola)}
                    </Stitok>{' '}
                    <small className="tlmene">{datumCas(l.posledna_kontrola)}</small>
                  </dd>
                </div>
                <div>
                  <dt>Overení spolu</dt>
                  <dd>{l.pocet_kontrol}</dd>
                </div>
                <div>
                  <dt>IP adresa</dt>
                  <dd className="mono">{l.posledna_ip ?? '—'}</dd>
                </div>
                {Object.entries(l.instalacia ?? {})
                  .filter(([, v]) => v !== null && v !== '')
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt>{NAZVY_INSTALACIE[k] ?? k}</dt>
                      <dd>{k === 'adresa' && typeof v === 'string' && /^https?:\/\//.test(v) ? <a href={v} target="_blank" rel="noopener noreferrer">{v}</a> : typeof v === 'boolean' ? (v ? 'povolené' : 'vypnuté') : String(v)}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </Karta>

          <Karta nadpis="Aktualizácie">
            {l.prikazy.length === 0 ? (
              <p className="tlmene">Inštalácia zatiaľ nedostala žiadnu aktualizáciu.</p>
            ) : (
              <ul className="prikazy">
                {l.prikazy.map((p) => (
                  <PrikazRiadok key={p.id} prikaz={p} onZmena={detail.obnov} />
                ))}
              </ul>
            )}
          </Karta>

          <Karta nadpis="História">
            <ul className="casova-os">
              {l.udalosti.map((u) => (
                <li key={u.id}>
                  <span className="casova-os__cas" title={datumCas(u.vytvorena)}>
                    {predCasom(u.vytvorena)}
                  </span>
                  <span>
                    {u.popis}
                    {u.administrator && <small> · {u.administrator.meno}</small>}
                  </span>
                </li>
              ))}
            </ul>
          </Karta>
        </div>
      </div>

      {uprava && (
        <UpravaLicencie
          licencia={{ ...l, produkt: produkty.data?.find((p) => p.id === l.produkt_id) ?? l.produkt }}
          produkty={produkty.data ?? []}
          onZavriet={() => setUprava(false)}
          onUlozena={() => {
            setUprava(false);
            detail.obnov();
          }}
        />
      )}
      {predlzenie && (
        <Predlzenie
          licencia={l}
          onZavriet={() => setPredlzenie(false)}
          onHotovo={() => {
            setPredlzenie(false);
            detail.obnov();
          }}
        />
      )}
      {okno}
    </div>
  );
};

/** Riadok aktualizácie s priebehom a záznamom z inštalácie. */
export const PrikazRiadok: React.FC<{ prikaz: Prikaz; onZmena: () => void; sLicenciou?: boolean }> = ({ prikaz: p, onZmena, sLicenciou }) => {
  const { uspech, chyba } = useOznamenia();
  const s = STAVY_PRIKAZU[p.stav];
  const zrus = async () => {
    try {
      await api.post(`/prikazy/${p.id}/zrusit`);
      uspech('Aktualizácia bola zrušená');
      onZmena();
    } catch (e: any) {
      chyba(e.message);
    }
  };
  return (
    <li className="prikaz">
      <div className="prikaz__hlava">
        <span>
          {sLicenciou && p.licencia && (
            <Link to={`/licencie/${p.licencia_id}`} className="prikaz__licencia">
              {p.licencia.nazov_klienta}
            </Link>
          )}
          <strong>Aktualizácia na {p.verzia?.verzia ?? '?'}</strong>
          <small>
            {datumCas(p.vytvoreny)} · {p.vytvoril ? p.vytvoril.meno : 'automaticky'}
            {p.dokonceny && ` · dokončené ${datumCas(p.dokonceny)}`}
          </small>
        </span>
        <span className="prikaz__vpravo">
          <Stitok ton={s.ton}>{s.nazov}</Stitok>
          {['caka', 'prevzaty', 'prebieha'].includes(p.stav) && (
            <Tlacidlo male variant="jemne" onClick={zrus}>
              Zrušiť
            </Tlacidlo>
          )}
        </span>
      </div>
      {p.sprava && (
        <details className="prikaz__zaznam">
          <summary>Záznam z inštalácie</summary>
          <pre className="kod">{p.sprava}</pre>
        </details>
      )}
    </li>
  );
};

const Predlzenie: React.FC<{ licencia: Licencia; onZavriet: () => void; onHotovo: () => void }> = ({ licencia, onZavriet, onHotovo }) => {
  const { uspech, chyba } = useOznamenia();
  const [mesiacov, setMesiacov] = useState(12);
  const [uklada, setUklada] = useState(false);
  const od = new Date(Math.max(new Date(licencia.platna_do).getTime(), Date.now()));
  const nova = new Date(od);
  nova.setMonth(nova.getMonth() + (mesiacov || 0));
  const predlz = async () => {
    setUklada(true);
    try {
      const r = await api.post(`/licencie/${licencia.id}/predlzit`, { mesiacov });
      uspech(r.message ?? 'Predĺžené');
      onHotovo();
    } catch (e: any) {
      chyba(e.message);
    } finally {
      setUklada(false);
    }
  };
  return (
    <Okno
      nadpis="Predĺžiť licenciu"
      onZavriet={onZavriet}
      paticka={
        <>
          <Tlacidlo onClick={onZavriet}>Zrušiť</Tlacidlo>
          <Tlacidlo variant="primarne" onClick={predlz} nacitava={uklada}>
            Predĺžiť
          </Tlacidlo>
        </>
      }
    >
      <div className="cipy">
        {[1, 6, 12, 24].map((m) => (
          <button key={m} type="button" className={`cip${mesiacov === m ? ' is-aktivny' : ''}`} onClick={() => setMesiacov(m)}>
            {m} {sklon(m, 'mesiac', 'mesiace', 'mesiacov')}
          </button>
        ))}
      </div>
      <Pole menovka="Počet mesiacov" type="number" min={1} max={120} value={mesiacov} onChange={(e) => setMesiacov(Number(e.target.value))} />
      <p className="tlmene">
        Nový koniec platnosti: <strong>{nova.toLocaleDateString('sk-SK')}</strong>
        {new Date(licencia.platna_do).getTime() < Date.now() && ' (licencia už vypršala - predlžuje sa od dnes)'}
      </p>
    </Okno>
  );
};

export default LicenciaDetail;
