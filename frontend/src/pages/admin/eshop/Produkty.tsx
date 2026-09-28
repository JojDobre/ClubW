// Umiestnenie: frontend/src/pages/admin/eshop/Produkty.tsx
// Produkty e-shopu v kartách: obrázok, cena, sklad, stav. Filter podľa
// kategórie a hľadanie. Kategórie sa spravujú v okne (ako úrovne sponzorov).

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Badge, Button, Icon, Modal, Input, FilterChips, Skeleton, EmptyState, ErrorState, useToast } from '../../../ui';
import { useNacitanie } from '../../../app/useNacitanie';
import { cenaText, eshopKategorieApi, eshopProduktyApi, type EshopKategoria, type EshopProdukt } from '../../../api/eshop';
import { souborUrl } from '../../../config/api';
import { tr } from '../../../i18n';
import './Eshop.css';

/** Súhrn skladu: produkt + hodnoty vlastností so skladom. */
export const textSkladu = (p: EshopProdukt): { text: string; nizky: boolean } => {
  const hodnoty = p.vlastnosti.flatMap((v) => v.hodnoty).filter((h) => h.sklad !== null);
  if (hodnoty.length) {
    const spolu = hodnoty.reduce((s, h) => s + (h.sklad ?? 0), 0);
    const vypredane = hodnoty.filter((h) => (h.sklad ?? 0) <= 0).length;
    return {
      text: vypredane ? tr('{pocet} ks, {vypredane} vypredané', { pocet: spolu, vypredane }) : tr('{pocet} ks', { pocet: spolu }),
      nizky: spolu <= 5 || vypredane > 0,
    };
  }
  if (p.sklad === null) return { text: tr('Neobmedzene'), nizky: false };
  return { text: tr('{pocet} ks', { pocet: p.sklad }), nizky: p.sklad <= 5 };
};

