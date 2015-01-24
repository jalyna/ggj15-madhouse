var socket = io();
var tick = new Audio('/music/timetick.ogg');

$('.textbox--chat').on('click', function() {
  console.log('sdifs');
  if (window.innerWidth < 640) {
    $(this).toggleClass('is-open');
  }
});

$("#button").on("click", function(e) {
  e.preventDefault();
  socket.emit('start');
});

$(document).on('click', 'button[data-option]', function(e){
  option = $(e.currentTarget).data('option');
  console.log("YOU CHOOSE", option);
  socket.emit('choose_option', option);
});

$(document).on('keypress', function(e){
  e.preventDefault();

  if(e.keyCode == 13 && $("#button").is(":visible")) {
    $("#button").click();
    return;
  }

  if($("#options").is(":hidden")) {
    return;
  }
  opt = e.keyCode - 49
  option = $("#options [data-option]:eq("+opt+")").click();
});

socket.on('user_counter', function(user_counter) {
  $("#user_counter").html(user_counter);
});

socket.on('update_time_left', function(time_left) {
  if(time_left <= 3) {
    tick.play();
  }
  $("#time_left").html(time_left);
});

socket.on('render_step', function(data) {
  if(data) {
    console.log(data);
    if(data.text) {
      $("#text").html("<span>" + data.text + "</span>");
      if(data.text_effect) {
        $("#text > span").textillate({ in: data.text_effect });
      }
    }
    if(data.background) {
      $("#background").css("background", "url(images/" + data.background + ")");
    }
    if(data.character) {
      $("#character").hide().css("background", "url(images/" + data.character + ")");
      if(data.character_effect) {
        $("#character")[data.character_effect]();
      } else {
        $("#character").show()
      }
    }
  }
});

socket.on('game_end', function(){
  console.log("GAME END");
});

var myimages = [];
var mysounds = [];

socket.on('preload_images', function(files) {
  console.log(files);
  for (i=0;i<files.length;i++){
    myimages[i] = new Image();
    myimages[i].src = "/images/" + files[i];
  }
});

socket.on('preload_sounds', function(files) {
  console.log(files);
  for (i=0;i<files.length;i++){
    mysounds[i] = new Audio();
    mysounds[i].src = "/music/" + files[i];
  }
});

socket.on('max_players_reached', function() {
  console.log("MAX PLAYERS");
});

socket.on('disconnect', function() {
  console.log("YOU WERE DISCONNECTED");
});

socket.on('set_decision', function(decision) {
  console.log("DESICION: " + decision);
});

socket.on('render_decision', function(data) {
  if(data) {
    console.log(data);
    $("#options").html('<ol class="decision-list list-inline row"></ol>');
    for(var i = 0; i < data.length; i++) {
      opt = data[i]
      $("#options ol").append('<li class="col-xs-6 col-sm-3"><button data-option="'+opt.scene+'" class="btn btn-default btn-block btn-lg"><span class="number">'+(i+1)+'</span> '+opt.label+'</button></li>');
    }
  }
});