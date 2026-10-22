import { Link } from 'react-router-dom'
import { latestMonth, useApp } from '../state/AppContext'
import { nowYm, workLabel, yen } from '../domain/calc'

const DAY = 86400000

export default function Home() {
  const { data, calc } = useApp()
  if (!data) return null
  const ym = latestMonth(data) ?? nowYm()
  const c = calc[ym]
  const last = data.meta.lastExportedAt
  const stale = last && Date.now() - Date.parse(last) > 30 * DAY

  return (
    <>
      {!last && <p className="warn">아직 백업한 적이 없어요. 브라우저 데이터가 지워지면 복구할 수 없으니 <Link to="/backup">백업</Link>해 두세요.</p>}
      {stale && <p className="warn">마지막 백업이 30일 넘게 지났어요. <Link to="/backup">백업하기</Link></p>}
      <section className="card">
        <h2>{ym} ({workLabel(ym)})</h2>
        {c && (
          <>
            <p className="muted">카드 잔액</p>
            <p className={`big${c.cardBalance < 0 ? ' neg' : ''}`}>{yen(c.cardBalance)}<small>엔</small></p>
            <div className="tiles">
              {([['저축 누적', c.savingsBalance], ['라쿠텐 잔액', c.rakutenBalance], ['NISA 잔액', c.nisaBalance]] as const).map(([label, v]) => (
                <div className="tile" key={label}><span>{label}</span><b>{yen(v)}</b></div>
              ))}
            </div>
          </>
        )}
        <Link className="btn primary" to={`/month/${ym}`}>최신 월 열기</Link>
      </section>
    </>
  )
}
