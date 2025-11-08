export type GameSummary = {
  id: string
  title: string
  year?: number
  genres: string[]
  image: string
}

export const MOCK_GAMES: GameSummary[] = [
  { id: "1", title: "Elder Ring",   year: 2022, genres: ["Action", "RPG"],      image: "https://picsum.photos/seed/elder/400/560" },
  { id: "2", title: "Star Odyssey", year: 2023, genres: ["Adventure", "Sci-Fi"], image: "https://picsum.photos/seed/star/400/560" },
  { id: "3", title: "Mystic Valley", year: 2020, genres: ["Puzzle", "Indie"],    image: "https://picsum.photos/seed/mystic/400/560" }
]
