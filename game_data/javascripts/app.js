var socket = io();

$("#button").on("click", function(e) {
  e.preventDefault();
  socket.emit('start');
});

$(document).on('click', '#options li', function(e){
  option = $(e.currentTarget).data('option');
  console.log("UHU", option);
  socket.emit('choose_option', option);
});

socket.on('user_counter', function(user_counter) {
  $("#user_counter").html(user_counter);
});

socket.on('update_time_left', function(time_left) {
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
  }
});

socket.on('game_end', function(){
  console.log("GAME END");
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
    $("#options").html('');
    for(var i = 0; i < data.length; i++) {
      opt = data[i]
      $("#options").append('<li data-option="'+opt.scene+'">'+opt.label+'</li>');
    }
  }
});