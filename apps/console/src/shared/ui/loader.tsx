interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Loader({ size = 'md', className = '' }: LoaderProps) {
  const config = {
    sm: { containerWidth: '24px', containerHeight: '24px', barWidth: '2px', barHeight: '16px', gap: '3px' },
    md: { containerWidth: '60px', containerHeight: '60px', barWidth: '4px', barHeight: '36px', gap: '5px' },
    lg: { containerWidth: '96px', containerHeight: '96px', barWidth: '6px', barHeight: '56px', gap: '7px' },
  };

  const current = config[size] || config.md;

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scaleBar {
          0%, 40%, 100% {
            transform: scaleY(0.08);
          }
          20% {
            transform: scaleY(1);
          }
        }
        .interaone-loader {
          --speed-of-animation: 0.9s;
          display: flex;
          justify-content: center;
          align-items: center;
          width: ${current.containerWidth};
          height: ${current.containerHeight};
          gap: ${current.gap};
        }
        .interaone-loader span {
          width: ${current.barWidth};
          height: ${current.barHeight};
          background: var(--primary);
          animation: scaleBar var(--speed-of-animation) ease-in-out infinite;
          border-radius: 9999px;
        }
        .interaone-loader span:nth-child(1) {
          background: var(--primary);
        }
        .interaone-loader span:nth-child(2) {
          background: var(--secondary);
          animation-delay: -0.8s;
        }
        .interaone-loader span:nth-child(3) {
          background: var(--success);
          animation-delay: -0.7s;
        }
        .interaone-loader span:nth-child(4) {
          background: var(--warning);
          animation-delay: -0.6s;
        }
        .interaone-loader span:nth-child(5) {
          background: var(--destructive);
          animation-delay: -0.5s;
        }
      `}} />
      <div className="interaone-loader">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
}
