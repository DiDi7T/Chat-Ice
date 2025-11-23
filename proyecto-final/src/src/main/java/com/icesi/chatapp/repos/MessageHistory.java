package com.icesi.chatapp.repos;

import java.io.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

public class MessageHistory implements IMessageRepo {
    private static final String HISTORY_DIR = "chat_history";
    private static final String AUDIO_HISTORY_DIR = "audio_history";
    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    static {
        new File(HISTORY_DIR).mkdirs();
        new File(AUDIO_HISTORY_DIR).mkdirs();
    }


    @Override
    public void savePrivateMessage(String sender, String receiver, String message) {
        String timestamp = LocalDateTime.now().format(formatter);
        String logEntry = String.format("[%s] %s -> %s: %s%n", timestamp, sender, receiver, message);

        appendToFile(getPrivateHistoryFile(sender, receiver), logEntry);
        appendToFile(getPrivateHistoryFile(receiver, sender), logEntry);
    }

    @Override
    public void saveGroupMessage(String sender, String groupName, String message) {
        String timestamp = LocalDateTime.now().format(formatter);
        String logEntry = String.format("[%s] %s en %s: %s%n", timestamp, sender, groupName, message);

        appendToFile(getGroupHistoryFile(groupName), logEntry);
    }


    @Override
    public void saveAudioMessage(String from, String to, String audioId) {
        savePrivateMessage(from, to, "[AUDIO:" + audioId + "]");
    }

    @Override
    public void saveGroupAudioMessage(String from, String groupName, String audioId) {
        saveGroupMessage(from, groupName, "[AUDIO:" + audioId + "]");
    }


    public void savePrivateAudio(String sender, String receiver, File audioFile) {
        String timestamp = LocalDateTime.now().format(formatter);
        File audioHistoryFile = copyAudioToHistory(audioFile, sender, receiver, timestamp, false);
        String logEntry = String.format("[%s] %s -> %s: [AUDIO: %s]%n",
                timestamp, sender, receiver, audioHistoryFile.getName());

        appendToFile(getPrivateHistoryFile(sender, receiver), logEntry);
        appendToFile(getPrivateHistoryFile(receiver, sender), logEntry);
    }

    public void saveGroupAudio(String sender, String groupName, File audioFile) {
        String timestamp = LocalDateTime.now().format(formatter);
        File audioHistoryFile = copyAudioToHistory(audioFile, sender, groupName, timestamp, true);
        String logEntry = String.format("[%s] %s en %s: [AUDIO: %s]%n",
                timestamp, sender, groupName, audioHistoryFile.getName());

        appendToFile(getGroupHistoryFile(groupName), logEntry);
    }

    @Override
    public List<String> getPrivateHistory(String user1, String user2) {
        File historyFile = getPrivateHistoryFile(user1, user2);
        return readHistoryFromFile(historyFile);
    }

    @Override
    public List<String> getGroupHistory(String groupName) {
        File historyFile = getGroupHistoryFile(groupName);
        return readHistoryFromFile(historyFile);
    }


    private File getPrivateHistoryFile(String user1, String user2) {
        List<String> users = Arrays.asList(user1, user2);
        Collections.sort(users);
        String fileName = "private_" + users.get(0) + "_" + users.get(1) + ".txt";
        return new File(HISTORY_DIR, fileName);
    }

    private File getGroupHistoryFile(String groupName) {
        String fileName = "group_" + groupName + ".txt";
        return new File(HISTORY_DIR, fileName);
    }

    private void appendToFile(File file, String content) {
        try (FileWriter fw = new FileWriter(file, true);
             BufferedWriter bw = new BufferedWriter(fw)) {
            bw.write(content);
            bw.flush();
        } catch (IOException e) {
            System.err.println("Error al guardar en historial: " + e.getMessage());
        }
    }

    private List<String> readHistoryFromFile(File file) {
        List<String> history = new ArrayList<>();
        if (!file.exists()) return history;

        try (BufferedReader br = new BufferedReader(new FileReader(file))) {
            String line;
            while ((line = br.readLine()) != null) {
                history.add(line);
            }
        } catch (IOException e) {
            System.err.println("Error al leer historial: " + e.getMessage());
        }
        return history;
    }

    private File copyAudioToHistory(File sourceAudio, String sender, String destination,
                                    String timestamp, boolean isGroup) {
        String cleanTimestamp = timestamp.replace(":", "-").replace(" ", "_");
        String prefix = isGroup ? "group_" + destination : "private_" + sender + "_" + destination;
        String fileName = prefix + "_" + cleanTimestamp + "_" + sourceAudio.getName();

        File destFile = new File(AUDIO_HISTORY_DIR, fileName);

        try (FileInputStream fis = new FileInputStream(sourceAudio);
             FileOutputStream fos = new FileOutputStream(destFile)) {

            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = fis.read(buffer)) != -1) {
                fos.write(buffer, 0, bytesRead);
            }

        } catch (IOException e) {
            System.err.println("Error al copiar audio al historial: " + e.getMessage());
        }

        return destFile;
    }
}
