export type UnidadMedida = 'gramo' | 'kilo' | 'mililitro' | 'litro' | 'unidad' | 'libra'

export type EstadoPedido = 'pendiente' | 'en_proceso' | 'listo' | 'entregado' | 'cancelado'

export interface Material {
  id: string
  nombre: string
  unidad_medida: UnidadMedida
  precio_por_unidad: number
  cantidad_stock: number
  stock_minimo: number
  proveedor: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface Receta {
  id: string
  nombre: string
  descripcion: string | null
  porciones: number
  margen_ganancia: number
  porcentaje_mano_obra: number
  precio_venta: number | null
  imagen_url: string | null
  visible_publico: boolean
  created_at: string
  updated_at: string
}

export interface IngredienteReceta {
  id: string
  receta_id: string
  material_id: string
  cantidad: number
  material?: Material
}

export interface Extra {
  id: string
  nombre: string
  material_id: string
  cantidad_usada: number
  precio_extra: number
  activo: boolean
  material?: Material
}

export interface Cliente {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
  direccion: string | null
  notas: string | null
  created_at: string
}

export interface ProductoPedido {
  id: string
  pedido_id: string
  receta_id: string
  extras_ids: string[] | null
  notas: string | null
  precio_unitario: number
  precio_extras: number
  receta?: Receta
}

export interface Pedido {
  id: string
  cliente_id: string | null
  receta_id: string | null
  cantidad: number
  precio_total: number
  estado: EstadoPedido
  fecha_entrega: string
  notas: string | null
  pagado: boolean
  stock_descontado: boolean
  nombre_cliente_publico: string | null
  whatsapp_publico: string | null
  dependencia: string | null
  extras_ids: string[] | null
  created_at: string
  cliente?: Cliente
  receta?: Receta
  productos_pedido?: ProductoPedido[]
}
