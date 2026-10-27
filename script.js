/* =========================================================
   PUNTO DULCE — script.js
   Compartido por todas las páginas. Cada bloque revisa si
   los elementos de su página existen antes de usarlos.
========================================================= */

/* ---------------- DATA ---------------- */
const DEFAULT_PRODUCTS = [
  {id:'cup1', cat:'cupcake', name:'Cupcake Red Velvet', desc:'Bizcocho red velvet con frosting de queso crema.', price:6.5, icon:'🧁', media:'media-cupcake', disponible:true},
  {id:'cup2', cat:'cupcake', name:'Cupcake Chocolate', desc:'Cupcake de chocolate con ganache y chips.', price:6.0, icon:'🧁', media:'media-cupcake', disponible:true},
  {id:'cup3', cat:'cupcake', name:'Cupcake Vainilla', desc:'Vainilla clásico con frosting de mantequilla.', price:5.5, icon:'🧁', media:'media-cupcake', disponible:true},
  {id:'bro1', cat:'brownie', name:'Brownie Clásico', desc:'Brownie húmedo de chocolate con nueces.', price:7.0, icon:'🍫', media:'media-brownie', disponible:true},
  {id:'bro2', cat:'brownie', name:'Brownie con Dulce de Leche', desc:'Brownie relleno con dulce de leche.', price:7.5, icon:'🍫', media:'media-brownie', disponible:true},
  {id:'alf1', cat:'alfajor', name:'Alfajor Clásico', desc:'Alfajor relleno de manjar blanco, bañado en azúcar.', price:3.0, icon:'🥮', media:'media-alfajor', disponible:true},
  {id:'alf2', cat:'alfajor', name:'Alfajor de Chocolate', desc:'Alfajor bañado en chocolate bitter.', price:3.5, icon:'🥮', media:'media-alfajor', disponible:true},
  {id:'gal1', cat:'galleta', name:'Galletas de Avena', desc:'Galletas de avena con pasas, caja x6.', price:9.0, icon:'🍪', media:'media-galleta', disponible:true},
  {id:'gal2', cat:'galleta', name:'Galletas Chips de Chocolate', desc:'Galletas crocantes con chips de chocolate, caja x6.', price:10.0, icon:'🍪', media:'media-galleta', disponible:true},
  {id:'tor1', cat:'torta', name:'Torta Personalizada', desc:'Diseña tu torta: tamaño, sabor, relleno y decoración a elección.', price:60, icon:'🎂', media:'media-torta', customizable:true, disponible:true},
];
const CATEGORY_LABELS = {cupcake:'Cupcake', brownie:'Brownie', alfajor:'Alfajor', galleta:'Galletas', torta:'Torta personalizada'};
let orderSubmissionInProgress = false;

const CUSTOM_OPTIONS = {
  tamano: [
    {label:'Chica (10 porciones)', extra:0},
    {label:'Mediana (20 porciones)', extra:30},
    {label:'Grande (35 porciones)', extra:65},
  ],
  sabor: [
    {label:'Vainilla', extra:0},
    {label:'Chocolate', extra:5},
    {label:'Red Velvet', extra:8},
    {label:'Marmoleado', extra:5},
  ],
  relleno: [
    {label:'Manjar blanco', extra:0},
    {label:'Frutas', extra:6},
    {label:'Crema chantilly', extra:4},
    {label:'Nutella', extra:9},
  ],
  decoracion: [
    {label:'Buttercream liso', extra:0},
    {label:'Fondant', extra:20},
    {label:'Flores naturales', extra:15},
    {label:'Temática infantil', extra:18},
  ],
};

const STATUS_STEPS = ['Pendiente','Confirmado','En preparación','Listo','Entregado'];

/* ---------------- FILTRO SEMANAL ----------------
   Ventas y pedidos del rol de atención se limitan a la semana en curso.
   Almacén necesita el historial completo para revisar y corregir compras. */
function getWeekRange(){
  const now = new Date();
  const day = now.getDay(); // 0=domingo ... 6=sábado
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0,0,0,0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23,59,59,999);
  return { start: monday, end: sunday };
}
function isInCurrentWeek(isoString){
  if(!isoString) return false;
  const d = new Date(isoString);
  if(isNaN(d.getTime())) return false;
  const { start, end } = getWeekRange();
  return d >= start && d <= end;
}
function formatWeekRange(){
  const { start, end } = getWeekRange();
  const fmt = (d)=> d.toLocaleDateString('es-PE', {day:'2-digit', month:'2-digit'});
  return `${fmt(start)} — ${fmt(end)}`;
}
// El rol de la cuenta con sesión activa en el panel (se llena en initEmployeePanel).
let currentEmployeeRole = null;
function soloSemanaParaRolActual(){
  return currentEmployeeRole === 'ventas';
}

/* ---------------- STATE (localStorage) ---------------- */
function getCart(){ return JSON.parse(localStorage.getItem('pd_cart') || '[]'); }
function setCart(cart){ localStorage.setItem('pd_cart', JSON.stringify(cart)); updateCartBadge(); }
function getOrders(){ return JSON.parse(localStorage.getItem('pd_orders') || '[]'); }
function setOrders(orders){ localStorage.setItem('pd_orders', JSON.stringify(orders)); }

async function getProducts(){
  try {
    return await apiRequest('/productos');
  } catch (error) {
    console.error('Error al obtener productos:', error);
    showToast('No se pudieron cargar los productos');
    return [];
  }
}

/* ---------------- SESIÓN DE EMPLEADO (Backend + MySQL) ----------------
   El registro, login y roles del personal ya NO se guardan en este
   navegador: viven en la base de datos MySQL, detrás del backend en
   /backend. Aquí solo guardamos el token de sesión (JWT) y una copia
   ligera de los datos del empleado para pintar la pantalla rápido.
   Cambia API_BASE si tu backend corre en otra URL/puerto. */
const API_BASE = 'https://punto-dulce-backend.onrender.com/api';

function getToken(){ return localStorage.getItem('pd_token'); }
function setToken(token){ localStorage.setItem('pd_token', token); }
function clearToken(){ localStorage.removeItem('pd_token'); }

function getSession(){ return JSON.parse(localStorage.getItem('pd_employee_session') || 'null'); }
function setSession(emp){ localStorage.setItem('pd_employee_session', JSON.stringify(emp)); }
function clearSession(){ localStorage.removeItem('pd_employee_session'); clearToken(); }

const ROLE_LABELS = {
  administrador: 'Administrador',
  ventas: 'Ventas / Atención',
  produccion: 'Almacén / Producción',
  pendiente: 'Pendiente de asignación'
};
// Qué pestañas del panel puede ver cada rol una vez asignado.
const ROLE_TABS = {
  administrador: ['resumen','ventas','productos','insumos','pedidos','personal'],
  ventas: ['resumen','ventas','pedidos'],
  produccion: ['insumos','productos'],
};

async function apiRequest(path, options = {}){
  const headers = Object.assign({'Content-Type':'application/json'}, options.headers || {});
  const token = getToken();
  if(token) headers.Authorization = 'Bearer ' + token;

  let res;
  try {
    res = await fetch(API_BASE + path, Object.assign({}, options, {headers}));
  } catch (err) {
    throw new Error('No se pudo conectar con el servidor. ¿Está corriendo el backend (npm start en /backend)?');
  }
  let data = null;
  try { data = await res.json(); } catch(e) { /* respuesta sin cuerpo */ }
  if(!res.ok){
    throw new Error((data && data.error) || 'Ocurrió un error inesperado');
  }
  return data;
}

let suppliesCache = [];
let productsCache = [];
let salesCache = [];
let purchaseOrdersCache = [];
let employeeOrdersCache = [];
let currentAdminDashboardReport = null;

async function fetchAllEmployeeOrders(){
  const first = await apiRequest('/pedidos?page=1&limit=100');
  const orders = Array.isArray(first) ? first : (first.pedidos || []);
  const pages = Math.min(100, Number(first.pages) || 1);
  for(let page = 2; page <= pages; page++){
    const response = await apiRequest(`/pedidos?page=${page}&limit=100`);
    orders.push(...(response.pedidos || []));
  }
  return orders;
}

function renderOperationalAlerts(){
  const wrap = document.getElementById('operationalAlerts');
  if(!wrap || !currentEmployeeRole || currentEmployeeRole === 'pendiente') return;
  const cards = [];
  if(['administrador','produccion'].includes(currentEmployeeRole)){
    const critical = suppliesCache.filter(item => item.cantidad <= 0);
    const low = suppliesCache.filter(item => item.cantidad > 0 && item.cantidad <= item.stockMinimo);
    if(critical.length) cards.push({ level:'critical', title:`${critical.length} insumo${critical.length === 1 ? '' : 's'} agotado${critical.length === 1 ? '' : 's'}`,
      detail:critical.slice(0,3).map(item => item.nombre).join(', '), panel:'insumos' });
    if(low.length) cards.push({ level:'warning', title:`${low.length} insumo${low.length === 1 ? '' : 's'} en su stock mínimo`,
      detail:low.slice(0,3).map(item => `${item.nombre} (${item.cantidad} ${item.unidad})`).join(', '), panel:'insumos' });
    const unavailable = productsCache.filter(product => product.disponible === false);
    if(unavailable.length) cards.push({ level:'info', title:`${unavailable.length} producto${unavailable.length === 1 ? '' : 's'} oculto${unavailable.length === 1 ? '' : 's'} del catálogo`,
      detail:'Confirma que estén ocultos intencionalmente.', panel:'productos' });
  }
  if(['administrador','ventas'].includes(currentEmployeeRole)){
    const openOrders = employeeOrdersCache.filter(order => !['entregado','cancelado'].includes(order.estado));
    const overdue = openOrders.filter(order => {
      const created = new Date(order.created_at || order.createdAt || '').getTime();
      return Number.isFinite(created) && Date.now() - created > 24 * 60 * 60 * 1000;
    });
    const dueSoon = openOrders.filter(order => {
      if(!order.fecha_entrega) return false;
      const due = new Date(order.fecha_entrega).getTime();
      return due >= Date.now() && due <= Date.now() + 24 * 60 * 60 * 1000;
    });
    const lateDeliveries = openOrders.filter(order => {
      if(!order.fecha_entrega) return false;
      const due = new Date(order.fecha_entrega).getTime();
      return Number.isFinite(due) && due < Date.now();
    });
    if(lateDeliveries.length) cards.push({ level:'critical', title:`${lateDeliveries.length} entrega${lateDeliveries.length === 1 ? '' : 's'} vencida${lateDeliveries.length === 1 ? '' : 's'}`,
      detail:'Actualiza el pedido o contacta al cliente.', panel:'pedidos' });
    if(overdue.length) cards.push({ level:'warning', title:`${overdue.length} pedido${overdue.length === 1 ? '' : 's'} pendiente${overdue.length === 1 ? '' : 's'} por más de 24 horas`,
      detail:'Revisa su estado y coordina con el cliente.', panel:'pedidos' });
    if(dueSoon.length) cards.push({ level:'info', title:`${dueSoon.length} entrega${dueSoon.length === 1 ? '' : 's'} en las próximas 24 horas`,
      detail:'Verifica preparación y coordinación de entrega.', panel:'pedidos' });
  }
  wrap.style.display = 'block';
  wrap.innerHTML = cards.length ? cards.map(card => `
    <article class="alert-card alert-${card.level}">
      <span class="alert-mark" aria-hidden="true">${card.level === 'critical' ? '!' : card.level === 'warning' ? '⚠' : 'i'}</span>
      <div><strong>${escapeHtml(card.title)}</strong><p>${escapeHtml(card.detail)}</p></div>
      <button type="button" class="btn btn-outline btn-small" data-alert-panel="${card.panel}">Revisar</button>
    </article>`).join('') : '<div class="alert-clear"><strong>✓ Sin alertas activas</strong><span>El inventario y las operaciones están al día.</span></div>';
}

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[char]);
}

function normalizeSupply(s){
  return {
    id: s.id,
    nombre: s.nombre,
    cantidad: Number(s.cantidad),
    unidad: s.unidad,
    stockMinimo: Number(s.stock_minimo),
    proveedor: s.proveedor || '',
    actualizadoAt: s.actualizado_at
  };
}

/* ---------------- UNIVERSAL: NAV + BADGE ---------------- */
function updateCartBadge(){
  const el = document.getElementById('cartCount');
  if(el) el.textContent = getCart().length;
}
function initMobileMenu(){
  const toggle = document.getElementById('menuToggle');
  const links = document.getElementById('navLinks');
  if(!toggle || !links) return;
  toggle.addEventListener('click', ()=> links.classList.toggle('open'));
  links.querySelectorAll('a').forEach(a=>{
    a.addEventListener('click', ()=> links.classList.remove('open'));
  });
}

/* ---------------- TOAST ---------------- */
let toastTimer;
function showToast(msg){
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 2600);
}

/* =========================================================
   PÁGINA: catalogo.html
========================================================= */
function labelForCat(cat){
  return CATEGORY_LABELS[cat] || cat;
}

