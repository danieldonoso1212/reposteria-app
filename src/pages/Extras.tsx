import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCOP } from '../lib/utils'
import { Material, Extra } from '../types/database'

interface ExtraEdicion {
  id?: string
  nombre: string
  material_id: string
  cantidad_usada: number | string
  precio_extra: number | string
  activo: boolean
}

export function Extras() {
  const [extras, setExtras] = useState<(Extra & { material: Material })[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState<ExtraEdicion | null>(null)

  const cargar = async () => {
    setCargando(true)
    const [extRes, matRes] = await Promise.all([
      supabase
        .from('extras')
        .select('*, material:materiales(*)')
        .order('nombre'),
      supabase.from('materiales').select('*').order('nombre'),
    ])
    setExtras((extRes.data ?? []) as unknown as (Extra & { material: Material })[])
    setMateriales(matRes.data ?? [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const nuevo = () => {
    if (materiales.length === 0) return
    setEditando({
      nombre: '',
      material_id: materiales[0].id,
      cantidad_usada: 0,
      precio_extra: 0,
      activo: true,
    })
  }

  const guardar = async () => {
    if (!editando || !editando.nombre.trim()) return
    const datos = {
      nombre: editando.nombre.trim(),
      material_id: editando.material_id,
      cantidad_usada: Number(editando.cantidad_usada),
      precio_extra: Number(editando.precio_extra),
      activo: editando.activo,
    }

    const { error } = editando.id
      ? await supabase.from('extras').update(datos).eq('id', editando.id)
      : await supabase.from('extras').insert(datos)

    if (error) alert('Error: ' + error.message)
    else {
      setEditando(null)
      cargar()
    }
  }

  const eliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return
    await supabase.from('extras').delete().eq('id', id)
    cargar()
  }

  const toggleActivo = async (e: Extra) => {
    await supabase.from('extras').update({ activo: !e.activo }).eq('id', e.id)
    cargar()
  }

  if (cargando) return <div className="text-cream-600">Cargando...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-cream-900">Extras</h1>
          <p className="text-cream-600 mt-1 text-sm">
            Adiciones que el cliente puede pedir (fresas, decoración, etc.)
          </p>
        </div>
        {!editando && (
          <button onClick={nuevo} className="btn-primary" disabled={materiales.length === 0}>
            <Plus size={18} />
            Nuevo extra
          </button>
        )}
      </div>

      {materiales.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-lg mb-4 text-sm">
          Antes de crear extras debes tener al menos un material en la sección "Materiales".
        </div>
      )}

      {editando && (
        <div className="card p-6 mb-6">
          <h3 className="font-display text-xl text-wine-800 mb-4">
            {editando.id ? 'Editar extra' : 'Nuevo extra'}
          </h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Nombre visible al cliente</label>
              <input
                type="text"
                placeholder="Ej: Fresas naturales"
                value={editando.nombre}
                onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Precio extra (COP)</label>
              <input
                type="number"
                step="100"
                value={editando.precio_extra}
                onChange={(e) =>
                  setEditando({ ...editando, precio_extra: e.target.value })
                }
                className="input"
              />
            </div>
            <div>
              <label className="label">Material que se usa</label>
              <select
                value={editando.material_id}
                onChange={(e) =>
                  setEditando({ ...editando, material_id: e.target.value })
                }
                className="input"
              >
                {materiales.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre} ({m.unidad_medida})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Cantidad usada</label>
              <input
                type="number"
                step="0.001"
                value={editando.cantidad_usada}
                onChange={(e) =>
                  setEditando({ ...editando, cantidad_usada: e.target.value })
                }
                className="input"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm mb-4">
            <input
              type="checkbox"
              checked={editando.activo}
              onChange={(e) => setEditando({ ...editando, activo: e.target.checked })}
              className="w-4 h-4 accent-wine-700"
            />
            <span>Visible para los clientes en el formulario</span>
          </label>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditando(null)} className="btn-secondary">
              Cancelar
            </button>
            <button onClick={guardar} className="btn-primary">
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {extras.length === 0 ? (
          <div className="p-12 text-center">
            <Sparkles className="mx-auto text-cream-300 mb-3" size={48} />
            <p className="text-cream-700 font-display text-xl mb-1">Sin extras</p>
            <p className="text-cream-500 text-sm">
              Crea adiciones opcionales para tus tortas
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-cream-50 border-b border-cream-100">
              <tr>
                <th className="text-left p-3 font-medium text-cream-700">Extra</th>
                <th className="text-left p-3 font-medium text-cream-700">Material</th>
                <th className="text-right p-3 font-medium text-cream-700">Cantidad</th>
                <th className="text-right p-3 font-medium text-cream-700">
                  Precio extra
                </th>
                <th className="text-center p-3 font-medium text-cream-700">Visible</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {extras.map((e) => (
                <tr key={e.id} className="border-t border-cream-50">
                  <td className="p-3 font-medium text-cream-900">{e.nombre}</td>
                  <td className="p-3 text-cream-700">{e.material?.nombre ?? '—'}</td>
                  <td className="p-3 text-right text-cream-700">
                    {Number(e.cantidad_usada).toFixed(3)} {e.material?.unidad_medida}
                  </td>
                  <td className="p-3 text-right font-semibold text-green-700">
                    {formatCOP(Number(e.precio_extra))}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => toggleActivo(e)}
                      className={`text-xs px-2 py-1 rounded border ${
                        e.activo
                          ? 'bg-green-50 border-green-300 text-green-800'
                          : 'bg-cream-100 border-cream-300 text-cream-600'
                      }`}
                    >
                      {e.activo ? 'Visible' : 'Oculto'}
                    </button>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => setEditando({ ...e, material_id: e.material_id })}
                      className="p-2 text-cream-600 hover:bg-cream-100 rounded-lg mr-1"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => eliminar(e.id, e.nombre)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
