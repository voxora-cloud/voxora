import * as React from "react";

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({ open = false, children }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {children}
    </div>
  );
};

const DialogContent: React.FC<DialogContentProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={`bg-card rounded-lg shadow-xl max-h-[90vh] overflow-y-auto p-6 w-full max-w-md mx-4 border border-border ${className || ""}`}
      {...props}
    >
      {children}
    </div>
  );
};

export { Dialog, DialogContent };
