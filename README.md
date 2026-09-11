# Real-Time Communication App

A full-stack real-time communication and collaboration application developed as part of the **CodeAlpha Full Stack Development Internship**.

The application allows authenticated users to create and join online meetings with real-time video communication, screen sharing, file sharing, and collaborative whiteboard functionality.

---

## 🚀 Features

### 🔐 User Authentication
- User registration
- User login
- Password hashing using bcryptjs
- JWT-based authentication
- Protected API routes
- Protected frontend routes

### 🎥 Real-Time Video Calling
- Multi-user video communication
- Camera access using WebRTC
- Real-time peer-to-peer communication
- Automatic handling of remote video streams

### 🖥️ Screen Sharing
- Share the user's screen during a meeting
- Uses the browser's `getDisplayMedia()` API
- Screen sharing can be started and stopped during a meeting

### 📁 File Sharing
- Share files with meeting participants
- Real-time file transfer using Socket.IO
- Received files can be downloaded
- File size is limited for safe transmission

### 🎨 Collaborative Whiteboard
- Real-time drawing canvas
- Multiple participants can collaborate
- Drawing updates are synchronized using Socket.IO
- Clear whiteboard functionality

### 👥 Meeting Management
- Create unique meeting rooms
- Join meetings using a meeting ID
- Real-time participant count
- Leave meeting functionality
- Meeting validation through the backend

### 🔒 Security
- Passwords are hashed using bcryptjs
- JWT authentication for REST APIs
- JWT authentication for Socket.IO connections
- Protected meeting APIs
- Authenticated users only
- Environment variables used for sensitive configuration

---

## 🛠️ Technologies Used

### Frontend

- React
- Vite
- React Router
- Axios
- Socket.IO Client
- WebRTC
- Canvas API
- CSS

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.IO
- JWT
- bcryptjs
- CORS

### Development Tools

- Visual Studio Code
- Git
- GitHub
- Thunder Client
- MongoDB

---

## 🏗️ Project Architecture

```text
                         ┌──────────────────────┐
                         │     React Frontend   │
                         │                      │
                         │  Dashboard / Meeting │
                         └──────────┬───────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
               REST API                        Socket.IO
                    │                               │
                    ▼                               ▼
          ┌─────────────────┐             ┌─────────────────┐
          │ Express / Node   │             │ Real-Time Server│
          │     Backend     │             │                 │
          └────────┬────────┘             └────────┬────────┘
                   │                               │
                   ▼                               │
          ┌─────────────────┐                      │
          │    MongoDB      │                      │
          │   + Mongoose    │                      │
          └─────────────────┘                      │
                                                   │
                                                   ▼
                                             ┌──────────────┐
                                             │    WebRTC    │
                                             │ Video/Audio  │
                                             └──────────────┘
```

---

## 📂 Project Structure

```text
CodeAlpha_RealTimeCommunicationApp/
│
├── backend/
│   ├── config/
│   │   └── db.js
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   └── meetingController.js
│   │
│   ├── middleware/
│   │   └── protect.js
│   │
│   ├── models/
│   │   ├── User.js
│   │   └── Meeting.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── meetingRoutes.js
│   │
│   ├── sockets/
│   │   └── meetingSocket.js
│   │
│   ├── .env
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── VideoPlayer.jsx
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── Meeting.jsx
│   │   │
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── socket.js
|   |   |
|   |   ├── styles/
|   |   |   ├── auth.css
│   │   │   └── dashboard.css
│   │   │   └── home.css
│   │   │   └── meeting.css
│   │   │   
│   │   ├── App.jsx
|   |   ├── global.css
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   └── package.json
│
├── docs/
│   └── DEVELOPMENT_LOG.md
│
├── .gitignore
└── README.md
```

## ⚙️ Installation

### Clone the Repository

    ```bash
    git clone https://github.com/krishnamahatma21/CodeAlpha_RealTimeCommunicationApp.git
    ```

    ```bash
    cd CodeAlpha_RealTimeCommunicationApp
    ```

## 🔧 Backend Setup

**Open the backend directory:**

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a **.env** file inside the **backend** folder:

```bash
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/real_time_communication
JWT_SECRET=your_jwt_secret
```

**Start the backend:**

```bash
node server.js
```

The backend will run on:

```bash
http://localhost:5000
```

## 💻 Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

The frontend will normally run on:

```bash
http://localhost:5173
```
---

## 🔑 Authentication Flow 

