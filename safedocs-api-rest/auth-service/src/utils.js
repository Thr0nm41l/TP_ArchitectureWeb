const { createClient } = require('@supabase/supabase-js')
const safedocsJSON = require('./safedocs-creds.json')

// Initialize the base Supabase client
const createBaseClient = () => {
    return createClient(safedocsJSON.url, safedocsJSON.api_key)
}

// Create an authenticated client with JWT
const createAuthClient = (jwt) => {
    return createClient(safedocsJSON.url, safedocsJSON.api_key, {
        global: {
            headers: {
                Authorization: `Bearer ${jwt}`
            }
        }
    })
}

// Extract JWT from authorization header
const getAuthToken = (req) => {
    const authHeader = req.headers.authorization
    if (!authHeader) return null
    return authHeader.replace('Bearer ', '')
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

module.exports = {
    createBaseClient,
    createAuthClient,
    getAuthToken,
    checkInputValidity
}