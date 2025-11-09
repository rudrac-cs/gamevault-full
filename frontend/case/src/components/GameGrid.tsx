import GameCard from "./GameCard"
import type { GameSummary } from "../lib/mock"

type Props = {
  games: GameSummary[]
  onOpen?: (id: string | number) => void
  onSaveToggle?: (game: GameSummary) => void
  savedIds?: Set<string>
}

export default function GameGrid({ games, onOpen, onSaveToggle, savedIds }: Props) {
  if (!games.length) {
    return <p className="empty-state">No games found.</p>
  }

  return (
    <div className="game-grid">
      {games.map((g) => (
        <GameCard
          key={g.id}
          game={g}
          onOpen={onOpen}
          onSaveToggle={onSaveToggle}
          isSaved={savedIds?.has(String(g.id))}
        />
      ))}
    </div>
  )
}
