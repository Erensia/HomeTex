import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { recurringTotal, sum, yen, type Calc } from '../domain/calc'
import type { MonthRecord } from '../domain/types'

type Row = { ym: string; m: MonthRecord; c: Calc }
// [헤더, 값, 핵심 열 여부]
const COLS: [string, (r: Row) => string | number, boolean?][] = [
  ['테토리', r => yen(r.m.takeHome), true],
  ['유초 카드값', r => yen(r.c.yuchoCard)],
  ['카드 잔액', r => yen(r.c.cardBalance), true],
  ['저축 이체', r => yen(r.m.savingsTransfer)],
  ['저축 누적', r => yen(r.c.savingsBalance), true],
  ['증감', r => yen(r.c.savingsDelta)],
  ['총지급(세전)', r => yen(r.m.grossTotal ?? 0)],
  ['미츠이', r => yen(r.c.recurringMitsui)],
  ['월과금', r => yen(r.c.recurringAll)],
  ['데이트비', r => yen(r.c.datingTotal)],
  ['카드값외', r => yen(r.c.outside)],
  ['라쿠텐외', r => yen(r.c.rakutenOutside)],
  ['저축 외', r => yen(r.c.savingsOutside)],
  ['라쿠텐 잔액', r => yen(r.c.rakutenBalance)],
  ['NISA 잔액', r => yen(r.c.nisaBalance)],
  ['잔업h', r => r.c.overtimeHours],
  ['잔업수당', r => yen(r.c.overtimePay)],
  ['고정비%', r => r.c.ratios[0].pct.toFixed(1)],
  ['지출%', r => r.c.ratios[1].pct.toFixed(1)],
  ['저축%', r => r.c.ratios[2].pct.toFixed(1)],
]

const SEG = ['var(--seg1)', 'var(--seg2)', 'var(--seg3)']
const LABELS = ['고정비', '지출', '저축']

export default function Summary() {
  const { year = '' } = useParams()
  const { data, calc } = useApp()
  const [all, setAll] = useState(false)
  if (!data) return null
  if (!/^\d{4}$/.test(year)) return <Navigate to="/" replace />
  const cols = COLS.filter(c => all || c[2])
  const yms = Object.keys(data.months).filter(k => k.startsWith(year)).sort()
  const rows = yms.map(ym => ({ ym, m: data.months[ym], c: calc[ym] }))
  const y = Number(year)
  const avg = rows.length ? Math.floor(sum(rows.map(r => r.c.cardBalance)) / rows.length) : 0
  const last = rows.at(-1)?.c
  const maxSavings = Math.max(1, ...rows.map(r => r.c.savingsBalance))
  // 카드 내역: 이름별 월 합계 (연간 합계 큰 순)
  const byName: Record<string, Record<string, number>> = {}
  for (const { ym, m } of rows) for (const it of m.cardItems) {
    const n = it.name.trim() || '(이름 없음)'
    byName[n] = { ...byName[n], [ym]: (byName[n]?.[ym] ?? 0) + recurringTotal(it) }
  }
  const items = Object.entries(byName).sort((a, b) => sum(Object.values(b[1])) - sum(Object.values(a[1])))

  return (
    <>
      <div className="monthnav">
        <Link to={`/summary/${y - 1}`} aria-label="이전 해">◀</Link>
        <h1>{year}년 요약</h1>
        <Link to={`/summary/${y + 1}`} aria-label="다음 해">▶</Link>
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

          <section className="card">
            <div className="row">
              <h2>월별 표</h2>
              <button onClick={() => setAll(v => !v)} aria-pressed={all}>{all ? '핵심 항목만' : '전체 항목 보기'}</button>
            </div>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr><th>월</th>{cols.map(([h]) => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.ym}>
                      <td><Link to={`/month/${r.ym}`}>{r.ym}</Link></td>
                      {cols.map(([h, f]) => <td key={h} className={h === '카드 잔액' && r.c.cardBalance < 0 ? 'neg' : ''}>{f(r)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            {rows.map(({ ym, c }) => (
              <div className="brow" key={ym}>
                <span>{ym.slice(5)}월</span>
                <div className="bar"><i style={{ width: `${(Math.max(0, c.savingsBalance) / maxSavings) * 100}%` }} /></div>
                <span>{yen(c.savingsBalance)}</span>
              </div>
            ))}
          </section>

          <section className="card">
            <h2>월별 비율 (실제 %)</h2>
            <p className="muted legend">{LABELS.map((l, i) => <span key={l}><i style={{ background: SEG[i] }} />{l}</span>)}</p>
            {rows.map(({ ym, c }) => (
              <div className="brow" key={ym}>
                <span>{ym.slice(5)}월</span>
                <div className="bar stack">{c.ratios.map((r, i) => <i key={r.key} style={{ width: `${Math.max(0, r.pct)}%`, background: SEG[i] }} />)}</div>
                <span>{c.ratios.map(r => r.pct.toFixed(0)).join('/')}</span>
              </div>
            ))}
          </section>
        </>
      )}
    </>
  )
}
