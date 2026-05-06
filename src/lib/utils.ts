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

// Calcula precio sugerido: (costo + mano_obra) × (1 + margen/100)
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
// CALLMEBOT: notificaciones automáticas a tu WhatsApp
// =====================================================================
// Las credenciales se leen de variables de entorno:
//   - VITE_CALLMEBOT_PHONE: tu número (ej: +573001234567)
//   - VITE_CALLMEBOT_APIKEY: tu API key (los 7 dígitos que CallMeBot te envió)
// Si no están configuradas, las funciones simplemente no hacen nada.

export async function enviarWhatsAppACallMeBot(mensaje: string): Promise<void> {
  const telefono = import.meta.env.VITE_CALLMEBOT_PHONE
  const apiKey = import.meta.env.VITE_CALLMEBOT_APIKEY

  if (!telefono || !apiKey) {
    console.log('[CallMeBot] No configurado, mensaje omitido:', mensaje)
    return
  }

  const tel = telefono.replace(/\D/g, '')
  const url = `https://api.callmebot.com/whatsapp.php?phone=${tel}&text=${encodeURIComponent(
    mensaje
  )}&apikey=${apiKey}`

  try {
    // mode: 'no-cors' porque CallMeBot no envía headers CORS,
    // pero igual hace la petición exitosamente
    await fetch(url, { method: 'GET', mode: 'no-cors' })
    console.log('[CallMeBot] Mensaje enviado')
  } catch (error) {
    console.error('[CallMeBot] Error:', error)
  }
}

// Enviar mensaje a CUALQUIER número (para notificar a clientes)
export async function enviarWhatsAppACliente(
  telefonoCliente: string,
  mensaje: string
): Promise<void> {
  const apiKey = import.meta.env.VITE_CALLMEBOT_APIKEY

  if (!apiKey) {
    console.log('[CallMeBot] No configurado para clientes')
    return
  }

  const tel = telefonoCliente.replace(/\D/g, '')
  // Asegurarse de incluir código de país si no lo tiene (asumimos Colombia +57)
  const telConCodigo = tel.startsWith('57') ? tel : `57${tel}`
  
  const url = `https://api.callmebot.com/whatsapp.php?phone=${telConCodigo}&text=${encodeURIComponent(
    mensaje
  )}&apikey=${apiKey}`

  try {
    await fetch(url, { method: 'GET', mode: 'no-cors' })
    console.log('[CallMeBot] Mensaje enviado a cliente')
  } catch (error) {
    console.error('[CallMeBot] Error enviando a cliente:', error)
  }
}
