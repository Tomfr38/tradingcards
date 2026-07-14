import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api'
import TradingCard from '../../components/TradingCard'

export default function SetPreview() {
  const { setId } = useParams()
  const [cardSet, setCardSet] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.get(`/card-sets/${setId}`).then((res) => setCardSet(res.data))
  }, [setId])

  async function handlePublish() {
    setBusy(true)
    setError('')
    try {
      await api.post(`/card-sets/${setId}/publish`)
      navigate('/creator/sets')
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!cardSet) return <p className="muted">Loading…</p>

  return (
    <div>
      <h2 className="section-title">{cardSet.name}</h2>
      <p className="muted">
        {cardSet.status === 'published' ? 'Published' : 'Draft — review the generated tiers below, then publish.'}
      </p>
      <div className="card-grid">
        {cardSet.card_templates.map((t) => (
          <div key={t.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <TradingCard
              imageUrl={cardSet.artworks.image_url}
              rarityTier={t.rarity_tier}
              frameStyle={t.frame_style}
              effectStyle={t.effect_style}
              printRunCap={t.print_run_cap}
              orientation={cardSet.artworks.orientation}
              interactive
            />
            <span className="muted">
              {t.print_run_cap == null ? 'Uncapped' : `Print run: ${t.print_run_cap}`}
            </span>
          </div>
        ))}
      </div>
      {cardSet.status !== 'published' && (
        <button style={{ marginTop: 20 }} onClick={handlePublish} disabled={busy}>
          {busy ? 'Publishing…' : 'Publish set'}
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  )
}
