"use client"

import { Toaster as Sonner } from "sonner"
import { useTheme } from "@/shared/theme/theme-context"
import { CheckCircle2, AlertCircle, Info, TriangleAlert } from "lucide-react"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton
      position="top-center"
      icons={{
        success: <CheckCircle2 className="h-4 w-4" />,
        error: <AlertCircle className="h-4 w-4" />,
        info: <Info className="h-4 w-4" />,
        warning: <TriangleAlert className="h-4 w-4" />,
      }}
      toastOptions={{
        classNames: {
          toast: [
            "group toast",
            "!bg-[var(--card)] !text-[var(--foreground)]",
            "!border !border-[var(--border)]",
            "!shadow-[var(--shadow-lg)]",
            "!rounded-xl",
            "!px-4 !py-3",
            "!min-w-[320px] !max-w-[420px]",
            "!backdrop-blur-sm",
          ].join(" "),
          title: "!text-[var(--foreground)] !font-semibold !text-sm !leading-snug",
          description: "!text-[var(--muted-foreground)] !text-xs !mt-0.5 !leading-relaxed",
          success: [
            "!border-l-2 !border-l-[var(--success)]",
            "[&>[data-icon]]:!text-[var(--success)]",
          ].join(" "),
          error: [
            "!border-l-2 !border-l-[var(--destructive)]",
            "[&>[data-icon]]:!text-[var(--destructive)]",
          ].join(" "),
          warning: [
            "!border-l-2 !border-l-[var(--warning)]",
            "[&>[data-icon]]:!text-[var(--warning)]",
          ].join(" "),
          info: [
            "!border-l-2 !border-l-[var(--info)]",
            "[&>[data-icon]]:!text-[var(--info)]",
          ].join(" "),
          closeButton: [
            "!bg-[var(--muted)] !border !border-[var(--border)]",
            "!text-[var(--muted-foreground)] hover:!text-[var(--foreground)]",
            "hover:!bg-[var(--accent)]",
            "!rounded-md !w-5 !h-5",
            "!transition-colors !duration-150",
          ].join(" "),
          actionButton:
            "!bg-[var(--primary)] !text-[var(--primary-foreground)] hover:!opacity-90 !rounded-md !text-xs !font-medium !px-3 !py-1.5 !transition-colors",
          cancelButton:
            "!bg-[var(--muted)] !text-[var(--muted-foreground)] hover:!text-[var(--foreground)] !rounded-md !text-xs !font-medium !px-3 !py-1.5 !transition-colors",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
