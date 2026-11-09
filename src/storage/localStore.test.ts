import { beforeEach, expect, it, vi } from 'vitest'
import { load, loadCorruptRaw, save } from './localStore'
import { defaultSettings } from '../domain/types'

let store: Record<string, string>
beforeEach(() => {
  store = {}
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
  })
})

it('읽을 수 없는 저장값은 초기 설정이 덮어쓰기 전에 따로 보관된다', () => {
  store['hometex:v1'] = '{"cards":{"paypay":1}}' // 구 형식
  expect(load()).toBeNull()
  expect(loadCorruptRaw()).toBe('{"cards":{"paypay":1}}')
})

it('정상 데이터나 빈 저장소는 보관본을 만들지 않는다', () => {
  expect(load()).toBeNull()
  expect(loadCorruptRaw()).toBeNull()
  save({ schemaVersion: 1, settings: defaultSettings('2026-11'), months: {}, meta: { lastExportedAt: null, lastModifiedAt: '' } })
  expect(load()).not.toBeNull()
  expect(loadCorruptRaw()).toBeNull()
})

it('저장 실패는 예외 대신 false', () => {
  vi.stubGlobal('localStorage', { setItem: () => { throw new Error('QuotaExceeded') } })
  expect(save({ schemaVersion: 1, settings: defaultSettings('2026-11'), months: {}, meta: { lastExportedAt: null, lastModifiedAt: '' } })).toBe(false)
})
