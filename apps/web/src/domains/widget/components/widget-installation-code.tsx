import { Button } from "@/shared/ui/button";
import { Check, Copy } from "lucide-react";

interface WidgetInstallationCodeProps {
  isExistingWidget: boolean;
  widgetId?: string;
  cdnUrl: string;
  apiRoot: string;
  isCopied: boolean;
  onCopy: () => void;
}

export function WidgetInstallationCode({
  isExistingWidget,
  widgetId,
  cdnUrl,
  apiRoot,
  isCopied,
  onCopy,
}: WidgetInstallationCodeProps) {
  const publicKey = isExistingWidget ? widgetId : "your-widget-key";

  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl overflow-hidden">
      <div className="p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold">Installation Code</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add this snippet before the closing{" "}
              <span className="font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded">
                &lt;/body&gt;
              </span>{" "}
              tag
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer rounded-lg border-border hover:bg-muted/40 transition-all w-full sm:w-auto"
            onClick={onCopy}
          >
            {isCopied ? (
              <>
                <Check className="h-4 w-4 sm:mr-2 text-primary" />
                <span className="hidden sm:inline">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Copy Code</span>
              </>
            )}
          </Button>
        </div>

        <div className="relative">
          <div className="relative bg-muted/40 rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/60 border-b border-border">
              <span className="text-xs text-muted-foreground font-bold">HTML</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                <div className="w-2 h-2 rounded-full bg-green-500/50" />
              </div>
            </div>
            <pre className="p-4 overflow-x-auto">
              <code className="text-sm leading-relaxed text-foreground font-semibold font-mono">
                {`<script 
  src=\"${cdnUrl}\" 
  data-voxora-public-key=\"${publicKey || "your-widget-key"}\"
  data-voxora-api-url=\"${apiRoot}\"
  async>
</script>`}
              </code>
            </pre>
          </div>
        </div>

        <div className="mt-4 p-4 rounded-lg bg-muted/40 border border-border">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <span className="text-primary">📋</span>
            Integration Steps
          </h4>
          <ol className="space-y-2 text-xs text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary font-semibold">1.</span>
              <span>Copy the code snippet above</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-semibold">2.</span>
              <span>
                Paste it into your website's HTML, just before the closing{" "}
                <span className="font-mono bg-muted/60 px-1 rounded">
                  &lt;/body&gt;
                </span>{" "}
                tag
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-semibold">3.</span>
              <span>Save and publish your changes</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-semibold">4.</span>
              <span>The chat widget will appear automatically on your site</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
