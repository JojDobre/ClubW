-- backend/migrations/20241218_fix_existing_matches_again.sql
-- Oprava existujúcich zápasov - prepísanie názvov z "Neznámy tím"

-- Aktualizácia domáceho tímu pre zápasy s DB ID ale prázdnym názvom
UPDATE zapasy 
SET domaci_tim_nazov = timy.nazov
FROM timy 
WHERE zapasy.domaci_tim_id = timy.id 
AND zapasy.aktivity = true
AND (zapasy.domaci_tim_nazov IS NULL OR zapasy.domaci_tim_nazov = 'Neznámy tím');

-- Aktualizácia hosťujúceho tímu pre zápasy s DB ID ale prázdnym názvom  
UPDATE zapasy 
SET hostujuci_tim_nazov = timy.nazov
FROM timy 
WHERE zapasy.hostujuci_tim_id = timy.id 
AND zapasy.aktivity = true
AND (zapasy.hostujuci_tim_nazov IS NULL OR zapasy.hostujuci_tim_nazov = 'Neznámy tím');

-- Aktualizácia ligy pre zápasy s DB ID ale prázdnym názvom
UPDATE zapasy 
SET liga_nazov = ligy.nazov
FROM ligy 
WHERE zapasy.liga_id = ligy.id 
AND zapasy.aktivity = true
AND (zapasy.liga_nazov IS NULL OR zapasy.liga_nazov = '');

-- Kontrola výsledkov
SELECT 
    id, 
    nazov,
    domaci_tim_id,
    domaci_tim_nazov,
    hostujuci_tim_id, 
    hostujuci_tim_nazov,
    liga_id,
    liga_nazov
FROM zapasy 
WHERE aktivity = true
ORDER BY vytvoreny DESC 
LIMIT 10;
