# 💬 Proyecto: Integración Cliente–Proxy–Backend (Chat Grupal)


## 👥 Integrantes

- **Diana María Garzón Toro** - A00405150  
- **Samuel Navia Quiceno** - A00405006  
- **Nathalie Sánchez Trujillo** - A00405157  

---


## 🧩 Descripción General

Este proyecto tiene como objetivo integrar un **cliente web** desarrollado en **HTML, CSS y JavaScript** con un **backend en Java**, mediante un **servidor proxy HTTP** implementado en **(Node.js)**.  
El proxy actúa como intermediario entre el entorno web y el servidor Java basado en sockets, permitiendo la comunicación entre ambos y soportando funcionalidades como el **chat grupal**.

---

## ⚙️ Requisitos Previos

- **Java JDK 17 o superior**
- **Node.js (v16 o superior)**
- **npm** (incluido con Node.js)
- **Navegador web** 


## 🚀 Instrucciones para Ejecutar el Sistema

El sistema está compuesto por tres partes principales que deben ejecutarse en conjunto:

1. **Backend Java (Servidor Principal)**  
   - Este componente mantiene la lógica del chat y gestiona las conexiones mediante sockets.  
   - Es el responsable de recibir, procesar y distribuir los mensajes entre los distintos clientes conectados.

2. **Servidor Proxy RPC (ICE)**  
   - Actúa como intermediario entre el cliente web y el servidor Java.  
   - Se encarga de recibir las solicitudes del navegador y traducirlas a mensajes de socket comprensibles para el backend.  
   - A su vez, recibe las respuestas del servidor Java y las envía nuevamente al cliente web en formato HTTP.

3. **Cliente Web (Interfaz de Usuario)**  
   - Desarrollado en HTML, CSS y JavaScript.  
   - Permite al usuario final conectarse al chat, enviar y recibir mensajes de manera visual.  
   - Toda la comunicación con el backend se realiza a través del proxy HTTP.


## 🔄 Flujo de Comunicación


El flujo de comunicación entre los distintos componentes es el siguiente:

1. El **cliente web** inicializa un *communicator* de Ice en JavaScript y obtiene un **proxy remoto** al servicio `ChatService` expuesto por el **servidor Java** (vía WebSocket `ws://localhost:9099`).  
2. El **cliente web** invoca operaciones remotas sobre ese proxy (registrarse, listar usuarios, enviar mensajes, crear grupos, etc.), como si fueran métodos locales, pero que en realidad se ejecutan en el servidor Ice.  
3. El **servidor Java** recibe la invocación a través de Ice, ejecuta la lógica del chat (gestiona usuarios, grupos, historial, llamadas, audio) y, cuando es necesario, guarda la información en los repositorios correspondientes.  
4. Además de devolver los resultados al cliente que hizo la llamada, el **servidor** utiliza los *callbacks* definidos en la interfaz `ChatCallback` para **notificar de forma asíncrona** a todos los clientes afectados (nuevo mensaje, usuario conectado/desconectado, grupo creado, llamada entrante, etc.).  
5. Cada **cliente web** recibe esas notificaciones por Ice, actualiza su estado local (listas de usuarios y grupos, mensajes, llamadas) y refresca la interfaz para reflejar los cambios en tiempo real.



Para ejecutar el sistema completo, deben estar **los tres componentes corriendo simultáneamente**: el backend en Java, el proxy en Express, y el cliente abierto en el navegador.

## Terminal 1: Backend Java
```bash

 cd src 
(desde tu ubicación actual, pasate a src)

.\gradlew.bat runServer
```


## Terminal 3: Cliente Web (abre otra  terminal más)

```bash
cd web-client
npm install
npm start
```

En la última terminal, encontraras algo como 

```bash
<i> [webpack-dev-server] On Your Network (IPv4): http://192.168.1.8:8080/  

```

Asegúrese de que:

El backend Java y el proxy Express estén corriendo.

No haya errores en las consolas.
Luego abra el cliente en el navegador.

#### 🧑‍💻 Ingresa con tu nombre de usuario
####  💬 Chatea con los demás usuarios en tiempo real!
#### 🌍 Crea y chatea en los grupos con otros usuarios conectados!
