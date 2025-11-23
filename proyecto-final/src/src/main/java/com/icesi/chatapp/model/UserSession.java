package com.icesi.chatapp.models;

import Chat.ChatCallbackPrx;

public class UserSession {
    private String username;
    private ChatCallbackPrx callback;

    public UserSession(String username, ChatCallbackPrx callback) {
        this.username = username;
        this.callback = callback;
    }

    public String getUsername() { return username; }
    public ChatCallbackPrx getCallback() { return callback; }
}
