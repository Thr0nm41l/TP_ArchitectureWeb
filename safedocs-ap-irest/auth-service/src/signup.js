const { createClient } = require('@supabase/supabase-js')
const credentials = require('./safedocs-creds.json')
const { checkInputValidity } = require('./utils.js')

// Initialize the Supabase client
const supabase = createClient(credentials.url, credentials.api_key)

module.exports = (app) => {

    // Endpoint to handle user signup
    app.post('/signup', async (req, res) => {
        const { email, password } = req.body

        try {

            // Validate inputs
            if (!checkInputValidity(email,"email") || !checkInputValidity(password,"text")){
                res.status(400).json({ message: 'Invalid input' })
                return
            }

            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
            })
            if (error) {
                res.status(400).json({ message: error.message })
            } else {
                res.status(200).json({ user: data.user })
            }
        } catch (err) {
            res.status(500).json({ message: 'Internal server error' })
        }
    })
    console.log("Signup module loaded.")
}