import TradingCard from './TradingCard'

export default function PackOpenReveal({ cards, onClose }) {
  return (
    <div className="reveal-overlay">
      <h2>You got {cards.length} cards!</h2>
      <div className="card-grid" style={{ justifyContent: 'center', maxWidth: 900 }}>
        {cards.map((c) => (
          <div key={c.edition_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <TradingCard
              imageUrl={c.image_url}
              rarityTier={c.rarity_tier}
              frameStyle={c.frame_style}
              effectStyle={c.effect_style}
              editionNumber={c.edition_number}
              printRunCap={c.print_run_cap}
              visualSeed={c.visual_seed}
              orientation={c.orientation}
              interactive
            />
            <span className="muted">{c.artist_name}</span>
          </div>
        ))}
      </div>
      <button onClick={onClose}>Close</button>
    </div>
  )
}
