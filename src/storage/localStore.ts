import type { AppData } from '../domain/types'
import { validate } from '../domain/merge'

const KEY = 'hometex:v1'
const BEFORE = 'hometex:v1:before-import'
const CORRUPT = 'hometex:v1:corrupt'

const read = (key: string): AppData | null => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? validate(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

// 저장값이 있는데 검증에 실패하면(깨짐·구 형식) 초기 설정이 덮어쓰기 전에 원본을 따로 보관한다
export const load = () => {
  const d = read(KEY)
  try {
    const raw = localStorage.getItem(KEY)
    if (!d && raw) localStorage.setItem(CORRUPT, raw)
  } catch { /* 보관 실패는 무시 */ }
  return d
}
export const loadCorruptRaw = () => {
  try { return localStorage.getItem(CORRUPT) } catch { return null }
}

// 저장 실패(용량 초과·사생활 보호 모드 등)는 화면이 죽지 않게 false로 알린다
export const save = (d: AppData) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(d))
    return true
  } catch {
    return false
  }
}

// 가져오기 직전 1세대 보관 → 되돌리기 1회
export const stashBeforeImport = (d: AppData) => localStorage.setItem(BEFORE, JSON.stringify(d))
export const loadBeforeImport = () => read(BEFORE)
export const clearBeforeImport = () => localStorage.removeItem(BEFORE)

export const requestPersist = () => navigator.storage?.persist?.().catch(() => {})
