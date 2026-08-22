import React, { useMemo } from "react";
import {
  DIAS_LARGO,
  MESES,
  duracion,
  desdeIso,
  formatoDur,
  isoLocal,
  minutos,
  rachaMasLarga,
  tipoDe,
} from "./datos.js";

const SEMANAS = 12;

export default function Analisis({ sesiones }) {
  const datos = useMemo(() => calcular(sesiones), [sesiones]);

  if (!sesiones.length) {
    return (
      <p className="en-vacio">
        Todavía no hay nada que analizar. Registra algunas sesiones y aquí aparecerá cómo se
        reparten en el tiempo, por actividad y por hora del día.
      </p>
    );
  }

  return (
    <>
      <div className="en-metricas" data-cols="2">
        <div className="en-metrica">
          <b>{datos.total}</b>
          <span>sesiones</span>
        </div>
        <div className="en-metrica">
          <b>{formatoDur(datos.minutosTotales)}</b>
          <span>tiempo acumulado</span>
        </div>
        <div className="en-metrica">
          <b>{formatoDur(datos.promedio)}</b>
          <span>promedio por sesión</span>
        </div>
        <div className="en-metrica">
          <b>{datos.mejorRacha}</b>
          <span>racha más larga</span>
        </div>
      </div>

      <Grafico
        titulo="Tiempo por semana"
        nota={`últimas ${SEMANAS} semanas`}
        barras={datos.semanas}
        formato={formatoDur}
      />

      <section className="en-bloque">
        <div className="en-bloque-top">
          <h3>Reparto por actividad</h3>
          <em>todo el historial</em>
        </div>
        <div className="en-reparto">
          {datos.reparto.map((r) => (
            <i
              key={r.id}
              style={{ background: r.color, width: `${r.pct}%` }}
              title={`${r.label}: ${formatoDur(r.min)}`}
            />
          ))}
        </div>
        <ul className="en-lista">
          {datos.reparto.map((r) => (
            <li key={r.id}>
              <i className="en-punto" style={{ background: r.color }} />
              <span>{r.label}</span>
              <b>{formatoDur(r.min)}</b>
              <em>{Math.round(r.pct)}%</em>
            </li>
          ))}
        </ul>
      </section>

      <Grafico
        titulo="Hora habitual"
        nota="según la hora de inicio"
        barras={datos.horas}
        formato={(n) => `${n} ${n === 1 ? "sesión" : "sesiones"}`}
      />

      <Grafico
        titulo="Día de la semana"
        nota="dónde se sostiene y dónde se cae"
        barras={datos.diasSemana}
        formato={(n) => `${n} ${n === 1 ? "sesión" : "sesiones"}`}
      />
    </>
  );
}

/* ─────────────────────────── gráfico de barras ─────────────────────────── */

function Grafico({ titulo, nota, barras, formato }) {
  const max = Math.max(...barras.map((b) => b.valor), 1);
  return (
    <section className="en-bloque">
      <div className="en-bloque-top">
        <h3>{titulo}</h3>
        <em>{nota}</em>
      </div>
      <div className="en-gr" role="img" aria-label={`${titulo}. ${barras.map((b) => `${b.descripcion}: ${formato(b.valor)}`).join(". ")}`}>
        {barras.map((b, i) => (
          <div className="en-col" key={i} title={`${b.descripcion}: ${formato(b.valor)}`}>
            <div
              className="en-barra"
              data-cero={b.valor ? "0" : "1"}
              data-parcial={b.parcial ? "1" : "0"}
              style={{ height: `${b.valor ? Math.max((b.valor / max) * 100, 3) : 0}%` }}
            />
          </div>
        ))}
      </div>
      <div className="en-eje">
        {barras.map((b, i) => (
          <span key={i}>{b.eje}</span>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────── agregación ─────────────────────────── */

function calcular(sesiones) {
  const minutosTotales = sesiones.reduce((a, s) => a + duracion(s), 0);

  /* últimas semanas, de lunes a domingo */
  const lunes = new Date();
  lunes.setHours(0, 0, 0, 0);
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
  const semanas = [];
  for (let i = SEMANAS - 1; i >= 0; i--) {
    const desde = new Date(lunes);
    desde.setDate(desde.getDate() - 7 * i);
    const hasta = new Date(desde);
    hasta.setDate(hasta.getDate() + 7);
    const isoDesde = isoLocal(desde);
    const isoHasta = isoLocal(hasta);
    const valor = sesiones
      .filter((s) => s.fecha >= isoDesde && s.fecha < isoHasta)
      .reduce((a, s) => a + duracion(s), 0);
    semanas.push({
      valor,
      // la semana en curso va atenuada: todavía no termina y compararla
      // con semanas completas se leería como una caída que no ocurrió
      parcial: i === 0,
      // una etiqueta cada tres semanas, para que el eje no se amontone
      eje: i % 3 === 0 ? `${desde.getDate()} ${MESES[desde.getMonth()].slice(0, 3)}` : "",
      descripcion: `semana del ${desde.getDate()} de ${MESES[desde.getMonth()]}${i === 0 ? " (en curso)" : ""}`,
    });
  }

  /* reparto por actividad, ordenado de mayor a menor */
  const porTipo = {};
  sesiones.forEach((s) => (porTipo[s.tipo] = (porTipo[s.tipo] || 0) + duracion(s)));
  const reparto = Object.entries(porTipo)
    .map(([id, min]) => {
      const t = tipoDe(id);
      return { id, label: t.label, color: t.color, min, pct: (min / minutosTotales) * 100 };
    })
    .sort((a, b) => b.min - a.min);

  /* hora de inicio y día de la semana, contando sesiones */
  const horas = Array.from({ length: 24 }, (_, h) => ({
    valor: 0,
    eje: h % 6 === 0 ? `${h}h` : "",
    descripcion: `entre las ${h}:00 y las ${h}:59`,
  }));
  const diasSemana = DIAS_LARGO.map((d) => ({ valor: 0, eje: d[0].toUpperCase(), descripcion: d }));
  sesiones.forEach((s) => {
    horas[Math.floor(minutos(s.inicio) / 60)].valor++;
    diasSemana[(desdeIso(s.fecha).getDay() + 6) % 7].valor++;
  });

  return {
    total: sesiones.length,
    minutosTotales,
    promedio: Math.round(minutosTotales / sesiones.length),
    mejorRacha: rachaMasLarga(sesiones.map((s) => s.fecha)),
    semanas,
    reparto,
    horas,
    diasSemana,
  };
}
