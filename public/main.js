//logica por tparte del cliente
$(function() {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#8b00f7', '#287b00', '#006cf7', '#880000',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Inicializacion de variables
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Entrada para nombre de usuario
  var $messages = $('.messages'); // Área de mensajes
  var $inputMessage = $('.inputMessage'); // Mensaje de entrada, cuadro de entrada
  var $loginPage = $('.login.page'); // La página de inicio de sesión
  var $chatPage = $('.chat.page'); // La página de la sala de chat
  ////////////////////INICIO////////////////////
  var $titleLogin = $('.title');
  ///////////////////  FIN  ///////////////////

  // Solicitud para configurar un nombre de usuario
  var username;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();
  var usuarios = [];
  var socket = io();

  function addParticipantsMessage (data) {
    var message = '';
    if (data.numUsers === 1) {
      message += " Hay 1 Usuario ";
    } else {
      message += " Hay " + data.numUsers + " Usuarios";
    }
    log(message);
  }

 // Establece el nombre de usuario del cliente
  function setUsername () {
    username = cleanInput($usernameInput.val().trim());
    // Si el nombre de usuario es válido
    usuarios = username;
    ////////////////////INICIO////////////////////
    if (username) {
      socket.emit('exists user', username, function (cbValue){
        if(cbValue)
        {
          $loginPage.fadeOut();
          $chatPage.show();
          $loginPage.off('click');
          $currentInput = $inputMessage.focus();

          // Dile al servidor tu nombre de usuario
          socket.emit('add user', username);
        }
        else
        {
          $titleLogin.html('El usuario "' + username + '" ya existe!');
          $usernameInput.val(null);
          username = null;
        }
      })
    }
    ///////////////////  FIN  ///////////////////
    
    /*
    Original Code
    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Dile al servidor tu nombre de usuario
      socket.emit('add user', username);
    }
    */
  }

  // Envía un mensaje de chat
  function sendMessage () {
    var message = $inputMessage.val();
    // Evita que el marcado se inyecte en el mensaje
    message = cleanInput(message);
    // Condicional si hay un mensaje no vacío y una conexión de socket
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message
      });
      // indica al servidor que ejecute 'new message' y envíe un parámetro
      socket.emit('new message', message);
    }
  }

  // Registrar un mensaje
  function log (message, options) {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  // Agrega el mensaje de chat a la lista de mensajes
  function addChatMessage (data, options) {
    
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }
    var $usernameDiv = $('<span class="username"/>')
      .text(data.username+":")
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv,$messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // Agrega el mensaje de 'esta escribiendo' en el chat
  function addChatTyping (data) {
    data.typing = true;
    data.message = 'esta escribiendo';
    addChatMessage(data);
  }

  // Elimina el mensaje de 'esta escribiendo'del chat
  function removeChatTyping (data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Agrega un elemento de mensaje a los mensajes y se desplaza hacia abajo
   // el - El elemento para agregar como mensaje
   // options.fade - Si el elemento se desvanece (por defecto = verdadero)
   // options.prepend - Si el elemento debe anteponer
   // todos los demás mensajes (predeterminado = falso)
  function addMessageElement (el, options) {
    var $el = $(el);

    // Configurar opciones predeterminadas
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Aplicar opciones
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }


  // Impide que la entrada tenga un marcado inyectado(codigo HTML)
  function cleanInput (input) {
    return $('<div/>').text(input).text();
  }

  // Actualiza el evento de escritura
  function updateTyping () {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Obtiene los mensajes 'X está escribiendo' de una usuaria
  function getTypingMessages (data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Obtiene el color de un nombre de usuario a través de nuestra función hash(color nombre usuario)
  function getUsernameColor (username) {
    // Calcular código hash
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calcular color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Eventos de teclado (NUEVO MUY PRO)

  $window.keydown(function (event) {
    // Autoenfoque la entrada actual cuando se escribe una tecla
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // Cuando el cliente presiona ENTER en su teclado
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', function() {
    updateTyping();
  });

  // Eventos de clic

   // Enfoque la entrada al hacer clic en cualquier lugar de la página de inicio de sesión
  $loginPage.click(function () {
    $currentInput.focus();
  });

  // Centrar la entrada al hacer clic en el borde de entrada del mensaje
  $inputMessage.click(function () {
    $inputMessage.focus();
  });

  // Eventos de socket

   // Siempre que el servidor emita 'login', registre el mensaje de inicio de sesión
  socket.on('login', function (data) {
    connected = true;
    // Mostrar el mensaje de bienvenida
    var message = "Bienvenido a UD-Book";
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });

  // Cada vez que el servidor emita 'new message', actualice el cuerpo del chat
  socket.on('new message', function (data) {
    addChatMessage(data);
  });

  // Siempre que el servidor emita 'user joined', ponerlo en el cuerpo del chat
  socket.on('user joined', function (data) {
    log(data.username + ' se ha unido');
    addParticipantsMessage(data);
  });

  // Siempre que el servidor emita 'user left', ponerlo en el cuerpo del chat
  socket.on('user left', function (data) {
    log(data.username + ' se ha salido');
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

 // Cada vez que el servidor emite 'typing', muestre el mensaje de escribiendo
  socket.on('typing', function (data) {
    addChatTyping(data);
  });

  //Cada vez que el servidor emita 'stop typing', elimine el mensaje de escritura
  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });


});

