package com.icesi.chatapp.repos;

import Chat.Message;
import java.util.List;

public interface IMessageRepo {
    void savePrivateMessage(String from, String to, String content);
    List<String> getPrivateHistory(String user1, String user2);

    void saveGroupMessage(String from, String groupName, String content);
    List<String> getGroupHistory(String groupName);

    void saveAudioMessage(String from, String to, String audioId);
    void saveGroupAudioMessage(String from, String groupName, String audioId);
}
