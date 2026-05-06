import { FormEvent, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCOP } from '../lib/utils'
import { Material, UnidadMedida } from '../types/database'

const UNIDADES: { valor: UnidadMedida; etiqueta: string }[] = [
  { valor: 'gramo', etiqueta: 'Gramos' },
  { valor: 'kilo', etiqueta: 'Kilos' },
  { valor: 'mililitro', etiqueta: 'Mililitros' },
  { valor: 'litro', etiqueta: 'Litros' },
  { valor: 'unidad', etiqueta: 'Unidades' },
  { valor: 'libra', etiqueta: 'Libras' },
]

export function Materiales() {
  const [materiales, setMateriales] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Material | null>(null)

  useEffect(() => {
    cargar()
  }, [])

  const cargar = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('materiales')
      .select('*')
      .order('nombre')
    if (error) {
      alert('Error cargando materiales: ' + error.message)
    } else {
      setMateriales(data ?? [])
    }
    setLoading(false)
  }

  const eliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"? Esto no se puede deshacer.`)) return
    const { error } = await supabase.from('materiales').delete().eq('id', id)
    if (error) {
      alert('Error eliminando: ' + error.message)
    } else {
      cargar()
    }
  }

  const abrirNuevo = () => {
    setEditando(null)
    setModalAbierto(true)
  }

  const abrirEdicion = (m: Material) => {
    setEditando(m)
    setModalAbierto(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl text-cream-900">Materiales</h1>
          <p className="text-cream-600 mt-1">
            Insumos que usas en tus recetas (harina, azúcar, huevos...)
          </p>
        </div>
        <button onClick={abrirNuevo} className="btn-primary">
          <Plus size={18} />
          Nuevo material
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-cream-600">Cargando...</div>
        ) : materiales.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-cream-700 font-display text-xl mb-2">
              Aún no tienes materiales
            </p>
            <p className="text-cream-500 text-sm mb-4">
              Agrega tu primer material para empezar a crear recetas
            </p>
            <button onClick={abrirNuevo} className="btn-primary">
              <Plus size={18} />
              Agregar material
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-cream-50 border-b border-cream-100">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-cream-700">
                  Nombre
                </th>
                <th className="text-left p-4 text-sm font-medium text-cream-700">
                  Unidad
                </th>
                <th className="text-right p-4 text-sm font-medium text-cream-700">
                  Precio/unidad
                </th>
                <th className="text-right p-4 text-sm font-medium text-cream-700">
                  Stock
                </th>
                <th className="text-right p-4 text-sm font-medium text-cream-700">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {materiales.map((m) => (
                <tr key={m.id} className="border-b border-cream-50 last:border-0">
                  <td className="p-4">
                    <p className="font-medium text-cream-900">{m.nombre}</p>
                    {m.proveedor && (
                      <p className="text-xs text-cream-500">{m.proveedor}</p>
                    )}
                  </td>
                  <td className="p-4 text-sm text-cream-700">
                    {UNIDADES.find((u) => u.valor === m.unidad_medida)?.etiqueta}
                  </td>
                  <td className="p-4 text-right text-sm text-cream-700">
                    {formatCOP(Number(m.precio_por_unidad))}
                  </td>
                  <td className="p-4 text-right text-sm text-cream-700">
                    {Number(m.cantidad_stock).toLocaleString('es-CO')}
                  </td>
                  <td className="p-4 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => abrirEdicion(m)}
                        className="p-2 text-cream-600 hover:bg-cream-100 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => eliminar(m.id, m.nombre)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalAbierto && (
        <ModalMaterial
          material={editando}
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

function ModalMaterial({
  material,
  onCerrar,
  onGuardado,
}: {
  material: Material | null
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [nombre, setNombre] = useState(material?.nombre ?? '')
  const [unidad, setUnidad] = useState<UnidadMedida>(
    material?.unidad_medida ?? 'gramo'
  )
  const [precio, setPrecio] = useState(material?.precio_por_unidad?.toString() ?? '')
  const [stock, setStock] = useState(material?.cantidad_stock?.toString() ?? '0')
  const [proveedor, setProveedor] = useState(material?.proveedor ?? '')
  const [notas, setNotas] = useState(material?.notas ?? '')
  const [guardando, setGuardando] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setGuardando(true)

    const datos = {
      nombre: nombre.trim(),
      unidad_medida: unidad,
      precio_por_unidad: Number(precio),
      cantidad_stock: Number(stock),
      proveedor: proveedor.trim() || null,
      notas: notas.trim() || null,
    }

    const { error } = material
      ? await supabase.from('materiales').update(datos).eq('id', material.id)
      : await supabase.from('materiales').insert(datos)

    setGuardando(false)
    if (error) {
      alert('Error guardando: ' + error.message)
    } else {
      onGuardado()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-cream-100">
          <h2 className="font-display text-2xl text-cream-900">
            {material ? 'Editar material' : 'Nuevo material'}
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
              placeholder="Ej: Harina de trigo"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Unidad de medida *</label>
              <select
                value={unidad}
                onChange={(e) => setUnidad(e.target.value as UnidadMedida)}
                className="input"
              >
                {UNIDADES.map((u) => (
                  <option key={u.valor} value={u.valor}>
                    {u.etiqueta}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Precio por unidad (COP) *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                className="input"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="label">Stock actual</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">Proveedor</label>
            <input
              type="text"
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              className="input"
              placeholder="Opcional"
            />
          </div>

          <div>
            <label className="label">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="input min-h-[80px]"
              placeholder="Opcional"
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
