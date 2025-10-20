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
  const [showLandingPreview, setShowLandingPreview] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleGenerate = async () => {
    if (!idea.trim()) return alert("Please enter your startup idea!");
    setLoading(true);
    setResponse("");
    setLandingCode("");

    try {
      const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

      const pitchPrompt = `
Startup Idea: ${idea}
Tone: ${tone}

Return a clean, well-structured startup pitch in **Markdown** format with these sections:
# Startup Name
## Tagline
### Elevator Pitch
#### Problem
#### Solution
#### Target Audience
#### Key Features
#### Monetization
### Landing Page Content
`;

      const landingPrompt = `
You are a professional web designer.
Based on this startup idea: "${idea}"
Generate a fully responsive landing page using **only HTML and CSS**, and nothing else.
⚠️ VERY IMPORTANT:
- No markdown, no explanations, no comments.
- Output starts with <html> and ends with </html>.
- Use sections: Hero, About, Problem, Solution, Features, CTA.
- Use gradients, hover effects, rounded corners.
- Responsive design required.
`;

      const [pitchRes, landingRes] = await Promise.all([
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: pitchPrompt }] }] }),
        }),
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: landingPrompt }] }] }),
        }),
      ]);

      const [pitchData, landingData] = await Promise.all([
        pitchRes.json(),
        landingRes.json(),
      ]);

      setResponse(pitchData.candidates?.[0]?.content?.parts?.[0]?.text || "No pitch.");
      setLandingCode(landingData.candidates?.[0]?.content?.parts?.[0]?.text || "No landing code.");
    } catch (err) {
      console.error(err);
      alert("Error generating pitch or landing page.");
    } finally {
      setLoading(false);
    }
  };

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

  const handleSavePDF = () => {
    if (!response) return alert("Generate a pitch first!");
    const plainText = response
      .replace(/^#+\s*/gm, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/[_*~`]/g, "")
      .replace(/\n{2,}/g, "\n\n")
      .trim();

    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;
    const usableWidth = pageWidth - margin * 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("PitchCraft Startup Pitch", pageWidth / 2, 20, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    const lines = doc.splitTextToSize(plainText, usableWidth);
    let y = 35;

    lines.forEach((line) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 7;
    });

    doc.save("PitchCraft_Pitch.pdf");
  };

  return (
    <>
    <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-gray-100">
    <div className="flex flex-col md:flex-row h-screen max-w-7xl mx-auto">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-gray-900/80 border-b md:border-b-0 md:border-r border-gray-700 flex flex-col justify-between">
        <div>
          <div className="p-4 md:p-6 text-xl md:text-2xl font-bold text-indigo-400 border-b border-gray-700 text-center md:text-left">
            ⚡ PitchCraft
          </div>
          <nav className="p-4 space-y-2 flex md:block justify-center">
            <Link
              to="/"
              className="block px-3 py-2 rounded-lg bg-gray-800/60 hover:bg-indigo-600/40 transition text-center"
            >
              ✨ Create Pitch
            </Link>
            <Link
              to="/saved"
              className="block px-3 py-2 rounded-lg bg-gray-800/60 hover:bg-indigo-600/40 transition text-center"
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center px-4 sm:px-6 py-4 bg-gray-900/70 border-b border-gray-700 gap-3">
          <h1 className="text-lg sm:text-xl font-semibold text-indigo-400">
            AI Startup Partner 🚀
          </h1>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm sm:text-base">
                👋 {user.displayName || user.email}
              </span>
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
            <div className="flex gap-2">
              <button
                onClick={() => navigate("/login")}
                className="px-3 py-2 text-sm sm:text-base bg-gray-800 rounded-lg"
              >
                Login
              </button>
              <button
                onClick={() => navigate("/signup")}
                className="px-3 py-2 text-sm sm:text-base bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Signup
              </button>
            </div>
          )}
        </header>

        {/* Pitch Generator */}
        <div className="flex-1 flex flex-col items-center px-3 sm:px-6 py-6 overflow-y-auto">
          <div className="w-full max-w-2xl bg-gray-900/70 border border-gray-700 rounded-2xl shadow-xl p-4 sm:p-6 mb-6 relative">
            {loading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center rounded-2xl">
                <div className="w-10 h-10 border-4 border-t-indigo-500 border-indigo-300 rounded-full animate-spin mb-3"></div>
                <p className="text-indigo-400 font-semibold tracking-wide">
                  Crafting your pitch...
                </p>
              </div>
            )}

            <h2 className="text-2xl font-semibold text-indigo-400 mb-4 text-center">
              Generate Your Startup Pitch 🚀
            </h2>

            <textarea
              value={loading ? "" : idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Describe your startup idea..."
              disabled={loading}
              className="w-full h-32 sm:h-40 p-4 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 resize-none"
            />

            <div className="flex flex-col sm:flex-row justify-between mt-4 gap-3">
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
                className={`px-6 py-2 rounded-lg font-semibold text-white ${
                  loading
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {loading ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>

          {/* Pitch Output */}
          {response && (
            <div className="w-full max-w-2xl bg-gray-900/70 border border-gray-700 rounded-2xl shadow-xl p-4 sm:p-6">
              <div className="flex flex-wrap justify-center mb-4 gap-3">
                <button
                  onClick={handleGenerate}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold text-sm sm:text-base"
                >
                  🔁 Regenerate
                </button>
                <button
                  onClick={() => setShowLandingModal(true)}
                  disabled={!landingCode}
                  className="px-4 py-2 font-semibold rounded-lg transition bg-pink-600 hover:bg-pink-700 text-sm sm:text-base"
                >
                  🧱 Landing Page Code
                </button>
              </div>

              <div className="space-y-4">
                {response
                  .replace(/^.*?(?=# )/s, "")
                  .split(/(?=# )/)
                  .filter((section) => section.trim() !== "")
                  .map((section, i) => (
                    <div
                      key={i}
                      className={`p-4 sm:p-5 rounded-xl shadow-lg ${
                        i % 2 === 0
                          ? "bg-gradient-to-r from-indigo-900/60 to-purple-900/40"
                          : "bg-gradient-to-r from-gray-800/60 to-gray-900/40"
                      }`}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: (props) => (
                            <h1
                              className="text-2xl font-bold text-indigo-400 mb-2"
                              {...props}
                            />
                          ),
                          h2: (props) => (
                            <h2
                              className="text-xl font-semibold text-pink-400 mb-2"
                              {...props}
                            />
                          ),
                          h3: (props) => (
                            <h3
                              className="text-lg font-semibold text-teal-400 mb-2"
                              {...props}
                            />
                          ),
                          h4: (props) => (
                            <h4
                              className="text-md font-semibold text-purple-400 mb-1"
                              {...props}
                            />
                          ),
                          p: (props) => (
                            <p
                              className="text-gray-200 leading-relaxed text-sm sm:text-base"
                              {...props}
                            />
                          ),
                          li: (props) => (
                            <li
                              className="list-disc ml-5 text-gray-300 text-sm sm:text-base"
                              {...props}
                            />
                          ),
                          strong: (props) => (
                            <strong
                              className="text-yellow-300 font-bold"
                              {...props}
                            />
                          ),
                        }}
                      >
                        {section.trim()}
                      </ReactMarkdown>
                    </div>
                  ))}
              </div>

              <div className="flex flex-wrap gap-3 justify-center mt-6">
                <button
                  onClick={handleSavePitch}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm sm:text-base"
                >
                  💾 Save Pitch
                </button>
                <button
                  onClick={handleSavePDF}
                  className="px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold text-sm sm:text-base"
                >
                  🧾 Save as PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Landing Page Modals (Responsive) */}
      {showLandingModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-4xl p-4 sm:p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-pink-400">
                🧱 Generated Landing Page Code
              </h2>
              <button
                onClick={() => setShowLandingModal(false)}
                className="text-red-500 text-lg font-bold"
              >
                ✖
              </button>
            </div>
            <div className="flex justify-end mb-3">
              <button
                onClick={() => setShowLandingPreview(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold"
              >
                🌐 Preview Website
              </button>
            </div>
            <pre className="bg-gray-800 text-gray-200 p-4 rounded-lg max-h-[60vh] overflow-y-auto text-xs sm:text-sm whitespace-pre-wrap">
              {landingCode}
            </pre>
          </div>
        </div>
      )}

      {showLandingPreview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 w-full max-w-5xl">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base sm:text-lg font-bold text-teal-400">
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
              className="w-full h-[70vh] sm:h-[80vh] bg-white rounded-md"
            />
          </div>
        </div>
      )}
    </div>
    </section>
    </>
  );
}

export default App;
