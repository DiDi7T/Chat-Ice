import '../index.css';
import iceDelegate from './services/iceDelegate.js';
import audioWebSocket from './services/audioWebSocket.js';

// ==================== ESTADO GLOBAL ====================

const state = {
  currentUser: null,
  activeChat: null, 
  users: [],
  groups: [],
  myGroups: new Set(),
  messages: {},
  callState: {
    isInCall: false,
    callId: null,
    withUser: null,
    callType: null
  }
};

// ==================== AUDIO STREAMING CON WEB AUDIO API ====================

let localStream = null;
let audioContext = null;
let audioProcessor = null;
let isStreaming = false;

// Para reproducción
let playbackContext = null;
let nextPlaybackTime = 0;

async function startAudioStream() {
  if (isStreaming) {
    console.log(" Stream ya está activo");
    return;
  }

  try {
    console.log("Solicitando acceso al micrófono...");
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true
      }
    });

    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000
    });

    const source = audioContext.createMediaStreamSource(localStream);
    
    const bufferSize = 4096;
    audioProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);

    audioProcessor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmData = float32ToInt16(inputData);
      
      // Enviar por WebSocket
      audioWebSocket.sendAudio(pcmData);
    };

    source.connect(audioProcessor);
    audioProcessor.connect(audioContext.destination);

    isStreaming = true;
    console.log(" STREAM PCM INICIADO");

  } catch (err) {
    console.error("Error iniciando stream:", err);
    alert("No se pudo acceder al micrófono. Verifica los permisos.");
  }
}

function stopAudioStream() {
  if (audioProcessor) {
    audioProcessor.disconnect();
    audioProcessor = null;
  }
  
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }

  isStreaming = false;
  console.log("STREAM DETENIDO");
}

function float32ToInt16(float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return new Uint8Array(int16Array.buffer);
}

function playPCMAudio(pcmData) {
  try {
    if (!playbackContext) {
      playbackContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });
      nextPlaybackTime = playbackContext.currentTime;
    }

    const int16Array = new Int16Array(pcmData.buffer);
    const float32Array = new Float32Array(int16Array.length);
    
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF);
    }

    const audioBuffer = playbackContext.createBuffer(1, float32Array.length, 16000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = playbackContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(playbackContext.destination);

    if (nextPlaybackTime < playbackContext.currentTime) {
      nextPlaybackTime = playbackContext.currentTime;
    }

    source.start(nextPlaybackTime);
    nextPlaybackTime += audioBuffer.duration;

  } catch (error) {
    console.error(" Error reproduciendo PCM:", error);
  }
}




// ==================== FUNCIONES DE LLAMADA ====================

window.initiateCall = async function() {
  if (!state.activeChat || state.activeChat.type !== "user") {
    alert("Selecciona un usuario para llamar.");
    return;
  }

  if (state.callState.isInCall) {
    alert("Ya estás en una llamada.");
    return;
  }

  const targetUser = state.activeChat.name;
  const callId = `call_${state.currentUser}_to_${targetUser}_${Date.now()}`;

  console.log(" Iniciando llamada a:", targetUser);

  try {
    state.callState = {
      isInCall: true,
      callId: callId,
      withUser: targetUser,
      callType: 'individual'
    };
    updateCallControls();

    // Señalización por Ice
    await iceDelegate.initiateCall(targetUser, callId);
    
    // Señalización por WebSocket
    audioWebSocket.startCall(callId, targetUser);
    
    // Iniciar audio
    setTimeout(() => startAudioStream(), 1000);

  } catch (err) {
    console.error(" Error iniciando llamada:", err);
    state.callState.isInCall = false;
    updateCallControls();
  }
};

window.endCurrentCall = async function() {
  if (!state.callState.isInCall) return;

  const { callType, withUser, withGroup, callId } = state.callState;
  console.log(" Finalizando llamada...");

  try {
    if (callType === 'individual' && withUser) {
      await iceDelegate.endCall(withUser);
      audioWebSocket.endCall(callId);
    } else if (callType === 'group' && withGroup) {
      // ← AGREGAR ESTO
      audioWebSocket.leaveGroupCall(callId, withGroup);
    }
  } catch (err) {
    console.error(' Error al colgar:', err);
  }

  stopAudioStream();

  if (playbackContext) {
    playbackContext.close();
    playbackContext = null;
    nextPlaybackTime = 0;
  }

  state.callState.isInCall = false;
  state.callState.withGroup = null;  // ← AGREGAR
  updateCallControls();
  console.log("Llamada finalizada");
};


