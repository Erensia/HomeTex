import { useApp } from '../state/AppContext'
import { Num } from '../components/Num'
import type { Settings as S } from '../domain/types'

export default function Settings() {
  const { data, dispatch } = useApp()
  if (!data) return null
  const s = data.settings
  const set = (fn: (s: S) => S) => dispatch({ type: 'settings', fn })
  const total = s.ratios.fixed + s.ratios.spending + s.ratios.savings
  const pct = (label: string, k: keyof typeof s.ratios) => (
    <Num label={`${label} 비율 (%)`} step="0.1" value={Math.round(s.ratios[k] * 1000) / 10}
      onChange={n => set(s => ({ ...s, ratios: { ...s.ratios, [k]: n / 100 } }))} />
  )

  return (
    <>
      <h1>설정</h1>
      <section className="card">
        <h2>비율 목표</h2>
        {pct('고정비', 'fixed')}
        {pct('지출', 'spending')}
        {pct('저축', 'savings')}
        {Math.abs(total - 1) > 1e-6 && <p className="warn">합계가 {(total * 100).toFixed(1)}%입니다. 100%여야 해요.</p>}
      </section>
      <section className="card">
        <h2>고정값</h2>
        <Num label="라쿠텐 충전액" value={s.rakutenCharge} onChange={n => set(s => ({ ...s, rakutenCharge: n }))} />
        <Num label="저축 권장액 반올림 단위" value={s.savingsRoundingUnit} onChange={n => set(s => ({ ...s, savingsRoundingUnit: n || 1 }))} />
      </section>
      <section className="card">
        <h2>잔업 계산</h2>
        <Num label="잔업 분모" value={s.overtime.denominator} onChange={n => set(s => ({ ...s, overtime: { ...s.overtime, denominator: n || 1 } }))} />
        <Num label="잔업 배율" step="0.01" value={s.overtime.multiplier} onChange={n => set(s => ({ ...s, overtime: { ...s.overtime, multiplier: n } }))} />
        <Num label="고정 잔업 포함 시간" step="0.01" value={s.overtime.includedHours} onChange={n => set(s => ({ ...s, overtime: { ...s.overtime, includedHours: n } }))} />
      </section>
      <section className="card">
        <h2>초기 잔액 ({s.opening.month} 시작 기준)</h2>
        <Num label="초기 저축 잔액" value={s.opening.savingsBalance} onChange={n => set(s => ({ ...s, opening: { ...s.opening, savingsBalance: n } }))} />
        <Num label="초기 라쿠텐 잔액" value={s.opening.rakutenBalance} onChange={n => set(s => ({ ...s, opening: { ...s.opening, rakutenBalance: n } }))} />
      </section>
    </>
  )
}
