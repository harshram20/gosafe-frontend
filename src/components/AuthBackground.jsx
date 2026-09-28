import React from 'react';

const AuthBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-black select-none">
      <style>{`
        @keyframes route-flow {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -200;
          }
        }
        @keyframes path-glow {
          0%, 100% {
            opacity: 0.75;
            stroke-width: 2.5px;
            filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.4));
          }
          50% {
            opacity: 1;
            stroke-width: 3.5px;
            filter: drop-shadow(0 0 14px rgba(255, 255, 255, 1));
          }
        }
        @keyframes path-glow-subtle {
          0%, 100% {
            opacity: 0.45;
            filter: drop-shadow(0 0 1px rgba(255, 255, 255, 0.2));
          }
          50% {
            opacity: 0.75;
            filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.7));
          }
        }
        .animate-route-flow-1 {
          animation: route-flow 16s linear infinite, path-glow 5s ease-in-out infinite;
        }
        .animate-route-flow-2 {
          animation: route-flow 24s linear infinite reverse, path-glow-subtle 7s ease-in-out infinite;
        }
        
        @keyframes pulse-opacity {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        .animate-pulse-opacity-1 {
          animation: pulse-opacity 5s ease-in-out infinite;
        }

        @keyframes pin-glow {
          0%, 100% {
            filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.5));
            transform: scale(1);
          }
          50% {
            filter: drop-shadow(0 0 16px rgba(255, 255, 255, 1));
            transform: scale(1.08);
          }
        }
        .animate-pin-glow-1 {
          transform-origin: 0px 0px;
          animation: pin-glow 4s ease-in-out infinite;
        }
        .animate-pin-glow-2 {
          transform-origin: 0px 0px;
          animation: pin-glow 4s ease-in-out infinite 2s;
        }

        @keyframes ambient-glow {
          0%, 100% {
            transform: scale(0.96);
            opacity: 0.35;
          }
          50% {
            transform: scale(1.06);
            opacity: 0.75;
          }
        }
        .animate-ambient-glow-1 {
          transform-origin: 0px 38px;
          animation: ambient-glow 6s ease-in-out infinite;
        }
        .animate-ambient-glow-2 {
          transform-origin: 0px 38px;
          animation: ambient-glow 6s ease-in-out infinite 3s;
        }

        @keyframes float-waypoint {
          0%, 100% { transform: translate(316px, 386px); }
          50% { transform: translate(316px, 376px); }
        }
        .animate-float-waypoint {
          animation: float-waypoint 4s ease-in-out infinite;
          transform-origin: 316px 386px;
        }
      `}</style>
      <svg
        className="w-full h-full"
        viewBox="0 0 1680 941"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* City grid pattern */}
          <pattern id="city-grid" width="120" height="120" patternUnits="userSpaceOnUse">
            <path d="M 120 0 L 0 0 0 120" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <path d="M 40 0 L 40 120 M 80 0 L 80 120 M 0 40 L 120 40 M 0 80 L 120 80" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
          </pattern>
          
          {/* Glow filters for paths & pins */}
          <filter id="glow-white" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-light" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Elliptical "ground glow" pool under each pin, like the light pooling in the reference image */}
          <radialGradient id="pin-pool" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* City grid fill */}
        <rect width="100%" height="100%" fill="url(#city-grid)" />

        {/* Abstract winding streets (curved city grid) */}
        <g stroke="rgba(255,255,255,0.06)" fill="none" strokeWidth="1.5" className="animate-pulse-opacity-1">
          <path d="M -100 150 Q 300 50 700 250 T 1500 100" />
          <path d="M -50 450 Q 400 300 800 600 T 1600 400" />
          <path d="M -100 800 Q 500 900 900 650 T 1700 800" />
          <path d="M 200 -100 Q 150 400 350 800 T 100 1500" />
          <path d="M 600 -100 Q 750 500 550 900 T 800 1500" />
          <path d="M 1100 -100 Q 950 450 1150 950 T 1000 1500" />
        </g>

        {/* Winding diagonal boulevard (thick street) */}
        <path
          d="M -100 300 C 200 150, 400 700, 1200 500"
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="4"
        />
        <path
          d="M 150 -50 C 700 500, 300 700, 950 1150"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="3"
        />

        {/* Main active route: left pin -> waypoint -> right pin, matching the reference image's curve */}
        <path
          d="M 282 468 C 450 580, 520 630, 750 605 C 950 585, 1100 480, 1455 300"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeDasharray="8 12"
          className="animate-route-flow-1"
        />
        <path
          d="M 150 -50 C 700 500, 300 700, 950 1150"
          fill="none"
          stroke="#d4d4d4"
          strokeWidth="1.5"
          strokeDasharray="5 10"
          className="animate-route-flow-2"
        />

        {/* Small muted waypoint pin along the route (unlit, hollow), as in the reference image */}
        <g className="animate-float-waypoint" opacity="0.55">
          <path d="M 0 -8 C -4 -8 -7 -5.5 -7 -1.5 C -7 2.5 0 9 0 9 C 0 9 7 2.5 7 -1.5 C 7 -5.5 4 -8 0 -8 Z" fill="none" stroke="#ffffff" strokeWidth="1.25" />
          <circle cx="0" cy="-1.5" r="2" fill="#ffffff" />
        </g>

        {/* Map Pins sitting on the route, each with an elliptical ground-glow pool beneath */}
        {/* Pin 1: Left */}
        <g transform="translate(282, 468)">
          <ellipse cx="0" cy="38" rx="115" ry="52" fill="url(#pin-pool)" className="animate-ambient-glow-1" />
          <g className="animate-pin-glow-1">
            <circle cx="0" cy="0" r="16" fill="none" stroke="#ffffff" strokeWidth="1" className="animate-ping opacity-25" style={{ animationDuration: '3s' }} />
            <circle cx="0" cy="0" r="14" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <path d="M 0 -12 C -6 -12 -10 -8 -10 -2 C -10 4 0 14 0 14 C 0 14 10 4 10 -2 C 10 -8 6 -12 0 -12 Z" fill="#ffffff" />
            <circle cx="0" cy="-2" r="3.5" fill="#000000" />
          </g>
        </g>

        {/* Pin 2: Right */}
        <g transform="translate(1455, 300)">
          <ellipse cx="0" cy="38" rx="115" ry="52" fill="url(#pin-pool)" className="animate-ambient-glow-2" />
          <g className="animate-pin-glow-2">
            <circle cx="0" cy="0" r="16" fill="none" stroke="#ffffff" strokeWidth="1" className="animate-ping opacity-25" style={{ animationDuration: '3s' }} />
            <circle cx="0" cy="0" r="14" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <path d="M 0 -12 C -6 -12 -10 -8 -10 -2 C -10 4 0 14 0 14 C 0 14 10 4 10 -2 C 10 -8 6 -12 0 -12 Z" fill="#ffffff" />
            <circle cx="0" cy="-2" r="3.5" fill="#000000" />
          </g>
        </g>
      </svg>
    </div>
  );
};

export default AuthBackground;