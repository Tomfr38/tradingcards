import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../../api'

export default function CardMaker() {
  const [title, setTitle] = useState('')
  const [orientation, setOrientation] = useState('vertical')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) return setError('Choose an image first')
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('orientation', orientation)
      formData.append('title', title || file.name)

      const { data: artwork } = await api.post('/artworks', formData)
      const { data: generated } = await api.post(`/artworks/${artwork.id}/generate-set`)
      navigate(`/creator/sets/${generated.cardSet.id}`)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h2 className="section-title">Card Maker</h2>
      <p className="muted">
        Upload one piece of art and we'll auto-generate a full rarity set from it.{' '}
        <Link to="/creator/sets">View my sets →</Link>
      </p>
      <form className="upload-form" onSubmit={handleSubmit}>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Neon Dreamer" />
        </label>
        <label>
          Orientation
          <select value={orientation} onChange={(e) => setOrientation(e.target.value)}>
            <option value="vertical">Vertical</option>
            <option value="horizontal">Horizontal</option>
          </select>
        </label>
        <label>
          Image
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} required />
        </label>
        <button type="submit" disabled={busy}>{busy ? 'Generating…' : 'Generate rarity set'}</button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  )
}