```text
User
 │
 ▼
Register / Login
 │
 ▼
Express API
 │
 ▼
MongoDB
 │
 ▼
JWT Token
 │
 ▼
Frontend localStorage
 │
 ├── REST API Authentication
 │
 └── Socket.IO Authentication
 ```
 The application uses JWT tokens to authenticate users.

 Passwords are never stored as plain text. They are securely hashed using **bcryptjs**.

 ---

 ## 📡 Real-Time Communication

 **Socket.IO is used for real-time communication between connected clients.**

 The application uses Socket.IO for:

 - Joining meeting rooms
 - Participant updates
 - WebRTC signaling
 - File sharing
 - Whiteboard drawing
 - Whiteboard clearing
 - Participant count updates
 - Leaving meetings
  
---

## 🌐 WebRTC

WebRTC is used for real-time peer-to-peer audio/video communication.

The application exchanges WebRTC signaling information through Socket.IO:

```text
Client A
   │
   │ WebRTC Offer
   ▼
Socket.IO Server
   │
   ▼
Client B
   │
   │ WebRTC Answer
   ▼
Socket.IO Server
   │
   ▼
Client A
```
ICE candidates are also exchanged through Socket.IO to establish the peer connection.

---

## 🖥️ Screen Sharing

Screen sharing uses the browser's:

```bash
navigator.mediaDevices.getDisplayMedia()
```

This allows users to select and share their screen or a specific application window during a meeting.

---

## 📁 File Sharing

Files are transferred through Socket.IO between participants.

The application includes a file-size restriction to prevent excessively large files from being transmitted through the real-time connection.

---

## 🎨 Collaborative Whiteboard

The whiteboard uses the browser Canvas API.

Drawing actions are sent through Socket.IO:

```text
User A
   │
   │ Drawing Data
   ▼
Socket.IO
   │
   ▼
User B
   │
   ▼
Canvas
```
Participants can draw collaboratively and clear the whiteboard in real time.

---

## 🔌 API Endpoints

### Authentication

┌──────────────┌─────────────────────────┌─────────────────────────────────┐
|**Method**    |**EndPoint**             |**Description**                  |
├──────────────├─────────────────────────├─────────────────────────────────|
|POST          |***/api/auth/register*** |Register a new user              |
├──────────────├─────────────────────────├─────────────────────────────────|
|POST          |***/api/auth/login***    |Login user                       |
├──────────────├─────────────────────────├─────────────────────────────────|
|GET           |***/api/auth/profile***  |Access authenticated user profile|
└──────────────┴─────────────────────────┴─────────────────────────────────┘

### Meetings

┌──────────────┌────────────────────────────────┌──────────────────────────────────────────┐
|**Method**    |**EndPoint**                    |**Description**                           |
├──────────────├────────────────────────────────├──────────────────────────────────────────|
|POST          |***/api/meetings***             |Create a new meeting                      |
├──────────────├────────────────────────────────├──────────────────────────────────────────|
|GET           |***/api/meetings/join/:roomId***|Join an existing meeting                  |
└──────────────┴────────────────────────────────┴──────────────────────────────────────────┘
Protected endpoints require a valid JWT token.

---

## 🧪 API Testing

Backend APIs were tested using Thunder Client.

The following functionality was tested:

- User registration
- User login
- JWT authentication
- Protected routes
- Meeting creation
- Meeting joining
- Invalid meeting handling
---

## 🔒 Security Implementation

The application includes several security measures:
- JWT authentication
- Password hashing using bcryptjs
- Protected Express routes
- Socket.IO authentication middleware
- JWT verification for Socket.IO connections
- Environment variables for sensitive configuration
- Meeting validation
- File-size restriction

---

## 📱 Application Pages

The application includes:

**1.** Register
**2.** Login
**3.** Dashboard
**4.** Meeting Room

The Dashboard allows users to:

- Create a meeting
- Join an existing meeting
- View their account information

The Meeting Room provides:

- Video calling
- Camera controls
- Microphone controls
- Screen sharing
- File sharing
- Collaborative whiteboard
- Participant count
- Leave meeting functionality

---

## 🚀 Future Improvements

- Possible future improvements include:
- Audio-only calling
- Chat messaging
- Meeting history
- Persistent file storage
- Cloud deployment
- TURN/STUN server configuration
- Improved peer connection management
- Larger-scale multi-user conferencing
- Meeting scheduling
- User profile management
- End-to-end encryption improvements

---

## 🎓 Internship Project

This project was developed as part of the:

**CodeAlpha Full Stack Development Internship**

**Task**

**Task 4 — Real-Time Communication App**

The project demonstrates practical implementation of:

- Full-stack web development
- REST APIs
- Authentication
- MongoDB
- Socket.IO
- WebRTC
- Real-time collaboration
- Git and GitHub
---

## 👨‍💻 Author

**Krishna Mahatma**

**BCA Student | Full-Stack Developer**

---

## 📄 License

This project was created for educational and internship purposes.