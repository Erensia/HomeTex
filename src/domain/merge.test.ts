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

it('검증: 항목 내부 값(금액 배열·결제처·월 번호)이 잘못된 파일도 거부', () => {
  const ok = JSON.parse(JSON.stringify(mk({ '2026-11': '2026-11-01T00:00:00Z' })))
  const bad = (patch: (d: any) => void) => { const d = JSON.parse(JSON.stringify(ok)); patch(d); return () => validate(d) }
  expect(bad(d => { d.months['2026-11'].cardItems = [{ id: 'a', name: 'x', amounts: ['1200'], card: 'line' }] })).toThrow()
  expect(bad(d => { d.months['2026-11'].recurring[0].paidBy = 'cash' })).toThrow()
  expect(bad(d => { d.months['2026-13'] = d.months['2026-11'] })).toThrow()
  expect(bad(d => { d.settings.ratios.fixed = '0.38' })).toThrow()
  expect(bad(() => {})).not.toThrow()
})

it('새 달 이어받기: 카드 내역은 이름·카드만 남기고 금액은 비움', () => {
  const m = carryOver({ ...emptyMonth(), cardItems: [{ id: 'a', name: '스벅', amounts: [500, 300], card: 'line' }] })
  expect(m.cardItems).toMatchObject([{ name: '스벅', amounts: [], card: 'line' }])
})
