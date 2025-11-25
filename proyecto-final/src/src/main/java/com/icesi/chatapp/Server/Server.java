package com.icesi.chatapp.Server;

import com.zeroc.Ice.*;
import com.icesi.chatapp.services.ChatServiceImpl;
import com.icesi.chatapp.repos.MessageHistory;
import com.icesi.chatapp.repos.IMessageRepo;
import com.icesi.chatapp.websocket.AudioWebSocketServer;

public class Server {
    public static void main(String[] args) {
        org.glassfish.tyrus.server.Server wsServer = null;

        try (Communicator communicator = Util.initialize(args)) {

            communicator.getProperties().setProperty("Ice.ThreadPool.Server.Size", "5");

            IMessageRepo messageRepo = new MessageHistory();
            ChatServiceImpl chatService = new ChatServiceImpl(messageRepo);

            // Servidor Ice (puerto 9099)
            ObjectAdapter adapter = communicator.createObjectAdapterWithEndpoints(
                    "ChatAdapter",
                    "ws -h localhost -p 9099"
            );

            adapter.add(chatService, Util.stringToIdentity("ChatService"));
            adapter.activate();

            System.out.println(" Servidor Ice iniciado en ws://localhost:9099");

            // Servidor WebSocket para audio (puerto 9098)
            wsServer = new org.glassfish.tyrus.server.Server(
                    "localhost",
                    9098,
                    "/ws",
                    null,
                    AudioWebSocketServer.class
            );
            wsServer.start();

            System.out.println(" Servidor WebSocket iniciado en ws://localhost:9098");

            communicator.waitForShutdown();

            if (wsServer != null) {
                wsServer.stop();
            }

        } catch (java.lang.Exception e) {
            e.printStackTrace();
        }
    }
}
