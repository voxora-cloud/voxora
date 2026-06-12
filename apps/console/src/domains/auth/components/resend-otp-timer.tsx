import { useState, useEffect } from "react";
import { Button } from "@/shared/ui/button";
import { Loader2 } from "lucide-react";

interface ResendOTPTimerProps {
  onResend: () => Promise<void>;
  disabled?: boolean;
}

export function ResendOTPTimer({ onResend, disabled }: ResendOTPTimerProps) {
  const [seconds, setSeconds] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (seconds > 0) {
      const timer = setTimeout(() => setSeconds(seconds - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [seconds]);

  const handleResend = async () => {
    try {
      setIsResending(true);
      await onResend();
      setSeconds(60); // 1 minute cooldown
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex items-center justify-between mt-2">
      <span className="text-sm text-muted-foreground">
        Didn't receive a code?
      </span>
      <Button
        type="button"
        variant="link"
        onClick={handleResend}
        disabled={disabled || seconds > 0 || isResending}
        className="h-auto p-0 text-primary font-bold hover:no-underline"
      >
        {isResending ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : null}
        {seconds > 0 ? `Resend in ${seconds}s` : "Resend code"}
      </Button>
    </div>
  );
}
