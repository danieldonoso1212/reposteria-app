import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCOP, enviarWhatsAppACallMeBot } from '../lib/utils'
import { Receta, Extra } from '../types/database'

export function FormularioPublico() {
  const [recetas, setRecetas] = useState<Receta[]>([])
  const [extras, setExtras] = useState<(Extra & { material: { unidad_medida: string } })[]>([])
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nombre: '',
    whatsapp: '',
    dependencia: '',
    recetaId: '',
    extrasIds: [] as string[],
    fechaEntrega: '',
    notas: '',
  })

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
          .select('*, material:materiales(unidad_medida)')
          .eq('activo', true)
          .order('nombre'),
      ])

      const r = recRes.data ?? []
      const e = (extRes.data ?? []) as unknown as (Extra & {
        material: { unidad_medida: string }
      })[]
      setRecetas(r)
      setExtras(e)
      if (r.length > 0) {
        setForm((f) => ({ ...f, recetaId: r[0].id }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  const recetaSel = recetas.find((r) => r.id === form.recetaId)
  const precioBase = recetaSel ? Number(recetaSel.precio_venta ?? 0) : 0
  const precioExtras = extras
    .filter((e) => form.extrasIds.includes(e.id))
    .reduce((s, e) => s + Number(e.precio_extra), 0)
  const precioTotal = precioBase + precioExtras

  const toggleExtra = (id: string) => {
    setForm((f) => ({
      ...f,
      extrasIds: f.extrasIds.includes(id)
        ? f.extrasIds.filter((x) => x !== id)
        : [...f.extrasIds, id],
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setEnviando(true)

    try {
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id')
        .eq('telefono', form.whatsapp.trim())
        .maybeSingle()

      let clienteId = clienteExistente?.id
      if (!clienteId) {
        const { data: nuevoCliente, error: errCliente } = await supabase
          .from('clientes')
          .insert({
            nombre: form.nombre.trim(),
            telefono: form.whatsapp.trim(),
            notas: form.dependencia ? `Dependencia: ${form.dependencia}` : null,
          })
          .select('id')
          .single()
        if (errCliente) throw errCliente
        clienteId = nuevoCliente.id
      }

      const { error: errPedido } = await supabase.from('pedidos').insert({
        cliente_id: clienteId,
        receta_id: form.recetaId,
        cantidad: 1,
        precio_total: precioTotal,
        estado: 'pendiente',
        fecha_entrega: form.fechaEntrega,
        notas: form.notas.trim() || null,
        pagado: false,
        nombre_cliente_publico: form.nombre.trim(),
        whatsapp_publico: form.whatsapp.trim(),
        dependencia: form.dependencia.trim() || null,
        extras_ids: form.extrasIds.length > 0 ? form.extrasIds : null,
      })

      if (errPedido) throw errPedido

      // ====================================================
      // NOTIFICACIÓN AUTOMÁTICA POR WHATSAPP AL ADMIN
      // ====================================================
      const extrasNombres = extras
        .filter((ex) => form.extrasIds.includes(ex.id))
        .map((ex) => ex.nombre)
        .join(', ')

      const mensaje =
        `🎂 *NUEVO PEDIDO - Dulzuras JM*%0A%0A` +
        `*Cliente:* ${form.nombre}%0A` +
        `*WhatsApp:* ${form.whatsapp}%0A` +
        (form.dependencia ? `*Dependencia:* ${form.dependencia}%0A` : '') +
        `*Producto:* ${recetaSel?.nombre ?? ''}%0A` +
        (extrasNombres ? `*Extras:* ${extrasNombres}%0A` : '') +
        `*Fecha entrega:* ${form.fechaEntrega}%0A` +
        `*Precio estimado:* ${formatCOP(precioTotal)}%0A` +
        (form.notas ? `*Notas:* ${form.notas}` : '')

      // Convertimos %0A a saltos reales para el mensaje
      const mensajeFinal = mensaje.replace(/%0A/g, '\n')
      
      // Enviar (si no está configurado, simplemente no hace nada)
      enviarWhatsAppACallMeBot(mensajeFinal)

      setEnviado(true)
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error al enviar el pedido'
      setError(mensaje)
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
            Gracias <strong>{form.nombre}</strong>. Te contactaremos por WhatsApp muy
            pronto para confirmar los detalles.
          </p>
          {precioTotal > 0 && (
            <p className="text-sm text-cream-600 mb-6">
              Precio estimado: <strong>{formatCOP(precioTotal)}</strong>
              <br />
              <span className="text-xs">(sujeto a confirmación final)</span>
            </p>
          )}
          <button
            onClick={() => {
              setEnviado(false)
              setForm({
                nombre: '',
                whatsapp: '',
                dependencia: '',
                recetaId: recetas[0]?.id ?? '',
                extrasIds: [],
                fechaEntrega: '',
                notas: '',
              })
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
            Llena el formulario y te contactamos por WhatsApp para confirmar
          </p>

          {recetas.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-lg text-sm">
              Aún no hay tortas disponibles. Vuelve pronto o contáctanos directamente.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Tu nombre *</label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">WhatsApp/Telefono *</label>
                <input
                  type="tel"
                  required
                  placeholder="300 000 0000"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Dependencia/Direccion</label>
                <input
                  type="text"
                  placeholder="Ej: tics, recursos humanos..."
                  value={form.dependencia}
                  onChange={(e) => setForm({ ...form, dependencia: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Tipo de producto *</label>
                <select
                  required
                  value={form.recetaId}
                  onChange={(e) => setForm({ ...form, recetaId: e.target.value })}
                  className="input"
                >
                  {recetas.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre} ({r.porciones} porciones)
                    </option>
                  ))}
                </select>
                {recetaSel && (
                  <p className="text-xs text-cream-500 mt-1">
                    Precio base: {formatCOP(precioBase)}
                  </p>
                )}
              </div>

              {extras.length > 0 && (
                <div>
                  <label className="label">
                    Extras (opcional, marca los que quieras añadir)
                  </label>
                  <div className="space-y-1 border border-cream-200 rounded-lg p-2 bg-cream-50">
                    {extras.map((ex) => (
                      <label
                        key={ex.id}
                        className="flex items-center justify-between p-2 rounded cursor-pointer hover:bg-white transition"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={form.extrasIds.includes(ex.id)}
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

              {precioTotal > 0 && (
                <div className="bg-wine-50 border border-wine-200 rounded-lg p-4">
                  <p className="text-xs text-wine-700">Precio</p>
                  <p className="font-display text-3xl text-wine-800">
                    {formatCOP(precioTotal)}
                  </p>
                  {precioExtras > 0 && (
                    <p className="text-xs text-wine-700 mt-1">
                      Base {formatCOP(precioBase)} + extras {formatCOP(precioExtras)}
                    </p>
                  )}
                  
                </div>
              )}

              <div>
                <label className="label">Fecha de entrega *</label>
                <input
                  type="date"
                  required
                  value={form.fechaEntrega}
                  onChange={(e) => setForm({ ...form, fechaEntrega: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Personalización o notas</label>
                <textarea
                  rows={3}
                  placeholder="Decoración, mensaje en la torta, dirección de entrega..."
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  className="input"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              <button type="submit" disabled={enviando} className="btn-primary w-full">
                {enviando ? 'Enviando...' : 'Enviar pedido'}
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
