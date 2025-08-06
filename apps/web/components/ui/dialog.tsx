import * as React from "react";

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({
  open = false,
  onOpenChange: _onOpenChange,
  children,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
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
      className={`bg-white rounded-lg shadow-lg max-h-[90vh] overflow-y-auto p-6 w-full max-w-md mx-4 ${className || ""}`}
      {...props}
    >
      {children}
    </div>
  );
};

export { Dialog, DialogContent };
