import { useId } from 'react'

export default function EvidenceIllustration() {
  const id = useId()
  return (
    <svg
      className="evidence-illustration"
      viewBox="0 0 360 220"
      role="img"
      aria-labelledby={`${id}-title`}
    >
      <title id={`${id}-title`}>Pasta de evidências com documentos e um escudo de patinha</title>
      <defs>
        <linearGradient id={`${id}-paper`} x2="1" y2="1">
          <stop stopColor="#fff9fc" />
          <stop offset="1" stopColor="#efdced" />
        </linearGradient>
        <linearGradient id={`${id}-folder`} x2=".8" y2="1">
          <stop stopColor="#f9cee4" />
          <stop offset="1" stopColor="#d99bc7" />
        </linearGradient>
      </defs>
      <ellipse cx="180" cy="198" rx="120" ry="10" fill="#9d6b9a" opacity=".12" />
      <circle cx="177" cy="105" r="86" fill="#f0e3f5" />
      <circle cx="177" cy="105" r="99" fill="none" stroke="#cbaad9" strokeDasharray="2 8" />
      <path d="M83 77h53l13 15h125v94H83Z" fill="#dcb9e2" stroke="#a979ac" strokeWidth="2" />
      <g transform="rotate(-9 165 112)">
        <rect
          x="110"
          y="38"
          width="113"
          height="136"
          rx="9"
          fill={`url(#${id}-paper)`}
          stroke="#af8cb9"
          strokeWidth="2"
        />
        <path
          d="M128 61h51m-51 13h70m-70 15h60m-60 15h70m-70 15h35"
          stroke="#c5accf"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="201" cy="56" r="6" fill="#f1c5dc" />
      </g>
      <g transform="rotate(8 222 120)">
        <rect
          x="176"
          y="66"
          width="76"
          height="106"
          rx="7"
          fill="#fff7f9"
          stroke="#bb8cac"
          strokeWidth="2"
        />
        <path
          d="M191 84h40m-40 12h32m-32 12h40m-40 12h23"
          stroke="#e0b6d0"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <path
        d="M72 116h91l13 12h108l-13 65H87Z"
        fill={`url(#${id}-folder)`}
        stroke="#aa7198"
        strokeWidth="2.5"
      />
      <path d="M89 131h62" stroke="#fff0f8" strokeWidth="3" strokeLinecap="round" />
      <path
        d="m235 112 32 12-4 30c-6 18-16 29-28 35-12-6-22-17-28-35l-4-30Z"
        fill="#c9afe4"
        stroke="#9471ad"
        strokeWidth="2.5"
      />
      <g fill="#fff5fc">
        <ellipse cx="235" cy="153" rx="11" ry="9" />
        <ellipse cx="220" cy="139" rx="4" ry="5" transform="rotate(-25 220 139)" />
        <ellipse cx="232" cy="134" rx="4" ry="5" />
        <ellipse cx="245" cy="137" rx="4" ry="5" transform="rotate(25 245 137)" />
      </g>
      <path
        d="m64 67 4-12 4 12 12 4-12 4-4 12-4-12-12-4m224-12 3-9 3 9 9 3-9 3-3 9-3-9-9-3"
        fill="#c293ba"
      />
      <circle cx="62" cy="151" r="5" fill="#ecc0d7" />
      <circle cx="291" cy="163" r="4" fill="#c6abd8" />
    </svg>
  )
}
