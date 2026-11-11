export default function SakuraBloom({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`sakura-bloom ${className}`}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="currentColor">
        {[0, 72, 144, 216, 288].map((angle) => (
          <path
            key={angle}
            transform={`rotate(${angle} 32 32)`}
            d="M32 33C8 18 22 0 29 9l3 4 3-4c7-9 21 9-3 24Z"
          />
        ))}
      </g>
      <circle cx="32" cy="32" r="5" fill="#fff5df" />
      <circle cx="32" cy="32" r="2" fill="#c16a95" />
    </svg>
  )
}
