interface LogoProps {
  size?: number;
  className?: string;
  color?: string;
  animate?: boolean;
  speed?: number; // seconds
}

const Logo = ({
  size = 40,
  className,
  color = "#845C6C",
  animate = true,
  speed = 2,
}: LogoProps) => {
  const bars = [40, 60, 80, 60, 40];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      style={{ display: "block" }}
    >
      {/* Background */}
      <rect x="5" y="5" width="190" height="190" rx="30" fill={color} />

      {/* Bars */}
      {bars.map((h, i) => {
        const x = 50 + i * 20;
        const y = 130 - h;

        return (
          <rect
            key={i}
            x={x}
            y={y}
            width="10"
            height={h}
            rx="5"
            fill="white"
            style={
              animate
                ? {
                  transformOrigin: "bottom",
                  transformBox: "fill-box",
                  animation: `barGrow ${speed}s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                }
                : undefined
            }
          />
        );
      })}

      {/* Dots */}
      {[75, 100, 125].map((cx, i) => (
        <circle key={i} cx={cx} cy="145" r="6" fill="white" />
      ))}

      {/* Animation */}
      {animate && (
        <style>
          {`
            @keyframes barGrow {
              0%, 100% { transform: scaleY(1); }
              50% { transform: scaleY(0.6); }
            }
          `}
        </style>
      )}
    </svg>
  );
};

export default Logo;