function handleCallRequest(from, callId) {
  console.log("📞 Llamada entrante de:", from);

  if (state.callState.isInCall) {
    iceDelegate.rejectCall(from).catch(console.error);
    alert(`Ya estás en una llamada. Llamada de ${from} rechazada.`);
    return;
  }

  const accept = confirm(`📞 ${from} te está llamando\n\n¿Aceptar?`);

  if (accept) {
    state.callState = {
      isInCall: true,
      callId: callId,
      withUser: from,
      callType: 'individual'
    };
    updateCallControls();

    iceDelegate.acceptCall(from, callId)
      .then(() => {
        console.log(" Llamada aceptada");
        audioWebSocket.joinCall(callId);
        setTimeout(() => startAudioStream(), 1000);
      })
      .catch(err => {
        console.error("Error aceptando llamada:", err);
        state.callState.isInCall = false;
        updateCallControls();
      });
  } else {
    iceDelegate.rejectCall(from).catch(console.error);
  }
}

function handleCallAccepted(from, callId) {
  console.log("Llamada aceptada por:", from);
  
  if (!isStreaming && state.callState.isInCall) {
    setTimeout(() => startAudioStream(), 500);
  }
}

function handleCallEnded(from) {
  console.log(" Llamada finalizada por:", from);
  
  if (state.callState.isInCall && state.callState.withUser === from) {
    alert(`📴 ${from} finalizó la llamada`);
    stopAudioStream();
    
    if (playbackContext) {
      playbackContext.close();
      playbackContext = null;
      nextPlaybackTime = 0;
    }
    
    state.callState.isInCall = false;
    updateCallControls();
  }
}
window.handleCallEndedFromWS = function() {
  console.log(" Llamada finalizada desde WebSocket");

  stopAudioStream();

  if (playbackContext) {
    playbackContext.close();
    playbackContext = null;
    nextPlaybackTime = 0;
  }

  state.callState.isInCall = false;
  updateCallControls();

  alert(" La llamada ha finalizado");
};

function handleCallRejected(from) {
  console.log(" Llamada rechazada por:", from);
  alert(`❌ ${from} rechazó la llamada`);
  state.callState.isInCall = false;
  updateCallControls();
}

function handleGroupCallRequest(from, groupName, callId) {
  console.log(" Llamadas grupales no implementadas");
}

function handleCallAudioStream(from, audioChunk) {
  console.log(" Audio por Ice RPC deshabilitado - usar WebSocket");
}

function updateCallControls() {
  const callControls = document.getElementById('callControls');
  const { isInCall, callType, withUser, withGroup } = state.callState;

  if (isInCall) {
    let statusText = '';
    if (callType === 'individual') {
      statusText = `En llamada con ${withUser}`;
    } else if (callType === 'group') {
      statusText = `En llamada grupal: ${withGroup}`;
    }

    callControls.innerHTML = `
      <div class="call-active">
        <span>📞 ${statusText}</span>
        <button onclick="endCurrentCall()" class="btn-end-call">
          📴 Colgar
        </button>
      </div>
    `;
    callControls.style.display = 'block';
  } else if (state.activeChat?.type === 'user') {
    callControls.innerHTML = `
      <button onclick="initiateCall()" class="btn-call">
        📞 Llamar
      </button>
    `;
    callControls.style.display = 'block';
  } else if (state.activeChat?.type === 'group') {
    // ← AGREGAR ESTO
    callControls.innerHTML = `
      <button onclick="initiateGroupCall()" class="btn-call">
        📞 Llamada Grupal
      </button>
    `;
    callControls.style.display = 'block';
  } else {
    callControls.style.display = 'none';
  }
}


// ==================== LLAMADAS GRUPALES ====================

window.initiateGroupCall = async function() {
  if (!state.activeChat || state.activeChat.type !== "group") {
    alert("Selecciona un grupo para llamar.");
    return;
  }

  if (state.callState.isInCall) {
    alert("Ya estás en una llamada.");
    return;
  }

  const groupName = state.activeChat.name;
  const callId = `gcall_${groupName}_${Date.now()}`;

  console.log(" Iniciando llamada grupal en:", groupName);

  try {
    state.callState = {
      isInCall: true,
      callId: callId,
      withGroup: groupName,
      callType: 'group'
    };
    updateCallControls();

    // Señalización por WebSocket
    audioWebSocket.startGroupCall(callId, groupName);

    alert(` Llamada grupal iniciada en ${groupName}`);

    // Iniciar audio
    setTimeout(() => startAudioStream(), 1000);

  } catch (err) {
    console.error(" Error iniciando llamada grupal:", err);
    state.callState.isInCall = false;
    updateCallControls();
  }
};

