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

2. **Servidor Proxy HTTP (Express.js)**  
   - Actúa como intermediario entre el cliente web y el servidor Java.  
   - Se encarga de recibir las solicitudes HTTP del navegador y traducirlas a mensajes de socket comprensibles para el backend.  
   - A su vez, recibe las respuestas del servidor Java y las envía nuevamente al cliente web en formato HTTP.

3. **Cliente Web (Interfaz de Usuario)**  
   - Desarrollado en HTML, CSS y JavaScript.  
   - Permite al usuario final conectarse al chat, enviar y recibir mensajes de manera visual.  
   - Toda la comunicación con el backend se realiza a través del proxy HTTP.


## 🔄 Flujo de Comunicación

El flujo de comunicación entre los distintos componentes es el siguiente:

1. El **cliente web** envía solicitudes HTTP al **proxy Express**, conteniendo los datos del mensaje o la acción del usuario.  
2. El **proxy HTTP** traduce esa solicitud a un formato de comunicación por **sockets**, y la envía al **backend Java**.  
3. El **backend** procesa la información, ejecuta la lógica del chat grupal y devuelve una respuesta o actualización del estado.  
4. El **proxy** recibe la respuesta del backend y la transmite nuevamente al cliente web mediante HTTP.  
5. Finalmente, el **cliente web** actualiza la interfaz para reflejar los nuevos mensajes o cambios en la conversación.



Para ejecutar el sistema completo, deben estar **los tres componentes corriendo simultáneamente**: el backend en Java, el proxy en Express, y el cliente abierto en el navegador.

## Terminal 1: Backend Java
```bash

 cd src 
(desde tu ubicación actual, pasate a src)

.\gradlew.bat runServer
```

## Terminal 2: Proxy (abre una nueva )

```bash
cd proxy
npm install
node server.js
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
