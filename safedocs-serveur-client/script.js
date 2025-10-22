const { createClient } = supabase

// Create a single supabase client for interacting with the database
const url = "https://xmljgbrtnttjpcvtbzyl.supabase.co"
const api_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtbGpnYnJ0bnR0anBjdnRienlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MTgyMDEsImV4cCI6MjA3NjQ5NDIwMX0.Dg8UJL-KM0i9z_9gCsM-AiZW-RiaVRl0-GvsM9RX-ng"
const client = createClient(url, api_key) // Initialize Supabase client
let user // Object to store the current user

// Display a message to the user
function afficherMessage(msg, type = "success") {
    const messages = document.getElementById("messages")
    messages.innerHTML = msg // Set the message text
    messages.className = type // Set the class for styling based on message type
    setTimeout(() => messages.innerHTML = "", 3000) // Clear the message after 3 seconds
}

// Check input validity (email format, empty input, injection attempts)
function checkInputValidity(input, type="text") {
    const value = input.trim()
    // Basic validation for email format
    if (type === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/ // Regex for email validation
        if(!emailRegex.test(value)) {
            afficherMessage("Please enter a valid email address.", "error")
            return false
        }
    }else{
        // Check for empty input
        if (value === "") {
            afficherMessage("This field cannot be empty.", "error")
            return false
        }
    }
    // Check for injection attempts
    const forbiddenChars = /[<>'"\/\\;]/ // Regex for forbidden characters
    if (forbiddenChars.test(value)) {
        afficherMessage("Input contains forbidden characters.", "error")
        return false
    }
    return true
}

// Update the UI based on user authentication state
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
        ShowFilesList()
    } else {
        // No user logged in
        signinSection.classList.remove("hidden")
        logoutButton.classList.add("hidden")
        fileDropSection.classList.add("hidden")
        fileSection.classList.add("hidden")
    }
}

async function getSignedUrl(filePath) {
    const { data, error } = await client
        .storage
        .from('docBucket')
        .createSignedUrl(filePath, 60 * 60) // URL expires in 1 hour

    if (error) {
        afficherMessage(`Error generating signed URL: ${error.message}`, "error")
        return null
    }
    return data.signedUrl
}

// Function to display the list of files uploaded by the user
async function ShowFilesList(){
    await client
        .from('docs')
        .select('*')
        .eq('user_id', user.id)
        .then(async ({ data, error }) => {
            if (error) {
                afficherMessage(`Error fetching files: ${error.message}`, "error")
                return
            }
            const fileList = document.getElementById("files-list")
            fileList.innerHTML = "" // Clear existing list
            
            await Promise.all(data.map(async file => {
                const signedUrl = await getSignedUrl(file.url)
                const listItem = document.createElement("li")
                listItem.innerHTML = `<a target="_blank" rel="noopener noreferrer" href="${signedUrl}">${file.filename}</a>`
                fileList.appendChild(listItem)
            }))
        })
}

// Event listeners for form account creation (automaticaly login if registration is successfull)
document.getElementById("signup-form").addEventListener("submit", async (e) => {
    e.preventDefault()

    const email = document.getElementById("email").value
    const password = document.getElementById("password").value

    // Validate inputs
    if (checkInputValidity(email,"email") && checkInputValidity(password,"text")){
        const { data: signupData, error: signupError } = await client.auth.signUp({
            email,
            password,
        })

        if (signupError) {
            // If there's an error during signup, display it then return
            afficherMessage(`Sign up error: ${signupError.message}`, "error")
            return
        }
        // If signup is successful, display success message
        afficherMessage("Succesfull registeration, check your emails to activate your account.", "success")
    }
})

// Event listener for form login
document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault()

    const email = document.getElementById("login-email").value
    const password = document.getElementById("login-password").value

    // Validate inputs
    if (checkInputValidity(email,"email") && checkInputValidity(password,"text")){
        const { data: loginData, error: loginError } = await client.auth.signInWithPassword({
            email,
            password,
        })

        if (loginError) {
            // If there's an error during login, display it then return
            afficherMessage(`Login error: ${loginError.message}`, "error")
            return
        }
        // If login is successful, set the user object and update the UI
        user = loginData.user
        afficherMessage("Connection successfull!", "success")
        updateUI()
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

    for (const file of files) {
        const filePath = `${user.id}/${file.name}` // Define the storage path
        console.log(file)
        // Upload the file to Supabase Storage
        const { data, error } = await client.storage
            .from('docBucket')
            .upload(filePath, file)

        if (error) {
            afficherMessage(`Error uploading ${file.name}: ${error.message}`, "error")
            console.error(`Error uploading ${file.name}: ${error.message}`, "error")
        } else {
            afficherMessage(`File ${file.name} uploaded successfully!`, "success")
            // Add file metadata to the 'docs' table
            const { data: dbData, error: dbError } = await client
                .from('docs')
                .insert([
                    { user_id: user.id, filename: file.name, url: filePath }
                ])

            if (dbError) {
                afficherMessage(`Error saving metadata for ${file.name}: ${dbError.message}`, "error")
            }else{
                afficherMessage(`Metadata for ${file.name} saved successfully!`, "success")
            }
        }
    }
    ShowFilesList()
})

// Prevent default behavior for dragover event
document.getElementById("dropzone").addEventListener("dragover", (e) => {
    e.preventDefault()
})

// Event listener of the Logout button (section user-info)
document.getElementById("logout-button").addEventListener("click", async () => {
    await client.auth.signOut() // Log out the user form supabase
    user = null // Clear the user object
    afficherMessage("Logged out successfully", "success")
    updateUI()
})