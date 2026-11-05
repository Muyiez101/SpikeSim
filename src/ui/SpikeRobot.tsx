import { en } from '../shared/strings/en';

/**
 * Original SVG art of a SPIKE-style driving base robot.
 * Yellow hub with a 5x5 light matrix, grey motor bricks on the sides,
 * black wheels, front-mounted distance and colour sensors.
 * All geometry drawn from scratch - no copied assets.
 */
export function SpikeRobot({ scale = 1, wheelSpin = 0 }: { scale?: number; wheelSpin?: number }) {
  return (
    <svg
      width={140 * scale}
      height={130 * scale}
      viewBox="0 0 140 130"
      role="img"
      aria-label={en.playground.robotImage}
    >
      <defs>
        <linearGradient id="hubGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd23f" />
          <stop offset="1" stopColor="#f5b800" />
        </linearGradient>
        <linearGradient id="frameGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9aa3b2" />
          <stop offset="1" stopColor="#6f7887" />
        </linearGradient>
        <radialGradient id="matrixGlow" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#7ee0ff" />
        </radialGradient>
      </defs>

      {/* cast shadow */}
      <ellipse cx="70" cy="122" rx="52" ry="7" fill="#172342" opacity="0.14" />

      {/* frame beams under the hub */}
      <rect x="26" y="86" width="88" height="12" rx="3" fill="url(#frameGrad)" />
      <rect x="26" y="98" width="88" height="8" rx="2" fill="#5d6470" />

      {/* wheels */}
      <g>
        <circle cx="24" cy="104" r="19" fill="#23272e" />
        <circle cx="24" cy="104" r="19" fill="none" stroke="#15181d" strokeWidth="3" />
        <circle cx="24" cy="104" r="10" fill="#a7aeb9" />
        <circle cx="24" cy="104" r="3" fill="#4a5160" />
        <g style={{ transform: `rotate(${wheelSpin}deg)`, transformOrigin: '24px 104px' }}>
          <rect x="22.5" y="86" width="3" height="8" rx="1" fill="#15181d" />
          <rect x="22.5" y="114" width="3" height="8" rx="1" fill="#15181d" />
          <rect x="6" y="102.5" width="8" height="3" rx="1" fill="#15181d" />
          <rect x="34" y="102.5" width="8" height="3" rx="1" fill="#15181d" />
        </g>
      </g>
      <g>
        <circle cx="116" cy="104" r="19" fill="#23272e" />
        <circle cx="116" cy="104" r="19" fill="none" stroke="#15181d" strokeWidth="3" />
        <circle cx="116" cy="104" r="10" fill="#a7aeb9" />
        <circle cx="116" cy="104" r="3" fill="#4a5160" />
        <g style={{ transform: `rotate(${wheelSpin}deg)`, transformOrigin: '116px 104px' }}>
          <rect x="114.5" y="86" width="3" height="8" rx="1" fill="#15181d" />
          <rect x="114.5" y="114" width="3" height="8" rx="1" fill="#15181d" />
          <rect x="98" y="102.5" width="8" height="3" rx="1" fill="#15181d" />
          <rect x="126" y="102.5" width="8" height="3" rx="1" fill="#15181d" />
        </g>
      </g>

      {/* left motor brick */}
      <g>
        <rect x="13" y="56" width="22" height="46" rx="4" fill="url(#frameGrad)" stroke="#4a5160" strokeWidth="1.5" />
        <rect x="13" y="56" width="22" height="10" rx="4" fill="#b8bfc9" opacity="0.7" />
        <circle cx="24" cy="86" r="8" fill="#8b93a0" stroke="#4a5160" strokeWidth="1.5" />
        <circle cx="24" cy="86" r="2.5" fill="#4a5160" />
        <text x="24" y="66" textAnchor="middle" fontSize="9" fontWeight="700" fill="#3c434f" fontFamily="Lexend, sans-serif">A</text>
      </g>

      {/* right motor brick */}
      <g>
        <rect x="105" y="56" width="22" height="46" rx="4" fill="url(#frameGrad)" stroke="#4a5160" strokeWidth="1.5" />
        <rect x="105" y="56" width="22" height="10" rx="4" fill="#b8bfc9" opacity="0.7" />
        <circle cx="116" cy="86" r="8" fill="#8b93a0" stroke="#4a5160" strokeWidth="1.5" />
        <circle cx="116" cy="86" r="2.5" fill="#4a5160" />
        <text x="116" y="66" textAnchor="middle" fontSize="9" fontWeight="700" fill="#3c434f" fontFamily="Lexend, sans-serif">B</text>
      </g>

      {/* yellow hub body */}
      <g>
        <rect x="38" y="14" width="64" height="88" rx="8" fill="url(#hubGrad)" stroke="#c99a00" strokeWidth="1.5" />
        {/* top buttons */}
        <rect x="46" y="18" width="20" height="7" rx="3.5" fill="#d9a600" />
        <rect x="74" y="18" width="20" height="7" rx="3.5" fill="#d9a600" />
        {/* center button */}
        <rect x="62" y="27" width="16" height="7" rx="3.5" fill="#e6b811" stroke="#c99a00" strokeWidth="1" />

        {/* 5x5 light matrix */}
        <g>
          <rect x="49" y="40" width="42" height="42" rx="4" fill="#101720" />
          {[0, 1, 2, 3, 4].map((row) =>
            [0, 1, 2, 3, 4].map((col) => {
              const on = row === 2 || col === 2;
              return (
                <rect
                  key={`${row}-${col}`}
                  x={51.5 + col * 7.8}
                  y={42.5 + row * 7.8}
                  width="6.2"
                  height="6.2"
                  rx="1.5"
                  fill={on ? 'url(#matrixGlow)' : '#1d2634'}
                />
              );
            }),
          )}
        </g>

        {/* port row */}
        <g fontFamily="Lexend, sans-serif" fontSize="7" fontWeight="700" fill="#8a6d00">
          {[['C', 44], ['D', 62], ['E', 80], ['F', 96]].map(([label, x]) => (
            <g key={label as string}>
              <rect x={(x as number) - 6} y="88" width="12" height="10" rx="2.5" fill="#e6b811" stroke="#c99a00" strokeWidth="1" />
              <text x={x as number} y="96" textAnchor="middle">{label as string}</text>
            </g>
          ))}
        </g>
      </g>

      {/* distance sensor, front top */}
      <g>
        <rect x="52" y="4" width="14" height="12" rx="3" fill="#4a5160" />
        <circle cx="56" cy="10" r="2.5" fill="#1c2128" />
        <circle cx="63" cy="10" r="2.5" fill="#1c2128" />
      </g>

      {/* colour sensor, front bottom */}
      <g>
        <rect x="74" y="4" width="12" height="12" rx="3" fill="#4a5160" />
        <circle cx="80" cy="10" r="3" fill="#22c55e" />
      </g>
    </svg>
  );
}
