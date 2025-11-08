type Props = {
  value: string
  onChange: (v: string) => void
  onSubmit?: () => void
}

export default function SearchBar({ value, onChange, onSubmit }: Props) {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit?.() }}
      style={{ display: "flex", gap: 8, width: "100%" }}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search games…"
        aria-label="Search games"
        style={{
          flex: 1,
          background: "var(--card)",
          color: "var(--fg)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "10px 12px",
          outline: "none"
        }}
      />
      <button
        type="submit"
        style={{
          background: "var(--brand)",
          color: "#000",
          border: "none",
          borderRadius: 10,
          padding: "10px 14px",
          fontWeight: 600,
          cursor: "pointer"
        }}
      >
        Search
      </button>
    </form>
  )
}