const KategorieOkno: React.FC<{ otvorene: boolean; onZavri: () => void; kategorie: EshopKategoria[]; onZmena: () => void }> = ({
  otvorene,
  onZavri,
  kategorie,
  onZmena,
}) => {
  const { uspech, chyba: hlasChybu, varovanie } = useToast();
  const [nova, setNova] = useState('');
  const [upravovana, setUpravovana] = useState<EshopKategoria | null>(null);

  const pridaj = async () => {
    if (nova.trim().length < 2) return varovanie(tr('Názov kategórie musí mať aspoň 2 znaky'));
    try {
      await eshopKategorieApi.vytvor({ nazov: nova.trim(), poradie: (kategorie[kategorie.length - 1]?.poradie ?? 0) + 1 });
      setNova('');
      onZmena();
      uspech(tr('Kategória bola pridaná'));
    } catch (e: any) {
      hlasChybu(e?.message || tr('Kategóriu sa nepodarilo pridať'));
    }
  };

  const uloz = async () => {
    if (!upravovana) return;
    try {
      await eshopKategorieApi.uprav(upravovana.id, { nazov: upravovana.nazov.trim(), popis: upravovana.popis || null, aktivity: upravovana.aktivity });
      setUpravovana(null);
      onZmena();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Kategóriu sa nepodarilo uložiť'));
    }
  };

  const presun = async (index: number, smer: -1 | 1) => {
    const nove = [...kategorie];
    const [a, b] = [nove[index], nove[index + smer]];
    if (!a || !b) return;
    [nove[index], nove[index + smer]] = [b, a];
    try {
      await Promise.all(nove.map((k, i) => (k.poradie !== i + 1 ? eshopKategorieApi.uprav(k.id, { poradie: i + 1 }) : null)));
      onZmena();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Poradie sa nepodarilo zmeniť'));
    }
  };

  const zmaz = async (k: EshopKategoria) => {
    const sprava = k.pocet_produktov
      ? tr('Kategória {nazov} má {pocet} produktov - zostanú bez kategórie. Zmazať?', { nazov: k.nazov, pocet: k.pocet_produktov })
      : tr('Zmazať kategóriu {nazov}?', { nazov: k.nazov });
    if (!window.confirm(sprava)) return;
    try {
      await eshopKategorieApi.zmaz(k.id);
      onZmena();
    } catch (e: any) {
      hlasChybu(e?.message || tr('Kategóriu sa nepodarilo zmazať'));
    }
  };

  return (
    <Modal otvorene={otvorene} onZavri={onZavri} nadpis={tr('Kategórie produktov')}>
      <p className="cw-es__tlmene">{tr('Kategórie sú na webe filtre obchodu. Poradie určuje poradie filtrov.')}</p>
      <ul className="cw-es__zoznam-kategorii">
        {kategorie.length === 0 && <li className="cw-es__tlmene">{tr('Zatiaľ žiadne kategórie.')}</li>}
        {kategorie.map((k, i) =>
          upravovana?.id === k.id ? (
            <li key={k.id} className="cw-es__kategoria-uprava">
              <Input menovka={tr('Názov')} value={upravovana.nazov} onChange={(e) => setUpravovana({ ...upravovana, nazov: e.target.value })} />
              <Input menovka={tr('Popis')} value={upravovana.popis ?? ''} onChange={(e) => setUpravovana({ ...upravovana, popis: e.target.value })} />
              <div className="cw-es__riadok-akcii">
                <Button velkost="sm" variant="secondary" onClick={() => setUpravovana(null)}>
                  {tr('Zrušiť')}
                </Button>
                <Button velkost="sm" onClick={uloz}>
                  {tr('Uložiť')}
                </Button>
              </div>
            </li>
          ) : (
            <li key={k.id}>
              <div>
                <strong>{k.nazov}</strong>
                <small className="cw-es__tlmene">{tr('{pocet} produktov', { pocet: k.pocet_produktov ?? 0 })}</small>
              </div>
              <div className="cw-es__riadok-akcii">
                <Button velkost="sm" variant="ghost" disabled={i === 0} onClick={() => presun(i, -1)} aria-label={tr('Posunúť {nazov} vyššie', { nazov: k.nazov })}>
                  ↑
                </Button>
                <Button velkost="sm" variant="ghost" disabled={i === kategorie.length - 1} onClick={() => presun(i, 1)} aria-label={tr('Posunúť {nazov} nižšie', { nazov: k.nazov })}>
                  ↓
                </Button>
                <Button velkost="sm" variant="ghost" onClick={() => setUpravovana({ ...k })} aria-label={tr('Upraviť {nazov}', { nazov: k.nazov })}>
                  <Icon nazov="upravit" velkost={14} />
                </Button>
                <Button velkost="sm" variant="ghost" onClick={() => zmaz(k)} aria-label={tr('Zmazať {nazov}', { nazov: k.nazov })}>
                  <Icon nazov="zmazat" velkost={14} />
                </Button>
              </div>
            </li>
          )
        )}
      </ul>
      <div className="cw-es__nova-kategoria">
        <Input menovka={tr('Nová kategória')} value={nova} onChange={(e) => setNova(e.target.value)} placeholder={tr('Napríklad: Dresy')} />
        <Button onClick={pridaj} ikona={<Icon nazov="plus" velkost={14} />}>
          {tr('Pridať')}
        </Button>
      </div>
    </Modal>
  );
};

