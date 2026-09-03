import React, { useCallback, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { NIVELES, SENALES, diaAnterior, horaActual, isoLocal } from "./datos.js";

const cifra = (n) => n.toFixed(1).replace(".", ",");

const media = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
function desviacion(xs) {
  if (xs.length < 2) return 0;
  const m = media(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}
// heurística, no un test formal: la diferencia se considera ruido mientras no
// supere dos veces el error estándar combinado de los dos grupos
function sinDiferenciaClara(a, b) {
  const dif = Math.abs(media(a) - media(b));
  const se = Math.sqrt(desviacion(a) ** 2 / a.length + desviacion(b) ** 2 / b.length);
  return dif < 2 * se || dif === 0;
}

const MIN_DIAS = 10;
const MIN_GRUPO = 3;

export default function Comodidad({ uid, registros, sesiones, horaRecordatorio }) {
  const [senales, setSenales] = useState([]);
  const [comentario, setComentario] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState("");
  const [pidiendoHora, setPidiendoHora] = useState(false);

  const coleccion = useCallback(() => collection(db, "usuarios", uid, "comodidad"), [uid]);
  const hoy = isoLocal(new Date());
  const deHoy = registros.filter((r) => r.fecha === hoy);

  const registrar = useCallback(
    async (nivel) => {
      setGuardando(true);
      try {
        await addDoc(coleccion(), {
          fecha: isoLocal(new Date()),
          hora: horaActual(),
          nivel,
          senales,
          comentario: comentario.trim(),
        });
        setSenales([]);
        setComentario("");
      } catch (e) {
        setFallo("No se pudo guardar el registro. Revisa tu conexión.");
      } finally {
        setGuardando(false);
      }
    },
    [coleccion, senales, comentario]
  );

  const eliminar = useCallback(
    async (id) => {
      try {
        await deleteDoc(doc(coleccion(), id));
      } catch (e) {
        setFallo("No se pudo eliminar el registro. Revisa tu conexión.");
      }
    },
    [coleccion]
  );

  const guardarHora = useCallback(
    async (hora) => {
      setPidiendoHora(false);
      try {
        await setDoc(doc(db, "usuarios", uid), { horaRecordatorio: hora }, { merge: true });
      } catch (e) {
        setFallo("No se pudo guardar la hora. Revisa tu conexión.");
      }
    },
    [uid]
  );

  return (
    <>
      {fallo && <p className="en-error">{fallo}</p>}

      <section className="en-bloque" style={{ marginTop: 0 }}>
        <div className="en-bloque-top">
          <h3>¿Cómo se siente tu cuerpo ahora?</h3>
        </div>
        <div className="en-senales">
          {SENALES.map((s) => (
            <button
              key={s.id}
              className="en-senal"
              data-on={senales.includes(s.id) ? "1" : "0"}
              aria-pressed={senales.includes(s.id)}
              onClick={() =>
                setSenales((xs) => (xs.includes(s.id) ? xs.filter((x) => x !== s.id) : [...xs, s.id]))
              }
            >
              {s.label}
            </button>
          ))}
        </div>
        <input
          className="en-input"
          style={{ margin: "12px 0" }}
          placeholder="Comentario (opcional)"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
        />
        <div className="en-niveles">
          {NIVELES.map((n) => (
            <button
              key={n.valor}
              className="en-nivel"
              disabled={guardando}
              aria-label={`Registrar nivel ${n.valor}: ${n.label}`}
              onClick={() => registrar(n.valor)}
            >
              <b>{n.valor}</b>
              <span>{n.label}</span>
            </button>
          ))}
        </div>
        <p className="en-nota" style={{ margin: "11px 0 0" }}>
          Tocar un nivel guarda el registro con la fecha y la hora de ahora. Sensación física,
          no apariencia.
        </p>
      </section>

      {deHoy.length > 0 && (
        <ul className="en-pesos">
          {deHoy.map((r) => (
            <li key={r.id}>
              <div className="en-peso-linea">
                <b>{r.nivel} · {NIVELES[r.nivel - 1].label}</b>
                <time>hoy {r.hora}</time>
              </div>
              {(r.senales?.length > 0 || r.comentario) && (
                <p className="en-coment">
                  {[...(r.senales || []).map((id) => SENALES.find((s) => s.id === id)?.label || id), r.comentario]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              <div className="en-ops">
                <Eliminar onConfirmar={() => eliminar(r.id)} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {pidiendoHora ? (
        <FormularioHora inicial={horaRecordatorio} onGuardar={guardarHora} onCancelar={() => setPidiendoHora(false)} />
      ) : (
        <p className="en-estatura">
          Registro pendiente visible desde las {horaRecordatorio}
          <button className="en-op" onClick={() => setPidiendoHora(true)}>cambiar</button>
        </p>
      )}
      <p className="en-nota" style={{ textAlign: "center", margin: "6px 0 0" }}>
        La web no puede enviar notificaciones a hora fija sin un servidor. Ponte una alarma
        diaria a esa hora: al abrir la app, registrar es un toque.
      </p>

      <Comparaciones registros={registros} sesiones={sesiones} />
    </>
  );
}

/* ─────────────────────────── comparaciones ─────────────────────────── */

function Comparaciones({ registros, sesiones }) {
  const datos = useMemo(() => {
    /* comodidad media por día */
    const porDia = {};
    registros.forEach((r) => (porDia[r.fecha] = porDia[r.fecha] ? [...porDia[r.fecha], r.nivel] : [r.nivel]));
    const dias = Object.entries(porDia).map(([fecha, niveles]) => ({ fecha, nivel: media(niveles) }));
    const conSesion = new Set(sesiones.map((s) => s.fecha));

    const trasSesion = dias.filter((d) => conSesion.has(diaAnterior(d.fecha))).map((d) => d.nivel);
    const trasDescanso = dias.filter((d) => !conSesion.has(diaAnterior(d.fecha))).map((d) => d.nivel);
    const diaCon = dias.filter((d) => conSesion.has(d.fecha)).map((d) => d.nivel);
    const diaSin = dias.filter((d) => !conSesion.has(d.fecha)).map((d) => d.nivel);
    const lataAntes = sesiones.filter((s) => s.lata_antes != null).map((s) => s.lata_antes);
    const lataDespues = sesiones.filter((s) => s.lata_despues != null).map((s) => s.lata_despues);

    return { nDias: dias.length, trasSesion, trasDescanso, diaCon, diaSin, lataAntes, lataDespues };
  }, [registros, sesiones]);

  return (
    <>
      <Comparacion
        titulo="Al día siguiente"
        nota="comodidad según el día anterior"
        grupos={[
          { label: "tras entrenar", valores: datos.trasSesion },
          { label: "tras descansar", valores: datos.trasDescanso },
        ]}
        nDias={datos.nDias}
      />
      <Comparacion
        titulo="El mismo día"
        nota="comodidad según si hubo sesión"
        grupos={[
          { label: "con sesión", valores: datos.diaCon },
          { label: "sin sesión", valores: datos.diaSin },
        ]}
        nDias={datos.nDias}
      />
      <Comparacion
        titulo="La lata"
        nota="anticipada frente a la real"
        grupos={[
          { label: "antes", valores: datos.lataAntes },
          { label: "en realidad", valores: datos.lataDespues },
        ]}
        nDias={null}
        unidad="sesiones"
        escala="Escala de 1 (nada de lata) a 5 (muchísima)."
      />
    </>
  );
}

function Comparacion({ titulo, nota, grupos, nDias, unidad = "días", escala = "Escala de 1 (muy incómodo) a 5 (muy cómodo)." }) {
  const [a, b] = grupos;
  // sin datos suficientes no hay comparación: mostrar promedios de grupos
  // minúsculos invita a leer ruido como resultado
  const faltanDias = nDias !== null && nDias < MIN_DIAS;
  const faltanGrupos = a.valores.length < MIN_GRUPO || b.valores.length < MIN_GRUPO;

  return (
    <section className="en-bloque">
      <div className="en-bloque-top">
        <h3>{titulo}</h3>
        <em>{nota}</em>
      </div>
      {faltanDias ? (
        <p className="en-nota" style={{ margin: 0 }}>
          Faltan {MIN_DIAS - nDias} {MIN_DIAS - nDias === 1 ? "día" : "días"} de registro para comparar.
        </p>
      ) : faltanGrupos ? (
        <p className="en-nota" style={{ margin: 0 }}>
          Faltan {unidad} en el grupo «{(a.valores.length < MIN_GRUPO ? a : b).label}» (hay{" "}
          {Math.min(a.valores.length, b.valores.length)} de {MIN_GRUPO}).
        </p>
      ) : (
        <>
          {grupos.map((g) => (
            <div className="en-comp-fila" key={g.label}>
              <span>{g.label}</span>
              <div><i style={{ width: `${(media(g.valores) / 5) * 100}%` }} /></div>
              <b>{cifra(media(g.valores))} · n={g.valores.length}</b>
            </div>
          ))}
          <p className="en-nota" style={{ margin: "9px 0 0" }}>
            {escala}
            {sinDiferenciaClara(a.valores, b.valores) && " Sin diferencia clara todavía."}
          </p>
        </>
      )}
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

function FormularioHora({ inicial, onGuardar, onCancelar }) {
  const [hora, setHora] = useState(inicial);
  return (
    <div className="en-form">
      <div className="en-form-top">
        <h3>Hora del recordatorio</h3>
        <button className="en-cerrar" onClick={onCancelar} aria-label="Cerrar">×</button>
      </div>
      <div className="en-campo">
        <label className="en-label" htmlFor="en-hrec">Desde esta hora la app avisa si falta el registro</label>
        <input id="en-hrec" className="en-input" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
      </div>
      <div className="en-acciones">
        <button className="en-guardar" onClick={() => hora && onGuardar(hora)}>Guardar</button>
        <button className="en-secund" onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  );
}
