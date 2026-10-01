import { expect, it } from 'vitest'
import { compare, merge, validate } from './merge'
import { defaultSettings, emptyMonth } from './types'
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
