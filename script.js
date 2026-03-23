const API_BASE = "https://automatizaciondb.onrender.com/api";

// Elements
const loginScreen = document.getElementById('loginScreen');
const mainDashboard = document.getElementById('mainDashboard');
const loginForm = document.getElementById('loginForm');
const btnLogout = document.getElementById('btnLogout');
const btnTopGuardar = document.getElementById('btnTopGuardar');
const btnAddSucursal = document.getElementById('btnAddSucursal');
const sucursalesContainer = document.getElementById('sucursalesContainer');

// State
let estadoGlobal = {
    negocio_id: null,
    perfil_id: null
};

// HELPERS
function showToast(msg, type='success') {
    const hub = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = msg;
    hub.appendChild(t);
    setTimeout(() => { t.style.opacity=0; setTimeout(()=>t.remove(),300); }, 3000);
}

// Generador de IDs únicos para el DOM
const generateId = () => Math.random().toString(36).substr(2, 9);

// ================================
// LOGIN LOGIC
// ================================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('loginNombre').value;
    const pass = document.getElementById('loginPass').value;
    const btn = loginForm.querySelector('.btn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cargando...';

    try {
        const res = await fetch(`${API_BASE}/datos/negocios`);
        if (!res.ok) throw new Error("Error en la conexión a la Base de Datos");
        const negocios = await res.json();
        const miNegocio = negocios.find(n => n.nombre === user && n.contrasena === pass);

        if (!miNegocio) {
            showToast("Usuario o contraseña incorrectos", "error");
        } else if (miNegocio.estatus === "Suspendido") {
            showToast("Tu cuenta está suspendida. Contacta a soporte.", "error");
        } else {
            estadoGlobal.negocio_id = miNegocio.id;
            document.getElementById('navNombreNegocio').innerText = miNegocio.nombre;
            document.getElementById('navPlanBadge').innerHTML = `<i class="fa-solid fa-crown"></i> Plan: ${miNegocio.plan}`;
            
            showToast("¡Bienvenido al Portal!");
            loginScreen.classList.remove('active');
            setTimeout(() => {
                loginScreen.style.display = 'none';
                mainDashboard.classList.remove('hidden');
            }, 400);

            // EJECUCIÓN OPTIMIZADA: NO usar `await` para no congelar la pantalla de Login
            initPerfil();
        }
    } catch(err) {
        showToast(err.message, "error");
    } finally {
        btn.innerHTML = 'Entrar al Portal <i class="fa-solid fa-arrow-right"></i>';
    }
});

btnLogout.addEventListener('click', () => location.reload());

// ================================
// DYNAMIC DOM BUILDERS (NESTED)
// ================================
btnAddSucursal.addEventListener('click', () => addSucursalCard({}, true));

function addSucursalCard(sucursalInfo = {}, isNew = false) {
    const sId = generateId(); // Unique ID for targeting DOM elements inside this branch
    const card = document.createElement('div');
    card.className = "sucursal-card glass";
    card.id = `sucursal-${sId}`;
    
    // Por defecto array vacío de platos si no existe
    const menuArr = sucursalInfo.menu || [];

    card.innerHTML = `
        <div class="sucursal-card-header">
            <h3><i class="fa-solid fa-store"></i> <input type="text" style="background:transparent; border:none; color:white; font-size:1.3rem; font-weight:bold; outline:none; border-bottom: 1px dashed rgba(255,255,255,0.3);" class="suc-nombre" value="${sucursalInfo.nombre || 'Nueva Sucursal'}" placeholder="Nombre de Sede"></h3>
            <button type="button" class="btn btn-danger btn-sm" onclick="document.getElementById('sucursal-${sId}').remove()"><i class="fa-solid fa-trash"></i> Eliminar Sede</button>
        </div>
        
        <div class="grid-3" style="margin-bottom: 1.5rem;">
            <div class="input-group">
                <label>Dirección</label>
                <input type="text" class="suc-direccion" value="${sucursalInfo.direccion || ''}" placeholder="Ej. Calle Principal 123">
            </div>
            <div class="input-group">
                <label>Horario de Atención</label>
                <input type="text" class="suc-horario" value="${sucursalInfo.horario || ''}" placeholder="Ej. Lun-Sab 8am a 10pm">
            </div>
            <div class="input-group">
                <label>Métodos de Pago Aceptados</label>
                <input type="text" class="suc-pagos" value="${sucursalInfo.pagos || ''}" placeholder="Ej. Efectivo, Tarjeta, Yape">
            </div>
        </div>

        <div class="menu-section">
            <div class="menu-section-header">
                <h4><i class="fa-solid fa-burger"></i> Carta / Menú Exclusivo de Sede</h4>
                <button type="button" class="btn btn-outline btn-sm" onclick="addPlatoToSucursal('${sId}')"><i class="fa-solid fa-plus"></i> Añadir Plato</button>
            </div>
            <div class="dynamic-list menu-container-list" id="menu-list-${sId}">
                <!-- Platos inyectados via JS -->
            </div>
        </div>
    `;

    sucursalesContainer.appendChild(card);

    // Llenar sus platos si existen
    if (menuArr.length > 0) {
        menuArr.forEach(plato => {
            addPlatoToSucursal(sId, plato.nombre, plato.precio, plato.desc, plato.img);
        });
    } else if (isNew) {
        // Al menos un plato por defecto
        addPlatoToSucursal(sId);
    }
}

