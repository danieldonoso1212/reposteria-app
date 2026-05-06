import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCOP, calcularPrecioReceta } from '../lib/utils'
import { Material, Receta } from '../types/database'

interface IngredienteEdicion {
  material_id: string
  cantidad: number | string
}

interface RecetaEdicion {
  id?: string
  nombre: string
  porciones: number | string
  margen_ganancia: number | string
  porcentaje_mano_obra: number | string
  visible_publico: boolean
  ingredientes: IngredienteEdicion[]
}

export function Recetas() {
  const [recetas, setRecetas] = useState<Receta[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [costosRecetas, setCostosRecetas] = useState<Record<string, number>>({})
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState<RecetaEdicion | null>(null)

  const cargar = async () => {
    setCargando(true)
    try {
      const [recRes, matRes, ingRes] = await Promise.all([
        supabase.from('recetas').select('*').order('nombre'),
        supabase.from('materiales').select('*').order('nombre'),
        supabase.from('ingredientes_receta').select('*'),
      ])
      const mats = matRes.data ?? []
      const recs = recRes.data ?? []
      const ings = ingRes.data ?? []

      // Calcular costo de materiales para cada receta
      const costos: Record<string, number> = {}
      for (const r of recs) {
        const ingredientesReceta = ings.filter((i) => i.receta_id === r.id)
        let costo = 0
        for (const ing of ingredientesReceta) {
          const mat = mats.find((m) => m.id === ing.material_id)
          if (mat) costo += Number(ing.cantidad) * Number(mat.precio_por_unidad)
        }
        costos[r.id] = costo
      }

      setRecetas(recs)
      setMateriales(mats)
      setCostosRecetas(costos)
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const nuevaReceta = () => {
    setEditando({
      nombre: '',
      porciones: 10,
      margen_ganancia: 50,
      porcentaje_mano_obra: 30,
      visible_publico: true,
      ingredientes: [],
    })
  }

  const editarReceta = async (r: Receta) => {
    const { data } = await supabase
      .from('ingredientes_receta')
      .select('material_id, cantidad')
      .eq('receta_id', r.id)

    setEditando({
      id: r.id,
      nombre: r.nombre,
      porciones: r.porciones,
      margen_ganancia: Number(r.margen_ganancia),
      porcentaje_mano_obra: Number(r.porcentaje_mano_obra),
      visible_publico: r.visible_publico,
      ingredientes:
        data?.map((i) => ({
          material_id: i.material_id,
          cantidad: Number(i.cantidad),
        })) ?? [],
    })
  }

  const agregarIngrediente = () => {
    if (!editando || materiales.length === 0) return
    setEditando({
      ...editando,
      ingredientes: [
        ...editando.ingredientes,
        { material_id: materiales[0].id, cantidad: 0 },
      ],
    })
  }

  const quitarIngrediente = (idx: number) => {
    if (!editando) return
    setEditando({
      ...editando,
      ingredientes: editando.ingredientes.filter((_, i) => i !== idx),
    })
  }

  const actualizarIngrediente = (
    idx: number,
    campo: 'material_id' | 'cantidad',
    valor: string
  ) => {
    if (!editando) return
    const nuevos = [...editando.ingredientes]
    nuevos[idx] = { ...nuevos[idx], [campo]: campo === 'cantidad' ? valor : valor }
    setEditando({ ...editando, ingredientes: nuevos })
  }

  // Cálculos en vivo mientras edita
  const costoMateriales =
    editando?.ingredientes.reduce((sum, ing) => {
      const mat = materiales.find((m) => m.id === ing.material_id)
      const cant = Number(ing.cantidad) || 0
      return sum + (mat ? cant * Number(mat.precio_por_unidad) : 0)
    }, 0) ?? 0

  const { manoObra, precioSugerido } = calcularPrecioReceta(
    costoMateriales,
    Number(editando?.porcentaje_mano_obra) || 0,
    Number(editando?.margen_ganancia) || 0
  )

  const guardar = async () => {
    if (!editando || !editando.nombre.trim()) {
      alert('La receta debe tener nombre')
      return
    }

    const datosReceta = {
      nombre: editando.nombre.trim(),
      porciones: Number(editando.porciones),
      margen_ganancia: Number(editando.margen_ganancia),
      porcentaje_mano_obra: Number(editando.porcentaje_mano_obra),
      precio_venta: precioSugerido,
      visible_publico: editando.visible_publico,
    }

    let recetaId = editando.id
    if (recetaId) {
      const { error } = await supabase
        .from('recetas')
        .update(datosReceta)
        .eq('id', recetaId)
      if (error) {
        alert('Error: ' + error.message)
        return
      }
    } else {
      const { data, error } = await supabase
        .from('recetas')
        .insert(datosReceta)
        .select('id')
        .single()
      if (error) {
        alert('Error: ' + error.message)
        return
      }
      recetaId = data.id
    }

    // Reemplazar ingredientes
    if (recetaId) {
      await supabase.from('ingredientes_receta').delete().eq('receta_id', recetaId)
      const ingValidos = editando.ingredientes.filter(
        (i) => i.material_id && Number(i.cantidad) > 0
      )
      if (ingValidos.length > 0) {
        await supabase.from('ingredientes_receta').insert(
          ingValidos.map((i) => ({
            receta_id: recetaId,
            material_id: i.material_id,
            cantidad: Number(i.cantidad),
          }))
        )
      }
    }

    setEditando(null)
    cargar()
  }

  const eliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return
    const { error } = await supabase.from('recetas').delete().eq('id', id)
    if (error) alert('Error: ' + error.message)
    else cargar()
  }

  const toggleVisible = async (r: Receta) => {
    await supabase
      .from('recetas')
      .update({ visible_publico: !r.visible_publico })
      .eq('id', r.id)
    cargar()
  }

  if (cargando) {
    return <div className="text-cream-600">Cargando...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-cream-900">Recetas y costos</h1>
          <p className="text-cream-600 mt-1 text-sm">
            Tortas y postres con cálculo automático de precio
          </p>
        </div>
        {!editando && (
          <button onClick={nuevaReceta} className="btn-primary">
            <Plus size={18} />
            Nueva receta
          </button>
        )}
      </div>

      {materiales.length === 0 && !editando && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-lg mb-4 text-sm">
          Antes de crear recetas debes tener al menos un material en la sección
          "Materiales".
        </div>
      )}

      {editando && (
        <div className="card p-6 mb-6">
          <h3 className="font-display text-xl text-wine-800 mb-4">
            {editando.id ? 'Editar receta' : 'Nueva receta'}
          </h3>

          <div className="grid md:grid-cols-4 gap-3 mb-4">
            <div className="md:col-span-1">
              <label className="label">Nombre</label>
              <input
                type="text"
                value={editando.nombre}
                onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                className="input"
                placeholder="Red velvet"
              />
            </div>
            <div>
              <label className="label">Porciones</label>
              <input
                type="number"
                min="1"
                value={editando.porciones}
                onChange={(e) =>
                  setEditando({ ...editando, porciones: e.target.value })
                }
                className="input"
              />
            </div>
            <div>
              <label className="label">Mano obra %</label>
              <input
                type="number"
                min="0"
                value={editando.porcentaje_mano_obra}
                onChange={(e) =>
                  setEditando({ ...editando, porcentaje_mano_obra: e.target.value })
                }
                className="input"
              />
            </div>
            <div>
              <label className="label">Margen ganancia %</label>
              <input
                type="number"
                min="0"
                value={editando.margen_ganancia}
                onChange={(e) =>
                  setEditando({ ...editando, margen_ganancia: e.target.value })
                }
                className="input"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm text-cream-700">
              <input
                type="checkbox"
                checked={editando.visible_publico}
                onChange={(e) =>
                  setEditando({ ...editando, visible_publico: e.target.checked })
                }
                className="w-4 h-4 accent-wine-700"
              />
              <span>Visible en el formulario público (clientes)</span>
            </label>
          </div>

          <div className="border-t border-cream-100 pt-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-display text-lg">Ingredientes</h4>
              <button
                onClick={agregarIngrediente}
                className="btn-secondary text-xs"
                disabled={materiales.length === 0}
              >
                <Plus size={14} />
                Agregar
              </button>
            </div>

            {editando.ingredientes.length === 0 ? (
              <p className="text-sm text-cream-500 italic">
                Agrega los materiales que componen esta receta
              </p>
            ) : (
              <div className="space-y-2">
                {editando.ingredientes.map((ing, idx) => {
                  const mat = materiales.find((m) => m.id === ing.material_id)
                  const cant = Number(ing.cantidad) || 0
                  const costo = mat ? cant * Number(mat.precio_por_unidad) : 0
                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center"
                    >
                      <select
                        className="input col-span-5"
                        value={ing.material_id}
                        onChange={(e) =>
                          actualizarIngrediente(idx, 'material_id', e.target.value)
                        }
                      >
                        {materiales.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nombre} ({m.unidad_medida})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        className="input col-span-3"
                        placeholder="Cantidad"
                        value={ing.cantidad}
                        onChange={(e) =>
                          actualizarIngrediente(idx, 'cantidad', e.target.value)
                        }
                      />
                      <div className="col-span-3 text-sm text-cream-600 text-right">
                        {formatCOP(costo)}
                      </div>
                      <button
                        onClick={() => quitarIngrediente(idx)}
                        className="col-span-1 p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Resumen de cálculo en vivo */}
          <div className="bg-cream-50 rounded-lg p-4 mb-4 grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-cream-500">Costo materiales</p>
              <p className="font-semibold text-cream-900">
                {formatCOP(costoMateriales)}
              </p>
            </div>
            <div>
              <p className="text-xs text-cream-500">
                + Mano obra ({Number(editando.porcentaje_mano_obra) || 0}%)
              </p>
              <p className="font-semibold text-cream-900">{formatCOP(manoObra)}</p>
            </div>
            <div>
              <p className="text-xs text-cream-500">Precio sugerido</p>
              <p className="font-semibold text-green-700">
                {formatCOP(precioSugerido)}
              </p>
            </div>
          </div>

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
        {recetas.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-cream-700 font-display text-xl mb-1">Sin recetas aún</p>
            <p className="text-cream-500 text-sm">Crea tu primera receta</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-cream-50 border-b border-cream-100">
              <tr>
                <th className="text-left p-3 font-medium text-cream-700">Receta</th>
                <th className="text-right p-3 font-medium text-cream-700">Porciones</th>
                <th className="text-right p-3 font-medium text-cream-700">
                  Costo materiales
                </th>
                <th className="text-right p-3 font-medium text-cream-700">
                  Precio sugerido
                </th>
                <th className="text-center p-3 font-medium text-cream-700">Público</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {recetas.map((r) => (
                <tr key={r.id} className="border-t border-cream-50">
                  <td className="p-3 font-medium text-cream-900">{r.nombre}</td>
                  <td className="p-3 text-right text-cream-700">{r.porciones}</td>
                  <td className="p-3 text-right text-cream-700">
                    {formatCOP(costosRecetas[r.id] ?? 0)}
                  </td>
                  <td className="p-3 text-right font-semibold text-green-700">
                    {r.precio_venta ? formatCOP(Number(r.precio_venta)) : '—'}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => toggleVisible(r)}
                      className={`text-xs px-2 py-1 rounded border inline-flex items-center gap-1 ${
                        r.visible_publico
                          ? 'bg-green-50 border-green-300 text-green-800'
                          : 'bg-cream-100 border-cream-300 text-cream-600'
                      }`}
                    >
                      {r.visible_publico ? <Eye size={12} /> : <EyeOff size={12} />}
                      {r.visible_publico ? 'Visible' : 'Oculta'}
                    </button>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => editarReceta(r)}
                      className="p-2 text-cream-600 hover:bg-cream-100 rounded-lg mr-1"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => eliminar(r.id, r.nombre)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Eliminar"
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
