// ORIGEN · Supabase Edge Function "fotos" · v2.2 · 2026-11-20 · originales en Supabase Storage y/o Backblaze B2 · combos por cantidad (nunca cobra más por menos fotos)
// Venta de fotos sin login: crea el pago en Mercado Pago, confirma el cobro y entrega la original.
// Secretos a cargar en Supabase (Edge Functions > Secrets):
//   MP_ACCESS_TOKEN  token de producción de Mercado Pago
//   PRECIO           pesos por foto, ej: 5000
//   COMBOS           opcional, combos por cantidad, ej: [[3,12000],[5,18000]]  (3 fotos $12.000, 5 fotos $18.000)
//   B2_KEY_ID, B2_APP_KEY, B2_BUCKET, B2_ENDPOINT  opcionales: solo si hay originales en Backblaze (ej: s3.us-west-004.backblazeb2.com)
//   SITE_URL         opcional, por defecto https://agencia-origen.online
// Desactivar "Verify JWT" en esta función (la llama el navegador y el webhook de Mercado Pago).
// Las originales se llaman <id>.jpg (ej: F-0001.jpg). Se buscan primero en Supabase (bucket ft-originales) y después en Backblaze.

const SB = Deno.env.get('SUPABASE_URL')!;
const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MP = Deno.env.get('MP_ACCESS_TOKEN') || '';
const PRECIO = Number(Deno.env.get('PRECIO') || 0);
const SITE = (Deno.env.get('SITE_URL') || 'https://agencia-origen.online').replace(/\/$/, '');
const PAGE = SITE + '/fotos-torneo.html';
const BUCKET = 'ft-originales';
let COMBOS: number[][] = [];
try { COMBOS = JSON.parse(Deno.env.get('COMBOS') || '[]').filter((c: any) => Array.isArray(c) && c[0] >= 2 && c[1] > 0); } catch (_) { /* sin combos */ }
// Precio mínimo para n fotos combinando combos y fotos sueltas
// Nunca cobra más por menos fotos: si un combo mayor sale igual o más barato, se aplica
function total(n: number) {
  const top = n + Math.max(0, ...COMBOS.map((c) => c[0]));
  const m = [0];
  for (let i = 1; i <= top; i++) {
    m[i] = m[i - 1] + PRECIO;
    for (const [k, p] of COMBOS) if (i >= k) m[i] = Math.min(m[i], m[i - k] + p);
  }
  return Math.min(...m.slice(n, top + 1));
}
const B2 = {
  id: Deno.env.get('B2_KEY_ID') || '',
  key: Deno.env.get('B2_APP_KEY') || '',
  bucket: Deno.env.get('B2_BUCKET') || '',
  host: Deno.env.get('B2_ENDPOINT') || '',
};
const CORS = {
  'Access-Control-Allow-Origin': SITE,
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};
const ID = /^[A-Za-z0-9_-]{1,60}$/;
const UUID = /^[0-9a-f-]{36}$/i;

const out = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

// --- sigv4 (links firmados de S3, sin librerías)
const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const sha = async (s: string) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
async function hmac(key: Uint8Array | string, msg: string) {
  const k = await crypto.subtle.importKey('raw', typeof key === 'string' ? enc.encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
const rfc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
async function presign(method: string, host: string, path: string, region: string, keyId: string, secret: string, expires: number, extra: Record<string, string> = {}, now = new Date()) {
  const amz = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const day = amz.slice(0, 8);
  const scope = `${day}/${region}/s3/aws4_request`;
  const q: Record<string, string> = {
    ...extra,
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${keyId}/${scope}`,
    'X-Amz-Date': amz,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': 'host',
  };
  const qs = Object.keys(q).sort().map((k) => rfc(k) + '=' + rfc(q[k])).join('&');
  const canon = [method, path, qs, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const sts = `AWS4-HMAC-SHA256\n${amz}\n${scope}\n${await sha(canon)}`;
  let k = await hmac('AWS4' + secret, day);
  k = await hmac(k, region);
  k = await hmac(k, 's3');
  k = await hmac(k, 'aws4_request');
  return `https://${host}${path}?${qs}&X-Amz-Signature=${hex((await hmac(k, sts)).buffer)}`;
}
// --- fin sigv4

const sbLink = async (id: string) => {
  const r = await fetch(`${SB}/storage/v1/object/sign/${BUCKET}/${id}.jpg`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 3600 }),
  });
  if (!r.ok) return '';
  const j = await r.json();
  return `${SB}/storage/v1${j.signedURL}&download=${id}.jpg`;
};
const b2Region = () => B2.host.split('.')[1] || '';
const b2Path = (id: string) => `/${B2.bucket}/${id}.jpg`;
const b2Existe = async (id: string) => !!B2.id &&
  (await fetch(await presign('HEAD', B2.host, b2Path(id), b2Region(), B2.id, B2.key, 60), { method: 'HEAD' })).status === 200;
const b2Link = (id: string) =>
  !B2.id ? '' : presign('GET', B2.host, b2Path(id), b2Region(), B2.id, B2.key, 3600, {
    'response-content-disposition': `attachment; filename="${id}.jpg"`,
  });

