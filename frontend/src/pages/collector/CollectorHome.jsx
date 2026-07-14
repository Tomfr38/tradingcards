import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function CollectorHome() {
  const { profile } = useAuth()

  return (
    <div>
      <h2 className="section-title">Welcome{profile ? `, ${profile.display_name}` : ''}</h2>
      <p className="muted">You have {profile?.coin_balance ?? 0} coins.</p>
      <p>
        <Link to="/collector/shop">Browse the Shop →</Link>
      </p>
      <p>
        <Link to="/collector/album">View your Album →</Link>
      </p>
    </div>
  )
}
