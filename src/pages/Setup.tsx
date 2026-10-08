import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { Num } from '../components/Num'
import { nowYm, recurringTotal, sum, yen } from '../domain/calc'
import { defaultRecurring, defaultSettings, emptyMonth, type AppData } from '../domain/types'
import { readBackup } from '../storage/backup'

export default function Setup() {
  const { dispatch } = useApp()
  const nav = useNavigate()
  const [ym, setYm] = useState(nowYm())
  const [savings, setSavings] = useState(0)
  const [rakuten, setRakuten] = useState(0)
  const [takeHome, setTakeHome] = useState(0)
  const [cash, setCash] = useState(20000)
  const [transfer, setTransfer] = useState(0)
  const [err, setErr] = useState('')

  const start = () => {
    const t = new Date().toISOString()
    const data: AppData = {
      schemaVersion: 1,
      settings: defaultSettings(ym, savings, rakuten),
      months: { [ym]: { ...emptyMonth(), takeHome, cash, savingsTransfer: transfer } },
      meta: { lastExportedAt: null, lastModifiedAt: t },
    }
    dispatch({ type: 'replace', data })
    nav(`/month/${ym}`)
  }

  const restore = async (f?: File) => {
    if (!f) return
    try {
      dispatch({ type: 'replace', data: await readBackup(f) })
      nav('/')
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  return (
    <main>
      <h1>HomeTex 초기 설정</h1>
      <section className="card">
        <label className="field">
          <span>시작 월 (급여 받는 달)</span>
          <input type="month" value={ym} onChange={e => e.target.value && setYm(e.target.value)} />
        </label>
        <Num label="초기 저축 잔액" value={savings} onChange={setSavings} />
        <Num label="초기 라쿠텐 잔액" value={rakuten} onChange={setRakuten} />
        <Num label="테토리 (세후 수령액)" value={takeHome} onChange={setTakeHome} />
        <Num label="현금" value={cash} onChange={setCash} />
        <Num label="저축 이체액" value={transfer} onChange={setTransfer} />
        <p className="muted">월과금 기본 항목(공월·기행·클로드)은 월별 화면에서 수정할 수 있어요. 합계 {yen(sum(defaultRecurring().map(recurringTotal)))}엔</p>
        <button className="primary" onClick={start}>시작하기</button>
      </section>
      <section className="card">
        <h2>백업 파일에서 복원</h2>
        <input type="file" accept="application/json,.json" onChange={e => restore(e.target.files?.[0])} />
        {err && <p className="warn">{err}</p>}
      </section>
    </main>
  )
}
