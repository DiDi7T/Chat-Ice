
import '../index.css';
import iceDelegate from './services/iceDelegate.js';

// ==================== ESTADO GLOBAL ====================

const state = {
  currentUser: null,
  activeChat: null, 
  users: [],
  groups: [],        // Grupos disponibles en general
  myGroups: new Set(), // Grupos de los que SOY miembro
  messages: {},
  inCall: false,
  currentCallId: null
};

// === AUDIO & LLAMADAS ===
let localStream = null;
let mediaRecorder = null;
let isStreaming = false;
const AUDIO_MIME_TYPE = "audio/webm;codecs=opus";



async function startAudioStream(toUser = null, toGroup = null) {
    if (isStreaming) return;
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(localStream, { mimeType: AUDIO_MIME_TYPE });

        mediaRecorder.ondataavailable = async (e) => {
            if (!e.data.size) return;

            const buf = new Uint8Array(await e.data.arrayBuffer());

            if (toUser) {
                await iceDelegate.streamCallAudio(toUser, buf);
            } else if (toGroup) {
                await iceDelegate.streamGroupCallAudio(toGroup, buf);
            }
        };

        mediaRecorder.start(250);  // enviamos audio cada 250ms
        isStreaming = true;
        console.log("🔊 STREAM STARTED");
    } catch (err) {
        console.error("Error iniciando stream:", err);
        alert("No se pudo acceder al micrófono.");
    }
}

function stopAudioStream() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    mediaRecorder = null;
    localStream = null;
    isStreaming = false;
    console.log("🔇 STREAM STOPPED");
}



// ==================== LOGIN ====================

window.login = async function() {
    const username = document.getElementById('usernameInput').value.trim();
    const statusEl = document.getElementById('loginStatus');
    
    if (!username) {
        statusEl.textContent = 'Ingresa un nombre';
        statusEl.style.background = '#ffebee';
        return;
    }
    
    statusEl.textContent = '⏳ Conectando...';
    statusEl.style.background = '#fff3e0';
    
    try {
        await iceDelegate.init(username, {
            onMessageReceived: handleMessageReceived,
            onUserJoined: handleUserJoined,
            onUserLeft: handleUserLeft,
            onGroupCreated: handleGroupCreated,
            onAudioReceived: handleAudioReceived,
            onCallRequest: handleCallRequest,
            onCallAccepted: handleCallAccepted,
            onCallRejected: handleCallRejected,
            onCallEnded: handleCallEnded,
            onGroupCallRequest: handleGroupCallRequest,
            onCallAudioStream: handleCallAudioStream
        });
        
        state.currentUser = username;
        
        // Cargar datos iniciales
        await loadUsers();
        await loadGroups();
        
        // Cambiar a página de chat
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('chatPage').style.display = 'grid';
        document.getElementById('currentUser').textContent = username;
        
    } catch (error) {
        statusEl.textContent = 'Error: ' + error.message;
        statusEl.style.background = '#ffebee';
        console.error(error);
    }
};

window.logout = async function() {
    await iceDelegate.disconnect();
    location.reload();
};

// ==================== CARGAR DATOS ====================

async function loadUsers() {
    try {
        const users = await iceDelegate.listUsers();
        state.users = users.filter(u => u !== state.currentUser);
        renderUsersList();
    } catch (error) {
        console.error('Error cargando usuarios:', error);
    }
}

async function loadGroups() {
  try {
    const myGroupsArr = await iceDelegate.listMyGroups();
    state.myGroups = new Set(myGroupsArr);

   
    const merged = new Set([...(state.groups || []), ...myGroupsArr]);
    state.groups = Array.from(merged);

    renderGroupsList();
  } catch (error) {
    console.error('Error cargando grupos:', error);
  }
}


// ==================== RENDER LISTAS ====================

function renderUsersList() {
    const ul = document.getElementById('usersList');
    ul.innerHTML = '';
    
    state.users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user;
        li.onclick = () => selectChat('user', user);
        
        if (state.activeChat?.type === 'user' && state.activeChat?.name === user) {
            li.classList.add('active');
        }
        
        ul.appendChild(li);
    });
}

function renderGroupsList() {
  const ul = document.getElementById('groupsList');
  ul.innerHTML = '';

  state.groups.forEach(group => {
    const li = document.createElement('li');
    li.textContent = group;

    if (!state.myGroups.has(group)) {
      li.classList.add('available-group'); 
    }

    li.onclick = () => handleGroupClick(group);

    if (state.activeChat?.type === 'group' && state.activeChat?.name === group) {
      li.classList.add('active');
    }

    ul.appendChild(li);
  });
}

async function handleGroupClick(groupName) {
  // Si ya soy miembro, simplemente abro el chat del grupo
  if (state.myGroups.has(groupName)) {
    await selectChat('group', groupName);
    return;
  }

  // Si NO soy miembro, pregunto si quiero unirme
  const join = confirm(
    `Este es el grupo "${groupName}"  ¿Quieres unirte?`
  );

  if (!join) return;

  try {
    await iceDelegate.addUserToGroup(groupName, state.currentUser);
    // Ahora paso a ser miembro
    state.myGroups.add(groupName);
    // Me aseguro de tener el grupo cargado y abro el chat
    await loadGroups();
    await selectChat('group', groupName);
  } catch (err) {
    console.error('Error uniéndose al grupo:', err);
    alert('Error al unirse al grupo');
  }
}


