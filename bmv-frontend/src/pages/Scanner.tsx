// Page Scanner — scan code-barres EAN + recherche Open Food Facts + saisie manuelle
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../services/api';
import type { ProductInfo } from '../types';

// ── Constantes ────────────────────────────────────────────────────────────────

const SCANNER_ELEMENT_ID = 'bmv-qr-reader';

// Volumes rapides selon la catégorie de boisson
const VOLUME_OPTIONS: Record<string, { label: string; value: number }[]> = {
  beer:   [{ label: '25 cl', value: 250 }, { label: '33 cl', value: 330 }, { label: '50 cl', value: 500 }, { label: 'Pinte', value: 568 }],
  wine:   [{ label: '12 cl', value: 120 }, { label: '15 cl', value: 150 }],
  spirit: [{ label: '3 cl', value: 30 }, { label: '6 cl', value: 60 }],
  other:  [{ label: '25 cl', value: 250 }, { label: '33 cl', value: 330 }, { label: '50 cl', value: 500 }],
};

// ── Types internes ────────────────────────────────────────────────────────────

type ScannerState =
  | 'idle'           // page au repos
  | 'scanning'       // caméra ouverte
  | 'loading'        // requête en cours vers le backend
  | 'found'          // produit trouvé
  | 'not_found'      // produit introuvable → formulaire manuel
  | 'manual'         // formulaire manuel forcé (bouton "Saisie manuelle")
  | 'submitting'     // enregistrement en cours
  | 'added';         // boisson ajoutée avec succès

// ── Composant ─────────────────────────────────────────────────────────────────

