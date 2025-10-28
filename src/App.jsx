import React from 'react'
import Dashboard from './components/Dashboard/Dashboard'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Signup from './components/Auth/SignUp/SignUp';
import Login from './components/Auth/Login/Login';
import SavedPitches from './components/SavedPitch/SavedPitches';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './PublicRoute';
import SharePitch from './components/SharePitch/SharePitch';


function App() {
  return (
    <div>

   <BrowserRouter>
    <AuthProvider>
      <Routes>
       
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard/>
            </ProtectedRoute>
          }
        />
        <Route path="/share/:id" element={<SharePitch />} />
        <Route
          path="/saved"
          element={
            <ProtectedRoute>
              <SavedPitches />
            </ProtectedRoute>
          }
        />

        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
    </div>
  )
}

export default App
