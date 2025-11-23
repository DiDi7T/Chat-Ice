module Chat {

    struct Message {
        string sender;
        string content;
        string timestamp;
        string type;
    };

    sequence<Message> MessageSeq;
    sequence<string> StringSeq;
    sequence<byte> AudioData;

    // Callback para notificaciones en tiempo real
    interface ChatCallback {
        void onMessageReceived(Message msg);
        void onUserJoined(string username);
        void onUserLeft(string username);
        void onGroupCreated(string groupName, string creator);

        // Audio
        void onAudioReceived(string from, AudioData audioData, string audioId);

        // Llamadas individuales
        void onCallRequest(string from, string callId);
        void onCallAccepted(string from, string callId);
        void onCallRejected(string from);
        void onCallEnded(string from);

        // Llamadas de grupo
        void onGroupCallRequest(string from, string groupName, string callId);
        void onGroupCallStarted(string groupName, string callId);
        void onGroupCallEnded(string groupName);

        // Audio en tiempo real durante llamada
        void onCallAudioStream(string from, AudioData audioChunk);
    };

    interface ChatService {
        // Usuarios
        bool registerUser(string username, ChatCallback* callback);
        void unregisterUser(string username);
        StringSeq listUsers();

        // Mensajes privados
        bool sendPrivateMessage(string from, string to, string content);
        MessageSeq getPrivateHistory(string user1, string user2);

        // Grupos
        bool createGroup(string groupName, string creator);
        bool addUserToGroup(string groupName, string username);
        bool sendGroupMessage(string from, string groupName, string content);
        MessageSeq getGroupHistory(string groupName);
        StringSeq listMyGroups(string username);

        // Notas de voz (grabadas)
        bool sendAudioMessage(string from, string to, AudioData audioData, string audioId);
        bool sendGroupAudioMessage(string from, string groupName, AudioData audioData, string audioId);

        // Llamadas individuales
        bool initiateCall(string from, string to, string callId);
        bool acceptCall(string from, string to, string callId);
        bool rejectCall(string from, string to);
        bool endCall(string from, string to);

        // Llamadas de grupo
        bool initiateGroupCall(string from, string groupName, string callId);
        bool joinGroupCall(string username, string groupName, string callId);
        bool leaveGroupCall(string username, string groupName, string callId);
        bool endGroupCall(string groupName, string callId);

        // audio en llamada
        bool streamCallAudio(string from, string to, AudioData audioChunk);
        bool streamGroupCallAudio(string from, string groupName, AudioData audioChunk);
    };
};
