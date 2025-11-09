import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import "../styles/tokens.css"
import "../styles/app.css"
import SearchBar from "../components/SearchBar"
import GameGrid from "../components/GameGrid"
import GameDetailModal from "../components/GameDetailModal"
import type { GameDetails, GameSummary } from "../lib/mock"
import { MOCK_GAMES } from "../lib/mock"
import { getFeaturedGames, getGames, getGame } from "../lib/api"
import logo from "../assets/logo.svg"

const FALLBACK_FEATURED: GameSummary = {
  ...MOCK_GAMES[0],
  id: MOCK_GAMES[0].id ?? "featured",
}

const NAV_TABS = ["Featured", "All Games", "My Library", "Recommended"] as const
type NavTab = (typeof NAV_TABS)[number]

function normalizeFeaturedGame(game: Awaited<ReturnType<typeof getFeaturedGames>>[number]): GameSummary {
  const year = game.releaseDate ? new Date(game.releaseDate * 1000).getFullYear() : undefined
  return {
    id: game.id,
    title: game.name || "Untitled",
    year,
    genres: game.genres || [],
    image: game.cover || "",
    rating: game.rating ?? game.aggRating,
    description: game.summary,
    platforms: game.platforms,
  }
}

function buildRecommendations(source: GameSummary[], count = 12): GameSummary[] {
  const copy = [...source]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, count)
}

