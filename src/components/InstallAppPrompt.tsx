import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Check, Sparkles } from "lucide-react";

export const InstallAppPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("dramahub_pwa_dismissed") === "true";
    } catch {
      return false;
    }
  });
  const [showIosInstructions, setShowIosInstructions] = useState<boolean>(false);

  useEffect(() => {
    // Check if running as installed standalone PWA
    const checkStandalone = 
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(checkStandalone);

    if (checkStandalone) return;

    // Handle beforeinstallprompt on Chrome / Android / Edge
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Detect iOS Safari if not installed
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIos && !checkStandalone && !isDismissed) {
      // Delay showing banner slightly on iOS for smooth entry
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [isDismissed]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } else {
      // Show iOS / Manual instructions
      setShowIosInstructions(true);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    try {
      localStorage.setItem("dramahub_pwa_dismissed", "true");
    } catch {
      // ignore
    }
  };

  if (isStandalone || !isVisible) return null;

  return (
    <>
      {/* Floating PWA Install Notification Bar */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-[#141414]/95 border border-red-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl animate-bounce-short">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-amber-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-900/40">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                Install DramaHub App
                <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black">FAST</span>
              </h4>
              <p className="text-[11px] text-gray-300 line-clamp-1">
                Install on Android & Desktop for instant fullscreen streaming!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 shadow-md shadow-red-900/30 transition-transform active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIosInstructions && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-white/10 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-500 flex items-center justify-center mx-auto">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Install on iOS / Safari</h3>
            <p className="text-xs text-gray-300 text-left leading-relaxed space-y-2">
              <span className="block">1. Tap the <strong>Share</strong> button at the bottom of Safari.</span>
              <span className="block">2. Scroll down and select <strong>"Add to Home Screen"</strong>.</span>
              <span className="block">3. Tap <strong>Add</strong> to launch DramaHub in standalone app mode.</span>
            </p>
            <button
              onClick={() => setShowIosInstructions(false)}
              className="w-full bg-red-600 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-red-500 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
