import { useRef, useState } from 'react'
import './TradingCard.css'

const RARITY_LABELS = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  ultra_100: 'Ultra Rare',
  one_of_one: 'One of One',
}

export default function TradingCard({
  imageUrl,
  rarityTier,
  frameStyle,
  effectStyle,
  editionNumber = null,
  printRunCap = null,
  visualSeed = 0,
  orientation = 'vertical',
  size = 'md',
  interactive = false,
}) {
  const ref = useRef(null)
  const [tilt, setTilt] = useState(null)
  const [flipped, setFlipped] = useState(false)

  function handleMouseMove(e) {
    if (!interactive || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: py * -12, y: px * 12 })
  }

  const hue = visualSeed % 360
  const delay = (visualSeed % 12) * 250

  const tiltStyle = {
    '--seed-hue': hue,
    '--seed-delay': `${delay}ms`,
    transform: tilt ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.04)` : undefined,
  }

  return (
    <div
      ref={ref}
      className={`tc tc--${orientation} tc--${size}`}
      style={tiltStyle}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt(null)}
      onClick={() => setFlipped((f) => !f)}
      role="button"
      aria-label="Flip card to see the back"
    >
      <div className={`tc-flip${flipped ? ' is-flipped' : ''}`}>
        <div className={`tc-face tc-face--front frame--${frameStyle}`}>
          <div className="tc-inner tc-inner--image">
            {imageUrl && <img className="tc-image" src={imageUrl} alt="" />}
            <div className={`tc-effect effect--${effectStyle}`} />
          </div>
          <svg className="tc-flip-hint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 0 1 15-6.7M21 12a9 9 0 0 1-15 6.7" strokeLinecap="round" />
            <path d="M17 3v4h-4M7 21v-4h4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className={`tc-face tc-face--back frame--${frameStyle}`}>
          <div className="tc-inner tc-inner--back">
            <div className="tc-back-pattern" />
            <svg className="tc-back-emblem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M12 2l2.9 6.6L22 9.3l-5 4.9 1.2 7.1L12 17.9l-6.2 3.4L7 14.2 2 9.3l7.1-.7z" />
            </svg>
            <div className="tc-back-text">
              <span className="tc-back-rarity">{RARITY_LABELS[rarityTier] || rarityTier}</span>
              {editionNumber != null && (
                <span className="tc-back-edition">{editionNumber} / {printRunCap ?? '?'}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
