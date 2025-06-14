import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';

const socket = io('http://192.168.1.16:5000');

const Room = () => {
  const { roomId } = useParams();
  const [peers, setPeers] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [message, setMessage] = useState("");
  const localVideo = useRef();
  const streams = useRef({});

 useEffect(() => {
  const peerConnections = {};

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Your browser doesn't support webcam access or getUserMedia.");
    return;
  }

  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
      localVideo.current.srcObject = stream;

      socket.emit('join-room', { roomId, userName: "User" });

      socket.on('user-list', users => {
        users.forEach(userId => {
          if (userId === socket.id) return;

          const pc = createPeerConnection(userId);
          stream.getTracks().forEach(track => pc.addTrack(track, stream));
          pc.createOffer().then(offer => {
            pc.setLocalDescription(offer);
            socket.emit('send-offer', { sdp: offer, target: userId });
          });
          peerConnections[userId] = pc;
        });
      });

      socket.on('user-connected', userId => {
        const pc = createPeerConnection(userId);
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        peerConnections[userId] = pc;
      });

      socket.on('receive-offer', async ({ sdp, caller }) => {
        const pc = createPeerConnection(caller);
        peerConnections[caller] = pc;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('send-answer', { sdp: answer, target: caller });
      });

      socket.on('receive-answer', async ({ sdp, callee }) => {
        await peerConnections[callee].setRemoteDescription(new RTCSessionDescription(sdp));
      });

      socket.on('receive-ice', ({ candidate, from }) => {
        if (peerConnections[from]) {
          peerConnections[from].addIceCandidate(new RTCIceCandidate(candidate));
        }
      });

      socket.on('user-disconnected', id => {
        if (peerConnections[id]) peerConnections[id].close();
        setPeers(prev => {
          const newPeers = { ...prev };
          delete newPeers[id];
          return newPeers;
        });
      });

      function createPeerConnection(id) {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.onicecandidate = e => {
          if (e.candidate) {
            socket.emit('send-ice', { target: id, candidate: e.candidate });
          }
        };

        pc.ontrack = e => {
          setPeers(prev => ({ ...prev, [id]: e.streams[0] }));
        };

        return pc;
      }
    });
  }, [roomId]);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit('send-chat', { roomId, message, sender: "User" });
      setMessage("");
    }
  };

  useEffect(() => {
    socket.on('receive-chat', data => {
      setChatMessages(prev => [...prev, data]);
    });
  }, []);

 return (
  <div style={{ padding: 20 }}>
    <h2>Room ID: {roomId}</h2>

    <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
      {/* My Video */}
      <div style={{ flex: '1' }}>
        <h3>My Video</h3>
        <video ref={localVideo} autoPlay muted playsInline width="300" style={{ border: '2px solid blue' }} />
      </div>

      {/* Team Video(s) */}
      <div style={{ flex: '1' }}>
        <h3>Team Video(s)</h3>
        {Object.entries(peers).length === 0 && <p>No teammates connected.</p>}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {Object.entries(peers).map(([id, stream]) => (
            <video
              key={id}
              autoPlay
              playsInline
              width="300"
              ref={el => el && (el.srcObject = stream)}
              style={{ border: '2px solid green' }}
            />
          ))}
        </div>
      </div>
    </div>

    {/* Chat Section */}
    <div style={{ marginTop: 20 }}>
      <h3>Chat</h3>
      <div style={{ height: 150, overflowY: 'auto', border: '1px solid #ccc', padding: 10 }}>
        {chatMessages.map((msg, idx) => (
          <div key={idx}><strong>{msg.sender}:</strong> {msg.message}</div>
        ))}
      </div>
      <input
        type="text"
        value={message}
        onChange={e => setMessage(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && sendMessage()}
        placeholder="Type a message..."
      />
      <button onClick={sendMessage}>Send</button>
    </div>

    {/* End Call Button */}
    <button
      onClick={() => window.location.href = '/'}
      style={{ marginTop: 20, padding: 10, background: 'red', color: '#fff' }}>
      End Call
    </button>
  </div>
);

};

export default Room;
