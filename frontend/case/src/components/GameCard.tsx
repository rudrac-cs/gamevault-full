import type { MouseEvent } from "react"
import type { GameSummary } from "../lib/mock"

type Props = {
  game: GameSummary
  onOpen?: (id: string | number) => void
  onSaveToggle?: (game: GameSummary) => void
  isSaved?: boolean
}

export default function GameCard({ game, onOpen, onSaveToggle, isSaved }: Props) {
  const fallbackImage = `https://picsum.photos/seed/${game.id}/400/560`
  const cover = game.image || fallbackImage
  const genres = game.genres?.length ? game.genres.join(", ") : "Unknown"

  function handleSaveClick(e: MouseEvent) {
    e.stopPropagation()
    onSaveToggle?.(game)
  }

  return (
    <button className="game-card" onClick={() => onOpen?.(game.id)} type="button">
      <img className="game-card__cover" src={cover} alt={game.title} loading="lazy" />
      <div className="game-card__body">
        <div className="game-card__title">{game.title}</div>
        <div className="game-card__meta">
          {game.year ?? "—"} • {genres}
        </div>
        {onSaveToggle && (
          <button
            className={`game-card__save ${isSaved ? "is-active" : ""}`}
            type="button"
            onClick={handleSaveClick}
          >
            {isSaved ? "In Library" : "Save"}
          </button>
        )}
      </div>
    </button>
  )
}
