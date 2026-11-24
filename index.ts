// ORIGEN · Edge Function "asistente" v1.3 · 2026-11-24 · puede SACAR tareas, reuniones y producciones, mover reuniones/producciones, usa horas y duración y evita choques de horario (v1.2 · 2026-11-18)
// Convierte lo que escribe el equipo en acciones PROPUESTAS: avances, tareas nuevas,
// tareas hechas, tareas reprogramadas, publicaciones (y recomendaciones de contenido),
// producciones y reuniones. También puede ordenar el día en un plan.
// No guarda nada: el portal muestra la propuesta y el equipo confirma.
// Requiere el secreto DEEPSEEK_API_KEY. Solo responde a usuarios del equipo.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const ORIGENES = ['https://agencia-origen.online', 'https://www.agencia-origen.online'];
const TIPOS = ['avance', 'tarea', 'completar', 'reprogramar', 'eliminar', 'contenido', 'produccion', 'evento'];
const REDES = ['instagram', 'facebook', 'tiktok', 'youtube', 'web'];
const FORMATOS = ['reel', 'carrusel', 'post', 'historia', 'video'];
const PRIOR = ['baja', 'media', 'alta'];
const EST_TAREA = ['pendiente', 'en_curso'];
const EV_TIPOS = ['reunion', 'llamada', 'entrega', 'otro'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ORIGENES.includes(origin) ? origin : ORIGENES[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});

const txt = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '') || null;
const fecha = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) ? v : null);
const hora = (v: unknown) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : null);
const uno = (v: unknown, lista: string[]) => (typeof v === 'string' && lista.includes(v.toLowerCase()) ? v.toLowerCase() : null);
const dur = (v: unknown) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 5 && n <= 1440 ? n : null; };
const aMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const sumar = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

