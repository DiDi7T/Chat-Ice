package com.icesi.chatapp.managers;

import com.icesi.chatapp.models.CallInfo;
import com.icesi.chatapp.models.GroupCallInfo;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class CallManager {
    private final Map<String, CallInfo> activeCalls = new ConcurrentHashMap<>();
    private final Map<String, GroupCallInfo> activeGroupCalls = new ConcurrentHashMap<>();

    // Llamadas individuales
    public void createCall(String callId, String caller, String receiver) {
        activeCalls.put(callId, new CallInfo(caller, receiver, callId));
    }

    public CallInfo getCall(String callId) {
        return activeCalls.get(callId);
    }

    public void acceptCall(String callId) {
        CallInfo call = activeCalls.get(callId);
        if (call != null) {
            call.setAccepted(true);
        }
    }

    public void endCall(String callId) {
        activeCalls.remove(callId);
    }

    public void cleanupUserCalls(String username) {
        activeCalls.entrySet().removeIf(entry ->
                entry.getValue().getCaller().equals(username) ||
                        entry.getValue().getReceiver().equals(username)
        );
    }

    // Llamadas de grupo
    public void createGroupCall(String groupName, String callId, String initiator) {
        activeGroupCalls.put(groupName, new GroupCallInfo(groupName, callId, initiator));
    }

    public GroupCallInfo getGroupCall(String groupName) {
        return activeGroupCalls.get(groupName);
    }

    public void endGroupCall(String groupName) {
        activeGroupCalls.remove(groupName);
    }

    public void cleanupGroupCalls(String username) {
        for (GroupCallInfo groupCall : activeGroupCalls.values()) {
            groupCall.removeParticipant(username);
            if (groupCall.isEmpty()) {
                activeGroupCalls.remove(groupCall.getGroupName());
            }
        }
    }
}
