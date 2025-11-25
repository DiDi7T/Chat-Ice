class AudioWebSocket {
  constructor() {
    this.ws = null;
    this.username = null;
    this.onAudioReceived = null;
    this.onGroupCallInvitation = null;  // ← AGREGAR
  }

  connect(username, onAudioCallback, onGroupCallCallback) {  // ← MODIFICAR
    this.username = username;
    this.onAudioReceived = onAudioCallback;
    this.onGroupCallInvitation = onGroupCallCallback;  // ← AGREGAR

    this.ws = new WebSocket(`ws://localhost:9098/ws/audio/${username}`);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      console.log('🎙️ WebSocket de audio conectado');
    };

    this.ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        console.log('📩 Mensaje de control:', event.data);

        if (event.data.startsWith('CALL_ENDED')) {
          window.handleCallEndedFromWS?.();
        } else if (event.data.startsWith('GROUP_CALL_INVITATION')) {
          // ← AGREGAR ESTO
          // Formato: GROUP_CALL_INVITATION:callId:groupName:from
          const parts = event.data.split(':');
          if (parts.length >= 4) {
            const callId = parts[1];
            const groupName = parts[2];
            const from = parts[3];
            if (this.onGroupCallInvitation) {
              this.onGroupCallInvitation(from, groupName, callId);
            }
          }
        } else if (event.data.startsWith('GROUP_CALL_ENDED')) {
          // ← AGREGAR ESTO
          window.handleCallEndedFromWS?.();
        }
      } else {
        // Audio binario PCM
        const audioData = new Uint8Array(event.data);
        if (this.onAudioReceived) {
          this.onAudioReceived(audioData);
        }
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ Error en WebSocket:', error);
    };

    this.ws.onclose = () => {
      console.log('🔌 WebSocket desconectado');
    };
  }

  startCall(callId, targetUser) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(`START_CALL:${callId}:${targetUser}`);
      console.log('📤 Señal START_CALL enviada');
    }
  }

  joinCall(callId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(`JOIN_CALL:${callId}`);
    }
  }

  endCall(callId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(`END_CALL:${callId}`);
      console.log('📤 Señal END_CALL enviada');
    }
  }

  // ← AGREGAR MÉTODOS GRUPALES
  startGroupCall(callId, groupName) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(`START_GROUP_CALL:${callId}:${groupName}`);
      console.log('📤 Señal START_GROUP_CALL enviada');
    }
  }

  joinGroupCall(callId, groupName) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(`JOIN_GROUP_CALL:${callId}:${groupName}`);
      console.log('📤 Señal JOIN_GROUP_CALL enviada');
    }
  }

  leaveGroupCall(callId, groupName) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(`LEAVE_GROUP_CALL:${callId}:${groupName}`);
      console.log('📤 Señal LEAVE_GROUP_CALL enviada');
    }
  }

  sendAudio(audioData) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(audioData);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

const audioWebSocket = new AudioWebSocket();
export default audioWebSocket;