export default function CatalogPage() {
  const [query, setQuery] = useState("")
  const [collection, setCollection] = useState<GameSummary[]>([])
  const [allGames, setAllGames] = useState<GameSummary[]>([])
  const [featuredGames, setFeaturedGames] = useState<GameSummary[]>([])
  const [recommendedGames, setRecommendedGames] = useState<GameSummary[]>([])
  const [library, setLibrary] = useState<GameSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedGenre, setSelectedGenre] = useState("All")
  const [activeNav, setActiveNav] = useState<NavTab>("All Games")
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailGame, setDetailGame] = useState<GameDetails | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const libraryIds = useMemo(() => new Set(library.map((game) => String(game.id))), [library])

  const runSearch = useCallback(
    async (q: string) => {
      setLoading(true)
      setError(null)
      try {
        const data = await getGames({ query: q, page: 1, page_size: 24 })
        setAllGames(data)
        const nextRecommended = buildRecommendations(data)
        setRecommendedGames(nextRecommended)

        if (activeNav === "All Games") {
          setCollection(data)
        } else if (activeNav === "Recommended") {
          setCollection(nextRecommended)
        }
      } catch (error_) {
        const message = error_ instanceof Error ? error_.message : "Failed to load games"
        setError(message)
        setCollection([])
      } finally {
        setLoading(false)
      }
    },
    [activeNav]
  )

  const fetchFeatured = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getFeaturedGames()
      const normalized = data.map(normalizeFeaturedGame)
      setFeaturedGames(normalized)
      setCollection(normalized)
    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : "Failed to load featured games"
      setError(message)
      setCollection([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleSearch() {
    setActiveNav("All Games")
    setSelectedGenre("All")
    runSearch(query.trim())
  }

  useEffect(() => {
    runSearch("")
  }, [runSearch])

  useEffect(() => {
    if (activeNav === "My Library") {
      setCollection(library)
    }
  }, [library, activeNav])

  const handleNavSelect = useCallback(
    (tab: NavTab) => {
      setActiveNav(tab)
      setSelectedGenre("All")
      if (tab === "Featured") {
        if (featuredGames.length) {
          setCollection(featuredGames)
        } else {
          fetchFeatured()
        }
      } else if (tab === "All Games") {
        if (allGames.length) {
          setCollection(allGames)
        } else {
          runSearch(query.trim())
        }
      } else if (tab === "My Library") {
        setCollection(library)
      } else if (tab === "Recommended") {
        if (recommendedGames.length) {
          setCollection(recommendedGames)
        } else if (allGames.length) {
          const picks = buildRecommendations(allGames)
          setRecommendedGames(picks)
          setCollection(picks)
        } else {
          runSearch(query.trim())
        }
      }
    },
    [allGames, featuredGames, fetchFeatured, library, query, recommendedGames, runSearch]
  )

  const openDetails = useCallback(
    async (id: string | number) => {
      setDetailOpen(true)
      setDetailLoading(true)
      setDetailError(null)
      const summary = collection.find((game) => String(game.id) === String(id))
      try {
        const data = await getGame(Number(id))
        setDetailGame(summary ? { ...summary, ...data } : data)
      } catch (error_) {
        const message = error_ instanceof Error ? error_.message : "Failed to fetch details"
        setDetailError(message)
        setDetailGame(summary ? (summary as GameDetails) : null)
      } finally {
        setDetailLoading(false)
      }
    },
    [collection]
  )

  const closeDetails = useCallback(() => {
    setDetailOpen(false)
    setDetailGame(null)
    setDetailError(null)
  }, [])

  const genres = useMemo(() => {
    const set = new Set<string>()
    collection.forEach((game) => {
      game.genres?.forEach((genre) => {
        if (genre) set.add(genre)
      })
    })
    const ordered = Array.from(set).sort()
    return ["All", ...ordered]
  }, [collection])

  const filteredGames = useMemo(() => {
    if (selectedGenre === "All") return collection
    return collection.filter((g) => g.genres?.includes(selectedGenre))
  }, [collection, selectedGenre])

  const heroGame = filteredGames[0] ?? collection[0] ?? FALLBACK_FEATURED
  const heroRating = heroGame.rating ?? 4.8
  const heroDescription =
    heroGame.description ||
    "Explore rich worlds, conquer legendary foes, and uncover stories worth remembering."

  const handleToggleLibrary = useCallback((game: GameSummary) => {
    setLibrary((prev) => {
      const exists = prev.some((item) => item.id === game.id)
      if (exists) {
        return prev.filter((item) => item.id !== game.id)
      }
      return [...prev, game]
    })
  }, [])

  return (
    <div className="app-shell">
      <div className="app-container">
        <header className="app-header">
          <div className="brand-row">
            <Link className="brand-logo" to="/">
              <img src={logo} alt="GameVault logo" className="brand-logo__img" />
              GameVault
            </Link>
            <div className="nav-pills">
              {NAV_TABS.map((tab) => (
                <button
                  key={tab}
                  className={`nav-pill ${activeNav === tab ? "is-active" : ""}`}
                  onClick={() => handleNavSelect(tab)}
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <SearchBar
                value={query}
                onChange={setQuery}
                onSubmit={handleSearch}
                className="search-bar"
              />
            </div>
          </div>
        </header>

        {loading && <p style={{ color: "var(--muted)" }}>Loading…</p>}
        {error && <p style={{ color: "#ff7070" }}>{error}</p>}

        {!error && (
          <>
            <section className="hero-card">
              <div className="hero-visual" />
              <div className="hero-content">
                <div className="hero-chip">Featured Game</div>
                <h1 className="hero-title">{heroGame.title}</h1>
                <p className="hero-meta">
                  {heroGame.year || "—"} • ⭐ {heroRating} • {(heroGame.genres || []).slice(0, 2).join(", ")}
                </p>
                <p className="hero-description">{heroDescription}</p>
                <div className="hero-actions">
                  <button className="primary-btn" onClick={() => openDetails(heroGame.id)}>
                    View Details
                  </button>
                  <button className="ghost-btn" onClick={() => handleNavSelect("All Games")}>
                    Browse Catalog
                  </button>
                </div>
              </div>
            </section>

            <section className="filters-section">
              <div className="filters-title">FILTER BY CATEGORY</div>
              <div className="chips">
                {genres.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    className={`chip ${selectedGenre === genre ? "is-active" : ""}`}
                    onClick={() => setSelectedGenre(genre)}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </section>

            <section>
              {loading ? (
                <p style={{ color: "var(--muted)" }}>Loading…</p>
              ) : (
                <GameGrid
                  games={filteredGames}
                  onOpen={openDetails}
                  onSaveToggle={handleToggleLibrary}
                  savedIds={libraryIds}
                />
              )}
            </section>
          </>
        )}
        <GameDetailModal
          open={detailOpen}
          game={detailGame}
          loading={detailLoading}
          error={detailError}
          onClose={closeDetails}
        />
      </div>
    </div>
  )
}
