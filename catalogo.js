/* ORIGEN · catalogo.js · v1.5 · 2026-11-26 · web a medida desde $200.000, app PWA desde $500.000 · v1.4 · 2026-11-26 · app desde $500.000 · v1.3 · 2026-11-26 · app con turnos, menú, club y avisos · v1.2 · 2026-11-26 · tarifario coherente: sesión $50.000/h, reels, app, auditoría · v1.1 · 2026-11-26 · FUENTE ÚNICA DE PRECIOS (planes.html y portal.html leen de acá).
   Para cambiar un precio: editá solo el número `p` (o los de `o`) y subí este archivo.
   m: 'mes' = mensual · 'unico' = pago único · 'hora' = por hora · 'cotizar' = se cotiza (p: null)
   ds: true = "desde"  ·  o: opciones [nombre, precio]  ·  pub: la inversión publicitaria va aparte
   t: categorías extra donde también aparece (ej. turismo)  ·  prop: propuesta, todavía sin precio acordado */
(function () {
  var C = {
    cats: [['redes', 'Redes'], ['ads', 'Publicidad'], ['seo', 'SEO y Google'], ['wa', 'WhatsApp y CRM'], ['diseno', 'Diseño'],
      ['audio', 'Audiovisual'], ['web', 'Web'], ['auto', 'Automatización e IA'], ['consul', 'Consultoría'], ['turismo', 'Turismo']],
    items: [
      /* REDES */
      { id: 'planes', c: 'redes', n: 'Gestión de redes (4 planes)', d: 'Arranque, Esencial, Crecimiento y ORIGEN Full: elegís cuánto trabajo hacemos por vos.', m: 'mes', p: 100000, ds: true, inc: ['Desde publicar lo que mandás hasta un equipo de marketing completo', 'Diseño, reels, producción y reportes según el plan'], ir: 'redes', t: ['turismo'] },
      { id: 'red-extra', c: 'redes', n: 'Red social adicional', d: 'Sumá Facebook, TikTok, YouTube, LinkedIn o Threads a tu gestión.', m: 'mes', p: 100000, inc: ['Contenido adaptado a cada plataforma', 'Programación y publicación'] },
      { id: 'community', c: 'redes', n: 'Community management', d: 'Respondemos comentarios y mensajes por vos, en horario acordado.', m: 'mes', p: 120000, inc: ['Comentarios y mensajes', 'Derivación de consultas a tu WhatsApp'] },
      { id: 'rebranding', c: 'redes', n: 'Rebranding de perfiles', d: 'Rearmamos tus perfiles: foto, bio, destacados, paleta y plantillas.', m: 'unico', p: 120000, inc: ['Foto, bio y destacados', 'Paleta y plantillas'] },
      { id: 'piezas', c: 'redes', n: 'Pack de 10 piezas de diseño', d: 'Publicaciones o historias diseñadas a medida de tu marca.', m: 'unico', p: 250000, inc: ['10 diseños', 'Textos incluidos'] },
      /* PUBLICIDAD */
      { id: 'meta', c: 'ads', n: 'Meta Ads (Facebook e Instagram)', d: 'Campañas para que te escriban clientes por WhatsApp o redes.', m: 'mes', p: 250000, pub: true, inc: ['Planificación y segmentación', 'Hasta 2 campañas activas', 'Optimización e informe mensual'] },
      { id: 'google-ads', c: 'ads', n: 'Google Ads (Búsqueda, Display y YouTube)', d: 'Aparecé cuando buscan lo que vendés.', m: 'mes', p: 300000, pub: true, inc: ['Campañas y palabras clave', 'Anuncios y optimización', 'Informe mensual'] },
      { id: 'tiktok-ads', c: 'ads', n: 'TikTok Ads', d: 'Campañas de video para llegar a un público más joven.', m: 'mes', p: 250000, pub: true, inc: ['Planificación y creatividades', 'Optimización e informe'] },
      { id: 'meta-google', c: 'ads', n: 'Combo Meta + Google', d: 'Las dos plataformas con una sola gestión.', m: 'mes', p: 550000, pub: true, inc: ['Meta Ads y Google Ads', 'Informe unificado'] },
      { id: 'ads-setup', c: 'ads', n: 'Configuración inicial de campañas', d: 'Dejamos todo listo para medir: cuentas, píxel, eventos y seguimiento de conversiones.', m: 'unico', p: 150000, inc: ['Cuentas y píxel', 'Eventos y conversiones'] },
      { id: 'campana', c: 'ads', n: 'Campaña puntual', d: 'Una campaña para una fecha, promo o lanzamiento.', m: 'unico', p: 180000, pub: true, inc: ['Anuncios y segmentación', 'Seguimiento durante la campaña'] },
      { id: 'remarketing', c: 'ads', n: 'Remarketing', d: 'Volvemos a mostrar tu negocio a quienes ya te visitaron. Se suma a Meta o Google.', m: 'mes', p: 150000, pub: true, inc: ['Públicos de visitantes y mensajes', 'Se suma a una campaña activa'] },
      /* SEO Y GOOGLE */
      { id: 'gbp-setup', c: 'seo', n: 'Configuración de tu ficha de Google', d: 'Dejamos tu ficha de Google Business lista para aparecer en Maps.', m: 'unico', p: 150000, t: ['turismo'], inc: ['Datos, fotos y categorías', 'Horarios, enlaces y botones'] },
      { id: 'gbp', c: 'seo', n: 'Ficha de Google y reseñas', d: 'Mantenemos tu ficha al día y respondemos las reseñas.', m: 'mes', p: 120000, t: ['turismo'], inc: ['Novedades, fotos y horarios', 'QR para pedir reseñas y respuestas'] },
      { id: 'seo-local', c: 'seo', n: 'SEO local', d: 'Que te encuentren en Google y en el mapa cuando buscan en tu zona.', m: 'mes', p: 250000, t: ['turismo'], inc: ['Palabras clave locales', 'Optimización de tu web y ficha', 'Informe mensual'] },
      { id: 'seo-pro', c: 'seo', n: 'SEO + IA profesional', d: 'Posicionamiento web y presencia en ChatGPT, Gemini y otras IA.', m: 'mes', p: 400000, inc: ['SEO técnico y de contenido', 'Optimización para respuestas de IA (GEO)', 'Artículos y reporte mensual'] },
      { id: 'seo-adv', c: 'seo', n: 'SEO + IA avanzado', d: 'Estrategia completa para dominar tu rubro en Google y en IA.', m: 'mes', p: 600000, inc: ['Todo lo del profesional', 'Más contenido y autoridad', 'Estrategia GEO mensual'] },
      { id: 'seo-audit', c: 'seo', n: 'Auditoría SEO e IA', d: 'Informe técnico con qué corregir para posicionar tu web.', m: 'unico', p: 250000, inc: ['Revisión técnica y de contenido', 'Plan de acción priorizado'] },
      /* WHATSAPP Y CRM */
      { id: 'wa-setup', c: 'wa', n: 'Configuración de WhatsApp Business', d: 'Perfil profesional, mensajes de bienvenida y ausencia, respuestas rápidas y etiquetas.', m: 'unico', p: 120000, inc: ['Perfil y mensajes automáticos', 'Respuestas rápidas y etiquetas'] },
      { id: 'wa-catalogo', c: 'wa', n: 'Catálogo de WhatsApp', d: 'Tus productos o servicios cargados con fotos y precios.', m: 'unico', p: 100000, inc: ['Carga de productos o servicios', 'Fotos y precios'] },
      { id: 'wa-auto', c: 'wa', n: 'Automatización de WhatsApp', d: 'Respuestas automáticas y flujos de atención.', m: 'unico', o: [['Básica', 150000], ['Avanzada / API', 400000]], ds: true, inc: ['Flujos de atención', 'Avanzada: API oficial e integraciones'] },
      { id: 'wa-gestion', c: 'wa', n: 'Gestión de WhatsApp y consultas', d: 'Ordenamos y respondemos tus consultas comerciales.', m: 'mes', p: 250000, ds: true, t: ['turismo'], inc: ['Gestión de consultas y reservas', 'Organización de clientes'] },
      { id: 'comercial', c: 'wa', n: 'Gestión comercial mensual', d: 'Seguimiento de prospectos y ventas para que no se pierda ninguna consulta.', m: 'mes', o: [['Leads y seguimiento', 350000], ['Gestión comercial integral', 650000]], ds: true, inc: ['Seguimiento de prospectos', 'Reportes de ventas'] },
      { id: 'crm', c: 'wa', n: 'CRM', d: 'Tu base de clientes ordenada y conectada a WhatsApp, formularios y web.', m: 'unico', o: [['Configuración', 350000], ['Con automatizaciones', 600000]], ds: true, inc: ['Pipeline comercial', 'Integración con WhatsApp y web'] },
      { id: 'email', c: 'wa', n: 'Email marketing', d: 'Envíos a tu base de clientes, con automatización básica.', m: 'mes', p: 200000, inc: ['Diseño y envío', 'Automatización básica'] },
      /* DISEÑO */
      { id: 'logo', c: 'diseno', n: 'Logo', d: 'Diseño de tu logo con variantes para usar en todos lados.', m: 'unico', p: 350000, inc: ['Propuestas y ajustes', 'Archivos para web e impresión'] },
      { id: 'identidad', c: 'diseno', n: 'Identidad visual', d: 'Logo, paleta, tipografías y piezas base.', m: 'unico', p: 650000, inc: ['Logo y paleta', 'Tipografías y piezas base'] },
      { id: 'branding', c: 'diseno', n: 'Branding completo', d: 'Identidad visual más manual de marca y aplicaciones.', m: 'unico', p: 900000, inc: ['Identidad visual', 'Manual de marca', 'Aplicaciones'] },
      { id: 'pieza', c: 'diseno', n: 'Flyer, banner o tarjeta', d: 'Piezas sueltas para imprimir o publicar.', m: 'unico', p: 60000, ds: true, inc: ['Flyer desde $60.000', 'Banner o tarjeta $80.000'] },
      { id: 'menu', c: 'diseno', n: 'Menú, catálogo o presentación', d: 'Material comercial diseñado para vender.', m: 'unico', p: 200000, ds: true, inc: ['Menú desde $200.000', 'Catálogo o presentación desde $250.000'] },
      { id: 'packaging', c: 'diseno', n: 'Packaging', d: 'Diseño de envases y etiquetas.', m: 'unico', p: 250000, ds: true, inc: ['Diseño listo para imprimir'] },
      /* AUDIOVISUAL */
      { id: 'sesion', c: 'audio', n: 'Sesión de fotos o video', d: 'Fotografía y video profesional en tu local o en nuestro set: productos, platos, instalaciones o equipo.', m: 'hora', p: 50000, min: 2, t: ['turismo'], inc: ['Mínimo 2 horas', 'Material para varias semanas'] },
      { id: 'set', c: 'audio', n: 'Set de grabación', d: 'Alquilá nuestro set de Jangadero 233 y grabá vos.', m: 'hora', p: 30000, min: 1, inc: ['Fondo, sillones y luces', 'Micrófonos inalámbricos'] },
      { id: 'reels', c: 'audio', n: 'Pack de reels', d: 'Reels grabados, editados y listos para publicar.', m: 'unico', o: [['4 reels', 350000], ['8 reels', 600000], ['12 reels', 800000]], inc: ['Guion, grabación y edición'] },
      { id: 'jornada', c: 'audio', n: 'Jornada de contenido', d: 'Un día de grabación para tener material de todo el mes.', m: 'unico', o: [['Jornada de contenido', 350000], ['Jornada completa', 550000]], inc: ['Fotos y videos', 'Equipo de producción'] },
      { id: 'evento', c: 'audio', n: 'Cobertura de evento', d: 'Fotos y video de tu evento, entregados para tus redes.', m: 'unico', p: 350000, ds: true, inc: ['Fotos y video', 'Entrega rápida'] },
      { id: 'video', c: 'audio', n: 'Video institucional o publicitario', d: 'Video profesional para presentar o promocionar tu negocio.', m: 'unico', p: 350000, ds: true, inc: ['Guion y producción', 'Institucional desde $400.000'] },
      { id: 'drone', c: 'audio', n: 'Drone', d: 'Tomas aéreas para mostrar tu lugar desde arriba.', m: 'unico', p: 200000, ds: true, t: ['turismo'], inc: ['Fotos y video aéreos'] },
      { id: 'edicion', c: 'audio', n: 'Edición de video', d: 'Editamos el material que ya tenés.', m: 'unico', p: 80000, ds: true, inc: ['Edición y subtítulos'] },
      { id: 'podcast', c: 'audio', n: 'Podcast corporativo', d: 'Tu podcast grabado en nuestro estudio, con edición.', m: 'unico', p: 350000, ds: true, inc: ['Grabación en el estudio', 'Edición y clips'] },
      /* WEB */
      { id: 'web-susc', c: 'web', n: 'Web por suscripción', d: 'Tu web con diseño, hosting y mantenimiento incluidos. Básica, profesional, con catálogo o con reservas.', m: 'mes', p: 30000, ds: true, ir: 'web', t: ['turismo'], inc: ['Básica $30.000 · Profesional $50.000', 'Con catálogo $65.000 · Con reservas $70.000', 'Avanzada desde $100.000'] },
      { id: 'web-medida', c: 'web', n: 'Web a medida', d: 'Sitio a tu medida con pago único.', m: 'unico', o: [['Landing page', 200000], ['Web institucional', 300000], ['Web corporativa profesional', 450000], ['Web premium o de reservas', 700000]], ds: true, t: ['turismo'], inc: ['Diseño personalizado', 'Optimizada para celular y SEO básico'] },
      { id: 'ecommerce', c: 'web', n: 'Tienda online', d: 'Vendé por internet con pagos y envíos integrados.', m: 'unico', o: [['E-commerce', 600000], ['E-commerce avanzado', 900000]], ds: true, inc: ['Productos, pagos y envíos', 'Integración con WhatsApp'] },
      { id: 'sistemas', c: 'web', n: 'Portal o sistema a medida', d: 'Portales privados, sistemas de gestión, turnos y reservas.', m: 'unico', o: [['Portal privado', 900000], ['Sistema personalizado', 1200000]], ds: true, inc: ['Desarrollo a medida', 'Panel de administración'] },
      { id: 'app', c: 'web', n: 'App PWA a medida', d: 'Tu propia app que se instala desde el navegador, con tu marca. Sumás funciones y el precio va subiendo: turnos, productos, cobros, club de puntos y avisos al celular.', m: 'unico', o: [['App base', 500000], ['App con turnos o productos', 700000], ['App con turnos, productos y cobros', 1000000]], ds: true, inc: ['Base desde $500.000: tu marca, panel de administración y avisos al celular', 'Gestión de turnos o de productos: +$200.000 cada una', 'Cobros online: +$200.000', 'Club de puntos con regalo: se cotiza según el caso'] },
      { id: 'rediseno', c: 'web', n: 'Rediseño web', d: 'Renovamos una web existente.', m: 'unico', p: 250000, ds: true, inc: ['Nuevo diseño', 'Contenido migrado'] },
      { id: 'mantenimiento', c: 'web', n: 'Mantenimiento web', d: 'Hosting, dominio, SSL, copias de seguridad y soporte.', m: 'mes', p: 80000, ds: true, inc: ['Hosting, dominio y SSL', 'Copias de seguridad y soporte'] },
      /* AUTOMATIZACIÓN E IA */
      { id: 'auto-basica', c: 'auto', n: 'Automatización básica', d: 'Automatizamos una tarea repetitiva (formularios, avisos, emails).', m: 'unico', p: 250000, ds: true, inc: ['Un flujo automatizado'] },
      { id: 'auto-procesos', c: 'auto', n: 'Automatización de procesos e integraciones', d: 'Conectamos tus herramientas y automatizamos procesos completos.', m: 'unico', p: 350000, ds: true, inc: ['Make, API e integración de sistemas'] },
      { id: 'chatbot', c: 'auto', n: 'Chatbot', d: 'Atención automática en WhatsApp o en tu web.', m: 'unico', o: [['Chatbot', 400000], ['Chatbot con IA', 600000]], ds: true, inc: ['Respuestas a consultas frecuentes', 'Con IA: conversa y aprende de tu negocio'] },
      { id: 'dashboard', c: 'auto', n: 'Dashboard', d: 'Un tablero con tus números de ventas o marketing.', m: 'unico', p: 350000, ds: true, inc: ['Datos conectados', 'Gráficos claros'] },
      /* CONSULTORÍA */
      { id: 'auditoria', c: 'consul', n: 'Auditoría de presencia digital', d: 'Revisamos tus redes, tu ficha de Google y tu web, y te decimos qué corregir primero.', m: 'unico', p: 100000, inc: ['Informe con prioridades'] },
      { id: 'estrategia', c: 'consul', n: 'Plan de marketing y estrategia', d: 'Estrategia de marca, contenido y posicionamiento para tu negocio.', m: 'cotizar', p: null, prop: true, inc: ['Análisis de competencia y mercado', 'Plan de acción'] },
      { id: 'direccion', c: 'consul', n: 'Consultoría comercial y dirección de marketing', d: 'Acompañamiento continuo para ordenar tu proceso comercial.', m: 'cotizar', p: null, prop: true, inc: ['Reuniones periódicas', 'Seguimiento de resultados'] },
      /* TURISMO */
      { id: 'tur-pack', c: 'turismo', n: 'Pack para alojamientos', d: 'Fotos, web con reservas, ficha de Google y redes para hoteles, cabañas y Airbnb.', m: 'cotizar', p: null, prop: true, inc: ['Lo armamos según tu alojamiento'] },
      { id: 'tur-admin', c: 'turismo', n: 'Administración digital de alojamientos', d: 'Consultas, reservas, Airbnb, Booking y canales: nos ocupamos nosotros.', m: 'cotizar', p: null, prop: true, inc: ['Gestión de plataformas y reservas', 'Atención de consultas'] }
    ]
  };
  C.planes = { arranque: 100000, esencial: 350000, crecimiento: 590000, full: 900000 }; /* los 4 planes de gestión de redes */
  C.por = {}; C.items.forEach(function (x) { C.por[x.id] = x; });
  var $ = function (n) { return '$' + Math.round(n).toLocaleString('es-AR'); };
  C.min = function (x) { return x.o ? Math.min.apply(0, x.o.map(function (a) { return a[1]; })) : x.p; };
  C.unidad = { mes: '/mes', unico: 'pago único', hora: '/hora', cotizar: 'a cotizar' };
  /* texto de precio listo para mostrar: "Desde $250.000 por mes" */
  C.texto = function (id, op) {
    var x = C.por[id]; if (!x) return '';
    var p = op != null && x.o ? x.o[op][1] : C.min(x);
    if (p == null) return 'A cotizar';
    return (x.ds || (x.o && op == null && x.o.length > 1) ? 'Desde ' : '') + $(p) + ({ mes: ' por mes', hora: ' la hora', unico: ' · pago único' }[x.m] || '');
  };
  window.CATALOGO = C;
})();
