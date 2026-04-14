// InstallPrompt — Bandeau d'installation PWA (affiché une seule fois)
// Écoute l'événement beforeinstallprompt et propose l'installation
import React, { useEffect, useState } from 'react';

// Clé localStorage pour mémoriser le refus
const STORAGE_KEY = 'bmv-install-dismissed';

// Type de l'événement natif beforeinstallprompt (non standard, non inclus dans les types DOM)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt: React.FC = () => {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Ne pas afficher si déjà refusé
    if (localStorage.getItem(STORAGE_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible || !promptEvent) return null;

  const handleInstall = async () => {
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  return (
    <div className="install-prompt" role="banner">
      <span className="install-prompt-text">
        Installe BMV sur ton téléphone&nbsp;! 📱
      </span>
      <div className="install-prompt-actions">
        <button
          className="install-prompt-btn primary"
          onClick={handleInstall}
        >
          Installer
        </button>
        <button
          className="install-prompt-btn dismiss"
          onClick={handleDismiss}
        >
          Plus tard
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
