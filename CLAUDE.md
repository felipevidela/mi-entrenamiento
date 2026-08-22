# Mi entrenamiento

App personal para registrar entrenamientos y peso. React + Vite, Firebase (acceso con
Google y Firestore) desde el cliente, desplegada como sitio estático en Vercel.

- Producción: https://mi-entrenamiento-fvm.vercel.app
- Repositorio: `felipevidela/mi-entrenamiento` (privado)
- Proyecto Firebase: `mi-entrenamiento-fv`
- Por qué está hecha así: `README-mi-entrenamiento.md` — Infraestructura: `DESPLIEGUE.md`

## Comandos

```bash
npm run dev                              # http://localhost:5173
npm run build
firebase deploy --only firestore:rules
```

## Despliegue

- **Cada push a `main` despliega a producción.** No ejecutes `vercel deploy`: duplica el
  despliegue sin pasar por el repositorio.
- **Las reglas de Firestore no viajan en el push.** Si tocas `firestore.rules`, publícalas
  con `firebase deploy --only firestore:rules` o la app seguirá con las reglas anteriores.
- Un dominio nuevo en Vercel no sirve hasta agregarlo a los dominios autorizados de Firebase
  Auth, en la consola. Sin eso el login falla con `auth/unauthorized-domain`.

## Modelo de datos

```
usuarios/{uid}                  { estaturaCm }
usuarios/{uid}/sesiones/{id}    { fecha, tipo, inicio, fin, comentario }
usuarios/{uid}/pesos/{fecha}    { kg, comentario }
```

- En pesos, **el id del documento es la fecha**: eso impone un peso por día sin código de
  deduplicación. Cambiar la fecha al editar significa borrar el documento anterior.
- `fecha` es el string `"YYYY-MM-DD"` construido con los componentes locales, nunca un
  `Date`: al serializarse se convierte a UTC y una sesión de las 21:00 vuelve como el día
  siguiente.
- Las horas son strings `"HH:MM"`. `duracion()` suma 24 h cuando el término es anterior al
  inicio, porque una sesión puede cruzar la medianoche y se atribuye al día en que empezó.

## Convenciones

- **Todo en español**: nombres de variables y funciones, textos de la interfaz y comentarios.
- **CSS**: un solo string en `App.jsx`, clases con prefijo `.en-`, colores como variables en
  `.en-root`. Sin CSS modules, sin Tailwind, sin archivos `.css`.
- **Sin librerías de UI ni de gráficos.** Los gráficos son `div` con altura porcentual o SVG
  escrito a mano. Una librería de charts pesaría más que la app y traería su propia escala
  de color, que compite con la codificación por actividad del calendario.
- `datos.js` tiene lo compartido (actividades, fechas, duración, rachas); `App.jsx` el acceso
  y el calendario; `Analisis.jsx` y `Peso.jsx` las otras dos pestañas.
- La configuración de Firebase va en claro en `src/firebase.js` **a propósito**: es pública
  por diseño, identifica al proyecto y no autoriza nada. La seguridad está en
  `firestore.rules` y en los dominios autorizados. No la muevas a variables de entorno
  creyendo que es un secreto.

## Verificación visual (obligatoria para cambios de interfaz)

Una sesión de agente no puede iniciar sesión con Google, así que las vistas autenticadas se
verifican montando una página temporal con datos de ejemplo:

1. Crear `prueba.html` y `src/prueba.jsx` que importen el componente y le pasen datos falsos.
2. Exportar temporalmente `CSS` de `App.jsx` y el componente interno que quieras montar.
3. `npm run dev` y capturar con `playwright-core` (está en la caché de npx; el screenshot por
   MCP da timeout con páginas largas).
4. **Borrar `prueba.html`, `src/prueba.jsx` y revertir los exports antes de commitear.**

Probar siempre **cero, uno y muchos** registros. El caso de un solo elemento ya se escapó una
vez: con un único peso no se dibujaba la curva ni se explicaba por qué, y la pantalla parecía
rota en vez de incompleta.

## Cuidado con

- No commitear `.playwright-mcp/` ni los archivos de prueba temporales.
- Con la caché persistente de Firestore, escribir sin señal **no falla**: la promesa queda
  pendiente y sincroniza después. No trates el `await addDoc` como confirmación de red ni
  bloquees la interfaz esperándolo.
- El estado vacío importa tanto como el lleno: cada vista debe decir qué falta para llenarse.