Deno.serve(async (req) => {
  const H = { ...cors(req.headers.get('Origin')), 'Content-Type': 'application/json' };
  const resp = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: H });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: H });
  if (req.method !== 'POST') return resp({ error: 'Método no permitido' }, 405);

  const key = Deno.env.get('DEEPSEEK_API_KEY');
  if (!key) return resp({ error: 'Falta configurar la clave de DeepSeek' }, 503);

  // Supabase con el login de quien llama: las reglas (RLS) se aplican igual que en el portal
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: equipo } = await sb.rpc('es_equipo');
  if (equipo !== true) return resp({ error: 'Solo para el equipo de ORIGEN' }, 403);

  let body: { texto?: unknown; hoy?: unknown };
  try { body = await req.json(); } catch { return resp({ error: 'Pedido inválido' }, 400); }
  const texto = txt(body.texto, 3000);
  if (!texto) return resp({ error: 'Escribí qué pasó o qué hay que hacer' }, 400);
  const hoy = fecha(body.hoy) ?? new Date().toISOString().slice(0, 10);

  const { data: { user } } = await sb.auth.getUser();
  const [cl, us, adn, ta, co, ev, pr] = await Promise.all([
    sb.from('clientes').select('id,nombre,negocio,plan_nombre,pausado,rubro'),
    sb.from('usuarios').select('id,nombre,rol,auth_id').eq('activo', true),
    sb.from('marca_adn').select('cliente_id,descripcion,tono,publico,servicios,restricciones'),
    sb.from('tareas').select('*').eq('hecha', false).order('fecha_limite', { nullsFirst: false }).limit(80),
    sb.from('contenidos').select('cliente_id,fecha,titulo,formato,red,estado').gte('fecha', sumar(hoy, -45)).lte('fecha', sumar(hoy, 45)).order('fecha').limit(120),
    sb.from('eventos').select('id,cliente_id,titulo,fecha,hora,duracion_min,tipo').gte('fecha', hoy).lte('fecha', sumar(hoy, 45)).order('fecha').order('hora').limit(60),
    sb.from('producciones').select('id,cliente_id,fecha,hora,duracion_min,ubicacion').gte('fecha', hoy).lte('fecha', sumar(hoy, 45)).order('fecha').order('hora').limit(60),
  ]);
  const clientes = cl.data ?? [], usuarios = us.data ?? [], tareas = ta.data ?? [], contenidos = co.data ?? [], eventos = ev.data ?? [], prods = pr.data ?? [];
  const yo = usuarios.find((u) => u.auth_id === user?.id);
  const adnDe = new Map((adn.data ?? []).map((a) => [String(a.cliente_id), a]));
  const nombreCli = new Map(clientes.map((c) => [String(c.id), c.negocio || c.nombre]));
  const nombreUsr = new Map(usuarios.map((u) => [String(u.id), u.nombre]));
  const idsCli = new Set(nombreCli.keys()), idsUsr = new Set(nombreUsr.keys());
  // Lo existente se nombra T1, E1, P1…: así la IA nunca inventa un id real
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = new Map<string, any>();
  tareas.forEach((t, i) => ref.set(`T${i + 1}`, { ...t, _k: 'tarea', _tabla: 'tareas' }));
  eventos.forEach((e, i) => ref.set(`E${i + 1}`, { ...e, _k: 'evento', _tabla: 'eventos', texto: e.titulo }));
  prods.forEach((p, i) => ref.set(`P${i + 1}`, { ...p, _k: 'produccion', _tabla: 'producciones', titulo: 'Producción' + (p.ubicacion ? ` en ${p.ubicacion}` : ''), texto: null }));
  const hh = (x: { hora?: string | null }) => (x.hora ? String(x.hora).slice(0, 5) : null);

  const listaCli = clientes.map((c) => {
    const a = adnDe.get(String(c.id));
    const marca = a ? ` | marca: ${[a.descripcion, a.servicios && 'ofrece: ' + a.servicios, a.publico && 'público: ' + a.publico, a.tono && 'tono: ' + a.tono, a.restricciones && 'NUNCA: ' + a.restricciones].filter(Boolean).join('; ').slice(0, 500)}` : '';
    return `- id ${c.id}: ${c.negocio || c.nombre}${c.rubro ? ` (${c.rubro})` : ''}${c.plan_nombre ? ` · plan ${c.plan_nombre}` : ''}${c.pausado ? ' · PAUSADO' : ''}${marca}`;
  }).join('\n');
  const listaUsr = usuarios.map((u) => `- id ${u.id}: ${u.nombre} (${u.rol ?? 'equipo'})`).join('\n');
  const listaTar = [...ref].filter(([, t]) => t._k === 'tarea').map(([r, t]) => `- ${r}: ${t.titulo || t.texto} | ${nombreCli.get(String(t.cliente_id)) ?? 'interna'} | vence ${t.fecha_limite ?? 'sin fecha'}${hh(t) ? ' ' + hh(t) + (t.duracion_min ? ` (${t.duracion_min} min)` : '') : ''}${t.fecha_limite && t.fecha_limite < hoy ? ' (VENCIDA)' : ''} | prioridad ${t.prioridad ?? 'media'}${t.estado === 'en_curso' ? ' | en curso' : ''} | ${nombreUsr.get(String(t.responsable_id)) ?? 'sin asignar'}`).join('\n');
  const listaAgenda = [...ref].filter(([, t]) => t._k !== 'tarea').map(([r, t]) => `- ${r}: ${t.fecha}${hh(t) ? ' ' + hh(t) + (t.duracion_min ? ` (${t.duracion_min} min)` : '') : ' (sin hora)'} | ${t._k === 'evento' ? 'reunión' : 'producción'}: ${t.titulo} | ${nombreCli.get(String(t.cliente_id)) ?? 'interna'}`).join('\n');
  const listaCont = contenidos.map((c) => `- ${c.fecha} | ${nombreCli.get(String(c.cliente_id)) ?? '?'} | ${c.red ?? ''} ${c.formato ?? ''} | ${c.titulo ?? ''} | ${c.estado ?? ''}`).join('\n');
  const d = new Date(hoy + 'T12:00:00');
  const ahora = new Date().toLocaleTimeString('en-GB', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' });

  const system = `Sos el asistente de gestión de ORIGEN, agencia de marketing y producción audiovisual de Puerto Iguazú (Misiones, Argentina; triple frontera, turismo de Cataratas).
Convertís lo que te cuenta el equipo en registros ordenados, mantenés las tareas al día y recomendás contenido. Hoy es ${DIAS[d.getDay()]} ${hoy}, son las ${ahora} (hora de Argentina). Escribe: ${yo?.nombre ?? 'alguien del equipo'} (id ${yo?.id ?? 'desconocido'}).

CLIENTES:
${listaCli || '(sin clientes)'}

EQUIPO:
${listaUsr || '(sin equipo)'}

TAREAS ABIERTAS (referencialas por su código T…):
${listaTar || '(ninguna)'}

AGENDA OCUPADA (reuniones y producciones próximas; referencialas por E… o P…). Mientras dura una producción o reunión NO se puede hacer otra cosa:
${listaAgenda || '(nada agendado)'}

PUBLICACIONES RECIENTES Y PRÓXIMAS (para no repetir ideas y ver huecos):
${listaCont || '(ninguna)'}

ACCIONES POSIBLES (usá solo estos campos):
- "avance": algo YA hecho que el cliente puede ver. {tipo, cliente_id, texto (cálido y breve, 1ra persona plural, para el cliente)}
- "tarea": algo NUEVO pendiente. {tipo, cliente_id|null, titulo, fecha_limite (YYYY-MM-DD), hora ("HH:MM"|null, solo si ocupa un horario concreto), duracion_min (5 a 1440|null), responsable_id|null, prioridad ("baja"|"media"|"alta")}
- "completar": una tarea existente que ya se hizo. {tipo, ref ("T3"), avance (opcional: texto para que lo vea el cliente, o null si es interna)}
- "reprogramar": cambiar algo existente. Si ref es una tarea (T…): {tipo, ref, fecha_limite|null, hora|null, duracion_min|null, prioridad|null, responsable_id|null, estado ("pendiente"|"en_curso")|null}. Si ref es una reunión o producción (E… o P…): {tipo, ref, fecha|null, hora|null, duracion_min|null}
- "eliminar": SACAR una tarea, reunión o producción que ya no corresponde (cancelada, duplicada, que el equipo pide borrar). {tipo, ref ("T3", "E1" o "P2")}. Solo si lo piden claramente; si es una tarea que ya se hizo usá "completar".
- "contenido": publicación para el calendario o recomendación. {tipo, cliente_id, fecha, red (${REDES.join('|')}), formato (${FORMATOS.join('|')}), titulo (gancho concreto), idea (qué se muestra y por qué funciona, 1-3 frases)}
- "produccion": sesión de fotos/video a futuro. {tipo, cliente_id, fecha, hora ("HH:MM"|null), duracion_min|null, ubicacion|null}
- "evento": reunión, llamada o entrega. {tipo, cliente_id|null, titulo, fecha, hora|null, duracion_min|null, tipo_evento ("reunion"|"llamada"|"entrega"|"otro")}

REGLAS:
- Identificá clientes y tareas por nombre aproximado ("don aldo" = Don Aldo; "ya edité las fotos" = la tarea de editar fotos). Si hay dudas, no adivines: preguntá en "dudas".
- Si dicen que hicieron algo que coincide con una tarea abierta, usá "completar" (no crees un avance duplicado; poné el texto para el cliente en "avance"). Si no coincide con ninguna, usá "avance".
- Después de algo hecho, proponé las TAREAS QUE SIGUEN con fechas realistas (sesión de fotos → editar en 2 días → armar publicaciones → mandar a aprobar).
- Si piden ordenar, priorizar o "qué hago hoy": devolvé "plan" (lista ordenada de 3 a 8 pasos concretos que citen T…), y si conviene, "reprogramar" lo vencido o lo que no entra hoy. Priorizá: vencido y con fecha cliente > producciones/entregas cercanas > lo que destraba a otros > lo demás.
- Si piden recomendar contenido o armar un calendario: proponé "contenido" con ideas ESPECÍFICAS para ese negocio (usá su marca, el lugar, la temporada, fechas especiales cercanas), variando formatos, sin repetir lo reciente, en días hábiles, nunca más de 20. Respetá lo que la marca nunca hace.
- HORARIOS: nunca propongas algo que se superponga con la AGENDA OCUPADA ni con otra tarea con hora. Si algo choca, elegí otro horario libre (de 08:00 a 20:00, lunes a sábado) o avisalo en "dudas". Para sesiones de fotos y producciones calculá una duración realista (una sesión suele durar 2 a 4 horas; un evento deportivo o torneo, el día entero). Dejá margen de 30 minutos entre compromisos con traslado.
- Si piden SACAR, cancelar, borrar o quitar algo, usá "eliminar" con su ref. Si piden mover algo, "reprogramar". Si dicen que algo está atrasado o que no llegan, ofrecé "reprogramar" con fechas realistas.
- Fechas relativas se calculan desde hoy. Nada en el pasado salvo avances.
- Si no dicen responsable, usá el id de quien escribe. Nunca más de 30 acciones.
- No inventes datos que no surjan del mensaje o de la información de arriba.
- Español rioplatense, con voseo.

Respondé SOLO con JSON: {"resumen": "1-2 frases", "plan": ["paso 1", ...] o null, "dudas": "pregunta o null", "acciones": [ ... ]}`;

  let salida: { resumen?: unknown; plan?: unknown; dudas?: unknown; acciones?: unknown };
  try {
    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: system }, { role: 'user', content: texto }],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 4000,
      }),
      signal: AbortSignal.timeout(80000),
    });
    if (!r.ok) {
      const t = await r.text(); console.error('deepseek', r.status, t);
      const m = r.status === 401 ? 'La clave de DeepSeek no es válida.' : r.status === 402 ? 'La cuenta de DeepSeek no tiene saldo.' : 'DeepSeek no respondió. Probá de nuevo.';
      return resp({ error: m }, 502);
    }
    const j = await r.json();
    salida = JSON.parse(String(j.choices?.[0]?.message?.content ?? '{}').replace(/```(json)?/g, ''));
  } catch (e) {
    console.error(e);
    return resp({ error: 'No pude ordenar eso. Probá escribirlo de otra forma.' }, 502);
  }

  // Validación estricta: solo pasan campos conocidos, ids reales y fechas válidas
  const cid = (v: unknown) => (v != null && idsCli.has(String(v)) ? String(v) : null);
  const uid = (v: unknown) => (v != null && idsUsr.has(String(v)) ? String(v) : null);
  const tar = (v: unknown) => (typeof v === 'string' ? ref.get(v.trim().toUpperCase()) : undefined);
  const tareaRef = (v: unknown) => { const t = tar(v); return t && t._k === 'tarea' ? t : undefined; };
  const vistas = new Set<string>();
  const acciones = (Array.isArray(salida.acciones) ? salida.acciones : []).slice(0, 30).flatMap((a: Record<string, unknown>): Record<string, unknown>[] => {
    const tipo = uno(a?.tipo, TIPOS);
    switch (tipo) {
      case 'avance': { const t = txt(a.texto, 200); return t ? [{ tipo, cliente_id: cid(a.cliente_id), texto: t }] : []; }
      case 'tarea': {
        const t = txt(a.titulo, 200), f = fecha(a.fecha_limite), hr = f ? hora(a.hora) : null;
        return t ? [{ tipo, cliente_id: cid(a.cliente_id), titulo: t, fecha_limite: f, hora: hr, duracion_min: hr ? (dur(a.duracion_min) ?? 30) : null, responsable_id: uid(a.responsable_id) ?? (yo ? String(yo.id) : null), prioridad: uno(a.prioridad, PRIOR) ?? 'media' }] : [];
      }
      case 'completar': {
        const t = tareaRef(a.ref); if (!t || vistas.has('tarea' + t.id)) return []; vistas.add('tarea' + t.id);
        return [{ tipo, tarea_id: t.id, titulo: t.titulo || t.texto, cliente_id: t.cliente_id, avance: t.cliente_id ? txt(a.avance, 200) : null }];
      }
      case 'reprogramar': {
        const t = tar(a.ref); if (!t || vistas.has(t._k + t.id)) return [];
        const cambios: Record<string, unknown> = {}, antes: Record<string, unknown> = {};
        const marca = (k: string, nuevo: unknown) => { if (nuevo != null && nuevo !== t[k]) { cambios[k] = nuevo; antes[k] = t[k] ?? null; } };
        if (t._k === 'tarea') {
          marca('fecha_limite', fecha(a.fecha_limite)); marca('prioridad', uno(a.prioridad, PRIOR)); marca('estado', uno(a.estado, EST_TAREA));
          const u = uid(a.responsable_id); if (u && u !== String(t.responsable_id)) { cambios.responsable_id = u; antes.responsable_id = t.responsable_id ?? null; }
          const hr = hora(a.hora); if (hr && hr !== hh(t)) { cambios.hora = hr; antes.hora = hh(t); cambios.duracion_min = dur(a.duracion_min) ?? t.duracion_min ?? 30; antes.duracion_min = t.duracion_min ?? null; }
          else { const dm = dur(a.duracion_min); if (dm && dm !== t.duracion_min && hh(t)) { cambios.duracion_min = dm; antes.duracion_min = t.duracion_min ?? null; } }
        } else {
          marca('fecha', fecha(a.fecha));
          const hr = hora(a.hora); if (hr && hr !== hh(t)) { cambios.hora = hr; antes.hora = hh(t); }
          const dm = dur(a.duracion_min); if (dm && dm !== t.duracion_min) { cambios.duracion_min = dm; antes.duracion_min = t.duracion_min ?? null; }
        }
        if (!Object.keys(cambios).length) return []; vistas.add(t._k + t.id);
        return [{ tipo, objeto: t._k, tabla: t._tabla, tarea_id: t.id, titulo: t.titulo || t.texto, cliente_id: t.cliente_id, antes, cambios, _t: t }];
      }
      case 'eliminar': {
        const t = tar(a.ref); if (!t || vistas.has(t._k + t.id)) return []; vistas.add(t._k + t.id);
        return [{ tipo, objeto: t._k, tabla: t._tabla, id: t.id, titulo: t.titulo || t.texto, cliente_id: t.cliente_id, fecha: t.fecha_limite ?? t.fecha ?? null }];
      }
      case 'contenido': { const t = txt(a.titulo, 140); return t ? [{ tipo, cliente_id: cid(a.cliente_id), fecha: fecha(a.fecha) ?? hoy, red: uno(a.red, REDES) ?? 'instagram', formato: uno(a.formato, FORMATOS) ?? 'post', titulo: t, idea: txt(a.idea, 600) }] : []; }
      case 'produccion': { const f = fecha(a.fecha), hr = hora(a.hora); return f ? [{ tipo, cliente_id: cid(a.cliente_id), fecha: f, hora: hr, duracion_min: hr ? (dur(a.duracion_min) ?? 180) : null, ubicacion: txt(a.ubicacion, 120) }] : []; }
      case 'evento': { const t = txt(a.titulo, 140), f = fecha(a.fecha), hr = hora(a.hora); return t && f ? [{ tipo, cliente_id: cid(a.cliente_id), titulo: t, fecha: f, hora: hr, duracion_min: hr ? (dur(a.duracion_min) ?? 60) : null, tipo_evento: uno(a.tipo_evento, EV_TIPOS) ?? 'reunion' }] : []; }
      default: return [];
    }
  });
  // Avisa si algo propuesto se superpone con la agenda existente o con otra propuesta del mismo mensaje
  type Bloque = { f: string; ini: number; fin: number; nombre: string; id?: string };
  const ocupado: Bloque[] = [];
  for (const [, t] of ref) {
    const f = t._k === 'tarea' ? t.fecha_limite : t.fecha, h = hh(t);
    if (f && h) ocupado.push({ f, ini: aMin(h), fin: aMin(h) + (t.duracion_min || (t._k === 'tarea' ? 30 : t._k === 'produccion' ? 120 : 60)), nombre: t.titulo || t.texto || 'otro compromiso', id: t._k + t.id });
  }
  const nuevos: Bloque[] = [];
  for (const a of acciones as Record<string, unknown>[]) {
    let f: string | null = null, h: string | null = null, d: number | null = null, nombre = String(a.titulo ?? (a.tipo === 'produccion' ? 'producción' : 'tarea')), id: string | undefined;
    if (a.tipo === 'tarea') { f = a.fecha_limite as string | null; h = a.hora as string | null; d = a.duracion_min as number | null; }
    else if (a.tipo === 'produccion' || a.tipo === 'evento') { f = a.fecha as string; h = a.hora as string | null; d = a.duracion_min as number | null; }
    else if (a.tipo === 'reprogramar') {
      const c = a.cambios as Record<string, unknown>, t = a._t as Record<string, any>;
      f = (c.fecha_limite ?? c.fecha ?? t.fecha_limite ?? t.fecha ?? null) as string | null; h = (c.hora ?? hh(t) ?? null) as string | null;
      d = (c.duracion_min ?? t.duracion_min ?? null) as number | null; id = a.objeto + String(a.tarea_id);
    }
    if (!f || !h) continue;
    const ini = aMin(h), fin = ini + (d ?? 60);
    const otro = [...ocupado, ...nuevos].find((b) => b.f === f && b.id !== id && b.ini < fin && ini < b.fin);
    if (otro) a.choque = `Se superpone con “${otro.nombre}” (${String(Math.floor(otro.ini / 60)).padStart(2, '0')}:${String(otro.ini % 60).padStart(2, '0')})`;
    nuevos.push({ f, ini, fin, nombre, id });
  }
  // En el plan, los códigos T… se reemplazan por el nombre real de la tarea
  const plan = (Array.isArray(salida.plan) ? salida.plan : []).slice(0, 10)
    .map((p) => txt(typeof p === 'string' ? p.replace(/\bT(\d+)\b/g, (m) => `“${ref.get(m)?.titulo ?? ref.get(m)?.texto ?? m}”`) : null, 240))
    .filter(Boolean);

  return resp({ resumen: txt(salida.resumen, 400), plan: plan.length ? plan : null, dudas: txt(salida.dudas, 300), acciones: (acciones as Record<string, unknown>[]).map(({ _t, ...r }) => r) });
});
