import axios from "axios"
import type { GameDetails, GameSummary } from "./mock"

function resolveBaseURL() {
  const raw = (import.meta.env.VITE_API_BASE_URL || "").trim()
  if (!raw) {
    return "/api"
  }
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw
  }
  // Ensure relative paths always start with a single slash so they work
  // regardless of where the app is hosted.
  return `/${raw.replace(/^\/+/, "")}`
}

export const api = axios.create({
  baseURL: resolveBaseURL(),
  timeout: 15000,
})

export async function getGames(params: {
  query?: string
  page?: number
  page_size?: number
}): Promise<GameSummary[]> {
  const res = await api.get<GameSummary[]>("/games", { params })
  return res.data
}

export async function getGame(id: number) {
  const res = await api.get<GameDetails>(`/games/${id}`)
  return res.data
}

export type FeaturedApiGame = {
  id: string | number
  name: string
  summary?: string
  releaseDate?: number
  rating?: number
  aggRating?: number
  genres?: string[]
  platforms?: string[]
  cover?: string
}

export async function getFeaturedGames(): Promise<FeaturedApiGame[]> {
  const res = await api.get<FeaturedApiGame[]>("/games/featured")
  return res.data
}