async function renderProducts(filter='todos'){
  const grid = document.getElementById('productGrid');

  if(!grid) return;

  grid.innerHTML = '<p class="hint">Cargando productos...</p>';

  const products = (await getProducts())
    .filter(p => p.disponible !== false);

  grid.innerHTML = '';

  products.filter(p => filter==='todos' || p.cat===filter).forEach(p=>{
    const card = document.createElement('div');

    card.className = 'product-card';

    card.innerHTML = `
      <div class="product-media ${p.media}">${p.icon}</div>

      <div class="product-body">
        <span class="product-tag">${labelForCat(p.cat)}</span>

        <h3>${p.name}</h3>

        <p class="desc">${p.desc}</p>

        <div class="product-footer">
  <span class="price">
    ${p.customizable ? 'Desde ' : ''}S/ ${p.price.toFixed(2)}
  </span>

  ${p.customizable ? `
    <button class="btn btn-primary btn-small">
      Personalizar
    </button>
  ` : `
    <div class="quantity-control">
      <button type="button" class="qty-btn qty-minus">−</button>
      <span class="qty-value">1</span>
      <button type="button" class="qty-btn qty-plus">+</button>
    </div>

    <button type="button" class="btn btn-outline btn-small add-product-btn">
      Agregar
    </button>
  `}
</div>
      </div>
    `;

  if(p.customizable){
  card.querySelector('button').addEventListener('click', ()=>{
    openCustomize(p);
  });
}else{
  let cantidad = 1;

  const qtyValue = card.querySelector('.qty-value');

  card.querySelector('.qty-minus').addEventListener('click', ()=>{
    if(cantidad > 1){
      cantidad--;
      qtyValue.textContent = cantidad;
    }
  });

  card.querySelector('.qty-plus').addEventListener('click', ()=>{
    cantidad++;
    qtyValue.textContent = cantidad;
  });

  card.querySelector('.add-product-btn').addEventListener('click', ()=>{
    addSimpleToCart(p, cantidad);
  });
}
    grid.appendChild(card);
  });
}

function initCatalogFilters(){
  const filters = document.getElementById('filters');
  if(!filters) return;
  filters.addEventListener('click', e=>{
    const btn = e.target.closest('.filter-btn');
    if(!btn) return;
    filters.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    renderProducts(btn.dataset.filter);
  });
  // Deep-link por categoría vía ?cat=torta
  const params = new URLSearchParams(window.location.search);
  const cat = params.get('cat');
  if(cat){
    const targetBtn = filters.querySelector(`[data-filter="${cat}"]`);
    if(targetBtn){
      filters.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
      targetBtn.classList.add('active');
      renderProducts(cat);
      return;
    }
  }
  renderProducts('todos');
}

function addSimpleToCart(p, cantidad = 1){
  const cart = getCart();

  const existente = cart.find(item =>
    item.name === p.name && item.price === p.price
  );

  if(existente){
    existente.qty += cantidad;
  }else{
    cart.push({
      id: Date.now()+''+Math.random(),
      name: p.name,
      meta: '',
      price: p.price,
      qty: cantidad
    });
  }

  setCart(cart);
  showToast(`${cantidad} x ${p.name} agregado al pedido`);
}

/* ---- Modal de personalización ---- */
let activeCustomProduct = null;
let customSelection = {tamano:0, sabor:0, relleno:0, decoracion:0};

function openCustomize(p){
  activeCustomProduct = p;
  customSelection = {tamano:0, sabor:0, relleno:0, decoracion:0};
  document.getElementById('modalTitle').textContent = `Personaliza tu ${p.name.toLowerCase()}`;
  renderCustomOptions();
  updateModalPrice();
  document.getElementById('customizeModal').classList.add('open');
}
function closeModal(){
  const modal = document.getElementById('customizeModal');
  if(modal) modal.classList.remove('open');
}
function renderCustomOptions(){
  Object.keys(CUSTOM_OPTIONS).forEach(key=>{
    const row = document.getElementById('opt-'+key);
    if(!row) return;
    row.innerHTML = '';
    CUSTOM_OPTIONS[key].forEach((opt, idx)=>{
      const chip = document.createElement('button');
      chip.type='button';
      chip.className = 'chip' + (customSelection[key]===idx ? ' selected' : '');
      chip.textContent = opt.extra>0 ? `${opt.label} (+S/ ${opt.extra})` : opt.label;
      chip.addEventListener('click', ()=>{
        customSelection[key] = idx;
        renderCustomOptions();
        updateModalPrice();
      });
      row.appendChild(chip);
    });
  });
}
function currentCustomPrice(){
  let total = activeCustomProduct.price;
  Object.keys(customSelection).forEach(key=>{
    total += CUSTOM_OPTIONS[key][customSelection[key]].extra;
  });
  return total;
}
function updateModalPrice(){
  const el = document.getElementById('modalPrice');
  if(el) el.textContent = `S/ ${currentCustomPrice().toFixed(2)}`;
}
function addCustomToCart(){
  const metaParts = Object.keys(customSelection).map(key=>{
    const label = {tamano:'Tamaño', sabor:'Sabor', relleno:'Relleno', decoracion:'Decoración'}[key];
    return `${label}: ${CUSTOM_OPTIONS[key][customSelection[key]].label}`;
  });
  const cart = getCart();
  cart.push({
    id:Date.now()+''+Math.random(),
    name:activeCustomProduct.name,
    meta:metaParts.join(' · '),
    price:currentCustomPrice(),
    qty:1
  });
  setCart(cart);
  closeModal();
  showToast('Torta personalizada agregada al pedido');
}

/* =========================================================
   PÁGINA: pedido.html
========================================================= */
let orderType = 'delivery';

function setOrderType(type){
  orderType = type;
  document.getElementById('btnDelivery').classList.toggle('active', type==='delivery');
  document.getElementById('btnEncargo').classList.toggle('active', type==='encargo');
  document.getElementById('deliveryFields').classList.toggle('show', type==='delivery');
  document.getElementById('encargoFields').classList.toggle('show', type==='encargo');
}

function removeFromCart(id){
  const cart = getCart().filter(i=>i.id!==id);
  setCart(cart);
  renderCartPanel();
}

