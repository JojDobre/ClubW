// Umiestnenie: license-server/admin/src/stranky/NovaLicencia.tsx
// Formulár licencie - nová licencia aj úprava existujúcej.

import React, { useEffect, useMemo, useState } from 'react';
import { api, type Licencia, type Produkt, type Verzia } from '../api';
import { Oblast, Okno, Pole, Prepinac, Tlacidlo, Vyber, useOznamenia } from '../komponenty';
import { doInputu } from '../formaty';

interface Hodnoty {
  produkt_id: string;
  plan: string;
  nazov_klienta: string;
  email_klienta: string;
  domena: string;
  platna_od: string;
  platna_do: string;
  funkcie: string;
  poznamka: string;
  automaticke_aktualizacie: boolean;
  pripnuta_verzia_id: string;
}

const FormularLicencie: React.FC<{
  nadpis: string;
  produkty: Produkt[];
  licencia?: Licencia;
  onZavriet: () => void;
  onUlozena: (l: Licencia) => void;
}> = ({ nadpis, produkty, licencia, onZavriet, onUlozena }) => {
  const { uspech, chyba } = useOznamenia();
  const [h, setH] = useState<Hodnoty>(() => ({
    produkt_id: String(licencia?.produkt_id ?? produkty[0]?.id ?? ''),
    plan: licencia?.plan ?? produkty[0]?.plany[0]?.kod ?? '',
    nazov_klienta: licencia?.nazov_klienta ?? '',
    email_klienta: licencia?.email_klienta ?? '',
    domena: licencia?.domena ?? '',
    platna_od: doInputu(licencia?.platna_od) || new Date().toISOString().slice(0, 10),
    platna_do: doInputu(licencia?.platna_do),
    funkcie: (licencia?.funkcie ?? []).join(', '),
    poznamka: licencia?.poznamka ?? '',
    automaticke_aktualizacie: licencia?.automaticke_aktualizacie ?? false,
    pripnuta_verzia_id: licencia?.pripnuta_verzia_id ? String(licencia.pripnuta_verzia_id) : '',
  }));
  const [uklada, setUklada] = useState(false);
  const [verzie, setVerzie] = useState<Verzia[]>([]);
  const nastav = <K extends keyof Hodnoty>(k: K, v: Hodnoty[K]) => setH((s) => ({ ...s, [k]: v }));

  const produkt = produkty.find((p) => String(p.id) === h.produkt_id);
  const plan = produkt?.plany.find((p) => p.kod === h.plan);

  useEffect(() => {
    if (!h.produkt_id) return;
    api.get<Verzia[]>(`/produkty/${h.produkt_id}/verzie`).then((r) => setVerzie(r.data)).catch(() => setVerzie([]));
  }, [h.produkt_id]);

  // Pri novej licencii: prvý plán produktu a jeho funkcie
  useEffect(() => {
    if (licencia || !produkt) return;
    if (!produkt.plany.some((p) => p.kod === h.plan)) nastav('plan', produkt.plany[0]?.kod ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h.produkt_id]);

  const predvolenyKoniec = useMemo(() => {
    if (!plan || !h.platna_od) return null;
    const d = new Date(h.platna_od);
    d.setMonth(d.getMonth() + plan.mesiacov);
    return d.toLocaleDateString('sk-SK');
  }, [plan, h.platna_od]);

  const uloz = async (e: React.FormEvent) => {
    e.preventDefault();
    setUklada(true);
    const telo = {
      produkt_id: Number(h.produkt_id),
      plan: h.plan,
      nazov_klienta: h.nazov_klienta,
      email_klienta: h.email_klienta,
      domena: h.domena,
      platna_od: h.platna_od || null,
      platna_do: h.platna_do || null,
      poznamka: h.poznamka,
      automaticke_aktualizacie: h.automaticke_aktualizacie,
      pripnuta_verzia_id: h.pripnuta_verzia_id ? Number(h.pripnuta_verzia_id) : null,
      // Prázdne funkcie pri novej licencii = funkcie plánu
      ...(h.funkcie.trim() || licencia ? { funkcie: h.funkcie.split(/[,\s]+/).filter(Boolean) } : {}),
    };
    try {
      const r = licencia ? await api.put<Licencia>(`/licencie/${licencia.id}`, telo) : await api.post<Licencia>('/licencie', telo);
      uspech(r.message ?? 'Uložené');
      onUlozena(r.data);
    } catch (e: any) {
      chyba(e.message);
    } finally {
      setUklada(false);
    }
  };

  return (
    <Okno
      nadpis={nadpis}
      onZavriet={onZavriet}
      siroke
      paticka={
        <>
          <Tlacidlo onClick={onZavriet}>Zrušiť</Tlacidlo>
          <Tlacidlo variant="primarne" type="submit" form="formular-licencie" nacitava={uklada}>
            {licencia ? 'Uložiť' : 'Vytvoriť licenciu'}
          </Tlacidlo>
        </>
      }
    >
      <form id="formular-licencie" className="formular" onSubmit={uloz} noValidate>
        <div className="formular__riadok">
          <Vyber
            menovka="Produkt"
            value={h.produkt_id}
            onChange={(e) => nastav('produkt_id', e.target.value)}
            disabled={Boolean(licencia)}
            moznosti={produkty.map((p) => ({ hodnota: p.id, popis: p.nazov }))}
          />
          <Vyber
            menovka="Plán"
            value={h.plan}
            onChange={(e) => nastav('plan', e.target.value)}
            moznosti={(produkt?.plany ?? []).map((p) => ({ hodnota: p.kod, popis: `${p.nazov} (${p.mesiacov} mes.)` }))}
          />
        </div>
        <div className="formular__riadok">
          <Pole menovka="Názov klienta" value={h.nazov_klienta} onChange={(e) => nastav('nazov_klienta', e.target.value)} placeholder="FK Dolina" required />
          <Pole menovka="E-mail klienta" type="email" value={h.email_klienta} onChange={(e) => nastav('email_klienta', e.target.value)} placeholder="info@fkdolina.sk" required />
        </div>
        <Pole
          menovka="Doména"
          value={h.domena}
          onChange={(e) => nastav('domena', e.target.value)}
          placeholder="fkdolina.sk"
          napoveda="Licencia bude platiť len na tejto doméne (www sa ignoruje). Prázdne = na ľubovoľnej doméne."
        />
        <div className="formular__riadok">
          <Pole menovka="Platná od" type="date" value={h.platna_od} onChange={(e) => nastav('platna_od', e.target.value)} />
          <Pole
            menovka="Platná do"
            type="date"
            value={h.platna_do}
            onChange={(e) => nastav('platna_do', e.target.value)}
            napoveda={!licencia && !h.platna_do && predvolenyKoniec ? `Prázdne = podľa plánu (${predvolenyKoniec})` : undefined}
          />
        </div>
        <Pole
          menovka="Funkcie"
          value={h.funkcie}
          onChange={(e) => nastav('funkcie', e.target.value)}
          placeholder={plan?.funkcie.length ? plan.funkcie.join(', ') : 'napr. live, export, api'}
          napoveda={licencia ? 'Kódy funkcií oddelené čiarkou.' : 'Prázdne = funkcie zvoleného plánu.'}
        />
        <div className="formular__riadok">
          <Vyber
            menovka="Pripnutá verzia"
            value={h.pripnuta_verzia_id}
            onChange={(e) => nastav('pripnuta_verzia_id', e.target.value)}
            prazdna="Nie - vždy aktuálna verzia produktu"
            moznosti={verzie.map((v) => ({ hodnota: v.id, popis: v.verzia }))}
            napoveda="Inštalácia ostane na tejto verzii a nedostane novšiu."
          />
          <div className="formular__prepinac">
            <Prepinac
              menovka="Automatické aktualizácie"
              napoveda="Nová aktuálna verzia sa nainštaluje sama pri najbližšom overení licencie."
              checked={h.automaticke_aktualizacie}
              onChange={(v) => nastav('automaticke_aktualizacie', v)}
            />
          </div>
        </div>
        <Oblast menovka="Interná poznámka" value={h.poznamka} onChange={(e) => nastav('poznamka', e.target.value)} placeholder="Zmluva, fakturácia, kontaktná osoba…" />
      </form>
    </Okno>
  );
};

const NovaLicencia: React.FC<{ produkty: Produkt[]; onZavriet: () => void; onVytvorena: (l: Licencia) => void }> = ({ produkty, onZavriet, onVytvorena }) => (
  <FormularLicencie nadpis="Nová licencia" produkty={produkty} onZavriet={onZavriet} onUlozena={onVytvorena} />
);

export const UpravaLicencie: React.FC<{ licencia: Licencia; produkty: Produkt[]; onZavriet: () => void; onUlozena: (l: Licencia) => void }> = (props) => (
  <FormularLicencie nadpis="Upraviť licenciu" {...props} />
);

export default NovaLicencia;
