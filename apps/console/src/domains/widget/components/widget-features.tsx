import { MessageCircle } from "lucide-react";

const FEATURE_ITEMS = [
  "Real-time messaging with instant notifications",
  "Agent status indicators",
  "Mobile responsive design",
  "Customizable branding",
  "Contact form collection",
  "Lightning-fast performance",
];

export function WidgetFeatures() {
  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl overflow-hidden">
      <div className="p-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          Features
        </h3>
        <ul className="space-y-3 text-sm">
          {FEATURE_ITEMS.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <div className="w-1 h-1 rounded-full bg-primary mt-2" />
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
