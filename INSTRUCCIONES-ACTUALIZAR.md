# Cómo actualizar tu app existente

Como ya tienes la app desplegada y funcionando, estos son los pasos para
actualizarla con todas las funciones nuevas:

- ✅ Formulario público en la página inicial (sin login)
- ✅ Logo Dulzuras JM
- ✅ Editor de recetas con cálculo en vivo (mano de obra % + margen %)
- ✅ Sección de Extras
- ✅ Login movido a `/login` y panel admin a `/admin/...`

Tiempo total: **15-20 minutos**.

---

## Paso 1: Actualizar la base de datos (Supabase)

Las tablas existentes se actualizan **sin perder datos** (los materiales, recetas y
clientes que ya tengas se conservan).

1. Abre Supabase → tu proyecto → **SQL Editor** → **New query**.
2. Abre el archivo `supabase/schema.sql` de este zip.
3. Copia **todo** y pégalo en el editor de Supabase.
4. Haz clic en **Run** (o `Ctrl+Enter`).
5. Espera el mensaje verde "Success".

Si te sale algún error rojo, mándame la captura. Si dice que algo "ya existe", está bien, ese error es porque las tablas ya estaban; el script está hecho para tolerar eso.

---

## Paso 2: Subir el código nuevo a GitHub

Tienes **dos opciones**: usar la web de GitHub (más simple) o tu computador.

### Opción A: Desde la web de GitHub (recomendada si no usas Git en tu PC)

1. **Descomprime el zip** en una carpeta de tu computador.

2. **Sube el logo** primero:
   - En tu repositorio en GitHub, navega a la carpeta `public/`.
   - Haz clic en **Add file → Upload files**.
   - Arrastra el archivo `public/logo.jpeg` desde tu computador.
   - Abajo escribe un mensaje como "Agregar logo" y haz clic en **Commit changes**.

3. **Sube los archivos de código** uno por uno o en grupos:
   
   Lo más rápido es subir las carpetas en lotes. Para cada archivo modificado:
   - Navega al archivo en GitHub (por ejemplo `src/App.tsx`).
   - Haz clic en el lápiz ✏️ para editar.
   - Borra el contenido completo.
   - Copia y pega el contenido del archivo nuevo.
   - Baja → **Commit changes**.

   Los archivos a actualizar/crear son estos (todos están en el zip):
   
   **Crear nuevos:**
   - `public/logo.jpeg`
   - `src/pages/FormularioPublico.tsx`
   - `src/pages/Extras.tsx`
   
   **Reemplazar contenido:**
   - `index.html`
   - `tailwind.config.js`
   - `src/index.css`
   - `src/App.tsx`
   - `src/components/Layout.tsx`
   - `src/pages/Login.tsx`
   - `src/pages/Dashboard.tsx`
   - `src/pages/Recetas.tsx`
   - `src/pages/Pedidos.tsx`
   - `src/lib/utils.ts`
   - `src/types/database.ts`

### Opción B: Desde tu computador con Git

Si tienes Git instalado:

```bash
# 1. Clonar el repo (si aún no lo tienes localmente)
git clone https://github.com/danieldonoso1212/reposteria-app.git
cd reposteria-app

# 2. Reemplazar los archivos con los del zip nuevo
# (copia manualmente desde el zip al repo, manteniendo la estructura)

# 3. Subir cambios
git add .
git commit -m "Actualizar a versión completa con formulario público"
git push
```

---

## Paso 3: Esperar el despliegue automático

1. Después del último commit, ve a la pestaña **Actions** en GitHub.
2. Verás un workflow corriendo. Espera 2-3 minutos.
3. Cuando termine con marca verde ✓, abre tu app.

---

## Paso 4: Probar

Tu app ahora tiene **dos URLs**:

### URL principal (formulario público para clientes)
```
https://danieldonoso1212.github.io/reposteria-app/
```
Aquí los clientes verán el logo y harán pedidos.

### URL del panel administrativo
```
https://danieldonoso1212.github.io/reposteria-app/login
```
Aquí inicias sesión tú, y luego accedes al panel en:
```
https://danieldonoso1212.github.io/reposteria-app/admin
```

---

## Cosas a probar para verificar que todo funciona

1. **Sin login**, abre la URL principal → debe verse el formulario con el logo.
2. **Inicia sesión** en `/login` → te lleva al panel admin.
3. En el admin, ve a **Materiales** → agrega 3-4 materiales (harina, azúcar, huevos...).
4. Ve a **Recetas** → crea una receta:
   - Llena nombre, porciones, mano de obra %, margen %.
   - Agrega ingredientes.
   - **Verás el cálculo actualizándose en vivo** en la parte de abajo (Costo materiales / Mano de obra / Precio sugerido).
   - Marca "Visible en formulario público".
   - Guarda.
5. Ve a **Extras** → crea un extra (ej: "Fresas", precio extra $3.000).
6. Abre la URL principal en otra pestaña (modo incógnito) → deberías ver tu receta y el extra.
7. Llena el formulario y envía un pedido de prueba.
8. Vuelve al admin → **Pedidos** → debe aparecer el pedido nuevo con todos los datos.

---

## Solución de problemas

**"No veo recetas en el formulario público"**
- Verifica que la receta tenga `visible_publico = true` (en el admin marca la casilla).
- Verifica que la receta tenga un `precio_venta` calculado (debes haber agregado ingredientes y guardado).

**"El formulario público dice 'cargando' indefinidamente"**
- Probablemente el `schema.sql` no se ejecutó completo. Vuelve a ejecutarlo.
- Revisa la consola del navegador (F12) por errores específicos.

**"Error al enviar pedido"**
- Verifica que las políticas RLS para `clientes` y `pedidos` permiten al rol `anon` (no autenticado) hacer INSERT. Eso lo configura el `schema.sql` automáticamente.

**"Todo se ve igual que antes"**
- Espera 2-3 minutos después del último commit.
- Refresca con `Ctrl+Shift+R` (hard reload) para forzar recarga sin caché.
- Verifica en Actions que el último workflow terminó con ✓.

---

## Si algo no funciona

Mándame:
1. La captura de la pantalla con el problema.
2. La consola del navegador abierta (F12 → pestaña Console).
3. Lo que estabas haciendo cuando ocurrió.

Y lo resolvemos rápido.