// ================================
// IMAGE UPLOAD SYSTEM
// ================================
window.subirImagen = async function(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;
    
    // UI Loading state
    const parent = inputElement.parentElement;
    const previewBox = parent.querySelector('.preview-box');
    const hiddenInput = parent.querySelector('input[type="hidden"]');
    
    if (previewBox) previewBox.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="color:var(--accent);"></i>';

    // Compresión Nativa a Base64 usando Canvas (Elimina la dependencia de ImgBB)
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 600;
            let width = img.width;
            let height = img.height;

            if (width > MAX_WIDTH) {
                height = height * (MAX_WIDTH / width);
                width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);

            // Exportar imagen comprimida a JPEG con calidad 70%
            const compressUrl = canvas.toDataURL("image/jpeg", 0.7);
            
            if (hiddenInput) hiddenInput.value = compressUrl;
            if (previewBox) {
                previewBox.innerHTML = '';
                previewBox.style.backgroundImage = `url(${compressUrl})`;
            }
            showToast("Imagen subida (comprimida)");
        }
        img.onerror = () => {
            showToast("Error leyendo la imagen", "error");
            if(previewBox) previewBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:red;"></i>';
        };
        img.src = e.target.result;
    }
    reader.onerror = () => {
        showToast("Error leyendo archivo", "error");
        if(previewBox) previewBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:red;"></i>';
    };
    reader.readAsDataURL(file);
};

// Global scope function for the injected inline onclick handlers
window.addPlatoToSucursal = function(sucursalId, nom="", pre="", desc="", img="") {
    const list = document.getElementById(`menu-list-${sucursalId}`);
    const div = document.createElement('div');
    div.className = "dynamic-item plato-item";
    div.innerHTML = `
        <div class="input-group">
            <label>Plato</label>
            <input type="text" class="plato-nombre" value="${nom}" placeholder="Ej. Lomo Saltado">
        </div>
        <div class="input-group">
            <label>Precio</label>
            <input type="number" step="0.01" class="plato-precio" value="${pre}" placeholder="Ej. 25.00">
        </div>
        <div class="input-group" style="flex: 1.5;">
            <label>Descripción Corta</label>
            <input type="text" class="plato-desc" value="${desc}" placeholder="Ej. Carne con papas y arroz">
        </div>
        <div class="input-group img-upload-group" style="flex: 1;">
            <label>Foto Obligatoria</label>
            <input type="file" accept="image/*" class="plato-img-file file-input" onchange="subirImagen(this)">
            <input type="hidden" class="plato-img-url" value="${img}">
            <div class="preview-box img-preview" style="${img ? 'background-image:url('+img+')' : ''}"></div>
        </div>
        <button type="button" class="btn btn-danger" onclick="this.parentElement.remove()"><i class="fa-solid fa-trash"></i></button>
    `;
    list.appendChild(div);
};


