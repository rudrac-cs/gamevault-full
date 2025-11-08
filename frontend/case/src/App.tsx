import { useState } from "react"
import "./styles/tokens.css"
import SearchBar from "./components/SearchBar"
import GameGrid from "./components/GameGrid"
import { MOCK_GAMES, type GameSummary } from "./lib/mock"

export default function App() {
  const [query, setQuery] = useState("")
  const [games, setGames] = useState<GameSummary[]>(MOCK_GAMES)

  function handleSearch() {
    const q = query.trim().toLowerCase()
    if (!q) { setGames(MOCK_GAMES); return }
    setGames(MOCK_GAMES.filter(g => g.title.toLowerCase().includes(q)))
  }

  function openDetails(id: string) {
    alert("Details view coming soon for id=" + id)
  }

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Game Catalog</h1>
      </header>

      <div style={{ marginBottom: 16 }}>
        <SearchBar value={query} onChange={setQuery} onSubmit={handleSearch} />
      </div>

      <GameGrid games={games} onOpen={openDetails} />
    </main>
  )
}
