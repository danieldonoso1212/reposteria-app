import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ChefHat,
  Sparkles,
  ClipboardList,
  Users,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const enlaces = [
  { ruta: '/admin', etiqueta: 'Panel', icono: LayoutDashboard, exact: true },
  { ruta: '/admin/materiales', etiqueta: 'Materiales', icono: Package },
  { ruta: '/admin/recetas', etiqueta: 'Recetas y costos', icono: ChefHat },
  { ruta: '/admin/extras', etiqueta: 'Extras', icono: Sparkles },
  { ruta: '/admin/pedidos', etiqueta: 'Pedidos', icono: ClipboardList },
  { ruta: '/admin/clientes', etiqueta: 'Clientes', icono: Users },
]

export function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuAbierto, setMenuAbierto] = useState(false)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const cerrarMenu = () => setMenuAbierto(false)

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Header móvil */}
      <header className="md:hidden sticky top-0 z-30 bg-white border-b border-cream-100 px-4 py-3 flex items-center justify-between">
        <Link to="/admin" className="flex items-center gap-2" onClick={cerrarMenu}>
          <img
            src="./logo.jpeg"
            alt="Dulzuras JM"
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="font-display text-lg text-wine-800">Dulzuras JM</span>
        </Link>
        <button
          onClick={() => setMenuAbierto(!menuAbierto)}
          className="p-2 -mr-2 text-cream-700 hover:bg-cream-100 rounded-lg"
          aria-label="Menú"
        >
          {menuAbierto ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Overlay oscuro cuando el menú móvil está abierto */}
      {menuAbierto && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={cerrarMenu}
        />
      )}

      <div className="md:flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed md:sticky top-0 left-0 z-50 md:z-0
            w-64 h-screen
            bg-white border-r border-cream-100 flex flex-col
            transform transition-transform duration-200
            ${menuAbierto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          <div className="hidden md:block p-5 border-b border-cream-100">
            <Link to="/admin" className="flex items-center gap-3">
              <img
                src="./logo.jpeg"
                alt="Dulzuras JM"
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h1 className="font-display text-lg text-wine-800 leading-tight">
                  Dulzuras JM
                </h1>
                <p className="text-xs text-cream-500">Administración</p>
              </div>
            </Link>
          </div>

          <div className="md:hidden flex items-center justify-between p-4 border-b border-cream-100">
            <span className="font-display text-lg text-wine-800">Menú</span>
            <button
              onClick={cerrarMenu}
              className="p-2 -mr-2 text-cream-700 hover:bg-cream-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {enlaces.map(({ ruta, etiqueta, icono: Icono, exact }) => (
              <NavLink
                key={ruta}
                to={ruta}
                end={exact}
                onClick={cerrarMenu}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-wine-50 text-wine-800'
                      : 'text-cream-700 hover:bg-cream-100'
                  }`
                }
              >
                <Icono size={18} />
                {etiqueta}
              </NavLink>
            ))}

            <div className="pt-3 mt-3 border-t border-cream-100">
              <Link
                to="/"
                target="_blank"
                onClick={cerrarMenu}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-cream-600 hover:bg-cream-100"
              >
                <ExternalLink size={18} />
                Ver formulario público
              </Link>
            </div>
          </nav>

          <div className="p-3 border-t border-cream-100">
            <div className="px-3 py-2 mb-2">
              <p className="text-xs text-cream-500">Sesión iniciada</p>
              <p className="text-sm text-cream-800 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-cream-700 hover:bg-cream-100 transition-colors"
            >
              <LogOut size={18} />
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Contenido principal */}
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="max-w-6xl mx-auto p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
