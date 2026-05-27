// Import required modules
const express = require('express')
const body_parser = require('body-parser')
const cors = require('cors')

// Initialize Express app
const app = express()
const port = 3000

// Middleware to parse JSON bodies
app
.use(body_parser.json())
.use(cors())
.use(express.static('src/front'))

// Endpoint to serve the main page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/src/front/index.html')
})

// Handle 404 errors
app.use(({res}) => {
    res.status(404).send("Sorry, that route doesn't exist.")
})

// Start the server
app.listen(port, () => {
    console.log(`SafeDocs Gateway listening at http://localhost:${port}`)
})