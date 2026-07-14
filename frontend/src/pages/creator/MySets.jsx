import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'

export default function MySets() {
  const [sets, setSets] = useState([])

  useEffect(() => {
    api.get('/card-sets/mine').then((res) => setSets(res.data))
  }, [])

  return (
    <div>
      <h2 className="section-title">My Sets</h2>
      <p className="muted"><Link to="/creator">+ Upload new artwork</Link></p>
      <div className="card-grid">
        {sets.map((s) => (
          <Link key={s.id} to={`/creator/sets/${s.id}`} className="pack-tile" style={{ textDecoration: 'none' }}>
            <h3>{s.name}</h3>
            <span className="muted">{s.status}</span>
            <span className="muted">{s.card_templates?.length || 0} tiers</span>
          </Link>
        ))}
        {sets.length === 0 && <p className="muted">No sets yet.</p>}
      </div>
    </div>
  )
}
