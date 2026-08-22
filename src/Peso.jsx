import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { MESES, desdeIso, dosDig, etiquetaFecha, isoLocal } from "./datos.js";

// Umbrales de la OMS. Se muestran como referencia, sin recomendación de ningún tipo.
const TRAMOS = [
  { hasta: 18.5, label: "bajo peso" },
  { hasta: 25, label: "peso normal" },
  { hasta: 30, label: "sobrepeso" },
  { hasta: Infinity, label: "obesidad" },
];
const imcDe = (kg, cm) => kg / (cm / 100) ** 2;
const tramoDe = (imc) => TRAMOS.find((t) => imc < t.hasta).label;
// el peso al que corresponde un IMC dado con esa estatura
const pesoParaImc = (imc, cm) => imc * (cm / 100) ** 2;

const cifra = (n) => n.toFixed(1).replace(".", ",");
// 25 y no 25,0; 18,5 se conserva
const breve = (n) => (Number.isInteger(n) ? String(n) : cifra(n));
const conSigno = (n) => (n > 0 ? "+" : n < 0 ? "-" : "") + cifra(Math.abs(n));

export default function Peso({ uid }) {
  const [pesos, setPesos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [estatura, setEstatura] = useState(null);
  const [pidiendoEstatura, setPidiendoEstatura] = useState(false);

  const coleccion = useCallback(() => collection(db, "usuarios", uid, "pesos"), [uid]);

  useEffect(
    () => onSnapshot(doc(db, "usuarios", uid), (d) => setEstatura(d.data()?.estaturaCm ?? null), () => {}),
    [uid]
  );

  const guardarEstatura = useCallback(
    async (cm) => {
      setPidiendoEstatura(false);
      try {
        await setDoc(doc(db, "usuarios", uid), { estaturaCm: cm }, { merge: true });
      } catch (e) {
        setFallo("No se pudo guardar la estatura. Revisa tu conexión.");
      }
    },
    [uid]
  );

  useEffect(
    () =>
      onSnapshot(
        coleccion(),
        (snap) => {
          // el id del documento es la fecha, así que hay un peso por día
          setPesos(snap.docs.map((d) => ({ ...d.data(), fecha: d.id })).sort((a, b) => a.fecha.localeCompare(b.fecha)));
          setFallo("");
          setCargando(false);
        },
        () => {
          setFallo("No se pudo leer el registro de peso. Revisa tu conexión.");
          setCargando(false);
        }
      ),
    [coleccion]
  );

  const guardar = useCallback(
    async (datos, fechaPrevia) => {
      setEditando(null);
      setAbierto(false);
      try {
        await setDoc(doc(coleccion(), datos.fecha), { kg: datos.kg, comentario: datos.comentario });
        // si la edición movió el registro de día, el documento viejo sobra
        if (fechaPrevia && fechaPrevia !== datos.fecha) await deleteDoc(doc(coleccion(), fechaPrevia));
      } catch (e) {
        setFallo("No se pudo guardar el peso. Revisa tu conexión.");
      }
    },
    [coleccion]
  );

  const eliminar = useCallback(
    async (fecha) => {
      if (editando === fecha) {
        setEditando(null);
        setAbierto(false);
      }
      try {
        await deleteDoc(doc(coleccion(), fecha));
      } catch (e) {
        setFallo("No se pudo eliminar el registro. Revisa tu conexión.");
      }
    },
    [editando, coleccion]
  );

  const resumen = useMemo(() => {
    if (!pesos.length) return null;
    const ultimo = pesos[pesos.length - 1];
    const previo = pesos[pesos.length - 2];
    const hace30 = new Date();
    hace30.setDate(hace30.getDate() - 30);
    const iso30 = isoLocal(hace30);
    // el registro más reciente de hace treinta días o más
    const ref30 = [...pesos].reverse().find((p) => p.fecha <= iso30);
    return {
      ultimo,
      difPrevio: previo ? ultimo.kg - previo.kg : null,
      dif30: ref30 ? ultimo.kg - ref30.kg : null,
      imc: estatura ? imcDe(ultimo.kg, estatura) : null,
    };
  }, [pesos, estatura]);

  const editado = editando ? pesos.find((p) => p.fecha === editando) : null;

  if (cargando) return <p className="en-vacio">Cargando el registro de peso…</p>;

  return (
    <>
      {fallo && <p className="en-error">{fallo}</p>}

      {resumen && (
        <div className="en-metricas" data-cols="2">
          <div className="en-metrica">
            <b>{cifra(resumen.ultimo.kg)}<i style={{ fontStyle: "normal", color: "var(--tenue)", fontSize: 14 }}> kg</i></b>
            <span>último peso</span>
            <em className="en-comp">{etiquetaFecha(resumen.ultimo.fecha).toLowerCase()}</em>
          </div>
          <div className="en-metrica">
            <b>{resumen.imc === null ? "—" : cifra(resumen.imc)}</b>
            <span>imc</span>
            <em className="en-comp">{resumen.imc === null ? "falta la estatura" : tramoDe(resumen.imc)}</em>
          </div>
          <div className="en-metrica">
            <b>{resumen.difPrevio === null ? "—" : conSigno(resumen.difPrevio)}</b>
            <span>desde el anterior</span>
          </div>
          <div className="en-metrica">
            <b>{resumen.dif30 === null ? "—" : conSigno(resumen.dif30)}</b>
            <span>en 30 días</span>
          </div>
        </div>
      )}

      {pidiendoEstatura ? (
        <Estatura inicial={estatura} onGuardar={guardarEstatura} onCancelar={() => setPidiendoEstatura(false)} />
      ) : (
        <p className="en-estatura">
          {estatura ? `Estatura ${estatura} cm` : "Agrega tu estatura para calcular el IMC"}
          <button className="en-op" onClick={() => setPidiendoEstatura(true)}>
            {estatura ? "cambiar" : "agregar"}
          </button>
        </p>
      )}

      {pesos.length >= 2 ? (
        <>
          <Curva pesos={pesos} estatura={estatura} />
          <Variacion pesos={pesos} />
        </>
      ) : pesos.length === 1 ? (
        <p className="en-vacio" style={{ marginTop: 10 }}>
          Con un segundo registro aparecen la curva de evolución y la variación por mes.
        </p>
      ) : null}

      {!abierto && (
        <button className="en-abrir" onClick={() => setAbierto(true)}>
          + Registrar peso
        </button>
      )}

      {abierto && (
        <Formulario
          key={editando || "nuevo"}
          inicial={editado}
          onGuardar={guardar}
          onCancelar={() => {
            setAbierto(false);
            setEditando(null);
          }}
        />
      )}

      {pesos.length === 0 ? (
        <p className="en-vacio" style={{ marginTop: 10 }}>
          Sin registros de peso todavía. Con dos o más aparece la curva de evolución.
        </p>
      ) : (
        <ul className="en-pesos">
          {[...pesos].reverse().map((p, i, todos) => {
            const previo = todos[i + 1];
            return (
              <li key={p.fecha}>
                <div className="en-peso-linea">
                  <b>{cifra(p.kg)} kg</b>
                  {previo && <span className="en-delta">{conSigno(p.kg - previo.kg)}</span>}
                  <time>{etiquetaFecha(p.fecha)}</time>
                </div>
                {p.comentario && <p className="en-coment">{p.comentario}</p>}
                <div className="en-ops">
                  <button
                    className="en-op"
                    onClick={() => {
                      setEditando(p.fecha);
                      setAbierto(true);
                    }}
                  >
                    Editar
                  </button>
                  <Eliminar onConfirmar={() => eliminar(p.fecha)} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/* ─────────────────────────── curva ─────────────────────────── */

function Curva({ pesos, estatura }) {
  const W = 300;
  const H = 108;
  const P = 9;

  const xs = pesos.map((p) => desdeIso(p.fecha).getTime());
  const kgs = pesos.map((p) => p.kg);
  const minX = xs[0];
  const maxX = xs[xs.length - 1];
  const minY = Math.min(...kgs);
  const maxY = Math.max(...kgs);
  // un margen sobre el rango real: con pesos entre 74 y 79 una escala desde
  // cero aplanaría la curva hasta volverla ilegible
  const margen = (maxY - minY || 1) * 0.2;
  const y0 = minY - margen;
  const y1 = maxY + margen;

  const px = (t) => (maxX === minX ? W / 2 : P + ((t - minX) / (maxX - minX)) * (W - 2 * P));
  const py = (k) => P + (1 - (k - y0) / (y1 - y0)) * (H - 2 * P);
  const puntos = pesos.map((p, i) => [px(xs[i]), py(p.kg)]);
  // los umbrales de IMC traducidos a kilos con la estatura, si caen en el rango dibujado
  const referencias = estatura
    ? [18.5, 25, 30]
        .map((imc) => ({ imc, kg: pesoParaImc(imc, estatura) }))
        .filter((r) => r.kg > y0 && r.kg < y1)
    : [];
  const linea = puntos.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${puntos[0][0].toFixed(1)},${H - P} ${linea} ${puntos[puntos.length - 1][0].toFixed(1)},${H - P}`;
  const corta = (iso) => `${desdeIso(iso).getDate()} ${MESES[desdeIso(iso).getMonth()].slice(0, 3)}`;

  return (
    <section className="en-bloque">
      <div className="en-bloque-top">
        <h3>Evolución</h3>
        <em>{pesos.length} registros</em>
      </div>
      <svg
        className="en-curva"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Evolución del peso entre ${cifra(minY)} y ${cifra(maxY)} kilos, desde el ${corta(pesos[0].fecha)} hasta el ${corta(pesos[pesos.length - 1].fecha)}.`}
      >
        <defs>
          <linearGradient id="en-relleno" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4FC3D9" stopOpacity=".28" />
            <stop offset="100%" stopColor="#4FC3D9" stopOpacity="0" />
          </linearGradient>
        </defs>
        {referencias.map((r) => (
          <line
            key={r.imc}
            x1="0"
            x2={W}
            y1={py(r.kg)}
            y2={py(r.kg)}
            stroke="#7EA2B0"
            strokeWidth="0.7"
            strokeDasharray="3 3"
            opacity=".55"
          />
        ))}
        <polygon points={area} fill="url(#en-relleno)" />
        <polyline points={linea} fill="none" stroke="#4FC3D9" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
        {puntos.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2" fill="#4FC3D9" />
        ))}
      </svg>
      <div className="en-eje" style={{ justifyContent: "space-between" }}>
        <span style={{ textAlign: "left" }}>{corta(pesos[0].fecha)}</span>
        <span>mín {cifra(minY)} · máx {cifra(maxY)}</span>
        <span style={{ textAlign: "right" }}>{corta(pesos[pesos.length - 1].fecha)}</span>
      </div>
      {referencias.length > 0 && (
        <p className="en-nota" style={{ margin: "10px 0 0" }}>
          {referencias.length === 1 ? "La línea punteada marca" : "Las líneas punteadas marcan"}{" "}
          {referencias.map((r) => `IMC ${breve(r.imc)} (${cifra(r.kg)} kg)`).join(referencias.length === 2 ? " y " : ", ")}{" "}
          para tu estatura.
        </p>
      )}
    </section>
  );
}

/* ─────────────────────────── variación por mes ─────────────────────────── */

// cuánto cambió el peso dentro de cada mes: la curva muestra el nivel,
// esto muestra el ritmo, que es lo que la curva no deja leer de un vistazo
function Variacion({ pesos }) {
  const meses = [];
  const hoy = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const prefijo = `${d.getFullYear()}-${dosDig(d.getMonth() + 1)}`;
    const delMes = pesos.filter((p) => p.fecha.startsWith(prefijo));
    // se compara contra el último registro anterior al mes, no contra el primero
    // del mes: si no te pesaste el día 1, el cambio empezó antes
    const previos = pesos.filter((p) => p.fecha < `${prefijo}-01`);
    const base = previos.length ? previos[previos.length - 1].kg : delMes.length ? delMes[0].kg : null;
    meses.push({
      eje: MESES[d.getMonth()].slice(0, 3),
      valor: delMes.length && base !== null ? delMes[delMes.length - 1].kg - base : null,
      descripcion: `${MESES[d.getMonth()]} de ${d.getFullYear()}`,
    });
  }

  const max = Math.max(...meses.map((m) => Math.abs(m.valor || 0)), 0.5);

  return (
    <section className="en-bloque">
      <div className="en-bloque-top">
        <h3>Variación por mes</h3>
        <em>últimos 6 meses</em>
      </div>
      <div className="en-gr2">
        {meses.map((m, i) => (
          <div
            className="en-col2"
            key={i}
            title={`${m.descripcion}: ${m.valor === null ? "sin registros" : conSigno(m.valor) + " kg"}`}
          >
            <div className="en-mitad" data-lado="arriba">
              {m.valor > 0 && <div className="en-barra" style={{ height: `${(m.valor / max) * 100}%` }} />}
            </div>
            <div className="en-mitad" data-lado="abajo">
              {m.valor < 0 && <div className="en-barra" style={{ height: `${(-m.valor / max) * 100}%` }} />}
            </div>
          </div>
        ))}
      </div>
      <div className="en-eje">
        {meses.map((m, i) => (
          <span key={i}>{m.eje}</span>
        ))}
      </div>
      <div className="en-eje" style={{ marginTop: 2 }}>
        {meses.map((m, i) => (
          <span key={i} style={{ color: "var(--texto)", opacity: m.valor === null ? 0.35 : 1 }}>
            {m.valor === null ? "—" : conSigno(m.valor)}
          </span>
        ))}
      </div>
    </section>
  );
}

function Estatura({ inicial, onGuardar, onCancelar }) {
  const [cm, setCm] = useState(inicial ? String(inicial) : "");
  const [error, setError] = useState("");

  function enviar() {
    const n = parseInt(cm, 10);
    if (!isFinite(n) || n < 100 || n > 250) return setError("Escribe la estatura en centímetros, por ejemplo 178.");
    onGuardar(n);
  }

  return (
    <div className="en-form">
      <div className="en-form-top">
        <h3>Estatura</h3>
        <button className="en-cerrar" onClick={onCancelar} aria-label="Cerrar">×</button>
      </div>
      <div className="en-campo">
        <label className="en-label" htmlFor="en-cm">Centímetros</label>
        <input
          id="en-cm"
          className="en-input"
          type="text"
          inputMode="numeric"
          placeholder="178"
          value={cm}
          onChange={(e) => setCm(e.target.value)}
        />
      </div>
      {error && <p className="en-error">{error}</p>}
      <p className="en-nota">Se guarda una vez y se usa solo para calcular el IMC.</p>
      <div className="en-acciones">
        <button className="en-guardar" onClick={enviar}>Guardar</button>
        <button className="en-secund" onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  );
}

/* ─────────────────────────── piezas ─────────────────────────── */

function Eliminar({ onConfirmar }) {
  const [confirmar, setConfirmar] = useState(false);
  if (!confirmar)
    return (
      <button className="en-op" data-peligro="1" onClick={() => setConfirmar(true)}>
        Eliminar
      </button>
    );
  return (
    <>
      <button className="en-op" data-peligro="1" onClick={onConfirmar}>Confirmar</button>
      <button className="en-op" onClick={() => setConfirmar(false)}>Cancelar</button>
    </>
  );
}

function Formulario({ inicial, onGuardar, onCancelar }) {
  const [fecha, setFecha] = useState(inicial?.fecha || isoLocal(new Date()));
  const [kg, setKg] = useState(inicial ? String(inicial.kg).replace(".", ",") : "");
  const [comentario, setComentario] = useState(inicial?.comentario || "");
  const [error, setError] = useState("");
  const caja = useRef(null);

  useEffect(() => {
    caja.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  function enviar() {
    if (!fecha) return setError("Indica la fecha del registro.");
    const n = parseFloat(kg.replace(",", "."));
    if (!isFinite(n)) return setError("Escribe el peso en kilos, por ejemplo 78,4.");
    if (n < 20 || n > 400) return setError("El peso debe estar entre 20 y 400 kilos.");
    setError("");
    onGuardar({ fecha, kg: Math.round(n * 10) / 10, comentario: comentario.trim() }, inicial?.fecha);
  }

  return (
    <div className="en-form" ref={caja}>
      <div className="en-form-top">
        <h3>{inicial ? "Editar peso" : "Nuevo peso"}</h3>
        <button className="en-cerrar" onClick={onCancelar} aria-label="Cerrar">×</button>
      </div>

      <div className="en-campo en-dos">
        <div>
          <label className="en-label" htmlFor="en-pfecha">Fecha</label>
          <input id="en-pfecha" className="en-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div>
          <label className="en-label" htmlFor="en-kg">Peso (kg)</label>
          <input
            id="en-kg"
            className="en-input"
            type="text"
            inputMode="decimal"
            placeholder="78,4"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
          />
        </div>
      </div>

      <div className="en-campo">
        <label className="en-label" htmlFor="en-pcom">Comentario</label>
        <textarea
          id="en-pcom"
          className="en-input"
          placeholder="En ayunas, después de entrenar…"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
        />
      </div>

      {error && <p className="en-error">{error}</p>}

      <p className="en-nota">Se guarda un peso por día: registrar otro en la misma fecha reemplaza el anterior.</p>

      <div className="en-acciones">
        <button className="en-guardar" onClick={enviar}>
          {inicial ? "Guardar cambios" : "Registrar peso"}
        </button>
        <button className="en-secund" onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  );
}
