import { useEffect } from "react";
import { useParams } from "react-router";

const WIDGET_SCRIPT_SRC =
  import.meta.env.VITE_WIDGET_URL ||
  "http://localhost:9001/interaone-widget/v1/InteraOne.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002/api/v1";

interface WindowWithInteraOneConfig extends Window {
  InteraOneConfig?: {
    publicKey: string;
    fullscreen: boolean;
    autoOpen: boolean;
    source: "qr" | "link" | "unknown";
  };
  InteraOne?: {
    open?: () => void;
    destroy?: () => void;
  };
}

const normalizeSource = (value: string | null): "qr" | "link" | "unknown" => {
  if (value === "qr" || value === "link") return value;
  return "unknown";
};

export default function QRScannerLandingPage() {
  const { publicKey } = useParams<{ publicKey: string }>();

  useEffect(() => {
    if (!publicKey) return;

    const win = window as WindowWithInteraOneConfig;
    const source = normalizeSource(new URLSearchParams(window.location.search).get("source"));
    let retries = 0;
    let openTimer: ReturnType<typeof window.setInterval> | null = null;

    const ensureOpened = () => {
      // Retry a few times because the external script may initialize after route mount.
      openTimer = window.setInterval(() => {
        retries += 1;
        win.InteraOne?.open?.();
        if (retries >= 20) {
          if (openTimer) {
            window.clearInterval(openTimer);
            openTimer = null;
          }
        }
      }, 150);
    };

    // Ensure a clean slate when users revisit this route.
    document.getElementById("InteraOne-qr-script")?.remove();
    document.getElementById("InteraOne-chat-button")?.remove();
    document.getElementById("InteraOne-widget-iframe")?.remove();
    win.InteraOne?.destroy?.();

    win.InteraOneConfig = {
      publicKey,
      fullscreen: true,
      autoOpen: true,
      source,
    };

    if (source === "qr") {
      fetch(`${API_URL}/widget/qr-scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ publicKey }),
      }).catch(() => {
        // QR scan tracking is best-effort
      });
    }

    const script = document.createElement("script");
    script.id = "InteraOne-qr-script";
    script.src = `${WIDGET_SCRIPT_SRC}${WIDGET_SCRIPT_SRC.includes("?") ? "&" : "?"}v=${Date.now()}`;
    script.async = true;
    script.setAttribute("data-InteraOne-public-key", publicKey);
    script.setAttribute("data-InteraOne-fullscreen", "true");
    script.setAttribute("data-InteraOne-auto-open", "true");
    script.setAttribute("data-InteraOne-source", source);
    script.addEventListener("load", ensureOpened, { once: true });
    document.body.appendChild(script);

    return () => {
      if (openTimer) {
        window.clearInterval(openTimer);
        openTimer = null;
      }
      win.InteraOne?.destroy?.();
      document.getElementById("InteraOne-qr-script")?.remove();
      document.getElementById("InteraOne-chat-button")?.remove();
      document.getElementById("InteraOne-widget-iframe")?.remove();
      delete win.InteraOneConfig;
    };
  }, [publicKey]);

  if (!publicKey) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">Invalid chat link. Please scan a valid InteraOne QR code.</p>
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
