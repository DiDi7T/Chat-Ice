# 💬 Proyecto: Integración Cliente–Proxy–Backend (Chat Grupal)


## 👥 Integrantes

- **Diana María Garzón Toro** - A00405150  
- **Samuel Navia Quiceno** - A00405006  
- **Nathalie Sánchez Trujillo** - A00405157  

---
## 🧩 Descripción General

Este proyecto integra un **cliente web** desarrollado en **HTML, CSS y JavaScript** con un **backend en Java** mediante el middleware **Ice (Internet Communications Engine)**.  
El cliente se comunica directamente con el servidor Java a través de **proxies Ice** sobre **WebSocket**, lo que permite implementar funcionalidades de **chat grupal, audio y llamadas** en tiempo (casi) real.

---

## ⚙️ Requisitos Previos

- **Java JDK 17 o superior**
- **Node.js (v16 o superior)**
- **npm** (incluido con Node.js, usado para construir/levantar el cliente web)
- **Navegador web moderno** (Chrome, Edge, Firefox, etc.)

---

## 🚀 Instrucciones para Ejecutar el Sistema

El sistema está compuesto por dos partes principales que deben ejecutarse en conjunto:

1. **Backend Java (Servidor Ice)**  
   - Implementa la lógica del chat: gestión de usuarios, grupos, historial, audio y llamadas.  
   - Expone el servicio remoto `ChatService` definido en Slice, accesible mediante Ice sobre WebSocket (`ws://localhost:9099`).  

2. **Cliente Web (Interfaz de Usuario)**  
   - Desarrollado en HTML, CSS y JavaScript, empaquetado con webpack.  
   - Utiliza la librería JavaScript de **Ice** y las clases generadas por `slice2js` para crear un *communicator* y obtener un **proxy remoto** a `ChatService`.  
   - Permite al usuario conectarse al chat, enviar y recibir mensajes, administrar grupos y manejar llamadas, actualizando la interfaz en tiempo real a partir de las notificaciones del servidor.

---

## 🔄 Flujo de Comunicación

El flujo de comunicación entre los distintos componentes es el siguiente:

1. El **cliente web** inicializa un *communicator* de Ice en JavaScript y obtiene un **proxy remoto** al servicio `ChatService` expuesto por el **servidor Java** (vía WebSocket `ws://localhost:9099`).  
2. El **cliente web** invoca operaciones remotas sobre ese proxy (registrarse, listar usuarios, enviar mensajes, crear grupos, iniciar llamadas, etc.) como si fueran métodos locales, pero en realidad se ejecutan en el servidor Ice.  
3. El **servidor Java** recibe cada invocación a través de Ice, ejecuta la lógica del chat (gestiona usuarios, grupos, historial, audio y llamadas) y, cuando es necesario, persiste la información mediante los repositorios.  
4. Además de devolver resultados al cliente que realizó la llamada, el **servidor** utiliza los *callbacks* de la interfaz `ChatCallback` para **notificar de forma asíncrona** a los clientes afectados (nuevo mensaje, usuario conectado/desconectado, grupo creado, llamada entrante, audio recibido, etc.).  
5. Cada **cliente web** recibe estas notificaciones a través de Ice, actualiza su estado local (listas de usuarios y grupos, mensajes, llamadas) y refresca la interfaz para reflejar los cambios en tiempo real.

Para usar el sistema es necesario que el **backend Java** y el **cliente web** estén corriendo simultáneamente.

---

## Terminal 1: Backend Java

cd src

Desde la raíz del proyecto, entra a la carpeta src
.\gradlew.bat runServer
Esto levantará el servidor Ice y mostrará en consola algo como:

Servidor Ice iniciado
Escuchando en ws://localhost:9099


---

## Terminal 2: Cliente Web

cd web-client
npm install
npm start


En la terminal verás algo similar a:

<i> [webpack-dev-server] On Your Network (IPv4): http://192.168.1.8:8080/

Abre en el navegador la URL indicada (normalmente `http://localhost:8080/`).

Asegúrate de que:

- El **backend Java (Servidor Ice)** esté corriendo sin errores.
- El **servidor de desarrollo del cliente web** esté levantado (webpack-dev-server).
- No haya errores críticos en las consolas.

Luego abre el cliente en el navegador y:

#### 🧑‍💻 Ingresa con tu nombre de usuario  
#### 💬 Chatea con los demás usuarios en tiempo real  
#### 🌍 Crea y participa en grupos con otros usuarios conectados  
#### 📞 Inicia y recibe llamadas entre usuarios o en grupos  
#### 🎤 Envía y recibe mensajes de voz dentro de las conversaciones