const Scanner: React.FC = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<ScannerState>('idle');
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [selectedVolume, setSelectedVolume] = useState<number | null>(null);
  const [customVolume, setCustomVolume] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [addedName, setAddedName] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Formulaire manuel
  const [manualName, setManualName] = useState('');
  const [manualAbv, setManualAbv] = useState('');
  const [manualVolume, setManualVolume] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  const html5QrRef = useRef<Html5Qrcode | null>(null);
  const scanningRef = useRef(false); // empêche les callbacks multiples

  // ── Nettoyage à la destruction du composant ──────────────────────────────
  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Arrêt du scanner ──────────────────────────────────────────────────────
  const stopScanner = useCallback(async () => {
    if (html5QrRef.current) {
      try {
        await html5QrRef.current.stop();
        html5QrRef.current.clear();
      } catch {
        // ignore les erreurs de stop si le scanner était déjà arrêté
      }
      html5QrRef.current = null;
    }
    scanningRef.current = false;
  }, []);

  // ── Démarrage du scanner ──────────────────────────────────────────────────
  const startScanner = useCallback(async () => {
    setCameraError(null);
    setState('scanning');

    // Laisser React mettre à jour le DOM avant d'initialiser le scanner
    await new Promise((r) => setTimeout(r, 100));

    try {
      const qr = new Html5Qrcode(SCANNER_ELEMENT_ID);
      html5QrRef.current = qr;
      scanningRef.current = true;

      await qr.start(
        { facingMode: 'environment' }, // caméra arrière
        { fps: 10, qrbox: { width: 260, height: 180 } },
        async (decodedText) => {
          if (!scanningRef.current) return;
          scanningRef.current = false;
          await stopScanner();
          await fetchProduct(decodedText);
        },
        undefined, // erreurs par frame ignorées (bruit normal)
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) {
        setCameraError("Tu as refusé l'accès à la caméra. Autorise-le dans les paramètres du navigateur.");
      } else if (msg.toLowerCase().includes('notsupported') || msg.toLowerCase().includes('insecure')) {
        setCameraError("La caméra n'est pas disponible sur ce navigateur ou cette connexion n'est pas sécurisée (HTTPS requis).");
      } else {
        setCameraError(`Impossible d'ouvrir la caméra : ${msg}`);
      }
      setState('idle');
    }
  }, [stopScanner]);

  // Message d'erreur OFF à afficher dans l'état not_found
  const [offError, setOffError] = useState<string | null>(null);

  // ── Recherche produit par EAN ─────────────────────────────────────────────
  const fetchProduct = useCallback(async (ean: string) => {
    setState('loading');
    setOffError(null);
    try {
      const result = await api.getProductByEan(ean);
      if (result.found && result.product) {
        setProduct(result.product);
        setSelectedVolume(null);
        setCustomVolume('');
        setState('found');
      } else {
        setProduct(null);
        setState('not_found');
      }
    } catch {
      // Erreur réseau ou réponse 5xx du backend → message friendly
      setProduct(null);
      setOffError("😵 Open Food Facts ne répond pas. Essaie la saisie manuelle !");
      setState('not_found');
    }
  }, []);

  // ── Recherche textuelle ───────────────────────────────────────────────────
  const handleTextSearch = useCallback(async () => {
    const text = searchText.trim();
    if (!text) return;

    // Si c'est un EAN (uniquement des chiffres)
    if (/^\d{8,14}$/.test(text)) {
      setSearchText('');
      await fetchProduct(text);
      return;
    }

    // Sinon → formulaire manuel pré-rempli avec le nom
    setManualName(text);
    setManualAbv('');
    setManualVolume('');
    setManualError(null);
    setSearchText('');
    setState('manual');
  }, [searchText, fetchProduct]);

  // ── Sélection de volume ───────────────────────────────────────────────────
  const handleVolumeSelect = (vol: number) => {
    setSelectedVolume(vol);
    setCustomVolume('');
  };

  const getFinalVolume = (): number | null => {
    if (selectedVolume !== null) return selectedVolume;
    const custom = parseInt(customVolume, 10);
    return isNaN(custom) || custom <= 0 ? null : custom;
  };

  // ── Ajout de la boisson scannée ───────────────────────────────────────────
  const handleAddFound = async () => {
    const vol = getFinalVolume();
    if (!vol || !product) return;

    setSubmitError(null);
    setState('submitting');

    try {
      await api.logDrink({
        name: product.name,
        abv: product.abv,
        volume_ml: vol,
        source: 'scan',
      });
      setAddedName(product.name);
      setState('added');
      // Rediriger vers l'accueil après 2 secondes
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');
      setState('found');
    }
  };

  const handleAddManual = async () => {
    const name = manualName.trim();
    const abv = parseFloat(manualAbv);
    const vol = parseInt(manualVolume, 10);

    if (!name) { setManualError('Le nom est obligatoire.'); return; }
    if (isNaN(abv) || abv < 0 || abv > 100) { setManualError('Le degré doit être entre 0 et 100.'); return; }
    if (isNaN(vol) || vol <= 0) { setManualError('Le volume doit être un nombre positif.'); return; }

    setManualError(null);
    setSubmitError(null);
    setState('submitting');

    try {
      await api.logDrink({ name, abv, volume_ml: vol, source: 'manual' });
      setAddedName(name);
      setState('added');
      // Rediriger vers l'accueil après 2 secondes
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');
      setState('manual');
    }
  };

  // ── Réinitialisation ──────────────────────────────────────────────────────
  const reset = () => {
    stopScanner();
    setProduct(null);
    setSelectedVolume(null);
    setCustomVolume('');
    setCameraError(null);
    setOffError(null);
    setManualName('');
    setManualAbv('');
    setManualVolume('');
    setManualError(null);
    setState('idle');
  };

  const goToManual = () => {
    setManualName(product?.name ?? '');
    setManualAbv(product ? String(product.abv) : '');
    setManualVolume('');
    setManualError(null);
    setProduct(null);
    setState('manual');
  };

  // ── Volumes disponibles selon le produit ──────────────────────────────────
  const volumeOptions = VOLUME_OPTIONS[product?.category ?? 'other'];

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <h1>📷 Scanner</h1>
      <p className="subtitle">Scanne ou recherche ta boisson</p>

      {/* ── Barre de recherche textuelle ── */}
      {(state === 'idle' || state === 'scanning') && (
        <div className="card scanner-search-bar">
          <input
            className="scanner-input"
            type="text"
            placeholder="Nom de la boisson ou code EAN…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTextSearch()}
          />
          <button className="btn-secondary" onClick={handleTextSearch} disabled={!searchText.trim()}>
            Rechercher
          </button>
        </div>
      )}

      {/* ── Erreur caméra ── */}
      {cameraError && (
        <div className="card scanner-error">
          <p>⚠️ {cameraError}</p>
        </div>
      )}

      {/* ── État idle : boutons d'action ── */}
      {state === 'idle' && (
        <>
          <div className="card">
            <h2>Scanner un code-barres</h2>
            <p className="text-muted">Utilise la caméra de ton téléphone pour scanner une boisson.</p>
            <button className="btn-primary" onClick={startScanner}>
              📷 Ouvrir la caméra
            </button>
          </div>
          <div className="card">
            <h2>Saisie manuelle</h2>
            <p className="text-muted">Tu n'as pas le code EAN ? Entre les infos à la main.</p>
            <button
              className="btn-secondary"
              style={{ marginTop: 12 }}
              onClick={() => { setManualName(''); setManualAbv(''); setManualVolume(''); setManualError(null); setState('manual'); }}
            >
              ✏️ Saisie manuelle
            </button>
          </div>
        </>
      )}

      {/* ── Scanner actif ── */}
      {state === 'scanning' && (
        <div className="card">
          <div id={SCANNER_ELEMENT_ID} className="scanner-viewport" />
          <p className="scanner-hint">Pointe la caméra vers le code-barres de la boisson</p>
          <button className="btn-secondary" style={{ marginTop: 12 }} onClick={reset}>
            Annuler
          </button>
        </div>
      )}

      {/* ── Chargement / Envoi ── */}
      {(state === 'loading' || state === 'submitting') && (
        <div className="card page-centered">
          <p>{state === 'loading' ? '🔍 Recherche en cours…' : '⏳ Enregistrement…'}</p>
        </div>
      )}

      {/* ── Produit trouvé ── */}
      {state === 'found' && product && (
        <div className="card">
          <div className="product-result">
            {product.image_url && (
              <img className="product-image" src={product.image_url} alt={product.name} />
            )}
            <div className="product-info">
              <h2>{product.name}</h2>
              {product.brand && <p className="product-brand">{product.brand}</p>}
              <p className="product-abv">{product.abv.toFixed(1)}° alc.</p>
            </div>
          </div>

          <h3 className="volume-label">Quelle quantité ?</h3>
          <div className="volume-buttons">
            {volumeOptions.map((opt) => (
              <button
                key={opt.value}
                className={`btn-volume ${selectedVolume === opt.value ? 'selected' : ''}`}
                onClick={() => handleVolumeSelect(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="volume-custom-row">
            <input
              className="scanner-input"
              type="number"
              placeholder="Autre volume (ml)"
              value={customVolume}
              min={1}
              onChange={(e) => { setCustomVolume(e.target.value); setSelectedVolume(null); }}
            />
          </div>

          {submitError && <p className="scanner-error-inline">{submitError}</p>}

          <button
            className="btn-primary"
            onClick={handleAddFound}
            disabled={getFinalVolume() === null}
          >
            Ajouter cette boisson
          </button>
          <button className="btn-ghost" onClick={goToManual}>
            Ce n'est pas ça →
          </button>
          <button className="btn-ghost" onClick={reset}>
            Annuler
          </button>
        </div>
      )}

      {/* ── Produit non trouvé ── */}
      {state === 'not_found' && (
        <div className="card">
          {offError ? (
            <>
              <p className="scanner-not-found">{offError}</p>
              <button
                className="btn-primary"
                onClick={() => { setOffError(null); setManualName(''); setManualAbv(''); setManualVolume(''); setManualError(null); setState('manual'); }}
              >
                ✏️ Saisie manuelle
              </button>
            </>
          ) : (
            <>
              <p className="scanner-not-found">😕 Produit non trouvé dans la base.</p>
              <p className="text-muted">Tu peux le saisir manuellement.</p>
              <button className="btn-primary" onClick={() => { setManualName(''); setManualAbv(''); setManualVolume(''); setManualError(null); setState('manual'); }}>
                ✏️ Saisie manuelle
              </button>
            </>
          )}
          <button className="btn-ghost" onClick={startScanner}>
            🔄 Réessayer le scan
          </button>
          <button className="btn-ghost" onClick={reset}>
            Annuler
          </button>
        </div>
      )}

      {/* ── Formulaire de saisie manuelle ── */}
      {state === 'manual' && (
        <div className="card">
          <h2>Saisie manuelle</h2>

          {manualError && <p className="scanner-error-inline">{manualError}</p>}

          <label className="form-label">Nom de la boisson</label>
          <input
            className="scanner-input"
            type="text"
            placeholder="Ex : Heineken, Bordeaux…"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
          />

          <label className="form-label" style={{ marginTop: 12 }}>Degré d'alcool (%)</label>
          <input
            className="scanner-input"
            type="number"
            placeholder="Ex : 5.0"
            value={manualAbv}
            min={0}
            max={100}
            step={0.1}
            onChange={(e) => setManualAbv(e.target.value)}
          />

          <label className="form-label" style={{ marginTop: 12 }}>Volume (ml)</label>
          <div className="volume-buttons" style={{ marginBottom: 8 }}>
            {VOLUME_OPTIONS.other.map((opt) => (
              <button
                key={opt.value}
                className={`btn-volume ${manualVolume === String(opt.value) ? 'selected' : ''}`}
                onClick={() => setManualVolume(String(opt.value))}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <input
            className="scanner-input"
            type="number"
            placeholder="Ou entre un volume personnalisé (ml)"
            value={manualVolume}
            min={1}
            onChange={(e) => setManualVolume(e.target.value)}
          />

          {submitError && <p className="scanner-error-inline">{submitError}</p>}

          <button className="btn-primary" onClick={handleAddManual} style={{ marginTop: 16 }}>
            Ajouter cette boisson
          </button>
          <button className="btn-ghost" onClick={reset}>
            Annuler
          </button>
        </div>
      )}

      {/* ── Succès ── */}
      {state === 'added' && (
        <div className="card scanner-success">
          <p>✅ <strong>{addedName}</strong> ajoutée ! Redirection vers l'accueil…</p>
          <button className="btn-primary" onClick={reset} style={{ marginTop: 16 }}>
            Ajouter une autre boisson
          </button>
        </div>
      )}

      <p className="disclaimer">BMV fournit une estimation. Ne remplace jamais un éthylotest certifié.</p>
    </div>
  );
};

export default Scanner;
