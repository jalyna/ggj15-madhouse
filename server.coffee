fs = require('fs')

handler = (req, res) ->
  fs.readFile __dirname + "/index.html", (err, data) ->
    if err
      res.writeHead 500
      return res.end("Error loading index.html")
    res.writeHead 200
    res.end data

# Load modules
app           = require("http").createServer(handler)
#controllers   = require('./controllers/index.js.coffee')
#auth          = require('./auth.js.coffee')

app.listen 8080

#controllers.set(io, rc)