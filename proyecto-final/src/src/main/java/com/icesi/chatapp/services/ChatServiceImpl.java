package com.icesi.chatapp.services;

import Chat.*;
import com.zeroc.Ice.Current;
import com.icesi.chatapp.repos.IMessageRepo;
import com.icesi.chatapp.managers.UserManager;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class ChatServiceImpl implements ChatService {

    private final IMessageRepo messageRepo;
    private final UserManager userManager;
    private final Map<String, Set<String>> groups = new ConcurrentHashMap<>();
    private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public ChatServiceImpl(IMessageRepo messageRepo) {
        this.messageRepo = messageRepo;
        this.userManager = new UserManager();
    }

    // ==================== USUARIOS ====================

    @Override
    public boolean registerUser(String username, ChatCallbackPrx callback, Current current) {
        if (!userManager.registerUser(username, callback.ice_fixed(current.con))) {
            System.out.println(" Usuario ya existe: " + username);
            return false;
        }

        if (current.con != null) {
            current.con.setCloseCallback(connection -> handleUserDisconnect(username));
        }

        System.out.println(" Usuario registrado: " + username);
        notifyUserJoined(username);
        return true;
    }

    @Override
    public void unregisterUser(String username, Current current) {
        handleUserDisconnect(username);
    }

    @Override
    public String[] listUsers(Current current) {
        return userManager.listUsers();
    }

    // ==================== MENSAJES PRIVADOS ====================

    @Override
    public boolean sendPrivateMessage(String from, String to, String content, Current current) {
        ChatCallbackPrx recipient = userManager.getUser(to);

        if (recipient == null) return false;

        Message msg = createMessage(from, content, "private");

        try {
            recipient.onMessageReceived(msg);
            messageRepo.savePrivateMessage(from, to, content);
            System.out.println("mensaje " + from + " → " + to + ": " + content);
            return true;
        } catch (Exception e) {
            System.err.println(" Error enviando mensaje");
            return false;
        }
    }

    @Override
    public Message[] getPrivateHistory(String user1, String user2, Current current) {
        List<String> historyLines = messageRepo.getPrivateHistory(user1, user2);
        return parseHistoryLines(historyLines);
    }

    // ==================== GRUPOS ====================

    @Override
    public boolean createGroup(String groupName, String creator, Current current) {
        if (groups.containsKey(groupName)) return false;

        Set<String> members = ConcurrentHashMap.newKeySet();
        members.add(creator);
        groups.put(groupName, members);

        System.out.println(" Grupo creado: " + groupName);
        notifyGroupCreated(groupName, creator);
        return true;
    }

    @Override
    public boolean addUserToGroup(String groupName, String username, Current current) {
        Set<String> members = groups.get(groupName);
        if (members == null) return false;

        members.add(username);
        return true;
    }

    @Override
    public boolean sendGroupMessage(String from, String groupName, String content, Current current) {
        Set<String> members = groups.get(groupName);
        if (members == null) return false;

        Message msg = createMessage(from, content, "group");
        notifyGroupMembers(groupName, from, callback -> callback.onMessageReceived(msg));

        messageRepo.saveGroupMessage(from, groupName, content);
        System.out.println(" [" + groupName + "] " + from + ": " + content);
        return true;
    }

    @Override
    public Message[] getGroupHistory(String groupName, Current current) {
        List<String> historyLines = messageRepo.getGroupHistory(groupName);
        Message[] messages = parseHistoryLines(historyLines);
        for (Message msg : messages) {
            msg.type = "group";
        }
        return messages;
    }

    @Override
    public String[] listMyGroups(String username, Current current) {
        List<String> userGroups = new ArrayList<>();

        for (Map.Entry<String, Set<String>> entry : groups.entrySet()) {
            if (entry.getValue().contains(username)) {
                userGroups.add(entry.getKey());
            }
        }

        return userGroups.toArray(new String[0]);
    }

    // ==================== NOTAS DE VOZ ====================

    @Override
    public boolean sendAudioMessage(String from, String to, byte[] audioData, String audioId, Current current) {
        ChatCallbackPrx recipient = userManager.getUser(to);

        if (recipient == null) return false;

        try {
            recipient.onAudioReceived(from, audioData, audioId);
            messageRepo.saveAudioMessage(from, to, audioId);
            System.out.println(" Audio: " + from + " → " + to);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public boolean sendGroupAudioMessage(String from, String groupName, byte[] audioData, String audioId, Current current) {
        Set<String> members = groups.get(groupName);

        if (members == null) return false;

        notifyGroupMembers(groupName, from, callback -> callback.onAudioReceived(from, audioData, audioId));
        messageRepo.saveGroupAudioMessage(from, groupName, audioId);

        return true;
    }

    // ==================== SEÑALIZACIÓN DE LLAMADAS (SIN AUDIO) ====================

    @Override
    public boolean initiateCall(String from, String to, String callId, Current current) {
        ChatCallbackPrx recipient = userManager.getUser(to);

        if (recipient == null) return false;

        try {
            recipient.onCallRequest(from, callId);
            System.out.println(" Llamada iniciada: " + from + " → " + to);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public boolean acceptCall(String from, String to, String callId, Current current) {
        ChatCallbackPrx caller = userManager.getUser(to);

        if (caller == null) return false;

        try {
            caller.onCallAccepted(from, callId);
            System.out.println("Llamada aceptada: " + from + " ↔ " + to);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public boolean rejectCall(String from, String to, Current current) {
        ChatCallbackPrx caller = userManager.getUser(to);

        if (caller == null) return false;

        try {
            caller.onCallRejected(from);
            System.out.println(" Llamada rechazada por: " + from);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public boolean endCall(String from, String to, Current current) {
        ChatCallbackPrx otherUser = userManager.getUser(to);

        if (otherUser == null) return false;

        try {
            otherUser.onCallEnded(from);
            System.out.println(" Llamada finalizada: " + from + " → " + to);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // ==================== MÉTODOS NO USADOS (MANTENER POR COMPATIBILIDAD CON chat.ice) ====================

    @Override
    public boolean initiateGroupCall(String from, String groupName, String callId, Current current) {
        System.out.println(" initiateGroupCall no implementado (usar WebSocket)");
        return false;
    }

    @Override
    public boolean joinGroupCall(String username, String groupName, String callId, Current current) {
        System.out.println(" joinGroupCall no implementado (usar WebSocket)");
        return false;
    }

    @Override
    public boolean leaveGroupCall(String username, String groupName, String callId, Current current) {
        System.out.println(" leaveGroupCall no implementado (usar WebSocket)");
        return false;
    }

    @Override
    public boolean endGroupCall(String groupName, String callId, Current current) {
        System.out.println("endGroupCall no implementado (usar WebSocket)");
        return false;
    }

    @Override
    public boolean streamCallAudio(String from, String to, byte[] audioChunk, Current current) {
        System.out.println(" streamCallAudio no implementado (usar WebSocket)");
        return false;
    }

    @Override
    public boolean streamGroupCallAudio(String from, String groupName, byte[] audioChunk, Current current) {
        System.out.println(" streamGroupCallAudio no implementado (usar WebSocket)");
        return false;
    }

    // ==================== MÉTODOS AUXILIARES ====================

    private void handleUserDisconnect(String username) {
        userManager.unregisterUser(username);

        for (Set<String> members : groups.values()) {
            members.remove(username);
        }

        System.out.println(" Usuario desconectado: " + username);
        notifyUserLeft(username);
    }

    private Message createMessage(String sender, String content, String type) {
        Message msg = new Message();
        msg.sender = sender;
        msg.content = content;
        msg.timestamp = LocalDateTime.now().format(formatter);
        msg.type = type;
        return msg;
    }

    private Message[] parseHistoryLines(List<String> lines) {
        List<Message> messages = new ArrayList<>();

        for (String line : lines) {
            Message msg = parseHistoryLine(line);
            if (msg != null) {
                messages.add(msg);
            }
        }

        return messages.toArray(new Message[0]);
    }

    private Message parseHistoryLine(String line) {
        try {
            Message msg = new Message();
            int firstBracket = line.indexOf('[');
            int secondBracket = line.indexOf(']');

            if (firstBracket >= 0 && secondBracket > firstBracket) {
                msg.timestamp = line.substring(firstBracket + 1, secondBracket).trim();
                String rest = line.substring(secondBracket + 1).trim();
                int colonIndex = rest.indexOf(':');

                if (colonIndex > 0) {
                    msg.sender = rest.substring(0, colonIndex).trim();
                    msg.content = rest.substring(colonIndex + 1).trim();
                    msg.type = "private";
                    return msg;
                }
            }
        } catch (Exception e) {
            // Ignorar
        }
        return null;
    }

    private void notifyUserJoined(String username) {
        userManager.notifyAll(username, callback -> callback.onUserJoined(username));
    }

    private void notifyUserLeft(String username) {
        userManager.notifyAll(null, callback -> callback.onUserLeft(username));
    }

    private void notifyGroupCreated(String groupName, String creator) {
        userManager.notifyAll(null, callback -> callback.onGroupCreated(groupName, creator));
    }

    private void notifyGroupMembers(String groupName, String excludeUser, NotificationAction action) {
        Set<String> members = groups.get(groupName);

        if (members == null) return;

        for (String member : members) {
            if (!member.equals(excludeUser)) {
                ChatCallbackPrx callback = userManager.getUser(member);
                if (callback != null) {
                    try {
                        action.execute(callback);
                    } catch (Exception e) {
                        System.err.println(" Error notificando a " + member);
                    }
                }
            }
        }
    }

    @FunctionalInterface
    private interface NotificationAction {
        void execute(ChatCallbackPrx callback) throws Exception;
    }
}
