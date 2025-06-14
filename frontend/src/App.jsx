import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';

import axios from 'axios';
import Room from './Room';

const Home = () => {
  const navigate = useNavigate();

  const createRoom = async () => {
  const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/create-room`);
    window.location.href = res.data.url;
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Professional Video Call App</h1>
      <button onClick={createRoom} style={{ padding: 10, fontSize: 16 }}>Create New Room</button>
    </div>
  );
};

const App = () => (
  <Router>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:roomId" element={<Room />} />
    </Routes>
  </Router>
);

export default App;
