// Types TypeScript partagés — définis dans le MASTER.md

export interface UserProfile {
  id: string;
  google_id?: string;        // absent dans la table Supabase — champ hérité du MASTER
  display_name: string;
  weight_kg: number | null;  // null si le profil n'est pas encore rempli
  height_cm: number | null;
  age: number | null;
  sex: 'male' | 'female' | null;
  created_at: string;
}

export interface Drink {
  id: string;
  user_id: string;
  session_id: string;
  name: string;
  abv: number;          // degré d'alcool en %
  volume_ml: number;    // volume en ml
  source: 'scan' | 'manual';
  ean_code?: string;    // présent uniquement si source === 'scan'
  timestamp: string;
}

export interface Session {
  id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  rating?: number;      // note 1-5 (optionnel)
  comment?: string;     // commentaire libre (optionnel)
  max_bac?: number;     // BAC maximum atteint, calculé à la clôture
  drinks: Drink[];
}

export interface ProductInfo {
  name: string;
  brand: string | null;
  abv: number;           // degré d'alcool en %
  image_url: string | null;
  category: 'beer' | 'wine' | 'spirit' | 'other';
}

export interface SearchResult {
  found: boolean;
  product: ProductInfo | null;
}

export interface BACData {
  current_bac: number;           // taux d'alcoolémie actuel en g/L
  time_to_sober: number;         // temps restant avant 0.5 g/L, en minutes
  is_legal: boolean;             // true si BAC < 0.5 g/L
  curve: { time: string; bac: number }[]; // courbe pour Recharts
}
