import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppHeader from './components/AppHeader'
import Login from './pages/Login'
import CollectorHome from './pages/collector/CollectorHome'
import Album from './pages/collector/Album'
import Shop from './pages/collector/Shop'
import CardMaker from './pages/creator/CardMaker'
import SetPreview from './pages/creator/SetPreview'
import MySets from './pages/creator/MySets'

function RequireAuth({ children }) {
  const { session } = useAuth()
  if (session === undefined) return <div className="page-loading">Loading…</div>
  if (session === null) return <Navigate to="/login" replace />
  return children
}

function AuthedLayout({ children }) {
  return (
    <>
      <AppHeader />
      <main className="app-main">{children}</main>
    </>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/collector"
        element={<RequireAuth><AuthedLayout><CollectorHome /></AuthedLayout></RequireAuth>}
      />
      <Route
        path="/collector/album"
        element={<RequireAuth><AuthedLayout><Album /></AuthedLayout></RequireAuth>}
      />
      <Route
        path="/collector/shop"
        element={<RequireAuth><AuthedLayout><Shop /></AuthedLayout></RequireAuth>}
      />
      <Route
        path="/creator"
        element={<RequireAuth><AuthedLayout><CardMaker /></AuthedLayout></RequireAuth>}
      />
      <Route
        path="/creator/sets"
        element={<RequireAuth><AuthedLayout><MySets /></AuthedLayout></RequireAuth>}
      />
      <Route
        path="/creator/sets/:setId"
        element={<RequireAuth><AuthedLayout><SetPreview /></AuthedLayout></RequireAuth>}
      />
      <Route path="*" element={<Navigate to="/collector" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
