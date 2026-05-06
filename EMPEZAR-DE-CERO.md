# EMPEZAR DE CERO - Pasos para repo limpio

Vamos a hacer 3 cosas en orden. Tiempo total: **20 minutos**.

⚠️ **Importante**: NO borres tu proyecto de Supabase, solo limpiamos sus tablas.
Tu URL y claves siguen siendo las mismas.

---

## PARTE 1: Limpiar la base de datos (5 min)

1. Entra a Supabase → tu proyecto → **SQL Editor** → **+ New query**.

2. Abre el archivo **`supabase/schema-limpio.sql`** del zip.

3. Copia **TODO** el contenido y pégalo en el editor.

4. Haz clic en **Run** (o Ctrl+Enter).

5. Espera a que diga **"Success. No rows returned"**.

✅ Tu base de datos queda con todas las tablas correctas y limpias.

⚠️ Esto **borra** los materiales que tenías de prueba. Cuando esté todo
funcionando vuelves a crearlos. Son solo 2 minutos volver a agregarlos.

---

## PARTE 2: Borrar el repositorio viejo y crear uno nuevo (5 min)

### 2.1 Borrar el repo viejo

1. Entra a https://github.com/danieldonoso1212/reposteria-app
2. Clic en **Settings** (pestaña, no el engranaje del costado).
3. Baja hasta el final de la página → sección **Danger Zone**.
4. Clic en **Delete this repository**.
5. Te pedirá escribir el nombre del repo para confirmar:
   `danieldonoso1212/reposteria-app`
6. Confirma con el botón rojo.

### 2.2 Crear repo nuevo (con el mismo nombre)

1. Ve a https://github.com/new
2. Repository name: **`reposteria-app`** (igual que antes para no cambiar URLs)
3. Marca **Public**
4. **NO** marques ninguna de las casillas (README, .gitignore, license).
5. Clic en **Create repository**.

---

## PARTE 3: Subir el código limpio (10 min)

### 3.1 Descomprime el zip

1. Descomprime `dulzuras-jm-limpio.zip` en tu computador.
2. Te queda una carpeta llamada `dulzuras-jm` con todos los archivos.

### 3.2 Subir TODO de una sola vez (lo más importante)

En el repo nuevo que acabas de crear, GitHub te muestra una página vacía
con instrucciones. Buscas el enlace que dice **"uploading an existing file"**.

1. Clic en **"uploading an existing file"**.
2. Se abre una página con un área para arrastrar archivos.
3. Abre la carpeta `dulzuras-jm` en tu computador.
4. **Selecciona TODO el contenido** de la carpeta (Ctrl+A) — los archivos
   sueltos Y todas las subcarpetas.
5. Arrástralos al área de subida de GitHub.
   - GitHub cargará todos los archivos manteniendo la estructura de carpetas.
   - Verás una lista larga con todos los archivos.
6. Abajo, en **"Commit changes"**, escribe: `Versión inicial`
7. Clic en **Commit changes** (botón verde).

⚠️ Si GitHub te dice que algunos archivos son muy grandes o que no se
permite subir carpetas, mejor descarga e instala **GitHub Desktop**:
https://desktop.github.com (en ese caso, escríbeme y te guío).

### 3.3 Configurar los secretos (las credenciales de Supabase)

1. En tu repo, ve a **Settings** → **Secrets and variables** → **Actions**.
2. Clic en **New repository secret**.
3. Crea el primer secreto:
   - Name: `VITE_SUPABASE_URL`
   - Secret: `https://mnecbptqyyseeppfqqox.supabase.co`
   - Add secret.
4. Crea el segundo secreto:
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Secret: tu anon key larga (la misma que ya usaste antes)
   - Add secret.

### 3.4 Activar GitHub Pages

1. **Settings** → **Pages**.
2. En **Source**, selecciona **GitHub Actions**.
3. Listo, no más configuración aquí.

### 3.5 Disparar el despliegue

1. Ve a la pestaña **Actions**.
2. En la barra lateral izquierda, clic en **Deploy a GitHub Pages**.
3. Si ya hay un workflow corriendo (porque el push del paso 3.2 lo disparó),
   espera a que termine.
4. Si no, clic en **Run workflow** → **Run workflow** (botón verde).
5. Espera 2-3 minutos.

### 3.6 Probar

Cuando el workflow termine con marca verde ✓:

**URL pública (clientes piden tortas):**
```
https://danieldonoso1212.github.io/reposteria-app/
```

**URL admin:**
```
https://danieldonoso1212.github.io/reposteria-app/login
```

Inicia sesión con el usuario que ya tenías en Supabase (no se borró).

Ve a **Materiales** y crea uno de prueba. Luego **Recetas** y crea una
con ingredientes. Esta vez SÍ debe guardar sin errores.

---

## Si en algún paso te atoras

Mándame captura del error específico. Pero esta vez **debería funcionar**
porque:

✅ Base de datos limpia con todas las columnas correctas desde el inicio.
✅ Repo limpio sin archivos viejos mezclados.
✅ Todos los archivos cargados en una sola subida (no por partes).
✅ Solución del 404 ya integrada (no necesitas pasos extra).

---

## En orden, los 3 pasos críticos

1. ⬜ Ejecuté `schema-limpio.sql` en Supabase y dice "Success"
2. ⬜ Borré el repo viejo y creé el repo nuevo con el zip cargado completo
3. ⬜ Configuré los 2 secretos en GitHub Actions y GitHub Pages está en
       modo "GitHub Actions"

Si los 3 están listos, el sitio debería funcionar perfectamente.
