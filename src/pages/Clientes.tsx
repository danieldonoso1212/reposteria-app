import { FormEvent, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Phone, Mail, MapPin, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Cliente } from '../types/database'

export function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    cargar()
  }, [])

  const cargar = async () => {
    setLoading(true)
    const { data } = await supabase.from('clientes').select('*').order('nombre')
    setClientes(data ?? [])
    setLoading(false)
  }

  const eliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) alert('Error: ' + error.message)
    else cargar()
  }

  const filtrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl text-cream-900">Clientes</h1>
          <p className="text-cream-600 mt-1">Tu base de clientes</p>
        </div>
        <button
          onClick={() => {
            setEditando(null)
            setModalAbierto(true)
          }}
          className="btn-primary"
        >
          <Plus size={18} />
          Nuevo cliente
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input max-w-md"
          placeholder="Buscar por nombre..."
        />
      </div>

      {loading ? (
        <div className="card p-8 text-center text-cream-600">Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="mx-auto text-cream-300 mb-3" size={48} />
          <p className="text-cream-700 font-display text-xl">
            {busqueda ? 'No se encontraron clientes' : 'Sin clientes registrados'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-display text-lg text-cream-900">{c.nombre}</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditando(c)
                      setModalAbierto(true)
                    }}
                    className="p-1.5 text-cream-600 hover:bg-cream-100 rounded-lg"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => eliminar(c.id, c.nombre)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                {c.telefono && (
                  <div className="flex items-center gap-2 text-cream-700">
                    <Phone size={14} className="text-cream-400 flex-shrink-0" />
                    <a
                      href={`https://wa.me/${c.telefono.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-rose_brand-700"
                    >
                      {c.telefono}
                    </a>
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-2 text-cream-700">
                    <Mail size={14} className="text-cream-400 flex-shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>
                )}
                {c.direccion && (
                  <div className="flex items-start gap-2 text-cream-700">
                    <MapPin
                      size={14}
                      className="text-cream-400 flex-shrink-0 mt-0.5"
                    />
                    <span>{c.direccion}</span>
                  </div>
                )}
                {c.notas && (
                  <p className="text-xs text-cream-500 italic mt-2 pt-2 border-t border-cream-100">
                    {c.notas}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <ModalCliente
          cliente={editando}
          onCerrar={() => setModalAbierto(false)}
          onGuardado={() => {
            setModalAbierto(false)
            cargar()
          }}
        />
      )}
    </div>
  )
}

function ModalCliente({
  cliente,
  onCerrar,
  onGuardado,
}: {
  cliente: Cliente | null
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [nombre, setNombre] = useState(cliente?.nombre ?? '')
  const [telefono, setTelefono] = useState(cliente?.telefono ?? '')
  const [email, setEmail] = useState(cliente?.email ?? '')
  const [direccion, setDireccion] = useState(cliente?.direccion ?? '')
  const [notas, setNotas] = useState(cliente?.notas ?? '')
  const [guardando, setGuardando] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setGuardando(true)

    const datos = {
      nombre: nombre.trim(),
      telefono: telefono.trim() || null,
      email: email.trim() || null,
      direccion: direccion.trim() || null,
      notas: notas.trim() || null,
    }

    const { error } = cliente
      ? await supabase.from('clientes').update(datos).eq('id', cliente.id)
      : await supabase.from('clientes').insert(datos)

    setGuardando(false)
    if (error) alert('Error: ' + error.message)
    else onGuardado()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-cream-100">
          <h2 className="font-display text-2xl text-cream-900">
            {cliente ? 'Editar cliente' : 'Nuevo cliente'}
          </h2>
          <button
            onClick={onCerrar}
            className="p-2 text-cream-600 hover:bg-cream-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">Teléfono / WhatsApp</label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="input"
              placeholder="+57 300 1234567"
            />
          </div>

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">Dirección</label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">Notas (preferencias, alergias...)</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="input min-h-[80px]"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onCerrar} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
