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
  cantidad: number
  porcionesSolicitadas: number | null
  porcionesEstandar: number | null
}

// ── Detectores de tipo de producto ──────────────────────────────────────────
function detectarTipo(nombre: string): 'cupcake' | 'personalizado' | 'normal' {
  const n = nombre.toLowerCase()
  // Cupcakes: cup cake, cupcake, cups cake, cups cakes, cup-cake, etc.
  if (/cup.?cake/.test(n) || /cups.?cake/.test(n)) return 'cupcake'
  // Personalizados (incluye mantecadas personalizadas, tortas personalizadas, etc.)
  if (n.includes('personaliz')) return 'personalizado'
  return 'normal'
}

// Redondea al par más cercano (hacia arriba si es impar)
function redondearParArriba(n: number): number {
  return n % 2 === 0 ? n : n + 1
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

  // Carrito
  const [carrito, setCarrito] = useState<ProductoCarrito[]>([])

  // Producto en construcción
  const [recetaSel, setRecetaSel] = useState('')
  const [extrasSel, setExtrasSel] = useState<string[]>([])
  const [notasProducto, setNotasProducto] = useState('')
  const [cantidadProducto, setCantidadProducto] = useState(1)
  const [porcionesProducto, setPorcionesProducto] = useState<number>(0)

  const [cargandoFecha, setCargandoFecha] = useState(false)
  const [sinCupo, setSinCupo] = useState(false)

  const fechaMinima = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    try {
      const [recRes, extRes] = await Promise.all([
        supabase.from('recetas').select('*').eq('visible_publico', true).not('precio_venta', 'is', null).order('nombre'),
        supabase.from('extras').select('*').eq('activo', true).order('nombre'),
      ])
      const r = recRes.data ?? []
      const e = extRes.data ?? []
      setRecetas(r)
      setExtras(e)
      if (r.length > 0) inicializarReceta(r[0])
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  const inicializarReceta = (receta: Receta) => {
    setRecetaSel(receta.id)
    setCantidadProducto(1)
    setExtrasSel([])
    setNotasProducto('')
    const tipo = detectarTipo(receta.nombre)
    const porcionesEst = Number(receta.porciones ?? 0)
    if (tipo === 'personalizado') {
      // Inicializa con el estándar, ya redondeado al par
      setPorcionesProducto(redondearParArriba(porcionesEst))
    } else {
      setPorcionesProducto(0)
    }
  }

  const cambiarReceta = (id: string) => {
    const receta = recetas.find((r) => r.id === id)
    if (receta) inicializarReceta(receta)
  }

  // ── Cálculos del producto actual ─────────────────────────────────────────
  const recetaActual = recetas.find((r) => r.id === recetaSel)
  const tipo = recetaActual ? detectarTipo(recetaActual.nombre) : 'normal'
  const esCupcake = tipo === 'cupcake'
  const esPersonalizado = tipo === 'personalizado'
  const porcionesEstandar = recetaActual ? Number(recetaActual.porciones ?? 0) : 0
  const precioVentaBase = recetaActual ? Number(recetaActual.precio_venta ?? 0) : 0

  // Precio por porción para personalizados
  const precioPorPorcion = esPersonalizado && porcionesEstandar > 0
    ? precioVentaBase / porcionesEstandar
    : 0

  const precioBaseActual = esPersonalizado && porcionesProducto > 0
    ? Math.round(precioPorPorcion * porcionesProducto)
    : precioVentaBase

  const precioExtrasActual = extras
    .filter((e) => extrasSel.includes(e.id))
    .reduce((s, e) => s + Number(e.precio_extra), 0)

  const subtotalActual = esCupcake
    ? (precioBaseActual + precioExtrasActual) * cantidadProducto
    : precioBaseActual + precioExtrasActual

  const totalCarrito = carrito.reduce(
    (s, p) => s + (p.precioBase + p.precioExtras) * p.cantidad, 0
  )

  // ── Manejadores ──────────────────────────────────────────────────────────
  const toggleExtra = (id: string) => {
    setExtrasSel((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const ajustarPorciones = (delta: number) => {
    // Los botones +/- avanzan de 2 en 2
    const actual = porcionesProducto || redondearParArriba(porcionesEstandar)
    const siguiente = Math.max(2, actual + delta)
    setPorcionesProducto(redondearParArriba(siguiente))
  }

  const ajustarCantidad = (delta: number) => {
    setCantidadProducto((prev) => Math.max(1, prev + delta))
  }

  const agregarAlCarrito = () => {
    if (!recetaActual) return
    if (esPersonalizado && (!porcionesProducto || porcionesProducto < 2)) {
      alert('Indica cuántas porciones necesitas (mínimo 2, número par)')
      return
    }
    const extrasNombres = extras.filter((e) => extrasSel.includes(e.id)).map((e) => e.nombre)
    const cantidad = esCupcake ? cantidadProducto : 1

    let notasFinal = notasProducto.trim()
    if (esPersonalizado && porcionesProducto !== porcionesEstandar) {
      const notaPorciones = `Porciones solicitadas: ${porcionesProducto} (estándar: ${porcionesEstandar})`
      notasFinal = notasFinal ? `${notaPorciones} | ${notasFinal}` : notaPorciones
    }

    setCarrito([
      ...carrito,
      {
        recetaId: recetaActual.id,
        recetaNombre: recetaActual.nombre,
        extrasIds: [...extrasSel],
        extrasNombres,
        notas: notasFinal,
        precioBase: precioBaseActual,
        precioExtras: precioExtrasActual,
        cantidad,
        porcionesSolicitadas: esPersonalizado ? porcionesProducto : null,
        porcionesEstandar: esPersonalizado ? porcionesEstandar : null,
      },
    ])

    // Reset
    if (recetas.length > 0) inicializarReceta(recetas[0])
  }

  const quitarDelCarrito = (idx: number) => {
    setCarrito(carrito.filter((_, i) => i !== idx))
  }

  const verificarCupo = async (fecha: string) => {
    if (!fecha) return
    setCargandoFecha(true)
    setSinCupo(false)
    const { count } = await supabase
      .from('pedidos').select('id', { count: 'exact', head: true })
      .eq('fecha_entrega', fecha).neq('estado', 'cancelado')
    setCargandoFecha(false)
    if ((count ?? 0) >= 15) setSinCupo(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (carrito.length === 0) { setError('Agrega al menos un producto al pedido'); return }
    setError('')
    setEnviando(true)
    try {
      const { count: pedidosDia } = await supabase
        .from('pedidos').select('id', { count: 'exact', head: true })
        .eq('fecha_entrega', fechaEntrega).neq('estado', 'cancelado')
      if ((pedidosDia ?? 0) >= 15) {
        setSinCupo(true)
        setError('Lo sentimos, ya no hay cupo disponible para esa fecha.')
        setEnviando(false)
        return
      }

      const { data: clienteExistente } = await supabase
        .from('clientes').select('id').eq('telefono', whatsapp.trim()).maybeSingle()
      let clienteId = clienteExistente?.id
      if (!clienteId) {
        const { data: nuevoCliente, error: errCliente } = await supabase
          .from('clientes')
          .insert({ nombre: nombre.trim(), telefono: whatsapp.trim(), notas: dependencia ? `Dependencia: ${dependencia}` : null })
          .select('id').single()
        if (errCliente) throw errCliente
        clienteId = nuevoCliente.id
      }

      const precioTotal = carrito.reduce((s, p) => s + (p.precioBase + p.precioExtras) * p.cantidad, 0)

      const { data: pedido, error: errPedido } = await supabase
        .from('pedidos')
        .insert({
          cliente_id: clienteId,
          cantidad: carrito.reduce((s, p) => s + p.cantidad, 0),
          precio_total: precioTotal,
          estado: 'pendiente',
          fecha_entrega: fechaEntrega,
          pagado: false,
          nombre_cliente_publico: nombre.trim(),
          whatsapp_publico: whatsapp.trim(),
          dependencia: dependencia.trim() || null,
          stock_descontado: true,
        })
        .select('id').single()
      if (errPedido) throw errPedido

      const { error: errProductos } = await supabase
        .from('productos_pedido')
        .insert(carrito.map((p) => ({
          pedido_id: pedido.id,
          receta_id: p.recetaId,
          extras_ids: p.extrasIds.length > 0 ? p.extrasIds : null,
          notas: p.notas || null,
          precio_unitario: p.precioBase,
          precio_extras: p.precioExtras,
          cantidad: p.cantidad,
        })))
      if (errProductos) throw errProductos

      const alertas = await descontarStockPedido(pedido.id)

      const productosTexto = carrito.map((p, i) => {
        let linea = `${i + 1}. ${p.recetaNombre}`
        if (p.cantidad > 1) linea += ` x${p.cantidad}`
        if (p.porcionesSolicitadas) linea += ` (${p.porcionesSolicitadas} porciones)`
        if (p.extrasNombres.length > 0) linea += ` + ${p.extrasNombres.join(', ')}`
        linea += `: ${formatCOP((p.precioBase + p.precioExtras) * p.cantidad)}`
        if (p.notas) linea += `\n   Notas: ${p.notas}`
        return linea
      }).join('\n')

      enviarWhatsAppACallMeBot(
        `NUEVO PEDIDO - Dulzuras JM\n\n` +
        `Cliente: ${nombre}\nWhatsApp: ${whatsapp}\n` +
        (dependencia ? `Dependencia: ${dependencia}\n` : '') +
        `Fecha entrega: ${fechaEntrega}\n\n` +
        `Productos:\n${productosTexto}\n\n` +
        `TOTAL: ${formatCOP(precioTotal)}`
      )

      if (alertas.length > 0) {
        enviarWhatsAppACallMeBot(
          `ALERTA STOCK BAJO - Dulzuras JM\n\n` +
          `Pedido de ${nombre} registrado. Materiales con stock bajo:\n\n` +
          alertas.map((a) => `- ${a.nombre}: quedan ${a.quedaActual.toFixed(0)} ${a.unidad} (min: ${a.stockMinimo.toFixed(0)})`).join('\n') +
          `\n\nRevisa y reabastece pronto.`
        )
      }

      setEnviado(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar')
    } finally {
      setEnviando(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (cargando) return (
    <div className="min-h-screen flex items-center justify-center bg-cream-50">
      <p className="font-display text-xl text-cream-700">Cargando...</p>
    </div>
  )

  if (enviado) return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-cream-50 to-cream-100">
      <div className="card p-6 sm:p-8 max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <Heart className="text-green-600" size={32} />
        </div>
        <h1 className="font-display text-3xl text-wine-800 mb-2">¡Pedido recibido!</h1>
        <p className="text-cream-700 mb-2">Gracias <strong>{nombre}</strong>. Te contactaremos por WhatsApp.</p>
        <p className="text-sm text-cream-600 mb-2">
          {carrito.reduce((s, p) => s + p.cantidad, 0)} unidad(es) · {carrito.length} producto{carrito.length > 1 ? 's' : ''} · Total: <strong>{formatCOP(totalCarrito)}</strong>
        </p>
        <p className="text-xs text-cream-500 mb-6">(precio sujeto a confirmación)</p>
        <button onClick={() => { setEnviado(false); setCarrito([]); setNombre(''); setWhatsapp(''); setDependencia(''); setFechaEntrega('') }} className="btn-secondary">
          Hacer otro pedido
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 py-6 px-4 sm:py-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <img src="./logo.jpeg" alt="Dulzuras JM" className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full object-cover shadow-lg mb-4" />
        </div>

        <div className="card p-5 sm:p-6 md:p-8">
          <h1 className="font-display text-2xl sm:text-3xl text-wine-800 mb-1">Pide tu torta</h1>
          <p className="text-cream-600 mb-6 text-sm">Llena tus datos, agrega productos y envía tu pedido</p>

          {recetas.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-lg text-sm">
              Aún no hay tortas disponibles. Vuelve pronto.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ── Datos del cliente ── */}
              <div>
                <label className="label">Tu nombre *</label>
                <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">WhatsApp/Telefono *</label>
                <input type="tel" required placeholder="300 000 0000" value={whatsapp} maxLength={10}
                  onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 10))} className="input" />
              </div>
              <div>
                <label className="label">Dependencia/Direccion</label>
                <input type="text" placeholder="Ej: tics, recursos humanos..." value={dependencia} onChange={(e) => setDependencia(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Fecha de entrega *</label>
                <input type="date" required min={fechaMinima} value={fechaEntrega}
                  onChange={(e) => { setFechaEntrega(e.target.value); setSinCupo(false); verificarCupo(e.target.value) }} className="input" />
                {cargandoFecha && <p className="text-xs text-cream-500 mt-1">Verificando disponibilidad...</p>}
                {sinCupo && !cargandoFecha && <p className="text-xs text-red-600 mt-1 font-medium">⚠️ Esta fecha ya tiene el cupo lleno (15 pedidos). Por favor elige otro día.</p>}
                {!sinCupo && !cargandoFecha && fechaEntrega && <p className="text-xs text-green-700 mt-1">✓ Fecha disponible</p>}
                <p className="text-xs text-cream-500 mt-1">El pedido requiere mínimo 2 días hábiles de anticipación.</p>
              </div>

              {/* ── Carrito ── */}
              <div className="border-t border-cream-200 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingCart size={18} className="text-wine-700" />
                  <h2 className="font-display text-lg text-wine-800">Tu pedido</h2>
                </div>
                {carrito.length === 0 ? (
                  <p className="text-sm text-cream-500 italic py-3">Aún no has agregado productos. Usa el formulario de abajo.</p>
                ) : (
                  <div className="space-y-2 mb-3">
                    {carrito.map((p, i) => (
                      <div key={i} className="flex items-start justify-between bg-cream-50 border border-cream-200 rounded-lg p-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-cream-900 text-sm">
                            {p.recetaNombre}
                            {p.cantidad > 1 && <span className="ml-2 text-wine-700 font-bold">x{p.cantidad}</span>}
                            {p.porcionesSolicitadas && <span className="ml-2 text-xs text-cream-500">({p.porcionesSolicitadas} porciones)</span>}
                          </p>
                          {p.extrasNombres.length > 0 && <p className="text-xs text-green-700">+ {p.extrasNombres.join(', ')}</p>}
                          {p.notas && <p className="text-xs text-cream-500 italic">"{p.notas}"</p>}
                          <p className="text-sm font-medium text-wine-700 mt-1">
                            {formatCOP((p.precioBase + p.precioExtras) * p.cantidad)}
                            {p.cantidad > 1 && <span className="text-xs text-cream-500 font-normal ml-1">({formatCOP(p.precioBase + p.precioExtras)} c/u)</span>}
                          </p>
                        </div>
                        <button type="button" onClick={() => quitarDelCarrito(i)} className="p-1 text-red-500 hover:bg-red-50 rounded ml-2 flex-shrink-0">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <div className="bg-wine-50 border border-wine-200 rounded-lg p-3 flex justify-between">
                      <span className="font-medium text-wine-800">TOTAL</span>
                      <span className="font-display text-xl text-wine-800">{formatCOP(totalCarrito)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Agregar producto ── */}
              <div className="border border-cream-200 rounded-lg p-4 bg-cream-50">
                <h3 className="font-medium text-cream-800 text-sm mb-3 flex items-center gap-1">
                  <Plus size={16} /> Agregar producto
                </h3>
                <div className="space-y-3">

                  {/* Selector de receta */}
                  <div>
                    <label className="label text-xs">Tipo de producto</label>
                    <select value={recetaSel} onChange={(e) => cambiarReceta(e.target.value)} className="input text-sm">
                      {recetas.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre} ({r.porciones} porciones) – {formatCOP(Number(r.precio_venta ?? 0))}
                        </option>
                      ))}
                    </select>
                    {/* Etiqueta de tipo */}
                    {esCupcake && <p className="text-xs text-wine-700 mt-1 font-medium">☕ Elige cuántas unidades quieres</p>}
                    {esPersonalizado && <p className="text-xs text-wine-700 mt-1 font-medium">✏️ Elige cuántas porciones necesitas (solo números pares)</p>}
                  </div>

                  {/* Cupcakes: cantidad con botones +/- */}
                  {esCupcake && (
                    <div>
                      <label className="label text-xs">Cantidad de unidades</label>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => ajustarCantidad(-1)}
                          className="w-10 h-10 rounded-full border border-cream-300 bg-white text-lg font-bold text-cream-700 hover:bg-cream-100 flex items-center justify-center">
                          −
                        </button>
                        <div className="flex-1 text-center">
                          <span className="text-2xl font-display text-wine-800">{cantidadProducto}</span>
                          <p className="text-xs text-cream-500">unidad{cantidadProducto !== 1 ? 'es' : ''}</p>
                        </div>
                        <button type="button" onClick={() => ajustarCantidad(1)}
                          className="w-10 h-10 rounded-full border border-cream-300 bg-white text-lg font-bold text-cream-700 hover:bg-cream-100 flex items-center justify-center">
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Personalizados: porciones en pares con botones +/- */}
                  {esPersonalizado && (
                    <div>
                      <label className="label text-xs">Cantidad de porciones (solo números pares)</label>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => ajustarPorciones(-2)}
                          className="w-10 h-10 rounded-full border border-cream-300 bg-white text-lg font-bold text-cream-700 hover:bg-cream-100 flex items-center justify-center">
                          −
                        </button>
                        <div className="flex-1 text-center">
                          <span className="text-2xl font-display text-wine-800">
                            {porcionesProducto || redondearParArriba(porcionesEstandar)}
                          </span>
                          <p className="text-xs text-cream-500">porciones</p>
                        </div>
                        <button type="button" onClick={() => ajustarPorciones(2)}
                          className="w-10 h-10 rounded-full border border-cream-300 bg-white text-lg font-bold text-cream-700 hover:bg-cream-100 flex items-center justify-center">
                          +
                        </button>
                      </div>
                      {porcionesEstandar > 0 && (
                        <p className="text-xs text-cream-500 mt-1 text-center">
                          Estándar: {redondearParArriba(porcionesEstandar)} porciones · {formatCOP(precioVentaBase)}
                          {porcionesProducto > 0 && porcionesProducto !== porcionesEstandar && (
                            <span className="text-wine-700 font-medium"> → Precio ajustado: {formatCOP(precioBaseActual)}</span>
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Extras */}
                  {extras.length > 0 && (
                    <div>
                      <label className="label text-xs">Extras para este producto</label>
                      <div className="space-y-1">
                        {extras.map((ex) => (
                          <label key={ex.id} className="flex items-center justify-between p-2 bg-white rounded border border-cream-100 cursor-pointer hover:border-cream-300 transition">
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={extrasSel.includes(ex.id)} onChange={() => toggleExtra(ex.id)} className="w-4 h-4 accent-wine-700" />
                              <span className="text-sm text-cream-900">{ex.nombre}</span>
                            </div>
                            <span className="text-sm font-medium text-green-700">+ {formatCOP(Number(ex.precio_extra))}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notas */}
                  <div>
                    <label className="label text-xs">Notas de este producto</label>
                    <input type="text" placeholder="Mensaje en la torta, sin azúcar, etc." value={notasProducto} onChange={(e) => setNotasProducto(e.target.value)} className="input text-sm" />
                  </div>

                  {/* Subtotal en vivo */}
                  {precioVentaBase > 0 && (
                    <div className="bg-white rounded border border-cream-200 p-3 space-y-1">
                      {esCupcake && cantidadProducto > 1 && (
                        <div className="flex justify-between text-xs text-cream-600">
                          <span>{cantidadProducto} unidades × {formatCOP(precioVentaBase + precioExtrasActual)}</span>
                        </div>
                      )}
                      {esPersonalizado && porcionesProducto > 0 && precioPorPorcion > 0 && (
                        <div className="flex justify-between text-xs text-cream-600">
                          <span>{porcionesProducto} porciones × {formatCOP(Math.round(precioPorPorcion))}/porción</span>
                        </div>
                      )}
                      {precioExtrasActual > 0 && (
                        <div className="flex justify-between text-xs text-green-700">
                          <span>Extras</span>
                          <span>+ {formatCOP(precioExtrasActual)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-medium text-cream-900 pt-1 border-t border-cream-100">
                        <span>Subtotal</span>
                        <span>{formatCOP(subtotalActual)}</span>
                      </div>
                    </div>
                  )}

                  <button type="button" onClick={agregarAlCarrito}
                    disabled={esPersonalizado && (!porcionesProducto || porcionesProducto < 2)}
                    className="btn-secondary w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    <Plus size={16} /> Agregar al pedido
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{error}</div>
              )}

              <button type="submit" disabled={enviando || carrito.length === 0 || sinCupo || cargandoFecha} className="btn-primary w-full">
                {enviando ? 'Enviando...' : `Enviar pedido (${formatCOP(totalCarrito)})`}
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-6">
          <Link to="/login" className="text-xs text-cream-500 hover:text-cream-700">Acceso administración</Link>
        </div>
      </div>
    </div>
  )
}
