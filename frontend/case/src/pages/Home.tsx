import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import "../styles/tokens.css"
import "../styles/home.css"
import { getFeaturedGames } from "../lib/api"
import { MOCK_GAMES } from "../lib/mock"
import logo from "../assets/logo.svg"

type Spotlight = {
  id: string | number
  title: string
  genres: string[]
  cover: string
}

const FALLBACK_SPOTLIGHTS: Spotlight[] = MOCK_GAMES.slice(0, 3).map((game) => ({
  id: game.id,
  title: game.title,
  genres: game.genres,
  cover: game.image,
}))

export default function HomePage() {
  const [spotlights, setSpotlights] = useState<Spotlight[]>(FALLBACK_SPOTLIGHTS)

  useEffect(() => {
    async function loadFeatured() {
      try {
        const data = await getFeaturedGames()
        const picks: Spotlight[] = data.slice(0, 3).map((game) => ({
          id: game.id,
          title: game.name,
          genres: game.genres || [],
          cover: game.cover || "https://picsum.photos/seed/spotlight/400/560",
        }))
        if (picks.length) {
          setSpotlights(picks)
        }
      } catch {
        // fall back silently
      }
    }
    loadFeatured()
  }, [])

  return (
    <div className="home-shell">
      <nav className="home-nav">
        <Link className="home-brand" to="/">
          <img src={logo} alt="GameVault logo" className="home-brand__img" />
          GameVault
        </Link>
        <div className="home-nav__actions">
          <Link className="home-cta" to="/catalog">
            Launch App
          </Link>
          <a className="home-cta primary" href="https://www.igdb.com/" target="_blank" rel="noreferrer">
            Learn More
          </a>
        </div>
      </nav>
      <section className="home-logo-banner">
        <img src={logo} alt="GameVault emblem" />
      </section>

      <section className="home-hero">
        <div className="home-hero__text">
          <h1>Discover the next world you&apos;ll get lost in.</h1>
          <p>
            GameVault brings trending releases, timeless favorites, and your personal watchlist together in a minimal,
            elegant dashboard. Search once, filter fast, and drop games into your library to track later.
          </p>
          <div className="home-hero__stats">
            <div className="home-stat">
              <strong>50K+</strong>
              titles indexed
            </div>
            <div className="home-stat">
              <strong>120</strong>
              platforms covered
            </div>
            <div className="home-stat">
              <strong>24/7</strong>
              live updates
            </div>
          </div>
        </div>
        <div className="home-showcase">
          <div>
            <p style={{ letterSpacing: "0.1em", color: "var(--muted)", fontSize: 12, marginBottom: 8 }}>
              SPOTLIGHT
            </p>
            <h2 style={{ margin: 0 }}>Trending right now</h2>
          </div>
          <div className="showcase-grid">
            {spotlights.map((game) => (
              <article key={game.id} className="showcase-card">
                <img src={game.cover} alt={game.title} loading="lazy" />
                <div className="showcase-card__content">
                  <div className="showcase-card__title">{game.title}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{game.genres.join(" • ")}</div>
                </div>
              </article>
            ))}
          </div>
          <Link className="home-cta primary" to="/catalog">
            Explore Catalog
          </Link>
        </div>
      </section>

      <section className="home-sections">
        <div className="home-panel">
          <h3>Live Trends</h3>
          <p>
            Our IGDB integration keeps the Featured feed fresh with the most played and most anticipated games across PC
            and consoles.
          </p>
        </div>
        <div className="home-panel">
          <h3>Smart Filters</h3>
          <p>
            Slice by genre, year, platform, and popularity in seconds. Your filters stay sticky while you browse the
            catalog.
          </p>
        </div>
        <div className="home-panel">
          <h3>Personal Library</h3>
          <p>
            Save games you discover and return any time in the My Library tab. Perfect for watchlists, backlog planning,
            or wishlist prep.
          </p>
        </div>
      </section>
    </div>
  )
}
