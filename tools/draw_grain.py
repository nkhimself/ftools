#!/usr/bin/env python3
"""Generate the original grain-studies illustration used by the Logarina theme."""
from pathlib import Path
from random import Random

out = Path(__file__).resolve().parents[1] / 'grain-study.svg'
rng = Random(24)
parts = ['''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 920">
<defs>
  <radialGradient id="field" cx="34%" cy="36%" r="78%"><stop stop-color="#737c42"/><stop offset=".39" stop-color="#3c5335"/><stop offset=".77" stop-color="#20372a"/><stop offset="1" stop-color="#132720"/></radialGradient>
  <radialGradient id="light"><stop stop-color="#e1ce84" stop-opacity=".36"/><stop offset="1" stop-color="#cbca7f" stop-opacity="0"/></radialGradient>
  <linearGradient id="seed" x2=".83" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#726036"/><stop offset=".3" stop-color="#c8a45d"/><stop offset=".52" stop-color="#f6df97"/><stop offset=".76" stop-color="#ad8d4a"/><stop offset="1" stop-color="#624a28"/></linearGradient>
  <linearGradient id="stem"><stop stop-color="#605534"/><stop offset=".5" stop-color="#d7b875"/><stop offset="1" stop-color="#816b42"/></linearGradient>
  <linearGradient id="leaf" x1="0" x2="1" y1="1" y2="0"><stop stop-color="#344932"/><stop offset=".53" stop-color="#8a8c4e"/><stop offset="1" stop-color="#afaa64"/></linearGradient>
  <filter id="soft"><feGaussianBlur stdDeviation="5"/></filter>
  <filter id="haze"><feGaussianBlur stdDeviation="20"/></filter>
  <filter id="texture"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
  <g id="grain">
    <path d="M0 0C-14-18-24-43-10-62Q-7-67 0-73C8-59 20-39 15-23Q12-9 0 0Z" fill="url(#seed)" stroke="#e1c47b" stroke-opacity=".48" stroke-width=".6"/>
    <path d="M0-2Q5-36 0-71M1-30Q12-42 0-72" fill="none" stroke="#795a35" stroke-opacity=".72" stroke-width=".85"/>
    <path d="M-2-6Q-10-24-10-41M-4-12Q-6-31-4-52" fill="none" stroke="#ffe3a2" stroke-opacity=".63" stroke-width=".6"/>
    <path d="M0-70Q3-97-4-132" fill="none" stroke="#e3c981" stroke-opacity=".76" stroke-width=".8"/>
  </g>
</defs>
<path fill="url(#field)" d="M0 0h1200v920H0z"/>
<ellipse cx="380" cy="273" rx="550" ry="400" fill="url(#light)"/>
<g filter="url(#haze)" fill="#d3bd6f">''']
for _ in range(33):
    parts.append(f'<circle cx="{rng.randrange(35,1030)}" cy="{rng.randrange(10,900)}" r="{rng.randrange(4,42)}" opacity="{rng.uniform(.035,.21):.2f}"/>')
parts.append('</g>')

def stalk(x, y, angle, size, opacity=1, blur=False):
    parts.append(f'<g transform="translate({x} {y}) rotate({angle}) scale({size})" opacity="{opacity}"' + (' filter="url(#soft)"' if blur else '') + '>')
    parts.append('<path d="M17 710Q-14 380 1 -14" fill="none" stroke="#18261c" stroke-opacity=".4" stroke-width="12" transform="translate(7 4)"/><path d="M17 710Q-14 380 1 -14" fill="none" stroke="url(#stem)" stroke-width="7"/>')
    parts.append('<path d="M1 405Q-34 313-132 270Q-67 276-34 297Q-9 321 1 405ZM2 486Q43 378 173 310Q130 372 80 406Q28 440 2 486Z" fill="url(#leaf)"/><path d="M-1 398Q-48 308-125 274M6 474Q73 384 168 316" fill="none" stroke="#dbc683" stroke-opacity=".46"/>')
    for i in range(9,-1,-1):
        cy = i*24
        for side in [-1,1]:
            a = side*(16+i*3+ rng.uniform(-4,4))
            s = .69+i*.035+rng.uniform(-.08,.08)
            flip = side if i % 2 else -side
            parts.append(f'<use href="#grain" transform="translate({side*(2+i*.13):.1f} {cy + (9 if side==1 else 0)}) rotate({a:.1f}) scale({s*flip:.2f} {s:.2f})"/>')
    parts.append('<use href="#grain" transform="translate(0 -18) rotate(4) scale(.55 .83)"/></g>')

stalk(98,350,-39,1.45,.43,True)
stalk(632,252,16,1.03,.48,True)
stalk(484,348,1,1.03,.61,True)
stalk(179,425,-35,.98,.74)
stalk(472,302,18,1.03,.87)
stalk(325,281,-15,1.42)
stalk(523,486,34,1.04,.81)
parts.append('<path fill="url(#field)" opacity=".10" d="M0 0h1200v920H0z"/><rect width="1200" height="920" filter="url(#texture)" opacity=".115" style="mix-blend-mode:soft-light"/></svg>')
out.write_text('\n'.join(parts)+'\n', encoding='utf-8')
