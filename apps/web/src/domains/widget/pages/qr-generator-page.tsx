import { useMemo } from "react";
import { Link2, Download, Smartphone } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { authApi } from "@/domains/auth/api/auth.api";
import { useWidget } from "@/domains/widget/hooks";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Loader } from "@/shared/ui/loader";

const QR_CANVAS_ID = "voxora-qr-code-canvas";

export default function QRCodeGeneratorPage() {
  const { data: widget, isLoading } = useWidget();
  const orgRole = authApi.getOrgRole();

  const publicKey = widget?._id;

  const destinationUrl = useMemo(() => {
    if (!publicKey) return "";
    return `${window.location.origin}/c/${publicKey}`;
  }, [publicKey]);

  const handleDownload = () => {
    const canvas = document.getElementById(QR_CANVAS_ID) as HTMLCanvasElement | null;
    if (!canvas || !publicKey) return;

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `voxora-chat-qr-${publicKey}.png`;
    link.click();
  };

  if (orgRole !== "owner") {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">QR Code Access</h1>
        <p className="text-sm text-muted-foreground">
          Only workspace owners can generate branded chat QR codes.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  if (!publicKey) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">QR Code Generator</h1>
        <p className="text-sm text-muted-foreground">
          Create your widget first to generate a scan-ready chat QR code.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">QR Code Generator</h1>
        <p className="text-sm text-muted-foreground">
          Share this code in physical spaces so customers can open your full-screen mobile chat instantly.
        </p>
      </div>

      <Card className="border-border bg-card/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Standalone Chat QR
          </CardTitle>
          <CardDescription>
            Scanning this code opens a clean mobile landing page at /c/:publicKey powered by voxora.js.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-background p-6">
            <QRCodeCanvas
              id={QR_CANVAS_ID}
              value={destinationUrl}
              size={384}
              includeMargin
              level="H"
              bgColor="#ffffff"
              fgColor="#111111"
            />
            <div className="text-center text-xs text-muted-foreground break-all">{destinationUrl}</div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleDownload} className="cursor-pointer">
              <Download className="mr-2 h-4 w-4" />
              Download PNG
            </Button>
            <Button asChild variant="outline" className="cursor-pointer">
              <a href={destinationUrl} target="_blank" rel="noreferrer">
                <Link2 className="mr-2 h-4 w-4" />
                Open Landing Page
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
