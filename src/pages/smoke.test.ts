import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { AppProvider } from '../state/AppContext'
import Home from './Home'
import Month from './Month'
import { defaultSettings, emptyMonth } from '../domain/types'
import type { AppData } from '../domain/types'

const month = (takeHome: number, transfer = 70000) => ({ ...emptyMonth(), takeHome, savingsTransfer: transfer })
const seed = (months: AppData['months']) => {
  const data: AppData = { schemaVersion: 1, settings: defaultSettings('2026-11'), months, meta: { lastExportedAt: null, lastModifiedAt: 'x' } }
  const store: Record<string, string> = { 'hometex:v1': JSON.stringify(data) }
  vi.stubGlobal('localStorage', { getItem: (k: string) => store[k] ?? null, setItem: () => {} })
}
const render = (path: string) =>
  renderToString(h(MemoryRouter, { initialEntries: [path] }, h(AppProvider, null,
    h(Routes, null, h(Route, { path: '/', element: h(Home) }), h(Route, { path: '/month/:ym', element: h(Month) })))))

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.spyOn(console, 'error').mockImplementation(() => {}) // react-router의 서버 렌더링 useLayoutEffect 경고 억제
})

it('월별: 테토리는 접힌 영역 밖에 있고, 전월과 같으면 확인 안내가 뜬다', () => {
  seed({ '2026-11': month(225979), '2026-12': month(225979) })
  const html = render('/month/2026-12')
  expect(html).toContain('테토리 (세후 수령액)')
  expect(html).toContain('전월과 같은 값이에요')
  expect(html.indexOf('테토리 (세후 수령액)')).toBeLessThan(html.indexOf('<details'))
})

it('월별: 테토리가 바뀌면 안내가 사라진다', () => {
  seed({ '2026-11': month(225979), '2026-12': month(231000) })
  expect(render('/month/2026-12')).not.toContain('전월과 같은 값이에요')
})

it('월별: 없는 달은 백업 안내와 새 달 만들기 버튼', () => {
  seed({ '2026-11': month(225979) })
  const html = render('/month/2026-12')
  expect(html).toContain('백업')
  expect(html).toContain('전월 값으로 새 달 만들기')
})

it('홈: 두 달 이상이면 전월 대비 카드 잔액을 보여주고, 한 달뿐이면 숨긴다', () => {
  seed({ '2026-11': month(225979), '2026-12': month(231000) })
  expect(render('/')).toContain('전월 대비 카드 잔액')
  seed({ '2026-11': month(225979) })
  expect(render('/')).not.toContain('전월 대비 카드 잔액')
})