function renderCartPanel(){
  const wrap = document.getElementById('cartItems');
  if(!wrap) return;

  const cart = getCart();
  const totalEl = document.getElementById('cartTotal');

  if(cart.length === 0){
    wrap.innerHTML = '<p class="cart-empty">Aún no agregaste productos. <a href="catalogo.html">Ve al catálogo</a> y elige algo rico 🍮</p>';
  }else{
    wrap.innerHTML = cart.map(item=>{
      const cantidad = item.qty || 1;
      const subtotal = item.price * cantidad;

      return `
        <div class="cart-item">
          <div>
            <div class="ci-name">${item.name}</div>
            ${item.meta ? `<div class="ci-meta">${item.meta}</div>` : ''}
            <div class="ci-meta">S/ ${item.price.toFixed(2)} c/u</div>
          </div>

          <div style="text-align:right;">
            <div class="quantity-control">
              <button type="button" class="qty-btn"
                onclick="changeCartQty('${item.id}', -1)">−</button>

              <span class="qty-value">${cantidad}</span>

              <button type="button" class="qty-btn"
                onclick="changeCartQty('${item.id}', 1)">+</button>
            </div>

            <div class="price" style="font-size:.95rem; margin-top:6px;">
              S/ ${subtotal.toFixed(2)}
            </div>

            <button class="ci-remove"
              onclick="removeFromCart('${item.id}')">
              Quitar
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  const total = cart.reduce(
    (s,i) => s + (i.price * (i.qty || 1)),
    0
  );

  if(totalEl){
    totalEl.textContent = `S/ ${total.toFixed(2)}`;
  }
}
function changeCartQty(id, cambio){
  const cart = getCart();
  const item = cart.find(i => i.id === id);

  if(!item) return;

  item.qty = (item.qty || 1) + cambio;

  if(item.qty <= 0){
    removeFromCart(id);
    return;
  }

  setCart(cart);
  renderCartPanel();
}

async function submitOrder(){

  if(orderSubmissionInProgress) return;

  const cart = getCart();

  if(cart.length === 0){
    showToast('Agrega al menos un producto antes de pedir');
    return;
  }

  const nombre =
    document.getElementById('clienteNombre').value.trim();

  const telefono =
    document.getElementById('clienteTelefono').value.trim();

  if(!nombre || !telefono){
    showToast('Completa tu nombre y teléfono');
    return;
  }

  let detail = {};

  if(orderType === 'delivery'){

    const direccion =
      document.getElementById('direccion').value.trim();

    if(!direccion){
      showToast('Indica tu dirección de entrega');
      return;
    }

    detail = {
      direccion,
      metodoPago:
        document.getElementById('metodoPago').value
    };

  }else{

    const fecha =
      document.getElementById('fechaEntrega').value;

    const anticipo =
      document.getElementById('anticipo').value;

    if(!fecha){
      showToast('Selecciona la fecha de entrega');
      return;
    }

    if(!anticipo || Number(anticipo) <= 0){
      showToast('Registra el anticipo para confirmar tu pedido');
      return;
    }
    const totalPedido = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
    if(Number(anticipo) > totalPedido){
      showToast('El anticipo no puede ser mayor al total del pedido');
      return;
    }

    detail = {
      fechaEntrega: fecha,
      anticipo: Number(anticipo)
    };
  }

  const items = cart.map(item => ({
    nombre: item.name,
    detalle: item.meta || '',
    precio: Number(item.price),
    cantidad: Number(item.qty || 1)
  }));

  const notasBase =
    document.getElementById('notas')
      ? document.getElementById('notas').value.trim()
      : '';

  const submitButton = document.querySelector('#orderForm button[onclick="submitOrder()"]') || document.querySelector('button[onclick="submitOrder()"]');
  const orderCodeKey = 'pd_codigo_pedido_pendiente';
  let orderCode = sessionStorage.getItem(orderCodeKey);
  if(!orderCode){
    const bytes = new Uint8Array(3);
    if(window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
    else for(let index = 0; index < bytes.length; index++) bytes[index] = Math.floor(Math.random() * 256);
    orderCode = `PD-${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
    sessionStorage.setItem(orderCodeKey, orderCode);
  }
  orderSubmissionInProgress = true;
  if(submitButton){ submitButton.disabled = true; submitButton.dataset.originalText = submitButton.textContent; submitButton.textContent = 'Registrando pedido…'; }
  try{

    /* =====================================
       1. GUARDAR PEDIDO
       ===================================== */

    const pedido = await apiRequest('/pedidos', {
      method: 'POST',

      body: JSON.stringify({

        nombre,
        telefono,
        codigo: orderCode,

        tipo: orderType,

        direccion:
          detail.direccion || null,

        fechaEntrega:
          detail.fechaEntrega || null,

        notas: notasBase,

        anticipo: orderType === 'encargo' ? Number(detail.anticipo || 0) : 0,

        metodoPago: detail.metodoPago || 'Pendiente',

        items

      })
    });

    /* =====================================
       3. LIMPIAR CARRITO
       ===================================== */

    setCart([]);

    /* =====================================
       4. GUARDAR DATOS PARA SEGUIMIENTO
       ===================================== */

    sessionStorage.setItem(
      'pd_codigo_pedido',
      pedido.codigo
    );
    sessionStorage.removeItem(orderCodeKey);

    sessionStorage.setItem(
      'pd_telefono_pedido',
      telefono
    );

    showToast(
      `Pedido ${pedido.codigo} registrado correctamente`
    );

    /* =====================================
       5. IR A SEGUIMIENTO
       ===================================== */

    setTimeout(() => {

      window.location.href =
        'seguimiento.html';

    }, 900);

  }catch(error){

    console.error(
      'Error al registrar pedido/venta:',
      error
    );

    showToast(error.message || 'No se pudo confirmar el pedido. Inténtalo nuevamente.');

  }finally{
    orderSubmissionInProgress = false;
    if(submitButton){ submitButton.disabled = false; submitButton.textContent = submitButton.dataset.originalText || 'Confirmar pedido'; }

  }

}
/* =========================================================
   PÁGINA: seguimiento.html
========================================================= */
async function renderOrders(){

  const wrap = document.getElementById('ordersList');

  if(!wrap) return;

  const codigo = sessionStorage.getItem('pd_codigo_pedido');
  const telefono = sessionStorage.getItem('pd_telefono_pedido');

  if(!codigo || !telefono){
    wrap.innerHTML = `
      <p class="no-orders">
        No tienes un pedido seleccionado.
        <a href="catalogo.html">Ver catálogo</a>
      </p>
    `;
    return;
  }

  try{

    wrap.innerHTML = `
      <p class="no-orders">
        Cargando pedido...
      </p>
    `;

    const pedido = await apiRequest(
      `/pedidos/seguimiento/${encodeURIComponent(codigo)}?telefono=${encodeURIComponent(telefono)}`
    );

    const items = typeof pedido.items === 'string'
      ? JSON.parse(pedido.items)
      : pedido.items;

    const estados = {
      pendiente: 'Pendiente',
      confirmado: 'Confirmado',
      en_preparacion: 'En preparación',
      listo: 'Listo',
      en_camino: 'En camino',
      entregado: 'Entregado',
      cancelado: 'Cancelado'
    };

    const estadoTexto =
      estados[pedido.estado] || pedido.estado;

    const estadosOrden = [
      'pendiente',
      'confirmado',
      'en_preparacion',
      'listo',
      'entregado'
    ];

    const estadoActual =
      estadosOrden.indexOf(pedido.estado);

    wrap.innerHTML = `
      <div class="order-card">

        <div class="order-card-top">

          <div>

            <div class="order-id">
              ${pedido.codigo}
              ·
              ${pedido.tipo === 'delivery'
                ? 'Delivery'
                : 'Por encargo'}
            </div>

            <div class="order-sub">
              Cliente: ${pedido.cliente_nombre}
            </div>

            <div class="order-sub">
              Estado:
              <strong>${estadoTexto}</strong>
            </div>

            <div class="order-sub">
              Total:
              <strong>
                S/ ${Number(pedido.total).toFixed(2)}
              </strong>
            </div>

          </div>

        </div>

        <div class="stepper">

          ${STATUS_STEPS.map((s, i) => `

            <div class="step ${i <= estadoActual ? 'done' : ''}">

              <div class="bar"></div>

              <div class="dot">
                ${i <= estadoActual ? '✓' : ''}
              </div>

              <div class="lbl">
                ${s}
              </div>

            </div>

          `).join('')}

        </div>

        <div style="margin-top:20px;">

          <h3>Productos</h3>

          ${items.map(item => `

            <div class="order-sub">

              ${item.nombre}
              × ${item.cantidad}

              —
              S/ ${(
                Number(item.precio) *
                Number(item.cantidad)
              ).toFixed(2)}

            </div>

          `).join('')}

        </div>

        ${
          pedido.direccion
            ? `
              <div class="order-sub" style="margin-top:15px;">
                Dirección:
                ${pedido.direccion}
              </div>
            `
            : ''
        }

      </div>
    `;

  }catch(error){

    console.error(
      'Error al consultar pedido:',
      error
    );

    wrap.innerHTML = `
      <p class="no-orders">
        ${error.message || 'No se pudo consultar el pedido.'}
      </p>
    `;

  }

}
async function advanceOrder(id, estadoActual){

  const estados = [
    'pendiente',
    'confirmado',
    'en_preparacion',
    'listo',
    'en_camino',
    'entregado'
  ];

  const posicion =
    estados.indexOf(estadoActual);

  if(
    posicion === -1 ||
    posicion >= estados.length - 1
  ){
    return;
  }

  const nuevoEstado =
    estados[posicion + 1];

  try{

    await apiRequest(
      `/pedidos/${id}/estado`,
      {
        method: 'PATCH',

        body: JSON.stringify({
          estado: nuevoEstado
        })
      }
    );

    await renderOrders();

    showToast(
      `Pedido actualizado: ${nuevoEstado}`
    );

  }catch(error){

    console.error(
      'Error al actualizar pedido:',
      error
    );

    showToast(
      error.message ||
      'No se pudo actualizar el pedido'
    );

  }

}

/* =========================================================
   PÁGINA: empleado-login.html
========================================================= */
function initEmployeeAuth(){
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  if(!loginForm && !registerForm) return;

  // Si ya hay sesión activa, ir directo al panel
  if(getSession() && getToken()){ window.location.href = 'empleado-panel.html'; return; }

  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  tabLogin.addEventListener('click', ()=>{
    tabLogin.classList.add('active'); tabRegister.classList.remove('active');
    loginForm.classList.add('show'); registerForm.classList.remove('show');
  });
  tabRegister.addEventListener('click', ()=>{
    tabRegister.classList.add('active'); tabLogin.classList.remove('active');
    registerForm.classList.add('show'); loginForm.classList.remove('show');
  });

  loginForm.addEventListener('submit', async e=>{
    e.preventDefault();
    const usuario = document.getElementById('loginUsuario').value.trim();
    const password = document.getElementById('loginPassword').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true; submitBtn.textContent = 'Ingresando...';
    try {
      const data = await apiRequest('/auth/login', {
        method:'POST', body: JSON.stringify({usuario, password})
      });
      setToken(data.token);
      setSession(data.empleado);
      window.location.href = 'empleado-panel.html';
    } catch(err){
      showToast(err.message);
      submitBtn.disabled = false; submitBtn.textContent = originalText;
    }
  });

  registerForm.addEventListener('submit', async e=>{
    e.preventDefault();
    const nombre_completo = document.getElementById('regNombre').value.trim();
    const usuario = document.getElementById('regUsuario').value.trim();
    const password = document.getElementById('regPassword').value;
    const password2 = document.getElementById('regPassword2').value;
    const telefono = document.getElementById('regTelefono').value.trim();

    if(!nombre_completo || !usuario || !password){ showToast('Completa nombre, usuario y contraseña'); return; }
    if(password.length < 4){ showToast('La contraseña debe tener al menos 4 caracteres'); return; }
    if(password !== password2){ showToast('Las contraseñas no coinciden'); return; }

    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true; submitBtn.textContent = 'Creando cuenta...';
    try {
      const data = await apiRequest('/auth/registro', {
        method:'POST', body: JSON.stringify({nombre_completo, telefono, usuario, password})
      });
      setToken(data.token);
      setSession(data.empleado);
      showToast(`Cuenta creada, ${nombre_completo.split(' ')[0]}. Un administrador debe asignarte un rol.`);
      setTimeout(()=>{ window.location.href = 'empleado-panel.html'; }, 900);
    } catch(err){
      showToast(err.message);
      submitBtn.disabled = false; submitBtn.textContent = originalText;
    }
  });
}

/* =========================================================
   PÁGINA: empleado-panel.html
========================================================= */
let editingProductId = null;
let editingSupplyId = null;
let purchaseItems = [];
let manualSaleItems = [];
let editingSaleId = null;
let editingPurchaseDetailId = null;

function requireEmployeeSession(){
  const panel = document.getElementById('employeePanel');
  if(!panel) return null;
  const session = getSession();
  if(!session || !getToken()){ window.location.href = 'empleado-login.html'; return null; }
  return session;
}

// Muestra u oculta pestañas del panel según el rol de la cuenta.
function applyRolePermissions(rol){
  const tabsWrap = document.querySelector('.panel-tabs');
  const notice = document.getElementById('pendingNotice');

  if(rol === 'pendiente' || !ROLE_TABS[rol]){
    if(tabsWrap) tabsWrap.style.display = 'none';
    document.querySelectorAll('.panel-section').forEach(s=>s.classList.remove('show'));
    if(notice) notice.style.display = 'block';
    return false;
  }

  if(notice) notice.style.display = 'none';
  if(tabsWrap) tabsWrap.style.display = '';

  const allowedTabs = ROLE_TABS[rol];
  const tabs = document.querySelectorAll('.panel-tab');
  tabs.forEach(tab=>{
    tab.style.display = allowedTabs.includes(tab.dataset.panel) ? '' : 'none';
  });

  // Activa la primera pestaña permitida
  tabs.forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.panel-section').forEach(s=>s.classList.remove('show'));
  const visibleTabs = Array.from(tabs).filter(t=>t.style.display!=='none');
  if(visibleTabs[0]){
    visibleTabs[0].classList.add('active');
    document.getElementById('panel-'+visibleTabs[0].dataset.panel).classList.add('show');
  }
  return true;
}

async function initEmployeePanel(){
  const session = requireEmployeeSession();
  if(!session) return;

  document.getElementById('logoutBtn').addEventListener('click', ()=>{
    clearSession();
    window.location.href = 'empleado-login.html';
  });

  document.getElementById('empNombre').textContent = session.nombre;
  document.getElementById('empCargo').textContent = ROLE_LABELS[session.rol] || session.rol;

  // Refresca el rol contra el servidor por si un administrador lo cambió
  // desde el último inicio de sesión.
  let me;
  try {
    me = await apiRequest('/auth/me');
  } catch(err){
    showToast(err.message);
    clearSession();
    window.location.href = 'empleado-login.html';
    return;
  }
  const empleado = { id: me.id, nombre: me.nombre_completo, usuario: me.usuario, rol: me.rol };
  setSession(empleado);
  currentEmployeeRole = empleado.rol;
  document.getElementById('empNombre').textContent = empleado.nombre;
  document.getElementById('empCargo').textContent = ROLE_LABELS[empleado.rol] || empleado.rol;

  const dashboardGreeting = document.getElementById('dashboardGreeting');
  const dashboardWelcomeText = document.getElementById('dashboardWelcomeText');
  const dashboardPeriod = document.getElementById('dashboardPeriod');
  const dashboardSalesButton = document.querySelector('[data-dashboard-panel="ventas"]');
  if(dashboardGreeting) dashboardGreeting.textContent = `Hola, ${empleado.nombre.split(' ')[0]}`;
  if(dashboardWelcomeText) dashboardWelcomeText.textContent = empleado.rol === 'ventas'
    ? 'Este es tu resumen de atención y ventas. Los indicadores corresponden a la semana actual.'
    : 'Consulta el movimiento de ventas y pedidos registrados en Punto Dulce.';
  if(dashboardPeriod) dashboardPeriod.textContent = empleado.rol === 'ventas'
    ? `Semana ${formatWeekRange()}`
    : `Actualizado ${new Date().toLocaleDateString('es-PE', { day:'numeric', month:'short', year:'numeric' })}`;
  if(dashboardSalesButton && !ROLE_TABS[empleado.rol]?.includes('ventas')) dashboardSalesButton.hidden = true;

  const tienePermisos = applyRolePermissions(empleado.rol);

  initPanelTabs();
  document.querySelector('[data-dashboard-panel]')?.addEventListener('click', event => {
    const panel = event.currentTarget.dataset.dashboardPanel;
    document.querySelector(`.panel-tab[data-panel="${panel}"]`)?.click();
  });
  if(['administrador','ventas'].includes(empleado.rol)){
    if(empleado.rol === 'administrador'){
      document.getElementById('adminAnalytics').hidden = false;
      document.getElementById('standardSummary').hidden = true;
      await Promise.all([renderSales(), renderEmployeeOrders()]);
      productsCache = await getProducts();
    }else{
      document.getElementById('adminAnalytics').hidden = true;
      document.getElementById('standardSummary').hidden = false;
      renderStats();
      renderSales();
      renderEmployeeOrders();
      productsCache = await getProducts();
    }
  }
  if(['administrador','produccion'].includes(empleado.rol)){
    await renderAdminProducts();
    await renderSupplies();
    renderPurchaseOrders();
  }
  if(empleado.rol === 'administrador'){
    renderPersonalList();
    renderAdminDashboard();
  }

  const periodFilter = document.getElementById('adminPeriodFilter');
  periodFilter?.addEventListener('change', () => {
    const custom = periodFilter.value === 'custom';
    document.getElementById('adminFromWrap').hidden = !custom;
    document.getElementById('adminToWrap').hidden = !custom;
    renderAdminDashboard();
  });
  ['adminFrom','adminTo'].forEach(id=>document.getElementById(id)?.addEventListener('change', renderAdminDashboard));
  document.getElementById('btnRefreshAdminDashboard')?.addEventListener('click', refreshAdminDashboard);
  document.getElementById('btnExportAdminDashboard')?.addEventListener('click', exportAdminDashboardPdf);

  document.getElementById('btnNuevoProducto').addEventListener('click', ()=> openProductModal());
  document.getElementById('productForm').addEventListener('submit', submitProductForm);
  document.getElementById('productModalClose').addEventListener('click', closeProductModal);
  document.getElementById('productCustomizable').addEventListener('change', e=>{
    document.getElementById('customPriceHint').style.display = e.target.checked ? 'block' : 'none';
  });

  document.getElementById('btnNuevoInsumo').addEventListener('click', ()=> openSupplyModal());
  document.getElementById('supplyForm').addEventListener('submit', submitSupplyForm);
  document.getElementById('supplyModalClose').addEventListener('click', closeSupplyModal);

  document.getElementById('btnNuevaCompra').addEventListener('click', ()=> openPurchaseModal());
  document.getElementById('purchaseForm').addEventListener('submit', submitPurchaseForm);
  document.getElementById('purchaseModalClose').addEventListener('click', closePurchaseModal);
   document.getElementById('btnAgregarArticulo').addEventListener('click', addPurchaseItem);
  document.getElementById('purchaseEditModalClose').addEventListener('click', closePurchaseEditModal);
  document.getElementById('purchaseEditForm').addEventListener('submit', submitPurchaseEditForm);

  bindPanelFilters();
  document.getElementById('btnActualizarVentas').addEventListener('click', renderSales);
  document.getElementById('btnExportSalesPdf').addEventListener('click', exportSalesPdf);
  document.getElementById('operationalAlerts').addEventListener('click', event => {
    const button = event.target.closest('[data-alert-panel]');
    if(button) document.querySelector(`.panel-tab[data-panel="${button.dataset.alertPanel}"]`)?.click();
  });
  document.getElementById('salesTableBody').addEventListener('click', event => {
    const button = event.target.closest('[data-sale-id]');
    if(button) showSaleDetails(button.dataset.saleId);
  });
  document.getElementById('saleDetailModalClose').addEventListener('click', () => document.getElementById('saleDetailModal').classList.remove('open'));
  document.getElementById('btnNuevaVenta').addEventListener('click', openSaleModal);
  document.getElementById('saleModalClose').addEventListener('click', closeSaleModal);
  document.getElementById('btnAddSaleItem').addEventListener('click', addManualSaleItem);
  document.getElementById('saleForm').addEventListener('submit', submitManualSale);

  if(!tienePermisos) return;
}

/* ---- Personal: asignación de roles (solo administrador) ---- */
function roleOptionsHtml(selected){
  return Object.entries(ROLE_LABELS).map(([value,label])=>
    `<option value="${value}" ${value===selected ? 'selected' : ''}>${label}</option>`
  ).join('');
}

async function renderPersonalList(){
  const tbody = document.getElementById('personalTableBody');
  if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="hint" style="padding:16px 0;">Cargando personal...</td></tr>';

  let empleados;
  try {
    empleados = await apiRequest('/empleados');
  } catch(err){
    tbody.innerHTML = `<tr><td colspan="5" class="hint" style="padding:16px 0;">${err.message}</td></tr>`;
    return;
  }

  if(empleados.length===0){
    tbody.innerHTML = '<tr><td colspan="5" class="hint" style="padding:16px 0;">No hay cuentas de personal registradas.</td></tr>';
    return;
  }

  tbody.innerHTML = empleados.map(emp=>`
    <tr>
      <td>${emp.nombre_completo}<br><span class="hint" style="margin:0;">@${emp.usuario}</span></td>
      <td><select class="role-select personal-role-select" data-emp-id="${emp.id}">${roleOptionsHtml(emp.rol)}</select></td>
      <td><span class="pill ${emp.activo ? 'pill-ok':'pill-off'}">${emp.activo ? 'Activa':'Deshabilitada'}</span></td>
      <td>${new Date(emp.fecha_registro).toLocaleDateString('es-PE')}</td>
      <td class="table-actions">
        <button class="btn btn-outline btn-small" onclick="guardarRolPersonal(${emp.id})">Guardar rol</button>
        <button class="btn btn-small ${emp.activo ? 'btn-danger' : ''}" onclick="toggleEstadoPersonal(${emp.id}, ${emp.activo ? 'false' : 'true'})">${emp.activo ? 'Deshabilitar' : 'Habilitar'}</button>
      </td>
    </tr>
  `).join('');
}

async function guardarRolPersonal(id){
  const select = document.querySelector(`.personal-role-select[data-emp-id="${id}"]`);
  if(!select) return;
  try {
    await apiRequest(`/empleados/${id}/rol`, { method:'PUT', body: JSON.stringify({ rol: select.value }) });
    showToast('Rol actualizado');
    renderPersonalList();
  } catch(err){
    showToast(err.message);
  }
}

async function toggleEstadoPersonal(id, activo){
  try {
    await apiRequest(`/empleados/${id}/estado`, { method:'PUT', body: JSON.stringify({ activo }) });
    showToast(activo ? 'Cuenta habilitada' : 'Cuenta deshabilitada');
    renderPersonalList();
  } catch(err){
    showToast(err.message);
  }
}

/* ---- Tabs del panel ---- */
function initPanelTabs(){
  const tabs = document.querySelectorAll('.panel-tab');
  tabs.forEach(tab=>{
    tab.addEventListener('click', ()=>{
      tabs.forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.panel-section').forEach(s=>s.classList.remove('show'));
      document.getElementById('panel-'+tab.dataset.panel).classList.add('show');
    });
  });
}

/* ---- Resumen / estadísticas de ventas ---- */
async function computeStats(soloSemana){

const [respuestaPedidos, ventas] =
  await Promise.all([
    fetchAllEmployeeOrders(),
    apiRequest('/ventas')
  ]);
let orders = respuestaPedidos;

let sales =
  Array.isArray(ventas)
    ? ventas
    : [];

  if(soloSemana){

    orders = orders.filter(o =>
      isInCurrentWeek(
        o.created_at || o.createdAtISO || o.createdAt
      )
    );

    sales = sales.filter(v =>
      isInCurrentWeek(v.fecha || v.created_at)
    );
  }

  const totalPedidos = orders.length;

  const ventasTotales = sales.reduce(
    (s, v) => s + Number(v.total || 0),
    0
  );

  const pendientes = orders.filter(o =>
    o.estado !== 'entregado' &&
    o.estado !== 'cancelado'
  ).length;

  const entregados = orders.filter(o =>
    o.estado === 'entregado'
  ).length;

  const porTipo = {
    delivery: 0,
    encargo: 0
  };

  orders.forEach(o => {

    const tipo =
      o.tipo === 'encargo'
        ? 'encargo'
        : 'delivery';

    porTipo[tipo] += Number(o.total || 0);

  });

  const productCount = {};

  sales.forEach(v => {

    let items = v.items;
    if(!Array.isArray(items)) items = getSaleDetails(v).items;

    if(typeof items === 'string'){
      try {
        items = JSON.parse(items);
      } catch {
        items = [];
      }
    }

    if(!Array.isArray(items)) return;

    items.forEach(item => {

      const nombre =
        item.nombre ||
        item.name ||
        'Producto';

      const cantidad =
        Number(
          item.cantidad ||
          item.qty ||
          1
        );

      productCount[nombre] =
        (productCount[nombre] || 0) + cantidad;

    });
  });

  const topProducts =
    Object.entries(productCount)
      .sort((a,b) => b[1] - a[1])
      .slice(0,5);

  return {
    totalPedidos,
    totalVentas: sales.length,
    ventasTotales,
    pendientes,
    entregados,
    porTipo,
    topProducts
  };
}


async function renderStats(){

  if(currentEmployeeRole === 'administrador'){
    await refreshAdminDashboard();
    return;
  }

  const wrap =
    document.getElementById('statsCards');

  if(!wrap) return;

  const soloSemana =
    soloSemanaParaRolActual();

  const s =
    await computeStats(soloSemana);

  const scopeNote =
    document.getElementById('statsScopeNote');

  if(scopeNote){

    scopeNote.textContent =
      soloSemana
        ? `Mostrando la semana en curso (${formatWeekRange()}). El administrador ve el historial completo.`
        : 'Historial completo (vista de administrador).';

  }

  wrap.innerHTML = `
    <div class="stat-card dashboard-stat">
      <span class="dashboard-stat-icon" aria-hidden="true">📦</span>
      <span class="stat-label">Pedidos recibidos</span>
      <span class="stat-value">${s.totalPedidos}</span>
      <span class="dashboard-stat-note">En el período mostrado</span>
    </div>

    <div class="stat-card dashboard-stat dashboard-stat-primary">
      <span class="dashboard-stat-icon" aria-hidden="true">💳</span>
      <span class="stat-label">Ingresos por ventas</span>
      <span class="stat-value">S/ ${s.ventasTotales.toFixed(2)}</span>
      <span class="dashboard-stat-note">${s.totalVentas} ${s.totalVentas === 1 ? 'venta registrada' : 'ventas registradas'}</span>
    </div>

    <div class="stat-card dashboard-stat">
      <span class="dashboard-stat-icon" aria-hidden="true">⏳</span>
      <span class="stat-label">Por atender</span>
      <span class="stat-value">${s.pendientes}</span>
      <span class="dashboard-stat-note">Pedidos pendientes o en preparación</span>
    </div>

    <div class="stat-card dashboard-stat">
      <span class="dashboard-stat-icon" aria-hidden="true">✓</span>
      <span class="stat-label">Pedidos entregados</span>
      <span class="stat-value">${s.entregados}</span>
      <span class="dashboard-stat-note">Completados en el período</span>
    </div>
  `;

  const maxTipo =
    Math.max(
      s.porTipo.delivery,
      s.porTipo.encargo,
      1
    );

  const tipoWrap =
    document.getElementById('statsPorTipo');

  if(tipoWrap){

    tipoWrap.innerHTML = `
      <div class="bar-row">
        <span class="bar-lbl">Delivery</span>

        <div class="bar-track">
          <div
            class="bar-fill"
            style="width:${(
              s.porTipo.delivery /
              maxTipo * 100
            )}%">
          </div>
        </div>

        <span class="bar-val">
          S/ ${s.porTipo.delivery.toFixed(2)}
        </span>
      </div>

      <div class="bar-row">
        <span class="bar-lbl">Por encargo</span>

        <div class="bar-track">
          <div
            class="bar-fill"
            style="width:${(
              s.porTipo.encargo /
              maxTipo * 100
            )}%">
          </div>
        </div>

        <span class="bar-val">
          S/ ${s.porTipo.encargo.toFixed(2)}
        </span>
      </div>
    `;
  }

  const topWrap =
    document.getElementById('statsTopProducts');

  if(!topWrap) return;

  if(s.topProducts.length === 0){

    topWrap.innerHTML = `
      <p class="hint" style="margin:0;">
        Todavía no hay ventas registradas
        para calcular el ranking.
      </p>
    `;

  }else{

    const maxCount =
      s.topProducts[0][1];

    topWrap.innerHTML =
      s.topProducts.map(([name,count]) => `
        <div class="bar-row">

          <span class="bar-lbl">
            ${name}
          </span>

          <div class="bar-track">
            <div
              class="bar-fill"
              style="width:${(
                count / maxCount * 100
              )}%">
            </div>
          </div>

          <span class="bar-val">
            ${count}
          </span>

        </div>
      `).join('');
  }

}

function adminDateKey(value){
  if(!value) return '';
  const raw = String(value).slice(0, 10);
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function adminDateLabel(key, options = { day:'2-digit', month:'2-digit' }){
  if(!key) return '—';
  return new Date(`${key}T12:00:00`).toLocaleDateString('es-PE', options);
}

function getAdminDashboardRange(){
  const mode = document.getElementById('adminPeriodFilter')?.value || 'all';
  if(mode === 'custom') return {
    from: document.getElementById('adminFrom')?.value || '',
    to: document.getElementById('adminTo')?.value || '',
    label: `${document.getElementById('adminFrom')?.value || 'Inicio'} — ${document.getElementById('adminTo')?.value || 'Hoy'}`
  };
  if(mode === 'month'){
    const now = new Date();
    return { from:`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`, to:adminDateKey(now), label:'Este mes' };
  }
  if(mode === '7'){
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate()-6);
    return { from:adminDateKey(from), to:adminDateKey(to), label:'Últimos 7 días' };
  }
  return { from:'', to:'', label:'Todo el historial' };
}

function adminInRange(value, range){
  const key = adminDateKey(value);
  return !!key && (!range.from || key >= range.from) && (!range.to || key <= range.to);
}

function adminItems(order){
  let items = order.items;
  if(typeof items === 'string'){
    try { items = JSON.parse(items); } catch { items = []; }
  }
  return Array.isArray(items) ? items : [];
}

function renderAdminBars(elementId, entries, formatter = value => String(value)){
  const wrap = document.getElementById(elementId);
  if(!wrap) return;
  const valid = entries.filter(([, value]) => Number(value) > 0);
  if(!valid.length){ wrap.innerHTML = '<p class="admin-empty">Sin datos para este período.</p>'; return; }
  const max = Math.max(...valid.map(([, value]) => Number(value)), 1);
  wrap.innerHTML = valid.map(([label, value]) => `<div class="admin-bar-row"><span class="admin-bar-label" title="${escapeHtml(label)}">${escapeHtml(label)}</span><span class="admin-bar-track"><span class="admin-bar-fill" style="width:${Math.max(3, Number(value)/max*100)}%"></span></span><strong class="admin-bar-value">${escapeHtml(formatter(value))}</strong></div>`).join('');
}

function renderAdminDashboard(){
  const root = document.getElementById('adminAnalytics');
  if(!root || currentEmployeeRole !== 'administrador') return;
  const range = getAdminDashboardRange();
  const inRangeOrders = employeeOrdersCache.filter(order => adminInRange(order.created_at, range));
  const inRangeSales = salesCache.filter(sale => adminInRange(sale.fecha || sale.fecha_iso, range));
  const orders = inRangeOrders;
  const activeOrders = orders.filter(order => order.estado !== 'cancelado');
  const revenue = activeOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const delivered = orders.filter(order => order.estado === 'entregado').length;
  const pending = orders.filter(order => !['entregado','cancelado'].includes(order.estado)).length;
  const customerMap = new Map();
  activeOrders.forEach(order => {
    const name = String(order.cliente_nombre || 'Cliente').trim();
    const phone = String(order.cliente_telefono || '').trim();
    const key = phone || name.toLocaleLowerCase('es');
    const customer = customerMap.get(key) || { nombre:name, telefono:phone, pedidos:0, gasto:0 };
    customer.pedidos++;
    customer.gasto += Number(order.total || 0);
    customerMap.set(key, customer);
  });
  const deposits = activeOrders.reduce((sum, order) => sum + (order.anticipo === null || order.anticipo === undefined ? 0 : Math.max(0, Number(order.anticipo) || 0)), 0);
  const outstanding = activeOrders.filter(order => order.tipo === 'encargo' && order.anticipo !== null && order.anticipo !== undefined && !['entregado','cancelado'].includes(order.estado))
    .reduce((sum, order) => sum + Math.max(0, Number(order.total || 0)-Number(order.anticipo || 0)), 0);
  const completedDenominator = activeOrders.length;
  const avgTicket = completedDenominator ? revenue/completedDenominator : 0;
  const fulfillment = completedDenominator ? Math.round(delivered/completedDenominator*100) : 0;
  const kpis = document.getElementById('adminDashboardKpis');
  if(kpis) kpis.innerHTML = `
    <article class="stat-card dashboard-stat"><span class="dashboard-stat-icon" aria-hidden="true">📦</span><span class="stat-label">Pedidos totales</span><span class="stat-value">${orders.length}</span><span class="dashboard-stat-note">${range.label}</span></article>
    <article class="stat-card dashboard-stat dashboard-stat-primary"><span class="dashboard-stat-icon" aria-hidden="true">💳</span><span class="stat-label">Ventas totales</span><span class="stat-value">S/ ${revenue.toFixed(2)}</span><span class="dashboard-stat-note">Pedidos no cancelados</span></article>
    <article class="stat-card dashboard-stat"><span class="dashboard-stat-icon" aria-hidden="true">🧾</span><span class="stat-label">Ticket promedio</span><span class="stat-value">S/ ${avgTicket.toFixed(2)}</span><span class="dashboard-stat-note">Por pedido activo</span></article>
    <article class="stat-card dashboard-stat"><span class="dashboard-stat-icon" aria-hidden="true">🚚</span><span class="stat-label">Tasa de entrega</span><span class="stat-value">${fulfillment}%</span><span class="dashboard-stat-note">${delivered} pedidos entregados</span></article>
    <article class="stat-card dashboard-stat"><span class="dashboard-stat-icon" aria-hidden="true">⏳</span><span class="stat-label">Pedidos pendientes</span><span class="stat-value">${pending}</span><span class="dashboard-stat-note">Por atender o completar</span></article>
    <article class="stat-card dashboard-stat"><span class="dashboard-stat-icon" aria-hidden="true">👥</span><span class="stat-label">Clientes</span><span class="stat-value">${customerMap.size}</span><span class="dashboard-stat-note">${[...customerMap.values()].filter(customer => customer.pedidos > 1).length} recurrentes</span></article>
    <article class="stat-card dashboard-stat"><span class="dashboard-stat-icon" aria-hidden="true">💰</span><span class="stat-label">Anticipos recibidos</span><span class="stat-value">S/ ${deposits.toFixed(2)}</span><span class="dashboard-stat-note">Pedidos antiguos sin dato se omiten</span></article>
    <article class="stat-card dashboard-stat"><span class="dashboard-stat-icon" aria-hidden="true">🧮</span><span class="stat-label">Saldo por cobrar</span><span class="stat-value">S/ ${outstanding.toFixed(2)}</span><span class="dashboard-stat-note">Encargos con anticipo registrado y pendientes</span></article>`;

  const byType = { delivery:0, encargo:0 };
  const statusLabels = { pendiente:'Pendiente', confirmado:'Confirmado', en_preparacion:'En preparación', listo:'Listo', en_camino:'En camino', entregado:'Entregado', cancelado:'Cancelado' };
  const statusCounts = Object.fromEntries(Object.keys(statusLabels).map(key => [key,0]));
  const productCounts = new Map();
  const categorySales = new Map();
  const soldNames = new Set();
  activeOrders.forEach(order => {
    byType[order.tipo === 'encargo' ? 'encargo' : 'delivery'] += Number(order.total || 0);
    if(statusCounts[order.estado] !== undefined) statusCounts[order.estado]++;
    adminItems(order).forEach(item => {
      const name = String(item.nombre || item.name || 'Producto');
      const quantity = Number(item.cantidad || item.qty || 1);
      const price = Number(item.precio || item.price || 0);
      productCounts.set(name, (productCounts.get(name) || 0)+quantity);
      soldNames.add(name.toLocaleLowerCase('es'));
      const product = productsCache.find(row => String(row.id) === String(item.id || item.producto_id) || row.name?.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'));
      const category = product?.cat || 'otros';
      const categoryName = CATEGORY_LABELS[category] || (category === 'otros' ? 'Otros' : category);
      categorySales.set(categoryName, (categorySales.get(categoryName) || 0)+quantity*price);
    });
  });
  const topProducts = [...productCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
  renderAdminBars('adminSalesByType', Object.entries(byType), value => `S/ ${Number(value).toFixed(2)}`);
  renderAdminBars('adminTopProducts', topProducts, value => `${value} uds.`);
  renderAdminBars('adminSalesByCategory', [...categorySales.entries()].sort((a,b)=>b[1]-a[1]), value => `S/ ${Number(value).toFixed(2)}`);

  const orderStates = document.getElementById('adminOrderStates');
  if(orderStates){
    const colors = ['#d6a646','#d98da2','#9a6b9b','#722b49','#64748b','#438a6a','#c75e51'];
    const stateEntries = Object.entries(statusCounts);
    let cursor = 0;
    const gradientParts = stateEntries.map(([key,count], index) => {
      const start = cursor; cursor += orders.length ? count/orders.length*100 : 0;
      return `${colors[index]} ${start}% ${cursor}%`;
    });
    orderStates.innerHTML = orders.length ? `<div class="admin-status-layout"><div class="admin-status-ring" style="background:conic-gradient(${gradientParts.join(',')})"><span><strong>${orders.length}</strong><small>pedidos</small></span></div><div class="admin-status-legend">${stateEntries.filter(([,count])=>count>0).map(([key,count])=>`<div><i style="background:${colors[stateEntries.findIndex(([status])=>status===key)]}"></i><span>${statusLabels[key]}</span><strong>${count}</strong></div>`).join('')}</div></div>` : '<p class="admin-empty">Sin pedidos para este período.</p>';
  }

  const today = new Date();
  const trend = [];
  for(let offset=6;offset>=0;offset--){
    const date = new Date(today); date.setDate(today.getDate()-offset);
    const key = adminDateKey(date);
    const amount = employeeOrdersCache.filter(order => adminDateKey(order.created_at) === key && order.estado !== 'cancelado').reduce((sum,order)=>sum+Number(order.total||0),0);
    trend.push({key, amount});
  }
  const trendMax = Math.max(...trend.map(day=>day.amount), 1);
  const trendWrap = document.getElementById('adminSalesTrend');
  if(trendWrap) trendWrap.innerHTML = `<div class="admin-trend-bars">${trend.map(day=>`<div class="admin-trend-column"><strong>S/ ${day.amount.toFixed(0)}</strong><span class="admin-trend-bar" style="height:${Math.max(day.amount ? 8 : 2, day.amount/trendMax*100)}%"></span><small>${adminDateLabel(day.key)}</small></div>`).join('')}</div>`;

  const orderByCode = new Map(orders.map(order => [String(order.codigo), order]));
  const orderById = new Map(orders.map(order => [String(order.id), order]));
  const payments = new Map();
  inRangeSales.forEach(sale => {
    const order = orderById.get(String(sale.pedido_id || '')) || orderByCode.get(String(sale.id || ''));
    if(!order || order.tipo !== 'delivery') return;
    const { payment } = getSaleDetails(sale);
    const label = payment || 'Pendiente';
    payments.set(label, (payments.get(label) || 0)+1);
  });
  renderAdminBars('adminPaymentMethods', [...payments.entries()].sort((a,b)=>b[1]-a[1]), value => `${value} ped.`);

  const customers = [...customerMap.values()].sort((a,b)=>b.gasto-a.gasto).slice(0,5);
  const customerWrap = document.getElementById('adminTopCustomers');
  if(customerWrap) customerWrap.innerHTML = customers.length ? `<div class="admin-mini-table"><div class="admin-mini-head"><span>Cliente</span><span>Pedidos</span><span>Gasto</span></div>${customers.map(customer=>`<div class="admin-mini-row"><span><strong>${escapeHtml(customer.nombre)}</strong>${customer.telefono ? `<small>${escapeHtml(customer.telefono)}</small>` : ''}</span><span>${customer.pedidos}</span><strong>S/ ${customer.gasto.toFixed(2)}</strong></div>`).join('')}</div>` : '<p class="admin-empty">Aún no hay clientes en este período.</p>';

  const lowStock = suppliesCache.filter(item => item.cantidad <= item.stockMinimo);
  const inventoryWrap = document.getElementById('adminInventoryAlerts');
  if(inventoryWrap) inventoryWrap.innerHTML = suppliesCache.length ? `<p class="admin-card-subtitle">${suppliesCache.length} insumos registrados · ${lowStock.length} con stock bajo</p>${lowStock.length ? lowStock.slice(0,5).map(item=>`<div class="admin-inventory-row"><span>${escapeHtml(item.nombre)}</span><strong class="${item.cantidad <= 0 ? 'inventory-empty' : ''}">${item.cantidad} ${escapeHtml(item.unidad)} <small>(mín. ${item.stockMinimo})</small></strong></div>`).join('') : '<p class="admin-empty">Todos los insumos están sobre su mínimo.</p>'}` : '<p class="admin-empty">No hay insumos registrados.</p>';

  const catalogWrap = document.getElementById('adminCatalogStatus');
  if(catalogWrap){
    const available = productsCache.filter(product=>product.disponible !== false).length;
    const notSold = productsCache.filter(product=>!soldNames.has(String(product.name).toLocaleLowerCase('es'))).length;
    catalogWrap.innerHTML = `<div class="admin-catalog-row"><span>Productos en catálogo</span><strong>${productsCache.length}</strong></div><div class="admin-catalog-row"><span>Disponibles</span><strong>${available}</strong></div><div class="admin-catalog-row"><span>Sin ventas en el período</span><strong>${notSold}</strong></div>`;
  }

  const recentWrap = document.getElementById('adminRecentOrders');
  if(recentWrap){
    const recent = [...orders].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,5);
    recentWrap.innerHTML = recent.length ? `<div class="admin-recent-list">${recent.map(order=>`<div class="admin-recent-row"><div><strong>${escapeHtml(order.codigo)}</strong><small>${escapeHtml(order.cliente_nombre)} · ${order.tipo === 'encargo' ? 'Encargo' : 'Delivery'}</small></div><span class="pill ${order.estado === 'entregado' ? 'pill-ok' : 'pill-neutral'}">${statusLabels[order.estado] || escapeHtml(order.estado)}</span><strong>S/ ${Number(order.total||0).toFixed(2)}</strong></div>`).join('')}</div>` : '<p class="admin-empty">No hay pedidos recientes en este período.</p>';
  }
  currentAdminDashboardReport = { range:range.label, orders, activeOrders, revenue, avgTicket, fulfillment, pending, customers:[...customerMap.values()], deposits, outstanding, byType, topProducts, statusCounts, categorySales, payments, lowStock };
}

async function refreshAdminDashboard(){
  const button = document.getElementById('btnRefreshAdminDashboard');
  if(button){ button.disabled = true; button.textContent = 'Cargando…'; }
  try{
    const [orders, sales] = await Promise.all([fetchAllEmployeeOrders(), apiRequest('/ventas')]);
    employeeOrdersCache = orders;
    salesCache = Array.isArray(sales) ? sales : [];
    productsCache = await getProducts();
    await loadSupplies();
    renderAdminDashboard();
    renderOperationalAlerts();
  }catch(error){ showToast(error.message || 'No se pudo actualizar el resumen'); }
  finally{ if(button){ button.disabled = false; button.textContent = '↻ Actualizar'; } }
}

function exportAdminDashboardPdf(){
  const report = currentAdminDashboardReport;
  if(!report){ showToast('Espera a que cargue el resumen'); return; }
  const popup = window.open('', '_blank');
  if(!popup){ showToast('Permite las ventanas emergentes para exportar el PDF'); return; }
  const rows = report.orders.map(order=>`<tr><td>${escapeHtml(order.codigo)}</td><td>${escapeHtml(order.cliente_nombre)}</td><td>${order.tipo === 'encargo' ? 'Encargo' : 'Delivery'}</td><td>${escapeHtml(order.estado)}</td><td>S/ ${Number(order.total||0).toFixed(2)}</td></tr>`).join('');
  popup.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Resumen Punto Dulce</title><style>body{font:13px Arial,sans-serif;color:#35232a;margin:32px}h1{color:#702744;margin-bottom:4px}.sub{color:#725d63;margin-bottom:22px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:20px 0}.card{border:1px solid #eadde2;border-radius:10px;padding:14px}.card small{display:block;color:#765f68;margin-bottom:8px}.card b{font-size:18px;color:#64243f}h2{font-size:16px;margin:24px 0 10px}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:9px;border-bottom:1px solid #eadde2}th{background:#f7eef2;color:#64243f;font-size:11px;text-transform:uppercase}@page{size:landscape;margin:14mm}</style></head><body><h1>Punto Dulce · Resumen administrativo</h1><p class="sub">Período: ${escapeHtml(report.range)} · Generado: ${new Date().toLocaleString('es-PE')}</p><div class="cards"><div class="card"><small>Pedidos</small><b>${report.orders.length}</b></div><div class="card"><small>Ventas</small><b>S/ ${report.revenue.toFixed(2)}</b></div><div class="card"><small>Ticket promedio</small><b>S/ ${report.avgTicket.toFixed(2)}</b></div><div class="card"><small>Tasa de entrega</small><b>${report.fulfillment}%</b></div><div class="card"><small>Pendientes</small><b>${report.pending}</b></div><div class="card"><small>Clientes</small><b>${report.customers.length}</b></div><div class="card"><small>Anticipos recibidos</small><b>S/ ${report.deposits.toFixed(2)}</b></div><div class="card"><small>Saldo por cobrar</small><b>S/ ${report.outstanding.toFixed(2)}</b></div></div><h2>Pedidos del período</h2><table><thead><tr><th>Código</th><th>Cliente</th><th>Tipo</th><th>Estado</th><th>Total</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No hay pedidos en el período.</td></tr>'}</tbody></table><script>window.onload=()=>window.print();<\/script></body></html>`);
  popup.document.close();
}

/* ---- Ventas: consulta, búsqueda y detalle ---- */
function getSaleDetails(sale){
  let detail = sale.detalle;
  if(typeof detail === 'string'){
    try { detail = JSON.parse(detail); } catch { detail = {}; }
  }
  const items = Array.isArray(detail?.items) ? detail.items : [];
  const payment = detail?.metodoPago || sale.notas || 'Pendiente';
  return { items, payment };
}

function filterSales(){
  const query = (document.getElementById('salesSearch')?.value || '').trim().toLowerCase();
  const from = document.getElementById('salesFrom')?.value || '';
  const to = document.getElementById('salesTo')?.value || '';
  const payment = (document.getElementById('salesPayment')?.value || '').toLowerCase();
  return salesCache.filter(sale => {
    const details = getSaleDetails(sale);
    const haystack = [sale.id, sale.nombre, sale.telefono, sale.pedido_codigo, details.payment].join(' ').toLowerCase();
    const date = String(sale.fecha || sale.fecha_iso || '').slice(0, 10);
    if(currentEmployeeRole === 'ventas' && !isInCurrentWeek(sale.fecha || sale.fecha_iso)) return false;
    return (!query || haystack.includes(query)) && (!from || date >= from) && (!to || date <= to)
      && (!payment || details.payment.toLowerCase().includes(payment));
  });
}

function renderFilteredSales(){
  const tbody = document.getElementById('salesTableBody');
  if(!tbody) return;
  const sales = filterSales();
  const amount = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const average = sales.length ? amount / sales.length : 0;
  document.getElementById('salesSummary').innerHTML = `
    <article class="stat-card"><span class="stat-label">Ventas encontradas</span><span class="stat-value">${sales.length}</span></article>
    <article class="stat-card"><span class="stat-label">Ingresos del filtro</span><span class="stat-value">S/ ${amount.toFixed(2)}</span></article>
    <article class="stat-card"><span class="stat-label">Ticket promedio</span><span class="stat-value">S/ ${average.toFixed(2)}</span></article>`;
  const scopeNote = document.getElementById('salesScopeNote');
  if(scopeNote) scopeNote.textContent = currentEmployeeRole === 'ventas'
    ? `Historial de esta semana (${formatWeekRange()}).`
    : 'Historial completo. Usa los filtros para encontrar una venta.';
  document.getElementById('salesResultCount').textContent = `${sales.length} ${sales.length === 1 ? 'venta encontrada' : 'ventas encontradas'}`;
  if(!sales.length){
    tbody.innerHTML = '<tr><td colspan="7" class="hint">No hay ventas que coincidan con estos filtros.</td></tr>';
    return;
  }
  tbody.innerHTML = sales.map(sale => {
    const { items, payment } = getSaleDetails(sale);
    const productNames = items.slice(0, 2).map(item => escapeHtml(item.nombre || item.name || 'Producto')).join(', ');
    const extras = items.length > 2 ? ` +${items.length - 2}` : '';
    return `<tr>
      <td>${sale.fecha ? new Date(String(sale.fecha).replace(' ', 'T')).toLocaleString('es-PE', { dateStyle:'medium', timeStyle:'short' }) : '—'}</td>
      <td><strong>${escapeHtml(sale.pedido_codigo || sale.id)}</strong>${sale.desde_pedido ? '<br><span class="hint">Registrado desde pedido</span>' : ''}</td>
      <td>${escapeHtml(sale.nombre)}<br><span class="hint">${escapeHtml(sale.telefono || 'Sin teléfono')}</span></td>
      <td>${productNames || 'Sin detalle'}${extras}</td>
      <td><span class="pill pill-neutral">${escapeHtml(payment)}</span></td>
      <td><strong>S/ ${Number(sale.total || 0).toFixed(2)}</strong></td>
      <td><button type="button" class="btn btn-outline btn-small" data-sale-id="${escapeHtml(sale.id)}">Ver detalle</button></td>
    </tr>`;
  }).join('');
}

function exportSalesPdf(){
  const sales = filterSales();
  if(!sales.length){ showToast('No hay ventas para exportar con estos filtros'); return; }
  const reportWindow = window.open('', '_blank');
  if(!reportWindow){
    showToast('Permite las ventanas emergentes para generar el PDF');
    return;
  }
  const total = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const average = total / sales.length;
  const from = document.getElementById('salesFrom').value;
  const to = document.getElementById('salesTo').value;
  const paymentFilter = document.getElementById('salesPayment');
  const payment = paymentFilter.value ? paymentFilter.options[paymentFilter.selectedIndex].text : 'Todos';
  const search = document.getElementById('salesSearch').value.trim();
  const period = from || to ? `${from || 'Inicio'} — ${to || 'Hoy'}` : (currentEmployeeRole === 'ventas' ? `Semana ${formatWeekRange()}` : 'Todo el historial');
  const rows = sales.map(sale => {
    const details = getSaleDetails(sale);
    const products = details.items.length ? details.items.map(item => {
      const qty = Number(item.cantidad || item.qty || 1);
      const price = Number(item.precio || item.price || 0);
      const name = escapeHtml(item.nombre || item.name || 'Producto');
      const customization = item.detalle ? ` <span class="muted">(${escapeHtml(item.detalle)})</span>` : '';
      return `<div>${qty} × ${name}${customization} <span class="muted">— S/ ${(qty * price).toFixed(2)}</span></div>`;
    }).join('') : '<span class="muted">Sin detalle de productos</span>';
    const date = sale.fecha ? new Date(String(sale.fecha).replace(' ', 'T')).toLocaleString('es-PE', { dateStyle:'medium', timeStyle:'short' }) : '—';
    return `<tr><td>${escapeHtml(date)}</td><td><strong>${escapeHtml(sale.pedido_codigo || sale.id)}</strong>${sale.desde_pedido ? '<br><span class="muted">Desde pedido</span>' : ''}</td><td>${escapeHtml(sale.nombre)}<br><span class="muted">${escapeHtml(sale.telefono || 'Sin teléfono')}</span></td><td>${products}</td><td>${escapeHtml(details.payment)}</td><td class="money">S/ ${Number(sale.total || 0).toFixed(2)}</td></tr>`;
  }).join('');
  const title = `Reporte de ventas Punto Dulce ${new Date().toLocaleDateString('es-PE')}`;
  reportWindow.document.open();
  reportWindow.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>
    *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#33241f;margin:32px;font-size:11px}header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #7d2948;padding-bottom:14px;margin-bottom:18px}h1{font-size:22px;margin:0 0 5px;color:#69223d}.brand{font-size:12px;color:#795e55}.meta{text-align:right;color:#6e5c55;line-height:1.6}.summary{display:flex;gap:12px;margin:16px 0 20px}.card{border:1px solid #e5d8d0;border-radius:8px;padding:10px 13px;min-width:145px}.card span{display:block;color:#7b6860;font-size:9px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}.card strong{font-size:16px;color:#69223d}.filters{padding:9px 11px;background:#faf5f1;border-radius:6px;margin-bottom:15px;color:#65514a}table{width:100%;border-collapse:collapse}thead{display:table-header-group}th{background:#f3e8e5;text-align:left;text-transform:uppercase;font-size:9px;letter-spacing:.04em;color:#6d4b50}th,td{padding:8px 7px;border-bottom:1px solid #eadfdb;vertical-align:top}tr{page-break-inside:avoid}.money{text-align:right;white-space:nowrap;font-weight:bold}.muted{color:#776b66;font-size:9px}footer{margin-top:20px;border-top:1px solid #eadfdb;padding-top:9px;color:#756760;font-size:9px}@page{size:landscape;margin:12mm}@media print{body{margin:0}button{display:none}}
    </style></head><body><header><div><h1>Punto Dulce</h1><div class="brand">Reporte de ventas</div></div><div class="meta">Generado: ${escapeHtml(new Date().toLocaleString('es-PE'))}<br>Registros: ${sales.length}</div></header><div class="summary"><div class="card"><span>Ventas</span><strong>${sales.length}</strong></div><div class="card"><span>Ingresos</span><strong>S/ ${total.toFixed(2)}</strong></div><div class="card"><span>Ticket promedio</span><strong>S/ ${average.toFixed(2)}</strong></div></div><div class="filters"><strong>Filtros:</strong> Periodo: ${escapeHtml(period)} · Medio de pago: ${escapeHtml(payment)}${search ? ` · Búsqueda: ${escapeHtml(search)}` : ''}</div><table><thead><tr><th>Fecha</th><th>Código</th><th>Cliente</th><th>Productos</th><th>Pago</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table><footer>Documento generado desde el panel de Punto Dulce.</footer></body></html>`);
  reportWindow.document.close();
  reportWindow.focus();
  window.setTimeout(() => reportWindow.print(), 300);
  showToast('En la ventana de impresión, elige “Guardar como PDF”');
}

function showSaleDetails(id){
  const sale = salesCache.find(item => String(item.id) === String(id));
  if(!sale) return;
  const { items, payment } = getSaleDetails(sale);
  document.getElementById('saleDetailContent').innerHTML = `
    <div class="sale-detail-meta">
      <p><span>Código</span><strong>${escapeHtml(sale.pedido_codigo || sale.id)}</strong></p>
      <p><span>Cliente</span><strong>${escapeHtml(sale.nombre)}</strong></p>
      <p><span>Teléfono</span><strong>${escapeHtml(sale.telefono || '—')}</strong></p>
      <p><span>Fecha</span><strong>${sale.fecha ? new Date(String(sale.fecha).replace(' ','T')).toLocaleString('es-PE', { dateStyle:'medium', timeStyle:'short' }) : '—'}</strong></p>
      <p><span>Pago</span><strong>${escapeHtml(payment)}</strong></p>
      ${sale.pedido_codigo ? `<p><span>Pedido asociado</span><strong>${escapeHtml(sale.pedido_codigo)}</strong></p>` : ''}
    </div>
    <div class="sale-detail-items">${items.length ? items.map(item => `
      <div class="sale-item-row"><div><strong>${escapeHtml(item.nombre || item.name || 'Producto')}</strong>
        <span>${Number(item.cantidad || item.qty || 1)} × S/ ${Number(item.precio || item.price || 0).toFixed(2)}${item.detalle ? ` · ${escapeHtml(item.detalle)}` : ''}</span>
      </div><strong>S/ ${(Number(item.cantidad || item.qty || 1) * Number(item.precio || item.price || 0)).toFixed(2)}</strong></div>`).join('') : '<p class="hint">Esta venta no tiene productos detallados.</p>'}</div>
    <div class="sale-total-line"><span>Total pagado</span><strong>S/ ${Number(sale.total || 0).toFixed(2)}</strong></div>
    ${sale.desde_pedido ? '<p class="hint">Este registro se recuperó del pedido porque todavía no tenía una venta asociada. Actualiza su estado desde la sección Pedidos.</p>' : `<div class="panel-head-actions sale-detail-actions">
      <button class="btn btn-outline btn-small" type="button" onclick="editSale('${escapeHtml(sale.id)}')">Actualizar venta</button>
      <button class="btn btn-small btn-danger" type="button" onclick="deleteSale('${escapeHtml(sale.id)}')">Eliminar venta</button>
    </div>`}`;
  document.getElementById('saleDetailModal').classList.add('open');
}

async function renderSales(){
  const tbody = document.getElementById('salesTableBody');
  if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="hint">Cargando ventas…</td></tr>';
  try {
    salesCache = await apiRequest('/ventas');
    renderFilteredSales();
  } catch(error) {
    tbody.innerHTML = `<tr><td colspan="7" class="hint">${escapeHtml(error.message)}</td></tr>`;
  }
}

function openSaleModal(){
  editingSaleId = null;
  manualSaleItems = [];
  document.getElementById('saleForm').reset();
  document.getElementById('saleOrderId').value = '';
  document.querySelector('#saleModal h3').textContent = 'Registrar venta';
  document.getElementById('btnSaveSale').textContent = 'Guardar venta';
  document.getElementById('saleQuantity').value = 1;
  const select = document.getElementById('saleProduct');
  const products = productsCache.filter(product => product.disponible !== false);
  select.innerHTML = products.length
    ? products.map(product => `<option value="${escapeHtml(product.id)}">${escapeHtml(product.name)} · S/ ${Number(product.price).toFixed(2)}</option>`).join('')
    : '<option value="">No hay productos disponibles</option>';
  renderManualSaleItems();
  document.getElementById('saleModal').classList.add('open');
}

function closeSaleModal(){ document.getElementById('saleModal').classList.remove('open'); editingSaleId = null; }

function editSale(id){
  const sale = salesCache.find(item => String(item.id) === String(id));
  if(!sale || sale.desde_pedido) return;
  const { items, payment } = getSaleDetails(sale);
  document.getElementById('saleDetailModal').classList.remove('open');
  openSaleModal();
  editingSaleId = sale.id;
  document.getElementById('saleCustomer').value = sale.nombre || '';
  document.getElementById('salePhone').value = sale.telefono || '';
  document.getElementById('saleOrderId').value = sale.pedido_id || '';
  const methodSelect = document.getElementById('salePaymentMethod');
  methodSelect.value = Array.from(methodSelect.options).some(option => option.value.toLowerCase() === payment.toLowerCase()) ? payment : 'Pendiente';
  manualSaleItems = items.map(item => ({
    id: item.id || null, nombre: item.nombre || item.name || 'Producto',
    precio: Number(item.precio || item.price) || 0,
    cantidad: Number(item.cantidad || item.qty) || 1,
    detalle: item.detalle || ''
  }));
  renderManualSaleItems();
  document.querySelector('#saleModal h3').textContent = 'Actualizar venta';
  document.getElementById('btnSaveSale').textContent = 'Guardar cambios';
}

async function deleteSale(id){
  if(salesCache.find(item => String(item.id) === String(id))?.desde_pedido) return;
  if(!confirm('¿Eliminar esta venta? Esta acción no se puede deshacer.')) return;
  try {
    await apiRequest(`/ventas/${encodeURIComponent(id)}`, { method:'DELETE' });
    document.getElementById('saleDetailModal').classList.remove('open');
    await Promise.all([renderSales(), renderStats()]);
    showToast('Venta eliminada');
  } catch(error) { showToast(error.message || 'No se pudo eliminar la venta'); }
}

function addManualSaleItem(){
  const id = document.getElementById('saleProduct').value;
  const product = productsCache.find(item => String(item.id) === String(id));
  const quantity = Number(document.getElementById('saleQuantity').value);
  if(!product || product.disponible === false){ showToast('Elige un producto disponible'); return; }
  if(!Number.isInteger(quantity) || quantity < 1 || quantity > 99){ showToast('La cantidad debe estar entre 1 y 99'); return; }
  const existing = manualSaleItems.find(item => String(item.id) === String(product.id));
  if(existing){
    if(existing.cantidad + quantity > 99){ showToast('La cantidad máxima por producto es 99'); return; }
    existing.cantidad += quantity;
  } else {
    manualSaleItems.push({ id: product.id, nombre: product.name, precio: Number(product.price), cantidad: quantity });
  }
  document.getElementById('saleQuantity').value = 1;
  renderManualSaleItems();
}

function removeManualSaleItem(index){
  manualSaleItems.splice(index, 1);
  renderManualSaleItems();
}

function renderManualSaleItems(){
  const container = document.getElementById('saleItemsContainer');
  if(!container) return;
  const total = manualSaleItems.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  document.getElementById('saleTotal').textContent = `S/ ${total.toFixed(2)}`;
  container.innerHTML = manualSaleItems.length ? manualSaleItems.map((item, index) => `
    <div class="sale-item-row">
      <div><strong>${escapeHtml(item.nombre)}</strong><span>${item.cantidad} × S/ ${item.precio.toFixed(2)}</span></div>
      <strong>S/ ${(item.cantidad * item.precio).toFixed(2)}</strong>
      <button type="button" class="btn-icon-danger" aria-label="Quitar ${escapeHtml(item.nombre)}" onclick="removeManualSaleItem(${index})">✕</button>
    </div>`).join('') : '<p class="hint">Agrega al menos un producto para continuar.</p>';
}

async function submitManualSale(event){
  event.preventDefault();
  if(!manualSaleItems.length){ showToast('Agrega al menos un producto'); return; }
  const button = document.getElementById('btnSaveSale');
  button.disabled = true;
  button.textContent = 'Guardando…';
  try {
    const payload = {
      nombre: document.getElementById('saleCustomer').value.trim(),
      telefono: document.getElementById('salePhone').value.trim(),
      metodoPago: document.getElementById('salePaymentMethod').value,
      pedidoId: document.getElementById('saleOrderId').value || null,
      items: manualSaleItems.map(item => ({ nombre:item.nombre, detalle:item.detalle || '', precio:item.precio, cantidad:item.cantidad }))
    };
    const wasEditing = !!editingSaleId;
    await apiRequest(wasEditing ? `/ventas/${encodeURIComponent(editingSaleId)}` : '/ventas/registrar', {
      method: wasEditing ? 'PUT' : 'POST', body:JSON.stringify(payload)
    });
    closeSaleModal();
    await Promise.all([renderSales(), renderStats()]);
    showToast(wasEditing ? 'Venta actualizada correctamente' : 'Venta registrada correctamente');
  } catch(error) {
    showToast(error.message || 'No se pudo registrar la venta');
  } finally {
    button.disabled = false;
    button.textContent = editingSaleId ? 'Guardar cambios' : 'Guardar venta';
  }
}

function bindPanelFilters(){
  const bind = (ids, render) => ids.forEach(id => document.getElementById(id)?.addEventListener('input', render));
  bind(['salesSearch','salesFrom','salesTo','salesPayment'], renderFilteredSales);
  bind(['productsSearch','productsCategory','productsStatus'], renderFilteredProducts);
  bind(['suppliesSearch','suppliesStatus'], renderFilteredSupplies);
  bind(['purchasesSearch','purchasesFrom','purchasesTo'], renderFilteredPurchases);
  bind(['ordersSearch','ordersStatus','ordersType'], renderFilteredEmployeeOrders);
  const clear = (buttonId, inputIds, render) => document.getElementById(buttonId)?.addEventListener('click', () => {
    inputIds.forEach(id => { const input = document.getElementById(id); if(input) input.value = ''; });
    render();
  });
  clear('clearSalesFilters', ['salesSearch','salesFrom','salesTo','salesPayment'], renderFilteredSales);
  clear('clearProductsFilters', ['productsSearch','productsCategory','productsStatus'], renderFilteredProducts);
  clear('clearSuppliesFilters', ['suppliesSearch','suppliesStatus'], renderFilteredSupplies);
  clear('clearPurchasesFilters', ['purchasesSearch','purchasesFrom','purchasesTo'], renderFilteredPurchases);
  clear('clearOrdersFilters', ['ordersSearch','ordersStatus','ordersType'], renderFilteredEmployeeOrders);
}

/* ---- Gestión de productos ---- */
async function renderAdminProducts(){
  const tbody = document.getElementById('productsTableBody');
  if(!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" class="hint" style="padding:16px 0;">Cargando productos...</td></tr>';

  productsCache = await getProducts();
  renderFilteredProducts();
}

function renderFilteredProducts(){
  const tbody = document.getElementById('productsTableBody');
  if(!tbody) return;
  const query = (document.getElementById('productsSearch')?.value || '').trim().toLowerCase();
  const category = document.getElementById('productsCategory')?.value || '';
  const status = document.getElementById('productsStatus')?.value || '';
  const products = productsCache.filter(product =>
    (!query || `${product.name} ${product.desc || ''}`.toLowerCase().includes(query))
    && (!category || product.cat === category)
    && (!status || (status === 'available' ? product.disponible !== false : product.disponible === false))
  );
  document.getElementById('productsResultCount').textContent = `${products.length} de ${productsCache.length} productos`;
  renderOperationalAlerts();
  if(products.length === 0){
    tbody.innerHTML = '<tr><td colspan="6" class="hint" style="padding:16px 0;">No hay productos registrados.</td></tr>';
    return;
  }

  tbody.innerHTML = products.map(p=>`
    <tr>
      <td>${p.icon || '🍰'} ${escapeHtml(p.name)}</td>
      <td>${escapeHtml(labelForCat(p.cat))}</td>
      <td>${p.customizable ? 'Desde ' : ''}S/ ${Number(p.price).toFixed(2)}</td>
      <td><span class="pill ${p.disponible!==false ? 'pill-ok':'pill-off'}">${p.disponible!==false ? 'Disponible':'Oculto'}</span></td>
      <td>${p.customizable ? 'Sí' : 'No'}</td>
      <td class="table-actions">
        <button class="btn btn-outline btn-small" onclick="openProductModal('${p.id}')">Editar</button>
        <button class="btn btn-small btn-danger" onclick="deleteProduct('${p.id}')">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

async function openProductModal(id){
  editingProductId = id || null;

  const products = await getProducts();
  const p = id ? products.find(x => x.id === id) : null;

  document.getElementById('productModalTitle').textContent =
    p ? 'Editar producto' : 'Nuevo producto';

  document.getElementById('productName').value =
    p ? p.name : '';

  document.getElementById('productCat').value =
    p ? p.cat : 'cupcake';

  document.getElementById('productDesc').value =
    p ? p.desc : '';

  document.getElementById('productPrice').value =
    p ? p.price : '';

  document.getElementById('productIcon').value =
    p ? (p.icon || '🍰') : '🍰';

  document.getElementById('productCustomizable').checked =
    p ? !!p.customizable : false;

  document.getElementById('productDisponible').checked =
    p ? p.disponible !== false : true;

  document.getElementById('customPriceHint').style.display =
    (p && p.customizable) ? 'block' : 'none';

  document.getElementById('productModal').classList.add('open');
}
function closeProductModal(){ document.getElementById('productModal').classList.remove('open'); }

async function submitProductForm(e){
  e.preventDefault();

  const name = document.getElementById('productName').value.trim();
  const cat = document.getElementById('productCat').value;
  const desc = document.getElementById('productDesc').value.trim();
  const price = Number(document.getElementById('productPrice').value);
  const icon = document.getElementById('productIcon').value.trim() || '🍰';
  const customizable = document.getElementById('productCustomizable').checked;
  const disponible = document.getElementById('productDisponible').checked;

  if(!name || !price || price <= 0){
    showToast('Completa nombre y un precio válido');
    return;
  }

  const wasEditing = !!editingProductId;

  try {
    if(wasEditing){
      await apiRequest('/productos/' + encodeURIComponent(editingProductId), {
        method: 'PUT',
        body: JSON.stringify({
          name,
          cat,
          desc,
          price,
          icon,
          customizable,
          disponible,
          media: 'media-' + cat
        })
      });
    } else {
      await apiRequest('/productos', {
        method: 'POST',
        body: JSON.stringify({
          id: 'prod-' + Date.now(),
          name,
          cat,
          desc,
          price,
          icon,
          customizable,
          disponible,
          media: 'media-' + cat
        })
      });
    }

    closeProductModal();
    await renderAdminProducts();
    renderStats();

    showToast(
      wasEditing
        ? 'Producto actualizado'
        : 'Producto agregado al catálogo'
    );

  } catch(error) {
    console.error('Error al guardar producto:', error);
    showToast(error.message || 'No se pudo guardar el producto');
  }
}

async function deleteProduct(id){
  if(!confirm('¿Eliminar este producto del catálogo?')) return;

  try {
    await apiRequest('/productos/' + encodeURIComponent(id), {
      method: 'DELETE'
    });

    await renderAdminProducts();
    renderStats();

    showToast('Producto eliminado');

  } catch(error) {
    console.error('Error al eliminar producto:', error);
    showToast(error.message || 'No se pudo eliminar el producto');
  }
}

/* ---- Registro de materia prima (insumos) ---- */

async function loadSupplies(){
  try {
    const data = await apiRequest('/insumos');
    suppliesCache = data.map(normalizeSupply);
    return suppliesCache;
  } catch(err) {
    showToast(err.message);
    suppliesCache = [];
    return [];
  }
}

function getSupplies(){
  return suppliesCache;
}

async function openSupplyModal(id){
  editingSupplyId = id || null;

  if(suppliesCache.length === 0){
    await loadSupplies();
  }

  const s = id
    ? suppliesCache.find(x => String(x.id) === String(id))
    : null;

  document.getElementById('supplyModalTitle').textContent =
    s ? 'Editar insumo' : 'Nuevo insumo';

  document.getElementById('supplyName').value =
    s ? s.nombre : '';

  document.getElementById('supplyQty').value =
    s ? s.cantidad : '';

  document.getElementById('supplyUnit').value =
    s ? s.unidad : 'kg';

  document.getElementById('supplyMin').value =
    s ? s.stockMinimo : '';

  document.getElementById('supplyProveedor').value =
    s ? s.proveedor : '';

  document.getElementById('supplyModal').classList.add('open');
}

function closeSupplyModal(){
  document.getElementById('supplyModal').classList.remove('open');
}

async function submitSupplyForm(e){
  e.preventDefault();

  const nombre = document.getElementById('supplyName').value.trim();
  const cantidad = Number(document.getElementById('supplyQty').value);
  const unidad = document.getElementById('supplyUnit').value;
  const stockMinimo =
    Number(document.getElementById('supplyMin').value) || 0;
  const proveedor =
    document.getElementById('supplyProveedor').value.trim();

  if(!nombre || isNaN(cantidad) || cantidad < 0){
    showToast('Completa nombre y una cantidad válida');
    return;
  }

  const record = {
    nombre,
    cantidad,
    unidad,
    stockMinimo,
    proveedor
  };

  try {
    if(editingSupplyId){
      await apiRequest(`/insumos/${editingSupplyId}`, {
        method: 'PUT',
        body: JSON.stringify(record)
      });

      showToast('Insumo actualizado');
    } else {
      await apiRequest('/insumos', {
        method: 'POST',
        body: JSON.stringify(record)
      });

      showToast('Insumo registrado');
    }

    await loadSupplies();
    closeSupplyModal();
    renderSupplies();

  } catch(err) {
    showToast(err.message);
  }
}

async function deleteSupply(id){
  if(!confirm('¿Eliminar este insumo del registro?')) return;

  try {
    await apiRequest(`/insumos/${id}`, {
      method: 'DELETE'
    });

    await loadSupplies();
    renderSupplies();

    showToast('Insumo eliminado');

  } catch(err) {
    showToast(err.message);
  }
}

async function renderSupplies(){
  const tbody = document.getElementById('suppliesTableBody');
  if(!tbody) return;

  await loadSupplies();
  renderFilteredSupplies();
  if(currentEmployeeRole === 'administrador') renderAdminDashboard();
}

function renderFilteredSupplies(){
  const tbody = document.getElementById('suppliesTableBody');
  if(!tbody) return;
  const query = (document.getElementById('suppliesSearch')?.value || '').trim().toLowerCase();
  const status = document.getElementById('suppliesStatus')?.value || '';
  const supplies = getSupplies().filter(s => {
    const low = s.cantidad <= s.stockMinimo;
    return (!query || `${s.nombre} ${s.proveedor}`.toLowerCase().includes(query))
      && (!status || (status === 'low' ? low : !low));
  });
  document.getElementById('suppliesResultCount').textContent = `${supplies.length} de ${suppliesCache.length} insumos`;
  renderOperationalAlerts();

  if(supplies.length === 0){
    tbody.innerHTML =
      `<tr><td colspan="6" class="hint" style="padding:16px 0;">${suppliesCache.length ? 'No hay insumos que coincidan con estos filtros.' : 'Aún no registras insumos de materia prima.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = supplies.map(s => {
    const bajo = s.cantidad <= s.stockMinimo;

    return `
      <tr class="${bajo ? 'row-warning' : ''}">
        <td>${escapeHtml(s.nombre)}</td>
        <td>${s.cantidad} ${s.unidad}</td>
        <td>${s.stockMinimo} ${s.unidad}</td>
        <td>${escapeHtml(s.proveedor || '—')}</td>
        <td>
          <span class="pill ${bajo ? 'pill-off' : 'pill-ok'}">
            ${bajo ? 'Stock bajo' : 'Normal'}
          </span>
        </td>
        <td class="table-actions">
          <button
            class="btn btn-outline btn-small"
            onclick="openSupplyModal(${s.id})">
            Editar
          </button>

          <button
            class="btn btn-small btn-danger"
            onclick="deleteSupply(${s.id})">
            Eliminar
          </button>
        </td>
      </tr>
    `;
  }).join('');
}
/* ---- Registro de órdenes de compra de insumos ---- */
async function getPurchaseOrders(){
  try {
    const data = await apiRequest('/compras');

    return data.map(c => ({
      id: c.id,
      detalleId: c.detalle_id,
      insumoId: c.insumo_id,
      insumo: c.insumo_nombre,
      cantidad: Number(c.cantidad),
      unidad: c.unidad,
      costo: Number(c.costo),
      tienda: c.tienda || '',
      fecha: c.fecha,
      fechaISO: c.fecha_iso || c.fecha,
      registradoPor: c.registrado_por || '-'
    }));

  } catch(error) {
    console.error('Error al obtener órdenes de compra:', error);
    showToast(
      error.message || 'No se pudieron cargar las órdenes de compra'
    );
    return [];
  }
}

function populatePurchaseInsumoSelect(){
  const select = document.getElementById('purchaseInsumo');
  if(!select) return;
  const supplies = getSupplies();
  select.innerHTML = supplies.map(s=>`<option value="${s.id}">${s.nombre}</option>`).join('')
    + '<option value="__otro">Otro insumo (nuevo)</option>';
}
function addPurchaseItem(){
  const insumoSel = document.getElementById('purchaseInsumo').value;
  const nuevoNombre = document.getElementById('purchaseNuevoNombre').value.trim();
  const cantidad = Number(document.getElementById('purchaseCantidad').value);
  const costo = Number(document.getElementById('purchaseCosto').value) || 0;

  if(!cantidad || cantidad <= 0){
    showToast('Indica una cantidad válida');
    return;
  }

  let insumoId = null;
  let insumoNombre = '';
  let unidad = 'unidades';

  if(insumoSel === '__otro'){

    if(!nuevoNombre){
      showToast('Indica el nombre del insumo nuevo');
      return;
    }

    insumoNombre = nuevoNombre;

  }else{

    insumoId = Number(insumoSel);

    const supplies = getSupplies();

    const supply = supplies.find(
      s => String(s.id) === String(insumoSel)
    );

    if(!supply){
      showToast('No se encontró el insumo seleccionado');
      return;
    }

    insumoNombre = supply.nombre;
    unidad = supply.unidad || 'unidades';
  }

  const yaExiste = purchaseItems.some(
    item => item.insumoId === insumoId &&
            item.insumoNombre.toLowerCase() === insumoNombre.toLowerCase()
  );

  if(yaExiste){
    showToast('Ese artículo ya fue agregado');
    return;
  }

  purchaseItems.push({
    insumoId,
    insumoNombre,
    cantidad,
    unidad,
    costo
  });

  renderPurchaseItems();

  document.getElementById('purchaseCantidad').value = '';
  document.getElementById('purchaseCosto').value = '';

  showToast(`${insumoNombre} agregado a la orden`);
}

function openPurchaseModal(){
  purchaseItems = [];

  populatePurchaseInsumoSelect();

  document.getElementById('purchaseForm').reset();

  document.getElementById('purchaseNuevoNombreWrap').style.display = 'none';

  document.getElementById('purchaseFecha').value =
    new Date().toISOString().slice(0,10);

  renderPurchaseItems();

  document.getElementById('purchaseModal').classList.add('open');
}
function renderPurchaseItems(){
  const container = document.getElementById('purchaseItemsContainer');

  if(!container) return;

  if(purchaseItems.length === 0){
    container.innerHTML = `
      <p class="hint">
        No hay artículos agregados todavía.
      </p>
    `;
    return;
  }

  container.innerHTML = `
    <div style="margin-bottom:10px;">
      <strong>Artículos de la orden</strong>
    </div>

    ${purchaseItems.map((item, index) => `
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
        padding:10px;
        margin-bottom:8px;
        border:1px solid #ddd;
        border-radius:10px;
      ">
        <div>
          <strong>${item.insumoNombre}</strong>
          <div class="hint">
            ${item.cantidad} ${item.unidad} · S/ ${item.costo.toFixed(2)}
          </div>
        </div>

        <button
          type="button"
          class="btn btn-small btn-danger"
          onclick="removePurchaseItem(${index})">
          Quitar
        </button>
      </div>
    `).join('')}
  `;
}


function removePurchaseItem(index){
  purchaseItems.splice(index, 1);
  renderPurchaseItems();
}

function closePurchaseModal(){ document.getElementById('purchaseModal').classList.remove('open'); }

async function submitPurchaseForm(e){
  e.preventDefault();

  const tienda = document.getElementById('purchaseTienda').value.trim();
  const fecha = document.getElementById('purchaseFecha').value;

  if(!purchaseItems || purchaseItems.length === 0){
    showToast('Agrega al menos un artículo a la orden');
    return;
  }

  const fechaISO = fecha
    ? new Date(fecha + 'T12:00:00').toISOString()
    : new Date().toISOString();

  const session = getSession();

  try {

    await apiRequest('/compras', {
      method: 'POST',
      body: JSON.stringify({
        id: 'OC-' + Date.now(),

        items: purchaseItems.map(item => ({
          insumoId: item.insumoId,
          insumoNombre: item.insumoNombre,
          cantidad: Number(item.cantidad),
          unidad: item.unidad || 'unidades',
          costo: Number(item.costo) || 0
        })),

        tienda,

        fecha: fecha || new Date().toISOString().slice(0,10),

        fechaISO,

        registradoPor: (session && session.nombre) || '-'
      })
    });

    await loadSupplies();

    purchaseItems = [];

    closePurchaseModal();

    await renderPurchaseOrders();

    renderSupplies();

    showToast('Orden de compra registrada con todos sus artículos');

  } catch(error) {

    console.error('Error al registrar orden de compra:', error);

    showToast(
      error.message || 'No se pudo registrar la orden de compra'
    );

  }
}


 
async function renderPurchaseOrders(){
  const tbody = document.getElementById('purchaseOrdersBody');
  if(!tbody) return;
  const scopeNote = document.getElementById('comprasScopeNote');
  if(scopeNote){
    scopeNote.textContent = soloSemanaParaRolActual()
      ? `Mostrando compras de la semana en curso (${formatWeekRange()}).`
      : 'Historial completo para revisar y actualizar compras.';
  }
  purchaseOrdersCache = await getPurchaseOrders();
  renderFilteredPurchases();
}

function renderFilteredPurchases(){
  const tbody = document.getElementById('purchaseOrdersBody');
  if(!tbody) return;
  const query = (document.getElementById('purchasesSearch')?.value || '').trim().toLowerCase();
  const from = document.getElementById('purchasesFrom')?.value || '';
  const to = document.getElementById('purchasesTo')?.value || '';
  const compras = purchaseOrdersCache.filter(c => {
    const date = String(c.fecha || '').slice(0,10);
    const haystack = `${c.insumo} ${c.tienda} ${c.registradoPor}`.toLowerCase();
    return (!soloSemanaParaRolActual() || isInCurrentWeek(c.fechaISO))
      && (!query || haystack.includes(query)) && (!from || date >= from) && (!to || date <= to);
  });
  const count = document.getElementById('purchasesResultCount');
  if(count) count.textContent = `${compras.length} líneas de compra encontradas`;

  if(compras.length===0){
    tbody.innerHTML = `<tr><td colspan="7" class="hint" style="padding:16px 0;">${purchaseOrdersCache.length ? 'No hay compras que coincidan con estos filtros.' : (soloSemanaParaRolActual() ? 'No hay compras registradas esta semana.' : 'Aún no registras órdenes de compra.')}</td></tr>`;
    return;
  }
  tbody.innerHTML = compras.map(c=>`
    <tr>
<td>${new Date(c.fecha).toLocaleDateString('es-PE', { timeZone: 'UTC' })}</td>
      <td>${escapeHtml(c.insumo)}</td>
      <td>${c.cantidad} ${c.unidad}</td>
      <td>S/ ${Number(c.costo).toFixed(2)}</td>
      <td>${escapeHtml(c.tienda || '—')}</td>
      <td>${escapeHtml(c.registradoPor)}</td>
      <td class="table-actions">
        <button class="btn btn-outline btn-small" onclick="openPurchaseEditModal(${Number(c.detalleId)})">Editar</button>
        <button class="btn btn-small btn-danger" onclick="deletePurchaseItem(${Number(c.detalleId)})">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

function openPurchaseEditModal(detailId){
  const item = purchaseOrdersCache.find(row => String(row.detalleId) === String(detailId));
  if(!item) return;
  editingPurchaseDetailId = Number(detailId);
  document.getElementById('purchaseEditItemName').textContent = `${item.insumo} · ${item.unidad}`;
  document.getElementById('purchaseEditQuantity').value = item.cantidad;
  document.getElementById('purchaseEditCost').value = item.costo;
  document.getElementById('purchaseEditStore').value = item.tienda;
  document.getElementById('purchaseEditDate').value = String(item.fecha).slice(0,10);
  document.getElementById('purchaseEditModal').classList.add('open');
}

function closePurchaseEditModal(){
  document.getElementById('purchaseEditModal').classList.remove('open');
  editingPurchaseDetailId = null;
}

async function submitPurchaseEditForm(event){
  event.preventDefault();
  if(!editingPurchaseDetailId) return;
  const button = document.getElementById('purchaseEditSave');
  button.disabled = true;
  try {
    const fecha = document.getElementById('purchaseEditDate').value;
    await apiRequest(`/compras/${editingPurchaseDetailId}`, { method:'PUT', body:JSON.stringify({
      cantidad:Number(document.getElementById('purchaseEditQuantity').value),
      costo:Number(document.getElementById('purchaseEditCost').value),
      tienda:document.getElementById('purchaseEditStore').value.trim(),
      fecha, fechaISO:new Date(`${fecha}T12:00:00`).toISOString()
    }) });
    closePurchaseEditModal();
    await Promise.all([renderPurchaseOrders(), renderSupplies()]);
    showToast('Compra actualizada y stock ajustado');
  } catch(error) { showToast(error.message || 'No se pudo actualizar la compra'); }
  finally { button.disabled = false; }
}

async function deletePurchaseItem(detailId){
  if(!confirm('Se descontará esta cantidad del stock actual. ¿Eliminar este artículo de compra?')) return;
  try {
    await apiRequest(`/compras/${detailId}`, { method:'DELETE' });
    await Promise.all([renderPurchaseOrders(), renderSupplies()]);
    showToast('Artículo eliminado y stock ajustado');
  } catch(error) { showToast(error.message || 'No se pudo eliminar el artículo de compra'); }
}

/* ---- Gestión de pedidos (vista del personal) ---- */
async function renderEmployeeOrders(){
  const tbody = document.getElementById('employeeOrdersBody');
  if(!tbody) return;
  const note = document.getElementById('pedidosScopeNote');
  if(note) note.textContent = soloSemanaParaRolActual()
    ? `Mostrando pedidos de la semana en curso (${formatWeekRange()}).`
    : 'Historial completo. Busca por cliente, código o estado.';
  tbody.innerHTML = '<tr><td colspan="6" class="hint">Cargando pedidos…</td></tr>';
  try {
    employeeOrdersCache = await fetchAllEmployeeOrders();
    renderFilteredEmployeeOrders();
  } catch(error) {
    tbody.innerHTML = `<tr><td colspan="6" class="hint">${escapeHtml(error.message || 'No se pudieron cargar los pedidos.')}</td></tr>`;
  }
}

function renderFilteredEmployeeOrders(){
  const tbody = document.getElementById('employeeOrdersBody');
  if(!tbody) return;
  const query = (document.getElementById('ordersSearch')?.value || '').trim().toLowerCase();
  const status = document.getElementById('ordersStatus')?.value || '';
  const type = document.getElementById('ordersType')?.value || '';
  const orders = employeeOrdersCache.filter(order => {
    const haystack = `${order.codigo} ${order.cliente_nombre} ${order.cliente_telefono}`.toLowerCase();
    return (!soloSemanaParaRolActual() || isInCurrentWeek(order.created_at))
      && (!query || haystack.includes(query)) && (!status || order.estado === status) && (!type || order.tipo === type);
  });
  document.getElementById('ordersResultCount').textContent = `${orders.length} de ${employeeOrdersCache.length} pedidos`;
  renderOperationalAlerts();
  if(!orders.length){
    tbody.innerHTML = `<tr><td colspan="6" class="hint">${employeeOrdersCache.length ? 'No hay pedidos que coincidan con estos filtros.' : 'No hay pedidos registrados todavía.'}</td></tr>`;
    return;
  }
  const statuses = { pendiente:'Pendiente', confirmado:'Confirmado', en_preparacion:'En preparación', listo:'Listo', en_camino:'En camino', entregado:'Entregado', cancelado:'Cancelado' };
  tbody.innerHTML = orders.map(order => `<tr>
    <td><strong>${escapeHtml(order.codigo)}</strong></td>
    <td>${escapeHtml(order.cliente_nombre)}<br><span class="hint">${escapeHtml(order.cliente_telefono || '')}</span></td>
    <td>${order.tipo === 'delivery' ? 'Delivery' : 'Por encargo'}</td>
    <td>S/ ${Number(order.total || 0).toFixed(2)}</td>
    <td><span class="pill ${order.estado === 'entregado' ? 'pill-ok' : 'pill-off'}">${statuses[order.estado] || escapeHtml(order.estado)}</span></td>
    <td class="table-actions">${!['entregado','cancelado'].includes(order.estado)
      ? `<button class="btn btn-outline btn-small" onclick="advanceEmployeeOrder(${Number(order.id)}, '${escapeHtml(order.estado)}')">Avanzar estado</button>` : '—'}</td>
  </tr>`).join('');
}


async function advanceEmployeeOrder(
  id,
  estadoActual
){

  const estados = [
    'pendiente',
    'confirmado',
    'en_preparacion',
    'listo',
    'en_camino',
    'entregado'
  ];

  const posicion =
    estados.indexOf(estadoActual);

  if(
    posicion === -1 ||
    posicion >= estados.length - 1
  ){
    return;
  }

  const nuevoEstado =
    estados[posicion + 1];

  try{

    await apiRequest(
      `/pedidos/${id}/estado`,
      {
        method: 'PUT',

        body: JSON.stringify({
          estado: nuevoEstado
        })
      }
    );

    await renderEmployeeOrders();

    await renderStats();

    showToast(
      `Pedido actualizado: ${nuevoEstado}`
    );

  }catch(error){

    console.error(
      'Error al actualizar pedido:',
      error
    );

    showToast(
      error.message ||
      'No se pudo actualizar el pedido'
    );

  }

}
/* =========================================================
   INIT — se ejecuta en todas las páginas
========================================================= */
document.addEventListener('DOMContentLoaded', ()=>{
  initMobileMenu();
  updateCartBadge();
  initCatalogFilters();   // no-op si no existe #filters
  renderCartPanel();      // no-op si no existe #cartItems
  renderOrders();         // no-op si no existe #ordersList
  initEmployeeAuth();     // no-op si no existe #loginForm/#registerForm
  initEmployeePanel();    // no-op si no existe #employeePanel
});
