// client/src/VideoCall.js
import React, { useEffect, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const VideoCall = ({ roomId }) => {
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const peer = useRef(null);

  useEffect(() => {
    socket.emit('join', roomId);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localVideo.current.srcObject = stream;

        peer.current = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
          ]
        });

        stream.getTracks().forEach(track => peer.current.addTrack(track, stream));

        peer.current.onicecandidate = e => {
          if (e.candidate) {
            socket.emit('ice-candidate', { room: roomId, candidate: e.candidate });
          }
        };

        peer.current.ontrack = e => {
          remoteVideo.current.srcObject = e.streams[0];
        };

        socket.on('user-joined', async () => {
          const offer = await peer.current.createOffer();
          await peer.current.setLocalDescription(offer);
          socket.emit('offer', { room: roomId, offer });
        });

        socket.on('offer', async offer => {
          await peer.current.setRemoteDescription(offer);
          const answer = await peer.current.createAnswer();
          await peer.current.setLocalDescription(answer);
          socket.emit('answer', { room: roomId, answer });
        });

        socket.on('answer', async answer => {
          await peer.current.setRemoteDescription(answer);
        });

        socket.on('ice-candidate', async candidate => {
          try {
            await peer.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error('Error adding received ICE candidate', err);
          }
        });
      });

  }, [roomId]);

  return (
    <div>
      <h2>Room: {roomId}</h2>
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginTop: '20px'
      }}>
        <div>
          <h3>You</h3>
          <video ref={localVideo} autoPlay playsInline muted width="400" height="300" style={{ borderRadius: '10px' }} />
        </div>
        <div>
          <h3>Team Member</h3>
          <video ref={remoteVideo} autoPlay playsInline width="400" height="300" style={{ borderRadius: '10px' }} />
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
