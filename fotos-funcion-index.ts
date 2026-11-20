// ORIGEN · Supabase Edge Function "fotos" · v1.0 · 2026-11-20
// Venta de fotos sin login: crea el pago en Mercado Pago, confirma el cobro y entrega la original.
// Secretos a cargar en Supabase: MP_ACCESS_TOKEN (token de Mercado Pago) y PRECIO (pesos por foto, ej: 5000).
// Opcional: SITE_URL (por defecto https://agencia-origen.online).
// Desactivar "Verify JWT" en esta función (la llama el navegador y el webhook de Mercado Pago).

const SB = Deno.env.get('SUPABASE_URL')!;
const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MP = Deno.env.get('MP_ACCESS_TOKEN') || '';
const PRECIO = Number(Deno.env.get('PRECIO') || 0);
const SITE = (Deno.env.get('SITE_URL') || 'https://agencia-origen.online').replace(/\/$/, '');
const PAGE = SITE + '/fotos-torneo.html';
const BUCKET = 'ft-originales';
const CORS = {
  'Access-Control-Allow-Origin': SITE,
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};
const ID = /^[A-Za-z0-9_-]{1,60}$/;
const UUID = /^[0-9a-f-]{36}$/i;

const out = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

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

async function firmar(archivo: string) {
  const r = await fetch(`${SB}/storage/v1/object/sign/${BUCKET}/${encodeURIComponent(archivo)}`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 3600 }),
  });
  if (!r.ok) return '';
  const j = await r.json();
  return `${SB}/storage/v1${j.signedURL}&download=${encodeURIComponent(archivo)}`;
}

async function porToken(token: string) {
  if (!UUID.test(token)) return null;
  const c = await db(`ft_compras?token=eq.${token}&select=*`);
  return c[0] || null;
}

async function entrega(compra: any) {
  const items = await db(`ft_compra_fotos?compra_id=eq.${compra.id}&select=foto_id,ft_fotos(archivo)`);
  const fotos = [];
  for (const it of items) {
    const url = await firmar(it.ft_fotos.archivo);
    if (url) fotos.push({ id: it.foto_id, url });
  }
  return fotos;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  try {
    const u = new URL(req.url);
    let b: any = {};
    try { b = await req.json(); } catch (_) { /* sin cuerpo */ }
    const accion = u.searchParams.get('accion') || b.accion;

    if (accion === 'config') return out({ precio: PRECIO });

    if (accion === 'crear') {
      const ids = Array.isArray(b.fotos) ? [...new Set(b.fotos.map(String))] as string[] : [];
      if (!PRECIO || !MP) return out({ error: 'Ventas no configuradas' }, 503);
      if (!ids.length || ids.length > 50 || !ids.every((i) => ID.test(i))) return out({ error: 'Fotos inválidas' }, 400);
      const ok = await db(`ft_fotos?id=in.(${ids.join(',')})&select=id`);
      if (ok.length !== ids.length) return out({ error: 'Alguna foto no existe' }, 400);
      const [c] = await db('ft_compras', { method: 'POST', body: JSON.stringify({ total: PRECIO * ids.length }) });
      await db('ft_compra_fotos', { method: 'POST', body: JSON.stringify(ids.map((f) => ({ compra_id: c.id, foto_id: f }))) });
      const back = `${PAGE}?c=${c.token}`;
      const pref = await mp('/checkout/preferences', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ title: `Fotos del torneo (${ids.length})`, quantity: ids.length, unit_price: PRECIO, currency_id: 'ARS' }],
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
