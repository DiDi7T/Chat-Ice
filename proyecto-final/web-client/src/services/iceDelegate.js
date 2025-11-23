class IceDelegate {
  constructor() {
    this.communicator = null;
    this.chatService = null;
    this.callbackAdapter = null;
    this.username = null;
    this.callbacks = {};
  }

  async init(username, callbacks) {
    if (this.communicator) {
      await this.disconnect();
    }

    this.username = username;
    this.callbacks = callbacks || {};

    console.log('[IceDelegate] Inicializando');

    // Inicializar Ice
    this.communicator = Ice.initialize();
    console.log('[IceDelegate] Communicator creado');

    // Crear proxy al servicio con el endpoint (mismo que en Server.java)
    const proxy = this.communicator.stringToProxy(
      'ChatService:ws -h localhost -p 9099'
    );

    this.chatService = await Chat.ChatServicePrx.checkedCast(proxy);
    if (!this.chatService) {
      throw new Error('No se pudo conectar al servicio Ice');
    }
    console.log('[IceDelegate] Servicio conectado');

    // ================== CALLBACK ==================
    // Servant que implementa la interfaz ChatCallback (¡ahora extiende!)
    const CallbackImpl = class extends Chat.ChatCallback {
      constructor(delegate) {
        super(); // IMPORTANTE para que Ice reconozca el tipo
        this.delegate = delegate;
      }

      onMessageReceived(msg /*, current*/) {
        console.log('[IceDelegate] onMessageReceived', msg);
        this.delegate.callbacks.onMessageReceived &&
          this.delegate.callbacks.onMessageReceived(msg);
      }

      onUserJoined(username /*, current*/) {
        this.delegate.callbacks.onUserJoined &&
          this.delegate.callbacks.onUserJoined(username);
      }

      onUserLeft(username /*, current*/) {
        this.delegate.callbacks.onUserLeft &&
          this.delegate.callbacks.onUserLeft(username);
      }

      onGroupCreated(groupName, creator /*, current*/) {
        this.delegate.callbacks.onGroupCreated &&
          this.delegate.callbacks.onGroupCreated(groupName, creator);
      }

      onAudioReceived(from, audioData, audioId /*, current*/) {
        this.delegate.callbacks.onAudioReceived &&
          this.delegate.callbacks.onAudioReceived(from, audioData, audioId);
      }

      onCallRequest(from, callId /*, current*/) {
        this.delegate.callbacks.onCallRequest &&
          this.delegate.callbacks.onCallRequest(from, callId);
      }

      onCallAccepted(from, callId /*, current*/) {
        this.delegate.callbacks.onCallAccepted &&
          this.delegate.callbacks.onCallAccepted(from, callId);
      }

      onCallRejected(from /*, current*/) {
        this.delegate.callbacks.onCallRejected &&
          this.delegate.callbacks.onCallRejected(from);
      }

      onCallEnded(from /*, current*/) {
        this.delegate.callbacks.onCallEnded &&
          this.delegate.callbacks.onCallEnded(from);
      }

      onGroupCallRequest(from, groupName, callId /*, current*/) {
        this.delegate.callbacks.onGroupCallRequest &&
          this.delegate.callbacks.onGroupCallRequest(
            from,
            groupName,
            callId
          );
      }

      onGroupCallStarted(groupName, callId /*, current*/) {
        this.delegate.callbacks.onGroupCallStarted &&
          this.delegate.callbacks.onGroupCallStarted(groupName, callId);
      }

      onGroupCallEnded(groupName /*, current*/) {
        this.delegate.callbacks.onGroupCallEnded &&
          this.delegate.callbacks.onGroupCallEnded(groupName);
      }

      onCallAudioStream(from, audioChunk /*, current*/) {
        this.delegate.callbacks.onCallAudioStream &&
          this.delegate.callbacks.onCallAudioStream(from, audioChunk);
      }
    };

    // ================== ADAPTER BIDIRECCIONAL ==================

    // 1) Adapter para callbacks
    this.callbackAdapter = await this.communicator.createObjectAdapter('');
    console.log('[IceDelegate] Adapter creado');

    // 2) Asociar adapter a la MISMA conexión WS que usa el proxy
    const connection = await this.chatService.ice_getConnection();
    await connection.setAdapter(this.callbackAdapter);
    console.log('[IceDelegate] Adapter asociado a la conexión WebSocket');

    // 3) Registrar servant del callback
    const callbackImpl = new CallbackImpl(this);
    const identity = Ice.stringToIdentity(Ice.generateUUID());
    const callbackPrxBase = this.callbackAdapter.add(callbackImpl, identity);
    console.log('[IceDelegate] Callback agregado, identity:', identity);

    await this.callbackAdapter.activate();
    console.log('[IceDelegate] Adapter ACTIVADO');

    const callbackPrx = Chat.ChatCallbackPrx.uncheckedCast(callbackPrxBase);

    // 4) Registrar usuario con ese callback
    console.log(
      '[IceDelegate] Intentando registrar usuario con callbackPrx:',
      callbackPrx
    );

    const registered = await this.chatService.registerUser(
      username,
      callbackPrx
    );

    console.log('[IceDelegate] Resultado del registro:', registered);
    if (!registered) {
      throw new Error(
        'No se pudo registrar el usuario (posible nombre duplicado)'
      );
    }

    console.log('Conectado y registrado:', username);
    return true;
  }

  async disconnect() {
    console.log('[IceDelegate] Desconectando...');

    try {
      if (this.chatService && this.username) {
        await this.chatService.unregisterUser(this.username);
      }
    } catch (e) {
      console.warn('[IceDelegate] Error al desregistrar usuario:', e);
    }

    try {
      if (this.callbackAdapter) {
        await this.callbackAdapter.destroy();
      }
    } catch (e) {
      console.warn('[IceDelegate] Error al destruir adapter:', e);
    }

    try {
      if (this.communicator) {
        await this.communicator.destroy();
      }
    } catch (e) {
      console.warn('[IceDelegate] Error al destruir communicator:', e);
    }

    this.communicator = null;
    this.chatService = null;
    this.callbackAdapter = null;
    this.username = null;

    console.log('[IceDelegate] Desconectado');
  }

  // ==================== MÉTODOS DEL SERVICIO ====================

  // Usuarios
  async listUsers() {
    return this.chatService.listUsers();
  }

  async listMyGroups() {
    return this.chatService.listMyGroups(this.username);
  }

  // Mensajes privados
  async sendPrivateMessage(to, content) {
    return this.chatService.sendPrivateMessage(this.username, to, content);
  }

  async getPrivateHistory(otherUser) {
    return this.chatService.getPrivateHistory(this.username, otherUser);
  }

  // Grupos
  async createGroup(groupName) {
    return this.chatService.createGroup(groupName, this.username);
  }

  async addUserToGroup(groupName, username) {
    return this.chatService.addUserToGroup(groupName, username);
  }

  async sendGroupMessage(groupName, content) {
    return this.chatService.sendGroupMessage(this.username, groupName, content);
  }

  async getGroupHistory(groupName) {
    return this.chatService.getGroupHistory(groupName);
  }

  // Audio
  async sendAudioMessage(to, audioData, audioId) {
    return this.chatService.sendAudioMessage(
      this.username,
      to,
      audioData,
      audioId
    );
  }

  async sendGroupAudioMessage(groupName, audioData, audioId) {
    return this.chatService.sendGroupAudioMessage(
      this.username,
      groupName,
      audioData,
      audioId
    );
  }

  // Llamadas individuales
  async initiateCall(to, callId) {
    return this.chatService.initiateCall(this.username, to, callId);
  }

  async acceptCall(from, callId) {
    return this.chatService.acceptCall(this.username, from, callId);
  }

  async rejectCall(from) {
    return this.chatService.rejectCall(this.username, from);
  }

  async endCall(to) {
    return this.chatService.endCall(this.username, to);
  }

  // Llamadas de grupo
  async initiateGroupCall(groupName, callId) {
    return this.chatService.initiateGroupCall(this.username, groupName, callId);
  }

  async joinGroupCall(groupName, callId) {
    return this.chatService.joinGroupCall(this.username, groupName, callId);
  }

  async leaveGroupCall(groupName, callId) {
    return this.chatService.leaveGroupCall(this.username, groupName, callId);
  }

  async endGroupCall(groupName, callId) {
    return this.chatService.endGroupCall(groupName, callId);
  }

  // Streaming de audio
  async streamCallAudio(to, audioChunk) {
    return this.chatService.streamCallAudio(this.username, to, audioChunk);
  }

  async streamGroupCallAudio(groupName, audioChunk) {
    return this.chatService.streamGroupCallAudio(
      this.username,
      groupName,
      audioChunk
    );
  }
}

// Singleton
const iceDelegate = new IceDelegate();
export default iceDelegate;
