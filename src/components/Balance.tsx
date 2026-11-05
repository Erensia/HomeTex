import { yen } from '../domain/calc'

// 핵심 잔액 강조 표시. 음수는 색뿐 아니라 '잔액 부족' 문구로도 알린다.
export function Balance({ label, value }: { label: string; value: number }) {
  const neg = value < 0
  return (
    <div className="hero">
      <span className="muted">{label}</span>
      <b className={neg ? 'neg' : ''}>
        {yen(value)}<small>엔</small>
        {neg && <span className="tag">잔액 부족</span>}
      </b>
    </div>
  )
}
