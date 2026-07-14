import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('sign-in')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    const action =
      mode === 'sign-in'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password })
    const { data, error } = await action
    setBusy(false)
    if (error) {
      setMessage(error.message)
    } else if (data.session) {
      navigate('/collector', { replace: true })
    } else {
      setMessage('Check your email to confirm your account, then sign in.')
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Trading Cards</h1>
        <p className="muted">{mode === 'sign-in' ? 'Sign in to your account' : 'Create an account'}</p>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <button type="submit" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Sign up'}
        </button>
        {message && <p className="error">{message}</p>}
        <button
          type="button"
          className="link-button"
          onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
        >
          {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
