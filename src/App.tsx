import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { FormularioPublico } from './pages/FormularioPublico'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Materiales } from './pages/Materiales'
import { Recetas } from './pages/Recetas'
import { Extras } from './pages/Extras'
import { Pedidos } from './pages/Pedidos'
import { Clientes } from './pages/Clientes'

function App() {
  // basename para que las rutas funcionen en GitHub Pages
  const basename = '/reposteria-app'

  return (
    <AuthProvider>
      <BrowserRouter basename={basename}>
        <Routes>
          {/* Página pública - clientes hacen pedidos sin login */}
          <Route path="/" element={<FormularioPublico />} />

          {/* Login para administradores */}
          <Route path="/login" element={<Login />} />

          {/* Panel de administración protegido */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="materiales" element={<Materiales />} />
            <Route path="recetas" element={<Recetas />} />
            <Route path="extras" element={<Extras />} />
            <Route path="pedidos" element={<Pedidos />} />
            <Route path="clientes" element={<Clientes />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
