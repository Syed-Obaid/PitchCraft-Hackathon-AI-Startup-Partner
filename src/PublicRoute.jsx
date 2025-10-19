import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

const PublicRoute = ({ children }) => {
  const { user } = useAuth();

  // 👇 Agar user logged in hai to dashboard pe bhej do
  if (user) {
    return <Navigate to="/" replace />;
  }

  // 👇 Agar user logged in nahi hai to login/signup page dikhne do
  return children;
};

export default PublicRoute;
