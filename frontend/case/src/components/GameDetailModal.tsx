import type { GameDetails } from "../lib/mock"

type Props = {
  open: boolean
  game: GameDetails | null
  loading: boolean
  error: string | null
  onClose: () => void
}

export default function GameDetailModal({ open, game, loading, error, onClose }: Props) {
  if (!open) return null

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose} type="button" aria-label="Close details">
          ×
        </button>
        {loading && <p style={{ color: "var(--muted)" }}>Loading details…</p>}
        {error && <p style={{ color: "#ff7070" }}>{error}</p>}
        {!loading && !error && game && (
          <>
            <div className="detail-header">
              <img src={game.image} alt={game.title} />
              <div>
                <h2>{game.title}</h2>
                <p>
                  {game.year || "—"} • {game.genres?.join(", ") || "Unknown"}
                </p>
                <p>
                  ⭐ {game.rating ? game.rating.toFixed(1) : "N/A"}
                  {game.platforms?.length ? ` • ${game.platforms.join(", ")}` : ""}
                </p>
              </div>
            </div>
            <p className="detail-description">{game.description || "No description available."}</p>
            {game.screenshots?.length ? (
              <div className="detail-screens">
                {game.screenshots.slice(0, 3).map((src) => (
                  <img key={src} src={src} alt={`${game.title} screenshot`} loading="lazy" />
                ))}
              </div>
            ) : null}
            {game.purchaseLinks?.length ? (
              <div className="detail-purchases">
                <p style={{ marginBottom: 8, color: "var(--muted)" }}>Purchase</p>
                <div className="detail-purchase-buttons">
                  {game.purchaseLinks.map((link) => (
                    <a key={link.store} href={link.url} target="_blank" rel="noreferrer">
                      {link.store}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
