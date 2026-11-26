// ORIGEN · Edge Function "imagenes" v1.0 · 2026-11-26
// Arma flyers, posts e historias con Gemini usando el ADN de marca del cliente.
// El portal manda SOLO lo que pide el equipo (pieza, formato, textos, referencias); el prompt se arma acá,
// con el ADN guardado en Supabase. Solo equipo. Registra cada pedido en imagenes_gen (control de gasto).
// Secretos: GEMINI_API_KEY (obligatorio) · GEMINI_MODEL (opcional, por defecto gemini-2.5-flash-image;
// para la calidad Pro poné el modelo de imagen Pro que figure en tu cuenta de Google AI Studio).
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
const MAX_REF = 3, MAX_REF_B64 = 4_000_000;

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

  const clave = Deno.env.get('GEMINI_API_KEY');
  if (!clave) return resp({ error: 'Falta cargar el secreto GEMINI_API_KEY en Supabase.' }, 503);

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: equipo } = await sb.rpc('es_equipo');
  if (equipo !== true) return resp({ error: 'Solo para el equipo de ORIGEN' }, 403);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return resp({ error: 'Pedido inválido' }, 400); }

  const pieza = PIEZAS[String(b.pieza)], formato = FORMATOS[String(b.formato)], estilo = ESTILOS[String(b.estilo)] ?? ESTILOS.marca;
  const titular = txt(b.titular, 120), detalle = txt(b.detalle, 600), contacto = txt(b.contacto, 200), escena = txt(b.escena, 600), colores = txt(b.colores, 120);
  if (!pieza || !formato) return resp({ error: 'Elegí el tipo de pieza y el formato.' }, 400);
  if (!titular) return resp({ error: 'Falta el título principal del flyer.' }, 400);
  if (!escena) return resp({ error: 'Contá qué querés que se vea en la imagen.' }, 400);
  const cid = txt(b.cliente_id, 60);
  if (!cid) return resp({ error: 'Falta el cliente.' }, 400);

  // Referencias (logo, fotos): solo imágenes, pocas y livianas
  const refs = (Array.isArray(b.refs) ? b.refs : []).slice(0, MAX_REF).filter((r: any) =>
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

  const prompt = [
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

  const modelo = (Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash-image').replace(/[^\w.-]/g, '');
  const partes: unknown[] = [{ text: prompt }, ...refs.map((r: any) => ({ inline_data: { mime_type: r.tipo, data: r.b64 } }))];
  let r: Response;
  try {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave }, signal: AbortSignal.timeout(110000),
      body: JSON.stringify({ contents: [{ parts: partes }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: formato } } }),
    });
  } catch { return resp({ error: 'Google tardó demasiado en responder. Probá de nuevo.' }, 504); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return resp({ error: r.status === 429 ? 'Google pide esperar un momento (límite de uso). Probá en un minuto.' : `Google rechazó el pedido (${r.status}). ${String(j?.error?.message ?? '').slice(0, 160)}` }, 502);
  const img = (j?.candidates?.[0]?.content?.parts ?? []).find((p: any) => p.inlineData?.data || p.inline_data?.data);
  const dato = img?.inlineData ?? img?.inline_data;
  if (!dato?.data) return resp({ error: 'Google no devolvió una imagen (puede haberla bloqueado por seguridad). Probá reformular lo que querés ver.' }, 502);

  await sb.from('imagenes_gen').insert({ cliente_id: cid, pieza: b.pieza, pedido: `${titular} · ${escena}`.slice(0, 2000), modelo: modelo });
  return resp({ imagen: dato.data, tipo: dato.mimeType ?? dato.mime_type ?? 'image/png', modelo });
});
