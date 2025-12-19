import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import axios from "axios";


const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors:{
        origin:"*",
    },
});

const rooms = new Map();
// roomId => {
//   users: Set,
//   code: string,
//   language: string
// }


io.on("connection",(socket)=>{
    console.log("User connected", socket.id);

    let currentRoom = null;
    let currentUser = null;
    
    socket.on("join", ({ roomId, userName }) => {
        currentRoom = roomId;
        currentUser = userName;

        socket.join(roomId);

        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                users: new Set(),
                code: "// start code here",
                language: "javascript",
        });
    }

    const room = rooms.get(roomId);
    room.users.add(userName);

    socket.emit("roomState", {
        users: Array.from(room.users),
        code: room.code,
        language: room.language,
    });

    io.to(roomId).emit(
        "userJoined",
        Array.from(room.users)
    );
});


    socket.on("codeChange", ({ roomId, code }) => {
        if (rooms.has(roomId)) {
        rooms.get(roomId).code = code;
        }
        socket.to(roomId).emit("codeUpdate", code);
    });


    socket.on("leaveRoom", () => {
        if (currentRoom && currentUser && rooms.has(currentRoom)) {
            const room = rooms.get(currentRoom);

            room.users.delete(currentUser);

            if (room.users.size === 0) {
                rooms.delete(currentRoom); // cleanup empty room
            } else {
                io.to(currentRoom).emit(
                "userJoined",
                Array.from(room.users)
            );
        }

        socket.leave(currentRoom);
        currentRoom = null;
        currentUser = null;
        }   
    });


    socket.on("typing", ({ roomId, userName, socketId }) => {
        if (!userName) return;
        socket.to(roomId).emit("userTyping", { userName, socketId });
    });


    socket.on("languageChange", ({ roomId, language }) => {
        if (rooms.has(roomId)) {
            rooms.get(roomId).language = language;
        }
        socket.to(roomId).emit("languageUpdate", language);
    });

    socket.on("compileCode", async ({ code, roomId, language, version }) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      const response = await axios.post(
        "https://emkc.org/api/v2/piston/execute",
        {
          language,
          version,
          files: [
            {
              content: code,
            },
          ],
        }
      );

      room.output = response.data.run.output;
      io.to(roomId).emit("codeResponse", response.data);
    }
  });

    socket.on("disconnect", () => {
        if (currentRoom && currentUser && rooms.has(currentRoom)) {
        const room = rooms.get(currentRoom);

        room.users.delete(currentUser);

        if (room.users.size === 0) {
            rooms.delete(currentRoom);
            } else {
                io.to(currentRoom).emit(
                "userJoined",
                Array.from(room.users)
            );
        }

        socket.leave(currentRoom);
        }

        console.log("User Disconnected");
    });


});

const port = process.env.PORT || 5000;

const __dirname = path.resolve();

app.use(express.static(path.join(__dirname, "/frontend/dist")));

app.get("*", (req, res)=>{
    res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
});

server.listen(port, () => {
    console.log("server is working on port 5000");
});