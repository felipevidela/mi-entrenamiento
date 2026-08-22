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
usuarios/{uid}/pesos/{id}       { fecha, hora, kg, grasa, comentario }
```

- En pesos se admiten varias pesadas por día; la `hora` es lo que las distingue y las ordena.
  `grasa` es opcional y vale `null` cuando no se midió.
- Los documentos de peso antiguos usaban la fecha como id y no guardaban `fecha` ni `hora`.
  Al leerlos se toma la fecha del id y se asume medianoche — no los reescribas.
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

**Se verifica la app entera, con sesión iniciada, no componentes sueltos.** Montar un
componente aislado con datos falsos comprueba que ese componente dibuja; no comprueba que la
pantalla real llegue a mostrarlo. Esa diferencia ya dejó pasar un cambio dado por bueno que
el usuario no veía.

Para entrar sin la cuenta de Google real están los emuladores de Firebase:

```bash
firebase emulators:start --only auth,firestore --project mi-entrenamiento-fv
VITE_EMULADOR=1 npm run dev
```

`src/firebase.js` se conecta a los emuladores cuando `VITE_EMULADOR` está definida (Auth en
9099, Firestore en 8085 — el 8080 suele estar ocupado por Docker). Después, con
`playwright-core` (está en la caché de npx; el screenshot por MCP da timeout en páginas
largas): abrir la app, pulsar *Continuar con Google*, y en el popup del emulador ir por texto,
no por rol — *Add new account* → *Auto-generate user information* → *Sign in with Google.com*.
Desde ahí se recorre el flujo real: crear registros, capturar, leer la consola.

Probar siempre **cero, uno y muchos** registros. El caso de un solo elemento ya se escapó una
vez: con un único peso no se dibujaba la curva ni se explicaba por qué, y la pantalla parecía
rota en vez de incompleta.

Al terminar, matar emuladores y servidor, y no commitear `*-debug.log`.

## Cuidado con

- No commitear `.playwright-mcp/` ni los archivos de prueba temporales.
- Con la caché persistente de Firestore, escribir sin señal **no falla**: la promesa queda
  pendiente y sincroniza después. No trates el `await addDoc` como confirmación de red ni
  bloquees la interfaz esperándolo.
- El estado vacío importa tanto como el lleno: cada vista debe decir qué falta para llenarse.
