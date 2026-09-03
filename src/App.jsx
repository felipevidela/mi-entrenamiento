import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { auth, db, proveedorGoogle } from "./firebase.js";
import Analisis from "./Analisis.jsx";
import Peso from "./Peso.jsx";
import Comodidad from "./Comodidad.jsx";
import {
  DIAS,
  MESES,
  NIVELES,
  TIPOS,
  calcularRacha,
  cruzaMedianoche,
  desdeIso,
  dosDig,
  duracion,
  etiquetaFecha,
  formatoDur,
  horaActual,
  isoLocal,
  minutos,
  tipoDe,
} from "./datos.js";

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
  min-height:100vh;
  background:radial-gradient(120% 70% at 50% -10%, #1B3C4B 0%, transparent 60%), var(--fondo);
  color:var(--texto);
  font-family:'Barlow',system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;
}
.en-root *{box-sizing:border-box;}
.en-wrap{max-width:600px;margin:0 auto;padding:24px 14px calc(72px + env(safe-area-inset-bottom));}
.en-root button{font-family:'Barlow',sans-serif;cursor:pointer;}
:where(.en-root) button:focus-visible,
:where(.en-root) input:focus-visible,
:where(.en-root) textarea:focus-visible{outline:2px solid var(--cian);outline-offset:2px;}

.en-titulo{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:26px;letter-spacing:-.02em;}
.en-titulo b{color:var(--cian);}
.en-kicker{font-family:'Space Mono',monospace;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--tenue);margin-bottom:20px;}

/* cabecera con la cuenta */
.en-cabecera{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px;}
.en-cuenta{display:flex;align-items:center;gap:8px;min-width:0;}
.en-avatar{width:26px;height:26px;border-radius:50%;flex:none;border:1px solid var(--linea);}
.en-salir{background:none;border:1px solid var(--linea);color:var(--tenue);border-radius:8px;padding:6px 11px;font-size:12.5px;flex:none;}
.en-salir:hover{color:var(--texto);border-color:var(--texto);}

