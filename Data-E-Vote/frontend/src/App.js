import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./Components/Login/Login";
import AdminLogin from "./Components/AdminLogin/AdminLogin";
import AdminDashboard from "./Components/AdminDashboard/AdminDashboard";
import Voting from "./Components/Voting/Voting";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/voting" element={<Voting />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
