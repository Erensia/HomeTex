import type { AppData } from './types'

const isObj = (x: unknown): x is Record<string, any> => typeof x === 'object' && x !== null
const num = (x: unknown) => typeof x === 'number' && Number.isFinite(x)

// 실패 시 사유를 담은 Error를 던진다
export function validate(x: unknown): AppData {
  if (!isObj(x)) throw new Error('JSON 객체가 아닙니다.')
  if (x.schemaVersion !== 1) throw new Error(`지원하지 않는 schemaVersion: ${x.schemaVersion}`)
  const s = x.settings
  if (!isObj(s) || !isObj(s.ratios) || !isObj(s.opening) || !isObj(s.overtime) || !num(s.rakutenCharge) || !num(s.savingsRoundingUnit) || typeof s.updatedAt !== 'string')
    throw new Error('settings 필드가 올바르지 않습니다.')
  if (!isObj(x.months)) throw new Error('months 필드가 없습니다.')
  for (const [ym, m] of Object.entries<any>(x.months)) {
    const ok = /^\d{4}-\d{2}$/.test(ym) && isObj(m) && isObj(m.cards) && isObj(m.work) && num(m.takeHome) && num(m.grossBase) &&
      num(m.cash) && num(m.savingsTransfer) && num(m.cards.paypay) && num(m.cards.line) && num(m.cards.mitsui) &&
      Array.isArray(m.recurring) && Array.isArray(m.savingsAdjustments) && typeof m.updatedAt === 'string'
    if (!ok) throw new Error(`월 데이터(${ym})가 올바르지 않습니다.`)
  }
  return {
    schemaVersion: 1, exportedAt: x.exportedAt, settings: s as AppData['settings'], months: x.months,
    meta: { lastExportedAt: x.meta?.lastExportedAt ?? null, lastModifiedAt: x.meta?.lastModifiedAt ?? new Date().toISOString() },
  }
}

export type Diff = 'new' | 'incoming' | 'current' | 'same'
const diff = (cur: string | undefined, inc: string): Diff => {
  if (cur === undefined) return 'new'
  const a = Date.parse(cur), b = Date.parse(inc)
  return b > a ? 'incoming' : b < a ? 'current' : 'same'
}

export function compare(cur: AppData | null, inc: AppData) {
  return {
    settings: diff(cur?.settings.updatedAt, inc.settings.updatedAt),
    months: Object.fromEntries(Object.entries(inc.months).map(([ym, m]) => [ym, diff(cur?.months[ym]?.updatedAt, m.updatedAt)])) as Record<string, Diff>,
  }
}

// 월·설정 단위로 updatedAt이 더 최신인 쪽 채택
export function merge(cur: AppData, inc: AppData): AppData {
  const cmp = compare(cur, inc)
  const months = { ...cur.months }
  for (const [ym, d] of Object.entries(cmp.months)) if (d === 'new' || d === 'incoming') months[ym] = inc.months[ym]
  const settings = cmp.settings === 'incoming' ? inc.settings : cur.settings
  return { ...cur, settings, months, meta: { ...cur.meta, lastModifiedAt: new Date().toISOString() } }
}
