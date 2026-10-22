import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { latestMonth, useApp } from './state/AppContext'
import { nowYm } from './domain/calc'
import type { AppData } from './domain/types'
import { Icon, type IconName } from './components/Icon'
import Setup from './pages/Setup'
import Home from './pages/Home'
import Month from './pages/Month'
import Summary from './pages/Summary'
import Settings from './pages/Settings'
import Backup from './pages/Backup'

const Logo = () => <span className="logo">Home<b>Tex</b></span>

function Shell({ data }: { data: AppData }) {
  const here = useLocation().pathname.split('/')[1]

  const m = latestMonth(data) ?? nowYm()
  const needBackup = Object.keys(data.months).length > 0 && (!data.meta.lastExportedAt || data.meta.lastModifiedAt > data.meta.lastExportedAt)
  const links: [string, IconName, string][] = [
    ['/', 'home', '홈'],
    [`/month/${m}`, 'calendar', '월별'],
    [`/summary/${m.slice(0, 4)}`, 'chart', '요약'],
    ['/settings', 'sliders', '설정'],
    ['/backup', 'archive', '백업'],
  ]

  return (
    <>
      <nav className="tabs" aria-label="주 메뉴">
        <Logo />
        {links.map(([to, icon, label]) => (
          // 다른 달/연도로 이동해도 같은 탭이 활성 상태로 유지되도록 첫 경로 조각으로 비교
          <Link key={to} to={to} aria-current={to.split('/')[1] === here ? 'page' : undefined}>
            <span className="ico">
              <Icon name={icon} />
              {label === '백업' && needBackup && <em className="dot" role="img" aria-label="백업 필요" />}
            </span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <main>
        <header className="brand"><Logo /></header>
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
