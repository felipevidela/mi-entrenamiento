import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { MESES, desdeIso, etiquetaFecha, isoLocal } from "./datos.js";

const cifra = (n) => n.toFixed(1).replace(".", ",");
const conSigno = (n) => (n > 0 ? "+" : n < 0 ? "-" : "") + cifra(Math.abs(n));

export default function Peso({ uid }) {
  const [pesos, setPesos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null);

  const coleccion = useCallback(() => collection(db, "usuarios", uid, "pesos"), [uid]);

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
    };
  }, [pesos]);

  const editado = editando ? pesos.find((p) => p.fecha === editando) : null;

  if (cargando) return <p className="en-vacio">Cargando el registro de peso…</p>;

  return (
    <>
      {fallo && <p className="en-error">{fallo}</p>}

      {resumen && (
        <div className="en-metricas" data-cols="3">
          <div className="en-metrica">
            <b>{cifra(resumen.ultimo.kg)}<i style={{ fontStyle: "normal", color: "var(--tenue)", fontSize: 14 }}> kg</i></b>
            <span>último peso</span>
            <em className="en-comp">{etiquetaFecha(resumen.ultimo.fecha).toLowerCase()}</em>
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

      {pesos.length >= 2 && <Curva pesos={pesos} />}

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

function Curva({ pesos }) {
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
    </section>
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
