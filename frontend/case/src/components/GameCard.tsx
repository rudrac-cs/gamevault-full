import type { GameSummary } from "../lib/mock"

type Props = {
  game: GameSummary
  onOpen?: (id: string) => void
}

export default function GameCard({ game, onOpen }: Props) {
  return (
    <button
      onClick={() => onOpen?.(game.id)}
      style={{
        textAlign: "left",
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        padding: 0
      }}
    >
      <img
        src={game.image}
        alt={game.title}
        style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", display: "block" }}
      />
      <div style={{ padding: "0.75rem 0.9rem" }}>
        <div style={{ fontWeight: 600, lineHeight: 1.2 }}>{game.title}</div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          {(game.year ?? "—") + " • " + game.genres.join(", ")}
        </div>
      </div>
    </button>
  )
}
