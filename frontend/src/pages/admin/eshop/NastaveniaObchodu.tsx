// Umiestnenie: frontend/src/pages/admin/eshop/NastaveniaObchodu.tsx
// Nastavenia obchodu: zapnutie, mena, e-mail pre objednávky, obchodné
// podmienky, text po objednávke, predvolená krajina a najnižšia objednávka.

import React, { useEffect, useState } from 'react';
import { PageHeader, Button, Card, Input, Textarea, Switch, Skeleton, ErrorState, useToast } from '../../../ui';
import { useNacitanie } from '../../../app/useNacitanie';
import { useAuth } from '../../../app/AuthContext';
import { eshopNastaveniaApi, type NastaveniaEshopu } from '../../../api/eshop';
import { tr } from '../../../i18n';
import { sumaZVstupu } from './spolocne';
import './Eshop.css';

export const NastaveniaObchodu: React.FC = () => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();
  const { pouzivatel } = useAuth();
  const jeSpravca = pouzivatel?.rola === 'admin';
  const nastavenia = useNacitanie((signal) => eshopNastaveniaApi.nacitaj(signal));
  const [f, setF] = useState<(Omit<NastaveniaEshopu, 'minimalna_objednavka'> & { minimalna_objednavka: string }) | null>(null);
  const [uklada, setUklada] = useState(false);

  useEffect(() => {
    if (nastavenia.data) setF({ ...nastavenia.data, minimalna_objednavka: nastavenia.data.minimalna_objednavka ? String(nastavenia.data.minimalna_objednavka) : '' });
  }, [nastavenia.data]);

  const uloz = async () => {
    if (!f) return;
    const minimalna = sumaZVstupu(f.minimalna_objednavka) ?? 0;
    if (Number.isNaN(minimalna)) return varovanie(tr('Zadajte platnú sumu'));
    setUklada(true);
    try {
      const ulozene = await eshopNastaveniaApi.uloz({ ...f, minimalna_objednavka: minimalna });
      nastavenia.nastavData(ulozene);
      uspech(tr('Nastavenia obchodu boli uložené'));
    } catch (e: any) {
      hlasChybu(e?.message || tr('Nastavenia obchodu sa nepodarilo uložiť'));
    } finally {
      setUklada(false);
    }
  };

  if (nastavenia.chyba) {
    return (
      <div className="cw-screen">
        <ErrorState sprava={tr('Nastavenia sa nepodarilo načítať')} detail={nastavenia.chyba} onSkusZnova={nastavenia.obnov} />
      </div>
    );
  }
  if (!f) {
    return (
      <div className="cw-screen">
        <Skeleton vyska="320px" />
      </div>
    );
  }

  return (
    <div className="cw-screen cw-es">
      <PageHeader
        nadpis={tr('Nastavenia obchodu')}
        podnadpis={tr('Obchod je na webe na adrese /obchod. Kým je vypnutý, návštevníci ho nevidia a košík sa nezobrazí.')}
        akcie={
          jeSpravca ? (
            <Button onClick={uloz} nacitava={uklada}>
              {tr('Uložiť')}
            </Button>
          ) : undefined
        }
      />
      <div className="cw-es__dva-stlpce">
        <Card nadpis={tr('Obchod')}>
          <Switch
            zapnute={f.zapnuty}
            onZmena={(h) => setF({ ...f, zapnuty: h })}
            menovka={tr('Obchod je otvorený')}
            popis={tr('Zobrazí košík a stránky obchodu na webe a prijíma objednávky')}
            disabled={!jeSpravca}
          />
          <div className="cw-es__riadok-poli">
            <Input menovka={tr('Mena')} value={f.mena} onChange={(e) => setF({ ...f, mena: e.target.value.toUpperCase() })} maxLength={3} napoveda={tr('Trojpísmenový kód, napríklad EUR')} disabled={!jeSpravca} />
            <Input
              menovka={tr('Najnižšia objednávka')}
              value={f.minimalna_objednavka}
              onChange={(e) => setF({ ...f, minimalna_objednavka: e.target.value })}
              inputMode="decimal"
              placeholder="0"
              napoveda={tr('Hodnota tovaru; prázdne = bez obmedzenia')}
              disabled={!jeSpravca}
            />
          </div>
          <Input
            menovka={tr('Predvolená krajina doručenia')}
            value={f.predvolena_krajina}
            onChange={(e) => setF({ ...f, predvolena_krajina: e.target.value })}
            disabled={!jeSpravca}
          />
        </Card>

        <Card nadpis={tr('Objednávky')}>
          <Input
            menovka={tr('E-mail pre nové objednávky')}
            type="email"
            value={f.email_objednavok ?? ''}
            onChange={(e) => setF({ ...f, email_objednavok: e.target.value || null })}
            napoveda={tr('Prázdne = e-mail klubu z Nastavení')}
            disabled={!jeSpravca}
          />
          <Input
            menovka={tr('Obchodné podmienky')}
            value={f.podmienky_url ?? ''}
            onChange={(e) => setF({ ...f, podmienky_url: e.target.value || null })}
            placeholder="/obchodne-podmienky"
            napoveda={tr('Odkaz na stránku s podmienkami - zákazník ich pred objednávkou odsúhlasí')}
            disabled={!jeSpravca}
          />
          <Textarea
            menovka={tr('Text po odoslaní objednávky')}
            value={f.text_potvrdenia ?? ''}
            onChange={(e) => setF({ ...f, text_potvrdenia: e.target.value || null })}
            rows={3}
            placeholder={tr('Ďakujeme! Tovar pripravíme do troch pracovných dní.')}
            disabled={!jeSpravca}
          />
        </Card>
      </div>
      {!jeSpravca && <p className="cw-es__tlmene">{tr('Nastavenia obchodu môže meniť len správca.')}</p>}
    </div>
  );
};

export default NastaveniaObchodu;
