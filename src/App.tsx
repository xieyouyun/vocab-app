import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar'
import PWAUpdatePrompt from './components/PWAUpdatePrompt'
import Home from './pages/Home'
import Import from './pages/Import'
import Library from './pages/Library'
import Settings from './pages/Settings'
import Stats from './pages/Stats'
import Study from './pages/Study'
import WordDetail from './pages/WordDetail'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/study" element={<Study />} />
        <Route path="/import" element={<Import />} />
        <Route path="/library" element={<Library />} />
        <Route path="/library/:w" element={<WordDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NavBar />
      <PWAUpdatePrompt />
    </BrowserRouter>
  )
}
