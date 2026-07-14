import { useEffect, useState } from 'react'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import PackOpenReveal from '../../components/PackOpenReveal'

export default function Shop() {
  const [packs, setPacks] = useState([])
  const [busyPackId, setBusyPackId] = useState(null)
  const [error, setError] = useState('')
  const [revealCards, setRevealCards] = useState(null)
  const { refreshProfile } = useAuth()

  function loadPacks() {
    api.get('/packs').then((res) => setPacks(res.data))
  }

  useEffect(loadPacks, [])

  async function handleOpen(pack) {
    setBusyPackId(pack.id)
    setError('')
    try {
      const { data } = await api.post(`/packs/${pack.id}/open`)
      setRevealCards(data.cards)
      await refreshProfile()
      loadPacks()
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setBusyPackId(null)
    }
  }

  return (
    <div>
      <h2 className="section-title">Shop</h2>
      {error && <p className="error">{error}</p>}
      <div className="card-grid">
        {packs.map((pack) => (
          <div key={pack.id} className="pack-tile">
            <h3>{pack.name}</h3>
            <span className="muted">{pack.card_count} cards · {pack.template_count} possible tiers</span>
            {pack.artists?.length > 0 && <span className="muted">Artists: {pack.artists.join(', ')}</span>}
            <button onClick={() => handleOpen(pack)} disabled={busyPackId === pack.id}>
              {busyPackId === pack.id ? 'Opening…' : `Buy for 🪙 ${pack.price_coins}`}
            </button>
          </div>
        ))}
        {packs.length === 0 && <p className="muted">No packs available yet.</p>}
      </div>

      {revealCards && <PackOpenReveal cards={revealCards} onClose={() => setRevealCards(null)} />}
    </div>
  )
}
