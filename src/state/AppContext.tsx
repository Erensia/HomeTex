import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import type { AppData, MonthRecord, Settings } from '../domain/types'
import { computeAll } from '../domain/calc'
import { load, requestPersist, save } from '../storage/localStore'

type Action =
  | { type: 'replace'; data: AppData }
  | { type: 'month'; ym: string; fn: (m: MonthRecord) => MonthRecord }
  | { type: 'settings'; fn: (s: Settings) => Settings }
  | { type: 'exported' }

const now = () => new Date().toISOString()

function reducer(d: AppData | null, a: Action): AppData | null {
  if (a.type === 'replace') return a.data
  if (!d) return d
  const t = now()
  switch (a.type) {
    case 'month':
      return { ...d, months: { ...d.months, [a.ym]: { ...a.fn(d.months[a.ym]), updatedAt: t } }, meta: { ...d.meta, lastModifiedAt: t } }
    case 'settings':
      return { ...d, settings: { ...a.fn(d.settings), updatedAt: t }, meta: { ...d.meta, lastModifiedAt: t } }
    case 'exported':
      return { ...d, meta: { ...d.meta, lastExportedAt: t } }
  }
}

const Ctx = createContext<{ data: AppData | null; calc: ReturnType<typeof computeAll>; dispatch: (a: Action) => void; saveFailed: boolean }>(null!)

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, null, load)
  const [saveFailed, setSaveFailed] = useState(false)
  useEffect(() => { requestPersist() }, [])
  useEffect(() => { if (data) setSaveFailed(!save(data)) }, [data])
  const calc = useMemo(() => (data ? computeAll(data) : {}), [data])
  return <Ctx.Provider value={{ data, calc, dispatch, saveFailed }}>{children}</Ctx.Provider>
}

export const useApp = () => useContext(Ctx)

export const latestMonth = (d: AppData) => Object.keys(d.months).sort().at(-1)
export const prevMonth = (d: AppData, ym: string) => Object.keys(d.months).sort().filter(k => k < ym).at(-1)
export const needsBackup = (d: AppData) =>
  Object.keys(d.months).length > 0 && (!d.meta.lastExportedAt || d.meta.lastModifiedAt > d.meta.lastExportedAt)
