# Mi entrenamiento

Aplicación web para registrar sesiones de entrenamiento y peso corporal, ver las sesiones sobre un calendario mensual y revisar cómo se reparten en el tiempo.

---

## 1. Objetivo

Un registro de entrenamientos tiene dos funciones que suelen confundirse:

1. **Almacenar** lo que se hizo (fecha, actividad, horario, comentario).
2. **Devolver una señal** que sostenga la constancia.

La mayoría de las apps resuelven bien la primera y mal la segunda: guardan las sesiones en una lista cronológica donde cada registro empuja al anterior hacia abajo. El resultado es que el esfuerzo acumulado deja de verse. Una lista de veinte filas no comunica nada distinto que una de tres.

Esta app usa el **calendario como vista principal** justamente por eso. La unidad de la constancia es el día, no la sesión, y un calendario muestra los dos estados que importan al mismo tiempo: los días que se llenaron y los que quedaron vacíos. El registro se convierte en una superficie que se va pintando.

El objetivo concreto: que abrir la app y ver el mes sea, por sí solo, un motivo para no dejar un día en blanco.

---

## 2. Decisiones de producto

### La celda pintada completa

La primera versión mostraba barritas de colores dentro de cada día, con altura proporcional a la duración. Era más informativa y visualmente más débil: con una o dos sesiones diarias, el 95 % de la celda quedaba vacío y el mes se veía apagado.

La versión actual **pinta el día completo** con el color de la actividad. Con dos actividades, la celda se divide en diagonal con los dos colores. Se pierde la duración como dato visual —queda escrita en minutos dentro de la celda— y se gana un contraste inmediato entre día entrenado y día vacío, que es la información que sostiene el hábito.

El criterio: cuando un dato secundario compite con la señal principal, se degrada el dato, no la señal.

### La racha no se corta durante el día en curso

La racha cuenta días consecutivos con al menos un registro. Si hoy todavía no hay sesión, el conteo empieza desde ayer.

Sin esta regla, la racha aparecería en cero cada mañana hasta que se entrene, castigando a la persona por revisar la app temprano. Una métrica de refuerzo que muestra el peor número posible durante la mitad del día deja de reforzar.

### Días entrenados sobre días del mes

La métrica se muestra como `12/31` en lugar de solo `12`. El denominador da escala sin fijar una meta: la app no define cuántos días "deberían" tener entrenamiento, solo muestra la proporción real.

### La sesión nocturna pertenece al día en que empezó

Un entrenamiento de 23:30 a 00:30 se guarda con la fecha del día en que se salió, no del día en que terminó, y la duración se calcula sumando 24 horas cuando el término es anterior al inicio.

La alternativa —partirla entre dos días— haría que una sola salida pintara dos celdas del calendario y sumara dos días a la racha. Atribuirla al día de inicio mantiene la equivalencia entre una celda pintada y una salida a entrenar, que es lo que el calendario comunica.

### Horas de inicio y término, no duración

Se pide el horario y la duración se calcula. Guardar solo la duración perdería información que no se puede reconstruir: a qué hora del día se entrena. Guardar el horario permite derivar la duración y además deja la puerta abierta a análisis futuros de rutina horaria.

---

## 3. Actividades

| Actividad | Color |
|---|---|
| Correr en ciudad | naranjo |
| Correr en caminadora | amarillo |
| Andar en bici | verde |
| Nadar | cian |
| GYM | rosa |
| Pesas en casa | violeta |

Los colores son la única codificación del tipo en el calendario, así que están elegidos para ser distinguibles entre sí sobre el fondo oscuro y suficientemente claros como para llevar el número del día en tinta oscura encima.

Las dos variantes de correr y la separación entre GYM y pesas en casa existen porque son entrenamientos con logística distinta —salir o no salir, tener o no tener equipamiento—, y esa diferencia es la que después explica por qué ciertas semanas se cae la frecuencia.

---

## 4. Decisiones técnicas

**Stack:** React con Vite, CSS embebido con variables, y Firebase (autenticación con Google y Firestore) desde el cliente. Sin backend propio: no hay nada que un servidor intermedio tendría que hacer. Se despliega como sitio estático en Vercel y es instalable como PWA.

### Modelo de datos

```js
{
  id: "8Kd0pQ2mNzR4vB1c",  // lo asigna Firestore
  fecha: "2026-08-21",     // ISO local, no UTC
  tipo: "correr_ciudad",   // id de la actividad
  inicio: "07:30",
  fin: "08:15",
  comentario: "8 km, ritmo suave"
}
```

