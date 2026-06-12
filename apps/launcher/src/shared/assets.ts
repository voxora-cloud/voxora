export const INTERAONE_LOGO_SVG = `
<svg viewBox="0 0 200 200" width="40" height="40" style="display:block" xmlns="http://www.w3.org/2000/svg">
  <style>
    @keyframes barGrow {
      0%, 100% { transform: scaleY(1); }
      50% { transform: scaleY(0.6); }
    }
    .logo-bar {
      transform-box: fill-box;
      transform-origin: bottom;
      animation: barGrow 2s ease-in-out infinite;
    }
    .bar-1 { animation-delay: 0s; }
    .bar-2 { animation-delay: 0.2s; }
    .bar-3 { animation-delay: 0.4s; }
    .bar-4 { animation-delay: 0.6s; }
    .bar-5 { animation-delay: 0.8s; }
  </style>
  <rect x="5" y="5" width="190" height="190" rx="30" fill="#845C6C"/>
  <rect x="50" y="90" width="10" height="40" rx="5" fill="white" class="logo-bar bar-1"/>
  <rect x="70" y="70" width="10" height="60" rx="5" fill="white" class="logo-bar bar-2"/>
  <rect x="90" y="50" width="10" height="80" rx="5" fill="white" class="logo-bar bar-3"/>
  <rect x="110" y="70" width="10" height="60" rx="5" fill="white" class="logo-bar bar-4"/>
  <rect x="130" y="90" width="10" height="40" rx="5" fill="white" class="logo-bar bar-5"/>
  <circle cx="75" cy="145" r="6" fill="white"/>
  <circle cx="100" cy="145" r="6" fill="white"/>
  <circle cx="125" cy="145" r="6" fill="white"/>
</svg>`;