function handleGroupCallInvitation(from, groupName, callId) {
  console.log(" Invitación a llamada grupal:", groupName, "de:", from);

  if (state.callState.isInCall) {
    alert(`Ya estás en una llamada. Llamada grupal de ${groupName} ignorada.`);
    return;
  }

  const accept = confirm(` Llamada grupal en ${groupName}\nIniciada por: ${from}\n\n¿Unirte?`);

  if (accept) {
    state.callState = {
      isInCall: true,
      callId: callId,
      withGroup: groupName,
      callType: 'group'
    };
    updateCallControls();

    audioWebSocket.joinGroupCall(callId, groupName);

    alert(` Unido a llamada grupal: ${groupName}`);
    setTimeout(() => startAudioStream(), 1000);
  }
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
    // Conectar Ice
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
    
    // Conectar WebSocket para audio
    audioWebSocket.connect(
      username,
      (audioData) => {
        console.log('🔊 Audio recibido por WebSocket');
        playPCMAudio(audioData);
      },
      (from, groupName, callId) => {
        handleGroupCallInvitation(from, groupName, callId);
      }
    );
    
    await loadUsers();
    await loadGroups();
    
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
  audioWebSocket.disconnect();
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
  if (state.myGroups.has(groupName)) {
    await selectChat('group', groupName);
    return;
  }

  const join = confirm(`¿Unirte al grupo "${groupName}"?`);
  if (!join) return;

  try {
    await iceDelegate.addUserToGroup(groupName, state.currentUser);
    state.myGroups.add(groupName);
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

  updateCallControls();
  
  document.getElementById('messagesContainer').innerHTML = '';
  
  try {
    let history;
    
    if (type === 'user') {
      history = await iceDelegate.getPrivateHistory(name);
    } else {
      history = await iceDelegate.getGroupHistory(name);
    }
    
    const cacheKey = `${type}:${name}`;
    state.messages[cacheKey] = history;
    
    history.forEach(msg => displayMessage(msg));
    
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
  
  container.scrollTop = container.scrollHeight;
}

// ==================== CALLBACKS DE ICE ====================

function handleMessageReceived(msg) {
  console.log('Mensaje recibido:', msg);
  
  if (state.activeChat) {
    const { type, name } = state.activeChat;
    
    const isRelevant = 
      (type === 'user' && msg.sender === name) ||
      (type === 'group' && msg.type === 'group');
    
    if (isRelevant) {
      displayMessage(msg);
    }
  }
  
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

  if (!state.groups.includes(groupName)) {
    state.groups.push(groupName);
  }
  
  if (creator === state.currentUser) {
    state.myGroups.add(groupName);
  }

  renderGroupsList();
}

function handleAudioReceived(from, audioData, audioId) {
  console.log('Nota de voz recibida de:', from);

  const mimeType = 'audio/webm';
  const blob = new Blob([audioData], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const msg = {
    sender: from,
    content: `🎤 Nota de voz [${audioId}]<br/><audio controls src="${url}"></audio>`,
    timestamp: new Date().toLocaleTimeString(),
    type: 'audio',
  };

  displayMessage(msg);
}

// ==================== GRUPOS ====================

window.showCreateGroup = function() {
  const groupName = prompt('Nombre del grupo:');
  
  if (!groupName) return;
  
  iceDelegate.createGroup(groupName)
    .then(() => {
      alert('✅ Grupo creado: ' + groupName);
      loadGroups();
    })
    .catch(err => {
      console.error('Error creando grupo:', err);
      alert('Error creando grupo');
    });
};

// ==================== AUDIO (NOTAS DE VOZ) ====================

window.recordAudio = async function() {
  if (!state.activeChat) {
    alert('Primero selecciona un chat');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    const mimeType = 'audio/webm';
    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());

      const blob = new Blob(chunks, { type: mimeType });
      const arrayBuffer = await blob.arrayBuffer();
      const audioData = new Uint8Array(arrayBuffer);
      const audioId = 'audio_' + Date.now();

      const { type, name } = state.activeChat;

      if (type === 'user') {
        await iceDelegate.sendAudioMessage(name, audioData, audioId);
      } else if (type === 'group') {
        await iceDelegate.sendGroupAudioMessage(name, audioData, audioId);
      }

      const msg = {
        sender: state.currentUser,
        content: `🎤 Nota de voz [${audioId}]`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'audio',
      };
      displayMessage(msg);
    };

    recorder.start();
    alert('🎙️ Grabando nota de voz por 5 segundos...');
    setTimeout(() => recorder.stop(), 5000);
  } catch (err) {
    console.error('Error grabando audio:', err);
    alert('No se pudo acceder al micrófono');
  }
};

// ==================== INICIALIZACIÓN ====================

console.log('✅ App cargada');

window.addEventListener("beforeunload", async () => {
  if (state.callState.isInCall) {
    await endCurrentCall();
  }
  await iceDelegate.disconnect();
  audioWebSocket.disconnect();
});
