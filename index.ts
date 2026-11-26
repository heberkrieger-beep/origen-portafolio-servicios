// ORIGEN · Edge Function "imagenes" v1.2 · 2026-11-26 · pedir cambios sobre la imagen ya generada · v1.1 · ahora con OpenAI (gpt-image) en vez de Gemini
// Arma flyers, posts e historias usando el ADN de marca del cliente.
// El portal manda SOLO lo que pide el equipo (pieza, formato, textos, referencias); el prompt se arma acá,
// con el ADN guardado en Supabase. Solo equipo. Registra cada pedido en imagenes_gen (control de gasto).
// Secretos: OPENAI_API_KEY (obligatorio) · OPENAI_IMAGE_MODEL (opcional, por defecto gpt-image-1-mini, el más barato)
// · OPENAI_IMAGE_QUALITY (opcional: low, medium o high; por defecto medium).
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const ORIGENES = ['https://agencia-origen.online', 'https://www.agencia-origen.online'];
const PIEZAS: Record<string, string> = {
  promo: 'flyer de promoción u oferta', post: 'post de Instagram', historia: 'historia de Instagram',
  afiche: 'afiche o cartel impreso', menu: 'menú o lista de precios', evento: 'invitación o anuncio de evento', saludo: 'saludo por fecha especial',
};
const FORMATOS: Record<string, string> = { '1:1': '1:1', '4:5': '4:5', '9:16': '9:16', '3:4': '3:4', '16:9': '16:9' };
const ESTILOS: Record<string, string> = {
  marca: 'el que mejor encaje con el ADN de la marca', elegante: 'elegante, minimalista, mucho aire y tipografía cuidada',
  vibrante: 'vibrante, con color y energía', foto: 'fotográfico realista, de aspecto profesional', ilustrado: 'ilustrado, con formas gráficas',
};
const TAMANOS: Record<string, string> = { '1:1': '1024x1024', '4:5': '1024x1536', '3:4': '1024x1536', '9:16': '1024x1536', '16:9': '1536x1024' };
const MAX_REF = 3, MAX_REF_B64 = 4_000_000, MAX_BASE_B64 = 9_000_000;

const cors = (o: string | null) => ({
  'Access-Control-Allow-Origin': o && ORIGENES.includes(o) ? o : ORIGENES[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin',
});
const txt = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '') || null;

