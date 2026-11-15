/** Original vector illustration; the two sides react to the selected target. */
export const bedIllustration = `
<svg class="bed-illustration" viewBox="0 0 720 420" role="img" aria-label="Illustration des deux sommiers côte à côte">
  <defs>
    <linearGradient id="fabric" x2="0" y2="1"><stop stop-color="#a7aca3"/><stop offset="1" stop-color="#717b73"/></linearGradient>
    <linearGradient id="mattress" x2="0.5" y2="1"><stop stop-color="#fffefa"/><stop offset="1" stop-color="#e2e0d7"/></linearGradient>
    <linearGradient id="wood" x2="0" y2="1"><stop stop-color="#d3c1a5"/><stop offset="1" stop-color="#b09b7c"/></linearGradient>
    <filter id="shadow"><feGaussianBlur stdDeviation="15"/></filter>
  </defs>
  <ellipse cx="362" cy="350" rx="266" ry="29" fill="#536451" opacity=".13" filter="url(#shadow)"/>
  <path d="M146 218V101q0-21 22-25l290-22q21-2 28 14l51 131Z" fill="url(#wood)"/>
  <path d="M164 198V106l292-23 47 108" fill="none" stroke="#e1d3bd" stroke-width="2" opacity=".7"/>
  <path d="m133 270 384-39 84 64-372 56Z" fill="#2d3833"/>
  <path d="m229 351 372-56v19l-372 58Z" fill="#26332e"/>
  <path d="m133 270 96 81v21l-96-79Z" fill="#3d4a42"/>
  <path d="m157 294 5 32 14 12-1-31M254 356v29l16-3 2-29M558 311l-2 31 14-3 6-31" fill="#323a33"/>
  <g data-bed-side="left">
    <path class="bed-side" d="m139 216 185-21 93 80-186 30-92-65Z" fill="url(#fabric)"/>
    <path d="m139 216 92 68v21l-92-65Z" fill="#818c81"/>
    <path d="m143 194 179-17 92 76-182 28-89-65q-9-12 0-22Z" fill="url(#mattress)"/>
    <path d="m143 194 89 67 182-27v19l-182 28-89-65Z" fill="#ebe9e0"/>
    <path d="m167 166 121-12q10-1 15 5l29 23q5 7-5 9l-125 15q-9 1-14-5l-27-24q-7-7 6-11Z" fill="#fcfbf7"/>
    <path d="m179 175 111-11 29 20-115 14Z" fill="none" stroke="#dddcd1"/>
    <path d="m181 223 113-10 79 49-136 20Z" fill="#a6b3a4" opacity=".75"/>
    <path d="m230 262 155-22" fill="none" stroke="#839780" stroke-width="2" opacity=".5"/>
  </g>
  <g data-bed-side="right">
    <path class="bed-side" d="m328 194 185-20 90 77-184 25-91-60Z" fill="url(#fabric)"/>
    <path d="m419 276 184-25v24l-184 30Z" fill="#707c70"/>
    <path d="m331 175 175-17q11-1 18 5l79 67v21l-184 28-91-76q-8-16 3-28Z" fill="url(#mattress)"/>
    <path d="m419 257 184-27v21l-184 28Z" fill="#e2e1d7"/>
    <path d="m354 148 116-11q11-1 17 4l30 24q6 7-6 9l-118 15q-10 1-16-4l-30-25q-6-8 7-12Z" fill="#fffef9"/>
    <path d="m365 156 107-10 32 22-111 12Z" fill="none" stroke="#dddcd1"/>
    <path d="m368 203 109-11 79 49-134 20Z" fill="#a6b3a4" opacity=".75"/>
    <path d="m419 241 149-21" fill="none" stroke="#839780" stroke-width="2" opacity=".5"/>
  </g>
  <path class="underlight" d="m240 350 345-52" fill="none" stroke="#f2c572" stroke-width="7" stroke-linecap="round" opacity="0"/>
</svg>`;
