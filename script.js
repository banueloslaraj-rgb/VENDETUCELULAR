// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    
    // ===== CONFIGURACIÓN DE SUPABASE =====
    const SUPABASE_URL = 'https://yczegabspeywaaxsnnoj.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljemVnYWJzcGV5d2FheHNubm9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDc3OTksImV4cCI6MjA5NTM4Mzc5OX0.tdVSoJTjqdwX8wyqnbdNH6mXESDPPIdC_c6bg3kKm5g';
    
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // ===== SCROLL AL FORMULARIO =====
    const scrollToFormBtn = document.getElementById('scrollToForm');
    const formularioSection = document.getElementById('formularioSection');
    
    if (scrollToFormBtn && formularioSection) {
        scrollToFormBtn.addEventListener('click', function() {
            formularioSection.scrollIntoView({ behavior: 'smooth' });
        });
    }
    
    // ===== CAMBIAR TEXTO DEL BOTÓN DE AYUDA =====
    const whatsappHelpBtn = document.getElementById('whatsappHelpBtn');
    if (whatsappHelpBtn) {
        whatsappHelpBtn.innerHTML = '❓ Ayuda por WhatsApp';
    }
    
    const whatsappFloatBtn = document.getElementById('whatsappFloatBtn');
    if (whatsappFloatBtn) {
        whatsappFloatBtn.innerHTML = '❓';
    }
    
    // Animaciones
    const cards = document.querySelectorAll('.card');
    const steps = document.querySelectorAll('.step');
    
    function aplicarAnimaciones() {
        cards.forEach(card => {
            const position = card.getBoundingClientRect().top;
            const screen = window.innerHeight / 1.2;
            if(position < screen){
                card.style.opacity = "1";
                card.style.transform = "translateY(0)";
            }
        });
        
        steps.forEach(step => {
            const position = step.getBoundingClientRect().top;
            const screen = window.innerHeight / 1.2;
            if(position < screen){
                step.style.opacity = "1";
                step.style.transform = "translateY(0)";
            }
        });
    }
    
    cards.forEach(item => {
        item.style.opacity = "0";
        item.style.transform = "translateY(40px)";
        item.style.transition = ".7s";
    });
    
    steps.forEach(item => {
        item.style.opacity = "0";
        item.style.transform = "translateY(40px)";
        item.style.transition = ".7s";
    });
    
    window.addEventListener('scroll', aplicarAnimaciones);
    aplicarAnimaciones();
    
    // ===== FUNCIONALIDAD DEL FORMULARIO =====
    const form = document.getElementById('ventaForm');
    
    if (form) {
        const fotosInput = document.getElementById('fotos');
        const previewContainer = document.getElementById('previewFotos');
        let archivosSeleccionados = [];
        
        // Variables para guardar las URLs de WhatsApp
        let urlClienteWhatsApp = '';
        let urlAdminWhatsApp = '';

        // Vista previa de fotos
        fotosInput.addEventListener('change', (e) => {
            archivosSeleccionados = Array.from(e.target.files);
            previewContainer.innerHTML = '';
            
            if (archivosSeleccionados.length > 5) {
                Swal.fire('Error', 'Solo puedes subir máximo 5 fotos', 'error');
                archivosSeleccionados = archivosSeleccionados.slice(0, 5);
                fotosInput.value = '';
                return;
            }
            
            archivosSeleccionados.forEach((archivo, index) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const previewDiv = document.createElement('div');
                    previewDiv.className = 'preview-foto';
                    previewDiv.innerHTML = `
                        <img src="${e.target.result}" alt="Vista previa">
                        <span class="remove-foto" data-index="${index}">×</span>
                    `;
                    previewContainer.appendChild(previewDiv);
                }
                reader.readAsDataURL(archivo);
            });
        });

        // Eliminar foto
        previewContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-foto')) {
                const index = parseInt(e.target.getAttribute('data-index'));
                archivosSeleccionados.splice(index, 1);
                const newFileList = new DataTransfer();
                archivosSeleccionados.forEach(file => newFileList.items.add(file));
                fotosInput.files = newFileList.files;
                fotosInput.dispatchEvent(new Event('change'));
            }
        });

        // Subir fotos
        async function subirFotos(archivos) {
            const urls = [];
            
            for (const archivo of archivos) {
                const extension = archivo.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
                
                const { data, error } = await supabase.storage
                    .from('fotos-solicitudes')
                    .upload(fileName, archivo);
                
                if (error) throw error;
                
                const { data: { publicUrl } } = supabase.storage
                    .from('fotos-solicitudes')
                    .getPublicUrl(fileName);
                
                urls.push(publicUrl);
            }
            
            return urls;
        }

        // Enviar formulario
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = form.querySelector('.btn-submit');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';
            
            try {
                if (archivosSeleccionados.length === 0) {
                    throw new Error('Debes subir al menos una foto');
                }
                
                const precioCliente = document.getElementById('precioCliente').value;
                if (!precioCliente) {
                    throw new Error('Ingresa el precio que esperas por tu equipo');
                }
                
                Swal.fire({
                    title: 'Enviando solicitud...',
                    text: 'Por favor espera',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });
                
                // Subir fotos
                let fotosUrls = await subirFotos(archivosSeleccionados);
                
                // Guardar solicitud
                const solicitudData = {
                    nombre: document.getElementById('nombre').value,
                    email: document.getElementById('email').value,
                    telefono: document.getElementById('telefono').value,
                    marca: document.getElementById('marca').value,
                    modelo: document.getElementById('modelo').value,
                    condicion: document.getElementById('condicion').value,
                    precio_cliente: precioCliente,
                    descripcion: document.getElementById('descripcion').value || '',
                    fotos: fotosUrls,
                    estado: 'pendiente'
                };
                
                const { data, error } = await supabase
                    .from('solicitudes')
                    .insert([solicitudData])
                    .select();
                
                if (error) throw error;
                
                const solicitudId = data[0].id;
                
                // ===== CREAR MENSAJES DE WHATSAPP =====
                const mensajeClienteConfirmacion = `*JL PHONE BUYBACK* 🤝\n\n` +
                    `¡Hola ${solicitudData.nombre}! ✅\n\n` +
                    `Hemos recibido tu solicitud de venta #${solicitudId}\n\n` +
                    `📱 *Equipo:* ${solicitudData.marca} ${solicitudData.modelo}\n` +
                    `💰 *Precio sugerido:* $${parseInt(precioCliente).toLocaleString()} MXN\n\n` +
                    `⌛ En las próximas horas estaremos evaluando tu equipo y te enviaremos nuestra respuesta.\n\n` +
                    `📌 *Mientras tanto, puedes:*\n` +
                    `• Responder este mensaje si tienes dudas\n` +
                    `• Tener listo tu equipo para la revisión\n\n` +
                    `¡Gracias por confiar en nosotros! 🙌\n\n` +
                    `*JL PHONE BUYBACK* - Compra profesional de equipos usados`;
                
                const telefonoClienteLimpio = solicitudData.telefono.replace(/\D/g, '');
                urlClienteWhatsApp = `https://wa.me/52${telefonoClienteLimpio}?text=${encodeURIComponent(mensajeClienteConfirmacion)}`;
                
                const mensajeAdmin = `🆕 *NUEVA SOLICITUD DE VENTA* #${solicitudId}\n\n` +
                    `👤 *Cliente:* ${solicitudData.nombre}\n` +
                    `📱 *Teléfono:* ${solicitudData.telefono}\n` +
                    `📧 *Email:* ${solicitudData.email}\n` +
                    `🏷️ *Equipo:* ${solicitudData.marca} ${solicitudData.modelo}\n` +
                    `🔧 *Condición:* ${solicitudData.condicion}\n` +
                    `💰 *Precio esperado:* $${parseInt(precioCliente).toLocaleString()} MXN\n` +
                    `📝 *Descripción:* ${solicitudData.descripcion || 'Sin descripción'}\n\n` +
                    `🔗 *Ver en admin:* ${window.location.origin}/admin.html`;
                
                const adminWhatsApp = '523111063251';
                urlAdminWhatsApp = `https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(mensajeAdmin)}`;
                
                // Cerrar el loading
                Swal.close();
                
                // Mostrar mensaje de éxito con botón para abrir WhatsApp
                const result = await Swal.fire({
                    title: '¡Solicitud enviada!',
                    html: `Hemos recibido tu solicitud. <strong>Te contactaremos en breve</strong> por WhatsApp.<br><br>
                    <strong>Tu precio sugerido:</strong> <span style="color:#10b981; font-size:1.2rem;">$${parseInt(precioCliente).toLocaleString()} MXN</span><br><br>
                    <strong>✓ Solicitud #${solicitudId}</strong>`,
                    icon: 'success',
                    confirmButtonText: '📱 Enviar confirmación por WhatsApp',
                    cancelButtonText: 'Cerrar',
                    showCancelButton: true,
                    confirmButtonColor: '#10b981'
                });
                
                // Si el usuario hace clic en "Enviar confirmación por WhatsApp"
                if (result.isConfirmed) {
                    // Abrir WhatsApp del cliente
                    window.open(urlClienteWhatsApp, '_blank');
                    
                    // Mostrar segundo mensaje
                    await Swal.fire({
                        title: '✅ Listo',
                        html: `Se ha abierto WhatsApp para confirmar tu solicitud.<br><br>
                        <small>Si no se abrió automáticamente, revisa que no tengas bloqueador de ventanas emergentes.</small>`,
                        icon: 'info',
                        confirmButtonText: 'Entendido',
                        confirmButtonColor: '#10b981'
                    });
                }
                
                form.reset();
                previewContainer.innerHTML = '';
                archivosSeleccionados = [];
                
            } catch (error) {
                console.error('Error:', error);
                Swal.fire('Error', error.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar solicitud de venta';
            }
        });
    }
});