# Load modules
fs             = require('fs')
yaml           = require('js-yaml')
_              = require('lodash')
express        = require('express')
app            = express()
http           = require('http').Server(app)
io             = require('socket.io')(http)
lessMiddleware = require('less-middleware')

# CONSTANTS
MAX_PLAYERS = 20
port = process.env.PORT || 8080

# INIT
user_counter     = 0
scene            = 'start'
scene_data       = {}
step_data        = {}
decision_data    = {}
decision_result  = null
step             = -1
time_left        = 10
in_decision      = false
current_duration = 0
already_voted    = []
failed_votes     = 0

app.use lessMiddleware(__dirname + '/game_data')
app.use express.static(__dirname + '/game_data')

# LOAD SCENE

loadScene = (name, cb) ->
  fs.readFile "game_data/#{name}.yml", "utf-8", (err, data) =>
    scene_data = yaml.load(data)
    cb.call() if cb
loadStep = (cb) ->
  step_data = scene_data['steps'][step]
  cb.call() if cb
loadDecision = (cb) ->
  decision_data = scene_data['decision']
  cb.call() if cb
countDown = (io) ->
  if time_left <= 0
    console.log "RESULT", decision_result
    if decision_result == null
      if failed_votes == 3
        endGame(io)
        return
      time_left = 11
      countDown io
      failed_votes++
    else
      in_decision = false
      scene = getDecision()
      step = -1
      io.emit 'set_decision', scene
      setTimeout (->
        loadScene scene, ->
          nextStep(io)
      ), 1000
  else
    time_left--
    io.emit 'update_time_left', time_left
    setTimeout (->
      countDown(io)
    ), 1000
getDecision = ->
  values = _.values(decision_result)
  best = _.max(values)
  for k, v of decision_result
    if v == best
      return k
endGame = (io) ->
  io.emit 'game_end'
  setTimeout (->
    scene = 'start'
    step = -1
    step_data = {}
    loadScene scene
    io.emit 'render_step', step_data
  ), 3000

nextStep = (io) ->
  return if in_decision
  if current_duration > 0
    setTimeout (->
      current_duration--
      nextStep(io)
    ), 1000
    return
  console.log "NEXT"
  step++
  loadStep ->
    if step_data
      current_duration = step_data.duration || 1
      io.emit 'render_step', step_data
      nextStep(io)
    else
      console.log "DECISION!!"
      loadDecision ->
        if decision_data
          decision_result = null
          already_voted = []
          time_left = 11
          in_decision = true
          io.emit 'render_decision', decision_data
          countDown io
        else
          endGame(io)


loadScene scene

# INDEX
app.get '/', (req, res) ->
  res.sendFile(__dirname + '/index.html')

# SOCKET
io.on 'connection', (socket) ->
  # TOO MANY PLAYERS
  if user_counter >= MAX_PLAYERS
    socket.emit 'max_players_reached'
    socket.disconnect()
    return

  socket.on 'disconnect', ->
    user_counter--
    io.emit 'user_counter', user_counter

  socket.on 'choose_option', (option) ->
    return unless in_decision
    # One vote per user
    return if _.contains(already_voted, socket.id)
    # Only valid options
    return unless _.some(decision_data, scene: option)
    console.log "OPTION", option
    decision_result ?= {}
    decision_result[option] ?= 0
    decision_result[option]++
    already_voted.push(socket.id)

  socket.on 'start', ->
    return unless step == -1
    failed_votes = 0
    nextStep(io)

  console.log "a user connected whoop whoop #{user_counter}"
  user_counter++
  io.emit 'user_counter', user_counter
  socket.emit 'render_step', step_data

http.listen port