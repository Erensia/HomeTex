import { Link, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '../state/AppContext'
import { recurringTotal, sum, yen } from '../domain/calc'

export default function Summary() {
  const { year = '' } = useParams()
  const { data, calc } = useApp()
  if (!data) return null
  const yms = Object.keys(data.months).filter(k => k.startsWith(year)).sort()
  const rows = yms.map(ym => ({ ym, m: data.months[ym], c: calc[ym] }))
  const y = Number(year)
  const avg = rows.length ? Math.floor(sum(rows.map(r => r.c.cardBalance)) / rows.length) : 0
  const last = rows.at(-1)?.c
  // 카드 내역: 이름별 월 합계 (연간 합계 큰 순)
  const byName: Record<string, Record<string, number>> = {}
  for (const { ym, m } of rows) for (const it of m.cardItems) {
    const n = it.name.trim() || '(이름 없음)'
    byName[n] = { ...byName[n], [ym]: (byName[n]?.[ym] ?? 0) + recurringTotal(it) }
  }
  const items = Object.entries(byName).sort((a, b) => sum(Object.values(b[1])) - sum(Object.values(a[1])))
  const chart = rows.map(({ ym, c }) => ({
    ym: ym.slice(5), savings: c.savingsBalance,
    fixed: +c.ratios[0].pct.toFixed(1), spending: +c.ratios[1].pct.toFixed(1), savingsPct: +c.ratios[2].pct.toFixed(1),
  }))

  return (
    <>
      <div className="monthnav">
        <Link to={`/summary/${y - 1}`}>◀</Link>
        <h1>{year}년 요약</h1>
        <Link to={`/summary/${y + 1}`}>▶</Link>
      </div>
      {!rows.length ? <p className="muted">이 해의 데이터가 없습니다.</p> : (
        <>
          <section className="card">
            <h2>연간 합계</h2>
            <dl>
              <dt>총 테토리</dt><dd>{yen(sum(rows.map(r => r.m.takeHome)))}</dd>
              <dt>총 유초 카드값</dt><dd>{yen(sum(rows.map(r => r.c.yuchoCard)))}</dd>
              <dt>총 미츠이</dt><dd>{yen(sum(rows.map(r => r.c.recurringMitsui)))}</dd>
              <dt>총 월과금</dt><dd>{yen(sum(rows.map(r => r.c.recurringAll)))}</dd>
              <dt>총 지급액 (세전)</dt><dd>{yen(sum(rows.map(r => r.m.grossTotal ?? 0)))}</dd>
              <dt>총 데이트비</dt><dd>{yen(sum(rows.map(r => r.c.datingTotal)))}</dd>
              <dt>평균 카드 잔액</dt><dd>{yen(avg)}</dd>
              <dt>연말 NISA 잔액</dt><dd>{yen(last!.nisaBalance)}</dd>
              <dt>연말 저축 누적</dt><dd>{yen(last!.savingsBalance)}</dd>
              <dt>연간 저축 증가</dt><dd>{yen(sum(rows.map(r => r.c.savingsDelta)))}</dd>
            </dl>
          </section>

          <section className="card tablewrap">
            <table>
              <thead>
                <tr>
                  {['월', '테토리', '총지급(세전)', '유초 카드값', '미츠이', '월과금', '데이트비', '카드값외', '라쿠텐외', '저축 외', '카드 잔액', '저축 이체', '저축 누적', '증감', '라쿠텐 잔액', 'NISA 잔액', '잔업h', '잔업수당', '고정비%', '지출%', '저축%'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ ym, m, c }) => (
                  <tr key={ym}>
                    <td><Link to={`/month/${ym}`}>{ym}</Link></td>
                    {[m.takeHome, m.grossTotal ?? 0, c.yuchoCard, c.recurringMitsui, c.recurringAll, c.datingTotal, c.outside, c.rakutenOutside, c.savingsOutside, c.cardBalance, m.savingsTransfer, c.savingsBalance, c.savingsDelta, c.rakutenBalance, c.nisaBalance].map((v, i) => <td key={i}>{yen(v)}</td>)}
                    <td>{c.overtimeHours}</td>
                    <td>{yen(c.overtimePay)}</td>
                    {c.ratios.map(r => <td key={r.key}>{r.pct.toFixed(1)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card tablewrap">
            <h2>카드 내역 항목별</h2>
            <table>
              <thead><tr><th>항목</th>{rows.map(r => <th key={r.ym}>{r.ym.slice(5)}월</th>)}<th>합계</th></tr></thead>
              <tbody>
                {items.map(([name, byYm]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    {rows.map(r => <td key={r.ym}>{yen(byYm[r.ym] ?? 0)}</td>)}
                    <td><b>{yen(sum(Object.values(byYm)))}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card">
            <h2>저축 누적 추이</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="ym" /><YAxis width={70} tickFormatter={yen} /><Tooltip formatter={yen} />
                <Line dataKey="savings" name="저축 누적" stroke="#2f6fed" strokeWidth={2} /></LineChart>
            </ResponsiveContainer>
          </section>

          <section className="card">
            <h2>월별 비율 (실제 %)</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="ym" /><YAxis width={40} /><Tooltip /><Legend />
                <Bar dataKey="fixed" name="고정비" stackId="a" fill="#6b7fd7" />
                <Bar dataKey="spending" name="지출" stackId="a" fill="#f0a35e" />
                <Bar dataKey="savingsPct" name="저축" stackId="a" fill="#4caf7d" /></BarChart>
            </ResponsiveContainer>
          </section>
        </>
      )}
    </>
  )
}
