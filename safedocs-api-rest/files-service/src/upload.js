const { checkInputValidity, createAuthClient, getAuthToken } = require('./utils.js')
const multer = require('multer')
const upload = multer()

module.exports = (app) => {

    // Endpoint to upload files
    app.post('/upload', upload.single('file'), async (req, res) => {
        const authToken = getAuthToken(req)
        if (!authToken) {
            return res.status(401).json({ message: 'Authentication required' })
        }
        if (!req.file) {
            return res.status(400).json({ message: 'File is required' })
        }

        console.log('Received auth token:', authToken)
        
        try {
            // Create a new client with the auth token
            const client = createAuthClient(authToken)
            
            // Get the user's ID from the authenticated session
            const { data: { user }, error: userError } = await client.auth.getUser()
            if (userError) {
                console.error('Auth error:', userError)
                return res.status(401).json({ message: 'Invalid authentication token', details: userError.message })
            }
            if (!user) {
                return res.status(401).json({ message: 'No user found with this token' })
            }
        
            // Check filename validity
            if (!checkInputValidity(req.file.originalname, "text")) {
                return res.status(400).json({ message: 'Invalid filename' })
            }

            // Create file path
            const filePath = `${user.id}/${req.file.originalname}`
            console.log("User ID:", user.id)
            console.log("Uploading file to path:", filePath)
            console.log("File details:", {
                name: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype
            })
        
            // Upload the file using the authenticated client
            const { data, error } = await client.storage
                .from('docBucket')
                .upload(filePath, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: false
                })
            if (error) {
                res.status(500).json({ message: 'File upload failed', error: error.message })
            } else {
                // Add file metadata to the 'docs' table
                const { data: dbData, error: dbError } = await client
                    .from('docs')
                    .insert([
                        { user_id: req.body.userId, filename: req.file.originalname, url: filePath }
                    ])
                if (dbError) {
                    console.error('Database error:', dbError)
                    res.status(500).json({ message: 'Failed to save file metadata', error: dbError.message })
                } else {
                    res.status(200).json({ message: 'File metadata saved successfully', data: dbData })
                }
            }
        } catch (err) {
            console.error('Upload error:', err)
            res.status(500).json({ message: 'File upload failed', error: err.message })
        }
    })
    console.log("File upload module loaded.")
}