Deno.serve(async (req) => {
  const H = { ...cors(req.headers.get('Origin')), 'Content-Type': 'application/json' };
  const resp = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: H });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: H });
  if (req.method !== 'POST') return resp({ error: 'Método no permitido' }, 405);

  const clave = Deno.env.get('OPENAI_API_KEY');
  if (!clave) return resp({ error: 'Falta cargar el secreto OPENAI_API_KEY en Supabase.' }, 503);

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: equipo } = await sb.rpc('es_equipo');
  if (equipo !== true) return resp({ error: 'Solo para el equipo de ORIGEN' }, 403);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return resp({ error: 'Pedido inválido' }, 400); }

  const pieza = PIEZAS[String(b.pieza)], formato = FORMATOS[String(b.formato)], estilo = ESTILOS[String(b.estilo)] ?? ESTILOS.marca;
  const titular = txt(b.titular, 120), detalle = txt(b.detalle, 600), contacto = txt(b.contacto, 200), escena = txt(b.escena, 600), colores = txt(b.colores, 120);
  const cambio = b.modo === 'cambio' ? txt(b.cambio, 600) : null;
  const base = cambio && typeof b.base === 'string' && b.base.length < MAX_BASE_B64 && /^[A-Za-z0-9+/=]+$/.test(b.base) ? b.base : null;
  if (!pieza || !formato) return resp({ error: 'Elegí el tipo de pieza y el formato.' }, 400);
  if (b.modo === 'cambio') { if (!cambio || !base) return resp({ error: 'Escribí qué querés cambiar de la imagen.' }, 400); }
  else {
    if (!titular) return resp({ error: 'Falta el título principal del flyer.' }, 400);
    if (!escena) return resp({ error: 'Contá qué querés que se vea en la imagen.' }, 400);
  }
  const cid = txt(b.cliente_id, 60);
  if (!cid) return resp({ error: 'Falta el cliente.' }, 400);

  // Referencias (logo, fotos): solo imágenes, pocas y livianas
  const refs = cambio ? [{ tipo: 'image/png', b64: base! }] : (Array.isArray(b.refs) ? b.refs : []).slice(0, MAX_REF).filter((r: any) =>
    r && /^image\/(png|jpeg|webp)$/.test(r.tipo) && typeof r.b64 === 'string' && r.b64.length < MAX_REF_B64 && /^[A-Za-z0-9+/=]+$/.test(r.b64));

  const [{ data: cli }, { data: adn }] = await Promise.all([
    sb.from('clientes').select('*').eq('id', cid).maybeSingle(),
    sb.from('marca_adn').select('*').eq('cliente_id', cid).maybeSingle(),
  ]);
  if (!cli) return resp({ error: 'No encontré a ese cliente.' }, 404);
  const nombre = cli.nombre ?? cli.negocio ?? 'la marca';
  const cols = colores || (Array.isArray(adn?.colores) && adn.colores.length ? adn.colores.join(', ') : null);

  const ADN = adn ? [
    ['Qué es el negocio', adn.descripcion], ['Público', adn.publico], ['Tono', adn.tono], ['Productos/servicios', adn.servicios],
    ['Diferenciales', adn.diferenciales], ['Nunca hacer ni decir', adn.restricciones],
  ].filter(([, v]) => v).map(([k, v]) => `- ${k}: ${String(v).slice(0, 700)}`).join('\n') : '(sin ADN cargado: usá un criterio profesional y sobrio)';

  const prompt = cambio ? [
    `Editá la imagen adjunta de la marca "${nombre}" aplicando SOLO este cambio: ${cambio}.`,
    `Mantené igual todo lo demás: composición, textos (sin cambiar ni una letra salvo que el cambio lo pida), logo, colores y estilo. Si agregás o modificás texto, escribilo en español, sin errores ni letras inventadas.`,
    adn?.restricciones ? `Nunca hacer ni decir (de la marca): ${String(adn.restricciones).slice(0, 500)}` : null,
  ].filter(Boolean).join('\n\n') : [
    `Diseñá un ${pieza} para la marca "${nombre}", en formato ${formato}. Es una pieza gráfica lista para publicar, no una foto suelta.`,
    `ADN DE MARCA (respetalo; define el tono visual y el mensaje):\n${ADN}`,
    cols ? `Colores de la marca: ${cols}. Usalos como paleta principal.` : 'Elegí una paleta coherente con el ADN de la marca.',
    `Estilo visual: ${estilo}.`,
    `Qué se tiene que ver: ${escena}.`,
    `TEXTOS que deben aparecer en la imagen, escritos EXACTAMENTE así, en español, sin errores ni letras inventadas:`,
    `- Título principal: "${titular}"`,
    detalle ? `- Texto de apoyo: "${detalle}"` : null,
    contacto ? `- Datos de contacto (al pie, legibles): "${contacto}"` : null,
    refs.length ? `Las imágenes adjuntas son referencias: si hay un logo, colocalo tal cual, sin redibujarlo ni deformarlo; las fotos usalas como base visual del producto o lugar real.` : null,
    `Reglas: no agregues teléfonos, precios, fechas, direcciones ni textos que no estén arriba. Jerarquía clara (el título se lee primero), buen contraste, márgenes seguros y composición limpia. Nada de marcas de agua ni logos de terceros.`,
  ].filter(Boolean).join('\n\n');

  const modelo = (Deno.env.get('OPENAI_IMAGE_MODEL') ?? 'gpt-image-1-mini').replace(/[^\w.-]/g, '');
  const calidad = ['low', 'medium', 'high'].includes(Deno.env.get('OPENAI_IMAGE_QUALITY') ?? '') ? Deno.env.get('OPENAI_IMAGE_QUALITY')! : 'medium';
  const tam = TAMANOS[formato]; // OpenAI solo hace cuadrado, vertical (2:3) u horizontal (3:2)
  let r: Response;
  try {
    const cab = { Authorization: `Bearer ${clave}` }, senal = AbortSignal.timeout(110000);
    if (refs.length) { // con logo o fotos de referencia: endpoint de edición (multipart)
      const fd = new FormData();
      fd.append('model', modelo); fd.append('prompt', prompt); fd.append('size', tam); fd.append('quality', calidad);
      refs.forEach((x: any, i: number) => fd.append('image[]', new Blob([Uint8Array.from(atob(x.b64), (c) => c.charCodeAt(0))], { type: x.tipo }), `ref${i}.${x.tipo.split('/')[1]}`));
      r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: cab, body: fd, signal: senal });
    } else {
      r = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { ...cab, 'Content-Type': 'application/json' }, signal: senal,
        body: JSON.stringify({ model: modelo, prompt, size: tam, quality: calidad, n: 1 }) });
    }
  } catch { return resp({ error: 'OpenAI tardó demasiado en responder. Probá de nuevo.' }, 504); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const m = String(j?.error?.message ?? '').slice(0, 200);
    return resp({ error: r.status === 429 ? 'OpenAI pide esperar un momento o no hay saldo suficiente. Revisá el saldo en platform.openai.com.' : r.status === 401 ? 'La clave de OpenAI no es válida. Revisá el secreto OPENAI_API_KEY.' : `OpenAI rechazó el pedido (${r.status}). ${m}` }, 502);
  }
  const dato = j?.data?.[0]?.b64_json;
  if (!dato) return resp({ error: 'OpenAI no devolvió una imagen. Probá reformular lo que querés ver.' }, 502);

  await sb.from('imagenes_gen').insert({ cliente_id: cid, pieza: b.pieza, pedido: (cambio ? `Cambio: ${cambio}` : `${titular} · ${escena}`).slice(0, 2000), modelo: modelo });
  return resp({ imagen: dato, tipo: 'image/png', modelo });
});
