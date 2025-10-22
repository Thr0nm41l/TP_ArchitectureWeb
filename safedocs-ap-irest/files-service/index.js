console.log("files-service Started !")

// Import required modules
const express = require('express')
const body_parser = require('body-parser')
const cors = require('cors')

// Initialize Express app
const app = express()
const port = 3002

// Middleware to parse JSON bodies
app
.use(body_parser.json())
.use(cors())

// Endpoint to handle file uploads
const fileUpload = require('./src/upload.js')
fileUpload(app)

// Endpoint to list user files
const listUserFiles = require('./src/list.js')
listUserFiles(app)


// Endpoint to serve the main page
app.get('/', (req, res) => {
    res.status(200).send('Welcome to the SafeDocs Files Service!')
})

// Handle 404 errors
app.use(({res}) => {
    res.status(404).send("Sorry, that route doesn't exist.")
})

// Start the server
app.listen(port, () => {
    console.log(`SafeDocs Client app listening at http://localhost:${port}`)
})