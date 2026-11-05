import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { latestMonth, useApp } from './state/AppContext'
import { nowYm } from './domain/calc'
import type { AppData } from './domain/types'
import Setup from './pages/Setup'
import Home from './pages/Home'
import Month from './pages/Month'
import Summary from './pages/Summary'
import Settings from './pages/Settings'
import Backup from './pages/Backup'

const ICONS: Record<string, JSX.Element> = {
  home: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  month: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  summary: <path d="M5 20V11M12 20V4M19 20v-6" />,
  settings: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>,
  backup: <path d="M12 3v12M7 10l5 5 5-5M4 20h16" />,
}

function Shell({ data }: { data: AppData }) {
  const { pathname } = useLocation()
  const m = latestMonth(data) ?? nowYm()
  const needBackup = Object.keys(data.months).length > 0 && (!data.meta.lastExportedAt || data.meta.lastModifiedAt > data.meta.lastExportedAt)
  // [이동 경로, 활성 판정 접두어, 아이콘, 라벨]
  const links: [string, string, string, string][] = [
    ['/', '/', 'home', '홈'],
    [`/month/${m}`, '/month', 'month', '월별'],
    [`/summary/${m.slice(0, 4)}`, '/summary', 'summary', '요약'],
    ['/settings', '/settings', 'settings', '설정'],
    ['/backup', '/backup', 'backup', '백업'],
  ]

  return (
    <>
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
      <nav className="tabbar" aria-label="주 메뉴">
        {links.map(([to, base, icon, label]) => {
          const active = base === '/' ? pathname === '/' : pathname.startsWith(base)
          return (
            <Link key={to} to={to} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
              <span className="ico">
                <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[icon]}</svg>
                {icon === 'backup' && needBackup && <em className="dot" />}
              </span>
              <span>{label}{icon === 'backup' && needBackup && <span className="sr"> (백업 필요)</span>}</span>
            </Link>
          )
        })}
      </nav>
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
