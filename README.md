# Dulzuras JM - Sistema de pedidos y gestión

Sistema con dos partes:

- **Formulario público** (`/`): tus clientes piden tortas sin necesidad de cuenta
- **Panel admin** (`/admin`, requiere login): tú gestionas materiales, recetas, extras y pedidos

## Stack

- **Frontend**: React + TypeScript + Vite + Tailwind
- **Backend**: Supabase (PostgreSQL + Auth)
- **Hospedaje**: GitHub Pages (gratis)

## Estructura del proyecto

```
src/
├── pages/
│   ├── FormularioPublico.tsx   ← Página principal (clientes)
│   ├── Login.tsx               ← /login
│   ├── Dashboard.tsx           ← /admin
│   ├── Materiales.tsx          ← /admin/materiales
│   ├── Recetas.tsx             ← /admin/recetas (con cálculo en vivo)
│   ├── Extras.tsx              ← /admin/extras
│   ├── Pedidos.tsx             ← /admin/pedidos
│   └── Clientes.tsx            ← /admin/clientes
├── components/
│   ├── Layout.tsx              ← Sidebar del admin
│   └── ProtectedRoute.tsx      ← Protección de rutas
└── ...

supabase/
└── schema.sql                  ← Estructura de la BD (incluye Extras)

public/
└── logo.jpeg                   ← Logo Dulzuras JM
```

## Para actualizar tu instalación existente

1. Reemplaza los archivos del proyecto con los de este zip.
2. **Ejecuta el `schema.sql` actualizado** en Supabase (tiene migraciones que actualizan tus tablas sin perder datos).
3. Sube los cambios a GitHub.
4. GitHub Actions despliega automáticamente.

Mira `INSTRUCCIONES-ACTUALIZAR.md` para los pasos detallados.
