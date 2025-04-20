// Elementos DOM
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const userInfo = document.getElementById('user-info');
const usernameDisplay = document.getElementById('username-display');
const logoutBtn = document.getElementById('logout-btn');

// Estado global de autenticación
let currentUser = null;
let userData = null;

// Verificar estado de autenticación al cargar
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        // Usuario autenticado
        currentUser = user;
        checkUserStatus(user.uid);
    } else {
        // Usuario no autenticado
        showLoginScreen();
    }
});

// Función para verificar estado del usuario
async function checkUserStatus(uid) {
    try {
        const userRef = firebase.database().ref(`CONTROLFM/USUARIOS/${uid}`);
        const snapshot = await userRef.once('value');
        userData = snapshot.val();
        
        if (!userData || userData.estado !== "activo") {
            // Usuario inactivo - cerrar sesión
            await firebase.auth().signOut();
            loginError.textContent = "Su cuenta está inactiva. Por favor contacte con la administración.";
            loginError.classList.remove('d-none');
            return;
        }
        
        // Usuario activo - actualizar último acceso
        userRef.update({
            ultimoAcceso: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Mostrar pantalla principal
        showMainScreen();
    } catch (error) {
        console.error("Error verificando estado de usuario:", error);
        await firebase.auth().signOut();
        loginError.textContent = "Error de verificación. Por favor intente nuevamente.";
        loginError.classList.remove('d-none');
    }
}

// Mostrar pantalla de login
function showLoginScreen() {
    currentUser = null;
    userData = null;
    loginScreen.classList.remove('d-none');
    mainScreen.classList.add('d-none');
    userInfo.classList.add('d-none');
}

// Mostrar pantalla principal
function showMainScreen() {
    loginScreen.classList.add('d-none');
    mainScreen.classList.remove('d-none');
    userInfo.classList.remove('d-none');
    usernameDisplay.textContent = userData.nombre || userData.email;
    
    // Inicializar componentes de la pantalla principal
    loadPrograms();
    loadUploadHistory();
    
    // Establecer fecha predeterminada
    document.getElementById('broadcast-date').valueAsDate = new Date();
}

// Manejar envío del formulario de login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    loginError.classList.add('d-none');
    
    try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        // La comprobación de usuario activo se hace en onAuthStateChanged
    } catch (error) {
        let errorMessage = "Error al iniciar sesión. Verifique sus credenciales.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = "Correo o contraseña incorrectos";
        }
        loginError.textContent = errorMessage;
        loginError.classList.remove('d-none');
    }
});

// Manejar cierre de sesión
logoutBtn.addEventListener('click', async () => {
    try {
        await firebase.auth().signOut();
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    }
});
