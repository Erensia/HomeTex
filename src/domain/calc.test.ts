import { describe, expect, it } from 'vitest'
import { calcMonth, computeAll } from './calc'
import { defaultRecurring, defaultSettings, emptyMonth } from './types'
import type { AppData } from './types'

const settings = defaultSettings('2026-11', 0, 17737)
const month = {
  ...emptyMonth(), takeHome: 225979, cards: { paypay: 25000, line: 0, mitsui: 6050 },
  cash: 20000, savingsTransfer: 70000, recurring: defaultRecurring(),
}

describe('4.6 검증 기준값 (2026-11)', () => {
  const c = calcMonth(month, settings, { savings: 0, rakuten: 17737 })
  it('급여 흐름', () => {
    expect([c.yuchoCard, c.outside, c.savingsOutside, c.cardBalance]).toEqual([25000, 200979, 130979, 89739])
  })
  it('라쿠텐 잔액', () => expect(c.rakutenBalance).toBe(24018))
  it('비율 목표/실제', () => {
    expect(c.ratios.map(r => r.target)).toEqual([85872, 70053, 70053])
    expect(c.ratios.map(r => r.actual)).toEqual([46240, 109739, 70000])
  })
  it('저축 권장액', () => expect(c.savingsRecommended).toBe(70000))
  it('불변: 실제 3항목 합 = 테토리', () => expect(c.ratios.reduce((s, r) => s + r.actual, 0)).toBe(225979))
})

it('잔업수당 예: 10시간 → 19531', () => {
  const c = calcMonth({ ...month, work: { totalHours: 198, scheduledHours: 168 } }, settings, { savings: 0, rakuten: 0 })
  expect([c.overtimeHours, c.overtimePay]).toEqual([10, 19531])
})

it('월 간 잔액 이어받기 + 저축 조정', () => {
  const d: AppData = {
    schemaVersion: 1, settings,
    months: { '2026-11': month, '2026-12': { ...month, savingsAdjustments: [{ amount: -250000, memo: '여행' }] } },
    meta: { lastExportedAt: null, lastModifiedAt: '' },
  }
  const r = computeAll(d)
  expect(r['2026-12'].savingsBalance).toBe(70000 + 70000 - 250000)
  expect(r['2026-12'].savingsDelta).toBe(-180000)
  expect(r['2026-12'].rakutenBalance).toBe(24018 + 10000 - 3719)
})
