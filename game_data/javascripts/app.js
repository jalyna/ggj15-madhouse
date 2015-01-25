var socket = io();
var tick = new Audio('/music/timetick.ogg');
var choose = new Audio('/music/choose.ogg');
var chosen = new Audio('/music/chosen.ogg');
var send_message = new Audio('/music/send_message.wav');
var title = new Audio('/music/title.ogg');

$("#message").focus();

$('.textbox--chat').on('click', function() {
  if (window.innerWidth < 640) {
    $(this).toggleClass('is-open');
  }
});

title.play();
var vol = 1;
var interval = 100; // 200ms interval

$("#button").on("click", function(e) {
  e.preventDefault();
  socket.emit('start');
  var fadeout = setInterval(
  function() {
    // Reduce volume by 0.05 as long as it is above 0
    // This works as long as you start with a multiple of 0.05!
    if (vol > 0.0) {
      vol -= 0.05;
      if(vol <= 0.0) {
        vol = 0.0;
      }
      title.volume = vol;
    }
    else {
      title.pause();
      // Stop the setInterval when 0 is reached
      clearInterval(fadeout);
    }
  }, interval);
  $('.screen').removeClass('is-on');
  $('#background').addClass('is-on');
});

$("#stop").on("click", function(e) {
  e.preventDefault();
  socket.emit('stop');
  $("#stop").hide();
  $("#reload").show();
});

$("#reload").on("click", function(e) {
  e.preventDefault();
  socket.emit('reload');
  $("#stop").show();
  $("#reload").hide();
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
  $("#init_user_counter").html(user_counter);
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
    if(data.text !== undefined) {
      $("#text").html("<span>" + data.text + "</span>");
      if(!data.text_type) {
        data.text_type = 'char';
      }
      if(!data.text_effect) {
        data.text_effect = { effect: 'flipInY' };
      }
      $("#text > span").textillate({ in: data.text_effect, minDisplayTime: data.text_time, out: data.text_effect_out, type: data.text_type });
    }
    if(data.background !== undefined) {
      $("#background").css("background-image", "url(images/" + data.background + ")");
    }
    if(data.character !== undefined) {
      if(data.character == "") {
        $("#character").hide().css("background-image", "none");
      } else {
        $("#character").hide().css("background-image", "url(images/" + data.character + ")");
      }
      if(data.character_effect) {
        $('#character').addClass(data.character_effect);
        // $("#character")[data.character_effect]();
      } else {
        $("#character").show();
      }
    }
    if(data.character_name !== undefined) {
      $('#character_name').html(data.character_name);
    } 
    if(data.sound !== undefined) {
      sound = new Audio('/music/' + data.sound);
      sound.play();
    }
  }
});

$(document).on('mousemove', function (event) {
  xp = (event.pageX - $(document).width()/2) / ($(document).width()/2) * 100;
  yp = (event.pageY - $(document).height()/2) / ($(document).width()/2) * 100;
  x = 50 - (xp / 3);
  y = 50 + (yp / 3);
  $("#background, #start").css("background-position", x+"% "+y+"%");
});

socket.on('game_end', function(){
  console.log("GAME END");
  title.play();
  $('#start').css('background-image', 'images/end.png');
  $('.screen').removeClass('is-on');
  $('#start').addClass('is-on');
  $('#notice').html('YOU LOST!');
  $('.decision').removeClass('is-on');
  $('.textbox--text:not(.decision)').removeClass('is-off');
});

socket.on('debug', function(message) {
  console.log('DEBUG: ' + message);
  $("#error").html(message);
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

socket.on('set_decision', function(decision, result) {
  console.log("DESICION: " + decision, result);
  $("#current_scene").html(decision);
  chosen.play();
  $('#text').empty();
  $("button[data-option="+decision+"]").addClass("chosen-decision");
  $("button[data-option]").each(function(index) {
    $el = $(this);
    opt = $el.data('option');
    var number = 0;
    if(result[opt]) {
      number = result[opt];
    }
    $el.append(' <span class="result">'+number+'</span>');
  });
  setTimeout(function() {
    $("button[data-option="+decision+"]").removeClass("chosen-decision");
    $('.decision').removeClass('is-on');
    $('.textbox--text:not(.decision)').removeClass('is-off');
  }, 1000);
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