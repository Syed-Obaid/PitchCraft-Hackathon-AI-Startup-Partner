// src/pages/SharePitch.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../Firebase";               // adjust the import path if needed
import jsPDF from "jspdf";

export default function SharePitch() {
  const { id } = useParams();          // <-- the pitch ID from the URL
  const navigate = useNavigate();

  const [pitch, setPitch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // -----------------------------------------------------------------
  // 1️⃣  Load the pitch from Firestore
  // -----------------------------------------------------------------
  useEffect(() => {
    const fetchPitch = async () => {
      try {
        const docRef = doc(db, "pitches", id);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          setError("Pitch not found.");
          setLoading(false);
          return;
        }
        setPitch({ id, ...snap.data() });
        setLoading(false);
      } catch (e) {
        console.error(e);
        setError("Failed to load pitch.");
        setLoading(false);
      }
    };
    fetchPitch();
  }, [id]);

  // -----------------------------------------------------------------
  // 2️⃣  Helper: render the pitch text (same logic you used in App)
  // -----------------------------------------------------------------
  const renderPitchContent = (text) => {
    if (!text) return null;
    const cleaned = text.replace(/^#+\s*/gm, ""); // strip any leading #
    const sections = cleaned.split("\n\n");
    return sections.map((section, i) => {
      const lines = section.trim().split("\n");
      const heading = lines[0];
      const body = lines.slice(1).join("\n");
      return (
        <div key={i} className="mb-6">
          <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-3">
            {heading}
          </h3>
          {body && (
            <p className="text-gray-200 whitespace-pre-wrap break-words">{body}</p>
          )}
        </div>
      );
    });
  };

  // -----------------------------------------------------------------
  // 3️⃣  Optional: Export as PDF (same code you already have)
  // -----------------------------------------------------------------
  const downloadPDF = () => {
    if (!pitch?.response) return;
    const plain = pitch.response
      .replace(/^#+\s*/gm, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/[_*~`]/g, "")
      .trim();

    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;
    const usable = pageWidth - margin * 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("PitchCraft Startup Pitch", pageWidth / 2, 20, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(plain, usable);
    let y = 35;
    lines.forEach((l) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(l, margin, y);
      y += 7;
    });
    doc.save("PitchCraft_Pitch.pdf");
  };

  // -----------------------------------------------------------------
  // 4️⃣  Render
  // -----------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        Loading pitch…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-400">
        {error}
        <button
          onClick={() => navigate("/")}
          className="ml-4 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded"
        >
          Go Home
        </button>
      </div>
    );
  }

  // --------------------------------------------------------------
  // Successful load – show the pitch + landing preview (optional)
  // --------------------------------------------------------------
  return (
    <section className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-gray-900/70 backdrop-blur-sm rounded-xl border border-gray-700 shadow-xl">
        {/* Header */}
        <header className="flex justify-between items-center p-4 border-b border-gray-700">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            📢 Shared Pitch
          </h1>
          <button
            onClick={downloadPDF}
            className="px-3 py-1.5 text-sm bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 rounded-lg transition-all flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            PDF
          </button>
        </header>

        {/* Pitch content */}
        <article className="p-6 prose prose-invert max-w-none">
          {renderPitchContent(pitch.response)}
        </article>

        {/* Landing page preview – optional but nice */}
        {pitch.landingCode && (
          <section className="p-6 border-t border-gray-700">
            <h2 className="text-xl font-semibold text-pink-400 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Landing Page Preview
            </h2>
            <div className="bg-white rounded-lg overflow-hidden shadow-inner">
              <iframe
                srcDoc={pitch.landingCode}
                title="Landing preview"
                className="w-full h-[70vh] bg-white"
                sandbox="allow-scripts allow-same-origin allow-popups allow-downloads"
              />
            </div>
          </section>
        )}
      </div>
    </section>
  );
}