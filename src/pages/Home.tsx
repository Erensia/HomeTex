import { Link } from 'react-router-dom'
import { latestMonth, useApp } from '../state/AppContext'
import { nowYm, workLabel, yen } from '../domain/calc'
import { Balance } from '../components/Balance'

const DAY = 86400000

export default function Home() {
  const { data, calc } = useApp()
  if (!data) return null
  const ym = latestMonth(data) ?? nowYm()
  const c = calc[ym]
  const m = data.months[ym]
  const last = data.meta.lastExportedAt
  const stale = last && Date.now() - Date.parse(last) > 30 * DAY
  const now = nowYm()
  const filled = !!m?.cardItems.some(i => i.amounts.length)

  return (
    <>
      {!last && <p className="warn">아직 백업한 적이 없어요. 브라우저 데이터가 지워지면 복구할 수 없으니 <Link to="/backup">백업</Link>해 두세요.</p>}
      {stale && <p className="warn">마지막 백업이 30일 넘게 지났어요. <Link to="/backup">백업하기</Link></p>}
      <section className="card">
        <h1>{ym} ({workLabel(ym)})</h1>
        {c && (
          <>
            <Balance label="카드 잔액" value={c.cardBalance} />
            <dl>
              <dt>저축 누적</dt><dd>{yen(c.savingsBalance)}엔</dd>
              <dt>라쿠텐 잔액</dt><dd>{yen(c.rakutenBalance)}엔</dd>
              <dt>NISA 잔액</dt><dd>{yen(c.nisaBalance)}엔</dd>
            </dl>
          </>
        )}
        <p className="muted">{filled ? '카드 내역이 입력되어 있어요.' : '카드 내역이 아직 비어 있어요.'}</p>
        <Link className="btn primary" to={`/month/${ym}`}>{filled ? '최신 월 열기' : '카드 내역 입력하기'}</Link>
      </section>
      {ym < now && (
        <section className="card">
          <p>{now}이 시작되었어요. 새 달을 만들 수 있어요.</p>
          <Link className="btn" to={`/month/${now}`}>{now} 열기</Link>
        </section>
      )}
    </>
  )
}
