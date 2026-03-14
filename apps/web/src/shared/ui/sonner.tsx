"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton
      position="top-center"
      toastOptions={{
        classNames: {
          toast: [
            "group toast",
            "!bg-[#151515] !text-[#e5e7eb]",
            "!border !border-[#262626]",
            "!shadow-[0_8px_32px_rgba(0,0,0,0.6)]",
            "!rounded-xl",
            "!px-4 !py-3",
            "!min-w-[320px] !max-w-[420px]",
            "!backdrop-blur-sm",
          ].join(" "),
          title: "!text-[#e5e7eb] !font-semibold !text-sm !leading-snug",
          description: "!text-[#9ca3af] !text-xs !mt-0.5 !leading-relaxed",
          success: [
            "!border-l-2 !border-l-[#10b981]",
            "[&>[data-icon]]:!text-[#10b981]",
          ].join(" "),
          error: [
            "!border-l-2 !border-l-[#ef4444]",
            "[&>[data-icon]]:!text-[#ef4444]",
          ].join(" "),
          warning: [
            "!border-l-2 !border-l-[#f59e0b]",
            "[&>[data-icon]]:!text-[#f59e0b]",
          ].join(" "),
          info: [
            "!border-l-2 !border-l-[#3b82f6]",
            "[&>[data-icon]]:!text-[#3b82f6]",
          ].join(" "),
          closeButton: [
            "!bg-[#262626] !border !border-[#3a3a3a]",
            "!text-[#9ca3af] hover:!text-[#e5e7eb]",
            "hover:!bg-[#303030]",
            "!rounded-md !w-5 !h-5",
            "!transition-colors !duration-150",
          ].join(" "),
          actionButton:
            "!bg-[#10b981] !text-white hover:!bg-[#0d9e6e] !rounded-md !text-xs !font-medium !px-3 !py-1.5 !transition-colors",
          cancelButton:
            "!bg-[#262626] !text-[#9ca3af] hover:!text-[#e5e7eb] !rounded-md !text-xs !font-medium !px-3 !py-1.5 !transition-colors",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
