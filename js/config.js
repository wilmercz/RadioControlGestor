
// Elementos DOM
const programSelect = document.getElementById('program-select');
const uploadForm = document.getElementById('upload-form');
const uploadBtn = document.getElementById('upload-btn');
const uploadProgressContainer = document.getElementById('upload-progress-container');
const uploadProgress = document.getElementById('upload-progress');
const uploadSuccess = document.getElementById('upload-success');
const uploadError = document.getElementById('upload-error');
const uploadHistory = document.getElementById('upload-history');

// Cargar programas disponibles
function loadPrograms() {
    programSelect.innerHTML = '<option value="">Seleccione un programa...</option>';
    
    // Si el usuario tiene un programa específico asignado
    if (userData && userData.programa) {
        const option = document.createElement('option');
        option.value = userData.programa;
        option.textContent = userData.programa;
        programSelect.appendChild(option);
        programSelect.value = userData.programa;
        programSelect.disabled = true; // El usuario solo puede acceder a su programa
    } else {
        // Para usuarios que pueden acceder a múltiples programas
        // (en un sistema real, esto podría venir de una lista en Firebase)
        const programas = ["BOLIVIANOS", "OTRO_PROGRAMA"];
        programas.forEach(programa => {
            const option = document.createElement('option');
            option.value = programa;
            option.textContent = programa;
            programSelect.appendChild(option);
        });
    }
}

// Cargar historial de subidas
function loadUploadHistory() {
    // Limpiar historial actual
    uploadHistory.innerHTML = '';
    
    // Programa del usuario
    const programa = userData.programa || programSelect.value;
    if (!programa) {
        uploadHistory.innerHTML = '<div class="list-group-item text-center p-3"><span class="text-muted">Seleccione un programa primero</span></div>';
        return;
    }
    
    // Referencia a Firebase
    const historyRef = firebase.database().ref(`CONTROLFM/PROGRAMAS_GRABADOS/${programa}/SUBIDOS`);
    
    // Obtener últimas 10 subidas
    historyRef.orderByChild('uploadDate').limitToLast(10).on('value', snapshot => {
        if (!snapshot.exists()) {
            uploadHistory.innerHTML = '<div class="list-group-item text-center p-3"><span class="text-muted">No hay subidas recientes</span></div>';
            return;
        }
        
        // Limpiar historial
        uploadHistory.innerHTML = '';
        
        // Procesar subidas en orden inverso (más recientes primero)
        const uploads = [];
        snapshot.forEach(child => {
            uploads.push({
                id: child.key,
                ...child.val()
            });
        });
        
        // Mostrar subidas ordenadas
        uploads.reverse().forEach(upload => {
            const date = new Date(upload.uploadDate);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            
            let statusBadge = '';
            switch(upload.status) {
                case 'pendiente':
                    statusBadge = '<span class="badge bg-warning">Pendiente</span>';
                    break;
                case 'descargado':
                    statusBadge = '<span class="badge bg-info">Descargado</span>';
                    break;
                case 'programado':
                    statusBadge = '<span class="badge bg-success">Programado</span>';
                    break;
                case 'error':
                    statusBadge = '<span class="badge bg-danger">Error</span>';
                    break;
                default:
                    statusBadge = '<span class="badge bg-secondary">Desconocido</span>';
            }
            
            const item = document.createElement('div');
            item.className = 'list-group-item p-2';
            item.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="flex-grow-1">
                        <div class="fw-bold">${upload.fileName}</div>
                        <small class="text-muted">${formattedDate}</small>
                    </div>
                    <div>${statusBadge}</div>
                </div>
            `;
            
            uploadHistory.appendChild(item);
        });
    });
}

// Manejar cambio de programa seleccionado
programSelect.addEventListener('change', () => {
    loadUploadHistory();
});

// Manejar envío del formulario de subida
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Obtener valores del formulario
    const programa = programSelect.value;
    const file = document.getElementById('audio-file').files[0];
    const programType = document.querySelector('input[name="program-type"]:checked').value;
    const broadcastDate = document.getElementById('broadcast-date').value;
    
    // Validaciones básicas
    if (!programa || !file || !programType || !broadcastDate) {
        showError("Por favor complete todos los campos");
        return;
    }
    
    // Validar tipo de archivo
    if (!file.type.includes('audio/mp3') && !file.name.toLowerCase().endsWith('.mp3')) {
        showError("Solo se permiten archivos MP3");
        return;
    }
    
    // Validar tamaño de archivo (50MB máximo)
    if (file.size > 50 * 1024 * 1024) {
        showError("El archivo excede el tamaño máximo permitido (50MB)");
        return;
    }
    
    try {
        // Preparar UI para subida
        uploadBtn.disabled = true;
        uploadProgressContainer.classList.remove('d-none');
        uploadSuccess.classList.add('d-none');
        uploadError.classList.add('d-none');
        uploadProgress.style.width = '0%';
        uploadProgress.textContent = '0%';
        
        // Preparar nombre de archivo
        const dateObj = new Date(broadcastDate);
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();
        const fileName = `${year}-${month}-${day} PROG ${programa} ${programType === 'AM' ? '5H30 AM' : '21H00 PM'}.mp3`;
        
        // Referencia a Storage
        const storageRef = firebase.storage().ref();
        const fileRef = storageRef.child(`programas/${programa}/${fileName}`);
        
        // Subir archivo
        const uploadTask = fileRef.put(file);
        
        // Monitorear progreso
        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                uploadProgress.style.width = progress + '%';
                uploadProgress.textContent = Math.round(progress) + '%';
            },
            (error) => {
                showError("Error al subir el archivo: " + error.message);
                uploadBtn.disabled = false;
            },
            async () => {
                try {
                    // Obtener URL de descarga
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    
                    // Guardar referencia en la base de datos
                    await firebase.database().ref(`CONTROLFM/PROGRAMAS_GRABADOS/${programa}/SUBIDOS`).push({
                        fileName: fileName,
                        originalName: file.name,
                        uploadDate: firebase.database.ServerValue.TIMESTAMP,
                        uploadedBy: currentUser.email,
                        fileSize: file.size,
                        programType: programType,
                        broadcastDate: broadcastDate,
                        status: 'pendiente',
                        downloadUrl: downloadURL,
                        storageRef: `programas/${programa}/${fileName}`
                    });
                    
                    // Mostrar mensaje de éxito
                    uploadSuccess.classList.remove('d-none');
                    uploadForm.reset();
                    document.getElementById('broadcast-date').valueAsDate = new Date();
                    
                    // Volver a configurar programa si está restringido
                    if (userData && userData.programa) {
                        programSelect.value = userData.programa;
                    }
                    
                    // Ocultar mensaje de éxito después de 5 segundos
                    setTimeout(() => {
                        uploadSuccess.classList.add('d-none');
                    }, 5000);
                } catch (error) {
                    showError("Error al finalizar el proceso: " + error.message);
                } finally {
                    uploadBtn.disabled = false;
                }
            }
        );
    } catch (error) {
        showError("Error: " + error.message);
        uploadBtn.disabled = false;
    }
});

// Mostrar mensaje de error
function showError(message) {
    uploadError.textContent = message;
    uploadError.classList.remove('d-none');
}