// ==================== SELECCIONAR CHAT ====================

async function selectChat(type, name) {
    state.activeChat = { type, name };
    
    document.getElementById('chatTitle').textContent = name;
    
    // Mostrar controles de llamada solo para usuarios
    const callControls = document.getElementById('callControls');
    callControls.style.display = type === 'user' ? 'block' : 'none';
    
    // Limpiar y cargar mensajes
    document.getElementById('messagesContainer').innerHTML = '';
    
    try {
        let history;
        
        if (type === 'user') {
            history = await iceDelegate.getPrivateHistory(name);
        } else {
            history = await iceDelegate.getGroupHistory(name);
        }
        
        // Guardar en cache
        const cacheKey = `${type}:${name}`;
        state.messages[cacheKey] = history;
        
        // Renderizar
        history.forEach(msg => {
            displayMessage(msg);
        });
        
    } catch (error) {
        console.error('Error cargando historial:', error);
    }
    
    renderUsersList();
    renderGroupsList();
}

// ==================== MENSAJES ====================

window.sendMessage = async function() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content || !state.activeChat) return;
    
    try {
        const { type, name } = state.activeChat;
        
        if (type === 'user') {
            await iceDelegate.sendPrivateMessage(name, content);
        } else {
            await iceDelegate.sendGroupMessage(name, content);
        }
        
        // Mostrar mensaje enviado (no esperar callback)
        const msg = {
            sender: state.currentUser,
            content: content,
            timestamp: new Date().toLocaleTimeString(),
            type: type
        };
        
        displayMessage(msg);
        input.value = '';
        
    } catch (error) {
        console.error('Error enviando mensaje:', error);
        alert('Error enviando mensaje');
    }
};

// Enter para enviar
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('messageInput');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                window.sendMessage();
            }
        });
    }
});

function displayMessage(msg) {
    const container = document.getElementById('messagesContainer');
    const div = document.createElement('div');
    
    const isSent = msg.sender === state.currentUser;
    div.className = `message ${isSent ? 'sent' : 'received'}`;
    
    let html = '';
    
    if (!isSent) {
        html += `<div class="message-header">${msg.sender}</div>`;
    }
    
    html += `<div class="message-content">${msg.content}</div>`;
    html += `<div class="message-time">${msg.timestamp}</div>`;
    
    div.innerHTML = html;
    container.appendChild(div);
    
    // Scroll al final
    container.scrollTop = container.scrollHeight;
}

// ==================== CALLBACKS DE ICE ====================

function handleMessageReceived(msg) {
    console.log('Mensaje recibido:', msg);
    
    // Si el mensaje es del chat activo, mostrarlo
    if (state.activeChat) {
        const { type, name } = state.activeChat;
        
        const isRelevant = 
            (type === 'user' && msg.sender === name) ||
            (type === 'group' && msg.type === 'group');
        
        if (isRelevant) {
            displayMessage(msg);
        }
    }
    
    // Notificación (opcional)
    if (msg.sender !== state.currentUser) {
        console.log('Alerta: Nuevo mensaje de:', msg.sender);
    }
}

function handleUserJoined(username) {
    console.log('Usuario conectado:', username);
    
    if (!state.users.includes(username)) {
        state.users.push(username);
        renderUsersList();
    }
}

function handleUserLeft(username) {
    console.log('Usuario desconectado:', username);
    
    state.users = state.users.filter(u => u !== username);
    renderUsersList();
}
function handleGroupCreated(groupName, creator) {
  console.log('Grupo creado:', groupName, 'por', creator);

  // Añadir el grupo a la lista de grupos disponibles si aún no está
  if (!state.groups.includes(groupName)) {
    state.groups.push(groupName);
  }

  
  if (creator === state.currentUser) {
    state.myGroups.add(groupName);
  }

  renderGroupsList();
}



function handleAudioReceived(from, audioData, audioId) {
  console.log('Audio recibido de:', from);

  // 1. Crear el blob a partir del Uint8Array que viene de Ice
  const blob = new Blob([audioData], { type: AUDIO_MIME_TYPE });
  const url = URL.createObjectURL(blob);

  // 2. Crear un mensaje visual con un <audio> embebido
  const msg = {
    sender: from,
    content: `
      Nota de voz [${audioId}]
      <br/>
      <audio controls src="${url}"></audio>
    `,
    timestamp: new Date().toLocaleTimeString(),
    type: 'audio',
  };

  displayMessage(msg);

  // 3. (Opcional) Autoplay
  // const audio = new Audio(url);
  // audio.play();
}


// ==================== LLAMADAS ====================

