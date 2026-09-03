/* Catálogo de actividades y utilidades compartidas por el calendario y el análisis. */

export const TIPOS = [
  { id: "correr_ciudad", label: "Correr en ciudad", color: "#F2A65A" },
  { id: "correr_cinta", label: "Correr en caminadora", color: "#F7D46B" },
  { id: "bici", label: "Andar en bici", color: "#7FD1A0" },
  { id: "nadar", label: "Nadar", color: "#4FC3D9" },
  { id: "gym", label: "GYM", color: "#E4657A" },
  { id: "pesas_casa", label: "Pesas en casa", color: "#B98CE8" },
];
export const TIPO = Object.fromEntries(TIPOS.map((t) => [t.id, t]));
// registros guardados con tipos que ya no están en la lista
const EQUIVALENCIAS = { correr: "correr_ciudad" };
const SIN_TIPO = { id: "sin_tipo", label: "Sin categoría", color: "#7EA2B0" };
export const tipoDe = (id) => TIPO[id] || TIPO[EQUIVALENCIAS[id]] || SIN_TIPO;

// escala de comodidad física, del registro de comodidad y de la "lata"
export const NIVELES = [
  { valor: 1, label: "muy incómodo" },
  { valor: 2, label: "incómodo" },
  { valor: 3, label: "normal" },
  { valor: 4, label: "cómodo" },
  { valor: 5, label: "muy cómodo" },
];
// señales físicas, sin nada de apariencia ni autoimagen: la app registra
// sensación corporal, no cómo se ve nadie
export const SENALES = [
  { id: "ropa_apretada", label: "Ropa apretada" },
  { id: "sudor", label: "Sudor" },
  { id: "pesadez", label: "Pesadez" },
  { id: "energia_baja", label: "Energía baja" },
  { id: "dormi_mal", label: "Dormí mal" },
  { id: "rigidez", label: "Rigidez" },
];

export const DIAS = ["L", "M", "M", "J", "V", "S", "D"];
export const DIAS_LARGO = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export const dosDig = (n) => String(n).padStart(2, "0");
export const isoLocal = (d) => `${d.getFullYear()}-${dosDig(d.getMonth() + 1)}-${dosDig(d.getDate())}`;
export const desdeIso = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const minutos = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// una sesión que termina antes de empezar cruzó la medianoche y se atribuye
// al día en que empezó, que es el día en que se salió a entrenar
export const cruzaMedianoche = (s) => minutos(s.fin) <= minutos(s.inicio);
export function duracion(s) {
  const d = minutos(s.fin) - minutos(s.inicio);
  return d > 0 ? d : d + 1440;
}

export function formatoDur(min) {
  if (min <= 0) return "0 min";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h} h`;
  return `${h} h ${m} min`;
}

export function etiquetaFecha(iso) {
  const d = desdeIso(iso);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dif = Math.round((d - hoy) / 86400000);
  if (dif === 0) return "Hoy";
  if (dif === -1) return "Ayer";
  return `${DIAS_LARGO[(d.getDay() + 6) % 7]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

// días seguidos con al menos un entrenamiento; el día en curso no corta la racha
export function calcularRacha(porFecha) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (!porFecha[isoLocal(d)]) d.setDate(d.getDate() - 1);
  let n = 0;
  while (porFecha[isoLocal(d)]) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function diaAnterior(iso) {
  const d = desdeIso(iso);
  d.setDate(d.getDate() - 1);
  return isoLocal(d);
}

export const horaActual = () => {
  const d = new Date();
  return `${dosDig(d.getHours())}:${dosDig(d.getMinutes())}`;
};

// la mayor cantidad de días consecutivos alcanzada en todo el historial
export function rachaMasLarga(fechas) {
  const ordenadas = [...new Set(fechas)].sort();
  let mejor = 0;
  let actual = 0;
  let previa = null;
  for (const iso of ordenadas) {
    const d = desdeIso(iso);
    actual = previa && Math.round((d - previa) / 86400000) === 1 ? actual + 1 : 1;
    if (actual > mejor) mejor = actual;
    previa = d;
  }
  return mejor;
}
