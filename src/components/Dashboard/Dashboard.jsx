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
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // ✅ Generate Pitch using Gemini API
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

Return the result clearly formatted like this using markdown:

# Startup Name
## Tagline
### Elevator Pitch
#### Problem
#### Solution
#### Target Audience
### Landing Page Content
      `;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error?.message || "Failed to generate pitch");

      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No text returned from AI.";
      setResponse(text);
    } catch (err) {
      console.error("Error generating pitch:", err);
      alert("Something went wrong while generating pitch.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Save pitch to Firestore
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
      alert("Pitch saved successfully ✅");
    } catch (err) {
      console.error("Error saving pitch:", err);
      alert("Error saving pitch ❌");
    }
  };

  // ✅ Save as PDF
  const handleSavePDF = () => {
    if (!response) return alert("Generate a pitch first!");
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(response, 180);
    doc.text(lines, 10, 10);
    doc.save("PitchCraft_Pitch.pdf");
  };

  // ✅ Regenerate Pitch
  const handleRegenerate = async () => {
    if (!idea) return alert("Please enter your idea first!");
    await handleGenerate();
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900/80 backdrop-blur-md border-r border-gray-700 flex flex-col justify-between">
        <div>
          <div className="p-6 text-2xl font-bold text-indigo-400 tracking-wide border-b border-gray-700">
            ⚡ PitchCraft
          </div>
          <nav className="p-4 space-y-2">
            <Link
              to="/"
              className="block px-3 py-2 rounded-lg bg-gray-800/60 hover:bg-indigo-600/40 transition text-gray-200 hover:text-white"
            >
              ✨ Create Pitch
            </Link>
            <Link
              to="/saved"
              className="block px-3 py-2 rounded-lg bg-gray-800/60 hover:bg-indigo-600/40 transition text-gray-200 hover:text-white"
            >
              💾 Saved Pitches
            </Link>
          </nav>
        </div>

        {user && (
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={logout}
              className="w-full py-2 text-sm font-medium bg-red-600/90 hover:bg-red-700 text-white rounded-lg transition"
            >
              Logout
            </button>
          </div>
        )}
      </aside>

      {/* Main Section */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <header className="flex justify-between items-center px-6 py-4 bg-gray-900/70 backdrop-blur-lg border-b border-gray-700 shadow-lg">
          <h1 className="text-xl font-semibold text-indigo-400">
            AI Startup Partner 🚀
          </h1>

          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-gray-300 font-medium">
                👋 Hi, {user.displayName || user.email}
              </span>
              <img
                src={
                  user.photoURL ||
                  "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png"
                }
                alt="user"
                className="w-8 h-8 rounded-full border border-gray-600"
              />
            </div>
          ) : (
            <div className="space-x-3">
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2 text-sm bg-gray-800/60 hover:bg-gray-700 rounded-lg"
              >
                Login
              </button>
              <button
                onClick={() => navigate("/signup")}
                className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Signup
              </button>
            </div>
          )}
        </header>

        {/* Input + Output */}
        <div className="flex-1 flex flex-col items-center px-6 py-8 overflow-y-auto">
          {/* Input Box */}
          <div className="w-full max-w-2xl bg-gray-900/70 border border-gray-700 rounded-2xl shadow-xl p-6 mb-6 backdrop-blur-md">
            <h2 className="text-2xl font-semibold text-indigo-400 mb-4 text-center">
              Generate Your Startup Pitch 🚀
            </h2>

            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Describe your startup idea..."
              className="w-full h-40 p-4 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />

            <div className="flex items-center justify-between mt-4">
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Formal">Formal</option>
                <option value="Fun">Fun</option>
              </select>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className={`px-6 py-2 font-semibold rounded-lg transition ${
                  loading
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {loading ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>

          {/* Markdown Output */}
          {response && (
            <div className="w-full max-w-2xl bg-gray-900/70 border border-gray-700 rounded-2xl shadow-xl p-6 backdrop-blur-md">
              <h3 className="text-xl font-semibold text-indigo-400 mb-3">
                ✨ Generated Pitch
              </h3>

              <div className="prose prose-invert max-w-none text-gray-200 leading-relaxed mb-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {response}
                </ReactMarkdown>
              </div>

              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={handleSavePitch}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
                >
                  💾 Save Pitch
                </button>
                <button
                  onClick={handleSavePDF}
                  className="px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold transition"
                >
                  🧾 Save as PDF
                </button>
                <button
                  onClick={handleRegenerate}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
                >
                  🔁 Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
