import { useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { latestMonth, useApp } from './state/AppContext'
import { nowYm } from './domain/calc'
import type { AppData } from './domain/types'
import Setup from './pages/Setup'
import Home from './pages/Home'
import Month from './pages/Month'
import Summary from './pages/Summary'
import Settings from './pages/Settings'
import Backup from './pages/Backup'

const Logo = () => <span className="logo">Home<b>Tex</b></span>

function Shell({ data }: { data: AppData }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])

  const m = latestMonth(data) ?? nowYm()
  const needBackup = Object.keys(data.months).length > 0 && (!data.meta.lastExportedAt || data.meta.lastModifiedAt > data.meta.lastExportedAt)
  const links: [string, string, string, boolean?][] = [
    ['/', '🏠', '홈', true],
    [`/month/${m}`, '📅', '월별'],
    [`/summary/${m.slice(0, 4)}`, '📊', '요약'],
    ['/settings', '⚙️', '설정'],
    ['/backup', '💾', '백업'],
  ]

  return (
    <>
      <div className="topbar">
        <button className="burger" aria-label="메뉴" onClick={() => setOpen(true)}>☰</button>
        <Logo />
      </div>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={open ? 'open' : ''}>
        <div className="side-head">
          <button className="burger" aria-label="메뉴 열기/닫기" onClick={() => setOpen(o => !o)}>☰</button>
          <Logo />
        </div>
        <nav>
          {links.map(([to, icon, label, end]) => (
            <NavLink key={to} to={to} end={end} title={label}>
              <i>{icon}</i>
              <span>{label}</span>
              {label === '백업' && needBackup && <em className="badge">필요</em>}
            </NavLink>
          ))}
        </nav>
      </aside>
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

export default function App() {
  const { data } = useApp()
  if (!data)
    return (
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    )
  return <Shell data={data} />
}
