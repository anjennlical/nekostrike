import type { MochiEmotion } from '../mochi-state'

export default function Mochi({
  compact = false,
  emotion = 'idle',
  decorative = false,
}: {
  compact?: boolean
  emotion?: MochiEmotion
  decorative?: boolean
}) {
  return (
    <svg
      className={compact ? 'mochi compact' : 'mochi'}
      viewBox="0 0 340 270"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      focusable="false"
      aria-label={
        decorative ? undefined : 'Mochi, uma gatinha creme com laço rosa e escudo de coração'
      }
    >
      <ellipse cx="176" cy="246" rx="104" ry="12" fill="#705b8b" opacity=".09" />
      <circle cx="174" cy="131" r="106" fill="#fffdfb" opacity=".6" />
      <circle
        cx="174"
        cy="131"
        r="121"
        fill="none"
        stroke="#b9a1d7"
        strokeDasharray="3 9"
        opacity=".45"
      />
      <g className="mochi-body mochi-animated">
        <g className="mochi-tail mochi-animated">
          <path
            d="M240 218c59 3 59-48 32-48-17 0-16 20-7 22"
            fill="none"
            stroke="#8b729e"
            strokeWidth="26"
            strokeLinecap="round"
          />
          <path
            d="M240 218c59 3 59-48 32-48-17 0-16 20-7 22"
            fill="none"
            stroke="#fff9f4"
            strokeWidth="19"
            strokeLinecap="round"
          />
        </g>
        <path
          d="M112 179c-18 18-24 45-14 59 12 15 133 15 146-1 10-15-2-43-19-58"
          fill="#fff9f4"
          stroke="#8b729e"
          strokeWidth="3.5"
        />
        <g className="mochi-gaze mochi-animated">
          <path
            d="M91 107C84 77 86 43 95 40c9-3 42 20 49 33 22-5 40-5 62 0 10-15 34-34 43-30 9 3 11 38 4 67 24 38 10 88-78 90-88 1-110-50-84-93Z"
            fill="#fffdfb"
            stroke="#8b729e"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path d="m99 58 5 38 25-14Z M238 60l-27 23 27 13Z" fill="#f7cbdc" />
          <ellipse cx="116" cy="146" rx="16" ry="9" fill="#f5b5d1" opacity=".65" />
          <ellipse cx="231" cy="146" rx="16" ry="9" fill="#f5b5d1" opacity=".65" />
          <g className="mochi-eyes mochi-animated">
            {emotion === 'warning' ? (
              <g fill="#5a4269">
                <ellipse cx="141" cy="122" rx="4" ry="6" />
                <ellipse cx="208" cy="122" rx="4" ry="6" />
              </g>
            ) : (
              <path
                d={
                  emotion === 'thinking'
                    ? 'M133 124h16m51 0h16'
                    : emotion === 'error'
                      ? 'M132 122q9 9 18 0m49 0q9 9 18 0'
                      : 'M132 126q9-12 18 0m49 0q9-12 18 0'
                }
                stroke="#5a4269"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
              />
            )}
          </g>
          <path
            d="m168 139 7 5 7-5"
            fill="#d693ad"
            stroke="#d693ad"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d={
              emotion === 'error'
                ? 'M164 154q11-9 22 0'
                : emotion === 'warning'
                  ? 'M169 151h12'
                  : 'M175 145q-3 13-12 6m12-6q3 13 12 6'
            }
            fill="none"
            stroke="#5a4269"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="m100 133-17-3m18 13-18 3m164-13 17-3m-18 13 18 3"
            stroke="#b7a3bf"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M218 77c-24-28-33-22-31-4s17 21 31 14c17 22 33 15 29-1s-16-15-29-9Z"
            fill="#efa8c5"
            stroke="#c57b9e"
            strokeWidth="2.5"
          />
          <circle cx="218" cy="82" r="7" fill="#f8d4e3" stroke="#c57b9e" strokeWidth="2" />
        </g>
        <path
          d="m175 184 29 11-4 28q-7 17-25 25-18-8-25-25l-4-28Z"
          fill="#cdb9f4"
          stroke="#8b729e"
          strokeWidth="3"
        />
        <path d="M175 209c-12-13-24 5 0 20 24-15 12-33 0-20" fill="#fffdfb" />
        <ellipse
          cx="143"
          cy="208"
          rx="13"
          ry="10"
          fill="#fffdfb"
          stroke="#8b729e"
          strokeWidth="3"
          transform="rotate(-25 143 208)"
        />
        <ellipse
          cx="207"
          cy="208"
          rx="13"
          ry="10"
          fill="#fffdfb"
          stroke="#8b729e"
          strokeWidth="3"
          transform="rotate(25 207 208)"
        />
      </g>
      <path
        d="m54 94 3-10 3 10 10 3-10 3-3 10-3-10-10-3Z M284 125l3-9 3 9 9 3-9 3-3 9-3-9-9-3Z"
        fill="#b39bd4"
      />
      <circle cx="66" cy="183" r="5" fill="#f1b2cc" />
      <circle cx="285" cy="63" r="4" fill="#f1b2cc" />
    </svg>
  )
}
