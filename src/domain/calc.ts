import type { AppData, MonthRecord, PaidBy, Settings } from './types'

// ROUNDDOWN(x,0) — 부동소수 오차(정수 직전 값)를 epsilon으로 보정
const fl = (x: number) => Math.floor(x + 1e-9)
export const sum = (a: number[]) => a.reduce((s, n) => s + n, 0)
export const recurringTotal = (r: { amounts: number[] }) => sum(r.amounts)

export interface Balances { savings: number; rakuten: number; nisa: number }
export type RatioKey = 'fixed' | 'spending' | 'savings'

export function calcMonth(m: MonthRecord, s: Settings, prev: Balances) {
  const yuchoCard = sum(m.cardItems.map(recurringTotal))
  const outside = m.takeHome - yuchoCard
  const rakutenOutside = outside - s.rakutenCharge
  const savingsOutside = rakutenOutside - m.savingsTransfer
  const by = (p: PaidBy) => sum(m.recurring.filter(r => r.paidBy === p).map(recurringTotal))
  const recurringAccount = by('account')
  const recurringRakuten = by('rakuten')
  const recurringMitsui = by('mitsui')
  const recurringAll = recurringAccount + recurringRakuten // 미츠이분은 별도 항목
  const datingTotal = typeof m.dating === 'number' ? m.dating : 0 // 구버전(배열) 데이터 방어
  const cardBalance = savingsOutside - m.cash - datingTotal - recurringAccount - recurringMitsui
  const rakutenBalance = prev.rakuten + s.rakutenCharge - recurringRakuten
  const nisaBalance = prev.nisa + sum(m.recurring.filter(r => /nisa/i.test(r.name)).map(recurringTotal)) // 이름에 NISA가 들어간 월과금 = 적립액
  const savingsBalance = prev.savings + m.savingsTransfer + sum(m.savingsAdjustments.map(a => a.amount))
  const savingsRecommended = fl(fl(m.takeHome * s.ratios.savings) / s.savingsRoundingUnit) * s.savingsRoundingUnit
  const overtimeHours = Math.max(0, m.work.totalHours - m.work.scheduledHours - s.overtime.includedHours)
  const overtimePay = fl((m.grossBase / s.overtime.denominator) * s.overtime.multiplier * overtimeHours)
  const actual: Record<RatioKey, number> = {
    fixed: yuchoCard + recurringMitsui + recurringAccount + s.rakutenCharge,
    spending: m.cash + datingTotal + cardBalance,
    savings: m.savingsTransfer,
  }
  const ratios = (Object.keys(actual) as RatioKey[]).map(key => ({
    key,
    target: fl(m.takeHome * s.ratios[key]),
    actual: actual[key],
    pct: m.takeHome ? (actual[key] / m.takeHome) * 100 : 0,
  }))
  return {
    yuchoCard, outside, rakutenOutside, savingsOutside, recurringAll, recurringAccount, recurringRakuten, recurringMitsui, datingTotal,
    cardBalance, rakutenBalance, nisaBalance, savingsBalance, savingsDelta: savingsBalance - prev.savings,
    savingsRecommended, overtimeHours, overtimePay, ratios,
  }
}
export type Calc = ReturnType<typeof calcMonth>

// 월을 시간순으로 훑으며 전월 잔액을 이어받아 전체 계산
export function computeAll(d: AppData): Record<string, Calc> {
  const out: Record<string, Calc> = {}
  let prev: Balances = { savings: d.settings.opening.savingsBalance, rakuten: d.settings.opening.rakutenBalance, nisa: d.settings.opening.nisaBalance }
  for (const ym of Object.keys(d.months).sort()) {
    const c = calcMonth(d.months[ym], d.settings, prev)
    out[ym] = c
    prev = { savings: c.savingsBalance, rakuten: c.rakutenBalance, nisa: c.nisaBalance }
  }
  return out
}

const fmtYm = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
export const shiftYm = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number)
  return fmtYm(new Date(y, m - 1 + n, 1))
}
export const nowYm = () => fmtYm(new Date())
export const workLabel = (ym: string) => `${Number(shiftYm(ym, -1).slice(5))}월분`
export const yen = (n: number) => n.toLocaleString('ja-JP')
