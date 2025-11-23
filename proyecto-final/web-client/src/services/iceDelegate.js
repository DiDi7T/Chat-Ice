class IceDelegate {
    constructor() {
        this.communicator = null;
        this.chatService = null;
        this.callbackAdapter = null;
        this.username = null;
        this.callbacks = {};
    }

    async init(username, callbacks) {
        this.username = username;
        this.callbacks = callbacks;

        console.log('[IceDelegate] Inicializando');
        // Inicializar Ice
        this.communicator = Ice.initialize();
        console.log('[IceDelegate] Communicator creado');

        // Crear proxy al servicio
        const proxy = this.communicator.stringToProxy(
            'ChatService:ws -h localhost -p 9099'
        );

        this.chatService = await Chat.ChatServicePrx.checkedCast(proxy);

        if (!this.chatService) {
            throw new Error('No se pudo conectar al servicio Ice');
        }
        console.log('[IceDelegate] Servicio conectado');

        // Crear callback implementation
        const CallbackImpl = class {
            constructor(delegate) {
                this.delegate = delegate;
            }

            onMessageReceived(msg, current) {
                console.log('[IceDelegate] onMessageReceived', msg);
                if (this.delegate.callbacks.onMessageReceived) {
                    this.delegate.callbacks.onMessageReceived(msg);
                }
            }

            onUserJoined(username, current) {
                if (this.delegate.callbacks.onUserJoined) {
                    this.delegate.callbacks.onUserJoined(username);
                }
            }

            onUserLeft(username, current) {
                if (this.delegate.callbacks.onUserLeft) {
                    this.delegate.callbacks.onUserLeft(username);
                }
            }

            onGroupCreated(groupName, creator, current) {
                if (this.delegate.callbacks.onGroupCreated) {
                    this.delegate.callbacks.onGroupCreated(groupName, creator);
                }
            }

            onAudioReceived(from, audioData, audioId, current) {
                if (this.delegate.callbacks.onAudioReceived) {
                    this.delegate.callbacks.onAudioReceived(from, audioData, audioId);
                }
            }

            onCallRequest(from, callId, current) {
                if (this.delegate.callbacks.onCallRequest) {
                    this.delegate.callbacks.onCallRequest(from, callId);
                }
            }

            onCallAccepted(from, callId, current) {
                if (this.delegate.callbacks.onCallAccepted) {
                    this.delegate.callbacks.onCallAccepted(from, callId);
                }
            }

            onCallRejected(from, current) {
                if (this.delegate.callbacks.onCallRejected) {
                    this.delegate.callbacks.onCallRejected(from);
                }
            }

            onCallEnded(from, current) {
                if (this.delegate.callbacks.onCallEnded) {
                    this.delegate.callbacks.onCallEnded(from);
                }
            }

            onGroupCallRequest(from, groupName, callId, current) {
                if (this.delegate.callbacks.onGroupCallRequest) {
                    this.delegate.callbacks.onGroupCallRequest(from, groupName, callId);
                }
            }

            onGroupCallStarted(groupName, callId, current) {
                if (this.delegate.callbacks.onGroupCallStarted) {
                    this.delegate.callbacks.onGroupCallStarted(groupName, callId);
                }
            }

            onGroupCallEnded(groupName, current) {
                if (this.delegate.callbacks.onGroupCallEnded) {
                    this.delegate.callbacks.onGroupCallEnded(groupName);
                }
            }

            onCallAudioStream(from, audioChunk, current) {
                if (this.delegate.callbacks.onCallAudioStream) {
                    this.delegate.callbacks.onCallAudioStream(from, audioChunk);
                }
            }
        };

        // Crear adapter para callbacks
        this.callbackAdapter = await this.communicator.createObjectAdapter("");
        console.log('[IceDelegate] Adapter creado');
        const callbackImpl = new CallbackImpl(this);
        const identity = Ice.stringToIdentity(Ice.generateUUID());
        const callbackPrx = this.callbackAdapter.add(callbackImpl, identity);
        console.log('[IceDelegate] Callback agregado, identity:', identity);
        await this.callbackAdapter.activate();
        console.log('[IceDelegate] Adapter ACTIVADO');
        // Registrar usuario con callback
        console.log('[IceDelegate] Intentando registrar usuario con callbackPrx:', callbackPrx);
        const registered = await this.chatService.registerUser(
            username,
            Chat.ChatCallbackPrx.uncheckedCast(callbackPrx)
        );
        console.log('[IceDelegate] Resultado del registro:', registered);
        if (!registered) {
            throw new Error('No se pudo registrar el usuario');
        }

        console.log('✅ Conectado y registrado:', username);
        return true;
    }

    async disconnect() {
        if (this.chatService && this.username) {
            await this.chatService.unregisterUser(this.username);
        }
        if (this.callbackAdapter) {
            await this.callbackAdapter.destroy();
        }
        if (this.communicator) {
            await this.communicator.destroy();
        }
    }

    // ==================== MÉTODOS DEL SERVICIO ====================

    async sendPrivateMessage(to, content) {
        return await this.chatService.sendPrivateMessage(this.username, to, content);
    }

    async getPrivateHistory(otherUser) {
        return await this.chatService.getPrivateHistory(this.username, otherUser);
    }

    async listUsers() {
        return await this.chatService.listUsers();
    }

    async createGroup(groupName) {
        return await this.chatService.createGroup(groupName, this.username);
    }

    async addUserToGroup(groupName, username) {
        return await this.chatService.addUserToGroup(groupName, username);
    }

    async sendGroupMessage(groupName, content) {
        return await this.chatService.sendGroupMessage(this.username, groupName, content);
    }

    async getGroupHistory(groupName) {
        return await this.chatService.getGroupHistory(groupName);
    }

    async listMyGroups() {
        return await this.chatService.listMyGroups(this.username);
    }

    async sendAudioMessage(to, audioData, audioId) {
        return await this.chatService.sendAudioMessage(this.username, to, audioData, audioId);
    }

    async initiateCall(to, callId) {
        return await this.chatService.initiateCall(this.username, to, callId);
    }

    async acceptCall(from, callId) {
        return await this.chatService.acceptCall(this.username, from, callId);
    }

    async rejectCall(from) {
        return await this.chatService.rejectCall(this.username, from);
    }

    async endCall(to) {
        return await this.chatService.endCall(this.username, to);
    }

    async initiateGroupCall(groupName, callId) {
        return await this.chatService.initiateGroupCall(this.username, groupName, callId);
    }

    async joinGroupCall(groupName, callId) {
        return await this.chatService.joinGroupCall(this.username, groupName, callId);
    }

    async streamCallAudio(to, audioChunk) {
        return await this.chatService.streamCallAudio(this.username, to, audioChunk);
    }
}

// Singleton
const iceDelegate = new IceDelegate();
export default iceDelegate;
