var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var path = require('path');
var _ = require('underscore');
var port = process.env.PORT || 8080;

var five = require('johnny-five');

server.listen(port, function () {
  console.log('server listening on %s', port);
});

/**
 * Server
 */
app.use(express.static(path.join(__dirname, 'www')));

board = new five.Board();

board.on("ready", function() {
  var SPEED = 100;
  var led = new five.Led(13);
  led.on();
  var motors = new five.Motors([
    five.Motor.SHIELD_CONFIGS.POLOLU_DRV8835_SHIELD.M1,
    five.Motor.SHIELD_CONFIGS.POLOLU_DRV8835_SHIELD.M2,
  ]);

  var rightWheel = motors[0];
  var leftWheel = motors[1];

  io.sockets.on('connection', function (socket) {
    console.log('connection received: %s', socket.id);
    socket.on('speed', function (speed) {
      moveQueue.push('speed');
    });
    socket.on('led', function () {
      moveQueue.push('led');
    });
    socket.on('forward', function () {
      moveQueue.push('forward');
    });
    socket.on('backward', function () {
      moveQueue.push('backward');
    });
    socket.on('turn left', function () {
      moveQueue.push('turnLeft');
    });
    socket.on('turn right', function () {
      moveQueue.push('turnRight');
    });
    socket.on('stop', function () {
      moveQueue.push('stop');
    });
  });

  var moveQueue = {
    moves : [],
    commands: {
      speed : function (speed) {
        SPEED = speed;
      },
      led : function () {
        led.toggle();
      },
      forward : function () {
        motors.forward(SPEED);
      },
      backward : function () {
        motors.reverse(SPEED);
      },
      turnRight : function () {
        leftWheel.forward(SPEED);
        rightWheel.reverse(SPEED);
      },
      turnLeft : function () {
        leftWheel.reverse(SPEED);
        rightWheel.forward(SPEED);
      },
      stop : function () {
        motors.stop();
      }
    },
    init: function () {
      this.moves = [];
    },
    push : function (command) {
      var date = new Date()
      this.moves.push({command: command, date: date});
    },
    execute: function () {
      var obj = this.moves.pop();
      if (obj) {
        var command = obj.command;
        var date = obj.date;
        if (command) {
          console.log('executing %s from %s', command, date);
          (this.commands[command] || _.noop)();
        }
      }
    }
  }
  var executionInterval = 1;
  setInterval(_.bind(moveQueue.execute, moveQueue), executionInterval);
});

