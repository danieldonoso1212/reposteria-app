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

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex bg-cream-50">
      <aside className="w-64 bg-white border-r border-cream-100 flex flex-col">
        <div className="p-5 border-b border-cream-100">
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

        <nav className="flex-1 p-3 space-y-1">
          {enlaces.map(({ ruta, etiqueta, icono: Icono, exact }) => (
            <NavLink
              key={ruta}
              to={ruta}
              end={exact}
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

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