/* pestañas */
.en-pestanas{display:flex;gap:6px;margin-bottom:14px;}
.en-pestana{flex:1;background:transparent;border:1px solid var(--linea);color:var(--tenue);border-radius:10px;padding:10px 2px;font-size:12.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.en-pestana:hover{color:var(--texto);}
.en-pestana[aria-pressed="true"]{background:var(--panel);border-color:var(--cian);color:var(--texto);}

/* acceso */
.en-acceso{max-width:380px;margin:0 auto;padding:18vh 18px 40px;text-align:center;}
.en-acceso p{color:var(--tenue);font-size:14.5px;line-height:1.6;margin:0 0 26px;}
.en-google{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;background:var(--cian);color:#0E1F2A;border:0;border-radius:12px;padding:15px;font-size:15.5px;font-weight:600;}
.en-google:hover:not(:disabled){background:#6FD4E6;}
.en-google:disabled{opacity:.6;cursor:default;}

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

/* métricas */
.en-metricas{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px;}
.en-metricas[data-cols="2"]{grid-template-columns:repeat(2,1fr);}
.en-metrica{background:var(--panel);border:1px solid var(--linea);border-radius:12px;padding:12px 10px;}
.en-metrica b{display:block;font-family:'Space Grotesk',sans-serif;font-size:21px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.1;}
.en-metrica span{display:block;font-family:'Space Mono',monospace;font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--tenue);margin-top:6px;}
.en-comp{display:block;font-style:normal;font-family:'Space Mono',monospace;font-size:9.5px;color:var(--tenue);opacity:.75;margin-top:4px;font-variant-numeric:tabular-nums;}

/* bloques de análisis */
.en-bloque{background:var(--panel);border:1px solid var(--linea);border-radius:14px;padding:15px 14px;margin-top:10px;}
.en-bloque-top{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:16px;}
.en-bloque-top h3{margin:0;font-family:'Space Grotesk',sans-serif;font-size:14.5px;font-weight:700;}
.en-bloque-top em{font-style:normal;font-family:'Space Mono',monospace;font-size:10px;color:var(--tenue);text-align:right;}

.en-gr{display:flex;align-items:flex-end;gap:3px;height:112px;}
.en-col{flex:1;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end;}
.en-barra{width:100%;background:var(--cian);border-radius:3px 3px 1px 1px;min-height:3px;}
.en-barra[data-cero="1"]{height:3px !important;background:var(--linea);border-radius:1px;}
.en-barra[data-parcial="1"]{opacity:.5;}
.en-eje{display:flex;gap:3px;margin-top:7px;}
.en-eje span{flex:1;min-width:0;text-align:center;font-family:'Space Mono',monospace;font-size:9px;color:var(--tenue);white-space:nowrap;}

.en-reparto{display:flex;height:11px;border-radius:4px;overflow:hidden;gap:1.5px;}
.en-reparto i{display:block;}
.en-lista{list-style:none;margin:14px 0 0;padding:0;}
.en-lista li{display:flex;align-items:center;gap:8px;padding:5px 0;font-size:13.5px;color:var(--tenue);}
.en-lista li span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--texto);}
.en-lista li b{font-family:'Space Mono',monospace;font-size:11.5px;font-weight:400;font-variant-numeric:tabular-nums;}
.en-lista li em{font-style:normal;font-family:'Space Mono',monospace;font-size:11.5px;width:34px;text-align:right;font-variant-numeric:tabular-nums;}

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
.en-cruce{font-size:10px;color:var(--cian);letter-spacing:.04em;}
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
.en-hora{font-size:10.5px;opacity:.75;}
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
.en-pesos{list-style:none;margin:10px 0 0;padding:0;}
.en-pesos li{background:var(--panel);border:1px solid var(--linea);border-radius:12px;padding:13px 14px;margin-bottom:8px;}
.en-peso-linea{display:flex;align-items:baseline;gap:9px;}
.en-peso-linea b{font-family:'Space Grotesk',sans-serif;font-size:17px;font-weight:700;font-variant-numeric:tabular-nums;}
.en-delta{font-family:'Space Mono',monospace;font-size:11.5px;color:var(--tenue);font-variant-numeric:tabular-nums;}
.en-peso-linea time{margin-left:auto;font-family:'Space Mono',monospace;font-size:11.5px;color:var(--tenue);white-space:nowrap;}
.en-curva{width:100%;height:auto;display:block;overflow:visible;}
.en-nota{font-size:12px;color:var(--tenue);line-height:1.45;margin:0 0 13px;}
.en-niveles{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;}
.en-nivel{background:var(--panel2);border:1.5px solid var(--linea);border-radius:10px;padding:13px 2px 10px;color:var(--texto);display:flex;flex-direction:column;gap:5px;align-items:center;}
.en-nivel b{font-family:'Space Grotesk',sans-serif;font-size:18px;line-height:1;}
.en-nivel span{font-size:8.5px;color:var(--tenue);line-height:1.15;text-align:center;}
.en-nivel:hover:not(:disabled){border-color:var(--cian);}
.en-nivel:disabled{opacity:.5;cursor:default;}
.en-nivel[data-on="1"]{border-color:var(--cian);background:rgba(79,195,217,.12);}
.en-senales{display:flex;flex-wrap:wrap;gap:7px;}
.en-senal{background:var(--panel2);border:1.5px solid var(--linea);border-radius:999px;padding:8px 13px;color:var(--tenue);font-size:13px;}
.en-senal[data-on="1"]{border-color:var(--cian);color:var(--texto);}
.en-aviso{display:block;width:100%;text-align:left;background:var(--panel);border:1px solid rgba(79,195,217,.55);border-radius:12px;padding:12px 14px;color:var(--texto);font-size:13.5px;margin-bottom:14px;line-height:1.4;}
.en-aviso:hover{border-color:var(--cian);}
.en-comp-fila{display:grid;grid-template-columns:88px 1fr auto;gap:10px;align-items:center;margin-bottom:9px;font-size:12.5px;color:var(--tenue);}
.en-comp-fila i{display:block;height:14px;border-radius:4px;background:var(--cian);min-width:3px;}
.en-comp-fila b{font-family:'Space Mono',monospace;font-size:11px;color:var(--texto);font-weight:400;white-space:nowrap;font-variant-numeric:tabular-nums;}
.en-punto-com{position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:5px;height:5px;border-radius:50%;background:currentColor;}
.en-estatura{display:flex;align-items:baseline;gap:9px;justify-content:center;font-size:12.5px;color:var(--tenue);margin:12px 0 0;}
.en-gr2{display:flex;gap:3px;height:104px;}
.en-col2{flex:1;min-width:0;display:flex;flex-direction:column;}
.en-mitad{flex:1;display:flex;}
.en-mitad[data-lado="arriba"]{align-items:flex-end;border-bottom:1px solid var(--linea);}
.en-mitad[data-lado="abajo"]{align-items:flex-start;}
.en-mitad .en-barra{border-radius:3px;}
.en-mitad[data-lado="abajo"] .en-barra{border-radius:0 0 3px 3px;opacity:.72;}
.en-pie{font-size:12px;color:var(--tenue);text-align:center;margin-top:28px;line-height:1.5;}
@media (max-width:340px){
  .en-tipos{grid-template-columns:1fr;}
}
@media (prefers-reduced-motion: reduce){
  .en-celda{transition:none;}
  .en-celda[data-lleno="1"]:hover{transform:none;}
}
`;

/* ─────────────────────────── acceso ─────────────────────────── */

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUsuario(u);
    setVerificando(false);
  }), []);

  return (
    <div className="en-root">
      <style>{CSS}</style>
      {verificando ? null : usuario ? <Registro usuario={usuario} /> : <Acceso />}
    </div>
  );
}

function Acceso() {
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState("");

  async function entrar() {
    setEntrando(true);
    setError("");
    try {
      await signInWithPopup(auth, proveedorGoogle);
    } catch (e) {
      // el usuario cerró la ventana: no es un error que valga la pena mostrar
      if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") {
        setError("No se pudo iniciar sesión. Vuelve a intentarlo.");
      }
      setEntrando(false);
    }
  }

  return (
    <div className="en-acceso">
      <div className="en-titulo">
        Mi entrenamiento<b>.</b>
      </div>
      <div className="en-kicker">registro de sesiones</div>
      <p>Entra con tu cuenta de Google para llevar el registro y verlo desde cualquier dispositivo.</p>
      <button className="en-google" onClick={entrar} disabled={entrando}>
        {entrando ? "Abriendo Google…" : "Continuar con Google"}
      </button>
      {error && <p className="en-error" style={{ marginTop: 14 }}>{error}</p>}
    </div>
  );
}

/* ─────────────────────────── app ─────────────────────────── */

function Registro({ usuario }) {
  const [sesiones, setSesiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState("");
  const [vista, setVista] = useState("calendario");
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [sel, setSel] = useState(() => isoLocal(new Date()));
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null);

  const [comodidad, setComodidad] = useState([]);
  const [horaRecordatorio, setHoraRecordatorio] = useState("21:00");
  const [ahora, setAhora] = useState(horaActual);

  const coleccion = useCallback(() => collection(db, "usuarios", usuario.uid, "sesiones"), [usuario.uid]);

  useEffect(
    () =>
      onSnapshot(
        collection(db, "usuarios", usuario.uid, "comodidad"),
        (snap) => setComodidad(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => {}
      ),
    [usuario.uid]
  );
  useEffect(
    () => onSnapshot(doc(db, "usuarios", usuario.uid), (d) => setHoraRecordatorio(d.data()?.horaRecordatorio || "21:00"), () => {}),
    [usuario.uid]
  );
  // el aviso de registro pendiente debe aparecer aunque nadie toque la pantalla
  useEffect(() => {
    const t = setInterval(() => setAhora(horaActual()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(
    () =>
      onSnapshot(
        coleccion(),
        (snap) => {
          setSesiones(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setFallo("");
          setCargando(false);
        },
        () => {
          setFallo("No se pudo leer el registro. Revisa tu conexión.");
          setCargando(false);
        }
      ),
    [coleccion]
  );

  /* agrupación por fecha */
  const porFecha = useMemo(() => {
    const m = {};
    sesiones.forEach((s) => (m[s.fecha] = m[s.fecha] ? [...m[s.fecha], s] : [s]));
    Object.values(m).forEach((a) => a.sort((x, y) => minutos(x.inicio) - minutos(y.inicio)));
    return m;
  }, [sesiones]);

  /* comodidad media por día, para el punto del calendario */
  const comodidadPorDia = useMemo(() => {
    const m = {};
    comodidad.forEach((r) => (m[r.fecha] = m[r.fecha] ? [...m[r.fecha], r.nivel] : [r.nivel]));
    Object.keys(m).forEach((f) => (m[f] = m[f].reduce((a, b) => a + b, 0) / m[f].length));
    return m;
  }, [comodidad]);

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

  const prefijo = (y, m) => `${y}-${dosDig(m + 1)}`;
  const delMes = useMemo(
    () => sesiones.filter((s) => s.fecha.startsWith(prefijo(cursor.y, cursor.m))),
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

  /* el mes anterior, para que la cifra del mes tenga con qué compararse */
  const diasMesAnterior = useMemo(() => {
    const d = new Date(cursor.y, cursor.m - 1, 1);
    const p = prefijo(d.getFullYear(), d.getMonth());
    return new Set(sesiones.filter((s) => s.fecha.startsWith(p)).map((s) => s.fecha)).size;
  }, [sesiones, cursor]);

  const mover = (n) => {
    const d = new Date(cursor.y, cursor.m + n, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };
  const enMesActual = cursor.y === new Date().getFullYear() && cursor.m === new Date().getMonth();

  const guardar = useCallback(
    async (datos) => {
      setSel(datos.fecha);
      const d = desdeIso(datos.fecha);
      setCursor({ y: d.getFullYear(), m: d.getMonth() });
      const id = editando;
      setEditando(null);
      setAbierto(false);
      try {
        if (id) await updateDoc(doc(coleccion(), id), datos);
        else await addDoc(coleccion(), datos);
      } catch (e) {
        setFallo("No se pudo guardar la sesión. Revisa tu conexión.");
      }
    },
    [editando, coleccion]
  );

  const eliminar = useCallback(
    async (id) => {
      if (editando === id) {
        setEditando(null);
        setAbierto(false);
      }
      try {
        await deleteDoc(doc(coleccion(), id));
      } catch (e) {
        setFallo("No se pudo eliminar la sesión. Revisa tu conexión.");
      }
    },
    [editando, coleccion]
  );

  const sesionEditada = editando ? sesiones.find((s) => s.id === editando) : null;
  const delDia = porFecha[sel] || [];
  const minDia = delDia.reduce((a, s) => a + duracion(s), 0);
  const hoy = isoLocal(new Date());

  return (
    <div className="en-wrap">
      <div className="en-cabecera">
        <div>
          <div className="en-titulo">
            Mi entrenamiento<b>.</b>
          </div>
          <div className="en-kicker" style={{ marginBottom: 0 }}>registro de sesiones</div>
        </div>
        <div className="en-cuenta">
          {usuario.photoURL && <img className="en-avatar" src={usuario.photoURL} alt="" referrerPolicy="no-referrer" />}
          <button className="en-salir" onClick={() => signOut(auth)}>Salir</button>
        </div>
      </div>

      <div className="en-pestanas">
        <button className="en-pestana" aria-pressed={vista === "calendario"} onClick={() => setVista("calendario")}>
          Calendario
        </button>
        <button className="en-pestana" aria-pressed={vista === "analisis"} onClick={() => setVista("analisis")}>
          Análisis
        </button>
        <button className="en-pestana" aria-pressed={vista === "peso"} onClick={() => setVista("peso")}>
          Peso
        </button>
        <button className="en-pestana" aria-pressed={vista === "comodidad"} onClick={() => setVista("comodidad")}>
          Comodidad
        </button>
      </div>

      {fallo && <p className="en-error">{fallo}</p>}

      {vista !== "comodidad" &&
        ahora >= horaRecordatorio &&
        !comodidad.some((r) => r.fecha === isoLocal(new Date())) && (
          <button className="en-aviso" onClick={() => setVista("comodidad")}>
            Falta el registro de comodidad de hoy. Tocar para registrarlo →
          </button>
        )}

      {vista === "comodidad" ? (
        <Comodidad uid={usuario.uid} registros={comodidad} sesiones={sesiones} horaRecordatorio={horaRecordatorio} />
      ) : vista === "peso" ? (
        <Peso uid={usuario.uid} />
      ) : vista === "analisis" ? (
        cargando ? (
          <p className="en-vacio">Cargando el registro…</p>
        ) : (
          <Analisis sesiones={sesiones} />
        )
      ) : (
        <>
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
                    data-hoy={iso === hoy ? "1" : "0"}
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
                    }${comodidadPorDia[iso] ? `, comodidad ${Math.round(comodidadPorDia[iso])} de 5` : ""}`}
                  >
                    <span className="en-num">{desdeIso(iso).getDate()}</span>
                    {ss.length > 0 && <span className="en-min">{total}′</span>}
                    {comodidadPorDia[iso] && (
                      <i className="en-punto-com" style={{ opacity: 0.25 + (comodidadPorDia[iso] / 5) * 0.6 }} />
                    )}
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
              <em className="en-comp" title={`Mes anterior: ${diasMesAnterior} días`}>
                mes ant. {diasMesAnterior || "—"}
              </em>
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
                onEliminar={() => eliminar(s.id)}
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
        </>
      )}

      <p className="en-pie">
        El registro se guarda en tu cuenta de Google y está disponible en cualquier dispositivo donde entres.
        Si registras una sesión sin señal, se guarda igual y se sincroniza al volver la conexión.
      </p>
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
          {cruzaMedianoche(s) && <span className="en-cruce"> +1 día</span>}
          {(s.lata_antes != null || s.lata_despues != null) && (
            <span> · lata {s.lata_antes ?? "—"} → {s.lata_despues ?? "—"}</span>
          )}
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
  const [lataAntes, setLataAntes] = useState(inicial?.lata_antes ?? null);
  const [lataDespues, setLataDespues] = useState(inicial?.lata_despues ?? null);
  // la lata real se pregunta recién al guardar, para no responderla mirando
  // lo que se contestó de la anticipada
  const [pasoLata, setPasoLata] = useState(false);
  const [error, setError] = useState("");
  const caja = useRef(null);

  useEffect(() => {
    caja.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const completo = inicio && fin && minutos(fin) !== minutos(inicio);
  const nocturna = completo && minutos(fin) < minutos(inicio);

  function enviar() {
    if (!tipo) return setError("Elige un tipo de entrenamiento.");
    if (!fecha) return setError("Indica la fecha del entrenamiento.");
    if (!inicio || !fin) return setError("Completa la hora de inicio y la de término.");
    if (minutos(fin) === minutos(inicio)) return setError("La hora de término no puede ser igual a la de inicio.");
    setError("");
    if (!inicial && !pasoLata) return setPasoLata(true);
    guardarTodo(lataDespues);
  }

  function guardarTodo(despues) {
    onGuardar({
      fecha,
      tipo,
      inicio,
      fin,
      comentario: comentario.trim(),
      lata_antes: lataAntes,
      lata_despues: despues,
    });
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

      {completo && (
        <p className="en-horas" style={{ marginTop: -6, marginBottom: 14 }}>
          Duración: {formatoDur(duracion({ inicio, fin }))}
          {nocturna && <span className="en-cruce"> · termina al día siguiente</span>}
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

      <div className="en-campo">
        <label className="en-label">¿Cuánta lata te daba salir? (opcional)</label>
        <FilaLata valor={lataAntes} onCambiar={setLataAntes} nombre="lata anticipada" />
      </div>

      {inicial && (
        <div className="en-campo">
          <label className="en-label">¿Y cuánta fue en realidad? (opcional)</label>
          <FilaLata valor={lataDespues} onCambiar={setLataDespues} nombre="lata real" />
        </div>
      )}

      {error && <p className="en-error">{error}</p>}

      {pasoLata ? (
        <div className="en-campo">
          <label className="en-label">¿Y cuánta lata fue en realidad? Tocar guarda la sesión.</label>
          <FilaLata
            valor={lataDespues}
            onCambiar={(v) => guardarTodo(v)}
            nombre="lata real"
          />
          <div className="en-acciones" style={{ marginTop: 12 }}>
            <button className="en-secund" style={{ flex: 1 }} onClick={() => guardarTodo(null)}>
              Guardar sin responder
            </button>
          </div>
        </div>
      ) : (
        <div className="en-acciones">
          <button className="en-guardar" onClick={enviar}>
            {inicial ? "Guardar cambios" : "Registrar sesión"}
          </button>
          <button className="en-secund" onClick={onCancelar}>Cancelar</button>
        </div>
      )}
    </div>
  );
}

// cinco botones de 1 a 5; volver a tocar el elegido lo deselecciona
function FilaLata({ valor, onCambiar, nombre }) {
  return (
    <div className="en-niveles">
      {NIVELES.map((n) => (
        <button
          key={n.valor}
          className="en-nivel"
          data-on={valor === n.valor ? "1" : "0"}
          aria-label={`${nombre}: ${n.valor} de 5`}
          onClick={() => onCambiar(valor === n.valor ? null : n.valor)}
        >
          <b>{n.valor}</b>
        </button>
      ))}
    </div>
  );
}
