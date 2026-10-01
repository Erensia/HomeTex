export function Num({ label, value, onChange, step, placeholder = '0' }: {
  label: string
  value: number
  onChange: (n: number) => void
  step?: string
  placeholder?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        inputMode={step ? 'decimal' : 'numeric'}
        step={step}
        value={value === 0 ? '' : value}
        placeholder={placeholder}
        onChange={e => onChange(Number(e.target.value) || 0)}
      />
    </label>
  )
}
