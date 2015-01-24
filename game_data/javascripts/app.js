var socket = io();
var tick = new Audio('/music/timetick.ogg');
var choose = new Audio('/music/choose.ogg');
var chosen = new Audio('/music/chosen.ogg');
var send_message = new Audio('/music/send_message.wav');

$("#message").focus();

$('.textbox--chat').on('click', function() {
  if (window.innerWidth < 640) {
    $(this).toggleClass('is-open');
  }
});

$("#button").on("click", function(e) {
  e.preventDefault();
  socket.emit('start');
  $('.screen').removeClass('is-on');
  $('#background').addClass('is-on');
});

$("#chat-form").on("submit", function(e) {
  e.preventDefault();
  send_message.play();
  socket.emit('message', $("#message").val());
  $("#message").val("");
  $("#message").focus();
});

$(document).on('click', 'button[data-option]', function(e){
  option = $(e.currentTarget).data('option');
  console.log("YOU CHOOSE", option);
  choose.play()
  socket.emit('choose_option', option);
});

$(document).on('keypress', '#message, #chat-form', function(e){
  e.stopPropagation();
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

socket.on('add_message', function(msg){
  $("#messages").append('<p><strong>'+msg.author+':</strong> '+msg.message+'</p>');
  elem = $("#messages")[0];
  elem.scrollTop = elem.scrollHeight;
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
      $("#background").css("background-image", "url(images/" + data.background + ")");
    }
    if(data.character) {
      $("#character").hide().css("background-image", "url(images/" + data.character + ")");
      if(data.character_effect) {
        $("#character")[data.character_effect]();
      } else {
        $("#character").show()
      }
    }
    if(data.character_name) {
      $('#character_name').html(data.character_name);
    } 
    if(data.sound) {
      sound = new Audio('/music/' + data.sound);
      sound.play();
    }
  }
});

socket.on('game_end', function(){
  console.log("GAME END");
  $('.screen').removeClass('is-on');
  $('#start').addClass('is-on');
  $('#notice').html('YOU LOST!');
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
  $('#notice').html('We\'ve reached the maximum.<br>It\'s just too crowded here.');
});

socket.on('disconnect', function() {
  $('#notice').html('You\'ve lost connection ... to reality?! ');
  console.log("YOU WERE DISCONNECTED");
});

socket.on('set_name', function(name) {
  $("#name").html(name)
  console.log("YOU ARE "+name);
});

socket.on('set_decision', function(decision) {
  console.log("DESICION: " + decision);
  chosen.play();
  $('.decision').removeClass('is-on');
  $('.textbox--text:not(.decision)').removeClass('is-off');
});

socket.on('render_decision', function(data) {
  if(data) {
    console.log(data);
    $('.decision').addClass('is-on');
    $('.textbox--text:not(.decision)').addClass('is-off');
    $("#options").html('<ol class="decision-list"></ol>');
    for(var i = 0; i < data.length; i++) {
      opt = data[i]
      $("#options ol").append('<li><button data-option="'+opt.scene+'" class="button"><span class="number">'+(i+1)+'</span> '+opt.label+'</button></li>');
    }
  }
});