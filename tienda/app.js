const API_BASE = "https://automatizaciondb.onrender.com/api";
let currentRestaurantProfile = null;
let currentIzipayKeys = {};
let carrito = [];

// DOM Elements
const heroHeader = document.getElementById('heroHeader');
const headerLogo = document.getElementById('headerLogo');
const headerName = document.getElementById('headerName');
const heroTitle = document.getElementById('heroTitle');
const heroHorario = document.getElementById('heroHorario');
const menuGrid = document.getElementById('menuGrid');

// Cart Elements
const cartOverlay = document.getElementById('cartOverlay');
const btnOpenCart = document.getElementById('btnOpenCart');
const btnCloseCart = document.getElementById('btnCloseCart');
const cartBadge = document.getElementById('cartBadge');
const cartItemsList = document.getElementById('cartItemsList');
const cartTotal = document.getElementById('cartTotal');
const btnCheckout = document.getElementById('btnCheckout');
const izipayContainer = document.getElementById('izipayContainer');

// Startup Logic
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Determine restaurant from URL pathname o QueryParams
    const urlParams = new URLSearchParams(window.location.search);
    let restName = urlParams.get('restaurant');
    
    // Si no hay ?restaurant=, intenta leer la ruta directa de Vercel (ej. dominio.com/MiRestaurante)
    if (!restName) {
        let path = window.location.pathname.replace(/^\/|\/$/g, '');
        if (path && !path.includes("index.html") && !path.includes("desktop") && !path.includes("users")) {
            restName = decodeURIComponent(path).trim();
        } else {
            // Muestra esto si acceden a la raiz del generador localmente sin parámetros
            restName = "AgenciaAlfa"; 
        }
    } else {
        restName = restName.trim();
    }
    
    document.title = restName + " | Pedidos Online";
    headerName.innerText = restName;
    heroTitle.innerText = "Bienvenido a " + restName;

    // 2. Fetch API to get restaurant details
    try {
        const resNeg = await fetch(`${API_BASE}/datos/negocios`);
        const negocios = await resNeg.json();
        
        // Buscamos ignorando mayúsculas/minúsculas
        const negocio = negocios.find(n => n.nombre.toLowerCase() === restName.toLowerCase());
        
        if (!negocio) throw new Error("Restaurante no encontrado en nuestro sistema");

        const resPerf = await fetch(`${API_BASE}/datos/restaurantes_perfiles`);
        const perfiles = await resPerf.json();
        const perfil = perfiles.find(p => p.negocio_id === negocio.id);
        
        if (!perfil) throw new Error("El restaurante aún no ha configurado su menú.");

        currentRestaurantProfile = perfil;
        
        // Grab Izipay Keys (Wait! API must be updated to hide Private Key. For now we assume we get it, or we do a secure checkout call)
        currentIzipayKeys = {
            shopId: perfil.izipay_shop_id,
            publicKey: perfil.izipay_public
        }; // We will NOT use the private key directly. We will call the backend. But since our Python backend doesn't have the izipay route yet, we'll simulate the checkout button click.
        
        renderProfile(perfil);

    } catch (err) {
        menuGrid.innerHTML = `<div style="text-align:center; color:red; grid-column:1/-1;"><h3>${err.message}</h3></div>`;
    }
});

function renderProfile(prof) {
    if (prof.logo_url) {
        headerLogo.src = prof.logo_url;
        headerLogo.classList.remove('hidden');
        heroHeader.style.backgroundImage = `url(${prof.logo_url})`; 
    }
    
    // Asumiremos la primera sucursal como principal si hay un array
    let branches = [];
    if(prof.sucursales_json) {
        branches = typeof prof.sucursales_json === 'string' ? JSON.parse(prof.sucursales_json) : prof.sucursales_json;
    }
    
    if (branches.length === 0) {
        menuGrid.innerHTML = `<p>No hay platos disponibles.</p>`;
        return;
    }

    // Por simplicidad en esta demo, pintaremos el menú de la primera sucursal
    const mainBranch = branches[0];
    heroHorario.innerHTML = `<i class="fa-solid fa-clock"></i> ${mainBranch.horario || 'Abierto ahora'}`;
    
    menuGrid.innerHTML = "";
    mainBranch.menu.forEach((plato, idx) => {
        const img = plato.img || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60";
        const div = document.createElement('div');
        div.className = "plato-card";
        div.innerHTML = `
            <img src="${img}" alt="${plato.nombre}" class="plato-img">
            <div class="plato-info">
                <h3>${plato.nombre}</h3>
                <p>${plato.desc || 'Delicioso plato preparado con los mejores ingredientes.'}</p>
                <div class="plato-footer">
                    <span>S/ ${parseFloat(plato.precio).toFixed(2)}</span>
                    <button class="add-btn" onclick="addToCart('${plato.nombre}', ${plato.precio})"><i class="fa-solid fa-plus"></i></button>
                </div>
            </div>
        `;
        menuGrid.appendChild(div);
    });
}

