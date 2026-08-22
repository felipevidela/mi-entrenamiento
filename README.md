# Mi entrenamiento

Registro de sesiones de entrenamiento sobre un calendario mensual, con una vista de análisis.
Cada día entrenado se pinta con el color de la actividad, para que el mes muestre de un vistazo
la constancia y los huecos.

**App:** https://mientrenamiento-rho.vercel.app

- **Por qué está hecha así:** [README-mi-entrenamiento.md](README-mi-entrenamiento.md)
- **Cómo se despliega:** [DESPLIEGUE.md](DESPLIEGUE.md)

## Stack

React con Vite, Firebase (acceso con Google y Firestore con caché persistente) y despliegue
estático en Vercel desde este repositorio. Instalable como PWA.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

Cada push a `main` despliega a producción.
