export type PaidBy = 'account' | 'rakuten' | 'mitsui'

export interface Recurring { id: string; name: string; amounts: number[]; paidBy: PaidBy }

export type CardKind = 'paypay' | 'line'

export interface CardItem { id: string; name: string; amounts: number[]; card: CardKind }

export interface MonthRecord {
  updatedAt: string
  cardItems: CardItem[] // 유초 카드값 세부 내역 (페이페이+라인)
  takeHome: number
  grossBase: number
  grossTotal?: number
  work: { totalHours: number; scheduledHours: number }
  cash: number
  savingsTransfer: number
  savingsAdjustments: { amount: number; memo: string }[]
  recurring: Recurring[]
  dating?: number // 월 데이트비 예상총액 (카드 잔액에서 차감)
  memo: string
}

export interface Settings {
  updatedAt: string
  ratios: { fixed: number; spending: number; savings: number }
  rakutenCharge: number
  overtime: { denominator: number; multiplier: number; includedHours: number }
  savingsRoundingUnit: number
  opening: { month: string; savingsBalance: number; rakutenBalance: number; nisaBalance: number }
}

export interface AppData {
  schemaVersion: 1
  exportedAt?: string
  settings: Settings
  months: Record<string, MonthRecord>
  meta: { lastExportedAt: string | null; lastModifiedAt: string }
}

export const defaultRecurring = (): Recurring[] => [
  { id: 'r1', name: '공월', amounts: [610, 700], paidBy: 'account' },
  { id: 'r2', name: '기행', amounts: [1400, 2480], paidBy: 'account' },
  { id: 'r3', name: '클로드', amounts: [3719], paidBy: 'rakuten' },
]

export const defaultSettings = (month: string, savingsBalance = 0, rakutenBalance = 0, nisaBalance = 0): Settings => ({
  updatedAt: new Date().toISOString(),
  ratios: { fixed: 0.38, spending: 0.31, savings: 0.31 },
  rakutenCharge: 10000,
  overtime: { denominator: 160, multiplier: 1.25, includedHours: 20 },
  savingsRoundingUnit: 10000,
  opening: { month, savingsBalance, rakutenBalance, nisaBalance },
})

export const emptyMonth = (): MonthRecord => ({
  updatedAt: new Date().toISOString(),
  cardItems: [],
  takeHome: 0,
  grossBase: 250000,
  work: { totalHours: 0, scheduledHours: 0 },
  cash: 20000,
  savingsTransfer: 0,
  savingsAdjustments: [],
  recurring: defaultRecurring(),
  memo: '',
})

// 3.1: 전월에서 이어받는 값만 복사, 나머지는 빈 값
export const carryOver = (prev: MonthRecord): MonthRecord => ({
  ...emptyMonth(),
  takeHome: prev.takeHome,
  grossBase: prev.grossBase,
  grossTotal: prev.grossTotal,
  cardItems: prev.cardItems.map(i => ({ ...i, id: crypto.randomUUID(), amounts: [] })), // 이름·카드만 이어받고 금액은 비움
  cash: prev.cash,
  dating: prev.dating,
  savingsTransfer: prev.savingsTransfer,
  recurring: prev.recurring.map(r => ({ ...r, amounts: [...r.amounts] })),
})
