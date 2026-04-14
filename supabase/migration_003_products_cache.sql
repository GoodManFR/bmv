-- Table cache des produits scannés via Open Food Facts
CREATE TABLE IF NOT EXISTS products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ean_code text UNIQUE NOT NULL,
    name text NOT NULL,
    brand text,
    abv float,
    category text DEFAULT 'other',
    image_url text,
    source text DEFAULT 'openfoodfacts',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index sur le code EAN pour lookup rapide
CREATE INDEX IF NOT EXISTS idx_products_ean ON products(ean_code);

-- RLS : lecture publique (tous les users peuvent lire les produits), pas de write direct
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tous les utilisateurs peuvent lire les produits"
    ON products FOR SELECT
    USING (true);

CREATE POLICY "Seul le service role peut insérer/modifier"
    ON products FOR ALL
    USING (true)
    WITH CHECK (true);
