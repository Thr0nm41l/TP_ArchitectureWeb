// Global user variable
let user

// Display a message to the user
function afficherMessage(msg, type = "success") {
    const messages = document.getElementById("messages")
    messages.innerHTML = msg // Set the message text
    messages.className = type // Set the class for styling based on message type
    setTimeout(() => messages.innerHTML = "", 3000) // Clear the message after 3 seconds
}

// Update the UI based on user authentication state
// Function to fetch and display files
async function loadUserFiles() {
    if (!user || !user.access_token) return

    try {
    const response = await fetch('/api/files/files', {
            headers: {
                'Authorization': `Bearer ${user.access_token}`
            }
        })

        if (!response.ok) {
            throw new Error('Failed to fetch files')
        }

        const { files } = await response.json()
        const filesList = document.getElementById('files-list')
        
        if (files.length === 0) {
            filesList.innerHTML = '<li class="list-group-item">Aucun fichier à afficher</li>'
            return
        }

        filesList.innerHTML = files.map(file => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <a href="${file.downloadUrl}" target="_blank">
                    ${file.filename}
                </a>
            </li>
        `).join('')

    } catch (error) {
        console.error('Error loading files:', error)
        afficherMessage('Erreur lors du chargement des fichiers', 'error')
    }
}

// Update UI elements based on authentication state
function updateUI() {
    const signinSection = document.getElementById("signin-section")
    const logoutButton = document.getElementById("logout-button")
    const fileDropSection = document.getElementById("dropfile-section")
    const fileSection = document.getElementById("files-section")
  
    if (user) {
        // User is logged in
        signinSection.classList.add("hidden")
        logoutButton.classList.remove("hidden")
        fileDropSection.classList.remove("hidden")
        fileSection.classList.remove("hidden")
        loadUserFiles() // Load files when user is logged in
    } else {
        // No user logged in
        signinSection.classList.remove("hidden")
        logoutButton.classList.add("hidden")
        fileDropSection.classList.add("hidden")
        fileSection.classList.add("hidden")
    }
}

// Event listeners for form account creation (automaticaly login if registration is successfull)
document.getElementById("signup-form").addEventListener("submit", async (e) => {
    e.preventDefault()

    const form = e.target
    const formData = new FormData(form)
    const data = Object.fromEntries(formData.entries())

    try {
        // Send the data to the API
    const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
        })
        // Handle the response
        if (!response.ok) {
            afficherMessage(`Signup failed: ${response.status}`, "error")
            console.error('Erreur d\'inscription:', response.status)
        }else {
            afficherMessage("Signup successful!", "success")
            console.log('Inscription réussie !');
            const responseData = await response.json()
            if (responseData.user){
                user = responseData.user; // Store the logged-in user
                updateUI()
            }else{
                afficherMessage("Signup failed: No user data received.", "error")
            } 
        }
    } catch (error) {
        console.error('Error:', error);
        afficherMessage("Failed to send signup request.", "error");
    }
    
})

// Event listener for form login
document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault()

    const form = e.target
    const formData = new FormData(form)
    const data = Object.fromEntries(formData.entries())

    try {
        // Send the data to the API
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
        })
        // Handle the response
        if (!response.ok) {
            afficherMessage("Connection failed: Invalid credentials", "error")
            console.error("Erreur de connexion:", response.status)
        }else {
            afficherMessage("Login successful!", "success")
            const responseData = await response.json()
            if (responseData.user){
                user = responseData.user; // Store the logged-in user
                console.log('Connexion réussie avec token:', user.access_token);
                updateUI()
            }else{
                afficherMessage("Login failed: No user data received.", "error")
            } 
        }
    } catch (error) {
        console.error('Error:', error);
        afficherMessage("Failed to send login request.", "error");
    }
})

// Event listener of the Logout button (section user-info)
document.getElementById("logout-button").addEventListener("click", async () => {
    if (!user || !user.access_token) {
        afficherMessage("No active session found", "error")
        return
    }

    try {
    const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.access_token}`
            }
        })
        if (!response.ok) {
            afficherMessage(`Logout failed: ${response.status}`, "error")
            console.error('Erreur de déconnexion:', response.status)
        } else {
            afficherMessage("Logged out successfully!", "success")
            console.log('Déconnexion réussie !');
            user = null // Clear the user variable
            updateUI()
        }
    } catch (error) {
        console.error('Error:', error);
        afficherMessage("Failed to send logout request.", "error");
    }
})

// Event listener for file dropzone
document.getElementById("dropzone").addEventListener("drop", async (e) => {
    e.preventDefault()
    const files = e.dataTransfer.files

    if (files.length === 0) {
        afficherMessage("No files dropped.", "error")
        return
    }
    // Handle file upload here (to be implemented)
    for (const file of files) {
        console.log(`File dropped: ${file.name} (${file.size} bytes)`)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('userId', user.id)

        console.log(file)
        console.log(user.id)
        
        // Vérification du token avant l'upload
        if (!user || !user.access_token) {
            afficherMessage("Error: Not properly authenticated", "error")
            return
        }

        console.log('Uploading with token:', user.access_token)
    const response = await fetch('/api/files/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${user.access_token}`
            },
            body: formData
        })
        if (!response.ok) {
                afficherMessage(`File upload failed: ${response.status}`, "error")
                console.error('Erreur de téléchargement de fichier:', response.error)
            } else {
                afficherMessage(`File ${file.name} uploaded successfully!`, "success")
                console.log(`Fichier ${file.name} téléchargé avec succès !`);
                loadUserFiles() // Recharger la liste des fichiers après un upload réussi
            }
    }

})

// Prevent default behavior for dragover event
document.getElementById("dropzone").addEventListener("dragover", (e) => {
    e.preventDefault()
})