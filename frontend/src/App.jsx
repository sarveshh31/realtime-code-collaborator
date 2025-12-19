import { useState } from "react";
import "./App.css";
import io from "socket.io-client";
import Editor from "@monaco-editor/react";
import { useEffect } from "react";

const socket = io("http://localhost:5000");

const App = () => {
  const [socketId, setSocketId] = useState("");
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("// start code here");
  const [copySucccess, setCopySuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const [outPut, setOutPut] = useState("");
  const [version, setVersion] = useState("*");


  useEffect(()=>{
    socket.on("userJoined", (users)=>{
      setUsers(users);
    });

    socket.on("codeUpdate", (newCode) => {
      setCode(newCode);
    });

    socket.on("userTyping", ({ userName, socketId: senderId }) => {
      if (senderId === socketId) return;
      setTyping(`${userName.slice(0,8)}... is typing`);
      setTimeout(() => setTyping(""), 1500);
    });

    socket.on("connect", () => {
      setSocketId(socket.id);
    });

    socket.on("languageUpdate", (newLanguage)=>{
      setLanguage(newLanguage);
    });

    socket.on("roomState", ({ users, code, language }) => {
      setUsers(users);
      setCode(code);
      setLanguage(language);
    });

    socket.on("codeResponse", (response) => {
      setOutPut(response.run.output);
    });


    return () => {
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("userTyping");
      socket.off("connect");
      socket.off("languageUpdate");
      socket.off("roomState");
      socket.off("codeResponse");
    };
  }, []);

  useEffect(()=>{
    const handleBeforeUnload = () => {
      socket.emit("leaveRoom");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return()=>{
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const generateRoomId = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const segment = (length) =>
      Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");

    const id = `${segment(5)}-${segment(5)}-${segment(5)}`;
    setRoomId(id);
    };


  const joinRoom = () =>{
    if(roomId && userName){
      socket.emit("join", {roomId, userName});
      setJoined(true);
    }
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom");
    setJoined(false);
    setRoomId("");
    setUserName("");
    setCode("// start code here");
    setLanguage("javascript");
  };

  const copyRoomId = () =>{
    navigator.clipboard.writeText(roomId);
    setCopySuccess("Copied!");
    setTimeout(()=>setCopySuccess(""), 2000);
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", {roomId, code: newCode});
    socket.emit("typing", {roomId, userName, socketId});
  };

  const handleLanguageChange = e =>{
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    socket.emit("languageChange", {roomId, language: newLanguage});
  }

  const runCode = () => {
    socket.emit("compileCode", { code, roomId, language, version });
  };

  if (!joined) {
  return (
    <div className="auth-container">
      <div className="auth-left">
        <h1>Realtime Code Collab</h1>
        <p>
          Collaborate, code, and learn together in real time.
          Share rooms instantly and build faster with your team.
        </p>
      </div>

      <div className="auth-right">
        <div className="join-form">
          <h2>Join Code Room</h2>

          <input
            type="text"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />

          <input
            type="text"
            placeholder="Your Name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />

          <button className="primary-btn" onClick={joinRoom}>
            Join Room
          </button>

          <button className="secondary-btn" onClick={generateRoomId}>
            Generate Room ID
          </button>
        </div>
      </div>
    </div>
  );
}


  return (
    <div className="editor-container">
      <div className="sidebar">
        <div className="room-info">
          <h2>Code Room<span>{roomId}</span></h2>
          <button onClick={copyRoomId} className="copy-button">
            Copy Id
          </button>
          {copySucccess && <span className="copy-success">{copySucccess}</span>}
        </div>
        <h3>Users in Room:</h3>
        <ul className="users-list">
          {
            users.map((user, index)=>(
              <li key={index}>{user.slice(0,8)}...</li>
            ))
          }

        </ul>
        <p className="typing-indicator">{typing}</p>
        <select className = "language-selector" 
        value={language} 
        onChange={handleLanguageChange}>

         <option value="javascript">JavaScript</option>
         <option value="python">Python</option>
         <option value="java">Java</option>
         <option value="cpp">C++</option> 
        </select>
        <button className="leave-button" onClick={leaveRoom}>Leave Room</button>
      </div>

      <div className="editor-wrapper">

        <div className="editor-box">
  <Editor
    height="100%"
    language={language}
    value={code}
    onChange={handleCodeChange}
    theme="vs-dark"
    options={{
      minimap: { enabled: false },
      fontSize: 14,
    }}
  />
</div>

<div className="run-bar">
  <span className="run-label">▶ Run Code</span>
  <button className="run-btn" onClick={runCode}>
    Execute
  </button>
</div>

<div className="output-box">
  <div className="output-header">Output</div>
  <pre className="output-console">
    {outPut || "▶ Run your code to see output here"}
  </pre>
</div>


      </div>
    </div>
  );
};

export default App;