import type { AppData } from '../domain/types'
import { validate } from '../domain/merge'

const KEY = 'hometex:v1'
const BEFORE = 'hometex:v1:before-import'

const read = (key: string): AppData | null => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? validate(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export const load = () => read(KEY)
export const save = (d: AppData) => localStorage.setItem(KEY, JSON.stringify(d))

// 가져오기 직전 1세대 보관 → 되돌리기 1회
export const stashBeforeImport = (d: AppData) => localStorage.setItem(BEFORE, JSON.stringify(d))
export const loadBeforeImport = () => read(BEFORE)
export const clearBeforeImport = () => localStorage.removeItem(BEFORE)

export const requestPersist = () => navigator.storage?.persist?.().catch(() => {})
