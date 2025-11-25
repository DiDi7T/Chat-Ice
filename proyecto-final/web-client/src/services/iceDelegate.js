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

    this.communicator = Ice.initialize();
    console.log('[IceDelegate] Communicator creado');

    const proxy = this.communicator.stringToProxy(
      'ChatService:ws -h localhost -p 9099'
    );

    this.chatService = await Chat.ChatServicePrx.checkedCast(proxy);
    if (!this.chatService) {
      throw new Error('No se pudo conectar al servicio Ice');
    }
    console.log('[IceDelegate] Servicio conectado');

    // ================== CALLBACK (SOLO MENSAJES Y USUARIOS) ==================
    const CallbackImpl = class extends Chat.ChatCallback {
      constructor(delegate) {
        super();
        this.delegate = delegate;
      }

      onMessageReceived(msg) {
        this.delegate.callbacks.onMessageReceived?.(msg);
      }

      onUserJoined(username) {
        this.delegate.callbacks.onUserJoined?.(username);
      }

      onUserLeft(username) {
        this.delegate.callbacks.onUserLeft?.(username);
      }

      onGroupCreated(groupName, creator) {
        this.delegate.callbacks.onGroupCreated?.(groupName, creator);
      }

      onAudioReceived(from, audioData, audioId) {
        this.delegate.callbacks.onAudioReceived?.(from, audioData, audioId);
      }

      // Callbacks de llamadas (solo señalización)
      onCallRequest(from, callId) {
        this.delegate.callbacks.onCallRequest?.(from, callId);
      }

      onCallAccepted(from, callId) {
        this.delegate.callbacks.onCallAccepted?.(from, callId);
      }

      onCallRejected(from) {
        this.delegate.callbacks.onCallRejected?.(from);
      }

      onCallEnded(from) {
        this.delegate.callbacks.onCallEnded?.(from);
      }

      // Estas ya no se usan
      onGroupCallRequest() {}
      onGroupCallStarted() {}
      onGroupCallEnded() {}
      onCallAudioStream() {}
    };

    this.callbackAdapter = await this.communicator.createObjectAdapter('');
    const connection = await this.chatService.ice_getConnection();
    await connection.setAdapter(this.callbackAdapter);

    const callbackImpl = new CallbackImpl(this);
    const identity = Ice.stringToIdentity(Ice.generateUUID());
    const callbackPrxBase = this.callbackAdapter.add(callbackImpl, identity);

    await this.callbackAdapter.activate();
    const callbackPrx = Chat.ChatCallbackPrx.uncheckedCast(callbackPrxBase);

    const registered = await this.chatService.registerUser(username, callbackPrx);

    if (!registered) {
      throw new Error('No se pudo registrar el usuario (nombre duplicado)');
    }

    console.log(' Conectado y registrado:', username);
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

  // Notas de voz (NO llamadas)
  async sendAudioMessage(to, audioData, audioId) {
    return this.chatService.sendAudioMessage(this.username, to, audioData, audioId);
  }

  async sendGroupAudioMessage(groupName, audioData, audioId) {
    return this.chatService.sendGroupAudioMessage(this.username, groupName, audioData, audioId);
  }

  // Señalización de llamadas (solo notificación, audio va por WebSocket)
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
}

const iceDelegate = new IceDelegate();
export default iceDelegate;
