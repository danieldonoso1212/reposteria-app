import { useEffect, useState } from 'react'
import { Trash2, MessageCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCOP, formatFecha, urlWhatsApp } from '../lib/utils'
import { Pedido, EstadoPedido } from '../types/database'

const ESTADOS: { valor: EstadoPedido; etiqueta: string; color: string }[] = [
  { valor: 'pendiente', etiqueta: 'Pendiente', color: 'bg-amber-100 text-amber-800' },
  { valor: 'en_proceso', etiqueta: 'En proceso', color: 'bg-blue-100 text-blue-800' },
  { valor: 'listo', etiqueta: 'Listo', color: 'bg-green-100 text-green-800' },
  { valor: 'entregado', etiqueta: 'Entregado', color: 'bg-cream-200 text-cream-800' },
  { valor: 'cancelado', etiqueta: 'Cancelado', color: 'bg-red-100 text-red-800' },
]

export function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargar()
  }, [])

  const cargar = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('pedidos')
      .select('*, cliente:clientes(*), receta:recetas(*)')
      .order('fecha_entrega', { ascending: true })
    setPedidos((data as unknown as Pedido[]) ?? [])
    setLoading(false)
  }

  const cambiarEstado = async (id: string, estado: EstadoPedido) => {
    await supabase.from('pedidos').update({ estado }).eq('id', id)
    cargar()
  }

  const togglePagado = async (id: string, pagado: boolean) => {
    await supabase.from('pedidos').update({ pagado: !pagado }).eq('id', id)
    cargar()
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar este pedido?')) return
    await supabase.from('pedidos').delete().eq('id', id)
    cargar()
  }

  if (loading) {
    return <div className="text-cream-600">Cargando...</div>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl text-cream-900">Pedidos</h1>
        <p className="text-cream-600 mt-1 text-sm">Pedidos del formulario público</p>
      </div>

      {pedidos.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-cream-700 font-display text-xl mb-1">Sin pedidos aún</p>
          <p className="text-cream-500 text-sm">Cuando lleguen pedidos aparecerán aquí</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.map((p) => {
            const estadoInfo = ESTADOS.find((e) => e.valor === p.estado)
            const nombre = p.nombre_cliente_publico ?? p.cliente?.nombre ?? 'Sin nombre'
            const whatsapp = p.whatsapp_publico ?? p.cliente?.telefono

            return (
              <div key={p.id} className="card p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-lg text-cream-900">
                      {p.receta?.nombre ?? 'Sin receta'}
                    </h3>
                    <p className="text-sm text-cream-700">
                      <strong>{nombre}</strong>
                      {p.dependencia && <span className="text-cream-500"> · {p.dependencia}</span>}
                    </p>
                    {whatsapp && (
                      <a
                        href={urlWhatsApp(whatsapp)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-green-700"
                      >
                        <MessageCircle size={12} />
                        {whatsapp}
                      </a>
                    )}
                    <p className="text-sm text-cream-600 mt-1">
                      Entrega: <strong>{formatFecha(p.fecha_entrega)}</strong>
                    </p>
                    {p.notas && (
                      <p className="text-sm text-cream-500 italic mt-1">"{p.notas}"</p>
                    )}
                  </div>
                  <div className="flex sm:flex-col gap-2 sm:items-end">
                    <p className="font-display text-xl text-wine-700">
                      {formatCOP(Number(p.precio_total))}
                    </p>
                    <button
                      onClick={() => togglePagado(p.id, p.pagado)}
                      className={`text-xs px-2 py-1 rounded-full ${
                        p.pagado ? 'bg-green-100 text-green-800' : 'bg-cream-100 text-cream-700'
                      }`}
                    >
                      {p.pagado ? '✓ Pagado' : 'Sin pagar'}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-3 border-t border-cream-100">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${estadoInfo?.color}`}>
                    {estadoInfo?.etiqueta}
                  </span>
                  <select
                    value={p.estado}
                    onChange={(e) => cambiarEstado(p.id, e.target.value as EstadoPedido)}
                    className="text-xs px-2 py-1 border border-cream-200 rounded-lg bg-white"
                  >
                    {ESTADOS.map((e) => (
                      <option key={e.valor} value={e.valor}>
                        Cambiar a: {e.etiqueta}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => eliminar(p.id)}
                    className="ml-auto p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
