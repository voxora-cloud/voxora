import { useMemo, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import { Copy, Download, ImagePlus, Link2, Smartphone, Trash2, Upload } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { authApi } from "@/domains/auth/api/auth.api";
import { useAuth } from "@/domains/auth/hooks";
import { settingsApi } from "@/domains/settings/api/settings.api";
import { useOrganization } from "@/domains/settings/hooks";
import { useWidget } from "@/domains/widget/hooks";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Loader } from "@/shared/ui/loader";
import { storageApi } from "@/shared/lib/storage.api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Logo from "@/shared/components/logo";

const QR_CANVAS_ID = "InteraOne-qr-code-canvas";
const PAGE_TITLE = "Chat Access QR";
const DEFAULT_LOGO_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  renderToString(<Logo size={200} animate={false} />)
)}`;
const QR_SIZE = 320;
const QR_LOGO_SIZE = 46;
const QR_LOGO_BACKGROUND_SIZE = 62;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

const loadQrLogoImage = async (src: string) => {
  try {
    return await loadImage(src);
  } catch {
    return loadImage(DEFAULT_LOGO_URL);
  }
};

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
};

export default function QRCodeGeneratorPage() {
  const { data: widget, isLoading } = useWidget();
  const { organization, setOrganization } = useAuth();
  const { data: latestOrganization } = useOrganization(organization?._id);
  const queryClient = useQueryClient();
  const orgRole = authApi.getOrgRole();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoSuccess, setLogoSuccess] = useState<string | null>(null);

  const publicKey = widget?._id;
  const organizationLogoUrl = latestOrganization?.logoUrl || organization?.logoUrl || "";
  const qrLogoUrl = organizationLogoUrl || DEFAULT_LOGO_URL;

  const baseChatUrl = useMemo(() => {
    if (!publicKey) return "";
    return `${window.location.origin}/c/${publicKey}`;
  }, [publicKey]);
  const qrUrl = baseChatUrl ? `${baseChatUrl}?source=qr` : "";
  const directLinkUrl = baseChatUrl ? `${baseChatUrl}?source=link` : "";

  const handleDownload = async () => {
    const canvas = document.getElementById(QR_CANVAS_ID) as HTMLCanvasElement | null;
    if (!canvas || !publicKey) return;
    setIsDownloading(true);

    const qrSize = 360;
    const qrRadius = 28;
    const padding = 32;
    const titleHeight = 0;
    const footerHeight = 0;
    const exportWidth = qrSize + padding * 2;
    const exportHeight = padding + titleHeight + qrSize + footerHeight + padding;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) {
      setIsDownloading(false);
      return;
    }

    const qrX = (exportWidth - qrSize) / 2;
    const qrY = padding + titleHeight;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    try {
      ctx.save();
      drawRoundedRect(ctx, qrX, qrY, qrSize, qrSize, qrRadius);
      ctx.clip();
      ctx.drawImage(canvas, qrX, qrY, qrSize, qrSize);
      ctx.restore();

      const logoImage = await loadQrLogoImage(qrLogoUrl);
      const exportLogoScale = qrSize / QR_SIZE;
      const logoBackgroundSize = QR_LOGO_BACKGROUND_SIZE * exportLogoScale;
      const logoSize = QR_LOGO_SIZE * exportLogoScale;
      const logoBackgroundX = qrX + qrSize / 2 - logoBackgroundSize / 2;
      const logoBackgroundY = qrY + qrSize / 2 - logoBackgroundSize / 2;
      const logoX = qrX + qrSize / 2 - logoSize / 2;
      const logoY = qrY + qrSize / 2 - logoSize / 2;

      ctx.fillStyle = "#ffffff";
      drawRoundedRect(
        ctx,
        logoBackgroundX,
        logoBackgroundY,
        logoBackgroundSize,
        logoBackgroundSize,
        18,
      );
      ctx.fill();
      ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);


      const dataUrl = exportCanvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `InteraOne-chat-qr-${publicKey}.png`;
      link.click();
    } catch {
      toast.error("Could not prepare the QR export");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!directLinkUrl) return;

    try {
      await navigator.clipboard.writeText(directLinkUrl);
      toast.success("Direct link copied");
    } catch {
      toast.error("Could not copy the direct link");
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !organization?._id) return;

    setLogoError(null);
    setLogoSuccess(null);

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setLogoError("Upload a PNG or JPG logo.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Logo must be 2MB or smaller.");
      return;
    }

    setIsLogoUploading(true);

    try {
      const { data: uploadMeta } = await storageApi.generatePresignedUploadUrl(
        file.name,
        file.type,
        3600,
      );

      await storageApi.uploadFileWithPresignedUrl(uploadMeta.uploadUrl, file);

      const logoUrl = storageApi.getProxyFileUrl(uploadMeta.fileKey);
      const response = await settingsApi.updateOrganization(organization._id, {
        logoUrl,
      });

      const updatedOrganization = response.data.organization;
      setOrganization(updatedOrganization);
      queryClient.setQueryData(["organization", organization._id], response);
      queryClient.invalidateQueries({ queryKey: ["organization", organization._id] });
      setLogoSuccess("Logo uploaded and saved.");
      toast.success("Organization logo updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload logo";
      setLogoError(message);
      toast.error(message);
    } finally {
      setIsLogoUploading(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!organization?._id || isLogoUploading || !organizationLogoUrl) return;

    setIsLogoUploading(true);
    setLogoError(null);
    setLogoSuccess(null);

    try {
      const response = await settingsApi.updateOrganization(organization._id, {
        logoUrl: "",
      });

      const updatedOrganization = response.data.organization;
      setOrganization(updatedOrganization);
      queryClient.setQueryData(["organization", organization._id], response);
      queryClient.invalidateQueries({ queryKey: ["organization", organization._id] });
      setLogoSuccess("Logo removed. The default InteraOne logo will be used.");
      toast.success("Organization logo removed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove logo";
      setLogoError(message);
      toast.error(message);
    } finally {
      setIsLogoUploading(false);
    }
  };

  if (orgRole !== "owner") {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">QR Code Access</h1>
        <p className="text-sm text-muted-foreground">
          Only workspace owners can manage branded chat access QR codes.
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
        <h1 className="text-2xl font-semibold text-foreground">{PAGE_TITLE}</h1>
        <p className="text-sm text-muted-foreground">
          Create your widget first to generate a scan-ready chat QR code.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">QR Code</h1>
        <p className="text-sm text-muted-foreground">
          Share this branded code in physical spaces so customers can open your chat in one scan.
        </p>
      </div>

      <Card className="border-border bg-card/90 overflow-hidden">
        <div className="mx-auto w-full max-w-3xl p-6 md:p-8">
          <CardHeader className="p-0 text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Smartphone className="h-4 w-4" />
              Standalone Chat QR
            </CardTitle>
            <CardDescription>
              High-quality QR code for your chat widget.
            </CardDescription>
          </CardHeader>

          <CardContent className="mt-6 space-y-6 p-0">
            <div className="flex w-full flex-col items-center gap-5">
              <div className="relative inline-block">
                <div className="rounded-3xl overflow-hidden border border-border/70 shadow-sm">
                  <QRCodeCanvas
                    id={QR_CANVAS_ID}
                    value={qrUrl}
                    size={QR_SIZE}
                    includeMargin
                    level="H"
                    bgColor="#ffffff"
                    fgColor="#111111"
                    style={{ display: "block" }}
                  />
                </div>
                <div
                  className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-white p-2"
                  style={{ width: QR_LOGO_BACKGROUND_SIZE, height: QR_LOGO_BACKGROUND_SIZE }}
                >
                  <img
                    src={qrLogoUrl}
                    alt=""
                    className="object-contain"
                    style={{ width: QR_LOGO_SIZE, height: QR_LOGO_SIZE }}
                    onError={(event) => {
                      event.currentTarget.src = DEFAULT_LOGO_URL;
                    }}
                  />
                </div>
              </div>

              <div className="w-full space-y-3">
                <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Direct link
                    </div>
                    <a
                      href={directLinkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block break-all text-sm font-medium text-foreground hover:text-primary"
                    >
                      {directLinkUrl}
                    </a>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyLink}
                    className="cursor-pointer"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Direct Link
                  </Button>
                  <Button
                    type="button"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="cursor-pointer"
                  >
                    {isDownloading ? (
                      <>
                        <Loader size="sm" className="mr-2" />
                        Preparing...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Download QR
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/70 p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
                  <ImagePlus className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground">Organization Logo</div>
                  <p className="text-sm text-muted-foreground">
                    Upload a PNG or JPG logo for the QR center. The InteraOne logo is used by default.
                  </p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-white p-1">
                  <img
                    src={qrLogoUrl}
                    alt={organizationLogoUrl ? "Organization logo" : "InteraOne logo"}
                    className="h-full w-full object-contain"
                    onError={(event) => {
                      event.currentTarget.src = DEFAULT_LOGO_URL;
                    }}
                  />
                </div>
              </div>

              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleLogoUpload}
                className="hidden"
              />

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isLogoUploading}
                  className="cursor-pointer"
                >
                  {isLogoUploading ? (
                    <>
                      <Loader size="sm" className="mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {organizationLogoUrl ? "Replace Logo" : "Upload Logo"}
                    </>
                  )}
                </Button>
                {organizationLogoUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRemoveLogo}
                    disabled={isLogoUploading}
                    className="cursor-pointer text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove Logo
                  </Button>
                )}
                <span className="text-xs text-muted-foreground">
                  Max 2MB. PNG or JPG.
                </span>
              </div>

              {logoSuccess && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">{logoSuccess}</p>
              )}
              {logoError && (
                <p className="text-sm text-red-600 dark:text-red-400">{logoError}</p>
              )}
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
