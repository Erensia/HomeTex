import { Link, useParams } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { Num } from '../components/Num'
import { Balance } from '../components/Balance'
import { parseAmounts, recurringTotal, shiftYm, workLabel, yen } from '../domain/calc'
import { carryOver, type CardKind, type MonthRecord, type PaidBy } from '../domain/types'

const LABEL = { fixed: '고정비', spending: '지출', savings: '저축' }

const ask = (what: string, empty: boolean) => empty || window.confirm(`${what}을(를) 삭제할까요?`)

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
      <Link to={`/month/${shiftYm(ym, -1)}`} aria-label="이전 달">◀</Link>
      <h1>{ym} ({workLabel(ym)})</h1>
      <Link to={`/month/${shiftYm(ym, 1)}`} aria-label="다음 달">▶</Link>
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
            <button className="primary" onClick={() => dispatch({ type: 'month', ym, fn: () => carryOver(data.months[prevYm]) })}>
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
  const hours = (label: string, k: keyof MonthRecord['work']) => (
    <Num label={label} step="0.01" value={m.work[k]} onChange={n => edit(m => ({ ...m, work: { ...m.work, [k]: n } }))} />
  )
  const setAdj = (i: number, patch: Partial<MonthRecord['savingsAdjustments'][number]>) =>
    edit(m => ({ ...m, savingsAdjustments: m.savingsAdjustments.map((x, j) => (j === i ? { ...x, ...patch } : x)) }))
  const setItem = (i: number, patch: Partial<MonthRecord['cardItems'][number]>) =>
    edit(m => ({ ...m, cardItems: m.cardItems.map((x, j) => (j === i ? { ...x, ...patch } : x)) }))
  const cardNames = [...new Set(Object.values(data.months).flatMap(x => x.cardItems.map(i => i.name)))].filter(Boolean)
  const setRec = (i: number, patch: Partial<MonthRecord['recurring'][number]>) =>
    edit(m => ({ ...m, recurring: m.recurring.map((r, j) => (j === i ? { ...r, ...patch } : r)) }))

  return (
    <>
      {nav}

      <section className="card">
        <Balance label="카드 잔액" value={c.cardBalance} />
        <dl>
          <dt>저축 누적</dt><dd>{yen(c.savingsBalance)}</dd>
          <dt>라쿠텐 잔액</dt><dd>{yen(c.rakutenBalance)}</dd>
        </dl>
      </section>

      <p className="group">입력</p>
      <section className="card">
        <h2>이번 달 입력</h2>
        {hours('총근무시간', 'totalHours')}
        {hours('소정근무시간', 'scheduledHours')}
      </section>

      <section className="card">
        <h2>카드 내역 (페이페이·라인)</h2>
        <datalist id="card-names">{cardNames.map(n => <option key={n} value={n} />)}</datalist>
        {m.cardItems.map((it, i) => (
          <div className="item" key={`${ym}-${it.id}`}>
            <input list="card-names" value={it.name} placeholder="항목" aria-label="항목명" onChange={e => setItem(i, { name: e.target.value })} />
            <input defaultValue={it.amounts.join('+')} placeholder="1200+500" aria-label="금액 (+로 합산)" inputMode="numeric"
              onBlur={e => setItem(i, { amounts: parseAmounts(e.target.value) })} />
            <div className="sub">
              <select value={it.card} aria-label="카드 종류" onChange={e => setItem(i, { card: e.target.value as CardKind })}>
                <option value="paypay">페이페이</option>
                <option value="line">라인</option>
              </select>
              <span className="sum">{yen(recurringTotal(it))}</span>
              <button className="danger" aria-label={`${it.name || '항목'} 삭제`}
                onClick={() => ask(`'${it.name || '항목'}'`, !it.name && !it.amounts.length) && edit(m => ({ ...m, cardItems: m.cardItems.filter((_, j) => j !== i) }))}>삭제</button>
            </div>
          </div>
        ))}
        <button onClick={() => edit(m => ({ ...m, cardItems: [...m.cardItems, { id: crypto.randomUUID(), name: '', amounts: [], card: 'paypay' }] }))}>+ 항목 추가</button>
        <p className="muted hint">금액은 +로 합산해요 (예: 1200+500). 입력칸을 벗어나면 반영돼요.</p>
        {([['paypay', '페이페이'], ['line', '라인']] as const).map(([k, label]) => (
          <div className="row" key={k}>
            <span>{label} 합계</span>
            <b>{yen(m.cardItems.filter(i => i.card === k).reduce((a, i) => a + recurringTotal(i), 0))}</b>
          </div>
        ))}
        <div className="row total"><span>유초 카드값 합계</span><b>{yen(c.yuchoCard)}</b></div>
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
          <div className="item" key={i}>
            <input type="number" inputMode="numeric" value={a.amount || ''} placeholder="금액 (−는 출금)" aria-label="조정 금액"
              onChange={e => setAdj(i, { amount: Number(e.target.value) || 0 })} />
            <input value={a.memo} placeholder="메모" aria-label="조정 메모"
              onChange={e => setAdj(i, { memo: e.target.value })} />
            <div className="sub">
              <span className="sum" />
              <button className="danger" aria-label="저축 조정 삭제"
                onClick={() => ask(`'${a.memo || '저축 조정'}'`, !a.memo && !a.amount) && edit(m => ({ ...m, savingsAdjustments: m.savingsAdjustments.filter((_, j) => j !== i) }))}>삭제</button>
            </div>
          </div>
        ))}
        <button onClick={() => edit(m => ({ ...m, savingsAdjustments: [...m.savingsAdjustments, { amount: 0, memo: '' }] }))}>+ 조정 추가</button>
        <Step label="저축 누적" value={c.savingsBalance} />
        <Step label="저축 증감" value={c.savingsDelta} />
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
          <div className="item" key={`${ym}-${r.id}`}>
            <input value={r.name} placeholder="항목" aria-label="월과금 항목명" onChange={e => setRec(i, { name: e.target.value })} />
            <input defaultValue={r.amounts.join('+')} placeholder="610+700" aria-label="금액 (+로 합산)" inputMode="numeric"
              onBlur={e => setRec(i, { amounts: parseAmounts(e.target.value) })} />
            <div className="sub">
              <select value={r.paidBy} aria-label="결제처" onChange={e => setRec(i, { paidBy: e.target.value as PaidBy })}>
                <option value="account">계좌</option>
                <option value="rakuten">라쿠텐</option>
                <option value="mitsui">미츠이</option>
              </select>
              <span className="sum">{yen(recurringTotal(r))}</span>
              <button className="danger" aria-label={`${r.name || '항목'} 삭제`}
                onClick={() => ask(`'${r.name || '항목'}'`, !r.name && !r.amounts.length) && edit(m => ({ ...m, recurring: m.recurring.filter((_, j) => j !== i) }))}>삭제</button>
            </div>
          </div>
        ))}
        <button onClick={() => edit(m => ({ ...m, recurring: [...m.recurring, { id: crypto.randomUUID(), name: '', amounts: [], paidBy: 'account' }] }))}>+ 항목 추가</button>
      </details>

      <section className="card">
        <h2>메모</h2>
        <textarea rows={4} value={m.memo} onChange={e => edit(m => ({ ...m, memo: e.target.value }))} />
      </section>

      <p className="group">결과</p>

      <section className="card">
        <h2>급여 흐름</h2>
        <Step label="테토리" value={m.takeHome} />
        <Step label="유초 카드값 (페이페이+라인)" value={c.yuchoCard} minus />
        <Step label="카드값외" value={c.outside} />
        <Step label="라쿠텐 충전" value={s.rakutenCharge} minus />
        <Step label="라쿠텐외" value={c.rakutenOutside} />
        <Step label="저축 이체액" value={m.savingsTransfer} minus />
        <Step label="저축 외" value={c.savingsOutside} />
        <Step label="현금" value={m.cash} minus />
        <Step label="데이트비 (예상)" value={c.datingTotal} minus />
        <Step label="월과금 (계좌분)" value={c.recurringAccount} minus />
        <Step label="미츠이" value={c.recurringMitsui} minus />
        <div className="row total"><span>카드 잔액</span><b className={c.cardBalance < 0 ? 'neg' : ''}>{yen(c.cardBalance)}</b></div>
        {c.cardBalance < 0 && <p className="warn">카드 잔액이 음수입니다. 저축 이체액이나 지출을 확인하세요.</p>}
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
        <summary>라쿠텐 · 잔업수당</summary>
        <h3>라쿠텐</h3>
        <Step label="충전" value={s.rakutenCharge} />
        <Step label="이번 달 월과금 (라쿠텐분)" value={c.recurringRakuten} minus />
        <div className="row total"><span>라쿠텐 잔액</span><b>{yen(c.rakutenBalance)}</b></div>
        <h3>잔업수당 (참고)</h3>
        <Step label="잔업시간" value={c.overtimeHours} />
        <Step label="예상 수당" value={c.overtimePay} />
      </details>
    </>
  )
}
