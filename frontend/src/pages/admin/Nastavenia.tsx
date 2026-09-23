// Umiestnenie: frontend/src/pages/admin/Nastavenia.tsx
// Nastavenia klubu — identita, farby, kontakt, sociálne siete.
//
// Zmena farieb sa prejaví okamžite v celej administrácii aj na verejnom
// webe, pretože obe berú hodnoty z toho istého endpointu (/api/settings.css).

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader, Card, Button, Input, Textarea, Icon, Skeleton, ErrorState, useToast,
} from '../../ui';
import { useNacitanie } from '../../app/useNacitanie';
import { nastaveniaApi } from '../../api/sprava';
import { useNastavenia } from '../../context/NastaveniaContext';
import { ApiChyba } from '../../app/apiKlient';
import { PoleObrazka } from '../../components/admin/PoleObrazka';
import type { NastaveniaAdmin } from '../../api/typy';
import './Nastavenia.css';

export const Nastavenia: React.FC = () => {
  const { uspech, chyba: hlasChybu } = useToast();
  const { obnov: obnovNastaveniaAplikacie } = useNastavenia();
  const navigate = useNavigate();

  const [formular, setFormular] = useState<Partial<NastaveniaAdmin>>({});
  const [chybyPoli, setChybyPoli] = useState<string[]>([]);
  const [uklada, setUklada] = useState(false);

  const nastavenia = useNacitanie((signal) => nastaveniaApi.detail(signal));

  useEffect(() => {
    if (nastavenia.data) setFormular(nastavenia.data);
  }, [nastavenia.data]);

  const zmen = <K extends keyof NastaveniaAdmin>(pole: K, hodnota: NastaveniaAdmin[K]) => {
    setFormular((d) => ({ ...d, [pole]: hodnota }));
  };

  // Dodatkové farby držíme ako zoznam, aby sa dal premenovať kľúč
  // bez toho, aby riadok v zozname „preskočil"
  const [dodatkove, setDodatkove] = useState<Array<{ kluc: string; farba: string }>>([]);
  useEffect(() => {
    if (nastavenia.data) {
      setDodatkove(
        Object.entries(nastavenia.data.dodatkove_farby ?? {}).map(([kluc, farba]) => ({ kluc, farba }))
      );
    }
  }, [nastavenia.data]);

  /** Názov farby do CSS: malé písmená bez diakritiky, medzery na pomlčky. */
  const naKluc = (text: string) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+/, '')
      .slice(0, 31);

  const uloz = async () => {
    setChybyPoli([]);
    setUklada(true);

    const kluce = dodatkove.map((d) => d.kluc.replace(/-+$/, ''));
    if (kluce.some((k) => !/^[a-z]/.test(k))) {
      hlasChybu('Každá dodatková farba potrebuje názov začínajúci písmenom');
      setUklada(false);
      return;
    }
    if (new Set(kluce).size !== kluce.length) {
      hlasChybu('Dodatkové farby musia mať rôzne názvy');
      setUklada(false);
      return;
    }

    try {
      await nastaveniaApi.uloz({
        ...formular,
        dodatkove_farby: Object.fromEntries(dodatkove.map((d, i) => [kluce[i], d.farba])),
      });
      uspech('Nastavenia boli uložené');

      // Obnovíme nastavenia v celej aplikácii, aby sa nové farby
      // a názov prejavili bez obnovenia stránky
      await obnovNastaveniaAplikacie();
      nastavenia.obnov();
    } catch (e: unknown) {
      if (e instanceof ApiChyba) {
        hlasChybu(e.message);
        if (e.chybyPoli) setChybyPoli(e.chybyPoli);
      } else {
        hlasChybu('Nastavenia sa nepodarilo uložiť');
      }
    } finally {
      setUklada(false);
    }
  };

  if (nastavenia.chyba) {
    return (
      <ErrorState
        sprava="Nastavenia sa nepodarilo načítať"
        detail={nastavenia.chyba}
        onSkusZnova={nastavenia.obnov}
      />
    );
  }

  if (nastavenia.nacitava) {
    return (
      <Card>
        <Skeleton riadkov={8} vyska="18px" />
      </Card>
    );
  }

  return (
    <div className="cw-nastavenia">
      <PageHeader
        nadpis="Nastavenia klubu"
        podnadpis="Identita, farby a kontaktné údaje."
        akcie={
          <Button variant="secondary" ikona={<Icon nazov="menu" velkost={15} />} onClick={() => navigate('/admin/menu')}>
            Menu webu
          </Button>
        }
      />

      <div className="cw-nastavenia__bar">
        <p className="cw-nastavenia__info">
          Zmena farieb sa prejaví v administrácii aj na verejnom webe.
        </p>
        <Button onClick={uloz} nacitava={uklada} ikona={<Icon nazov="ulozit" velkost={15} />}>
          Uložiť nastavenia
        </Button>
      </div>

      {chybyPoli.length > 0 && (
        <div className="cw-nastavenia__errors" role="alert">
          <strong>Server odmietol uloženie:</strong>
          <ul>
            {chybyPoli.map((ch, i) => (
              <li key={i}>{ch}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="cw-nastavenia__grid">
        <div className="cw-nastavenia__col">
          <Card nadpis="Identita klubu">
            <Input
              menovka="Názov klubu"
              value={formular.nazov ?? ''}
              onChange={(e) => zmen('nazov', e.target.value)}
              placeholder="FC Slovan Dolina"
              povinne
            />

            <div className="cw-nastavenia__row">
              <Input
                menovka="Skratka"
                value={formular.skratka ?? ''}
                onChange={(e) => zmen('skratka', e.target.value)}
                placeholder="SD"
                maxLength={4}
                napoveda="Dva až štyri znaky do znaku loga"
              />
              <Input
                menovka="Rok založenia"
                type="number"
                min={1850}
                max={new Date().getFullYear()}
                value={formular.rok_zalozenia ?? ''}
                onChange={(e) =>
                  zmen('rok_zalozenia', e.target.value ? Number(e.target.value) : null)
                }
                placeholder="1932"
              />
            </div>

            <Input
              menovka="Slogan"
              value={formular.slogan ?? ''}
              onChange={(e) => zmen('slogan', e.target.value)}
              placeholder="Srdcom pre futbal"
            />

            <div className="cw-nastavenia__row">
              <PoleObrazka
                menovka="Logo"
                hodnota={formular.logo}
                onZmena={(cesta) => zmen('logo', cesta)}
                napoveda="Ideálne štvorcové PNG s priehľadným pozadím"
              />
              <PoleObrazka
                menovka="Ikona stránky (favicon)"
                hodnota={formular.favicon}
                onZmena={(cesta) => zmen('favicon', cesta)}
                napoveda="Malá ikona v záložke prehliadača, štvorcový obrázok"
              />
            </div>
          </Card>

          <Card
            nadpis="Farby klubu"
            podnadpis="Tri farby prefarbia celý web — ostatné odtiene sa dopočítajú"
          >
            <div className="cw-nastavenia__farby">
              {([
                ['farba_primarna', 'Primárna', 'Hlavná farba klubu — menu, tlačidlá, odkazy'],
                ['farba_akcent', 'Akcentová', 'Zvýraznenia a upozornenia'],
                ['farba_sekundarna', 'Sekundárna', 'Doplnková farba'],
              ] as const).map(([pole, popis, vysvetlenie]) => (
                <div key={pole} className="cw-nastavenia__farba">
                  <label className="cw-nastavenia__farba-label" htmlFor={`f-${pole}`}>
                    {popis}
                  </label>
                  <div className="cw-nastavenia__farba-riadok">
                    <input
                      id={`f-${pole}`}
                      type="color"
                      value={formular[pole] ?? '#1b5e20'}
                      onChange={(e) => zmen(pole, e.target.value)}
                      className="cw-nastavenia__farba-vyber"
                    />
                    {/* Textové pole umožní vložiť presný kód farby */}
                    <input
                      type="text"
                      value={formular[pole] ?? ''}
                      onChange={(e) => zmen(pole, e.target.value)}
                      className="cw-input cw-nastavenia__farba-kod"
                      placeholder="#1B5E20"
                      maxLength={7}
                      aria-label={`${popis} — kód farby`}
                    />
                  </div>
                  <span className="cw-nastavenia__farba-popis">{vysvetlenie}</span>
                </div>
              ))}
            </div>

            <div className="cw-nastavenia__row">
              <div className="cw-nastavenia__farba">
                <label className="cw-nastavenia__farba-label" htmlFor="f-kontrast-pri">
                  Text na primárnej farbe
                </label>
                <input
                  id="f-kontrast-pri"
                  type="color"
                  value={formular.farba_primarna_kontrast ?? '#ffffff'}
                  onChange={(e) => zmen('farba_primarna_kontrast', e.target.value)}
                  className="cw-nastavenia__farba-vyber"
                />
              </div>
              <div className="cw-nastavenia__farba">
                <label className="cw-nastavenia__farba-label" htmlFor="f-kontrast-akc">
                  Text na akcentovej farbe
                </label>
                <input
                  id="f-kontrast-akc"
                  type="color"
                  value={formular.farba_akcent_kontrast ?? '#1b2410'}
                  onChange={(e) => zmen('farba_akcent_kontrast', e.target.value)}
                  className="cw-nastavenia__farba-vyber"
                />
              </div>
            </div>

            {/* Dodatkové farby podľa šablóny */}
            <div className="cw-nastavenia__dodatkove">
              <span className="cw-nastavenia__farba-label">Dodatkové farby</span>
              <span className="cw-nastavenia__farba-popis">
                Ďalšie farby, ktoré používa šablóna webu (napr. farba domácich, pozadie päty). V CSS sú ako
                <code> --club-extra-názov</code>.
              </span>
              {dodatkove.map((d, i) => (
                <div key={i} className="cw-nastavenia__dodatkova">
                  <input
                    type="color"
                    value={/^#[0-9A-Fa-f]{6}$/.test(d.farba) ? d.farba : '#000000'}
                    onChange={(e) => setDodatkove((z) => z.map((x, j) => (j === i ? { ...x, farba: e.target.value } : x)))}
                    className="cw-nastavenia__farba-vyber"
                    aria-label={`Dodatková farba ${d.kluc || i + 1}`}
                  />
                  <input
                    type="text"
                    className="cw-input"
                    value={d.kluc}
                    placeholder="nazov-farby"
                    onChange={(e) => setDodatkove((z) => z.map((x, j) => (j === i ? { ...x, kluc: naKluc(e.target.value) } : x)))}
                    aria-label={`Názov dodatkovej farby ${i + 1}`}
                  />
                  <input
                    type="text"
                    className="cw-input cw-nastavenia__farba-kod"
                    value={d.farba}
                    maxLength={7}
                    onChange={(e) => setDodatkove((z) => z.map((x, j) => (j === i ? { ...x, farba: e.target.value } : x)))}
                    aria-label={`Kód dodatkovej farby ${i + 1}`}
                  />
                  <Button
                    variant="ghost"
                    velkost="sm"
                    onClick={() => setDodatkove((z) => z.filter((_, j) => j !== i))}
                    aria-label={`Odstrániť dodatkovú farbu ${d.kluc || i + 1}`}
                  >
                    <Icon nazov="zmazat" velkost={14} />
                  </Button>
                </div>
              ))}
              {dodatkove.length < 12 && (
                <Button
                  variant="secondary"
                  velkost="sm"
                  ikona={<Icon nazov="plus" velkost={14} />}
                  onClick={() => setDodatkove((z) => [...z, { kluc: '', farba: '#888888' }])}
                >
                  Pridať farbu
                </Button>
              )}
            </div>

            {/* Ukážka, ako budú farby pôsobiť spolu */}
            <div className="cw-nastavenia__ukazka">
              <span className="cw-nastavenia__ukazka-label">Ukážka</span>
              <div className="cw-nastavenia__ukazka-plocha">
                <div
                  className="cw-nastavenia__ukazka-hlavicka"
                  style={{
                    background: formular.farba_primarna,
                    color: formular.farba_primarna_kontrast,
                  }}
                >
                  {formular.nazov || 'Názov klubu'}
                </div>
                <div className="cw-nastavenia__ukazka-telo">
                  <span
                    className="cw-nastavenia__ukazka-stitok"
                    style={{
                      background: formular.farba_akcent,
                      color: formular.farba_akcent_kontrast,
                    }}
                  >
                    Najbližší zápas
                  </span>
                  <button
                    className="cw-nastavenia__ukazka-tlacidlo"
                    style={{
                      background: formular.farba_primarna,
                      color: formular.farba_primarna_kontrast,
                    }}
                    type="button"
                  >
                    Viac informácií
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="cw-nastavenia__col">
          <Card nadpis="Kontaktné údaje">
            <Input
              menovka="E-mail"
              type="email"
              value={formular.email ?? ''}
              onChange={(e) => zmen('email', e.target.value)}
              placeholder="info@vasklub.sk"
            />
            <Input
              menovka="Telefón"
              value={formular.telefon ?? ''}
              onChange={(e) => zmen('telefon', e.target.value)}
              placeholder="+421 900 000 000"
            />
            <Input
              menovka="Adresa"
              value={formular.adresa ?? ''}
              onChange={(e) => zmen('adresa', e.target.value)}
              placeholder="Športová 1, 000 01 Mesto"
            />
          </Card>

          <Card nadpis="Údaje organizácie" podnadpis="Zobrazujú sa v päte webu a na dokladoch">
            <Input
              menovka="Oficiálny názov organizácie"
              value={formular.pravny_nazov ?? ''}
              onChange={(e) => zmen('pravny_nazov', e.target.value)}
              placeholder="Futbalový klub Dolina, o. z."
            />
            <div className="cw-nastavenia__row">
              <Input
                menovka="IČO"
                value={formular.ico ?? ''}
                onChange={(e) => zmen('ico', e.target.value)}
              />
              <Input
                menovka="DIČ"
                value={formular.dic ?? ''}
                onChange={(e) => zmen('dic', e.target.value)}
              />
            </div>
            <div className="cw-nastavenia__row">
              <Input
                menovka="IČ DPH"
                value={formular.ic_dph ?? ''}
                onChange={(e) => zmen('ic_dph', e.target.value)}
                placeholder="SK2020000000"
              />
              <Input
                menovka="IBAN"
                value={formular.iban ?? ''}
                onChange={(e) => zmen('iban', e.target.value)}
                placeholder="SK31 1200 0000 1987 4263 7541"
                napoveda="Účet na príspevky a členské"
              />
            </div>
          </Card>

          <Card nadpis="Sociálne siete">
            <Input
              menovka="Facebook"
              value={formular.facebook_url ?? ''}
              onChange={(e) => zmen('facebook_url', e.target.value)}
              placeholder="https://facebook.com/vasklub"
            />
            <Input
              menovka="Instagram"
              value={formular.instagram_url ?? ''}
              onChange={(e) => zmen('instagram_url', e.target.value)}
              placeholder="https://instagram.com/vasklub"
            />
            <Input
              menovka="YouTube"
              value={formular.youtube_url ?? ''}
              onChange={(e) => zmen('youtube_url', e.target.value)}
              placeholder="https://youtube.com/@vasklub"
            />
            <Input
              menovka="X (Twitter)"
              value={formular.x_url ?? ''}
              onChange={(e) => zmen('x_url', e.target.value)}
              placeholder="https://x.com/vasklub"
            />
            <Input
              menovka="TikTok"
              value={formular.tiktok_url ?? ''}
              onChange={(e) => zmen('tiktok_url', e.target.value)}
              placeholder="https://tiktok.com/@vasklub"
            />
          </Card>

          <Card nadpis="Web a vyhľadávače">
            <Textarea
              menovka="Popis klubu pre vyhľadávače"
              value={formular.meta_popis ?? ''}
              onChange={(e) => zmen('meta_popis', e.target.value)}
              rows={3}
              maxLength={300}
              napoveda={`${(formular.meta_popis ?? '').length} / 300 znakov`}
            />
            <Input
              menovka="Google Analytics"
              value={formular.google_analytics_id ?? ''}
              onChange={(e) => zmen('google_analytics_id', e.target.value)}
              placeholder="G-XXXXXXXXXX"
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Nastavenia;
