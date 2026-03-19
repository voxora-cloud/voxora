import { Button } from "@/shared/ui/button";
import { Check, Copy } from "lucide-react";

interface WidgetInstallationCodeProps {
  isExistingWidget: boolean;
  widgetId?: string;
  cdnUrl: string;
  isCopied: boolean;
  onCopy: () => void;
}

export function WidgetInstallationCode({
  isExistingWidget,
  widgetId,
  cdnUrl,
  isCopied,
  onCopy,
}: WidgetInstallationCodeProps) {
  const publicKey = isExistingWidget ? widgetId : "your-widget-key";

  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl overflow-hidden">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 border-b border-border">
        <div>
          <h3 className="text-lg font-semibold">Installation Code</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
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
          className="cursor-pointer rounded-lg border-border hover:bg-muted/40 transition-all w-full sm:w-auto flex-shrink-0"
          onClick={onCopy}
        >
          {isCopied ? (
            <>
              <Check className="h-4 w-4 mr-2 text-primary" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy Code
            </>
          )}
        </Button>
      </div>

      {/* Landscape body — code left, steps right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* Code block */}
        <div className="p-6">
          <div className="bg-muted/40 rounded-xl border border-border overflow-hidden h-full">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/60 border-b border-border">
              <span className="text-xs text-muted-foreground font-bold">HTML</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                <div className="w-2 h-2 rounded-full bg-green-500/50" />
              </div>
            </div>
            <pre className="p-5 overflow-x-auto">
              <code className="text-sm leading-relaxed text-foreground font-semibold font-mono">
                {`<script \n  src="${cdnUrl}" \n  data-voxora-public-key="${publicKey || "your-widget-key"}"\n  async>\n</script>`}
              </code>
            </pre>
          </div>
        </div>

        {/* Integration steps */}
        <div className="p-6">
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <span className="text-primary">📋</span>
            Integration Steps
          </h4>
          <ol className="space-y-4">
            {[
              "Copy the code snippet on the left.",
              <>
                Paste it into your website's HTML, just before the closing{" "}
                <span className="font-mono bg-muted/60 px-1 rounded text-xs">&lt;/body&gt;</span> tag.
              </>,
              "Save and publish your changes.",
              "The chat widget will appear automatically on your site.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-muted-foreground leading-snug">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
