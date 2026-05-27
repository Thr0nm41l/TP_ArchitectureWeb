console.log("auth-service Started !")

// Import required modules
const express = require('express')
const body_parser = require('body-parser')
const cors = require('cors')

// Initialize Express app
const app = express()
const port = 3001

// Middleware to parse JSON bodies
app
.use(body_parser.json())
.use(cors())

// Endpoint to sign up to SafeDocs
const signUpToSafeDocs = require('./src/signup.js')
signUpToSafeDocs(app)

// Endpoint to login to SafeDocs
const loginToSafeDocs = require('./src/login.js')
loginToSafeDocs(app)

// Endpoint to logout from SafeDocs
const logoutFromSafeDocs = require('./src/logout.js')
logoutFromSafeDocs(app)

// Endpoint to serve the main page
app.get('/', (req, res) => {
    res.status(200).send('Welcome to the SafeDocs Auth Service!')
})

// Handle 404 errors
app.use(({res}) => {
    res.status(404).send("Sorry, that route doesn't exist.")
})

// Start the server
app.listen(port, () => {
    console.log(`SafeDocs auth-service listening at http://localhost:${port}`)
})