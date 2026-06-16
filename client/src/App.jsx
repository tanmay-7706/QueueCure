/**
 * App.jsx — Root component with client-side routing.
 *
 * Routes:
 *   "/" → ReceptionistView (Receptionist Console)
 *   "/display" → PatientDisplayView (Patient Waiting-Room Display)
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ReceptionistView from './pages/ReceptionistView';
import PatientDisplayView from './pages/PatientDisplayView';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ReceptionistView />} />
        <Route path="/display" element={<PatientDisplayView />} />
      </Routes>
    </BrowserRouter>
  );
}
