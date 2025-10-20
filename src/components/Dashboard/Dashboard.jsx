import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../Firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import jsPDF from "jspdf";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function App() {
  const [idea, setIdea] = useState("");
  const [tone, setTone] = useState("Formal");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [landingCode, setLandingCode] = useState("");
  const [showLandingModal, setShowLandingModal] = useState(false);
  const [loadingLanding, setLoadingLanding] = useState(false);
  const [showLandingPreview, setShowLandingPreview] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // ✅ Generate Pitch
  const handleGenerate = async () => {
    if (!idea.trim()) return alert("Please enter your startup idea!");
    setLoading(true);
    setResponse("");

    try {
      const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

      const prompt = `
Startup Idea: ${idea}
Tone: ${tone}

Return a well-structured startup pitch in clean **Markdown** format with these sections:
# Startup Name
## Tagline
### Elevator Pitch
#### Problem
#### Solution
#### Target Audience
#### Key Features
#### Monetization
### Landing Page Content
Make sure headings are bold and formatted with proper markdown syntax.
      `;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      const data = await res.json();
      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No text returned from AI.";
      setResponse(text);
    } catch (err) {
      console.error(err);
      alert("Error generating pitch.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Generate Landing Page HTML + CSS
  const handleGenerateLandingPage = async () => {
    if (!response) return alert("Please generate a pitch first!");
    setLoadingLanding(true);
    setLandingCode("");

    try {
      const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
      const prompt = `
Based on this startup pitch:
${response}

Generate a modern, responsive **landing page** using **HTML + CSS only** (no frameworks).
Sections: Hero, About, Problem, Solution, Features, CTA.
Include placeholder images using "https://picsum.photos/seed/startup/800/400".
Use a clean layout, nice font, button hover effects, and soft color palette.
Return full code wrapped in <html>, <style>, and <body> tags.
      `;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      const data = await res.json();
      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No HTML/CSS returned.";
      setLandingCode(text);
      setShowLandingModal(true);
    } catch (err) {
      console.error(err);
      alert("Error generating landing page code.");
    } finally {
      setLoadingLanding(false);
    }
  };

  // ✅ Save Pitch
  const handleSavePitch = async () => {
    if (!user) return alert("Please login first!");
    if (!idea || !response) return alert("Generate a pitch first!");

    try {
      await addDoc(collection(db, "pitches"), {
        uid: user.uid,
        idea,
        tone,
        response,
        createdAt: serverTimestamp(),
      });
      alert("Pitch saved ✅");
    } catch (err) {
      console.error(err);
      alert("Error saving pitch ❌");
    }
  };

  // ✅ Save as PDF
  const handleSavePDF = () => {
    if (!response) return alert("Generate a pitch first!");
    const plainText = response
      .replace(/[#*_`>~\-]/g, "")
      .replace(/\n{2,}/g, "\n\n")
      .trim();

    const doc = new jsPDF();
    const lines = doc.splitTextToSize(plainText, 180);
    doc.text(lines, 10, 10);
    doc.save("PitchCraft_Pitch.pdf");
  };

  const handleRegenerate = () => handleGenerate();

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900/80 border-r border-gray-700 flex flex-col justify-between">
        <div>
          <div className="p-6 text-2xl font-bold text-indigo-400 border-b border-gray-700">
            ⚡ PitchCraft
          </div>
          <nav className="p-4 space-y-2">
            <Link
              to="/"
              className="block px-3 py-2 rounded-lg bg-gray-800/60 hover:bg-indigo-600/40 transition"
            >
              ✨ Create Pitch
            </Link>
            <Link
              to="/saved"
              className="block px-3 py-2 rounded-lg bg-gray-800/60 hover:bg-indigo-600/40 transition"
            >
              💾 Saved Pitches
            </Link>
          </nav>
        </div>

        {user && (
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={logout}
              className="w-full py-2 bg-red-600 hover:bg-red-700 rounded-lg"
            >
              Logout
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="flex justify-between items-center px-6 py-4 bg-gray-900/70 border-b border-gray-700">
          <h1 className="text-xl font-semibold text-indigo-400">
            AI Startup Partner 🚀
          </h1>
          {user ? (
            <div className="flex items-center gap-3">
              <span>👋 {user.displayName || user.email}</span>
              <img
                src={
                  user.photoURL ||
                  "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png"
                }
                alt="user"
                className="w-8 h-8 rounded-full"
              />
            </div>
          ) : (
            <div className="space-x-3">
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2 bg-gray-800 rounded-lg"
              >
                Login
              </button>
              <button
                onClick={() => navigate("/signup")}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Signup
              </button>
            </div>
          )}
        </header>

        {/* Input + Output */}
        <div className="flex-1 flex flex-col items-center px-6 py-8 overflow-y-auto">
          {/* Input */}
          <div className="w-full max-w-2xl bg-gray-900/70 border border-gray-700 rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-2xl font-semibold text-indigo-400 mb-4 text-center">
              Generate Your Startup Pitch 🚀
            </h2>

            <div className="relative">
              <textarea
                value={loading ? "" : idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Describe your startup idea..."
                disabled={loading}
                className="w-full h-40 p-4 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              {/* {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800/70 rounded-lg">
                  <div className="flex flex-col items-center">
                    <div className="loader mb-2 w-8 h-8 border-4 border-t-indigo-500 border-gray-600 rounded-full animate-spin"></div>
                    <span className="text-gray-300">Generating pitch...</span>
                  </div>
                </div>
              )} */}


              {loading && (
  <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-gray-950/80 rounded-lg border border-gray-800 shadow-inner">
    <div className="flex flex-col items-center">
      <div className="relative mb-3">
        <div className="w-10 h-10 border-4 border-gray-700 border-t-indigo-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 rounded-full blur-md bg-indigo-500/20 animate-pulse"></div>
      </div>
      <span className="text-indigo-300 font-medium tracking-wide">
        Generating pitch...
      </span>
    </div>
  </div>
)}
            </div>

            <div className="flex justify-between mt-4">
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              >
                <option value="Formal">Formal</option>
                <option value="Fun">Fun</option>
              </select>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className={`px-6 py-2 rounded-lg font-semibold ${
                  loading
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {loading ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>

          {/* Output */}
          {response && (
            <div className="w-full max-w-2xl bg-gray-900/70 border border-gray-700 rounded-2xl shadow-xl p-6">
              <div className="flex justify-center mb-4">
                <button
                  onClick={handleGenerateLandingPage}
                  disabled={loadingLanding}
                  className={`px-5 py-2 font-semibold rounded-lg transition ${
                    loadingLanding
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-pink-600 hover:bg-pink-700"
                  }`}
                >
                  {loadingLanding ? "Generating..." : "🧱 Landing Page Code"}
                </button>
              </div>

              {/* Markdown Output with Section Backgrounds */}
              <div className="space-y-4">
                
                  {response
  .replace(/^.*?(?=# )/s, "")
  .split(/(?=# )/)
  .filter((section) => section.trim() !== "" && !section.toLowerCase().includes("here"))
  .map((section, index) => (
                    <div
                      key={index}
                      className={`p-5 rounded-xl shadow-md ${
                        index % 4 === 0
                          ? "bg-gradient-to-r from-gray-800 to-gray-900"
                          : index % 4 === 1
                          ? "bg-gradient-to-r from-indigo-900/40 to-purple-900/40"
                          : index % 4 === 2
                          ? "bg-gradient-to-r from-teal-900/40 to-cyan-900/40"
                          : "bg-gradient-to-r from-pink-900/40 to-rose-900/40"
                      }`}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => (
                            <h1 className="text-2xl font-bold text-indigo-400 mb-2">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-xl font-semibold text-purple-300 mb-2">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-lg font-semibold text-teal-300 mb-2">
                              {children}
                            </h3>
                          ),
                          h4: ({ children }) => (
                            <h4 className="text-md font-semibold text-pink-300 mb-1">
                              {children}
                            </h4>
                          ),
                          p: ({ children }) => (
                            <p className="text-gray-200 leading-relaxed">
                              {children}
                            </p>
                          ),
                        }}
                      >
                        {section.trim()}
                      </ReactMarkdown>
                    </div>
                  ))}
              </div>

              {/* Buttons Below Markdown */}
              <div className="flex flex-wrap gap-3 justify-center mt-6">
                <button
                  onClick={handleSavePitch}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
                >
                  💾 Save Pitch
                </button>
                <button
                  onClick={handleSavePDF}
                  className="px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold"
                >
                  🧾 Save as PDF
                </button>
                <button
                  onClick={handleRegenerate}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                >
                  🔁 Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Landing Page Code Modal */}
      {showLandingModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-[90%] max-w-4xl p-6 relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-pink-400">
                🧱 Generated Landing Page Code
              </h2>
              <button
                onClick={() => setShowLandingModal(false)}
                className="text-red-500 text-lg font-bold"
              >
                ✖
              </button>
            </div>

            {/* Preview Button (Top) */}
            <div className="flex justify-end mb-3">
              <button
                onClick={() => setShowLandingPreview(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold"
              >
                🌐 Preview Website
              </button>
            </div>

            {/* Code Display */}
            <pre className="bg-gray-800 text-gray-200 p-4 rounded-lg max-h-[70vh] overflow-y-auto text-sm whitespace-pre-wrap">
              {landingCode}
            </pre>
          </div>
        </div>
      )}

      {/* Landing Page Preview */}
      {showLandingPreview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 w-[90%] max-w-5xl">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold text-teal-400">
                🌐 Landing Page Preview
              </h2>
              <button
                onClick={() => setShowLandingPreview(false)}
                className="text-red-500 font-bold text-lg"
              >
                ✖
              </button>
            </div>
            <iframe
              srcDoc={landingCode}
              title="Landing Page Preview"
              className="w-full h-[80vh] bg-white rounded-md"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
