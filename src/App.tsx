import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { latestMonth, useApp } from './state/AppContext'
import { nowYm } from './domain/calc'
import Setup from './pages/Setup'
import Home from './pages/Home'
import Month from './pages/Month'
import Summary from './pages/Summary'
import Settings from './pages/Settings'
import Backup from './pages/Backup'

export default function App() {
  const { data } = useApp()
  if (!data)
    return (
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    )

  const m = latestMonth(data) ?? nowYm()
  const needBackup = Object.keys(data.months).length > 0 && (!data.meta.lastExportedAt || data.meta.lastModifiedAt > data.meta.lastExportedAt)
  return (
    <>
      <header>
        <strong>HomeTex</strong>
        <nav>
          <NavLink to="/" end>홈</NavLink>
          <NavLink to={`/month/${m}`}>월별</NavLink>
          <NavLink to={`/summary/${m.slice(0, 4)}`}>요약</NavLink>
          <NavLink to="/settings">설정</NavLink>
          <NavLink to="/backup">백업{needBackup && <span className="badge">필요</span>}</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/month/:ym" element={<Month />} />
          <Route path="/summary/:year" element={<Summary />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/backup" element={<Backup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}
