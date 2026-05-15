import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Plus, Trash2, ShoppingCart } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCOP, enviarWhatsAppACallMeBot, descontarStockPedido } from '../lib/utils'
import { Receta, Extra } from '../types/database'

interface ProductoCarrito {
  recetaId: string
  recetaNombre: string
  extrasIds: string[]
  extrasNombres: string[]
  notas: string
  precioBase: number
  precioExtras: number
}

export function FormularioPublico() {
  const [recetas, setRecetas] = useState<Receta[]>([])
  const [extras, setExtras] = useState<Extra[]>([])
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  // Datos del cliente
  const [nombre, setNombre] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [dependencia, setDependencia] = useState('')
  const [fechaEntrega, setFechaEntrega] = useState('')

  // Carrito de productos
  const [carrito, setCarrito] = useState<ProductoCarrito[]>([])

  // Producto que se está armando
  const [recetaSel, setRecetaSel] = useState('')
  const [extrasSel, setExtrasSel] = useState<string[]>([])
  const [notasProducto, setNotasProducto] = useState('')

  useEffect(() => {
    cargar()
  }, [])

  const cargar = async () => {
    try {
      const [recRes, extRes] = await Promise.all([
        supabase
          .from('recetas')
          .select('*')
          .eq('visible_publico', true)
          .not('precio_venta', 'is', null)
          .order('nombre'),
        supabase
          .from('extras')
          .select('*')
          .eq('activo', true)
          .order('nombre'),
      ])
      const r = recRes.data ?? []
      const e = extRes.data ?? []
      setRecetas(r)
      setExtras(e)
      if (r.length > 0) setRecetaSel(r[0].id)
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  const recetaActual = recetas.find((r) => r.id === recetaSel)
  const precioBaseActual = recetaActual ? Number(recetaActual.precio_venta ?? 0) : 0
  const precioExtrasActual = extras
    .filter((e) => extrasSel.includes(e.id))
    .reduce((s, e) => s + Number(e.precio_extra), 0)

  const totalCarrito = carrito.reduce(
    (s, p) => s + p.precioBase + p.precioExtras,
    0
  )

  const toggleExtra = (id: string) => {
    setExtrasSel((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const agregarAlCarrito = () => {
    if (!recetaActual) return
    const extrasNombres = extras
      .filter((e) => extrasSel.includes(e.id))
      .map((e) => e.nombre)

    setCarrito([
      ...carrito,
      {
        recetaId: recetaActual.id,
        recetaNombre: recetaActual.nombre,
        extrasIds: [...extrasSel],
        extrasNombres,
        notas: notasProducto.trim(),
        precioBase: precioBaseActual,
        precioExtras: precioExtrasActual,
      },
    ])
    // Limpiar para el siguiente producto
    setExtrasSel([])
    setNotasProducto('')
    if (recetas.length > 0) setRecetaSel(recetas[0].id)
  }

  const quitarDelCarrito = (idx: number) => {
    setCarrito(carrito.filter((_, i) => i !== idx))
  }

  const [cargandoFecha, setCargandoFecha] = useState(false)
  const [sinCupo, setSinCupo] = useState(false)

  // Fecha mínima: hoy + 3 días
  const fechaMinima = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]

  const verificarCupo = async (fecha: string) => {
    if (!fecha) return
    setCargandoFecha(true)
    setSinCupo(false)
    const { count } = await supabase
      .from('pedidos')
      .select('id', { count: 'exact', head: true })
      .eq('fecha_entrega', fecha)
      .neq('estado', 'cancelado')
    setCargandoFecha(false)
    if ((count ?? 0) >= 15) setSinCupo(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (carrito.length === 0) {
      setError('Agrega al menos un producto al pedido')
      return
    }
    setError('')
    setEnviando(true)

    try {
      // 0. Verificar cupo disponible para la fecha (doble chequeo al enviar)
      const { count: pedidosDia } = await supabase
        .from('pedidos')
        .select('id', { count: 'exact', head: true })
        .eq('fecha_entrega', fechaEntrega)
        .neq('estado', 'cancelado')

      if ((pedidosDia ?? 0) >= 15) {
        setSinCupo(true)
        setError('Lo sentimos, ya no hay cupo disponible para esa fecha. Por favor elige otro día.')
        setEnviando(false)
        return
      }

      // 1. Crear/buscar cliente
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id')
        .eq('telefono', whatsapp.trim())
        .maybeSingle()

      let clienteId = clienteExistente?.id
      if (!clienteId) {
        const { data: nuevoCliente, error: errCliente } = await supabase
          .from('clientes')
          .insert({
            nombre: nombre.trim(),
            telefono: whatsapp.trim(),
            notas: dependencia ? `Dependencia: ${dependencia}` : null,
          })
          .select('id')
          .single()
        if (errCliente) throw errCliente
        clienteId = nuevoCliente.id
      }

      // 2. Crear pedido
      const precioTotal = carrito.reduce(
        (s, p) => s + p.precioBase + p.precioExtras,
        0
      )

      const { data: pedido, error: errPedido } = await supabase
        .from('pedidos')
        .insert({
          cliente_id: clienteId,
          cantidad: carrito.length,
          precio_total: precioTotal,
          estado: 'pendiente',
          fecha_entrega: fechaEntrega,
          pagado: false,
          nombre_cliente_publico: nombre.trim(),
          whatsapp_publico: whatsapp.trim(),
          dependencia: dependencia.trim() || null,
          // ✅ El stock se descuenta al crear el pedido desde el formulario público
          stock_descontado: true,
        })
        .select('id')
        .single()

      if (errPedido) throw errPedido

      // 3. Crear productos del pedido
      const productosInsert = carrito.map((p) => ({
        pedido_id: pedido.id,
        receta_id: p.recetaId,
        extras_ids: p.extrasIds.length > 0 ? p.extrasIds : null,
        notas: p.notas || null,
        precio_unitario: p.precioBase,
        precio_extras: p.precioExtras,
      }))

      const { error: errProductos } = await supabase
        .from('productos_pedido')
        .insert(productosInsert)

      if (errProductos) throw errProductos

      // 4. ✅ Descontar stock de materiales y verificar alertas
      const alertas = await descontarStockPedido(pedido.id)

      // 5. Notificación WhatsApp al admin con el pedido
      const productosTexto = carrito
        .map((p, i) => {
          let linea = `${i + 1}. ${p.recetaNombre}`
          if (p.extrasNombres.length > 0)
            linea += ` + ${p.extrasNombres.join(', ')}`
          linea += `: ${formatCOP(p.precioBase + p.precioExtras)}`
          if (p.notas) linea += `\n   Notas: ${p.notas}`
          return linea
        })
        .join('\n')

      const mensaje =
        `🎂 *NUEVO PEDIDO - Dulzuras JM*\n\n` +
        `*Cliente:* ${nombre}\n` +
        `*WhatsApp:* ${whatsapp}\n` +
        (dependencia ? `*Dependencia:* ${dependencia}\n` : '') +
        `*Fecha entrega:* ${fechaEntrega}\n\n` +
        `*Productos:*\n${productosTexto}\n\n` +
        `*TOTAL: ${formatCOP(precioTotal)}*`

      enviarWhatsAppACallMeBot(mensaje)

      // 6. ✅ Enviar alerta de stock bajo si hay materiales escasos
      if (alertas.length > 0) {
        const mensajeAlerta =
          `⚠️ *ALERTA STOCK BAJO - Dulzuras JM*\n\n` +
          `Pedido de ${nombre} registrado. Materiales con stock bajo:\n\n` +
          alertas
            .map(
              (a) =>
                `• ${a.nombre}: quedan ${a.quedaActual.toFixed(0)} ${a.unidad} (mín: ${a.stockMinimo.toFixed(0)})`
            )
            .join('\n') +
          `\n\nRevisa y reabastece pronto.`

        enviarWhatsAppACallMeBot(mensajeAlerta)
      }

      setEnviado(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al enviar'
      setError(msg)
    } finally {
      setEnviando(false)
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <p className="font-display text-xl text-cream-700">Cargando...</p>
      </div>
    )
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-cream-50 to-cream-100">
        <div className="card p-6 sm:p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Heart className="text-green-600" size={32} />
          </div>
          <h1 className="font-display text-3xl text-wine-800 mb-2">¡Pedido recibido!</h1>
          <p className="text-cream-700 mb-2">
            Gracias <strong>{nombre}</strong>. Te contactaremos por WhatsApp.
          </p>
          <p className="text-sm text-cream-600 mb-2">
            {carrito.length} producto{carrito.length > 1 ? 's' : ''} · Total:{' '}
            <strong>{formatCOP(totalCarrito)}</strong>
          </p>
          <p className="text-xs text-cream-500 mb-6">(precio sujeto a confirmación)</p>
          <button
            onClick={() => {
              setEnviado(false)
              setCarrito([])
              setNombre('')
              setWhatsapp('')
              setDependencia('')
              setFechaEntrega('')
              setExtrasSel([])
              setNotasProducto('')
            }}
            className="btn-secondary"
          >
            Hacer otro pedido
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 py-6 px-4 sm:py-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <img
            src="./logo.jpeg"
            alt="Dulzuras JM"
            className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full object-cover shadow-lg mb-4"
          />
        </div>

        <div className="card p-5 sm:p-6 md:p-8">
          <h1 className="font-display text-2xl sm:text-3xl text-wine-800 mb-1">
            Pide tu torta
          </h1>
          <p className="text-cream-600 mb-6 text-sm">
            Llena tus datos, agrega productos y envía tu pedido
          </p>

          {recetas.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-lg text-sm">
              Aún no hay tortas disponibles. Vuelve pronto.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Datos del cliente */}
              <div>
                <label className="label">Tu nombre *</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">WhatsApp/Telefono *</label>
                <input
  type="tel"
  required
  placeholder="300 000 0000"
  value={whatsapp}
  onChange={(e) => {
    const soloNumeros = e.target.value.replace(/\D/g, '').slice(0, 10)
    setWhatsapp(soloNumeros)
  }}
  className="input"
  maxLength={10}
/>
              </div>
              <div>
                <label className="label">Dependencia/Direccion</label>
                <input
                  type="text"
                  placeholder="Ej: tics, recursos humanos..."
                  value={dependencia}
                  onChange={(e) => setDependencia(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Fecha de entrega *</label>
                <input
                  type="date"
                  required
                  min={fechaMinima}
                  value={fechaEntrega}
                  onChange={(e) => {
                    setFechaEntrega(e.target.value)
                    setSinCupo(false)
                    verificarCupo(e.target.value)
                  }}
                  className="input"
                />
                {cargandoFecha && (
                  <p className="text-xs text-cream-500 mt-1">Verificando disponibilidad...</p>
                )}
                {sinCupo && !cargandoFecha && (
                  <p className="text-xs text-red-600 mt-1 font-medium">
                    ⚠️ Esta fecha ya tiene el cupo lleno (15 pedidos). Por favor elige otro día.
                  </p>
                )}
                {!sinCupo && !cargandoFecha && fechaEntrega && (
                  <p className="text-xs text-green-700 mt-1">✓ Fecha disponible</p>
                )}
                <p className="text-xs text-cream-500 mt-1">
                  El pedido requiere mínimo 2 días hábiles de anticipación.
                </p>
              </div>

              {/* Carrito / Resumen del pedido */}
              <div className="border-t border-cream-200 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingCart size={18} className="text-wine-700" />
                  <h2 className="font-display text-lg text-wine-800">Tu pedido</h2>
                </div>

                {carrito.length === 0 ? (
                  <p className="text-sm text-cream-500 italic py-3">
                    Aún no has agregado productos. Usa el formulario de abajo.
                  </p>
                ) : (
                  <div className="space-y-2 mb-3">
                    {carrito.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-start justify-between bg-cream-50 border border-cream-200 rounded-lg p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-cream-900 text-sm">{p.recetaNombre}</p>
                          {p.extrasNombres.length > 0 && (
                            <p className="text-xs text-green-700">
                              + {p.extrasNombres.join(', ')}
                            </p>
                          )}
                          {p.notas && (
                            <p className="text-xs text-cream-500 italic">"{p.notas}"</p>
                          )}
                          <p className="text-sm font-medium text-wine-700 mt-1">
                            {formatCOP(p.precioBase + p.precioExtras)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => quitarDelCarrito(i)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded ml-2 flex-shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <div className="bg-wine-50 border border-wine-200 rounded-lg p-3 flex justify-between">
                      <span className="font-medium text-wine-800">TOTAL</span>
                      <span className="font-display text-xl text-wine-800">
                        {formatCOP(totalCarrito)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Agregar producto */}
              <div className="border border-cream-200 rounded-lg p-4 bg-cream-50">
                <h3 className="font-medium text-cream-800 text-sm mb-3 flex items-center gap-1">
                  <Plus size={16} />
                  Agregar producto
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="label text-xs">Tipo de producto</label>
                    <select
                      value={recetaSel}
                      onChange={(e) => setRecetaSel(e.target.value)}
                      className="input text-sm"
                    >
                      {recetas.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre} ({r.porciones} porciones) -{' '}
                          {formatCOP(Number(r.precio_venta ?? 0))}
                        </option>
                      ))}
                    </select>
                  </div>

                  {extras.length > 0 && (
                    <div>
                      <label className="label text-xs">Extras para este producto</label>
                      <div className="space-y-1">
                        {extras.map((ex) => (
                          <label
                            key={ex.id}
                            className="flex items-center justify-between p-2 bg-white rounded border border-cream-100 cursor-pointer hover:border-cream-300 transition"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={extrasSel.includes(ex.id)}
                                onChange={() => toggleExtra(ex.id)}
                                className="w-4 h-4 accent-wine-700"
                              />
                              <span className="text-sm text-cream-900">{ex.nombre}</span>
                            </div>
                            <span className="text-sm font-medium text-green-700">
                              + {formatCOP(Number(ex.precio_extra))}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="label text-xs">Notas de este producto</label>
                    <input
                      type="text"
                      placeholder="Mensaje en la torta, sin azúcar, etc."
                      value={notasProducto}
                      onChange={(e) => setNotasProducto(e.target.value)}
                      className="input text-sm"
                    />
                  </div>

                  {precioBaseActual > 0 && (
                    <div className="text-right text-sm text-cream-700">
                      Subtotal:{' '}
                      <strong>{formatCOP(precioBaseActual + precioExtrasActual)}</strong>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={agregarAlCarrito}
                    className="btn-secondary w-full text-sm"
                  >
                    <Plus size={16} />
                    Agregar al pedido
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={enviando || carrito.length === 0 || sinCupo || cargandoFecha}
                className="btn-primary w-full"
              >
                {enviando ? 'Enviando...' : `Enviar pedido (${formatCOP(totalCarrito)})`}
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-6">
          <Link to="/login" className="text-xs text-cream-500 hover:text-cream-700">
            Acceso administración
          </Link>
        </div>
      </div>
    </div>
  )
}
