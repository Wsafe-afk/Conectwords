import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home.js';
import { JoinModal } from './pages/JoinModal.js';
import { RoomPage } from './pages/RoomPage.js';
import { InvitePage } from './pages/InvitePage.js';

export const App: React.FC = () => {
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Home onOpenJoinModal={() => setIsJoinOpen(true)} />
              <JoinModal isOpen={isJoinOpen} onClose={() => setIsJoinOpen(false)} />
            </>
          }
        />
        <Route path="/s/:code" element={<InvitePage />} />
        <Route path="/room/:code" element={<RoomPage />} />
      </Routes>
    </BrowserRouter>
  );
};
