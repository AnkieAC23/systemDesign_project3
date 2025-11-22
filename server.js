// All code generated with the help of GitHub Copilot. 
// Express is a framework for building APIs and web apps
// See also: https://expressjs.com/
import express from 'express'
// Initialize Express app
const app = express()

// Define root redirect to `home.html` before static middleware so '/' doesn't auto-serve index.html
app.get('/', (req, res) => { res.redirect('/home.html') })
// Serve static files from /public folder (useful when running Node locally, optional on Vercel).
app.use(express.static('public'))

// Enable express to parse JSON data (increase limit to allow image data URLs)
app.use(express.json({ limit: '12mb' }))
// Also allow large URL-encoded payloads if needed
app.use(express.urlencoded({ limit: '12mb', extended: true }))

// Our API is defined in a separate module to keep things tidy.
// Let's import our API endpoints and activate them.
import apiRoutes from './routes/api.js'
app.use('/', apiRoutes)


const port = 3001
app.listen(port, () => {
    console.log(`Express is live at http://localhost:${port}`)
})
// All code generated with the help of GitHub Copilot. 