**Por qué la fecha es un string y no un `Date`:** un `Date` guarda un instante absoluto y al serializarlo a JSON se convierte a UTC. Una sesión registrada a las 21:00 en Santiago vuelve como el día siguiente al releerla. Con el string `YYYY-MM-DD` construido desde los componentes locales (`getFullYear`, `getMonth`, `getDate`), el día registrado es el día que se muestra, sin conversiones intermedias. El mismo formato ordena correctamente de forma alfabética y permite filtrar el mes con un `startsWith`.

**Por qué las horas son strings `HH:MM`:** es el formato nativo de `<input type="time">`, así que no hay parseo ni normalización en el camino entre el formulario y el almacenamiento. La conversión a minutos se hace solo al calcular.

### El peso vive en su propia colección

El registro de peso está en `usuarios/{uid}/pesos`, separado de las sesiones:

```js
{
  fecha: "2026-08-21",     // es también el id del documento
  kg: 78.4,
  comentario: "en ayunas"
}
```

Usar la fecha como id del documento impone un peso por día sin código de deduplicación: registrar de nuevo el mismo día sobrescribe. Pesarse dos veces en un día es ruido de medición, no dos datos.

Mezclarlo con las sesiones habría sido más barato en escritura y más caro en todo lo demás: un peso no es un entrenamiento, no pinta el calendario, no suma a la racha ni a los minutos del mes. La curva usa una escala ajustada al rango real y no desde cero, porque entre 74 y 79 kilos una escala desde cero aplanaría la variación hasta volverla invisible.

### Compatibilidad de datos antiguos

Las actividades cambiaron después de que ya existían registros. En vez de borrar o dejar que la app fallara al no encontrar el tipo, la traducción ocurre al renderizar:

```js
const EQUIVALENCIAS = { correr: "correr_ciudad" };
const tipoDe = (id) => TIPO[id] || TIPO[EQUIVALENCIAS[id]] || SIN_TIPO;
```

`tipoDe` cubre cualquier tipo desconocido que llegue a renderizarse, para que un dato viejo nunca provoque una pantalla en blanco. Es el criterio de una migración de esquema sin reescribir el dato: traducir lo que se puede, tolerar lo que no.

### Persistencia

Firestore, un documento por sesión bajo `usuarios/{uid}/sesiones`. La lectura es un `onSnapshot` sobre la colección completa: el registro de una persona son unos cientos de documentos al año, así que traerlo entero es más simple que paginarlo, y a cambio la app sincroniza sola entre dispositivos.

La caché persistente (`persistentLocalCache`) escribe primero en IndexedDB y sube después. Es lo que conserva la propiedad que tenía la versión local: registrar un entrenamiento sin señal funciona igual y sube solo al volver la conexión. Sin esa caché, mover el almacenamiento a la nube habría convertido un gimnasio subterráneo en un error de guardado.

El acceso es con Google y las reglas de seguridad limitan cada cuenta a su propia subcolección. La configuración web de Firebase va en claro en el código: identifica al proyecto y no autoriza nada.

### Gráficos sin librería

Los gráficos del análisis son `div` con altura porcentual dentro de un contenedor flex. Una librería de charts habría pesado más que el resto de la app junta y habría traído su propia escala de color, que compite con la codificación por actividad que el calendario ya estableció.

### Accesibilidad

Cada celda del calendario es un `<button>` con `aria-label` que dice el día y las actividades registradas, porque el color por sí solo no comunica nada a un lector de pantalla. Foco visible en todos los controles, `color-scheme: dark` para que los selectores nativos de fecha y hora se rendericen legibles, y `prefers-reduced-motion` respetado.

---

## 5. Estructura

```
src/
├── datos.js       catálogo de actividades, fechas ISO locales, duración y rachas
├── firebase.js    inicialización, autenticación y Firestore con caché persistente
├── App.jsx        acceso, pestañas, calendario, métricas del mes y CSS
├── Analisis.jsx   agregación y gráficos del análisis
└── Peso.jsx       registro de peso, curva de evolución y lista
```

`entrenamientos.jsx` es la versión original de una sola pantalla, conservada como referencia.
Los pasos de despliegue están en `DESPLIEGUE.md`.

---

## 6. Pendientes

- **Campos por tipo**: distancia para correr y bici, series y peso para GYM y pesas en casa. Implica pasar de un modelo plano a uno con atributos por actividad.
- **Vista de semana con eje horario**, que existía en una versión anterior. El gráfico de hora habitual responde la pregunta agregada, no la de una semana concreta.
- **Comparación entre meses más allá del contador**: el mes muestra los días entrenados del anterior como referencia, pero no el tiempo ni el reparto por actividad.
- **Exportar a CSV**, menos urgente ahora que el historial vive en Firestore y se puede consultar desde ahí.
