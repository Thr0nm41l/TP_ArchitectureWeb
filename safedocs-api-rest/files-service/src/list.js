const { createAuthClient, getAuthToken } = require('./utils.js')

module.exports = (app) => {
    // Endpoint to list user files
    app.get('/files', async (req, res) => {
        const authToken = getAuthToken(req)
        if (!authToken) {
            return res.status(401).json({ message: 'Authentication required' })
        }

        try {
            const client = createAuthClient(authToken)
            
            // Get the user's ID from the authenticated session
            const { data: { user }, error: userError } = await client.auth.getUser()
            if (userError || !user) {
                console.error('Auth error:', userError)
                return res.status(401).json({ message: 'Invalid authentication token' })
            }

            // Fetch files from the docs table
            const { data: files, error: dbError } = await client
                .from('docs')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (dbError) {
                console.error('Database error:', dbError)
                return res.status(500).json({ message: 'Failed to fetch files', error: dbError.message })
            }

            // Get signed URLs for each file
            const filesWithUrls = await Promise.all(files.map(async (file) => {
                const { data: { signedUrl }, error: urlError } = await client.storage
                    .from('docBucket')
                    .createSignedUrl(file.url, 3600) // URL valide pendant 1 heure

                if (urlError) {
                    console.error('URL signing error:', urlError)
                    return {
                        ...file,
                        downloadUrl: null
                    }
                }

                return {
                    ...file,
                    downloadUrl: signedUrl
                }
            }))

            res.status(200).json({ files: filesWithUrls })
        } catch (err) {
            console.error('List files error:', err)
            res.status(500).json({ message: 'Failed to list files', error: err.message })
        }
    })
    console.log("File listing module loaded.")
}
