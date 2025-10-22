const { createBaseClient,checkInputValidity } = require('./utils.js')

// Get base client for authentication
const client = createBaseClient()

module.exports = (app) => {

    // Endpoint to handle user login
    app.post('/login', async (req, res) => {
        const { email, password } = req.body

        try {

            // Validate inputs
            if (!checkInputValidity(email,"email") || !checkInputValidity(password,"text")){
                res.status(400).json({ message: 'Invalid input' })
                return
            }

            const { data, error } = await client.auth.signInWithPassword({
                email: email,
                password: password,
            })
            if (error) {
                res.status(401).json({ message: error.message })
            } else {
                // Envoyer à la fois les données utilisateur et le token de session
                res.status(200).json({ 
                    user: {
                        ...data.user,
                        access_token: data.session.access_token
                    }
                })
            }
        } catch (err) {
            res.status(500).json({ message: 'Internal server error' })
        }
    })
    console.log("Auth module loaded.")
}