interface WidgetHeaderProps {
  title: string;
  subtitle: string;
}

export function WidgetHeader({ title, subtitle }: WidgetHeaderProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}
