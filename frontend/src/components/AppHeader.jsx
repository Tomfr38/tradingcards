import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AppHeader() {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const mode = location.pathname.startsWith('/creator') ? 'creator' : 'collector'

  return (
    <header className="app-header">
      <Link to="/collector" className="brand">Trading Cards</Link>

      {profile?.is_creator && (
        <div className="mode-toggle">
          <button className={mode === 'collector' ? 'active' : ''} onClick={() => navigate('/collector')}>
            Collector
          </button>
          <button className={mode === 'creator' ? 'active' : ''} onClick={() => navigate('/creator')}>
            Creator
          </button>
        </div>
      )}

      <div className="header-right">
        {profile && <span className="coin-balance">🪙 {profile.coin_balance}</span>}
        <button className="link-button" onClick={signOut}>Sign out</button>
      </div>
    </header>
  )
}
