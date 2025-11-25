# 💬 Proyecto: Integración Cliente–Proxy–Backend (Chat Grupal)


## 👥 Integrantes

- **Diana María Garzón Toro** - A00405150  
- **Samuel Navia Quiceno** - A00405006  
- **Nathalie Sánchez Trujillo** - A00405157  

# 📡 Sistema de Chat con Ice y WebSocket

## 🧩 Descripción General

Este proyecto integra un **cliente web** desarrollado en **HTML, CSS y JavaScript** con un **backend en Java** mediante una arquitectura híbrida que combina:

- **Ice (Internet Communications Engine)**: Para mensajería, gestión de usuarios, grupos e historial mediante RPC sobre WebSocket.
- **WebSocket nativo**: Para streaming de audio en tiempo real durante llamadas individuales y grupales.

El cliente web se comunica con el servidor Java a través de **proxies Ice** sobre WebSocket (`ws://localhost:9099`) para operaciones de chat, y mediante **WebSocket directo** (`ws://localhost:9098`) para audio de llamadas, permitiendo funcionalidades de **chat grupal, notas de voz y llamadas de voz** en tiempo real.

---

## ⚙️ Requisitos Previos

- **Java JDK 17 o superior**
- **Gradle** (incluido en el proyecto mediante Gradle Wrapper)
- **Node.js (v16 o superior)**
- **npm** (incluido con Node.js)
- **Navegador web moderno** con soporte para WebAudio API y WebSocket (Chrome, Edge, Firefox, Safari)

---

## 🏗️ Arquitectura del Sistema

### Backend Java

El servidor Java ejecuta **dos servidores simultáneamente**:

1. **Servidor Ice RPC** (Puerto 9099)
   - Gestiona usuarios, mensajería privada/grupal, historial y notas de voz
   - Usa callbacks bidireccionales para notificaciones en tiempo real
   - Protocolo: Ice sobre WebSocket

2. **Servidor WebSocket de Audio** (Puerto 9098)
   - Maneja streaming de audio PCM en tiempo real para llamadas
   - Implementado con Tyrus (JSR-356)
   - Retransmite chunks de audio entre participantes de llamadas

### Cliente Web

El cliente JavaScript utiliza:

- **Ice.js**: Para comunicación RPC con el backend (mensajes, grupos, señalización)
- **WebSocket nativo**: Para envío/recepción de audio durante llamadas
- **Web Audio API**: Para captura y reproducción de audio en tiempo real

---

## 🚀 Instrucciones para Ejecutar el Sistema

El sistema requiere que **ambos servidores** (Ice RPC y WebSocket de audio) estén corriendo simultáneamente, junto con el cliente web.

### Terminal 1: Backend Java

cd src
.\gradlew clean build
.\gradlew runServer

text

Deberías ver en consola:

✅ Servidor Ice iniciado en ws://localhost:9099
✅ Servidor WebSocket iniciado en ws://localhost:9098
🚀 Servidor completo activo:

Mensajes/Grupos: Ice RPC (puerto 9099)

Audio llamadas: WebSocket (puerto 9098)

text

### Terminal 2: Cliente Web

cd web-client
npm install
npm start

text

El servidor de desarrollo mostrará:

<i> [webpack-dev-server] On Your Network (IPv4): http://192.168.1.8:8080/

text

Abre en el navegador `http://localhost:8080/`

---

## 🔄 Flujo de Comunicación

### Mensajería y Gestión (Ice RPC)

1. El **cliente web** inicializa un *communicator* de Ice en JavaScript y obtiene un **proxy remoto** al servicio `ChatService` expuesto por el **servidor Java** (vía `ws://localhost:9099`).
2. El **cliente** invoca operaciones remotas sobre ese proxy (registrarse, listar usuarios, enviar mensajes, crear grupos, etc.) como si fueran métodos locales, ejecutándose realmente en el servidor.
3. El **servidor Java** recibe cada invocación a través de Ice, ejecuta la lógica del chat y persiste información mediante repositorios.
4. El **servidor** utiliza los *callbacks* de la interfaz `ChatCallback` para **notificar de forma asíncrona** a los clientes afectados (nuevo mensaje, usuario conectado/desconectado, grupo creado, etc.).
5. Cada **cliente web** recibe estas notificaciones a través de Ice y actualiza su interfaz en tiempo real.

### Audio de Llamadas (WebSocket + Web Audio API)

1. El **cliente** se conecta al servidor WebSocket de audio (`ws://localhost:9098/ws/audio/{username}`) al iniciar sesión.
2. Al **iniciar una llamada**, el cliente envía señalización de control por Ice RPC y por WebSocket.
3. El **Web Audio API** captura audio del micrófono, lo convierte a **PCM Int16** y lo envía en chunks por WebSocket cada ~250ms.
4. El **servidor WebSocket** retransmite los chunks de audio a los participantes de la llamada (sin procesamiento).
5. Los **clientes receptores** reciben chunks PCM, los convierten a Float32 y los reproducen con `AudioBufferSourceNode` sincronizado para evitar cortes.

---

## ✅ Verificación del Sistema

Asegúrate de que:

- El **backend Java** muestre ambos servidores activos sin errores
- El **servidor de desarrollo del cliente web** esté levantado (webpack-dev-server)
- No haya errores críticos en las consolas del navegador (F12)

---

## 🎯 Funcionalidades

### 🧑‍💻 Gestión de Usuarios
- Registro con nombre único
- Visualización de usuarios conectados en tiempo real
- Notificaciones de conexión/desconexión

### 💬 Mensajería
- **Chat privado**: Mensajes directos entre dos usuarios
- **Chat grupal**: Conversaciones con múltiples participantes
- **Historial persistente**: Los mensajes se almacenan y pueden consultarse

### 🎤 Audio
- **Notas de voz**: Grabación y envío de mensajes de audio (hasta 5 segundos)
- **Llamadas individuales**: Comunicación de voz en tiempo real entre dos usuarios
- **Llamadas grupales**: Conferencias de voz con múltiples participantes

### 👥 Grupos
- Creación de grupos de chat
- Añadir usuarios a grupos existentes
- Envío de mensajes y audios a grupos
- Llamadas grupales con audio sincronizado





