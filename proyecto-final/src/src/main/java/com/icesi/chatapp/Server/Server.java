package com.icesi.chatapp.Server;

import com.zeroc.Ice.*;
import com.icesi.chatapp.services.ChatServiceImpl;
import com.icesi.chatapp.repos.MessageHistory;
import com.icesi.chatapp.repos.IMessageRepo;

public class Server {
    public static void main(String[] args) {
        try (Communicator communicator = Util.initialize(args)) {

            communicator.getProperties().setProperty("Ice.ThreadPool.Server.Size", "5");


            IMessageRepo messageRepo = new MessageHistory();
            ChatServiceImpl chatService = new ChatServiceImpl(messageRepo);

            ObjectAdapter adapter = communicator.createObjectAdapterWithEndpoints(
                    "ChatAdapter",
                    "ws -h localhost -p 9099"
            );

            adapter.add(chatService, Util.stringToIdentity("ChatService"));
            adapter.activate();

            System.out.println(" Servidor Ice iniciado");
            System.out.println(" Escuchando en ws://localhost:9099");

            communicator.waitForShutdown();
        }
    }
}