export const Produkty: React.FC = () => {
  const navigate = useNavigate();
  const [kategoria, setKategoria] = useState('');
  const [hladat, setHladat] = useState('');
  const [kategorieOtvorene, setKategorieOtvorene] = useState(false);
  const produkty = useNacitanie((signal) => eshopProduktyApi.vypis(signal));
  const kategorie = useNacitanie((signal) => eshopKategorieApi.vypis(signal));
  const zoznamKategorii = kategorie.data ?? [];

  const text = hladat.trim().toLowerCase();
  const zobrazene = (produkty.data ?? []).filter(
    (p) =>
      (!kategoria || String(p.kategoria_id ?? 'bez') === kategoria) &&
      (!text || `${p.nazov} ${p.kod ?? ''}`.toLowerCase().includes(text))
  );

  return (
    <div className="cw-screen cw-es">
      <PageHeader
        nadpis={tr('Produkty')}
        podnadpis={tr('Tovar v obchode na webe (adresa /obchod). Odporúčané produkty sa ukážu vo fanshope na úvodnej stránke.')}
        akcie={
          <>
            <Button variant="secondary" onClick={() => setKategorieOtvorene(true)}>
              {tr('Kategórie')}
            </Button>
            <Button ikona={<Icon nazov="plus" velkost={17} />} onClick={() => navigate('/admin/eshop/produkty/novy')}>
              {tr('Nový produkt')}
            </Button>
          </>
        }
      />

      <div className="cw-es__filtre">
        <FilterChips
          popisSkupiny={tr('Kategória')}
          zvolena={kategoria}
          onZmena={setKategoria}
          moznosti={[
            { hodnota: '', popis: tr('Všetky'), pocet: produkty.data?.length ?? 0 },
            ...zoznamKategorii.map((k) => ({ hodnota: String(k.id), popis: k.nazov, pocet: (produkty.data ?? []).filter((p) => p.kategoria_id === k.id).length })),
          ]}
        />
        <label className="cw-es__hladat">
          <Icon nazov="hladat" velkost={16} />
          <input type="search" value={hladat} onChange={(e) => setHladat(e.target.value)} placeholder={tr('Názov alebo kód')} aria-label={tr('Hľadať produkt')} />
        </label>
      </div>

      {produkty.chyba ? (
        <ErrorState sprava={tr('Produkty sa nepodarilo načítať')} detail={produkty.chyba} onSkusZnova={produkty.obnov} />
      ) : produkty.nacitava ? (
        <div className="cw-es__produkty">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} vyska="260px" />
          ))}
        </div>
      ) : (produkty.data ?? []).length === 0 ? (
        <EmptyState
          ikona={<Icon nazov="balik" velkost={40} />}
          nadpis={tr('Zatiaľ žiadne produkty')}
          popis={tr('Pridajte dresy, šály a ďalší tovar - s veľkosťami, príplatkami a skladom.')}
          akcia={<Button onClick={() => navigate('/admin/eshop/produkty/novy')}>{tr('Pridať produkt')}</Button>}
        />
      ) : zobrazene.length === 0 ? (
        <EmptyState ikona={<Icon nazov="hladat" velkost={40} />} nadpis={tr('Žiadny produkt nezodpovedá filtru')} />
      ) : (
        <div className="cw-es__produkty">
          {zobrazene.map((p) => {
            const sklad = textSkladu(p);
            return (
              <button key={p.id} type="button" className={`cw-es__produkt${p.aktivny ? '' : ' is-skryty'}`} onClick={() => navigate(`/admin/eshop/produkty/${p.id}`)}>
                <span className="cw-es__produkt-obrazok">
                  {p.obrazok ? <img src={souborUrl(p.obrazok)} alt="" loading="lazy" /> : <Icon nazov="balik" velkost={34} />}
                  {p.odporucany && <span className="cw-es__odporucany">{tr('Na úvode')}</span>}
                </span>
                <span className="cw-es__produkt-text">
                  <strong>{p.nazov}</strong>
                  <span className="cw-es__tlmene">{p.kategoria?.nazov ?? tr('Bez kategórie')}</span>
                  <span className="cw-es__produkt-cena">
                    {cenaText(p.cena)}
                    {p.povodna_cena !== null && <s>{cenaText(p.povodna_cena)}</s>}
                  </span>
                  <span className="cw-es__stavy">
                    {!p.aktivny ? (
                      <Badge ton="neutral">{tr('Skrytý')}</Badge>
                    ) : p.vypredany ? (
                      <Badge ton="danger">{tr('Vypredaný')}</Badge>
                    ) : (
                      <Badge ton={sklad.nizky ? 'warning' : 'success'}>{sklad.text}</Badge>
                    )}
                    {p.vlastnosti.length > 0 && <Badge ton="info">{p.vlastnosti.map((v) => v.nazov).join(', ')}</Badge>}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <KategorieOkno
        otvorene={kategorieOtvorene}
        onZavri={() => setKategorieOtvorene(false)}
        kategorie={[...zoznamKategorii].sort((a, b) => a.poradie - b.poradie)}
        onZmena={() => {
          kategorie.obnov();
          produkty.obnov();
        }}
      />
    </div>
  );
};

export default Produkty;
