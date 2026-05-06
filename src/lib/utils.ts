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

// Calcula el precio sugerido de una receta
// Fórmula: (costo_materiales + mano_obra) × (1 + margen/100)
// donde mano_obra = costo_materiales × (porcentaje_mano_obra / 100)
export function calcularPrecioReceta(
  costoMateriales: number,
  porcentajeManoObra: number,
  margenGanancia: number
): { manoObra: number; precioSugerido: number } {
  const manoObra = costoMateriales * (porcentajeManoObra / 100)
  const precioSugerido = (costoMateriales + manoObra) * (1 + margenGanancia / 100)
  return { manoObra, precioSugerido }
}

// URL de WhatsApp para mensajes directos
export function urlWhatsApp(telefono: string, mensaje?: string): string {
  const tel = telefono.replace(/\D/g, '')
  const params = mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''
  return `https://wa.me/${tel}${params}`
}
