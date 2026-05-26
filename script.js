// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    
    // ===== CONFIGURACIÓN DE SUPABASE =====
    const SUPABASE_URL = 'https://yczegabspeywaaxsnnoj.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljemVnYWJzcGV5d2FheHNubm9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDc3OTksImV4cCI6MjA5NTM4Mzc5OX0.tdVSoJTjqdwX8wyqnbdNH6mXESDPPIdC_c6bg3kKm5g';
    
    // Crear cliente de Supabase
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Animaciones existentes
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
    
    // Configurar estilos iniciales
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
    aplicarAnimaciones(); // Aplicar al cargar
    
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

        // Eliminar foto de vista previa
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

        // Subir fotos a Supabase Storage
        async function subirFotos(archivos) {
            const urls = [];
            
            for (const archivo of archivos) {
                const extension = archivo.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
                const filePath = `${fileName}`;
                
                const { data, error } = await supabase.storage
                    .from('fotos-solicitudes')
                    .upload(filePath, archivo);
                
                if (error) {
                    console.error('Error al subir foto:', error);
                    throw error;
                }
                
                const { data: { publicUrl } } = supabase.storage
                    .from('fotos-solicitudes')
                    .getPublicUrl(filePath);
                
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
                    throw new Error('Debes subir al menos una foto del equipo');
                }
                
                // Mostrar loading
                Swal.fire({
                    title: 'Enviando solicitud...',
                    text: 'Por favor espera',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
                
                // 1. Subir fotos
                let fotosUrls = await subirFotos(archivosSeleccionados);
                
                // 2. Guardar solicitud
                const solicitudData = {
                    nombre: document.getElementById('nombre').value,
                    email: document.getElementById('email').value,
                    telefono: document.getElementById('telefono').value,
                    marca: document.getElementById('marca').value,
                    modelo: document.getElementById('modelo').value,
                    condicion: document.getElementById('condicion').value,
                    descripcion: document.getElementById('descripcion').value,
                    fotos: fotosUrls,
                    estado: 'pendiente'
                };
                
                const { data, error } = await supabase
                    .from('solicitudes')
                    .insert([solicitudData])
                    .select();
                
                if (error) throw error;
                
                Swal.fire({
                    title: '¡Solicitud enviada!',
                    text: 'Hemos recibido tu solicitud. Te contactaremos en menos de 24 horas.',
                    icon: 'success',
                    confirmButtonColor: '#00ff88'
                });
                
                form.reset();
                previewContainer.innerHTML = '';
                archivosSeleccionados = [];
                
            } catch (error) {
                console.error('Error:', error);
                Swal.fire('Error', error.message || 'Hubo un problema al enviar tu solicitud.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar solicitud';
            }
        });
    }
});