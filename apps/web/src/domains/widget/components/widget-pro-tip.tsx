export function WidgetProTip() {
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-xl p-6">
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-primary font-semibold">💡</span>
        </div>
        <div>
          <h4 className="font-medium text-sm mb-1">Pro Tip</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Choose a brand color that complements your website's design for
            seamless integration.
          </p>
        </div>
      </div>
    </div>
  );
}
