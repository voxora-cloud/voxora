interface WidgetHeaderProps {
  title: string;
  subtitle: string;
}

export function WidgetHeader({ title, subtitle }: WidgetHeaderProps) {
  return (
    <div className="relative border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="text-muted-foreground mt-2">{subtitle}</p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-muted-foreground">Live Preview</span>
          </div>
        </div>
      </div>
    </div>
  );
}
