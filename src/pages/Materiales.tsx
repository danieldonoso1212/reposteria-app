import { FormEvent, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCOP } from '../lib/utils'
import { Material, UnidadMedida } from '../types/database'

const UNIDADES: { valor: UnidadMedida; etiqueta: string; abrev: string }[] = [
  { valor: 'gramo', etiqueta: 'Gramos', abrev: 'g' },
  { valor: 'kilo', etiqueta: 'Kilos', abrev: 'kg' },
  { valor: 'mililitro', etiqueta: 'Mililitros', abrev: 'ml' },
  { valor: 'litro', etiqueta: 'Litros', abrev: 'L' },
  { valor: 'unidad', etiqueta: 'Unidades', abrev: 'u' },
  { valor: 'libra', etiqueta: 'Libras', abrev: 'lb' },
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
    const { data } = await supabase
      .from('materiales')
      .select('*')
      .order('nombre')
    setMateriales(data ?? [])
    setLoading(false)
  }

  const eliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return
    const { error } = await supabase.from('materiales').delete().eq('id', id)
    if (error) alert('Error: ' + error.message)
    else cargar()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-cream-900">Materiales</h1>
          <p className="text-cream-600 mt-1 text-sm">Insumos para tus recetas</p>
        </div>
        <button
          onClick={() => {
            setEditando(null)
            setModalAbierto(true)
          }}
          className="btn-primary"
        >
          <Plus size={18} />
          Nuevo material
        </button>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-cream-600">Cargando...</div>
        ) : materiales.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-cream-700 font-display text-xl mb-2">Sin materiales aún</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-cream-50 border-b border-cream-100">
              <tr>
                <th className="text-left p-3 font-medium text-cream-700">Nombre</th>
                <th className="text-left p-3 font-medium text-cream-700">Unidad</th>
                <th className="text-right p-3 font-medium text-cream-700">Precio/unidad</th>
                <th className="text-right p-3 font-medium text-cream-700">Stock</th>
                <th className="text-right p-3 font-medium text-cream-700">Mínimo</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {materiales.map((m) => {
                const u = UNIDADES.find((u) => u.valor === m.unidad_medida)
                const stockBajo =
                  Number(m.stock_minimo) > 0 &&
                  Number(m.cantidad_stock) <= Number(m.stock_minimo)
                return (
                  <tr key={m.id} className="border-b border-cream-50 last:border-0">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {stockBajo && (
                          <AlertTriangle
                            className="text-amber-600"
                            size={16}
                          />
                        )}
                        <p className="font-medium text-cream-900">{m.nombre}</p>
                      </div>
                      {m.proveedor && (
                        <p className="text-xs text-cream-500 ml-6">{m.proveedor}</p>
                      )}
                    </td>
                    <td className="p-3 text-cream-700">{u?.etiqueta}</td>
                    <td className="p-3 text-right text-cream-700">
                      {formatCOP(Number(m.precio_por_unidad))} / {u?.abrev}
                    </td>
                    <td className={`p-3 text-right ${stockBajo ? 'text-amber-700 font-semibold' : 'text-cream-700'}`}>
                      {Number(m.cantidad_stock).toLocaleString('es-CO')}
                    </td>
                    <td className="p-3 text-right text-cream-500 text-xs">
                      {Number(m.stock_minimo) > 0
                        ? Number(m.stock_minimo).toLocaleString('es-CO')
                        : '—'}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setEditando(m)
                          setModalAbierto(true)
                        }}
                        className="p-2 text-cream-600 hover:bg-cream-100 rounded-lg mr-1"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => eliminar(m.id, m.nombre)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
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
  const [precioEmpaque, setPrecioEmpaque] = useState(
    material ? material.precio_por_unidad.toString() : ''
  )
  const [cantidadEmpaque, setCantidadEmpaque] = useState(material ? '1' : '')
  const [stock, setStock] = useState(material?.cantidad_stock?.toString() ?? '0')
  const [stockMinimo, setStockMinimo] = useState(
    material?.stock_minimo?.toString() ?? '0'
  )
  const [proveedor, setProveedor] = useState(material?.proveedor ?? '')
  const [notas, setNotas] = useState(material?.notas ?? '')
  const [guardando, setGuardando] = useState(false)

  const precioNum = Number(precioEmpaque) || 0
  const cantidadNum = Number(cantidadEmpaque) || 0
  const precioPorUnidad = cantidadNum > 0 ? precioNum / cantidadNum : 0
  const unidadInfo = UNIDADES.find((u) => u.valor === unidad)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (cantidadNum <= 0) {
      alert('La cantidad del empaque debe ser mayor a 0')
      return
    }
    setGuardando(true)
    const datos = {
      nombre: nombre.trim(),
      unidad_medida: unidad,
      precio_por_unidad: precioPorUnidad,
      cantidad_stock: Number(stock),
      stock_minimo: Number(stockMinimo),
      proveedor: proveedor.trim() || null,
      notas: notas.trim() || null,
    }
    const { error } = material
      ? await supabase.from('materiales').update(datos).eq('id', material.id)
      : await supabase.from('materiales').insert(datos)
    setGuardando(false)
    if (error) alert('Error: ' + error.message)
    else onGuardado()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-cream-100 sticky top-0 bg-white">
          <h2 className="font-display text-xl sm:text-2xl text-wine-800">
            {material ? 'Editar material' : 'Nuevo material'}
          </h2>
          <button onClick={onCerrar} className="p-2 text-cream-600 hover:bg-cream-100 rounded-lg">
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

          <div>
            <label className="label">¿En qué unidad lo usas en las recetas? *</label>
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

          <div className="bg-cream-50 border border-cream-200 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-cream-800">
              💰 ¿Cuánto te costó el empaque?
            </p>

            <div>
              <label className="label">Precio total que pagaste (COP) *</label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={precioEmpaque}
                onChange={(e) => setPrecioEmpaque(e.target.value)}
                className="input"
                placeholder="Ej: 10000"
              />
            </div>

            <div>
              <label className="label">
                ¿Cuántos {unidadInfo?.etiqueta.toLowerCase()} trae el empaque? *
              </label>
              <input
                type="number"
                required
                min="0.001"
                step="any"
                value={cantidadEmpaque}
                onChange={(e) => setCantidadEmpaque(e.target.value)}
                className="input"
                placeholder={
                  unidad === 'gramo'
                    ? 'Ej: 1000 (si la bolsa es de 1 kilo)'
                    : unidad === 'mililitro'
                    ? 'Ej: 1000 (si es 1 litro)'
                    : unidad === 'unidad'
                    ? 'Ej: 30 (si la cubeta trae 30 huevos)'
                    : 'Cantidad total'
                }
              />
            </div>

            {precioPorUnidad > 0 && (
              <div className="pt-3 border-t border-cream-200">
                <p className="text-xs text-cream-600">Cada {unidadInfo?.abrev} cuesta:</p>
                <p className="text-2xl font-display text-green-700">
                  {formatCOP(precioPorUnidad)}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Stock actual ({unidadInfo?.abrev})</label>
              <input
                type="number"
                min="0"
                step="any"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Stock mínimo ({unidadInfo?.abrev})</label>
              <input
                type="number"
                min="0"
                step="any"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
                className="input"
                placeholder="0 = sin alerta"
              />
            </div>
          </div>
          <p className="text-xs text-cream-500 -mt-2">
            Cuando el stock baje de este valor, recibirás aviso por WhatsApp
          </p>

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
              className="input min-h-[60px]"
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
