import { supabase } from './supabase'

export function formatCOP(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor)
}

export function formatFecha(fecha: string | Date): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

export function calcularPrecioReceta(
  costoMateriales: number,
  porcentajeManoObra: number,
  margenGanancia: number
): { manoObra: number; precioSugerido: number } {
  const manoObra = costoMateriales * (porcentajeManoObra / 100)
  const precioSugerido = (costoMateriales + manoObra) * (1 + margenGanancia / 100)
  return { manoObra, precioSugerido }
}

export function urlWhatsApp(telefono: string, mensaje?: string): string {
  const tel = telefono.replace(/\D/g, '')
  const params = mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''
  return `https://wa.me/${tel}${params}`
}

// =====================================================================
// CALLMEBOT
// =====================================================================

export async function enviarWhatsAppACallMeBot(mensaje: string): Promise<void> {
  const telefono = import.meta.env.VITE_CALLMEBOT_PHONE
  const apiKey = import.meta.env.VITE_CALLMEBOT_APIKEY

  if (!telefono || !apiKey) {
    console.log('[CallMeBot] No configurado, mensaje omitido')
    return
  }

  const tel = telefono.replace(/\D/g, '')
  const url = `https://api.callmebot.com/whatsapp.php?phone=${tel}&text=${encodeURIComponent(mensaje)}&apikey=${apiKey}`

  try {
    await fetch(url, { method: 'GET', mode: 'no-cors' })
    console.log('[CallMeBot] Mensaje enviado')
  } catch (error) {
    console.error('[CallMeBot] Error:', error)
  }
}

// =====================================================================
// GESTIÓN DE STOCK
// =====================================================================

interface AlertaStock {
  nombre: string
  quedaActual: number
  stockMinimo: number
  unidad: string
}

// Descuenta el stock de materiales para un pedido completo
// Retorna las alertas de stock bajo si las hay
export async function descontarStockPedido(pedidoId: string): Promise<AlertaStock[]> {
  // 1. Obtener los productos del pedido
  const { data: productos } = await supabase
    .from('productos_pedido')
    .select('receta_id, extras_ids')
    .eq('pedido_id', pedidoId)

  if (!productos || productos.length === 0) return []

  // 2. Recopilar todos los ingredientes necesarios
  const consumos: Record<string, number> = {} // material_id -> cantidad total

  for (const prod of productos) {
    // Ingredientes de la receta
    const { data: ingredientes } = await supabase
      .from('ingredientes_receta')
      .select('material_id, cantidad')
      .eq('receta_id', prod.receta_id)

    if (ingredientes) {
      for (const ing of ingredientes) {
        const matId = ing.material_id
        consumos[matId] = (consumos[matId] || 0) + Number(ing.cantidad)
      }
    }

    // Extras (cada extra consume cierta cantidad de un material)
    if (prod.extras_ids && prod.extras_ids.length > 0) {
      const { data: extras } = await supabase
        .from('extras')
        .select('material_id, cantidad_usada')
        .in('id', prod.extras_ids)

      if (extras) {
        for (const ext of extras) {
          const matId = ext.material_id
          consumos[matId] = (consumos[matId] || 0) + Number(ext.cantidad_usada)
        }
      }
    }
  }

  // 3. Descontar stock y verificar alertas
  const alertas: AlertaStock[] = []
  const materialIds = Object.keys(consumos)

  if (materialIds.length === 0) return []

  const { data: materiales } = await supabase
    .from('materiales')
    .select('id, nombre, cantidad_stock, stock_minimo, unidad_medida')
    .in('id', materialIds)

  if (!materiales) return []

  for (const mat of materiales) {
    const cantidadUsar = consumos[mat.id] || 0
    const nuevoStock = Number(mat.cantidad_stock) - cantidadUsar

    // Actualizar stock
    await supabase
      .from('materiales')
      .update({ cantidad_stock: nuevoStock })
      .eq('id', mat.id)

    // Verificar si quedó bajo el mínimo
    if (nuevoStock < Number(mat.stock_minimo)) {
      alertas.push({
        nombre: mat.nombre,
        quedaActual: nuevoStock,
        stockMinimo: Number(mat.stock_minimo),
        unidad: mat.unidad_medida,
      })
    }
  }

  // 4. Marcar pedido como stock descontado
  await supabase
    .from('pedidos')
    .update({ stock_descontado: true })
    .eq('id', pedidoId)

  return alertas
}

// Devuelve el stock de un pedido cancelado
export async function devolverStockPedido(pedidoId: string): Promise<void> {
  const { data: productos } = await supabase
    .from('productos_pedido')
    .select('receta_id, extras_ids')
    .eq('pedido_id', pedidoId)

  if (!productos || productos.length === 0) return

  const consumos: Record<string, number> = {}

  for (const prod of productos) {
    const { data: ingredientes } = await supabase
      .from('ingredientes_receta')
      .select('material_id, cantidad')
      .eq('receta_id', prod.receta_id)

    if (ingredientes) {
      for (const ing of ingredientes) {
        consumos[ing.material_id] = (consumos[ing.material_id] || 0) + Number(ing.cantidad)
      }
    }

    if (prod.extras_ids && prod.extras_ids.length > 0) {
      const { data: extras } = await supabase
        .from('extras')
        .select('material_id, cantidad_usada')
        .in('id', prod.extras_ids)

      if (extras) {
        for (const ext of extras) {
          consumos[ext.material_id] = (consumos[ext.material_id] || 0) + Number(ext.cantidad_usada)
        }
      }
    }
  }

  const materialIds = Object.keys(consumos)
  if (materialIds.length === 0) return

  const { data: materiales } = await supabase
    .from('materiales')
    .select('id, cantidad_stock')
    .in('id', materialIds)

  if (!materiales) return

  for (const mat of materiales) {
    const cantidadDevolver = consumos[mat.id] || 0
    await supabase
      .from('materiales')
      .update({ cantidad_stock: Number(mat.cantidad_stock) + cantidadDevolver })
      .eq('id', mat.id)
  }

  await supabase
    .from('pedidos')
    .update({ stock_descontado: false })
    .eq('id', pedidoId)
}
