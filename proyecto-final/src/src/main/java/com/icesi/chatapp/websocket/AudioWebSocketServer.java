package com.icesi.chatapp.websocket;

import javax.websocket.*;
import javax.websocket.server.PathParam;
import javax.websocket.server.ServerEndpoint;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@ServerEndpoint("/audio/{username}")
public class AudioWebSocketServer {

    // Mapa de usuarios conectados: username -> Session
    private static final Map<String, Session> userSessions = new ConcurrentHashMap<>();

    // Mapa de llamadas activas: callId -> Set<usernames>
    private static final Map<String, Map<String, Session>> activeCalls = new ConcurrentHashMap<>();

    @OnOpen
    public void onOpen(Session session, @PathParam("username") String username) {
        userSessions.put(username, session);
        //System.out.println(" WebSocket conectado: " + username);

        // Guardar username en sesión
        session.getUserProperties().put("username", username);
    }

    @OnMessage
    public void onBinaryMessage(ByteBuffer audioData, Session session) {
        String username = (String) session.getUserProperties().get("username");
        String callId = (String) session.getUserProperties().get("callId");
        String callType = (String) session.getUserProperties().get("callType");

        if (callId == null) {
            System.out.println(" Audio recibido sin callId activo de: " + username);
            return;
        }

        // Retransmitir audio a los participantes de la llamada
        Map<String, Session> participants = activeCalls.get(callId);
        if (participants != null) {
            participants.forEach((participant, participantSession) -> {
                // No enviar audio al emisor
                if (!participant.equals(username) && participantSession.isOpen()) {
                    try {
                        // Enviar como mensaje binario
                        participantSession.getBasicRemote().sendBinary(audioData);
                    } catch (IOException e) {
                        System.err.println(" Error enviando audio a " + participant);
                    }
                }
            });
        }
    }

    @OnMessage
    public void onTextMessage(String message, Session session) {
        String username = (String) session.getUserProperties().get("username");
        System.out.println(" Mensaje de control de " + username + ": " + message);

        String[] parts = message.split(":");
        String command = parts[0];

        switch (command) {
            case "START_CALL":
                if (parts.length >= 3) {
                    String callId = parts[1];
                    String targetUser = parts[2];
                    startCall(callId, username, targetUser, session);
                }
                break;

            case "JOIN_CALL":
                if (parts.length >= 2) {
                    String callId = parts[1];
                    joinCall(callId, username, session);
                }
                break;

            case "END_CALL":
                if (parts.length >= 2) {
                    String callId = parts[1];
                    endCall(callId, username);
                }
                break;

            // ← AGREGAR ESTOS CASOS
            case "START_GROUP_CALL":
                if (parts.length >= 3) {
                    String callId = parts[1];
                    String groupName = parts[2];
                    startGroupCall(callId, groupName, username, session);
                }
                break;

            case "JOIN_GROUP_CALL":
                if (parts.length >= 3) {
                    String callId = parts[1];
                    String groupName = parts[2];
                    joinGroupCall(callId, groupName, username, session);
                }
                break;

            case "LEAVE_GROUP_CALL":
                if (parts.length >= 3) {
                    String callId = parts[1];
                    String groupName = parts[2];
                    leaveGroupCall(callId, groupName, username);
                }
                break;
        }
    }

    // ← AGREGAR ESTOS MÉTODOS
    private void startGroupCall(String callId, String groupName, String initiator, Session initiatorSession) {
        Map<String, Session> participants = new ConcurrentHashMap<>();
        participants.put(initiator, initiatorSession);
        activeCalls.put(callId, participants);

        initiatorSession.getUserProperties().put("callId", callId);
        initiatorSession.getUserProperties().put("callType", "group");

        // Notificar a todos los miembros del grupo
        // Nota: Aquí deberías obtener la lista de miembros del grupo desde ChatServiceImpl
        // Por simplicidad, enviaremos la invitación a todos los usuarios conectados
        userSessions.forEach((user, sess) -> {
            if (!user.equals(initiator) && sess.isOpen()) {
                try {
                    sess.getBasicRemote().sendText(
                            "GROUP_CALL_INVITATION:" + callId + ":" + groupName + ":" + initiator
                    );
                } catch (IOException e) {
                    System.err.println("Error enviando invitación grupal");
                }
            }
        });

        System.out.println(" Llamada grupal iniciada: " + groupName);
    }

