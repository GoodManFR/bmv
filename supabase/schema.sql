-- ============================================================
-- BMV — Script de création des tables et politiques de sécurité
-- À coller dans le SQL Editor de votre projet Supabase
-- ============================================================


-- ============================================================
-- 1. TABLE profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name text,
    weight_kg   float,
    height_cm   float,
    age         int,
    sex         text CHECK (sex IN ('male', 'female')),
    created_at  timestamp with time zone DEFAULT now()
);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Un utilisateur ne voit que son propre profil"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Un utilisateur ne peut modifier que son propre profil"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Un utilisateur peut insérer son propre profil"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);


-- ============================================================
-- 2. TABLE sessions (= une soirée)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sessions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    started_at  timestamp with time zone DEFAULT now(),
    ended_at    timestamp with time zone,
    rating      int CHECK (rating BETWEEN 1 AND 5),
    comment     text
);

-- Row Level Security
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Un utilisateur ne voit que ses propres soirées"
    ON public.sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Un utilisateur peut créer ses propres soirées"
    ON public.sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Un utilisateur peut modifier ses propres soirées"
    ON public.sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Un utilisateur peut supprimer ses propres soirées"
    ON public.sessions FOR DELETE
    USING (auth.uid() = user_id);


-- ============================================================
-- 3. TABLE drinks (= une boisson consommée)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.drinks (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id  uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    name        text NOT NULL,
    abv         float NOT NULL,
    volume_ml   int NOT NULL,
    source      text NOT NULL CHECK (source IN ('scan', 'manual')),
    ean_code    text,
    timestamp   timestamp with time zone DEFAULT now()
);

-- Row Level Security
ALTER TABLE public.drinks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Un utilisateur ne voit que ses propres boissons"
    ON public.drinks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Un utilisateur peut enregistrer ses propres boissons"
    ON public.drinks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Un utilisateur peut modifier ses propres boissons"
    ON public.drinks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Un utilisateur peut supprimer ses propres boissons"
    ON public.drinks FOR DELETE
    USING (auth.uid() = user_id);


-- ============================================================
-- 4. TRIGGER — création automatique du profil à l'inscription
-- Déclenché après chaque insertion dans auth.users
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$;

-- Attacher le trigger à auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
