import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
const PAGE_SIZE = 24
type NavTab = (typeof NAV_TABS)[number]

function normalizeFeaturedGame(
  game: Awaited<ReturnType<typeof getFeaturedGames>>[number]
): (GameSummary & { igdbId: number }) {
  const year = game.releaseDate ? new Date(game.releaseDate * 1000).getFullYear() : undefined
  return {
    // use a safe UI id so it won't be mistaken for your internal /games id
    id: `feat-${game.id}`,
    igdbId: game.id,               // keep the IGDB id separately
    title: game.name || "Untitled",
    year,
    genres: game.genres || [],
    image: game.cover || "",
    rating: game.rating ?? game.aggRating,
    description: game.summary,
    platforms: game.platforms,
  }
}

function sortGamesByTitle(list: GameSummary[]): GameSummary[] {
  return [...list].sort((a, b) => {
    const left = (a.title || "").toLowerCase()
    const right = (b.title || "").toLowerCase()
    if (left < right) return -1
    if (left > right) return 1
    return 0
  })
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
  const [allGamesPage, setAllGamesPage] = useState(1)
  const [allGamesHasMore, setAllGamesHasMore] = useState(true)
  const [featuredGames, setFeaturedGames] = useState<GameSummary[]>([])
  const [recommendedGames, setRecommendedGames] = useState<GameSummary[]>([])
  const [library, setLibrary] = useState<GameSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [isPaginating, setIsPaginating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedGenre, setSelectedGenre] = useState("All")
  const [activeNav, setActiveNav] = useState<NavTab>("All Games")
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailGame, setDetailGame] = useState<GameDetails | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [heroIndex, setHeroIndex] = useState(0)
  const heroSeedRef = useRef(Math.random())

  const libraryIds = useMemo(() => new Set(library.map((game) => String(game.id))), [library])

  // Clean runSearch: loads data only; no activeNav in body or deps
  const runSearch = useCallback(
    async (q: string) => {
      const normalizedQuery = q.trim()
      setLoading(true)
      setError(null)
      try {
        const data = await getGames({ query: normalizedQuery, page: 1, page_size: PAGE_SIZE })
        const sorted = sortGamesByTitle(data)
        setAllGames(sorted)
        setAllGamesPage(1)
        setAllGamesHasMore(data.length === PAGE_SIZE)
        setRecommendedGames(buildRecommendations(sorted))
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load games")
        setCollection([])
      } finally {
        setLoading(false)
      }
    },
    [] // ✅ empty; function doesn't use activeNav
  )

  const loadMoreAllGames = useCallback(async () => {
    if (loading || isPaginating || !allGamesHasMore || activeNav !== "All Games") {
      return
    }
    setIsPaginating(true)
    const nextPage = allGamesPage + 1
    try {
      const data = await getGames({ query: query.trim(), page: nextPage, page_size: PAGE_SIZE })
      setAllGames((prev) => sortGamesByTitle([...prev, ...data]))
      setAllGamesPage(nextPage)
      setAllGamesHasMore(data.length === PAGE_SIZE)
      setCollection((prev) => {
        if (activeNav !== "All Games") return prev
        return sortGamesByTitle([...prev, ...data])
      })
    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : "Failed to load games"
      setError(message)
    } finally {
      setIsPaginating(false)
    }
  }, [activeNav, allGamesHasMore, allGamesPage, isPaginating, loading, query])

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
    runSearch(query)
  }

  useEffect(() => {
    runSearch("")
  }, [runSearch])

  useEffect(() => {
    if (featuredGames.length) {
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const data = await getFeaturedGames()
        const normalized = data.map(normalizeFeaturedGame)
        if (!cancelled) {
          setFeaturedGames(normalized)
        }
      } catch {
        // ignore background featured failures; explicit fetch handles errors
      }
    })()
    return () => {
      cancelled = true
    }
  }, [featuredGames.length])

  useEffect(() => {
    if (activeNav === "My Library") {
      setCollection(library)
    }
  }, [library, activeNav])

  // Sync All Games → grid
  useEffect(() => {
    if (activeNav === "All Games") {
      setCollection(allGames)
    }
  }, [allGames, activeNav])

  // Sync Recommended → grid
  useEffect(() => {
    if (activeNav === "Recommended") {
      setCollection(recommendedGames)
    }
  }, [recommendedGames, activeNav])

  useEffect(() => {
    if (activeNav !== "All Games" || !allGamesHasMore) {
      return
    }
    const sentinel = loadMoreRef.current
    if (!sentinel) {
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadMoreAllGames()
          }
        })
      },
      { rootMargin: "200px 0px" }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [activeNav, allGamesHasMore, loadMoreAllGames, loading])

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
          runSearch(query)
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
          runSearch(query)
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

      const summary = collection.find((g) => String(g.id) === String(id))

      try {
        let data: GameDetails | null = null

        // ✅ Wrap the OR so 'in' only runs when summary exists
        if (
          summary &&
          (
            (typeof summary.id === "string" && summary.id.startsWith("feat-")) ||
            ("igdbId" in (summary as any))
          )
        ) {
          const match = allGames.find((g) => g.title === summary.title)
          if (match) {
            data = await getGame(Number(match.id))
          } else {
            data = summary as unknown as GameDetails
          }
        } else {
          data = await getGame(Number(id))
        }

        setDetailGame(() => {
          const merged: any = summary ? { ...summary, ...data } : { ...data }
          if ((!merged.image || merged.image.length === 0) && summary?.image) merged.image = summary.image
          if (!merged.purchaseLinks && merged.purchase_links) merged.purchaseLinks = merged.purchase_links
          return merged
        })
      } catch (error_) {
        const message = error_ instanceof Error ? error_.message : "Failed to fetch details"
        setDetailError(message)
        setDetailGame((summary as GameDetails) ?? null)
      } finally {
        setDetailLoading(false)
      }
    },
    [collection, allGames]
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

  const heroPool: GameSummary[] =
    featuredGames.length
      ? featuredGames
      : filteredGames.length
        ? filteredGames
        : collection.length
          ? collection
          : [FALLBACK_FEATURED]

  useEffect(() => {
    if (heroPool.length) {
      const randomIdx = Math.floor(heroSeedRef.current * heroPool.length)
      setHeroIndex(randomIdx)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featuredGames.length, filteredGames.length, collection.length])

  const heroGame = heroPool[Math.max(0, heroIndex % heroPool.length)]
  const rawRating =
    (heroGame as any).rating ?? (heroGame as any).aggRating ?? null

  const heroRating =
    rawRating == null ? null : (rawRating > 10 ? rawRating / 10 : rawRating)

  const heroRatingText = heroRating == null ? "—" : heroRating.toFixed(1)
  const heroDescription =
    heroGame.description ||
    "Explore rich worlds, conquer legendary foes, and uncover stories worth remembering."
  const heroCover = heroGame.image || `https://picsum.photos/seed/${heroGame.id}/1200/600`

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
            <section
              className="hero-card hero--compact"
              onClick={() => setHeroIndex((i) => (i + 1) % Math.max(1, heroPool.length))}
            >
              <div className="hero-banner">
                <div className="hero-banner__text">
                  <div className="hero-chip">Featured Game</div>
                  <h1 className="hero-title">{heroGame.title}</h1>
                  <p className="hero-meta">
                    {heroGame.year || "—"} • ⭐ {heroRatingText} • {(heroGame.genres || []).slice(0, 3).join(", ")}
                  </p>
                  <p className="hero-description">{heroDescription}</p>
                </div>
                <div className="hero-banner__cover">
                  <img src={heroCover} alt={heroGame.title} loading="lazy" />
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
                <>
                  <GameGrid
                    games={filteredGames}
                    onOpen={openDetails}
                    onSaveToggle={handleToggleLibrary}
                    savedIds={libraryIds}
                  />
                  {activeNav === "All Games" && (
                    <>
                      {isPaginating && <p className="load-indicator">Loading more games…</p>}
                      {!allGamesHasMore && filteredGames.length > 0 && (
                        <p className="load-indicator">You&apos;ve reached the end.</p>
                      )}
                      <div ref={loadMoreRef} className="scroll-sentinel" aria-hidden />
                    </>
                  )}
                </>
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
