package com.icesi.chatapp.models;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public class GroupCallInfo {
    private String groupName;
    private String callId;
    private String initiator;
    private Set<String> participants;

    public GroupCallInfo(String groupName, String callId, String initiator) {
        this.groupName = groupName;
        this.callId = callId;
        this.initiator = initiator;
        this.participants = ConcurrentHashMap.newKeySet();
        this.participants.add(initiator);
    }

    // Getters
    public String getGroupName() { return groupName; }
    public String getCallId() { return callId; }
    public String getInitiator() { return initiator; }
    public Set<String> getParticipants() { return participants; }

    // Métodos de utilidad
    public void addParticipant(String username) {
        participants.add(username);
    }

    public void removeParticipant(String username) {
        participants.remove(username);
    }

    public boolean isEmpty() {
        return participants.isEmpty();
    }
}
