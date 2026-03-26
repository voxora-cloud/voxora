import { useEffect } from "react";
import { useParams } from "react-router";

const WIDGET_SCRIPT_SRC =
  import.meta.env.VITE_CDN_URL ||
  "http://localhost:9001/voxora-widget/v1/voxora.js";

interface WindowWithVoxoraConfig extends Window {
  voxoraConfig?: {
    publicKey: string;
    fullscreen: boolean;
    autoOpen: boolean;
  };
  Voxora?: {
    open?: () => void;
    destroy?: () => void;
  };
}

export default function QRScannerLandingPage() {
  const { publicKey } = useParams<{ publicKey: string }>();

  useEffect(() => {
    if (!publicKey) return;

    const win = window as WindowWithVoxoraConfig;
    let retries = 0;
    let openTimer: ReturnType<typeof window.setInterval> | null = null;

    const ensureOpened = () => {
      // Retry a few times because the external script may initialize after route mount.
      openTimer = window.setInterval(() => {
        retries += 1;
        win.Voxora?.open?.();
        if (retries >= 20) {
          if (openTimer) {
            window.clearInterval(openTimer);
            openTimer = null;
          }
        }
      }, 150);
    };

    // Ensure a clean slate when users revisit this route.
    document.getElementById("voxora-qr-script")?.remove();
    document.getElementById("voxora-chat-button")?.remove();
    document.getElementById("voxora-widget-iframe")?.remove();
    win.Voxora?.destroy?.();

    win.voxoraConfig = {
      publicKey,
      fullscreen: true,
      autoOpen: true,
    };

    const script = document.createElement("script");
    script.id = "voxora-qr-script";
    script.src = `${WIDGET_SCRIPT_SRC}${WIDGET_SCRIPT_SRC.includes("?") ? "&" : "?"}v=${Date.now()}`;
    script.async = true;
    script.setAttribute("data-voxora-public-key", publicKey);
    script.setAttribute("data-voxora-fullscreen", "true");
    script.setAttribute("data-voxora-auto-open", "true");
    script.addEventListener("load", ensureOpened, { once: true });
    document.body.appendChild(script);

    return () => {
      if (openTimer) {
        window.clearInterval(openTimer);
        openTimer = null;
      }
      win.Voxora?.destroy?.();
      document.getElementById("voxora-qr-script")?.remove();
      document.getElementById("voxora-chat-button")?.remove();
      document.getElementById("voxora-widget-iframe")?.remove();
      delete win.voxoraConfig;
    };
  }, [publicKey]);

  if (!publicKey) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">Invalid chat link. Please scan a valid Voxora QR code.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div className="space-y-2">
        <p className="text-base font-medium text-foreground">Opening secure chat...</p>
        <p className="text-sm text-muted-foreground">If chat does not appear, refresh this page.</p>
      </div>
    </main>
  );
}
