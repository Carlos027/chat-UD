//logica por partedel servidor 
// Configuracion Basica del server express
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
server.listen(port, function () {
console.log('Servidor ejecutándose por el puerto:', port);
});
//Ruta
app.use(express.static(__dirname + '/public'));
// Sala de chat
// Nombres de usuario que están actualmente conectados al chat
var usernames = {};
var numUsers = 0;

io.on('connection', function (socket) {
  var addedUser = false;

  // Cuando el cliente emite 'new message', este escucha y ejecuta
  socket.on('new message', function (data) {
    // Le decimos al cliente que ejecute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  //Funcion que valida si el nombre del usuario existe o no
  socket.on('exists user', function (username, cb){
    if( usernames.hasOwnProperty(username) )
    {
      console.log('El usuario '+username+' ya existe');
      cb(false);
    }
    else
    {
      console.log('Se ha unido el usuario '+username);
      cb(true);
    }
  });
  // Cuando el cliente emite 'add user', este escucha y ejecuta
  socket.on('add user', function (username) {
    // Almacenamos el nombre de usuario en el socket para la sesión de este cliente
    socket.username = username;
    // agrega el nombre de usuario del cliente a la lista global
    usernames[username] = username;
    ///////////////////////////////inicion////////////////////////
    socket.broadcast.emit('usuarios', {
      usernames
    });
    /////////////////////////////////fin//////////////////////////
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (todos los clientes) que una persona ha conectado
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // Cuando el cliente emite 'typing', lo transmitimos a otros
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // Cuando el cliente emite 'stop typing', lo transmitimos a otros
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // Cuando el usuario se desconecta .. se realiza esto
  socket.on('disconnect', function () {
    // Se elimina el nombre del usuario de la lista global de nombres de usuario
    if (addedUser) {
      delete usernames[socket.username];
      --numUsers;

      // echo globally que este cliente se ha ido
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
