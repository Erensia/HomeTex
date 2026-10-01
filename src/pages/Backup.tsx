import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { compare, merge, type Diff } from '../domain/merge'
import type { AppData } from '../domain/types'
import { exportBackup, readBackup } from '../storage/backup'
import { clearBeforeImport, loadBeforeImport, stashBeforeImport } from '../storage/localStore'

const DIFF: Record<Diff, string> = { new: '새 항목', incoming: '가져올 쪽이 최신', current: '현재가 최신', same: '동일' }

export default function Backup() {
  const { data, dispatch } = useApp()
  const [inc, setInc] = useState<AppData | null>(null)
  const [msg, setMsg] = useState('')
  const [canUndo, setCanUndo] = useState(() => !!loadBeforeImport())
  if (!data) return null

  const doExport = async () => {
    if (await exportBackup(data)) dispatch({ type: 'exported' })
  }

  const pick = async (f?: File) => {
    if (!f) return
    try {
      setInc(await readBackup(f))
      setMsg('')
    } catch (e) {
      setInc(null)
      setMsg((e as Error).message)
    }
  }

  const apply = (mode: 'merge' | 'overwrite') => {
    if (!inc) return
    if (mode === 'overwrite' && !confirm('현재 데이터를 모두 덮어씁니다. 계속할까요?')) return
    stashBeforeImport(data)
    const next = mode === 'merge' ? merge(data, inc) : { ...inc, meta: { lastExportedAt: data.meta.lastExportedAt, lastModifiedAt: new Date().toISOString() } }
    dispatch({ type: 'replace', data: next })
    setInc(null)
    setCanUndo(true)
    setMsg('가져오기를 적용했습니다.')
  }

  const undo = () => {
    const prev = loadBeforeImport()
    if (!prev) return
    dispatch({ type: 'replace', data: prev })
    clearBeforeImport()
    setCanUndo(false)
    setMsg('가져오기를 되돌렸습니다.')
  }

  const cmp = inc && compare(data, inc)
  return (
    <>
      <h1>백업</h1>
      <section className="card">
        <h2>내보내기</h2>
        <p className="muted">마지막 내보내기: {data.meta.lastExportedAt ? new Date(data.meta.lastExportedAt).toLocaleString() : '없음'}</p>
        <button className="primary" onClick={doExport}>JSON 내보내기</button>
      </section>
      <section className="card">
        <h2>가져오기</h2>
        <input type="file" accept="application/json,.json" onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
        {cmp && (
          <>
            <ul>
              <li>설정: {DIFF[cmp.settings]}</li>
              {Object.entries(cmp.months).sort().map(([ym, d]) => <li key={ym}>{ym}: {DIFF[d]}</li>)}
            </ul>
            <div className="inline">
              <button className="primary" onClick={() => apply('merge')}>병합 (권장)</button>
              <button onClick={() => apply('overwrite')}>전체 덮어쓰기</button>
            </div>
          </>
        )}
        {canUndo && <button onClick={undo}>직전 가져오기 되돌리기</button>}
        {msg && <p className="warn">{msg}</p>}
      </section>
      <p className="muted">iPhone은 홈 화면 아이콘으로만 사용하세요. Safari 탭과 저장 공간이 분리됩니다. PC 시크릿 창은 종료 시 데이터가 삭제됩니다.</p>
    </>
  )
}
