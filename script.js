// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    
    // ===== CONFIGURACIÓN DE SUPABASE =====
    const SUPABASE_URL = 'https://yczegabspeywaaxsnnoj.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljemVnYWJzcGV5d2FheHNubm9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDc3OTksImV4cCI6MjA5NTM4Mzc5OX0.tdVSoJTjqdwX8wyqnbdNH6mXESDPPIdC_c6bg3kKm5g';
    
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
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
                
                // Enviar WhatsApp al administrador
                const solicitudId = data[0].id;
                const mensajeAdmin = `🆕 *NUEVA SOLICITUD DE VENTA* #${solicitudId}\n\n` +
                    `👤 *Cliente:* ${solicitudData.nombre}\n` +
                    `📱 *Teléfono:* ${solicitudData.telefono}\n` +
                    `📧 *Email:* ${solicitudData.email}\n` +
                    `🏷️ *Equipo:* ${solicitudData.marca} ${solicitudData.modelo}\n` +
                    `🔧 *Condición:* ${solicitudData.condicion}\n` +
                    `💰 *Precio esperado:* $${parseInt(precioCliente).toLocaleString()} MXN\n` +
                    `📝 *Descripción:* ${solicitudData.descripcion || 'Sin descripción'}\n\n` +
                    `🔗 *Ver en admin:* ${window.location.origin}/admin.html`;
                
                const adminWhatsApp = '521311063251';
                const whatsappAdminUrl = `https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(mensajeAdmin)}`;
                
                // Abrir WhatsApp del admin en nueva pestaña
                window.open(whatsappAdminUrl, '_blank');
                
                // Mensaje de éxito con opción de WhatsApp
                await Swal.fire({
                    title: '¡Solicitud enviada!',
                    html: `Hemos recibido tu solicitud. <strong>Te contactaremos en breve</strong> por WhatsApp.<br><br>
                    <strong>Tu precio sugerido:</strong> <span style="color:#10b981; font-size:1.2rem;">$${parseInt(precioCliente).toLocaleString()} MXN</span><br><br>
                    ¿Quieres contactarnos directamente?`,
                    icon: 'success',
                    confirmButtonText: '📱 Enviar WhatsApp ahora',
                    cancelButtonText: 'Cerrar',
                    showCancelButton: true,
                    confirmButtonColor: '#10b981'
                }).then((result) => {
                    if (result.isConfirmed) {
                        const mensajeCliente = `Hola, soy ${solicitudData.nombre}. Acabo de enviar mi solicitud #${solicitudId} para vender mi ${solicitudData.marca} ${solicitudData.modelo} por $${parseInt(precioCliente).toLocaleString()} MXN.`;
                        const clienteWhatsApp = `https://wa.me/521311063251?text=${encodeURIComponent(mensajeCliente)}`;
                        window.open(clienteWhatsApp, '_blank');
                    }
                });
                
                form.reset();
                previewContainer.innerHTML = '';
                archivosSeleccionados = [];
                
            } catch (error) {
                console.error('Error:', error);
                Swal.fire('Error', error.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar solicitud';
            }
        });
    }
});