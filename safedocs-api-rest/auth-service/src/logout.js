const { createAuthClient, getAuthToken } = require('./utils.js')

module.exports = (app) => {

    // Endpoint to handle user logout
    app.post('/logout', async (req, res) => {
        const authToken = getAuthToken(req)
        if (!authToken) {
            return res.status(401).json({ message: 'Authentication required' })
        }

        try {
            const client = createAuthClient(authToken)
            const { error } = await client.auth.signOut()
            if (error) throw error
            res.status(200).json({ message: 'Logged out successfully' })
        } catch (err) {
            console.error('Logout error:', err)
            res.status(500).json({ message: 'Internal server error', details: err.message })
        }
    })
    console.log("Logout module loaded.")
}