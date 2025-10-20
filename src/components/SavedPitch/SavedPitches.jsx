import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../Firebase";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import jsPDF from "jspdf";
import { 
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  DocumentArrowDownIcon,
  ArrowLeftIcon,
  CheckIcon,
  ClockIcon,
  SparklesIcon,
  ArrowRightIcon, 
  BookmarkIcon 
} from "@heroicons/react/24/outline"; 

const SavedPitches = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pitches, setPitches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPitch, setSelectedPitch] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    idea: "",
    tone: "",
    response: "",
  });

  useEffect(() => {
    const fetchPitches = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, "pitches"),
          where("uid", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPitches(data);
      } catch (err) {
        console.error("Error fetching pitches:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPitches();
  }, [user]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this pitch?")) return;
    try {
      await deleteDoc(doc(db, "pitches", id));
      setPitches(pitches.filter((p) => p.id !== id));
      alert("Pitch deleted successfully 🗑️");
    } catch (err) {
      console.error("Error deleting pitch:", err);
      alert("Failed to delete pitch ❌");
    }
  };

  const handleSavePDF = (pitch) => {
    const docPDF = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    let y = margin;

    docPDF.setFont("helvetica", "bold");
    docPDF.setFontSize(24);
    docPDF.setTextColor(60, 60, 160);
    docPDF.text("🚀 PitchCraft Startup Pitch", margin, y);
    y += 40;

    docPDF.setFont("helvetica", "bold");
    docPDF.setFontSize(16);
    docPDF.setTextColor(33, 33, 33);
    docPDF.text("Startup Idea:", margin, y);
    y += 22;

    docPDF.setFont("helvetica", "normal");
    docPDF.setFontSize(12);
    const ideaLines = docPDF.splitTextToSize(pitch.idea, 520);
    docPDF.text(ideaLines, margin, y);
    y += ideaLines.length * 14 + 20;

    docPDF.setDrawColor(100, 100, 255);
    docPDF.line(margin, y, 555, y);
    y += 30;

    docPDF.setFont("helvetica", "bold");
    docPDF.setFontSize(16);
    docPDF.text("AI Generated Pitch:", margin, y);
    y += 24;

    docPDF.setFont("helvetica", "normal");
    docPDF.setFontSize(12);
    const pitchLines = docPDF.splitTextToSize(pitch.response, 520);
    const pageHeight = docPDF.internal.pageSize.height;
    pitchLines.forEach((line) => {
      if (y > pageHeight - 60) {
        docPDF.addPage();
        y = margin;
      }
      docPDF.text(line, margin, y);
      y += 16;
    });

    y = pageHeight - 50;
    docPDF.setFont("helvetica", "italic");
    docPDF.setFontSize(10);
    docPDF.setTextColor(120, 120, 120);
    docPDF.text(
      "Created with ❤️ by PitchCraft | Empowering Startup Dreams",
      margin,
      y
    );

    docPDF.save(`PitchCraft_${pitch.id}.pdf`);
  };

  const handleEdit = (pitch) => {
    setIsEditing(true);
    setSelectedPitch(pitch); 
    setEditData({
      idea: pitch.idea,
      tone: pitch.tone,
      response: pitch.response,
    });
  };

  const handleSaveEdit = async () => {
    if (!selectedPitch) return;
    try {
      const pitchRef = doc(db, "pitches", selectedPitch.id);
      await updateDoc(pitchRef, {
        idea: editData.idea,
        tone: editData.tone,
        response: editData.response,
      });
      setPitches((prev) =>
        prev.map((p) => (p.id === selectedPitch.id ? { ...p, ...editData } : p))
      );
      alert("Pitch updated successfully ✅");
      setIsEditing(false);
    
      setSelectedPitch(prev => prev ? { ...prev, ...editData } : null);
    } catch (err) {
      console.error("Error updating pitch:", err);
      alert("Failed to update pitch ❌");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-100 mb-2">
            Loading your pitches...
          </h2>
          <p className="text-gray-400 mt-2">Crafting your innovation story</p>
        </div>
      </div>
    );

  return (
    <>
    <section className="bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 text-gray-100">
    <div className="min-h-screen max-w-7xl mx-auto">
  
      <nav className="bg-gray-800/90 backdrop-blur-md border-b border-gray-700 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                  PitchCraft
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/")}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-indigo-300 bg-indigo-900 hover:bg-indigo-800 transition-colors shadow-md"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

    
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg">
              <BookmarkIcon className="h-8 w-8" /> 
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-300 mb-4">
            Your Saved Pitches
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Your innovation archive - View, edit, and export your AI-generated startup pitches
          </p>
        </div>

        {pitches.length === 0 ? (
          <div className="text-center py-20 bg-gray-800 rounded-3xl shadow-xl border border-gray-700">
            <div className="max-w-md mx-auto">
              <div className="bg-indigo-900 rounded-full p-6 mb-6 flex justify-center shadow-lg">
                <DocumentTextIcon className="h-16 w-16 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-100 mb-2">No pitches saved yet</h3>
              <p className="text-gray-400 mb-8">
                Generate your first startup pitch using our AI and save it for future reference
              </p>
              <button
                onClick={() => navigate("/")}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <SparklesIcon className="h-5 w-5 mr-2" />
                Create New Pitch
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {pitches.map((pitch) => (
              <div
                key={pitch.id}
                className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group"
              >
              
                <div className="p-6 border-b border-gray-100 bg-gray-800 text-white rounded-t-3xl">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 pr-4">
                      <h2 className="text-xl font-bold truncate mb-1 group-hover:text-indigo-400 transition-colors">
                        {pitch.idea.length > 50 ? `${pitch.idea.substring(0, 50)}...` : pitch.idea}
                      </h2>
                      <div className="flex items-center text-sm text-gray-400">
                        <span className="bg-indigo-900 text-indigo-300 px-2.5 py-0.5 rounded-full font-medium mr-2">
                          {pitch.tone}
                        </span>
                        <ClockIcon className="h-4 w-4 mr-1" />
                        <span>
                          {pitch.createdAt?.toDate().toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric' 
                          })}
                        </span>
                      </div>
                    </div>
                   
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:translate-x-0 translate-x-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(pitch); }}
                        className="p-2 rounded-full bg-gray-700 text-indigo-300 hover:bg-gray-600 hover:text-indigo-200 transition-colors shadow-md"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(pitch.id); }}
                        className="p-2 rounded-full bg-red-800 text-red-300 hover:bg-red-700 hover:text-red-200 transition-colors shadow-md"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-gray-700 text-sm mb-5 line-clamp-3 h-20">
                    {pitch.response}
                  </p>
                  
                 
                  <div className="flex justify-between pt-4 border-t border-gray-100">
                    <button
                      onClick={() => setSelectedPitch(pitch)}
                      className="text-indigo-600 font-medium hover:text-indigo-800 transition-colors flex items-center group-hover:underline"
                    >
                      View details <ArrowRightIcon className="h-4 w-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSavePDF(pitch); }}
                      className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors flex items-center shadow-sm"
                    >
                      <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                      PDF
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

     
      {selectedPitch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in text-gray-900">
         
            <div className="p-8 border-b border-gray-200 bg-gray-50 flex justify-between items-start rounded-t-3xl">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {isEditing ? "✏️ Edit Pitch" : "🚀 Pitch Details"}
                </h2>
                <p className="text-gray-600">
                  {isEditing 
                    ? "Make changes to your startup pitch" 
                    : "View and manage your AI-generated pitch"}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedPitch(null);
                  setIsEditing(false);
                }}
                className="p-2 rounded-xl hover:bg-gray-200 transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>

        
            <div className="flex-1 overflow-y-auto p-8">
              {isEditing ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Startup Idea
                    </label>
                    <textarea
                      value={editData.idea}
                      onChange={(e) =>
                        setEditData({ ...editData, idea: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tone
                    </label>
                    <div className="relative">
                      <select
                        value={editData.tone}
                        onChange={(e) =>
                          setEditData({ ...editData, tone: e.target.value })
                        }
                        className="appearance-none w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm pr-10"
                      >
                        <option value="Formal">Formal & Professional</option>
                        <option value="Fun">Fun & Energetic</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Response
                    </label>
                    <textarea
                      value={editData.response}
                      onChange={(e) =>
                        setEditData({ ...editData, response: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                      rows={10}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">
                        {selectedPitch.idea}
                      </h3>
                      <div className="flex items-center text-sm">
                        <span className="bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-medium mr-3">
                          {selectedPitch.tone}
                        </span>
                        <span className="text-gray-500">
                          Created on: {selectedPitch.createdAt?.toDate().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 shadow-sm">
                      <CheckIcon className="h-4 w-4 mr-1" />
                      Saved
                    </span>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <DocumentTextIcon className="h-5 w-5 mr-2 text-indigo-600" />
                      Pitch Content
                    </h4>
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 shadow-inner max-h-80 overflow-y-auto">
                      <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                        {selectedPitch.response}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          
            <div className="p-8 border-t border-gray-200 bg-gray-50 flex justify-end space-x-4 rounded-b-3xl">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 flex items-center shadow-lg"
                  >
                    <CheckIcon className="h-5 w-5 mr-2" />
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleSavePDF(selectedPitch)}
                    className="px-6 py-3 bg-yellow-50 text-yellow-600 rounded-xl hover:bg-yellow-100 transition-colors flex items-center shadow-sm"
                  >
                    <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                    Save as PDF
                  </button>
                  <button
                    onClick={() => handleEdit(selectedPitch)}
                    className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors flex items-center shadow-sm"
                  >
                    <PencilIcon className="h-5 w-5 mr-2" />
                    Edit Pitch
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

     
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `}</style>
    </div>
    </section>
    </>
  );
};

export default SavedPitches;