// CART LOGIC
function addToCart(nombre, precio) {
    const exist = carrito.find(x => x.nombre === nombre);
    if(exist) {
        exist.qty++;
    } else {
        carrito.push({ nombre, precio: parseFloat(precio), qty: 1 });
    }
    updateCartUI();
    // Auto open cart occasionally or visual feedback
    cartBadge.classList.add('pulse');
    setTimeout(() => cartBadge.classList.remove('pulse'), 300);
}

function updateCartUI() {
    let total = 0;
    let qtyCount = 0;
    cartItemsList.innerHTML = "";

    if (carrito.length === 0) {
        cartItemsList.innerHTML = `<div class="empty-cart"><i class="fa-solid fa-basket-shopping"></i><p>Tu pedido está vacío</p></div>`;
        btnCheckout.disabled = true;
    } else {
        carrito.forEach((item, idx) => {
            total += item.precio * item.qty;
            qtyCount += item.qty;
            const div = document.createElement('div');
            div.className = "cart-item";
            div.innerHTML = `
                <div class="cart-item-info">
                    <h4>${item.nombre}</h4>
                    <span>S/ ${(item.precio * item.qty).toFixed(2)}</span>
                </div>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="changeQty(${idx}, -1)">-</button>
                    <strong>${item.qty}</strong>
                    <button class="qty-btn" onclick="changeQty(${idx}, 1)">+</button>
                </div>
            `;
            cartItemsList.appendChild(div);
        });
        btnCheckout.disabled = false;
    }

    cartTotal.innerText = `S/ ${total.toFixed(2)}`;
    cartBadge.innerText = qtyCount;
}

window.changeQty = function(idx, delta) {
    carrito[idx].qty += delta;
    if (carrito[idx].qty <= 0) carrito.splice(idx, 1);
    updateCartUI();
}

// Sidebar toggle
btnOpenCart.addEventListener('click', () => cartOverlay.classList.add('active'));
btnCloseCart.addEventListener('click', () => {
    cartOverlay.classList.remove('active');
    izipayContainer.classList.add('hidden');
    btnCheckout.style.display = 'block';
});

// Checkout (IZIPAY SIMULATION)
btnCheckout.addEventListener('click', async () => {
    if (!currentIzipayKeys.publicKey) {
        alert("El restaurante no ha configurado Izipay aún.");
        return;
    }

    const total = carrito.reduce((sum, i) => sum + (i.precio * i.qty), 0);
    
    btnCheckout.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Conectando banco...';
    
    // In a real scenario, here we call `POST /api/pagar` on Render to use the private key safely and return the formToken.
    // We will show a placeholder UI for now until the backend endpoint is wired.
    setTimeout(() => {
        btnCheckout.style.display = 'none';
        izipayContainer.classList.remove('hidden');
        izipayContainer.innerHTML = `
            <div style="background:#f1f5f9; padding:2rem; border-radius:12px; border:2px dashed #94a3b8; text-align:center;">
                <img src="https://logodownload.org/wp-content/uploads/2019/09/izipay-logo-1.png" style="width:120px; filter:grayscale(1); opacity:0.5; margin-bottom:1rem;">
                <h3 style="color:#0f172a; margin-bottom:0.5rem;">Caja Segura</h3>
                <p style="color:#64748b; font-size:0.9rem; margin-bottom:1.5rem;">Total a cargar: <strong>S/ ${total.toFixed(2)}</strong></p>
                <div style="background:white; padding:1rem; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
                    <p style="color:#10b981; font-weight:600; margin-bottom:0.5rem;"><i class="fa-solid fa-check-circle"></i> Integración Izipay Exitosa</p>
                    <p style="font-size:0.8rem; color:#64748b;">(El popup oficial requiere token firmado desde tu backend Render usando la clave privada protegida. La plantilla e-commerce en Vercel está lista para recibirlo).</p>
                </div>
            </div>
        `;
    }, 1500);

});
