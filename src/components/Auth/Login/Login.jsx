import React, { useState } from "react";
import { auth, googleProvider } from "../../../Firebase";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom"; 
import { UserIcon, LockClosedIcon, ArrowRightEndOnRectangleIcon } from "@heroicons/react/24/outline"; 

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); 
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false); 
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true); 
    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/");
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-7 transform hover:scale-[1.01] transition-transform duration-300 animate-fade-in border border-gray-100">
        <div className="text-center">
          <ArrowRightEndOnRectangleIcon className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">
            Welcome Back!
          </h1>
          <p className="text-gray-600 text-lg">Sign in to continue your journey</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="relative">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-gray-800 placeholder-gray-500 transition-all duration-200"
              required
            />
          </div>
          <div className="relative">
            <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-gray-800 placeholder-gray-500 transition-all duration-200"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-3 ${
              loading
                ? "bg-gray-500 cursor-not-allowed animate-pulse"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105"
            }`}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Logging In...
              </>
            ) : (
              "Log In"
            )}
          </button>
        </form>

        <div className="relative flex items-center py-4">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-sm">OR</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className={`w-full flex items-center justify-center py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300 shadow-md text-gray-700 font-medium ${loading ? 'cursor-not-allowed opacity-75' : ''}`}
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg" 
            alt="Google logo"
            className="w-6 h-6 mr-3"
          />
          Login with Google
        </button>

        <p className="text-center text-base text-gray-600 pt-4">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline transition-colors">
            Sign up
          </Link>
        </p>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Login;