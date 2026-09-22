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
   Vendedor (ventas) y almacenero (producción) solo ven datos de la
   semana en curso (lunes a domingo). El administrador ve todo el
   historial sin filtrar. */
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
  return !!currentEmployeeRole && currentEmployeeRole !== 'administrador';
}

/* ---------------- STATE (localStorage) ---------------- */
function getCart(){ return JSON.parse(localStorage.getItem('pd_cart') || '[]'); }
function setCart(cart){ localStorage.setItem('pd_cart', JSON.stringify(cart)); updateCartBadge(); }
function getOrders(){ return JSON.parse(localStorage.getItem('pd_orders') || '[]'); }
function setOrders(orders){ localStorage.setItem('pd_orders', JSON.stringify(orders)); }

function getProducts(){
  let stored = localStorage.getItem('pd_products');
  if(!stored){
    setProducts(DEFAULT_PRODUCTS);
    return JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
  }
  return JSON.parse(stored);
}
function setProducts(products){ localStorage.setItem('pd_products', JSON.stringify(products)); }

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
  produccion: 'Producción',
  pendiente: 'Pendiente de asignación'
};
// Qué pestañas del panel puede ver cada rol una vez asignado.
const ROLE_TABS = {
  administrador: ['resumen','productos','insumos','pedidos','personal'],
  ventas: ['resumen','pedidos'],
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

function getSupplies(){ return JSON.parse(localStorage.getItem('pd_supplies') || '[]'); }
function setSupplies(list){ localStorage.setItem('pd_supplies', JSON.stringify(list)); }

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

function renderProducts(filter='todos'){
  const grid = document.getElementById('productGrid');
  if(!grid) return;
  grid.innerHTML = '';
  const products = getProducts().filter(p => p.disponible !== false);
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
          <span class="price">${p.customizable ? 'Desde ' : ''}S/ ${p.price.toFixed(2)}</span>
          <button class="btn ${p.customizable ? 'btn-primary' : 'btn-outline'} btn-small">${p.customizable ? 'Personalizar' : 'Agregar'}</button>
        </div>
      </div>
    `;
    card.querySelector('button').addEventListener('click', ()=>{
      if(p.customizable){ openCustomize(p); } else { addSimpleToCart(p); }
    });
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

function addSimpleToCart(p){
  const cart = getCart();
  cart.push({id:Date.now()+''+Math.random(), name:p.name, meta:'', price:p.price, qty:1});
  setCart(cart);
  showToast(`${p.name} agregado al pedido`);
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

  if(cart.length===0){
    wrap.innerHTML = '<p class="cart-empty">Aún no agregaste productos. <a href="catalogo.html">Ve al catálogo</a> y elige algo rico 🍮</p>';
  } else {
    wrap.innerHTML = cart.map(item=>`
      <div class="cart-item">
        <div>
          <div class="ci-name">${item.name}</div>
          ${item.meta ? `<div class="ci-meta">${item.meta}</div>` : ''}
        </div>
        <div style="text-align:right;">
          <div class="price" style="font-size:.95rem;">S/ ${item.price.toFixed(2)}</div>
          <button class="ci-remove" onclick="removeFromCart('${item.id}')">Quitar</button>
        </div>
      </div>
    `).join('');
  }
  const total = cart.reduce((s,i)=>s+i.price,0);
  if(totalEl) totalEl.textContent = `S/ ${total.toFixed(2)}`;
}

function submitOrder(){
  const cart = getCart();
  if(cart.length===0){ showToast('Agrega al menos un producto antes de pedir'); return; }
  const nombre = document.getElementById('clienteNombre').value.trim();
  const telefono = document.getElementById('clienteTelefono').value.trim();
  if(!nombre || !telefono){ showToast('Completa tu nombre y teléfono'); return; }

  let detail = {};
  if(orderType==='delivery'){
    const direccion = document.getElementById('direccion').value.trim();
    if(!direccion){ showToast('Indica tu dirección de entrega'); return; }
    detail = { direccion, metodoPago: document.getElementById('metodoPago').value };
  } else {
    const fecha = document.getElementById('fechaEntrega').value;
    const anticipo = document.getElementById('anticipo').value;
    if(!fecha){ showToast('Selecciona la fecha de entrega'); return; }
    if(!anticipo || Number(anticipo) <= 0){ showToast('Registra el anticipo para confirmar tu pedido'); return; }
    detail = { fechaEntrega: fecha, anticipo: Number(anticipo) };
  }

  const order = {
    id: 'PD-' + Math.floor(1000 + Math.random()*9000),
    tipo: orderType,
    nombre, telefono,
    notas: document.getElementById('notas').value.trim(),
    items: [...cart],
    total: cart.reduce((s,i)=>s+i.price,0),
    detail,
    statusIndex: 0,
    createdAt: new Date().toLocaleString('es-PE'),
    createdAtISO: new Date().toISOString()
  };
  const orders = getOrders();
  orders.unshift(order);
  setOrders(orders);
  setCart([]);

  showToast(`Pedido ${order.id} confirmado`);
  setTimeout(()=>{ window.location.href = 'seguimiento.html'; }, 900);
}

/* =========================================================
   PÁGINA: seguimiento.html
========================================================= */
function renderOrders(){
  const wrap = document.getElementById('ordersList');
  if(!wrap) return;
  const orders = getOrders();
  if(orders.length===0){
    wrap.innerHTML = '<p class="no-orders">Todavía no tienes pedidos confirmados. <a href="catalogo.html">Ver catálogo</a></p>';
    return;
  }
  wrap.innerHTML = orders.map((o, idx)=>`
    <div class="order-card">
      <div class="order-card-top">
        <div>
          <div class="order-id">${o.id} · ${o.tipo==='delivery' ? 'Delivery' : 'Por encargo'}</div>
          <div class="order-sub">${o.nombre} · ${o.createdAt} · Total S/ ${o.total.toFixed(2)}</div>
          ${o.tipo==='encargo' ? `<div class="order-sub">Entrega: ${o.detail.fechaEntrega} · Anticipo registrado: S/ ${o.detail.anticipo.toFixed(2)}</div>` : `<div class="order-sub">Entrega en: ${o.detail.direccion}</div>`}
        </div>
        ${o.statusIndex < STATUS_STEPS.length-1 ? `<button class="btn btn-outline btn-small" onclick="advanceOrder(${idx})">Avanzar estado</button>` : `<span style="background:var(--pink);color:var(--berry);border-radius:999px;padding:6px 14px;font-size:.78rem;font-weight:700;">Completado</span>`}
      </div>
      <div class="stepper">
        ${STATUS_STEPS.map((s,i)=>`
          <div class="step ${i<=o.statusIndex ? 'done':''}">
            <div class="bar"></div>
            <div class="dot">${i<=o.statusIndex ? '✓' : ''}</div>
            <div class="lbl">${s}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}
function advanceOrder(idx){
  const orders = getOrders();
  if(orders[idx].statusIndex < STATUS_STEPS.length-1){
    orders[idx].statusIndex++;
    setOrders(orders);
    renderOrders();
    showToast(`Pedido ${orders[idx].id}: ${STATUS_STEPS[orders[idx].statusIndex]}`);
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

  const tienePermisos = applyRolePermissions(empleado.rol);

  initPanelTabs();
  renderStats();
  renderAdminProducts();
  renderSupplies();
  renderPurchaseOrders();
  renderEmployeeOrders();
  if(empleado.rol === 'administrador'){
    renderPersonalList();
  }

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
function computeStats(soloSemana){
  let orders = getOrders();
  if(soloSemana) orders = orders.filter(o=>isInCurrentWeek(o.createdAtISO));
  const totalPedidos = orders.length;
  const ventasTotales = orders.reduce((s,o)=>s+o.total,0);
  const pendientes = orders.filter(o=>o.statusIndex < STATUS_STEPS.length-1).length;
  const entregados = orders.filter(o=>o.statusIndex === STATUS_STEPS.length-1).length;
  const porTipo = {delivery:0, encargo:0};
  const productCount = {};
  orders.forEach(o=>{
    porTipo[o.tipo] = (porTipo[o.tipo]||0) + o.total;
    (o.items||[]).forEach(it=>{ productCount[it.name] = (productCount[it.name]||0) + 1; });
  });
  const topProducts = Object.entries(productCount).sort((a,b)=>b[1]-a[1]).slice(0,5);
  return {totalPedidos, ventasTotales, pendientes, entregados, porTipo, topProducts};
}

function renderStats(){
  const wrap = document.getElementById('statsCards');
  if(!wrap) return;
  const soloSemana = soloSemanaParaRolActual();
  const s = computeStats(soloSemana);

  const scopeNote = document.getElementById('statsScopeNote');
  if(scopeNote){
    scopeNote.textContent = soloSemana
      ? `Mostrando la semana en curso (${formatWeekRange()}). El administrador ve el historial completo.`
      : 'Historial completo (vista de administrador).';
  }

  wrap.innerHTML = `
    <div class="stat-card"><span class="stat-label">Pedidos totales</span><span class="stat-value">${s.totalPedidos}</span></div>
    <div class="stat-card"><span class="stat-label">Ventas totales</span><span class="stat-value">S/ ${s.ventasTotales.toFixed(2)}</span></div>
    <div class="stat-card"><span class="stat-label">Pedidos pendientes</span><span class="stat-value">${s.pendientes}</span></div>
    <div class="stat-card"><span class="stat-label">Pedidos entregados</span><span class="stat-value">${s.entregados}</span></div>
  `;

  const maxTipo = Math.max(s.porTipo.delivery, s.porTipo.encargo, 1);
  const tipoWrap = document.getElementById('statsPorTipo');
  tipoWrap.innerHTML = `
    <div class="bar-row"><span class="bar-lbl">Delivery</span><div class="bar-track"><div class="bar-fill" style="width:${(s.porTipo.delivery/maxTipo*100)}%"></div></div><span class="bar-val">S/ ${s.porTipo.delivery.toFixed(2)}</span></div>
    <div class="bar-row"><span class="bar-lbl">Por encargo</span><div class="bar-track"><div class="bar-fill" style="width:${(s.porTipo.encargo/maxTipo*100)}%"></div></div><span class="bar-val">S/ ${s.porTipo.encargo.toFixed(2)}</span></div>
  `;

  const topWrap = document.getElementById('statsTopProducts');
  if(s.topProducts.length===0){
    topWrap.innerHTML = '<p class="hint" style="margin:0;">Todavía no hay pedidos registrados para calcular el ranking.</p>';
  } else {
    const maxCount = s.topProducts[0][1];
    topWrap.innerHTML = s.topProducts.map(([name,count])=>`
      <div class="bar-row"><span class="bar-lbl">${name}</span><div class="bar-track"><div class="bar-fill" style="width:${(count/maxCount*100)}%"></div></div><span class="bar-val">${count}</span></div>
    `).join('');
  }
}

/* ---- Gestión de productos ---- */
function renderAdminProducts(){
  const tbody = document.getElementById('productsTableBody');
  if(!tbody) return;
  const products = getProducts();
  if(products.length===0){
    tbody.innerHTML = '<tr><td colspan="6" class="hint" style="padding:16px 0;">No hay productos registrados.</td></tr>';
    return;
  }
  tbody.innerHTML = products.map(p=>`
    <tr>
      <td>${p.icon || '🍰'} ${p.name}</td>
      <td>${labelForCat(p.cat)}</td>
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

function openProductModal(id){
  editingProductId = id || null;
  const p = id ? getProducts().find(x=>x.id===id) : null;
  document.getElementById('productModalTitle').textContent = p ? 'Editar producto' : 'Nuevo producto';
  document.getElementById('productName').value = p ? p.name : '';
  document.getElementById('productCat').value = p ? p.cat : 'cupcake';
  document.getElementById('productDesc').value = p ? p.desc : '';
  document.getElementById('productPrice').value = p ? p.price : '';
  document.getElementById('productIcon').value = p ? (p.icon || '🍰') : '🍰';
  document.getElementById('productCustomizable').checked = p ? !!p.customizable : false;
  document.getElementById('productDisponible').checked = p ? p.disponible!==false : true;
  document.getElementById('customPriceHint').style.display = (p && p.customizable) ? 'block' : 'none';
  document.getElementById('productModal').classList.add('open');
}
function closeProductModal(){ document.getElementById('productModal').classList.remove('open'); }

function submitProductForm(e){
  e.preventDefault();
  const name = document.getElementById('productName').value.trim();
  const cat = document.getElementById('productCat').value;
  const desc = document.getElementById('productDesc').value.trim();
  const price = Number(document.getElementById('productPrice').value);
  const icon = document.getElementById('productIcon').value.trim() || '🍰';
  const customizable = document.getElementById('productCustomizable').checked;
  const disponible = document.getElementById('productDisponible').checked;

  if(!name || !price || price<=0){ showToast('Completa nombre y un precio válido'); return; }

  const products = getProducts();
  if(editingProductId){
    const idx = products.findIndex(p=>p.id===editingProductId);
    if(idx>-1){
      products[idx] = {...products[idx], name, cat, desc, price, icon, customizable, disponible, media:'media-'+cat};
    }
  } else {
    products.push({
      id:'prod-'+Date.now(), name, cat, desc, price, icon, customizable, disponible, media:'media-'+cat
    });
  }
  setProducts(products);
  closeProductModal();
  renderAdminProducts();
  renderStats();
  showToast(editingProductId ? 'Producto actualizado' : 'Producto agregado al catálogo');
}

function deleteProduct(id){
  if(!confirm('¿Eliminar este producto del catálogo?')) return;
  setProducts(getProducts().filter(p=>p.id!==id));
  renderAdminProducts();
  showToast('Producto eliminado');
}

/* ---- Registro de materia prima (insumos) ---- */
function openSupplyModal(id){
  editingSupplyId = id || null;
  const s = id ? getSupplies().find(x=>x.id===id) : null;
  document.getElementById('supplyModalTitle').textContent = s ? 'Editar insumo' : 'Nuevo insumo';
  document.getElementById('supplyName').value = s ? s.nombre : '';
  document.getElementById('supplyQty').value = s ? s.cantidad : '';
  document.getElementById('supplyUnit').value = s ? s.unidad : 'kg';
  document.getElementById('supplyMin').value = s ? s.stockMinimo : '';
  document.getElementById('supplyProveedor').value = s ? (s.proveedor || '') : '';
  document.getElementById('supplyModal').classList.add('open');
}
function closeSupplyModal(){ document.getElementById('supplyModal').classList.remove('open'); }

function submitSupplyForm(e){
  e.preventDefault();
  const nombre = document.getElementById('supplyName').value.trim();
  const cantidad = Number(document.getElementById('supplyQty').value);
  const unidad = document.getElementById('supplyUnit').value;
  const stockMinimo = Number(document.getElementById('supplyMin').value) || 0;
  const proveedor = document.getElementById('supplyProveedor').value.trim();

  if(!nombre || isNaN(cantidad) || cantidad<0){ showToast('Completa nombre y una cantidad válida'); return; }

  const supplies = getSupplies();
  const record = {
    id: editingSupplyId || ('sup-'+Date.now()),
    nombre, cantidad, unidad, stockMinimo, proveedor,
    actualizadoAt: new Date().toLocaleString('es-PE')
  };
  if(editingSupplyId){
    const idx = supplies.findIndex(s=>s.id===editingSupplyId);
    if(idx>-1) supplies[idx] = record;
  } else {
    supplies.push(record);
  }
  setSupplies(supplies);
  closeSupplyModal();
  renderSupplies();
  showToast(editingSupplyId ? 'Insumo actualizado' : 'Insumo registrado');
}

function deleteSupply(id){
  if(!confirm('¿Eliminar este insumo del registro?')) return;
  setSupplies(getSupplies().filter(s=>s.id!==id));
  renderSupplies();
  showToast('Insumo eliminado');
}

function renderSupplies(){
  const tbody = document.getElementById('suppliesTableBody');
  if(!tbody) return;
  const supplies = getSupplies();
  if(supplies.length===0){
    tbody.innerHTML = '<tr><td colspan="6" class="hint" style="padding:16px 0;">Aún no registras insumos de materia prima.</td></tr>';
    return;
  }
  tbody.innerHTML = supplies.map(s=>{
    const bajo = s.cantidad <= s.stockMinimo;
    return `
    <tr class="${bajo ? 'row-warning':''}">
      <td>${s.nombre}</td>
      <td>${s.cantidad} ${s.unidad}</td>
      <td>${s.stockMinimo} ${s.unidad}</td>
      <td>${s.proveedor || '—'}</td>
      <td><span class="pill ${bajo ? 'pill-off':'pill-ok'}">${bajo ? 'Stock bajo':'Normal'}</span></td>
      <td class="table-actions">
        <button class="btn btn-outline btn-small" onclick="openSupplyModal('${s.id}')">Editar</button>
        <button class="btn btn-small btn-danger" onclick="deleteSupply('${s.id}')">Eliminar</button>
      </td>
    </tr>`;
  }).join('');
}

/* ---- Registro de órdenes de compra de insumos ---- */
function getPurchaseOrders(){ return JSON.parse(localStorage.getItem('pd_purchase_orders') || '[]'); }
function setPurchaseOrders(list){ localStorage.setItem('pd_purchase_orders', JSON.stringify(list)); }

function populatePurchaseInsumoSelect(){
  const select = document.getElementById('purchaseInsumo');
  if(!select) return;
  const supplies = getSupplies();
  select.innerHTML = supplies.map(s=>`<option value="${s.id}">${s.nombre}</option>`).join('')
    + '<option value="__otro">Otro insumo (nuevo)</option>';
}

function openPurchaseModal(){
  populatePurchaseInsumoSelect();
  document.getElementById('purchaseForm').reset();
  document.getElementById('purchaseNuevoNombreWrap').style.display = 'none';
  document.getElementById('purchaseFecha').value = new Date().toISOString().slice(0,10);
  document.getElementById('purchaseModal').classList.add('open');
}
function closePurchaseModal(){ document.getElementById('purchaseModal').classList.remove('open'); }

function submitPurchaseForm(e){
  e.preventDefault();
  const insumoSel = document.getElementById('purchaseInsumo').value;
  const nuevoNombre = document.getElementById('purchaseNuevoNombre').value.trim();
  const cantidad = Number(document.getElementById('purchaseCantidad').value);
  const costo = Number(document.getElementById('purchaseCosto').value) || 0;
  const tienda = document.getElementById('purchaseTienda').value.trim();
  const fecha = document.getElementById('purchaseFecha').value;

  if(isNaN(cantidad) || cantidad<=0){ showToast('Indica una cantidad comprada válida'); return; }
  if(insumoSel==='__otro' && !nuevoNombre){ showToast('Indica el nombre del insumo nuevo'); return; }

  const supplies = getSupplies();
  let insumoNombre, unidad;

  if(insumoSel==='__otro'){
    unidad = 'unidades';
    const nuevoInsumo = {
      id: 'sup-'+Date.now(), nombre: nuevoNombre, cantidad, unidad, stockMinimo: 0, proveedor: tienda,
      actualizadoAt: new Date().toLocaleString('es-PE')
    };
    supplies.push(nuevoInsumo);
    insumoNombre = nuevoNombre;
  } else {
    const idx = supplies.findIndex(s=>s.id===insumoSel);
    if(idx===-1){ showToast('Selecciona un insumo válido'); return; }
    supplies[idx].cantidad = Number(supplies[idx].cantidad) + cantidad;
    supplies[idx].actualizadoAt = new Date().toLocaleString('es-PE');
    insumoNombre = supplies[idx].nombre;
    unidad = supplies[idx].unidad;
  }
  setSupplies(supplies);

  const fechaISO = fecha ? new Date(fecha+'T12:00:00').toISOString() : new Date().toISOString();
  const compras = getPurchaseOrders();
  compras.unshift({
    id: 'OC-'+Date.now(),
    insumo: insumoNombre,
    cantidad, unidad, costo, tienda,
    fecha: fecha || new Date().toISOString().slice(0,10),
    fechaISO,
    registradoPor: (getSession() && getSession().nombre) || '—'
  });
  setPurchaseOrders(compras);

  closePurchaseModal();
  renderSupplies();
  renderPurchaseOrders();
  showToast('Orden de compra registrada y stock actualizado');
}

function renderPurchaseOrders(){
  const tbody = document.getElementById('purchaseOrdersBody');
  if(!tbody) return;
  const soloSemana = soloSemanaParaRolActual();

  const scopeNote = document.getElementById('comprasScopeNote');
  if(scopeNote){
    scopeNote.textContent = soloSemana
      ? `Mostrando compras de la semana en curso (${formatWeekRange()}).`
      : 'Historial completo (vista de administrador).';
  }

  const allCompras = getPurchaseOrders();
  const compras = soloSemana ? allCompras.filter(c=>isInCurrentWeek(c.fechaISO)) : allCompras;

  if(compras.length===0){
    tbody.innerHTML = `<tr><td colspan="6" class="hint" style="padding:16px 0;">${soloSemana ? 'No hay compras registradas esta semana.' : 'Aún no registras órdenes de compra.'}</td></tr>`;
    return;
  }
  tbody.innerHTML = compras.map(c=>`
    <tr>
      <td>${c.fecha}</td>
      <td>${c.insumo}</td>
      <td>${c.cantidad} ${c.unidad}</td>
      <td>S/ ${Number(c.costo).toFixed(2)}</td>
      <td>${c.tienda || '—'}</td>
      <td>${c.registradoPor}</td>
    </tr>
  `).join('');
}

/* ---- Gestión de pedidos (vista del personal) ---- */
function renderEmployeeOrders(){
  const tbody = document.getElementById('employeeOrdersBody');
  if(!tbody) return;
  const soloSemana = soloSemanaParaRolActual();

  const scopeNote = document.getElementById('pedidosScopeNote');
  if(scopeNote){
    scopeNote.textContent = soloSemana
      ? `Mostrando pedidos de la semana en curso (${formatWeekRange()}).`
      : 'Historial completo (vista de administrador).';
  }

  const allOrders = getOrders();
  const orders = soloSemana ? allOrders.filter(o=>isInCurrentWeek(o.createdAtISO)) : allOrders;
  if(orders.length===0){
    tbody.innerHTML = `<tr><td colspan="6" class="hint" style="padding:16px 0;">${soloSemana ? 'No hay pedidos esta semana.' : 'No hay pedidos registrados todavía.'}</td></tr>`;
    return;
  }
  tbody.innerHTML = orders.map((o)=>{
    const idx = allOrders.indexOf(o);
    return `
    <tr>
      <td>${o.id}</td>
      <td>${o.nombre}</td>
      <td>${o.tipo==='delivery' ? 'Delivery' : 'Por encargo'}</td>
      <td>S/ ${o.total.toFixed(2)}</td>
      <td><span class="pill ${o.statusIndex===STATUS_STEPS.length-1 ? 'pill-ok':'pill-off'}">${STATUS_STEPS[o.statusIndex]}</span></td>
      <td class="table-actions">
        ${o.statusIndex < STATUS_STEPS.length-1
          ? `<button class="btn btn-outline btn-small" onclick="advanceEmployeeOrder(${idx})">Avanzar estado</button>`
          : '—'}
      </td>
    </tr>
  `;
  }).join('');
}
function advanceEmployeeOrder(idx){
  const orders = getOrders();
  if(orders[idx].statusIndex < STATUS_STEPS.length-1){
    orders[idx].statusIndex++;
    setOrders(orders);
    renderEmployeeOrders();
    renderStats();
    showToast(`Pedido ${orders[idx].id}: ${STATUS_STEPS[orders[idx].statusIndex]}`);
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
