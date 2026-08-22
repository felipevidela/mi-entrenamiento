import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";

/* ─────────────────────────── constantes ─────────────────────────── */

const TIPOS = [
  { id: "correr_ciudad", label: "Correr en ciudad", color: "#F2A65A" },
  { id: "correr_cinta", label: "Correr en caminadora", color: "#F7D46B" },
  { id: "bici", label: "Andar en bici", color: "#7FD1A0" },
  { id: "nadar", label: "Nadar", color: "#4FC3D9" },
  { id: "gym", label: "GYM", color: "#E4657A" },
  { id: "pesas_casa", label: "Pesas en casa", color: "#B98CE8" },
];
const TIPO = Object.fromEntries(TIPOS.map((t) => [t.id, t]));
// registros guardados con tipos que ya no están en la lista
const EQUIVALENCIAS = { correr: "correr_ciudad" };
const SIN_TIPO = { id: "sin_tipo", label: "Sin categoría", color: "#7EA2B0" };
const tipoDe = (id) => TIPO[id] || TIPO[EQUIVALENCIAS[id]] || SIN_TIPO;
const DIAS = ["L", "M", "M", "J", "V", "S", "D"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const CLAVE = "entrenos-sesiones";

/* ─────────────────────────── utilidades ─────────────────────────── */

const dosDig = (n) => String(n).padStart(2, "0");
const isoLocal = (d) => `${d.getFullYear()}-${dosDig(d.getMonth() + 1)}-${dosDig(d.getDate())}`;
const desdeIso = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const minutos = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const duracion = (s) => minutos(s.fin) - minutos(s.inicio);
function formatoDur(min) {
  if (min <= 0) return "0 min";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h} h`;
  return `${h} h ${m} min`;
}
function etiquetaFecha(iso) {
  const d = desdeIso(iso);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dif = Math.round((d - hoy) / 86400000);
  if (dif === 0) return "Hoy";
  if (dif === -1) return "Ayer";
  const nombres = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
  return `${nombres[(d.getDay() + 6) % 7]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}
const uid = () => Math.random().toString(36).slice(2, 10);

// días seguidos con al menos un entrenamiento; el día en curso no corta la racha
function calcularRacha(porFecha) {
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

/* ─────────────────────────── estilos ─────────────────────────── */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Space+Mono:wght@400;700&family=Barlow:wght@400;500;600&display=swap');

.en-root{
  --fondo:#0E1F2A;
  --panel:#152E3B;
  --panel2:#1B3846;
  --linea:#24505F;
  --texto:#E9F2F4;
  --tenue:#7EA2B0;
  --cian:#4FC3D9;
  --alerta:#F08A7A;
  color-scheme:dark;
  min-height:100%;
  background:radial-gradient(120% 70% at 50% -10%, #1B3C4B 0%, transparent 60%), var(--fondo);
  color:var(--texto);
  font-family:'Barlow',system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;
}
.en-root *{box-sizing:border-box;}
.en-wrap{max-width:600px;margin:0 auto;padding:24px 14px 72px;}
.en-root button{font-family:'Barlow',sans-serif;cursor:pointer;}
:where(.en-root) button:focus-visible,
:where(.en-root) input:focus-visible,
:where(.en-root) textarea:focus-visible{outline:2px solid var(--cian);outline-offset:2px;}

.en-titulo{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:26px;letter-spacing:-.02em;}
.en-titulo b{color:var(--cian);}
.en-kicker{font-family:'Space Mono',monospace;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--tenue);margin-bottom:20px;}

/* calendario */
.en-cal{background:var(--panel);border:1px solid var(--linea);border-radius:16px;padding:16px 14px 14px;}
.en-cal-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.en-mes{font-family:'Space Grotesk',sans-serif;font-size:17px;font-weight:700;text-transform:capitalize;}
.en-mes span{color:var(--tenue);font-weight:500;font-family:'Space Mono',monospace;font-size:13px;margin-left:6px;}
.en-nav{display:flex;gap:6px;}
.en-nav button{background:transparent;border:1px solid var(--linea);color:var(--tenue);width:32px;height:30px;border-radius:8px;font-size:15px;line-height:1;}
.en-nav button:hover:not(:disabled){border-color:var(--cian);color:var(--cian);}
.en-nav button:disabled{opacity:.3;cursor:default;}

.en-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;}
.en-dow{text-align:center;font-family:'Space Mono',monospace;font-size:10px;color:var(--tenue);padding-bottom:6px;letter-spacing:.06em;}
.en-celda{position:relative;aspect-ratio:1/1.06;background:rgba(255,255,255,.03);border:1.5px solid transparent;border-radius:10px;padding:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:var(--tenue);transition:transform .13s ease;}
.en-celda:hover{background:rgba(255,255,255,.08);}
.en-celda[data-lleno="1"]{color:#0E1F2A;box-shadow:0 3px 12px rgba(0,0,0,.28);}
.en-celda[data-lleno="1"]:hover{transform:translateY(-2px);}
.en-celda[data-hoy="1"]{border-color:rgba(79,195,217,.5);}
.en-celda[data-sel="1"]{border-color:var(--cian);}
.en-celda[data-vacio="1"]{visibility:hidden;}
.en-num{font-family:'Space Mono',monospace;font-size:13px;line-height:1;font-variant-numeric:tabular-nums;}
.en-celda[data-hoy="1"] .en-num{color:var(--cian);font-weight:700;}
.en-celda[data-lleno="1"] .en-num{color:#0E1F2A;font-weight:700;font-size:14.5px;}
.en-min{font-family:'Space Mono',monospace;font-size:9.5px;line-height:1;opacity:.72;font-variant-numeric:tabular-nums;}

.en-leyenda{display:flex;flex-wrap:wrap;gap:10px 14px;margin-top:16px;padding-top:14px;border-top:1px solid var(--linea);}
.en-leg{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--tenue);}
.en-punto{width:9px;height:9px;border-radius:2px;flex:none;}
.en-leg b{color:var(--texto);font-family:'Space Mono',monospace;font-size:11.5px;font-weight:400;font-variant-numeric:tabular-nums;}

/* resumen del mes */
.en-metricas{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px;}
.en-metrica{background:var(--panel);border:1px solid var(--linea);border-radius:12px;padding:12px 10px;}
.en-metrica b{display:block;font-family:'Space Grotesk',sans-serif;font-size:21px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.1;}
.en-metrica span{display:block;font-family:'Space Mono',monospace;font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--tenue);margin-top:6px;}

/* día seleccionado */
.en-dia-top{display:flex;align-items:baseline;justify-content:space-between;margin:30px 0 12px;gap:10px;}
.en-dia-top h2{margin:0;font-family:'Space Grotesk',sans-serif;font-size:16px;font-weight:700;}
.en-dia-top em{font-style:normal;font-family:'Space Mono',monospace;font-size:12px;color:var(--tenue);white-space:nowrap;}

.en-sesion{display:flex;gap:12px;background:var(--panel);border:1px solid var(--linea);border-radius:12px;padding:13px 14px;margin-bottom:8px;}
.en-barra-lat{width:3px;border-radius:2px;flex:none;}
.en-cuerpo{flex:1;min-width:0;}
.en-linea1{display:flex;align-items:baseline;justify-content:space-between;gap:10px;}
.en-nombre{font-weight:600;font-size:15.5px;}
.en-dur{font-family:'Space Mono',monospace;font-size:12px;color:var(--tenue);font-variant-numeric:tabular-nums;white-space:nowrap;}
.en-horas{font-family:'Space Mono',monospace;font-size:12.5px;color:var(--tenue);margin-top:3px;font-variant-numeric:tabular-nums;}
.en-coment{font-size:14px;line-height:1.5;margin:8px 0 0;color:#C6D9DF;overflow-wrap:anywhere;}
.en-ops{display:flex;gap:14px;margin-top:9px;}
.en-op{background:none;border:0;padding:0;color:var(--tenue);font-size:12.5px;text-decoration:underline;text-underline-offset:3px;}
.en-op:hover{color:var(--texto);}
.en-op[data-peligro="1"]:hover{color:var(--alerta);}
.en-vacio{background:var(--panel);border:1px dashed var(--linea);border-radius:12px;padding:20px 16px;text-align:center;color:var(--tenue);font-size:14px;line-height:1.55;}

/* formulario */
.en-abrir{width:100%;margin-top:10px;background:var(--cian);color:#0E1F2A;border:0;border-radius:12px;padding:15px;font-size:15.5px;font-weight:600;}
.en-abrir:hover{background:#6FD4E6;}
.en-form{margin-top:12px;background:var(--panel);border:1px solid var(--linea);border-radius:14px;padding:16px;}
.en-form-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;}
.en-form-top h3{margin:0;font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:700;}
.en-cerrar{background:none;border:0;color:var(--tenue);font-size:20px;line-height:1;padding:0 4px;}
.en-cerrar:hover{color:var(--texto);}
.en-campo{margin-bottom:14px;}
.en-label{display:block;font-family:'Space Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--tenue);margin-bottom:7px;}
.en-input{width:100%;background:var(--panel2);border:1px solid var(--linea);border-radius:9px;padding:11px 12px;color:var(--texto);font-family:'Barlow',sans-serif;font-size:15px;}
.en-input[type="time"],.en-input[type="date"]{font-family:'Space Mono',monospace;font-size:14px;}
.en-dos{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.en-tipos{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;}
.en-tipo{background:var(--panel2);border:1.5px solid var(--linea);border-radius:9px;padding:12px 6px;color:var(--tenue);font-size:13.5px;font-weight:500;line-height:1.2;}
.en-tipo[data-on="1"]{color:#0E1F2A;font-weight:600;}
textarea.en-input{resize:vertical;min-height:64px;line-height:1.45;}
.en-error{color:var(--alerta);font-size:13px;margin:0 0 12px;}
.en-acciones{display:flex;gap:9px;}
.en-guardar{flex:1;background:var(--cian);color:#0E1F2A;border:0;border-radius:10px;padding:13px;font-size:15px;font-weight:600;}
.en-guardar:hover{background:#6FD4E6;}
.en-secund{background:transparent;border:1px solid var(--linea);color:var(--tenue);border-radius:10px;padding:13px 16px;font-size:14px;}
.en-secund:hover{color:var(--texto);border-color:var(--texto);}
.en-pie{font-size:12px;color:var(--tenue);text-align:center;margin-top:28px;line-height:1.5;}
@media (max-width:340px){
  .en-tipos{grid-template-columns:1fr;}
}
@media (prefers-reduced-motion: reduce){
  .en-celda{transition:none;}
  .en-celda[data-lleno="1"]:hover{transform:none;}
}
`;

/* ─────────────────────────── app ─────────────────────────── */

export default function App() {
  const [sesiones, setSesiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [sel, setSel] = useState(() => isoLocal(new Date()));
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const listo = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(CLAVE);
        if (r && r.value) {
          const previas = JSON.parse(r.value);
          setSesiones(previas.map((s) => (EQUIVALENCIAS[s.tipo] ? { ...s, tipo: EQUIVALENCIAS[s.tipo] } : s)));
        }
      } catch (e) {
        /* primera vez o sin almacenamiento */
      } finally {
        listo.current = true;
        setCargando(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!listo.current) return;
    (async () => {
      try {
        await window.storage.set(CLAVE, JSON.stringify(sesiones));
      } catch (e) {
        /* el registro dura la sesión */
      }
    })();
  }, [sesiones]);

  /* agrupación por fecha */
  const porFecha = useMemo(() => {
    const m = {};
    sesiones.forEach((s) => (m[s.fecha] = m[s.fecha] ? [...m[s.fecha], s] : [s]));
    Object.values(m).forEach((a) => a.sort((x, y) => minutos(x.inicio) - minutos(y.inicio)));
    return m;
  }, [sesiones]);

  /* rejilla del mes, empezando en lunes */
  const celdas = useMemo(() => {
    const primero = new Date(cursor.y, cursor.m, 1);
    const offset = (primero.getDay() + 6) % 7;
    const largo = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const out = [];
    for (let i = 0; i < offset; i++) out.push(null);
    for (let d = 1; d <= largo; d++) out.push(isoLocal(new Date(cursor.y, cursor.m, d)));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const delMes = useMemo(
    () => sesiones.filter((s) => s.fecha.startsWith(`${cursor.y}-${dosDig(cursor.m + 1)}`)),
    [sesiones, cursor]
  );
  const porTipo = useMemo(() => {
    const m = {};
    delMes.forEach((s) => (m[s.tipo] = (m[s.tipo] || 0) + duracion(s)));
    return m;
  }, [delMes]);
  const minMes = delMes.reduce((a, s) => a + duracion(s), 0);
  const diasActivos = new Set(delMes.map((s) => s.fecha)).size;
  const diasDelMes = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const racha = useMemo(() => calcularRacha(porFecha), [porFecha]);

  const mover = (n) => {
    const d = new Date(cursor.y, cursor.m + n, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };
  const enMesActual = cursor.y === new Date().getFullYear() && cursor.m === new Date().getMonth();

  const guardar = useCallback(
    (datos) => {
      if (editando) setSesiones((xs) => xs.map((x) => (x.id === editando ? { ...x, ...datos } : x)));
      else setSesiones((xs) => [...xs, { id: uid(), ...datos }]);
      setSel(datos.fecha);
      const d = desdeIso(datos.fecha);
      setCursor({ y: d.getFullYear(), m: d.getMonth() });
      setEditando(null);
      setAbierto(false);
    },
    [editando]
  );

  const sesionEditada = editando ? sesiones.find((s) => s.id === editando) : null;
  const delDia = porFecha[sel] || [];
  const minDia = delDia.reduce((a, s) => a + duracion(s), 0);

  return (
    <div className="en-root">
      <style>{CSS}</style>
      <div className="en-wrap">
        <div className="en-titulo">
          Mi entrenamiento<b>.</b>
        </div>
        <div className="en-kicker">registro de sesiones</div>

        <section className="en-cal">
          <div className="en-cal-top">
            <div className="en-mes">
              {MESES[cursor.m]} <span>{cursor.y}</span>
            </div>
            <div className="en-nav">
              <button onClick={() => mover(-1)} aria-label="Mes anterior">‹</button>
              <button
                onClick={() => {
                  const d = new Date();
                  setCursor({ y: d.getFullYear(), m: d.getMonth() });
                  setSel(isoLocal(d));
                }}
                disabled={enMesActual}
                aria-label="Ir al mes actual"
              >
                •
              </button>
              <button onClick={() => mover(1)} aria-label="Mes siguiente">›</button>
            </div>
          </div>

          <div className="en-grid">
            {DIAS.map((d, i) => (
              <div className="en-dow" key={i}>{d}</div>
            ))}
            {celdas.map((iso, i) => {
              if (!iso) return <div className="en-celda" data-vacio="1" key={"v" + i} />;
              const ss = porFecha[iso] || [];
              const cols = ss.map((s) => tipoDe(s.tipo).color);
              const total = ss.reduce((a, s) => a + duracion(s), 0);
              const fondo =
                cols.length === 0
                  ? undefined
                  : cols.length === 1
                  ? cols[0]
                  : `linear-gradient(135deg, ${cols
                      .map(
                        (c, k) =>
                          `${c} ${((k * 100) / cols.length).toFixed(2)}%, ${c} ${(((k + 1) * 100) / cols.length).toFixed(2)}%`
                      )
                      .join(", ")})`;
              return (
                <button
                  key={iso}
                  className="en-celda"
                  data-hoy={iso === isoLocal(new Date()) ? "1" : "0"}
                  data-sel={iso === sel ? "1" : "0"}
                  data-lleno={ss.length ? "1" : "0"}
                  style={fondo ? { background: fondo } : undefined}
                  onClick={() => {
                    setSel(iso);
                    setAbierto(false);
                    setEditando(null);
                  }}
                  aria-label={`${desdeIso(iso).getDate()} de ${MESES[cursor.m]}: ${
                    ss.length ? ss.map((s) => tipoDe(s.tipo).label).join(" y ") : "sin entrenamiento"
                  }`}
                >
                  <span className="en-num">{desdeIso(iso).getDate()}</span>
                  {ss.length > 0 && <span className="en-min">{total}′</span>}
                </button>
              );
            })}
          </div>

          <div className="en-leyenda">
            {TIPOS.map((t) => (
              <div className="en-leg" key={t.id}>
                <i className="en-punto" style={{ background: t.color }} />
                {t.label} <b>{porTipo[t.id] ? formatoDur(porTipo[t.id]) : "—"}</b>
              </div>
            ))}
          </div>
        </section>

        <div className="en-metricas">
          <div className="en-metrica">
            <b>
              {diasActivos}
              <i style={{ fontStyle: "normal", color: "var(--tenue)", fontSize: 14 }}>/{diasDelMes}</i>
            </b>
            <span>días entrenados</span>
          </div>
          <div className="en-metrica">
            <b>{formatoDur(minMes)}</b>
            <span>tiempo del mes</span>
          </div>
          <div className="en-metrica">
            <b>{racha}</b>
            <span>días de racha</span>
          </div>
        </div>

        <div className="en-dia-top">
          <h2>{etiquetaFecha(sel)}</h2>
          {delDia.length > 0 && <em>{formatoDur(minDia)}</em>}
        </div>

        {cargando ? (
          <p className="en-vacio">Cargando el registro…</p>
        ) : delDia.length === 0 ? (
          <p className="en-vacio">Sin entrenamientos este día. Al registrar uno, el día se pinta con el color de la actividad.</p>
        ) : (
          delDia.map((s) => (
            <Sesion
              key={s.id}
              s={s}
              onEditar={() => {
                setEditando(s.id);
                setAbierto(true);
              }}
              onEliminar={() => {
                setSesiones((xs) => xs.filter((x) => x.id !== s.id));
                if (editando === s.id) {
                  setEditando(null);
                  setAbierto(false);
                }
              }}
            />
          ))
        )}

        {!abierto && (
          <button className="en-abrir" onClick={() => setAbierto(true)}>
            + Registrar entrenamiento
          </button>
        )}

        {abierto && (
          <Formulario
            key={editando || sel}
            inicial={sesionEditada}
            fechaPorDefecto={sel}
            onGuardar={guardar}
            onCancelar={() => {
              setAbierto(false);
              setEditando(null);
            }}
          />
        )}

        <p className="en-pie">
          El registro se guarda en este dispositivo y sigue disponible la próxima vez que abras la app.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────── piezas ─────────────────────────── */

function Sesion({ s, onEditar, onEliminar }) {
  const [confirmar, setConfirmar] = useState(false);
  const t = tipoDe(s.tipo);
  return (
    <div className="en-sesion">
      <div className="en-barra-lat" style={{ background: t.color }} />
      <div className="en-cuerpo">
        <div className="en-linea1">
          <span className="en-nombre">{t.label}</span>
          <span className="en-dur">{formatoDur(duracion(s))}</span>
        </div>
        <div className="en-horas">
          {s.inicio} – {s.fin}
        </div>
        {s.comentario && <p className="en-coment">{s.comentario}</p>}
        <div className="en-ops">
          <button className="en-op" onClick={onEditar}>Editar</button>
          {confirmar ? (
            <>
              <button className="en-op" data-peligro="1" onClick={onEliminar}>Confirmar</button>
              <button className="en-op" onClick={() => setConfirmar(false)}>Cancelar</button>
            </>
          ) : (
            <button className="en-op" data-peligro="1" onClick={() => setConfirmar(true)}>Eliminar</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Formulario({ inicial, fechaPorDefecto, onGuardar, onCancelar }) {
  const [fecha, setFecha] = useState(inicial?.fecha || fechaPorDefecto);
  const [tipo, setTipo] = useState(inicial?.tipo || "");
  const [inicio, setInicio] = useState(inicial?.inicio || "");
  const [fin, setFin] = useState(inicial?.fin || "");
  const [comentario, setComentario] = useState(inicial?.comentario || "");
  const [error, setError] = useState("");
  const caja = useRef(null);

  useEffect(() => {
    caja.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  function enviar() {
    if (!tipo) return setError("Elige un tipo de entrenamiento.");
    if (!fecha) return setError("Indica la fecha del entrenamiento.");
    if (!inicio || !fin) return setError("Completa la hora de inicio y la de término.");
    if (minutos(fin) <= minutos(inicio)) return setError("La hora de término debe ser posterior a la de inicio.");
    setError("");
    onGuardar({ fecha, tipo, inicio, fin, comentario: comentario.trim() });
  }

  return (
    <div className="en-form" ref={caja}>
      <div className="en-form-top">
        <h3>{inicial ? "Editar sesión" : "Nueva sesión"}</h3>
        <button className="en-cerrar" onClick={onCancelar} aria-label="Cerrar">×</button>
      </div>

      <div className="en-campo">
        <label className="en-label">Entrenamiento</label>
        <div className="en-tipos">
          {TIPOS.map((t) => (
            <button
              key={t.id}
              className="en-tipo"
              data-on={tipo === t.id ? "1" : "0"}
              style={tipo === t.id ? { background: t.color, borderColor: t.color } : undefined}
              onClick={() => setTipo(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="en-campo">
        <label className="en-label" htmlFor="en-fecha">Fecha</label>
        <input id="en-fecha" className="en-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>

      <div className="en-campo en-dos">
        <div>
          <label className="en-label" htmlFor="en-ini">Desde</label>
          <input id="en-ini" className="en-input" type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </div>
        <div>
          <label className="en-label" htmlFor="en-fin">Hasta</label>
          <input id="en-fin" className="en-input" type="time" value={fin} onChange={(e) => setFin(e.target.value)} />
        </div>
      </div>

      {inicio && fin && minutos(fin) > minutos(inicio) && (
        <p className="en-horas" style={{ marginTop: -6, marginBottom: 14 }}>
          Duración: {formatoDur(minutos(fin) - minutos(inicio))}
        </p>
      )}

      <div className="en-campo">
        <label className="en-label" htmlFor="en-com">Comentario</label>
        <textarea
          id="en-com"
          className="en-input"
          placeholder="Distancia, series, cómo te sentiste…"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
        />
      </div>

      {error && <p className="en-error">{error}</p>}

      <div className="en-acciones">
        <button className="en-guardar" onClick={enviar}>
          {inicial ? "Guardar cambios" : "Registrar sesión"}
        </button>
        <button className="en-secund" onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  );
}
