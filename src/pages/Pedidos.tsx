import { useEffect, useState } from 'react'
import { Trash2, ClipboardList, MessageCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  formatCOP,
  formatFecha,
  urlWhatsApp,
  descontarStockPedido,
  devolverStockPedido,
  enviarWhatsAppACallMeBot,
} from '../lib/utils'
import { Pedido, ProductoPedido, Extra, EstadoPedido } from '../types/database'

const ESTADOS: { valor: EstadoPedido; etiqueta: string; color: string }[] = [
  { valor: 'pendiente', etiqueta: 'Pendiente', color: 'bg-amber-100 text-amber-800' },
  { valor: 'en_proceso', etiqueta: 'En proceso', color: 'bg-blue-100 text-blue-800' },
  { valor: 'listo', etiqueta: 'Listo', color: 'bg-green-100 text-green-800' },
  { valor: 'entregado', etiqueta: 'Entregado', color: 'bg-cream-200 text-cream-800' },
  { valor: 'cancelado', etiqueta: 'Cancelado', color: 'bg-red-100 text-red-800' },
]

export function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [productosMap, setProductosMap] = useState<Record<string, ProductoPedido[]>>({})
  const [extrasMap, setExtrasMap] = useState<Record<string, Extra>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargar()
  }, [])

  const cargar = async () => {
    setLoading(true)
    const [pedRes, prodRes, extRes] = await Promise.all([
      supabase
        .from('pedidos')
        .select('*, cliente:clientes(*), receta:recetas(*)')
        .order('fecha_entrega', { ascending: true }),
      supabase
        .from('productos_pedido')
        .select('*, receta:recetas(nombre, porciones)'),
      supabase.from('extras').select('*'),
    ])

    setPedidos((pedRes.data as unknown as Pedido[]) ?? [])

    // Agrupar productos por pedido_id
    const prods: Record<string, ProductoPedido[]> = {}
    for (const p of ((prodRes.data ?? []) as unknown as ProductoPedido[])) {
      if (!prods[p.pedido_id]) prods[p.pedido_id] = []
      prods[p.pedido_id].push(p)
    }
    setProductosMap(prods)

    const emap: Record<string, Extra> = {}
    for (const e of (extRes.data ?? []) as Extra[]) {
      emap[e.id] = e
    }
    setExtrasMap(emap)
    setLoading(false)
  }

  const cambiarEstado = async (pedido: Pedido, nuevoEstado: EstadoPedido) => {
    if (pedido.estado === nuevoEstado) return

    // Si cambia a "en_proceso" y no se ha descontado stock
    if (nuevoEstado === 'en_proceso' && !pedido.stock_descontado) {
      const alertas = await descontarStockPedido(pedido.id)

      if (alertas.length > 0) {
        const alertaTexto = alertas
          .map((a) => `- ${a.nombre}: quedan ${a.quedaActual.toFixed(0)} ${a.unidad} (mín: ${a.stockMinimo.toFixed(0)})`)
          .join('\n')

        alert(`⚠️ ALERTA DE STOCK BAJO:\n\n${alertaTexto}\n\nRevisa tus materiales.`)

        // Enviar alerta por WhatsApp
        const mensajeAlerta =
          `⚠️ *ALERTA STOCK BAJO - Dulzuras JM*\n\n` +
          alertas
            .map((a) => `• ${a.nombre}: quedan ${a.quedaActual.toFixed(0)} ${a.unidad} (mín: ${a.stockMinimo.toFixed(0)})`)
            .join('\n') +
          `\n\nRevisa y reabastece pronto.`

        enviarWhatsAppACallMeBot(mensajeAlerta)
      }
    }

    // Si cambia a "cancelado" y ya se descontó stock, preguntar
    if (nuevoEstado === 'cancelado' && pedido.stock_descontado) {
      const devolver = confirm(
        '¿Quieres devolver el stock de materiales de este pedido cancelado?'
      )
      if (devolver) {
        await devolverStockPedido(pedido.id)
      }
    }

    await supabase.from('pedidos').update({ estado: nuevoEstado }).eq('id', pedido.id)
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl text-cream-900">Pedidos</h1>
        <p className="text-cream-600 mt-1 text-sm">Pedidos del formulario público</p>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-cream-600">Cargando...</div>
      ) : pedidos.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList className="mx-auto text-cream-300 mb-3" size={48} />
          <p className="text-cream-700 font-display text-xl mb-1">Sin pedidos aún</p>
          <p className="text-cream-500 text-sm">Cuando lleguen pedidos aparecerán aquí</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.map((p) => {
            const estadoInfo = ESTADOS.find((e) => e.valor === p.estado)
            const nombre = p.nombre_cliente_publico ?? p.cliente?.nombre ?? 'Sin nombre'
            const whatsapp = p.whatsapp_publico ?? p.cliente?.telefono
            const productos = productosMap[p.id] ?? []

            return (
              <div key={p.id} className="card p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-cream-900">
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

                {/* Lista de productos del pedido */}
                {productos.length > 0 ? (
                  <div className="bg-cream-50 rounded-lg p-3 mb-3 space-y-2">
                    {productos.map((prod, i) => {
                      const extrasNombres = (prod.extras_ids ?? [])
                        .map((id) => extrasMap[id]?.nombre)
                        .filter(Boolean)
                      return (
                        <div key={prod.id} className="text-sm">
                          <div className="flex justify-between">
                            <div>
                              <span className="text-cream-500">{i + 1}.</span>{' '}
                              <span className="font-medium text-cream-900">
                                {prod.receta?.nombre ?? 'Producto'}
                              </span>
                              {extrasNombres.length > 0 && (
                                <span className="text-green-700"> + {extrasNombres.join(', ')}</span>
                              )}
                            </div>
                            <span className="text-cream-700 font-medium">
                              {formatCOP(Number(prod.precio_unitario) + Number(prod.precio_extras))}
                            </span>
                          </div>
                          {prod.notas && (
                            <p className="text-xs text-cream-500 italic ml-4">"{prod.notas}"</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : p.receta ? (
                  <div className="bg-cream-50 rounded-lg p-3 mb-3 text-sm">
                    <span className="font-medium text-cream-900">{p.receta.nombre}</span>
                    {p.notas && <p className="text-xs text-cream-500 italic">"{p.notas}"</p>}
                  </div>
                ) : null}

                {/* Stock descontado badge */}
                {p.stock_descontado && (
                  <div className="flex items-center gap-1 text-xs text-amber-700 mb-2">
                    <AlertTriangle size={12} />
                    Stock descontado
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-3 border-t border-cream-100">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${estadoInfo?.color}`}>
                    {estadoInfo?.etiqueta}
                  </span>
                  <select
                    value={p.estado}
                    onChange={(e) => cambiarEstado(p, e.target.value as EstadoPedido)}
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
