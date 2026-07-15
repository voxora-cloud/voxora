import type { ReactNode } from "react";
import { ArrowLeft, Check, LockKeyhole } from "lucide-react";

interface ChannelSetupLayoutProps {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  benefits: string[];
  onBack: () => void;
  children: ReactNode;
}

export function ChannelSetupLayout({
  icon,
  eyebrow,
  title,
  description,
  benefits,
  onBack,
  children,
}: ChannelSetupLayoutProps) {
  return (
    <div className="mx-auto max-w-5xl">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        id="btn-back-to-channels"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to channels
      </button>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-muted/25 p-6 lg:border-b-0 lg:border-r lg:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/70 bg-background shadow-xs">
            {icon}
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>

          <div className="mt-7 space-y-3">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-start gap-2.5 text-sm text-foreground/85">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-3 w-3" />
                </span>
                <span className="leading-5">{benefit}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-start gap-2.5 rounded-lg border border-border/70 bg-background/80 p-3 text-xs leading-5 text-muted-foreground">
            <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            Secret values are masked after setup and used only to operate this channel.
          </div>
        </aside>

        <main className="min-w-0 p-5 sm:p-7 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

interface SetupFieldProps {
  label: string;
  htmlFor: string;
  hint: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}

export function SetupField({
  label,
  htmlFor,
  hint,
  error,
  optional = false,
  children,
}: SetupFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">
          {label}
        </label>
        {optional && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Optional
          </span>
        )}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">{hint}</p>
      {children}
      {error && (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const setupInputClassName =
  "h-11 rounded-lg border-border bg-background px-3 shadow-xs focus-visible:border-primary focus-visible:ring-primary/15";