    private void joinGroupCall(String callId, String groupName, String username, Session session) {
        Map<String, Session> participants = activeCalls.get(callId);
        if (participants != null) {
            participants.put(username, session);
            session.getUserProperties().put("callId", callId);
            session.getUserProperties().put("callType", "group");
            System.out.println(" Usuario unido a llamada grupal: " + username);
        }
    }

    private void leaveGroupCall(String callId, String groupName, String username) {
        Map<String, Session> participants = activeCalls.get(callId);
        if (participants != null) {
            Session session = participants.remove(username);
            if (session != null) {
                session.getUserProperties().remove("callId");
                session.getUserProperties().remove("callType");
            }

            if (participants.isEmpty()) {
                activeCalls.remove(callId);
                System.out.println(" Llamada grupal terminada: " + groupName);
            } else {
                System.out.println(" Usuario salió de llamada grupal: " + username);
            }
        }
    }


    @OnClose
    public void onClose(Session session, @PathParam("username") String username) {
        userSessions.remove(username);

        // Limpiar de todas las llamadas activas
        String callId = (String) session.getUserProperties().get("callId");
        if (callId != null) {
            leaveGroupCall(callId, username);
        }

        System.out.println("🔌 WebSocket desconectado: " + username);
    }

    @OnError
    public void onError(Session session, Throwable error) {
        String username = (String) session.getUserProperties().get("username");
        System.err.println(" Error en WebSocket de " + username + ": " + error.getMessage());
    }

    // ==================== GESTIÓN DE LLAMADAS ====================

    private void startCall(String callId, String caller, String target, Session callerSession) {
        Map<String, Session> participants = new ConcurrentHashMap<>();
        participants.put(caller, callerSession);

        Session targetSession = userSessions.get(target);
        if (targetSession != null) {
            participants.put(target, targetSession);
            activeCalls.put(callId, participants);

            // Configurar callId en ambas sesiones
            callerSession.getUserProperties().put("callId", callId);
            callerSession.getUserProperties().put("callType", "individual");
            targetSession.getUserProperties().put("callId", callId);
            targetSession.getUserProperties().put("callType", "individual");

            System.out.println(" Llamada iniciada: " + callId);
        }
    }

    private void joinCall(String callId, String username, Session session) {
        Map<String, Session> participants = activeCalls.get(callId);
        if (participants != null) {
            participants.put(username, session);
            session.getUserProperties().put("callId", callId);
            session.getUserProperties().put("callType", "group");
            System.out.println(" Usuario unido a llamada: " + username + " -> " + callId);
        }
    }

    private void endCall(String callId, String username) {
        Map<String, Session> participants = activeCalls.remove(callId);
        if (participants != null) {
            participants.forEach((user, session) -> {
                session.getUserProperties().remove("callId");
                session.getUserProperties().remove("callType");

                // Notificar fin de llamada
                try {
                    session.getBasicRemote().sendText("CALL_ENDED:" + callId);
                } catch (IOException e) {
                    System.err.println("Error notificando fin de llamada");
                }
            });
            System.out.println(" Llamada finalizada: " + callId);
        }
    }

    private void startGroupCall(String callId, String initiator, Session initiatorSession) {
        Map<String, Session> participants = new ConcurrentHashMap<>();
        participants.put(initiator, initiatorSession);
        activeCalls.put(callId, participants);

        initiatorSession.getUserProperties().put("callId", callId);
        initiatorSession.getUserProperties().put("callType", "group");

        System.out.println(" Llamada grupal iniciada: " + callId);
    }

    private void leaveGroupCall(String callId, String username) {
        Map<String, Session> participants = activeCalls.get(callId);
        if (participants != null) {
            Session session = participants.remove(username);
            if (session != null) {
                session.getUserProperties().remove("callId");
                session.getUserProperties().remove("callType");
            }

            // Si no quedan participantes, eliminar la llamada
            if (participants.isEmpty()) {
                activeCalls.remove(callId);
                System.out.println(" Llamada grupal terminada: " + callId);
            } else {
                System.out.println(" Usuario salió de llamada grupal: " + username);
            }
        }
    }
}