window.initiateCall = async function () {
    if (!state.activeChat || state.activeChat.type !== "user") {
        alert("Selecciona un usuario para llamar.");
        return;
    }

    const callee = state.activeChat.name;
    const callId = "call_" + Date.now();
    state.currentCallId = callId;

    try {
        await iceDelegate.initiateCall(callee, callId);
        state.inCall = true;
        alert("📞 Llamando a " + callee + "...");

        // Empezar a enviar audio desde YA
        startAudioStream(callee, null);
    } catch (err) {
        console.error(err);
        alert("Error al iniciar llamada.");
    }
};


function handleCallRequest(from, callId) {
    const accept = confirm(`📞 Llamada entrante de ${from}. ¿Aceptar?`);

    if (accept) {
        iceDelegate.acceptCall(from, callId)
            .then(() => {
                state.inCall = true;
                state.currentCallId = callId;

                startAudioStream(from, null);
                alert("Llamada conectada.");
            })
            .catch(err => console.error("Error al aceptar llamada", err));
    } else {
        iceDelegate.rejectCall(from);
    }
}


function handleCallAccepted(from, callId) {
    alert("✅ " + from + " aceptó la llamada.");
    state.inCall = true;

    // Por si acaso
    if (!isStreaming) startAudioStream(from, null);
}


function handleCallEnded(from) {
    alert("📴 Llamada finalizada.");
    stopAudioStream();
    state.inCall = false;
    state.currentCallId = null;
}

function handleCallRejected(from) {
    alert("❌ " + from + " rechazó la llamada.");
    stopAudioStream();
    state.inCall = false;
    state.currentCallId = null;
}

window.initiateGroupCall = async function () {
    if (!state.activeChat || state.activeChat.type !== "group") {
        alert("Selecciona un grupo para llamar.");
        return;
    }

    const group = state.activeChat.name;
    const callId = "gcall_" + Date.now();
    state.currentCallId = callId;

    try {
        await iceDelegate.initiateGroupCall(group, callId);
        alert("📞 Llamada grupal iniciada en " + group);

        startAudioStream(null, group);
    } catch (err) {
        console.error(err);
        alert("No se pudo iniciar la llamada de grupo.");
    }
};



function handleGroupCallRequest(from, groupName, callId) {
    const accept = confirm(`📢 Llamada grupal en ${groupName} iniciada por ${from}. ¿Unirte?`);

    if (accept) {
        iceDelegate.joinGroupCall(groupName, callId)
            .then(() => {
                alert("Conectado a llamada grupal.");
                startAudioStream(null, groupName);
            });
    } else {
        iceDelegate.leaveGroupCall(groupName, callId);
    }
}



function handleCallAudioStream(from, audioChunk) {
    const blob = new Blob([audioChunk], { type: AUDIO_MIME_TYPE });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play().catch((e) => console.warn("Error reproduciendo audio", e));
}



// ==================== GRUPOS ====================

window.showCreateGroup = function() {
    const groupName = prompt('Nombre del grupo:');
    
    if (!groupName) return;
    
    iceDelegate.createGroup(groupName)
        .then(() => {
            alert(' Grupo creado: ' + groupName);
            loadGroups();
        })
        .catch(err => {
            console.error('Error creando grupo:', err);
            alert('Error creando grupo');
        });
};

// ==================== AUDIO (NOTAS DE VOZ) ====================

window.recordAudio = async function () {
  if (!state.activeChat) {
    alert('Primero selecciona un chat (usuario o grupo)');
    return;
  }

  try {
    // 1. Pedir permiso al micro
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType: AUDIO_MIME_TYPE });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = async () => {
      // Detener pistas del micrófono
      stream.getTracks().forEach((t) => t.stop());

      // 2. Unir los chunks y convertir a Uint8Array para enviarlo por Ice
      const blob = new Blob(chunks, { type: AUDIO_MIME_TYPE });
      const arrayBuffer = await blob.arrayBuffer();
      const audioData = new Uint8Array(arrayBuffer);
      const audioId = 'audio_' + Date.now();

      // 3. Decidir si es privado o de grupo
      const { type, name } = state.activeChat;

      if (type === 'user') {
        await iceDelegate.sendAudioMessage(name, audioData, audioId);
      } else if (type === 'group') {
        await iceDelegate.sendGroupAudioMessage(name, audioData, audioId);
      }

      // 4. Mostrar en mi chat como “enviado”
      const msg = {
        sender: state.currentUser,
        content: ` Nota de voz [${audioId}]`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'audio',
      };
      displayMessage(msg);
    };

    // 4. Empezar la grabación por unos segundos (ej: 5 seg)
    recorder.start();
    alert('Grabando nota de voz por 5 segundos...');
    setTimeout(() => recorder.stop(), 5000);
  } catch (err) {
    console.error('Error grabando audio:', err);
    alert('No se pudo acceder al micrófono');
  }
};


// ==================== INICIALIZACIÓN ====================

console.log(' App cargada - Lista para conectar');
window.addEventListener("beforeunload", async () => {
  await iceDelegate.disconnect();
});