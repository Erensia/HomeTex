import { Link, useParams } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { Num } from '../components/Num'
import { recurringTotal, shiftYm, workLabel, yen } from '../domain/calc'
import { carryOver, type MonthRecord, type PaidBy } from '../domain/types'

const LABEL = { fixed: '고정비', spending: '지출', savings: '저축' }

const Step = ({ label, value, minus }: { label: string; value: number; minus?: boolean }) => (
  <div className="row">
    <span>{minus ? '− ' : ''}{label}</span>
    <b className={value < 0 && !minus ? 'neg' : ''}>{yen(value)}</b>
  </div>
)

export default function Month() {
  const { ym = '' } = useParams()
  const { data, calc, dispatch } = useApp()
  if (!data || !/^\d{4}-\d{2}$/.test(ym)) return null
  const m = data.months[ym]
  const c = calc[ym]
  const s = data.settings

  const nav = (
    <div className="monthnav">
      <Link to={`/month/${shiftYm(ym, -1)}`}>◀</Link>
      <h1>{ym} ({workLabel(ym)})</h1>
      <Link to={`/month/${shiftYm(ym, 1)}`}>▶</Link>
    </div>
  )

  if (!m) {
    const prevYm = Object.keys(data.months).sort().filter(k => k < ym).at(-1)
    return (
      <>
        {nav}
        <section className="card">
          <p>아직 없는 달입니다.</p>
          {prevYm ? (
            <button className="primary" onClick={() => dispatch({ type: 'replace', data: { ...data, months: { ...data.months, [ym]: carryOver(data.months[prevYm]) }, meta: { ...data.meta, lastModifiedAt: new Date().toISOString() } } })}>
              전월 값으로 새 달 만들기
            </button>
          ) : (
            <p className="muted">시작 월({s.opening.month}) 이전에는 만들 수 없어요.</p>
          )}
        </section>
      </>
    )
  }

  const edit = (fn: (m: MonthRecord) => MonthRecord) => dispatch({ type: 'month', ym, fn })
  const setRec = (i: number, patch: Partial<MonthRecord['recurring'][number]>) =>
    edit(m => ({ ...m, recurring: m.recurring.map((r, j) => (j === i ? { ...r, ...patch } : r)) }))

  return (
    <>
      {nav}

      <section className="card">
        <h2>이번 달 입력</h2>
        <Num label="페이페이" value={m.cards.paypay} onChange={n => edit(m => ({ ...m, cards: { ...m.cards, paypay: n } }))} />
        <Num label="라인" value={m.cards.line} onChange={n => edit(m => ({ ...m, cards: { ...m.cards, line: n } }))} />
        <Num label="미츠이" value={m.cards.mitsui} onChange={n => edit(m => ({ ...m, cards: { ...m.cards, mitsui: n } }))} />
        <Num label="총근무시간" step="0.01" value={m.work.totalHours} onChange={n => edit(m => ({ ...m, work: { ...m.work, totalHours: n } }))} />
        <Num label="소정근무시간" step="0.01" value={m.work.scheduledHours} onChange={n => edit(m => ({ ...m, work: { ...m.work, scheduledHours: n } }))} />
      </section>

      <section className="card">
        <h2>급여 흐름</h2>
        <Step label="테토리" value={m.takeHome} />
        <Step label="유초 카드값 (페이페이+라인)" value={c.yuchoCard} minus />
        <Step label="카드값외" value={c.outside} />
        <Step label="저축 이체액" value={m.savingsTransfer} minus />
        <Step label="저축 외" value={c.savingsOutside} />
        <Step label="라쿠텐 충전" value={s.rakutenCharge} minus />
        <Step label="현금" value={m.cash} minus />
        <Step label="데이트비 (예상)" value={c.datingTotal} minus />
        <Step label="월과금 (계좌분)" value={c.recurringAccount} minus />
        <Step label="미츠이" value={m.cards.mitsui} minus />
        <div className="row total"><span>카드 잔액</span><b className={c.cardBalance < 0 ? 'neg' : ''}>{yen(c.cardBalance)}</b></div>
        {c.cardBalance < 0 && <p className="warn">카드 잔액이 음수입니다. 저축 이체액이나 지출을 확인하세요.</p>}
      </section>

      <section className="card">
        <h2>저축</h2>
        <Num label="저축 이체액" value={m.savingsTransfer} onChange={n => edit(m => ({ ...m, savingsTransfer: n }))} />
        <div className="row">
          <span>권장액 {yen(c.savingsRecommended)} (차이 {yen(m.savingsTransfer - c.savingsRecommended)})</span>
          <button onClick={() => edit(m => ({ ...m, savingsTransfer: c.savingsRecommended }))}>권장액 적용</button>
        </div>
        <h3>저축 조정</h3>
        {m.savingsAdjustments.map((a, i) => (
          <div className="inline" key={i}>
            <input type="number" inputMode="numeric" value={a.amount || ''} placeholder="금액 (−는 출금)"
              onChange={e => edit(m => ({ ...m, savingsAdjustments: m.savingsAdjustments.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) || 0 } : x)) }))} />
            <input value={a.memo} placeholder="메모"
              onChange={e => edit(m => ({ ...m, savingsAdjustments: m.savingsAdjustments.map((x, j) => (j === i ? { ...x, memo: e.target.value } : x)) }))} />
            <button onClick={() => edit(m => ({ ...m, savingsAdjustments: m.savingsAdjustments.filter((_, j) => j !== i) }))}>삭제</button>
          </div>
        ))}
        <button onClick={() => edit(m => ({ ...m, savingsAdjustments: [...m.savingsAdjustments, { amount: 0, memo: '' }] }))}>+ 조정 추가</button>
        <Step label="저축 누적" value={c.savingsBalance} />
        <Step label="저축 증감" value={c.savingsDelta} />
      </section>

      <section className="card">
        <h2>비율 목표 vs 실제</h2>
        {c.ratios.map(r => (
          <div key={r.key} className="ratio">
            <div className="row">
              <span>{LABEL[r.key]}</span>
              <span>{yen(r.actual)} ({r.pct.toFixed(1)}%) / 목표 {yen(r.target)} · 차이 {yen(r.actual - r.target)}</span>
            </div>
            <div className="bar">
              <i style={{ width: `${Math.min(100, Math.max(0, r.pct))}%` }} />
              <u style={{ left: `${s.ratios[r.key] * 100}%` }} />
            </div>
          </div>
        ))}
      </section>

      <details className="card">
        <summary>이어받은 값 (테토리·현금·월과금 등)</summary>
        <Num label="테토리" value={m.takeHome} onChange={n => edit(m => ({ ...m, takeHome: n }))} />
        <Num label="세전 기본급" value={m.grossBase} onChange={n => edit(m => ({ ...m, grossBase: n }))} />
        <Num label="총지급액 (세전)" value={m.grossTotal ?? 0} onChange={n => edit(m => ({ ...m, grossTotal: n || undefined }))} />
        <Num label="현금" value={m.cash} onChange={n => edit(m => ({ ...m, cash: n }))} />
        <Num label="데이트비 (월 예상총액)" value={c.datingTotal} onChange={n => edit(m => ({ ...m, dating: n }))} />
        <h3>월과금</h3>
        {m.recurring.map((r, i) => (
          <div className="inline" key={r.id}>
            <input value={r.name} onChange={e => setRec(i, { name: e.target.value })} />
            <input defaultValue={r.amounts.join('+')} placeholder="610+700"
              onBlur={e => setRec(i, { amounts: e.target.value.split(/[+,\s]+/).map(Number).filter(n => Number.isFinite(n) && n !== 0) })} />
            <select value={r.paidBy} onChange={e => setRec(i, { paidBy: e.target.value as PaidBy })}>
              <option value="account">계좌</option>
              <option value="rakuten">라쿠텐</option>
            </select>
            <span className="muted">{yen(recurringTotal(r))}</span>
            <button onClick={() => edit(m => ({ ...m, recurring: m.recurring.filter((_, j) => j !== i) }))}>삭제</button>
          </div>
        ))}
        <button onClick={() => edit(m => ({ ...m, recurring: [...m.recurring, { id: crypto.randomUUID(), name: '', amounts: [], paidBy: 'account' }] }))}>+ 항목 추가</button>
      </details>

      <section className="card">
        <h2>라쿠텐</h2>
        <Step label="충전" value={s.rakutenCharge} />
        <Step label="이번 달 월과금 (라쿠텐분)" value={c.recurringRakuten} minus />
        <div className="row total"><span>라쿠텐 잔액</span><b>{yen(c.rakutenBalance)}</b></div>
      </section>

      <section className="card">
        <h2>잔업수당 (참고)</h2>
        <Step label="잔업시간" value={c.overtimeHours} />
        <Step label="예상 수당" value={c.overtimePay} />
      </section>

      <section className="card">
        <h2>메모</h2>
        <textarea rows={4} value={m.memo} onChange={e => edit(m => ({ ...m, memo: e.target.value }))} />
      </section>
    </>
  )
}
