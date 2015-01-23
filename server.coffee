fs = require('fs')
yaml = require('js-yaml')

#handler = (req, res) ->
  # fs.readFile __dirname + "/index.html", (err, data) ->
  #   if err
  #     res.writeHead 500
  #     return res.end("Error loading index.html")
  #   res.writeHead 200


  #   fs.readFile "game_data/start.yml", "utf-8", (err, data) =>
  #     if (err) 
  #       console.log "Error: #{err}"
  #       return
  #     data = yaml.load(data)
  #     console.log(data)

  #   res.end data



# Load modules
app   = require('express')()
http  = require('http').Server(app)
io    = require('socket.io')(http)

# INIT
user_counter  = 0
scene         = 'start'
scene_data    = {}
step_data     = {}
step          = -1

# LOAD SCENE

loadScene = (name, cb) ->
  fs.readFile "game_data/#{name}.yml", "utf-8", (err, data) =>
    scene_data = yaml.load(data)
    cb.call()
loadStep = (cb) ->
  step_data = scene_data['steps'][step]
  cb.call()

# INDEX
app.get '/', (req, res) ->
  res.sendFile(__dirname + '/index.html')

# SOCKET
io.on 'connection', (socket) ->
  socket.on 'disconnect', ->
    user_counter--
    io.emit 'user_counter', user_counter

  socket.on 'next', ->
    console.log "NEXT"
    step++
    loadScene scene, ->
      loadStep ->
        io.emit 'render_step', step_data


  console.log "a user connected whoop whoop #{user_counter}"
  user_counter++
  io.emit 'user_counter', user_counter
  socket.emit 'render_step', step_data

http.listen 8080