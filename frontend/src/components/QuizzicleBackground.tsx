/**
 * Decorative full-screen background — completely hidden from assistive tech.
 * Features the Quizzicle logo in a quirky, funny style with floating ?s and stars.
 */
export default function QuizzicleBackground() {
  return (
    <div aria-hidden="true" className="qz-bg-wrapper">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        className="qz-bg-svg"
        role="presentation"
        focusable="false"
      >
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#12082a" />
            <stop offset="50%" stopColor="#0e1133" />
            <stop offset="100%" stopColor="#0a1f3a" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="sofglow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Dark gradient background ───────────────────────────────── */}
        <rect width="1200" height="800" fill="url(#bgGrad)" />

        {/* ── Large scattered question marks ────────────────────────── */}
        <text x="30"  y="220" fontSize="130" fontFamily="'Nunito','Arial Black',sans-serif" fontWeight="900"
              fill="#8B5CF6" opacity="0.12" transform="rotate(-18 30 220)" filter="url(#sofglow)">?</text>
        <text x="920" y="130" fontSize="100" fontFamily="'Nunito','Arial Black',sans-serif" fontWeight="900"
              fill="#F59E0B" opacity="0.12" transform="rotate(12 920 130)" filter="url(#sofglow)">?</text>
        <text x="140" y="680" fontSize="80"  fontFamily="'Nunito','Arial Black',sans-serif" fontWeight="900"
              fill="#10B981" opacity="0.14" transform="rotate(-8 140 680)" filter="url(#sofglow)">?</text>
        <text x="1060" y="620" fontSize="110" fontFamily="'Nunito','Arial Black',sans-serif" fontWeight="900"
              fill="#EC4899" opacity="0.12" transform="rotate(22 1060 620)" filter="url(#sofglow)">?</text>
        <text x="530" y="90"  fontSize="70"  fontFamily="'Nunito','Arial Black',sans-serif" fontWeight="900"
              fill="#60A5FA" opacity="0.11" transform="rotate(-5 530 90)"  filter="url(#sofglow)">?</text>
        <text x="700" y="760" fontSize="90"  fontFamily="'Nunito','Arial Black',sans-serif" fontWeight="900"
              fill="#A78BFA" opacity="0.11" transform="rotate(15 700 760)" filter="url(#sofglow)">?</text>

        {/* ── Exclamation marks ─────────────────────────────────────── */}
        <text x="380" y="310" fontSize="90" fontFamily="'Nunito','Arial Black',sans-serif" fontWeight="900"
              fill="#EC4899" opacity="0.09" transform="rotate(8 380 310)">!</text>
        <text x="830" y="530" fontSize="70" fontFamily="'Nunito','Arial Black',sans-serif" fontWeight="900"
              fill="#60A5FA" opacity="0.1"  transform="rotate(-14 830 530)">!</text>

        {/* ── Stars / sparkles ──────────────────────────────────────── */}
        <text x="155" y="85"  fontSize="32" fill="#F59E0B" opacity="0.35" filter="url(#sofglow)">★</text>
        <text x="975" y="260" fontSize="22" fill="#F59E0B" opacity="0.28">★</text>
        <text x="760" y="52"  fontSize="26" fill="#EC4899" opacity="0.22">★</text>
        <text x="90"  y="420" fontSize="16" fill="#60A5FA" opacity="0.32">✦</text>
        <text x="1110" y="410" fontSize="22" fill="#10B981" opacity="0.28">✦</text>
        <text x="480" y="760" fontSize="18" fill="#A78BFA" opacity="0.3">✦</text>
        <text x="650" y="30"  fontSize="20" fill="#F59E0B" opacity="0.2">✦</text>
        <text x="1050" y="100" fontSize="14" fill="#EC4899" opacity="0.3">✦</text>
        <text x="300" y="740" fontSize="24" fill="#60A5FA" opacity="0.22">★</text>

        {/* ── Lightning bolts ───────────────────────────────────────── */}
        <text x="415" y="710" fontSize="52" fill="#F59E0B" opacity="0.18">⚡</text>
        <text x="720" y="48"  fontSize="42" fill="#60A5FA" opacity="0.18">⚡</text>
        <text x="1130" y="730" fontSize="36" fill="#10B981" opacity="0.16">⚡</text>

        {/* ── Decorative circles ────────────────────────────────────── */}
        <circle cx="310"  cy="165" r="9"  fill="#F59E0B" opacity="0.2" />
        <circle cx="910"  cy="360" r="7"  fill="#8B5CF6" opacity="0.25" />
        <circle cx="160"  cy="510" r="11" fill="#10B981" opacity="0.18" />
        <circle cx="1065" cy="210" r="6"  fill="#EC4899" opacity="0.28" />
        <circle cx="580"  cy="720" r="13" fill="#60A5FA" opacity="0.15" />
        <circle cx="850"  cy="70"  r="8"  fill="#A78BFA" opacity="0.22" />
        <circle cx="50"   cy="700" r="10" fill="#F59E0B" opacity="0.18" />

        {/* ── Main "QUIZZICLE" logo ──────────────────────────────────── */}
        {/* Each letter in a different color; whole word slightly rotated for fun */}
        <g filter="url(#glow)" opacity="0.13">
          {/* Wobbly letters via individual transforms */}
          <text x="135" y="455" fontFamily="'Nunito','Arial Black',sans-serif" fontWeight="900"
                fontSize="148" fill="#F59E0B" transform="rotate(-4 135 455)">Q</text>
          <text x="237" y="448" fontFamily="'Nunito','Arial Black',sans-serif" fontWeight="900"
                fontSize="145" fill="#EC4899" transform="rotate(3 237 448)">U</text>
          <text x="338" y="458" fontFamily="'Nunito','Arial Black',sans-serif" fontWeight="900"
                fontSize="142" fill="#60A5FA" transform="rotate(-2 338 458)">I</text>
          <text x="385" y="443" fontFamily="'Nunito','Arial Black',sans-serif" fontWeight="900"
                fontSize="150" fill="#10B981" transform="rotate(5 385 443)">Z</text>
          <text x="486" y="452" fontFamily="'Nunito','Arial Black',sans-serif" fontWeight="900"
                fontSize="148" fill="#A78BFA" transform="rotate(-3 486 452)">Z</text>
          <text x="588" y="446" fontFamily="'Nunito','Arial Black',sans-serif" fontWeight="900"
                fontSize="144" fill="#F59E0B" transform="rotate(4 588 446)">I</text>
          <text x="632" y="455" fontFamily="'Nunito','Arial Black',sans-serif" fontWeight="900"
                fontSize="147" fill="#EC4899" transform="rotate(-5 632 455)">C</text>
          <text x="728" y="444" fontFamily="'Nunito','Arial Black',sans-serif" fontWeight="900"
                fontSize="150" fill="#60A5FA" transform="rotate(2 728 444)">L</text>
          <text x="815" y="453" fontFamily="'Nunito','Arial Black',sans-serif" fontWeight="900"
                fontSize="145" fill="#10B981" transform="rotate(-3 815 453)">E</text>
        </g>

        {/* ── Tiny brain emoji decorations ──────────────────────────── */}
        <text x="1150" y="50"  fontSize="42" opacity="0.15">🧠</text>
        <text x="20"   y="770" fontSize="38" opacity="0.13">🧠</text>
        <text x="580"  y="785" fontSize="34" opacity="0.12">💡</text>
      </svg>
    </div>
  );
}
