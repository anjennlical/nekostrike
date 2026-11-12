import { useId } from 'react'

/** Original vector scene. No reference image is embedded. */
export default function MochiStudio({ analyzing = false }: { analyzing?: boolean }) {
  const id = useId().replaceAll(':', '')
  const paint = (name: string) => `url(#${id}-${name})`
  return (
    <svg
      className="mochi-studio"
      data-analyzing={analyzing ? 'true' : 'false'}
      viewBox="0 0 600 440"
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
    >
      <title id={`${id}-title`}>Mochi no seu cantinho de criação</title>
      <desc id={`${id}-desc`}>
        Gatinha creme com laço rosa, balançando a cabeça com fones e digitando em um notebook lilás.
        Ao lado, uma caneca; pela janela, lua e cidade violeta. Sem som.
        {analyzing
          ? 'Mochi concentrada enquanto a requisição está em andamento.'
          : 'Cena decorativa; a animação não indica processamento de IA.'}
      </desc>
      <defs>
        <linearGradient id={`${id}-sky`} x2="0.2" y2="1">
          <stop stopColor="#352245" />
          <stop offset=".55" stopColor="#745383" />
          <stop offset="1" stopColor="#c48ab7" />
        </linearGradient>
        <linearGradient id={`${id}-frame`} x2="1" y2="1">
          <stop stopColor="#fff0fb" />
          <stop offset=".5" stopColor="#db9bcc" />
          <stop offset="1" stopColor="#9364a0" />
        </linearGradient>
        <linearGradient id={`${id}-fur`} x2=".6" y2="1">
          <stop stopColor="#fffef8" />
          <stop offset="1" stopColor="#ffe2ed" />
        </linearGradient>
        <linearGradient id={`${id}-pink`} x2=".7" y2="1">
          <stop stopColor="#ffc5e1" />
          <stop offset="1" stopColor="#d97bb0" />
        </linearGradient>
        <linearGradient id={`${id}-laptop`} x2="1" y2="1">
          <stop stopColor="#d3b9f5" />
          <stop offset=".45" stopColor="#aa75bc" />
          <stop offset="1" stopColor="#724f8e" />
        </linearGradient>
        <radialGradient id={`${id}-halo`}>
          <stop stopColor="#fff7e8" stopOpacity=".45" />
          <stop offset="1" stopColor="#fff7e8" stopOpacity="0" />
        </radialGradient>
        <pattern id={`${id}-windows`} width="19" height="24" patternUnits="userSpaceOnUse">
          <rect x="7" y="5" width="4" height="7" rx="1" fill="#f6b9dc" opacity=".7" />
        </pattern>
        <clipPath id={`${id}-window-clip`}>
          <rect x="239" y="27" width="329" height="285" rx="20" />
        </clipPath>
      </defs>
      <rect
        x="232"
        y="20"
        width="344"
        height="301"
        rx="26"
        fill={paint('frame')}
        stroke="#835375"
        strokeWidth="3"
      />
      <g clipPath={paint('window-clip')}>
        <rect x="239" y="27" width="329" height="285" fill={paint('sky')} />
        <circle cx="505" cy="83" r="70" fill={paint('halo')} />
        <path d="M522 48a30 30 0 1 0 16 48c-28 4-42-22-16-48Z" fill="#fff0ce" />
        <g fill="#e6bfe8">
          <circle cx="300" cy="60" r="2" />
          <circle cx="418" cy="81" r="2" />
          <circle cx="452" cy="40" r="1.5" />
          <circle cx="544" cy="145" r="2" />
          <circle cx="378" cy="46" r="1.5" />
        </g>
        <path d="m432 123 3-8 3 8 8 3-8 3-3 8-3-8-8-3Z" fill="#f9d6eb" />
        <g fill="#614268">
          <path d="M240 315V209h37v-25h33v131M315 315V169h40v146M363 315V220h23v-37h40v132M434 315V202h38v-39h25v152M503 315V223h27v-34h39v126" />
        </g>
        <path
          d="M240 315V209h37v-25h33v131M315 315V169h40v146M363 315V220h23v-37h40v132M434 315V202h38v-39h25v152M503 315V223h27v-34h39v126"
          fill={paint('windows')}
        />
        <path d="M397 27v287M239 149h329" stroke="#dba3cc" strokeWidth="6" opacity=".65" />
        <path
          d="m279 34-34 54m57-45-49 80m286 99-30 51"
          stroke="#f5cfed"
          strokeWidth="3"
          opacity=".18"
        />
      </g>
      <rect
        x="222"
        y="311"
        width="365"
        height="13"
        rx="6"
        fill="#ecc0da"
        stroke="#99638c"
        strokeWidth="2"
      />
      <path d="M540 254v53" stroke="#9f6588" strokeWidth="4" />
      <path d="M519 259h46l-6 46h-36Z" fill="#ffe0e8" stroke="#b17b99" strokeWidth="2" />
      <path
        d="M541 256c-30-9-26-37-13-30 9 6 13 20 13 30m0-4c26-14 24-35 12-28-10 5-12 17-12 28"
        fill="#bc98bb"
      />
      <ellipse cx="327" cy="398" rx="254" ry="23" fill="#9e568a" opacity=".13" />
      <path d="m82 354 452-4 55 43H38Z" fill="#efb5d2" stroke="#9f668f" strokeWidth="3" />
      <path d="M38 393h551v13H38Z" fill="#ce91b5" stroke="#9f668f" strokeWidth="2" />
      <g className="studio-tail studio-moving">
        <path
          d="M405 339c65 13 69-34 46-43-18-6-28 14-17 22"
          fill="none"
          stroke="#805774"
          strokeWidth="27"
          strokeLinecap="round"
        />
        <path
          d="M405 339c65 13 69-34 46-43-18-6-28 14-17 22"
          fill="none"
          stroke="#ffeced"
          strokeWidth="19"
          strokeLinecap="round"
        />
      </g>
      <g className="studio-body studio-moving">
        <path
          d="M267 254c-39 21-56 66-36 105h171c20-44-1-90-38-105"
          fill={paint('pink')}
          stroke="#805774"
          strokeWidth="3.5"
        />
        <path
          d="m267 264 46 41 47-41M310 306l-5 33m17-32 5 32"
          fill="none"
          stroke="#ad6692"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <g className="studio-head studio-moving">
        <path
          d="M232 142c-9-28-12-87 2-91 12-4 44 29 52 46 25-6 52-7 77-1 13-20 42-48 53-40 11 8 8 61-1 90 30 50 1 120-92 120-96 0-125-73-91-124Z"
          fill={paint('fur')}
          stroke="#6d485f"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path d="m240 70 6 60 27-24ZM403 75l-29 34 27 21Z" fill="#f4abc9" />
        <path d="m243 80 5 36 14-12m137-19-17 20 16 12" fill="#ffd2df" />
        <path
          d="M224 172c-13-88 38-116 99-116s113 38 102 117"
          fill="none"
          stroke="#6d485f"
          strokeWidth="20"
        />
        <path
          d="M224 172c-13-88 38-116 99-116s113 38 102 117"
          fill="none"
          stroke={paint('pink')}
          strokeWidth="13"
        />
        <path
          d="M237 124c30-36 136-45 173 3"
          fill="none"
          stroke="#fff2f6"
          strokeWidth="3"
          opacity=".5"
        />
        <g fill={paint('pink')} stroke="#805774" strokeWidth="3">
          <rect x="207" y="151" width="31" height="69" rx="15" transform="rotate(-8 222 185)" />
          <rect x="403" y="151" width="43" height="75" rx="20" transform="rotate(10 424 190)" />
        </g>
        <rect
          x="410"
          y="160"
          width="28"
          height="57"
          rx="14"
          fill="#ed9dc5"
          stroke="#ffe0ef"
          strokeWidth="2"
          transform="rotate(10 424 190)"
        />
        <g fill="#ffe8f4" transform="translate(424 189) rotate(10)">
          <ellipse cy="9" rx="7" ry="6" />
          <ellipse cx="-8" cy="-2" rx="3" ry="4" />
          <ellipse cx="0" cy="-7" rx="3" ry="4" />
          <ellipse cx="8" cy="-2" rx="3" ry="4" />
        </g>
        <ellipse cx="263" cy="212" rx="19" ry="10" fill="#f0aac8" opacity=".8" />
        <ellipse cx="373" cy="212" rx="19" ry="10" fill="#f0aac8" opacity=".8" />
        <path
          className="studio-eyes studio-moving"
          d="M270 190q12-17 24 0m48 0q12-17 24 0"
          fill="none"
          stroke="#69425c"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path d="m311 207 7 5 7-5Z" fill="#bd7298" />
        <path
          d="M318 213q-4 15-15 6m15-6q4 15 15 6"
          fill="none"
          stroke="#69425c"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="m244 198-14-3m15 13-14 3m157-12 11-2m-11 12 11 3"
          stroke="#bd90a9"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M365 104c-32-36-44-22-34 3 6 14 23 15 36 8 21 25 43 17 34-6-7-15-22-13-36-5Z"
          fill={paint('pink')}
          stroke="#925575"
          strokeWidth="3"
        />
        <circle cx="367" cy="110" r="10" fill="#ffc8e1" stroke="#925575" strokeWidth="3" />
      </g>
      <g className="studio-keyboard" stroke="#805774" strokeWidth="2">
        <path d="m283 319 70-1 42 36-72 21Z" fill="#e6c3ef" />
        <path d="m303 326 47-1 26 25-50 14Z" fill="#c59bd7" />
        <path
          d="m311 333 47-1m-41 8 47-1m-40 8 47-1m-46-20 24 24m-12-24 24 20"
          fill="none"
          opacity=".5"
        />
      </g>
      <g className="studio-paw-left studio-moving">
        <path
          d="M270 282c-21 7-23 32-7 47l34 10 15-19Z"
          fill={paint('pink')}
          stroke="#805774"
          strokeWidth="3"
        />
        <ellipse
          cx="307"
          cy="330"
          rx="21"
          ry="13"
          fill={paint('fur')}
          stroke="#805774"
          strokeWidth="3"
        />
        <path d="m306 329 2 7m7-8 2 7" stroke="#c498b1" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g className="studio-paw-right studio-moving">
        <path
          d="M391 283c29 2 32 43 8 60l-49 6-12-21Z"
          fill={paint('pink')}
          stroke="#805774"
          strokeWidth="3"
        />
        <ellipse
          cx="346"
          cy="339"
          rx="28"
          ry="16"
          transform="rotate(-12 346 339)"
          fill={paint('fur')}
          stroke="#805774"
          strokeWidth="3"
        />
        <path d="m336 337 2 8m8-10 2 8" stroke="#c498b1" strokeWidth="2" strokeLinecap="round" />
      </g>
      <path
        d="m136 285 149 1q8 0 11 9l29 81H165l-38-79q-5-11 9-12Z"
        fill={paint('laptop')}
        stroke="#69425c"
        strokeWidth="3.5"
      />
      <path
        d="m138 294 142 1 25 69H170Z"
        fill="none"
        stroke="#eed4fc"
        strokeWidth="2"
        opacity=".7"
      />
      <path
        d="m165 376 160-1 61 11q-3 8-20 9H179l-18-9Z"
        fill="#e6c3ef"
        stroke="#805774"
        strokeWidth="3"
      />
      <path
        d="m212 321-1-11 10 7h12l9-7 1 12c12 17-4 28-17 28-16 0-26-14-14-29Z"
        fill="none"
        stroke="#ffe9fb"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="m219 330 3 2m9 0 3-2m-11 8q3 3 6 0"
        fill="none"
        stroke="#ffe9fb"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M487 334c35-5 37 32 1 30" fill="none" stroke="#805774" strokeWidth="13" />
      <path d="M487 334c35-5 37 32 1 30" fill="none" stroke="#ffd7e8" strokeWidth="8" />
      <path d="M443 327h47v47q-23 18-47 0Z" fill="#ffe4ed" stroke="#805774" strokeWidth="3" />
      <ellipse
        cx="466.5"
        cy="327"
        rx="23.5"
        ry="7"
        fill="#936079"
        stroke="#805774"
        strokeWidth="3"
      />
      <g fill="#d47aa7">
        <ellipse cx="466" cy="360" rx="8" ry="7" />
        <ellipse cx="455" cy="349" rx="3.5" ry="4.5" />
        <ellipse cx="465" cy="344" rx="3.5" ry="4.5" />
        <ellipse cx="476" cy="349" rx="3.5" ry="4.5" />
      </g>
      <path
        className="studio-steam studio-moving"
        d="M463 311c-16-18 17-18 3-37m12 35c-7-10 12-14 5-23"
        fill="none"
        stroke="#fff4ef"
        strokeWidth="4"
        strokeLinecap="round"
        opacity=".7"
      />
      <path d="m87 345 37-6 8 24-38 7Z" fill="#ffeace" stroke="#c8979d" strokeWidth="2" />
      <path d="m99 350 17-3m-15 9 10-2" stroke="#c8979d" strokeWidth="2" />
      <g className="studio-sparkles" fill="#fff3d4">
        <path d="m182 90 4-12 4 12 12 4-12 4-4 12-4-12-12-4Z" />
        <path d="m469 221 3-9 3 9 9 3-9 3-3 9-3-9-9-3Z" />
      </g>
      <g fill="#ffe4f5" stroke="#9b5b8c" strokeWidth="1.5" aria-hidden="true">
        <g className="studio-note studio-note-one studio-moving">
          <path d="M477 170v-25l17-5v23h-4v-17l-9 3v21Z" />
          <ellipse cx="475" cy="171" rx="6" ry="4" />
          <ellipse cx="488" cy="164" rx="6" ry="4" />
        </g>
        <g className="studio-note studio-note-two studio-moving">
          <path d="M179 254v-22l12 5v5l-8-3v15Z" />
          <ellipse cx="177" cy="255" rx="6" ry="4" />
        </g>
      </g>
      <g transform="translate(66 147) rotate(-8)">
        <path d="M0 0h99v58H75l-1 14-20-14H0Z" fill="#724463" stroke="#fff0f8" strokeWidth="4" />
        <path
          d="m17 19 9 7-9 7m20 0h10m16-13c-9-9-20 3 0 16 20-13 9-25 0-16"
          fill="none"
          stroke="#ffcae5"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}
