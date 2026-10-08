import type { AppData, MonthRecord, Recurring, Settings } from './types'

// ROUNDDOWN(x,0) — 부동소수 오차(정수 직전 값)를 epsilon으로 보정
const fl = (x: number) => Math.floor(x + 1e-9)
export const sum = (a: number[]) => a.reduce((s, n) => s + n, 0)
export const recurringTotal = (r: Recurring) => sum(r.amounts)

export interface Balances { savings: number; rakuten: number }
export type RatioKey = 'fixed' | 'spending' | 'savings'

export function calcMonth(m: MonthRecord, s: Settings, prev: Balances) {
  const yuchoCard = m.cards.paypay + m.cards.line
  const outside = m.takeHome - yuchoCard
  const savingsOutside = outside - m.savingsTransfer
  const recurringAll = sum(m.recurring.map(recurringTotal))
  const recurringAccount = sum(m.recurring.filter(r => r.paidBy === 'account').map(recurringTotal))
  const recurringRakuten = recurringAll - recurringAccount
  const datingTotal = typeof m.dating === 'number' ? m.dating : 0 // 구버전(배열) 데이터 방어
  const cardBalance = savingsOutside - s.rakutenCharge - m.cash - datingTotal - recurringAccount - m.cards.mitsui
  const rakutenBalance = prev.rakuten + s.rakutenCharge - recurringRakuten
  const savingsBalance = prev.savings + m.savingsTransfer + sum(m.savingsAdjustments.map(a => a.amount))
  const savingsRecommended = fl(fl(m.takeHome * s.ratios.savings) / s.savingsRoundingUnit) * s.savingsRoundingUnit
  const overtimeHours = Math.max(0, m.work.totalHours - m.work.scheduledHours - s.overtime.includedHours)
  const overtimePay = fl((m.grossBase / s.overtime.denominator) * s.overtime.multiplier * overtimeHours)
  const actual: Record<RatioKey, number> = {
    fixed: yuchoCard + m.cards.mitsui + recurringAccount + s.rakutenCharge,
    spending: m.cash + datingTotal + cardBalance,
    savings: m.savingsTransfer,
  }
  const ratios = (['fixed', 'spending', 'savings'] as RatioKey[]).map(key => ({
    key,
    target: fl(m.takeHome * s.ratios[key]),
    actual: actual[key],
    pct: m.takeHome ? (actual[key] / m.takeHome) * 100 : 0,
  }))
  return {
    yuchoCard, outside, savingsOutside, recurringAll, recurringAccount, recurringRakuten, datingTotal,
    cardBalance, rakutenBalance, savingsBalance, savingsDelta: savingsBalance - prev.savings,
    savingsRecommended, overtimeHours, overtimePay, ratios,
  }
}
export type Calc = ReturnType<typeof calcMonth>

// 월을 시간순으로 훑으며 전월 잔액을 이어받아 전체 계산
export function computeAll(d: AppData): Record<string, Calc> {
  const out: Record<string, Calc> = {}
  let prev: Balances = { savings: d.settings.opening.savingsBalance, rakuten: d.settings.opening.rakutenBalance }
  for (const ym of Object.keys(d.months).sort()) {
    const c = calcMonth(d.months[ym], d.settings, prev)
    out[ym] = c
    prev = { savings: c.savingsBalance, rakuten: c.rakutenBalance }
  }
  return out
}

export const shiftYm = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
export const nowYm = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
export const workLabel = (ym: string) => `${Number(shiftYm(ym, -1).slice(5))}월분`
export const yen = (n: number) => n.toLocaleString('ja-JP')
