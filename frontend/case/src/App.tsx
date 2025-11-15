import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import CatalogPage from "./pages/Catalog"
import HomePage from "./pages/Home"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
