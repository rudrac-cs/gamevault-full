import GameCard from "./GameCard"
import type { GameSummary } from "../lib/mock"

type Props = {
  games: GameSummary[]
  onOpen?: (id: string) => void
}

export default function GameGrid({ games, onOpen }: Props) {
  if (!games.length) {
    return <p style={{ color: "var(--muted)" }}>No games found.</p>
  }
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: "16px"
      }}
    >
      {games.map(g => (
        <GameCard key={g.id} game={g} onOpen={onOpen} />
      ))}
    </div>
  )
}
