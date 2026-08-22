# Despliegue

App en producción: **https://mientrenamiento-rho.vercel.app**
Proyecto Firebase: `mi-entrenamiento-fv` — https://console.firebase.google.com/project/mi-entrenamiento-fv

La instalación en Firebase está completa: base Firestore creada, reglas publicadas,
acceso con Google habilitado y el dominio de Vercel autorizado.

## Configuración inicial (ya hecha, queda registrada por si se rehace el proyecto)

1. **Crear la base de datos Firestore**
   https://console.firebase.google.com/project/mi-entrenamiento-fv/firestore
   → *Crear base de datos* → modo producción → ubicación `nam5` (o la que prefieras).

2. **Activar el acceso con Google**
   https://console.firebase.google.com/project/mi-entrenamiento-fv/authentication/providers
   → *Google* → habilitar → correo de soporte: fvidelam@gmail.com → guardar.

3. **Autorizar el dominio de Vercel**
   https://console.firebase.google.com/project/mi-entrenamiento-fv/authentication/settings
   → *Dominios autorizados* → agregar:
   - `mientrenamiento-rho.vercel.app`
   - `mientrenamiento-felipes-projects-882d8aa3.vercel.app`

Después del paso 1, publicar las reglas de seguridad:

```bash
firebase deploy --only firestore:rules
```

El alias secundario `mientrenamiento-felipes-projects-882d8aa3.vercel.app` no está autorizado:
entrar por esa URL daría `auth/unauthorized-domain`. Agrégalo si lo vas a usar.

## PWA

La app es instalable: `vite-plugin-pwa` genera `manifest.webmanifest` y un service worker
que precachea el bundle. En el celular, "Agregar a pantalla de inicio" la deja como ícono
y la abre sin barra de navegador. El service worker se actualiza solo (`registerType: autoUpdate`).

Los íconos de `public/` se generaron por script; para rehacerlos, cualquier PNG cuadrado
de 192, 512 y 180 px sirve.

## Comandos

```bash
npm run dev                 # desarrollo local en http://localhost:5173
npm run build               # compila a dist/
vercel deploy --prod        # publica a producción
firebase deploy --only firestore:rules
```

Para desarrollo local, agrega `localhost` a los dominios autorizados de Firebase Auth
(viene autorizado por defecto en proyectos nuevos).

## Modelo de datos

```
usuarios/{uid}/sesiones/{id}
  { fecha: "2026-08-21", tipo: "correr_ciudad", inicio: "07:30", fin: "08:15", comentario: "" }
```

El `id` lo asigna Firestore; el resto del esquema es el mismo del README original.
Las reglas (`firestore.rules`) permiten leer y escribir solo bajo el propio `uid`.

## Sobre la configuración de Firebase en el código

`src/firebase.js` tiene la config web en claro. Es pública por diseño: identifica al
proyecto y no autoriza nada. El control de acceso está en `firestore.rules` y en la lista
de dominios autorizados, no en la clave.
