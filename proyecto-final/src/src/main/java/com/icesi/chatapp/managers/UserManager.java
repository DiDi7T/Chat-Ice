package com.icesi.chatapp.managers;

import Chat.ChatCallbackPrx;
import com.icesi.chatapp.models.UserSession;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class UserManager {
    private final Map<String, ChatCallbackPrx> users = new ConcurrentHashMap<>();

    public boolean registerUser(String username, ChatCallbackPrx callback) {
        if (users.containsKey(username)) {
            return false;
        }
        users.put(username, callback);
        return true;
    }

    public void unregisterUser(String username) {
        users.remove(username);
    }

    public ChatCallbackPrx getUser(String username) {
        return users.get(username);
    }

    public String[] listUsers() {
        return users.keySet().toArray(new String[0]);
    }

    public boolean isUserConnected(String username) {
        return users.containsKey(username);
    }

    public void notifyAll(String excludeUser, CallbackAction action) {
        for (Map.Entry<String, ChatCallbackPrx> entry : users.entrySet()) {
            if (!entry.getKey().equals(excludeUser)) {
                try {
                    action.execute(entry.getValue());
                } catch (Exception e) {
                    System.err.println("Error notificando a " + entry.getKey());
                }
            }
        }
    }

    @FunctionalInterface
    public interface CallbackAction {
        void execute(ChatCallbackPrx callback) throws Exception;
    }
}
