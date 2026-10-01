import type { AppData } from '../domain/types'
import { validate } from '../domain/merge'

export async function readBackup(file: File): Promise<AppData> {
  let json: unknown
  try {
    json = JSON.parse(await file.text())
  } catch {
    throw new Error('JSON을 읽을 수 없습니다.')
  }
  return validate(json)
}

const pad = (n: number) => String(n).padStart(2, '0')

// 성공하면 true (공유 시트 취소 시 false)
export async function exportBackup(d: AppData): Promise<boolean> {
  const now = new Date()
  const name = `hometex-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`
  const file = new File([JSON.stringify({ ...d, exportedAt: now.toISOString() }, null, 2)], name, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return true
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(file)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
  return true
}