async function db(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SB}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers || {}),
    },
  });
  if (!r.ok) throw new Error('db ' + r.status + ' ' + (await r.text()));
  return r.status === 204 ? [] : await r.json();
}

async function mp(path: string, init: RequestInit = {}) {
  const r = await fetch('https://api.mercadopago.com' + path, {
    ...init,
    headers: { Authorization: 'Bearer ' + MP, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error('mp ' + r.status + ' ' + (await r.text()));
  return await r.json();
}

// Confirma con Mercado Pago (nunca confía en lo que manda el navegador) y marca la compra como pagada.
async function confirmar(compra: any, paymentId: string) {
  if (compra.estado === 'pagado' || !/^\d{1,20}$/.test(paymentId)) return;
  const p = await mp('/v1/payments/' + paymentId);
  if (p.status !== 'approved' || p.external_reference !== compra.id) return;
  if (Number(p.transaction_amount) < Number(compra.total)) return;
  await db(`ft_compras?id=eq.${compra.id}&estado=eq.pendiente`, {
    method: 'PATCH',
    body: JSON.stringify({
      estado: 'pagado',
      mp_payment_id: String(p.id),
      email: String(p.payer?.email || '').toLowerCase(),
      paid_at: new Date().toISOString(),
    }),
  });
}

async function porToken(token: string) {
  if (!UUID.test(token)) return null;
  const c = await db(`ft_compras?token=eq.${token}&select=*`);
  return c[0] || null;
}

async function entrega(compra: any) {
  const items = await db(`ft_compra_fotos?compra_id=eq.${compra.id}&select=foto_id`);
  const fotos = await Promise.all(items.map(async (it: any) => ({ id: it.foto_id, url: (await sbLink(it.foto_id)) || (await b2Link(it.foto_id)) })));
  return fotos.filter((x) => x.url);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  try {
    const u = new URL(req.url);
    let b: any = {};
    try { b = await req.json(); } catch (_) { /* sin cuerpo */ }
    const accion = u.searchParams.get('accion') || b.accion;

    if (accion === 'config') return out({ precio: PRECIO, combos: COMBOS });

    if (accion === 'crear') {
      const ids = Array.isArray(b.fotos) ? [...new Set(b.fotos.map(String))] as string[] : [];
      if (!PRECIO || !MP) return out({ error: 'Ventas no configuradas' }, 503);
      if (!ids.length || ids.length > 50 || !ids.every((i) => ID.test(i))) return out({ error: 'Fotos inválidas' }, 400);
      const ok = await Promise.all(ids.map(async (i) => !!(await sbLink(i)) || (await b2Existe(i))));
      if (!ok.every(Boolean)) return out({ error: 'Alguna foto no existe' }, 400);
      const [c] = await db('ft_compras', { method: 'POST', body: JSON.stringify({ total: total(ids.length) }) });
      await db('ft_compra_fotos', { method: 'POST', body: JSON.stringify(ids.map((f) => ({ compra_id: c.id, foto_id: f }))) });
      const back = `${PAGE}?c=${c.token}`;
      const pref = await mp('/checkout/preferences', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ title: `Fotos del torneo (${ids.length})`, quantity: 1, unit_price: total(ids.length), currency_id: 'ARS' }],
          external_reference: c.id,
          back_urls: { success: back, pending: back, failure: PAGE },
          auto_return: 'approved',
          notification_url: `${SB}/functions/v1/fotos?accion=webhook`,
        }),
      });
      return out({ url: pref.init_point, token: c.token });
    }

    if (accion === 'webhook') {
      const id = b?.data?.id || u.searchParams.get('data.id') || u.searchParams.get('id');
      if (id) {
        const p = await mp('/v1/payments/' + String(id).replace(/\D/g, ''));
        const [c] = UUID.test(String(p.external_reference)) ? await db(`ft_compras?id=eq.${p.external_reference}&select=*`) : [];
        if (c) await confirmar(c, String(p.id));
      }
      return out({ ok: true });
    }

    if (accion === 'estado') {
      let c = await porToken(String(b.c || ''));
      if (!c) return out({ estado: 'no_existe' }, 404);
      if (c.estado !== 'pagado' && b.payment_id) {
        await confirmar(c, String(b.payment_id));
        c = await porToken(c.token);
      }
      if (c.estado !== 'pagado') return out({ estado: 'pendiente' });
      return out({ estado: 'pagado', fotos: await entrega(c) });
    }

    if (accion === 'recuperar') {
      const op = String(b.op || '').replace(/\D/g, '');
      const email = String(b.email || '').trim().toLowerCase();
      if (!op || !email) return out({ error: 'Faltan datos' }, 400);
      const [c] = await db(`ft_compras?mp_payment_id=eq.${op}&email=eq.${encodeURIComponent(email)}&estado=eq.pagado&select=token`);
      return c ? out({ token: c.token }) : out({ error: 'No encontramos esa compra' }, 404);
    }

    return out({ error: 'Acción desconocida' }, 400);
  } catch (e) {
    console.error(e);
    return out({ error: 'Error del servidor' }, 500);
  }
});
