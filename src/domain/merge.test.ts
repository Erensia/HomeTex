import { expect, it } from 'vitest'
import { compare, merge, validate } from './merge'
import { carryOver, defaultSettings, emptyMonth } from './types'
import type { AppData } from './types'

const mk = (ms: Record<string, string>): AppData => ({
  schemaVersion: 1, settings: defaultSettings('2026-11'),
  months: Object.fromEntries(Object.entries(ms).map(([k, t]) => [k, { ...emptyMonth(), updatedAt: t, memo: t }])),
  meta: { lastExportedAt: null, lastModifiedAt: '' },
})

it('병합: 월별로 최신 채택', () => {
  const cur = mk({ '2026-11': '2026-11-02T00:00:00Z', '2026-12': '2026-12-01T00:00:00Z' })
  const inc = mk({ '2026-11': '2026-11-01T00:00:00Z', '2026-12': '2026-12-05T00:00:00Z', '2027-01': '2027-01-01T00:00:00Z' })
  expect(compare(cur, inc).months).toEqual({ '2026-11': 'current', '2026-12': 'incoming', '2027-01': 'new' })
  const m = merge(cur, inc).months
  expect([m['2026-11'].memo, m['2026-12'].memo, !!m['2027-01']]).toEqual(['2026-11-02T00:00:00Z', '2026-12-05T00:00:00Z', true])
})

it('검증: 잘못된 파일은 거부', () => {
  expect(() => validate({ schemaVersion: 2 })).toThrow()
  expect(() => validate(JSON.parse(JSON.stringify(mk({ '2026-11': '2026-11-01T00:00:00Z' }))))).not.toThrow()
})

it('구버전 cards → cardItems, cards.mitsui → 결제처 미츠이 월과금으로 이관', () => {
  const old = JSON.parse(JSON.stringify(mk({ '2026-11': '2026-11-01T00:00:00Z' })))
  const { cardItems, ...legacy } = old.months['2026-11']
  old.months['2026-11'] = { ...legacy, cards: { paypay: 25000, line: 0, mitsui: 6050 } }
  const m = validate(old).months['2026-11']
  expect('cards' in m).toBe(false)
  expect(m.cardItems).toMatchObject([{ name: '페이페이', amounts: [25000], card: 'paypay' }])
  expect(m.recurring.at(-1)).toMatchObject({ amounts: [6050], paidBy: 'mitsui' })
})

it('새 달 이어받기: 카드 내역은 이름·카드만 남기고 금액은 비움', () => {
  const m = carryOver({ ...emptyMonth(), cardItems: [{ id: 'a', name: '스벅', amounts: [500, 300], card: 'line' }] })
  expect(m.cardItems).toMatchObject([{ name: '스벅', amounts: [], card: 'line' }])
})
