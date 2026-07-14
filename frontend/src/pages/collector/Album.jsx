import { useEffect, useState } from 'react'
import api from '../../api'
import TradingCard from '../../components/TradingCard'

const RARITIES = ['common', 'rare', 'epic', 'legendary', 'ultra_100', 'one_of_one']

export default function Album() {
  const [cards, setCards] = useState([])
  const [rarity, setRarity] = useState('')
  const [artist, setArtist] = useState('')

  useEffect(() => {
    const params = {}
    if (rarity) params.rarity = rarity
    if (artist) params.artist = artist
    api.get('/inventory/mine', { params }).then((res) => setCards(res.data))
  }, [rarity, artist])

  const artists = [...new Set(cards.map((c) => c.artist_name).filter(Boolean))]

  return (
    <div>
      <h2 className="section-title">Album</h2>
      <div className="filters">
        <select value={rarity} onChange={(e) => setRarity(e.target.value)}>
          <option value="">All rarities</option>
          {RARITIES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select value={artist} onChange={(e) => setArtist(e.target.value)}>
          <option value="">All artists</option>
          {artists.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
      <div className="card-grid">
        {cards.map((c) => (
          <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
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
            <span className="muted">{c.artist_name} · {c.set_name}</span>
          </div>
        ))}
        {cards.length === 0 && <p className="muted">No cards yet — open a pack in the Shop.</p>}
      </div>
    </div>
  )
}
