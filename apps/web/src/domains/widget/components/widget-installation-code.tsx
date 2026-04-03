import { Check, Code2, Copy, Terminal } from "lucide-react";

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
  const snippet = `<script\n  src="${cdnUrl}"\n  data-voxora-public-key="${publicKey || "your-widget-key"}"\n  async>\n</script>`;

  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 lg:px-8 pt-6 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Code2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Installation</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Paste this snippet before the closing{" "}
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">&lt;/body&gt;</code>{" "}
              tag
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-border/60">
        {/* Code panel — 3 cols */}
        <div className="lg:col-span-3 p-5 lg:p-6">
          {/* Editor chrome */}
          <div className="rounded-xl overflow-hidden border border-border/70 bg-[#0d0d0f]">
            {/* Titlebar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#151518] border-b border-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              </div>
              <span className="text-[11px] text-muted-foreground font-medium tracking-wide">index.html</span>
              <button
                type="button"
                onClick={onCopy}
                className={`cursor-pointer inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-[11px] font-semibold border transition-all duration-200 ${
                  isCopied
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:border-white/20 hover:text-white/80"
                }`}
              >
                {isCopied ? (
                  <><Check className="h-3 w-3" />Copied!</>
                ) : (
                  <><Copy className="h-3 w-3" />Copy</>
                )}
              </button>
            </div>

            {/* Line numbers + code */}
            <div className="flex overflow-x-auto">
              {/* Line numbers */}
              <div className="select-none px-3 py-4 text-right text-[12px] leading-6 text-white/20 font-mono border-r border-white/[0.04] flex-shrink-0">
                {snippet.split("\n").map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              {/* Code */}
              <pre className="py-4 px-4 text-[13px] leading-6 font-mono flex-1 min-w-0">
                {snippet.split("\n").map((line, i) => (
                  <div key={i} className="whitespace-pre">
                    {line.startsWith("  ") ? (
                      <><span className="text-white/30">{"  "}</span><span className="text-emerald-400/90">{line.trimStart()}</span></>
                    ) : line.startsWith("<script") ? (
                      <><span className="text-sky-400/90">&lt;</span><span className="text-violet-400">script</span></>
                    ) : line === "</script>" ? (
                      <><span className="text-sky-400/90">&lt;/</span><span className="text-violet-400">script</span><span className="text-sky-400/90">&gt;</span></>
                    ) : line === "  async>" ? (
                      <><span className="text-white/30">{"  "}</span><span className="text-amber-400/90">async</span><span className="text-sky-400/90">&gt;</span></>
                    ) : (
                      <span className="text-zinc-300">{line}</span>
                    )}
                  </div>
                ))}
              </pre>
            </div>
          </div>
        </div>

        {/* Steps panel — 2 cols */}
        <div className="lg:col-span-2 p-5 lg:p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">How to install</h4>
          </div>

          <ol className="space-y-4">
            {[
              { label: "Save your widget", desc: 'Click "Update Configuration" to save your current settings.' },
              { label: "Copy the snippet", desc: "Use the copy button in the code panel on the left." },
              { label: "Paste into HTML", desc: <>Add it before the closing <code className="text-xs bg-muted px-1 rounded font-mono">&lt;/body&gt;</code> tag on every page.</> },
              { label: "You're live 🎉", desc: "Publish your site — the widget appears automatically." },
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{step.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>

          {!isExistingWidget && (
            <div className="rounded-xl border border-warning/30 bg-warning/8 p-3 text-xs text-foreground/80 leading-relaxed">
              ⚠ Save your widget configuration first to get your real public key.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
