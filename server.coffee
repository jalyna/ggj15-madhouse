# Load modules
fs             = require('fs')
yaml           = require('js-yaml')
_              = require('lodash')
express        = require('express')
app            = express()
http           = require('http').Server(app)
io             = require('socket.io')(http)
lessMiddleware = require('less-middleware')
S              = require('string')
request        = require('request')

# CONSTANTS
MAX_PLAYERS = 20
port = process.env.PORT || 8080

# INIT
user_counter     = 0
scene            = 'start'
scene_data       = {}
step_data        = {}
merged_step_data = {}
decision_data    = {}
decision_result  = null
step             = -1
time_left        = 10
in_decision      = false
current_duration = 0
already_voted    = []
failed_votes     = 0
preload_images   = []
preload_sounds   = []
played_scenes    = []
chat_messages    = []
names            = {}
name_list        = []
stop             = false

app.use lessMiddleware(__dirname + '/game_data')
app.use express.static(__dirname + '/game_data')

# LOAD SCENE

getPreloadData = (cb) ->
  fs.readdir "game_data/images/", (err, files) =>
    preload_images = _.filter files, (f) ->
      f != '.DS_Store'
    cb.call() if cb
getPreloadSounds = (cb) ->
  fs.readdir "game_data/music/", (err, files) =>
    preload_sounds = _.filter files, (f) ->
      f != '.DS_Store'
    cb.call() if cb
loadScene = (io, name, cb) ->
  try
    token = Math.random().toString(36).substring(7)
    request {'cache-control': 'no-cache', url:"https://raw.githubusercontent.com/jalyna/ggj15-madhouse/master/game_data/#{name}.yml?token=#{token}"}, (err, res, body) ->
      if !error && res.statusCode == 200
        scene_data = yaml.load(body)
        played_scenes.push(name)
        cb.call() if cb
      else
        endGame(io)
  catch error
    console.log("ERROR: #{error}")
    endGame(io)
    io.emit 'debug', error
loadStep = (io, cb) ->
  if scene_data['steps']?
    step_data = scene_data['steps'][step]
    cb.call() if cb
  else
    endGame(io)

loadDecision = (cb) ->
  decision_data = scene_data['decision']
  decision_data = _.reject(decision_data, 'hidden') unless decision_data == null
  cb.call() if cb
countDown = (io) ->
  if time_left <= 0
    console.log "RESULT", decision_result
    if decision_result == null
      if failed_votes == 3
        endGame(io)
        return
      time_left = 7
      countDown io
      failed_votes++
    else
      in_decision = false
      scene = getDecision()
      step = -1
      io.emit 'set_decision', scene
      setTimeout (->
        loadScene io, scene, ->
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
  results = []
  for k, v of decision_result
    if v == best
      results.push k

  hidden = _.filter(scene_data['decision'], 'hidden')
  if results.length > 1 && hidden.length > 0
    _.sample(_.map(hidden, 'scene'))
  else
    _.sample(results)
endGame = (io) ->
  io.emit 'game_end'
  setTimeout (->
    scene = 'start'
    step = -1
    step_data = {}
    merged_step_data = {}
    loadScene io, scene
    io.emit 'render_step', step_data
  ), 3000

nextStep = (io) ->
  return if stop
  return if in_decision
  if current_duration > 0
    setTimeout (->
      current_duration--
      nextStep(io)
    ), 1000
    return
  console.log "NEXT"
  step++

  if scene_data.fork
    scene = calcNextScene(io, scene_data.fork)
    step = -1
    console.log "FORK", scene
    loadScene io, scene, ->
      nextStep(io)
    return

  loadStep io, ->
    if step_data
      current_duration = step_data.duration || 1
      merged_step_data = _.merge(merged_step_data, step_data)
      io.emit 'render_step', step_data
      nextStep(io)
    else
      console.log "DECISION!!"
      loadDecision ->
        if decision_data && decision_data.length > 0
          decision_result = null
          already_voted = []
          time_left = 7
          in_decision = true
          io.emit 'render_decision', decision_data
          countDown io
        else
          endGame(io)

calcNextScene = (io, fork) ->
  for branch in fork
    return branch.scene unless branch.condition
    if _.contains(played_scenes, branch.condition)
      return branch.scene

setName = (id) ->
  names[id] = _.sample(_.difference(name_list, _.values(names)))

removeName = (id) ->
  delete names[id]


loadScene null, scene
getPreloadData()
getPreloadSounds()
fs.readFile "game_data/names.yml", "utf-8", (err, data) =>
  name_list = yaml.load(data)

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
    played_scenes = []
    nextStep(io)

  socket.on 'stop', ->
    stop = true
    time_left = 7
    in_decision = false
    io.emit 'stopped'

  socket.on 'reload', ->
    stop = false
    step = -1
    loadScene io, scene, ->
      nextStep(io)

  socket.on 'message', (message) ->
    message = S(message).stripTags().s
    msg = { message: message, author: names[socket.id] }
    chat_messages.push(msg)
    chat_messages.unshift() if chat_messages.length >= 20
    io.emit 'add_message', msg

  console.log "a user connected whoop whoop #{user_counter}"
  setName(socket.id)
  user_counter++
  io.emit 'user_counter', user_counter
  socket.emit 'set_name', names[socket.id]
  socket.emit 'render_step', merged_step_data
  socket.emit 'preload_images', preload_images
  socket.emit 'preload_sounds', preload_sounds
  for msg in chat_messages
    socket.emit 'add_message', msg

http.listen port