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

  function handleMouseMove(e) {
    if (!interactive || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: py * -14, y: px * 14 })
  }

  const hue = visualSeed % 360
  const delay = (visualSeed % 12) * 250

  const style = {
    '--seed-hue': hue,
    '--seed-delay': `${delay}ms`,
    transform: tilt ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.04)` : undefined,
  }

  return (
    <div
      ref={ref}
      className={`tc tc--${rarityTier} tc--${orientation} tc--${size} frame--${frameStyle}`}
      style={style}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt(null)}
    >
      <div className="tc-frame">
        <div className="tc-image-wrap">
          {imageUrl && <img className="tc-image" src={imageUrl} alt="" />}
          <div className={`tc-effect effect--${effectStyle}`} />
        </div>
        <div className="tc-label">{RARITY_LABELS[rarityTier] || rarityTier}</div>
        {editionNumber != null && (
          <div className="tc-edition-badge">
            {editionNumber}/{printRunCap ?? '?'}
          </div>
        )}
      </div>
    </div>
  )
}
