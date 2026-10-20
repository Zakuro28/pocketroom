import { useId } from 'react'
import type { Clothing } from '../game/wardrobe'

/**
 * A drawn icon for each kind of clothing, in the piece's own colors (main + accent), so the closet shows
 * what you're actually buying instead of a generic emoji.
 */

/** A darker edge in the same color, so light pieces still read on a light card */
function edge(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.round(v * 0.62)
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`
}

export function ClothingIcon({ c, className = '' }: { c: Clothing; className?: string }) {
  const id = useId()
  const fill = c.color
  const line = edge(c.color)
  const accent = c.accent ?? edge(c.color)
  const p = { fill, stroke: line, strokeWidth: 2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
  let body: React.ReactNode
  switch (c.cut) {
    case 'tee':
      body = <path {...p} d="M17 9 L8 14 L11 22 L15 20 L15 40 L33 40 L33 20 L37 22 L40 14 L31 9 C29 13 19 13 17 9 Z" />
      break
    case 'longsleeve':
      body = (
        <>
          <path {...p} d="M17 9 L7 15 L6 38 L11 38 L13 22 L15 21 L15 40 L33 40 L33 21 L35 22 L37 38 L42 38 L41 15 L31 9 C29 13 19 13 17 9 Z" />
          <path d="M15 27 H33 M15 33 H33" stroke={accent} strokeWidth={2.5} />
        </>
      )
      break
    case 'hoodie':
      body = (
        <>
          <path {...p} d="M17 10 L7 15 L6 38 L11 38 L13 22 L15 21 L15 40 L33 40 L33 21 L35 22 L37 38 L42 38 L41 15 L31 10 C31 4 17 4 17 10 Z" />
          <path {...p} fill={accent} d="M19 10 C19 6 29 6 29 10 C27 13 21 13 19 10 Z" />
          <rect x={18} y={30} width={12} height={6} rx={2} fill="none" stroke={line} strokeWidth={1.6} />
        </>
      )
      break
    case 'jacket':
      body = (
        <>
          <path {...p} d="M17 9 L7 15 L6 38 L11 38 L13 22 L15 21 L15 40 L33 40 L33 21 L35 22 L37 38 L42 38 L41 15 L31 9 L24 18 Z" />
          <path d="M24 18 V40" stroke={line} strokeWidth={2} />
          <path {...p} fill={accent} d="M17 9 L24 18 L20 22 Z M31 9 L24 18 L28 22 Z" />
        </>
      )
      break
    case 'dress':
      body = (
        <>
          <path {...p} d="M19 7 L17 18 L10 41 L38 41 L31 18 L29 7 C27 10 21 10 19 7 Z" />
          <path d="M17 19 H31" stroke={accent} strokeWidth={2.5} />
        </>
      )
      break
    case 'pants':
      body = <path {...p} d="M13 7 H35 L37 41 H27 L24 19 L21 41 H11 Z" />
      break
    case 'shorts':
      body = <path {...p} d="M12 12 H36 L39 32 H27 L24 22 L21 32 H9 Z" />
      break
    case 'skirt':
      body = (
        <>
          <path {...p} d="M16 11 H32 L40 36 H8 Z" />
          <path d="M20 13 L16 35 M24 13 V35 M28 13 L32 35" stroke={line} strokeWidth={1.4} />
        </>
      )
      break
    case 'sneakers':
      body = (
        <>
          <path {...p} d="M6 34 L8 20 L18 21 C21 26 30 27 40 28 C43 29 43 34 42 35 Z" />
          <path d="M6 35 H42" stroke={accent} strokeWidth={4} />
          <path d="M14 23 L18 27 M18 22 L22 26" stroke={line} strokeWidth={1.6} />
        </>
      )
      break
    case 'boots':
      body = <path {...p} d="M12 8 H24 V27 C30 27 38 29 39 35 V39 H12 Z" />
      break
    case 'slippers':
      body = (
        <>
          <ellipse {...p} cx={24} cy={30} rx={16} ry={9} />
          <ellipse {...p} cx={17} cy={14} rx={3.5} ry={9} />
          <ellipse {...p} cx={27} cy={14} rx={3.5} ry={9} />
          <circle cx={19} cy={27} r={1.6} fill="#2b2233" />
          <circle cx={27} cy={27} r={1.6} fill="#2b2233" />
        </>
      )
      break
    case 'cap':
      body = (
        <>
          <path {...p} d="M8 28 C8 14 32 12 34 26 Z" />
          <path {...p} fill={accent} d="M30 25 L44 29 C44 32 36 32 30 29 Z" />
        </>
      )
      break
    case 'beanie':
      body = (
        <>
          <path {...p} d="M9 33 C8 16 40 16 39 33 Z" />
          <rect {...p} fill={accent} x={7} y={30} width={34} height={8} rx={3} />
          <circle {...p} fill={accent} cx={24} cy={12} r={4} />
        </>
      )
      break
    case 'bucket':
      body = (
        <>
          <path {...p} d="M14 28 L16 14 C20 10 28 10 32 14 L34 28 Z" />
          <ellipse {...p} cx={24} cy={30} rx={19} ry={6} />
        </>
      )
      break
    case 'crown':
      body = (
        <>
          <path {...p} d="M8 36 L6 14 L16 24 L24 10 L32 24 L42 14 L40 36 Z" />
          <circle cx={24} cy={30} r={3} fill={accent} />
          <circle cx={14} cy={31} r={2} fill={accent} />
          <circle cx={34} cy={31} r={2} fill={accent} />
        </>
      )
      break
    case 'flowers':
      body = (
        <>
          {[12, 24, 36].map((x, i) => (
            <g key={x}>
              {[0, 72, 144, 216, 288].map((a) => (
                <circle key={a} {...p} strokeWidth={1.4} cx={x + Math.cos((a * Math.PI) / 180) * 4.5} cy={24 + (i % 2 ? -4 : 2) + Math.sin((a * Math.PI) / 180) * 4.5} r={3.4} />
              ))}
              <circle cx={x} cy={24 + (i % 2 ? -4 : 2)} r={2.4} fill={accent} />
            </g>
          ))}
        </>
      )
      break
    case 'glasses':
    case 'shades':
      body = (
        <>
          <rect {...p} fill={c.cut === 'shades' ? fill : `${fill}55`} x={5} y={19} width={16} height={12} rx={5} />
          <rect {...p} fill={c.cut === 'shades' ? fill : `${fill}55`} x={27} y={19} width={16} height={12} rx={5} />
          <path d="M21 24 C23 22 25 22 27 24" fill="none" stroke={line} strokeWidth={2.2} />
          {c.cut === 'shades' && <path d="M9 22 L13 22" stroke="#ffffff" strokeOpacity={0.6} strokeWidth={2} />}
        </>
      )
      break
    case 'tank':
      body = <path {...p} d="M18 7 L18 14 C18 17 15 18 14 21 L14 41 L34 41 L34 21 C33 18 30 17 30 14 L30 7 L27 7 C27 12 21 12 21 7 Z" />
      break
    case 'sandals':
      body = (
        <>
          <path {...p} d="M5 36 C5 31 12 30 22 31 C32 31 43 31 43 35 C43 38 6 39 5 36 Z" />
          <path d="M12 31 C14 23 24 23 26 31" fill="none" stroke={fill} strokeWidth={4} strokeLinecap="round" />
          <path d="M12 31 C14 23 24 23 26 31" fill="none" stroke={line} strokeWidth={1.2} />
        </>
      )
      break
    case 'beret':
      body = (
        <>
          <ellipse {...p} cx={23} cy={27} rx={19} ry={9} transform="rotate(-8 23 27)" />
          <path {...p} d="M24 18 L25 13" />
        </>
      )
      break
    case 'tophat':
      body = (
        <>
          <rect {...p} x={14} y={8} width={20} height={26} rx={2} />
          <rect x={14} y={27} width={20} height={5} fill={accent} />
          <ellipse {...p} cx={24} cy={36} rx={19} ry={4} />
        </>
      )
      break
    case 'bow':
      body = (
        <>
          <path {...p} d="M24 24 L7 13 L7 35 Z" />
          <path {...p} d="M24 24 L41 13 L41 35 Z" />
          <circle {...p} cx={24} cy={24} r={5} />
        </>
      )
      break
    case 'catEars':
      body = (
        <>
          <path d="M6 36 C10 22 38 22 42 36" fill="none" stroke={line} strokeWidth={3} />
          <path {...p} d="M9 30 L12 9 L22 24 Z" />
          <path {...p} d="M39 30 L36 9 L26 24 Z" />
          <path fill={accent} d="M12.5 26 L13.5 15 L19 23 Z M35.5 26 L34.5 15 L29 23 Z" />
        </>
      )
      break
    case 'halo':
      body = (
        <>
          <ellipse cx={24} cy={24} rx={18} ry={8} fill="none" stroke={fill} strokeWidth={5} />
          <ellipse cx={24} cy={24} rx={18} ry={8} fill="none" stroke={line} strokeWidth={1} />
        </>
      )
      break
    case 'hearts':
      body = (
        <>
          {[14, 34].map((x) => (
            <path key={x} {...p} d={`M${x} 32 L${x - 9} 23 C${x - 12} 19 ${x - 7} 13 ${x} 18 C${x + 7} 13 ${x + 12} 19 ${x + 9} 23 Z`} />
          ))}
          <path d="M22 21 C23 19 25 19 26 21" fill="none" stroke={line} strokeWidth={2.2} />
        </>
      )
      break
    case 'mask':
      body = (
        <>
          <path d="M9 18 L4 15 M39 18 L44 15 M9 32 L4 35 M39 32 L44 35" stroke={line} strokeWidth={1.6} />
          <rect {...p} x={9} y={14} width={30} height={22} rx={7} />
          <path d="M14 22 H34 M14 28 H34" stroke={line} strokeWidth={1.2} />
        </>
      )
      break
    case 'monocle':
      body = (
        <>
          <circle {...p} fill={`${fill}33`} cx={20} cy={20} r={11} strokeWidth={3} stroke={fill} />
          <path d="M29 26 C33 32 34 38 38 43" fill="none" stroke={line} strokeWidth={1.6} strokeDasharray="2 2" />
        </>
      )
      break
    case 'headphones':
      body = (
        <>
          <path d="M10 30 C10 10 38 10 38 30" fill="none" stroke={fill} strokeWidth={4.5} strokeLinecap="round" />
          <rect {...p} fill={accent} x={6} y={26} width={9} height={14} rx={4} />
          <rect {...p} fill={accent} x={33} y={26} width={9} height={14} rx={4} />
        </>
      )
      break
  }
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <filter id={`${id}s`} x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="0.8" floodOpacity="0.18" />
        </filter>
      </defs>
      <g filter={`url(#${id}s)`}>{body}</g>
    </svg>
  )
}
