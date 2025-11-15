type Props = {
  value: string
  onChange: (v: string) => void
  onSubmit?: () => void
  placeholder?: string
  className?: string
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Search games…",
  className,
}: Props) {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit?.() }}
      className={["search-bar", className].filter(Boolean).join(" ")}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search games"
        className="search-bar__input"
      />
      <button
        type="submit"
        className="search-bar__button"
      >
        Search
      </button>
    </form>
  )
}
