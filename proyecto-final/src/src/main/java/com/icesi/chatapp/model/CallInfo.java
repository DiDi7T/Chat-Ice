package com.icesi.chatapp.models;

public class CallInfo {
    private String caller;
    private String receiver;
    private String callId;
    private boolean accepted;

    public CallInfo(String caller, String receiver, String callId) {
        this.caller = caller;
        this.receiver = receiver;
        this.callId = callId;
        this.accepted = false;
    }

    // Getters y Setters
    public String getCaller() { return caller; }
    public void setCaller(String caller) { this.caller = caller; }

    public String getReceiver() { return receiver; }
    public void setReceiver(String receiver) { this.receiver = receiver; }

    public String getCallId() { return callId; }
    public void setCallId(String callId) { this.callId = callId; }

    public boolean isAccepted() { return accepted; }
    public void setAccepted(boolean accepted) { this.accepted = accepted; }
}