// ================================
// DATA SYNC LOGIC
// ================================
async function initPerfil() {
    // A. Asegurarnos que la tabla existe en Supabase en segundo plano sin bloquear interfaz
    const payloadTabla = {
        negocio_id: "INTEGER",
        logo_url: "TEXT",
        telefono: "TEXT",
        izipay_shop_id: "TEXT",
        izipay_public: "TEXT",
        izipay_private: "TEXT",
        sucursales_json: "JSONB"
    };

    try {
        // Se ejecuta rápido sin await pesado en cadena 
        fetch(`${API_BASE}/tablas/restaurantes_perfiles`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payloadTabla)
        }).catch(e => console.log('Tabla ya existe o error oculto'));
        
        // B. Intentar leer mi perfil (Solo esperamos esto)
        const resList = await fetch(`${API_BASE}/datos/restaurantes_perfiles`);
        if(resList.ok) {
            const allProfiles = await resList.json();
            const myProfile = allProfiles.find(p => p.negocio_id === estadoGlobal.negocio_id);
            
            if (myProfile) {
                estadoGlobal.perfil_id = myProfile.id;
                poblarFormulario(myProfile);
            } else {
                // Agregar una sucursal vacía por defecto si es cuenta nueva
                addSucursalCard({}, true);
            }
        }
    } catch (e) {
        showToast("Error conectando con los datos extendidos.", "error");
    }
}

function poblarFormulario(prof) {
    // Escuchar logo upload global
    const logoInput = document.getElementById('logoFile');
    if (logoInput && !logoInput.hasListener) {
        logoInput.hasListener = true;
        logoInput.addEventListener('change', function() { window.subirImagen(this); });
    }

    document.getElementById('logoUrl').value = prof.logo_url || "";
    if (prof.logo_url) {
        document.getElementById('logoPreview').style.backgroundImage = `url(${prof.logo_url})`;
    }

    document.getElementById('telefonoPref').value = prof.telefono || "";
    
    // Poblar Izipay
    document.getElementById('izipayShopId').value = prof.izipay_shop_id || "";
    document.getElementById('izipayPublicKey').value = prof.izipay_public || "";
    document.getElementById('izipayPrivateKey').value = prof.izipay_private || "";

    sucursalesContainer.innerHTML = "";
    
    // Cargar mega-estructura de sucursales
    if (prof.sucursales_json) {
        const sucs = typeof prof.sucursales_json === 'string' ? JSON.parse(prof.sucursales_json) : prof.sucursales_json;
        sucs.forEach(s => addSucursalCard(s, false));
    } else {
        addSucursalCard({}, true);
    }
}

// ================================
// SAVE LOGIC (MEGA SERIALIZATION)
// ================================
btnTopGuardar.addEventListener('click', async (e) => {
    e.preventDefault();
    const originalText = btnTopGuardar.innerHTML;
    btnTopGuardar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

    // 1. Array Maestro de Sucursales
    const masterBranches = [];
    
    // ITERAR POR CADA SUCURSAL CARD
    document.querySelectorAll('.sucursal-card').forEach(sCard => {
        // Extraer Platos exclusivos de ESTA sucursal
        const menuLocal = [];
        sCard.querySelectorAll('.plato-item').forEach(pItem => {
            menuLocal.push({
                nombre: pItem.querySelector('.plato-nombre').value,
                precio: pItem.querySelector('.plato-precio').value,
                desc: pItem.querySelector('.plato-desc').value,
                img: pItem.querySelector('.plato-img-url').value
            });
        });

        masterBranches.push({
            nombre: sCard.querySelector('.suc-nombre').value,
            direccion: sCard.querySelector('.suc-direccion').value,
            horario: sCard.querySelector('.suc-horario').value,
            pagos: sCard.querySelector('.suc-pagos').value,
            menu: menuLocal
        });
    });

    const payload = {
        negocio_id: estadoGlobal.negocio_id,
        logo_url: document.getElementById('logoUrl').value,
        telefono: document.getElementById('telefonoPref').value,
        izipay_shop_id: document.getElementById('izipayShopId').value,
        izipay_public: document.getElementById('izipayPublicKey').value,
        izipay_private: document.getElementById('izipayPrivateKey').value,
        sucursales_json: JSON.stringify(masterBranches)
    };

    try {
        let theUrl = `${API_BASE}/datos/restaurantes_perfiles`;
        let method = 'POST';

        if (estadoGlobal.perfil_id) {
            theUrl += `/${estadoGlobal.perfil_id}`;
            method = 'PUT';
        }

        const res = await fetch(theUrl, {
            method: method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const result = await res.json();
            if(method === 'POST') estadoGlobal.perfil_id = result.dato_guardado.id;
            showToast("¡Guardado exitosamente!");
            // Eliminar botón pulse-btn al guardar exitosamente
            btnTopGuardar.classList.remove('pulse-btn');
        } else {
            throw new Error("No se pudo guardar la configuración.");
        }
    } catch(err) {
        showToast(err.message, "error");
    } finally {
        btnTopGuardar.innerHTML = originalText;
    }
});
