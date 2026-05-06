import { useEffect, useState } from 'react'
import { Package, ChefHat, ClipboardList, DollarSign, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCOP } from '../lib/utils'

interface Stats {
  totalMateriales: number
  totalRecetas: number
  totalExtras: number
  pedidosPendientes: number
  ingresosMes: number
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalMateriales: 0,
    totalRecetas: 0,
    totalExtras: 0,
    pedidosPendientes: 0,
    ingresosMes: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarStats()
  }, [])

  const cargarStats = async () => {
    try {
      const [mat, rec, ext, ped] = await Promise.all([
        supabase.from('materiales').select('id', { count: 'exact', head: true }),
        supabase.from('recetas').select('id', { count: 'exact', head: true }),
        supabase.from('extras').select('id', { count: 'exact', head: true }),
        supabase
          .from('pedidos')
          .select('id', { count: 'exact', head: true })
          .in('estado', ['pendiente', 'en_proceso']),
      ])

      const inicioMes = new Date()
      inicioMes.setDate(1)
      inicioMes.setHours(0, 0, 0, 0)

      const { data: pedidosMes } = await supabase
        .from('pedidos')
        .select('precio_total')
        .gte('created_at', inicioMes.toISOString())
        .eq('pagado', true)

      const ingresos =
        pedidosMes?.reduce((sum, p) => sum + Number(p.precio_total), 0) ?? 0

      setStats({
        totalMateriales: mat.count ?? 0,
        totalRecetas: rec.count ?? 0,
        totalExtras: ext.count ?? 0,
        pedidosPendientes: ped.count ?? 0,
        ingresosMes: ingresos,
      })
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const tarjetas = [
    {
      titulo: 'Materiales',
      valor: stats.totalMateriales,
      icono: Package,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      titulo: 'Recetas',
      valor: stats.totalRecetas,
      icono: ChefHat,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      titulo: 'Extras',
      valor: stats.totalExtras,
      icono: Sparkles,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      titulo: 'Pedidos pendientes',
      valor: stats.pedidosPendientes,
      icono: ClipboardList,
      color: 'bg-wine-50 text-wine-700',
    },
    {
      titulo: 'Ingresos del mes',
      valor: formatCOP(stats.ingresosMes),
      icono: DollarSign,
      color: 'bg-green-50 text-green-600',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl text-cream-900">Panel</h1>
        <p className="text-cream-600 mt-1 text-sm">Resumen de Dulzuras JM</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {tarjetas.map(({ titulo, valor, icono: Icono, color }) => (
          <div key={titulo} className="card p-4">
            <div className={`inline-flex p-2 rounded-lg ${color} mb-2`}>
              <Icono size={18} />
            </div>
            <p className="text-xs text-cream-600">{titulo}</p>
            <p className="text-xl font-display text-cream-900 mt-0.5">
              {loading ? '...' : valor}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 card p-6">
        <h2 className="font-display text-xl text-wine-800 mb-2">Cómo funciona</h2>
        <ol className="text-sm text-cream-700 space-y-2 leading-relaxed">
          <li>
            <strong>1. Materiales:</strong> registra todos tus insumos con precio actual
            (harinas, azúcares, huevos...)
          </li>
          <li>
            <strong>2. Recetas:</strong> crea tus tortas usando los materiales. El sistema
            calcula automáticamente el precio sugerido.
          </li>
          <li>
            <strong>3. Extras:</strong> añade adiciones opcionales (fresas, decoración) con
            precio fijo.
          </li>
          <li>
            <strong>4. Formulario público:</strong> tus clientes hacen pedidos en el sitio
            público (sin login).
          </li>
          <li>
            <strong>5. Pedidos:</strong> aquí ves todos los pedidos que llegan y cambias su
            estado.
          </li>
        </ol>
      </div>
    </div>
  )
}
