import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../Firebase";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  getDocs,
  deleteDoc
} from "firebase/firestore";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

function App() {
  const [idea, setIdea] = useState("");
  const [tone, setTone] = useState("Formal");
  const [loading, setLoading] = useState(false);
  const [savedPitches, setSavedPitches] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showCodeSection, setShowCodeSection] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [hoveredPitchId, setHoveredPitchId] = useState(null);
  const [showMenuForPitch, setShowMenuForPitch] = useState(null);
  const [renameModal, setRenameModal] = useState({ show: false, pitchId: null, newName: "" });
  const [shareModal, setShareModal] = useState({ show: false, pitchId: null });
  const [showLandingPreview, setShowLandingPreview] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const landingPreviewRef = useRef(null);
  const sidebarRef = useRef(null);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        if (window.innerWidth < 768) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [sidebarOpen]);

  // Handle sidebar state based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        // Keep current state on desktop
      } else {
        setSidebarOpen(false);
      }
    };

    if (window.innerWidth >= 768) {
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [idea]);

  // Current response and landing code from last AI message
  const currentResponse = messages.find(msg => msg.type === 'ai' && msg.isLatest)?.text || "";
  const currentLandingCode = messages.find(msg => msg.type === 'ai' && msg.isLatest)?.landingCode || "";

  // Load saved pitches from Firebase
  useEffect(() => {
    const loadPitches = async () => {
      if (!user) {
        setSavedPitches([]);
        return;
      }

      try {
        const q = query(
          collection(db, "pitches"),
          where("uid", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        const pitches = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          pitches.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
          });
        });
        
        setSavedPitches(pitches);
      } catch (error) {
        console.error("Error loading pitches:", error);
        try {
          const q = query(
            collection(db, "pitches"),
            where("uid", "==", user.uid)
          );
          const querySnapshot = await getDocs(q);
          const pitches = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            pitches.push({
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
            });
          });
          setSavedPitches(pitches);
        } catch (err) {
          console.error("Fallback also failed:", err);
        }
      }
    };

    loadPitches();

    if (user) {
      const unsubscribe = onSnapshot(
        query(collection(db, "pitches"), where("uid", "==", user.uid)),
        (snapshot) => {
          const pitches = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            pitches.push({
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
            });
          });
          setSavedPitches(pitches.sort((a, b) => b.createdAt - a.createdAt));
        },
        (error) => {
          console.error("Realtime update error:", error);
        }
      );
      return () => unsubscribe();
    }
  }, [user]);

  // Auto-save function
  const autoSavePitch = async (messages, sessionId = null) => {
    if (!user) {
      console.log("User not logged in, skipping auto-save");
      return null;
    }
    
    if (!messages || messages.length === 0) {
      console.log("No messages to save");
      return null;
    }

    try {
      const userMessage = messages.find(msg => msg.type === 'user');
      const aiMessage = messages.find(msg => msg.type === 'ai' && msg.isLatest);
      
      if (!userMessage || !aiMessage) return null;

      if (sessionId) {
        await updateDoc(doc(db, "pitches", sessionId), {
          messages: messages,
          idea: userMessage.text,
          response: aiMessage.text,
          landingCode: aiMessage.landingCode || "",
          tone,
          updatedAt: serverTimestamp(),
        });
        console.log("Pitch updated successfully");
        return sessionId;
      } else {
        const docRef = await addDoc(collection(db, "pitches"), {
          uid: user.uid,
          messages: messages,
          idea: userMessage.text,
          tone,
          response: aiMessage.text,
          landingCode: aiMessage.landingCode || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        console.log("New pitch saved successfully with ID:", docRef.id);
        return docRef.id;
      }
    } catch (err) {
      console.error("Auto-save error:", err);
      return null;
    }
  };

  // Delete pitch function
  const deletePitch = async (pitchId) => {
    if (!window.confirm("Are you sure you want to delete this pitch?")) return;
    
    try {
      await deleteDoc(doc(db, "pitches", pitchId));
      setShowMenuForPitch(null);
      
      if (currentSessionId === pitchId) {
        startNewChat();
      }
    } catch (error) {
      console.error("Error deleting pitch:", error);
      alert("Error deleting pitch");
    }
  };

  // Rename pitch function
  const renamePitch = async (pitchId, newName) => {
    if (!newName.trim()) {
      alert("Please enter a valid name");
      return;
    }

    try {
      await updateDoc(doc(db, "pitches", pitchId), {
        customName: newName.trim(),
        updatedAt: serverTimestamp()
      });
      setRenameModal({ show: false, pitchId: null, newName: "" });
    } catch (error) {
      console.error("Error renaming pitch:", error);
      alert("Error renaming pitch");
    }
  };

  // Share pitch function
  const sharePitch = async (pitchId) => {
    try {
      const shareableLink = `${window.location.origin}/share/${pitchId}`;
      await navigator.clipboard.writeText(shareableLink);
      alert("Shareable link copied to clipboard!");
      setShareModal({ show: false, pitchId: null });
    } catch (error) {
      console.error("Error sharing pitch:", error);
      alert("Error sharing pitch");
    }
  };

  // Get pitch display name
  const getPitchDisplayName = (pitch) => {
    if (pitch.customName) return pitch.customName;
    return pitch.idea ? pitch.idea.substring(0, 25) + (pitch.idea.length > 25 ? '...' : '') : 'Untitled Pitch';
  };

  // Enhanced HTML cleaning with diverse templates
  const cleanHTMLCode = (code) => {
    if (!code) return "";
    
    let cleaned = code.replace(/```html/g, '').replace(/```/g, '').trim();
    
    const htmlMatch = cleaned.match(/<(!DOCTYPE|html|body|head|div|section|header|footer)[^>]*>[\s\S]*<\/\1>/i);
    if (htmlMatch) {
      cleaned = htmlMatch[0];
    }
    
    if (!cleaned.includes('<!DOCTYPE') && !cleaned.includes('<html')) {
      cleaned = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Startup Landing Page</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
    </style>
</head>
<body>
    ${cleaned}
</body>
</html>`;
    }
    
    return cleaned;
  };

  const handleGenerate = async (editMessageId = null) => {
    const promptText = editMessageId ? editText : idea;
    
    if (!promptText.trim()) {
      alert("Please enter your message!");
      return;
    }
    
    let updatedMessages;
    if (editMessageId) {
      const editIndex = messages.findIndex(msg => msg.id === editMessageId);
      updatedMessages = messages.slice(0, editIndex).map(msg => 
        msg.id === editMessageId ? { ...msg, text: promptText } : msg
      );
      setEditingMessageId(null);
      setEditText("");
    } else {
      const newMessage = { 
        type: 'user', 
        text: promptText,
        id: Date.now().toString(),
        timestamp: new Date()
      };
      updatedMessages = [...messages, newMessage];
      setIdea("");
    }
    
    setMessages(updatedMessages);
    setLoading(true);
    setShowCodeSection(false);

    try {
      const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!API_KEY) {
        throw new Error("API key not found. Please check your environment variables.");
      }

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

      let prompt = "";
      const conversationHistory = updatedMessages
        .map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
        .join('\n\n');

      if (updatedMessages.length === 1 || editMessageId) {
        prompt = `
Startup Idea: ${promptText}
Tone: ${tone}

Return a clean, well-structured startup pitch in plain text with these sections (don't use # symbols, just write the section names):

Startup Name
[Write the startup name here]

Tagline
[Write a catchy tagline]

Elevator Pitch
[Write the elevator pitch]

Problem
[Describe the problem being solved]

Solution
[Describe your solution]

Target Audience
[Define your target audience]

Key Features
[List the key features]

Monetization
[Explain the monetization strategy]

Landing Page Content
[Provide content for the landing page]
`;
      } else {
        prompt = `Conversation History:
${conversationHistory}

User's new request: ${promptText}
Tone: ${tone}

Please provide a helpful response that continues the conversation about this startup pitch. Maintain the context from previous messages and address the user's specific request.`;
      }

      const landingPrompt = `
You are a professional HTML/CSS developer specializing in creating unique, modern landing pages for startups.

Based on this startup idea: "${promptText}"

Generate a COMPLETE, PROFESSIONAL HTML landing page with:

**DESIGN REQUIREMENTS:**
- Create a UNIQUE, MODERN design that's DIFFERENT from typical templates
- Use Tailwind CSS (via CDN) for responsive design
- Choose a color scheme that matches the startup's industry
- Implement creative layouts (asymmetrical, grid, card-based, etc.)
- Add subtle animations and hover effects

**CONTENT SECTIONS (include all):**
1. Hero section with compelling headline and CTA
2. Problem/Solution section
3. Key Features/Benefits
4. How It Works/Process
5. Testimonials/Social Proof
6. Pricing/Offer (if applicable)
7. Final CTA and Footer

**IMAGE REQUIREMENTS:**
- Use ONLY high-quality, relevant images from Unsplash using specific search terms
- Example: For a "fitness app" use: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?fit=crop&w=800&h=600"
- For "food delivery" use: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?fit=crop&w=800&h=600"
- For "tech startup" use: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?fit=crop&w=800&h=600"
- Make sure images are RELEVANT to the startup idea

**TECHNICAL REQUIREMENTS:**
- Pure HTML/CSS only (no React/JSX)
- Include Font Awesome for icons
- Add Google Fonts (Inter or Poppins)
- Make it fully responsive
- Include smooth scrolling and subtle animations

**IMPORTANT:**
- Return ONLY the complete HTML code starting with <!DOCTYPE html>
- Make it visually DIFFERENT from previous designs
- Ensure images are contextually relevant to the startup idea
- Create a professional, conversion-focused design

Generate the HTML now:
`;

      const [pitchRes, landingRes] = await Promise.all([
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            contents: [{ 
              parts: [{ text: prompt }] 
            }] 
          }),
        }),
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            contents: [{ 
              parts: [{ text: landingPrompt }] 
            }] 
          }),
        }),
      ]);

      if (!pitchRes.ok) {
        throw new Error(`Pitch API error: ${pitchRes.status} ${pitchRes.statusText}`);
      }

      if (!landingRes.ok) {
        throw new Error(`Landing API error: ${landingRes.status} ${landingRes.statusText}`);
      }

      const [pitchData, landingData] = await Promise.all([
        pitchRes.json(),
        landingRes.json(),
      ]);

      if (pitchData.error) {
        throw new Error(`Gemini API Error: ${pitchData.error.message}`);
      }

      if (landingData.error) {
        throw new Error(`Gemini API Error: ${landingData.error.message}`);
      }

      const generatedResponse = pitchData.candidates?.[0]?.content?.parts?.[0]?.text || 
                              "Sorry, I couldn't generate a response. Please try again.";

      let generatedLandingCode = landingData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      generatedLandingCode = cleanHTMLCode(generatedLandingCode);

      const finalMessages = [
        ...updatedMessages,
        { 
          type: 'ai', 
          text: generatedResponse, 
          landingCode: generatedLandingCode,
          isLatest: true,
          id: Date.now().toString() + '-ai',
          timestamp: new Date()
        }
      ];
      
      setMessages(finalMessages);
      
      if (generatedLandingCode) {
        setShowCodeSection(true);
      }
      
      const savedId = await autoSavePitch(finalMessages, currentSessionId);
      if (savedId) {
        setCurrentSessionId(savedId);
      }
      
    } catch (err) {
      console.error("Generation error:", err);
      
      const errorMessage = {
        type: 'ai', 
        text: `Sorry, I encountered an error: ${err.message}. Please try again.`,
        landingCode: "",
        isLatest: true,
        id: Date.now().toString() + '-error',
        timestamp: new Date()
      };
      
      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      
      if (err.message.includes('API key') || err.message.includes('429')) {
        alert("API Error: Please check your API key or try again later.");
      } else {
        alert("Error generating response. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Start editing a message
  const startEditing = (messageId, text) => {
    setEditingMessageId(messageId);
    setEditText(text);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditText("");
  };

  const loadPitch = async (pitchId) => {
    try {
      const pitchDoc = await getDoc(doc(db, "pitches", pitchId));
      if (pitchDoc.exists()) {
        const data = pitchDoc.data();
        setCurrentSessionId(pitchId);
        
        if (data.messages && Array.isArray(data.messages)) {
          const messagesWithIds = data.messages.map(msg => ({
            ...msg,
            id: msg.id || Date.now().toString() + Math.random(),
            timestamp: msg.timestamp || new Date()
          }));
          setMessages(messagesWithIds);
        } else {
          const legacyMessages = [
            { 
              type: 'user', 
              text: data.idea, 
              id: Date.now().toString() + '-user',
              timestamp: new Date()
            },
            { 
              type: 'ai', 
              text: data.response, 
              landingCode: data.landingCode, 
              isLatest: true,
              id: Date.now().toString() + '-ai',
              timestamp: new Date()
            }
          ];
          setMessages(legacyMessages);
        }
        
        setShowCodeSection(true);
        setShowMenuForPitch(null);
        setEditingMessageId(null);
        setEditText("");
        if (window.innerWidth < 768) {
          setSidebarOpen(false);
        }
      }
    } catch (err) {
      console.error("Error loading pitch:", err);
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setIdea("");
    setShowCodeSection(false);
    setShowMenuForPitch(null);
    setEditingMessageId(null);
    setEditText("");
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(currentLandingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSavePDF = async () => {
    if (!currentResponse) return alert("Generate a pitch first!");
    setGeneratingPDF(true);

    try {
      const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const usableWidth = pageWidth - margin * 2;

      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageWidth, 25, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("PitchCraft AI - Startup Pitch", pageWidth / 2, 15, { align: "center" });

      let y = 40;

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      const plainText = currentResponse
        .replace(/^#+\s*/gm, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/[_*~`]/g, "")
        .replace(/\n{2,}/g, "\n\n")
        .trim();

      const lines = doc.splitTextToSize(plainText, usableWidth);
      lines.forEach((line) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += 6;
      });

      if (currentLandingCode) {
        y += 15;
        if (y > 250) {
          doc.addPage();
          y = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(79, 70, 229);
        doc.text("🌐 Landing Page Preview", margin, y);
        y += 10;

        try {
          const tempDiv = document.createElement("div");
          tempDiv.style.position = "fixed";
          tempDiv.style.left = "-9999px";
          tempDiv.style.top = "0";
          tempDiv.style.width = "1000px";
          tempDiv.style.background = "#fff";
          tempDiv.innerHTML = currentLandingCode;
          document.body.appendChild(tempDiv);

          await new Promise((r) => setTimeout(r, 1000));

          const canvas = await html2canvas(tempDiv, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
          });

          const imgData = canvas.toDataURL("image/png", 1.0);
          const imgWidth = pageWidth - margin * 2;
          const aspectRatio = canvas.height / canvas.width;
          const imgHeight = imgWidth * aspectRatio;

          if (y + imgHeight > 270) {
            doc.addPage();
            y = 20;
          }

          doc.addImage(imgData, "PNG", margin, y, imgWidth, imgHeight);
          y += imgHeight + 10;

          document.body.removeChild(tempDiv);
        } catch (error) {
          console.error("Screenshot failed:", error);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.text("Landing page preview unavailable.", margin, y);
        }
      }

      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Generated by PitchCraft AI - Page ${i} of ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      doc.save("PitchCraft_Startup_Pitch.pdf");
    } catch (error) {
      console.error("PDF download error:", error);
      alert("Error generating PDF. Please try again.");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Recent';
    try {
      if (date instanceof Date) {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric'
        });
      }
      return 'Recent';
    } catch (error) {
      return 'Recent';
    }
  };

  // Format time for messages
  const formatTime = (date) => {
    if (!date) return '';
    try {
      if (date instanceof Date) {
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return '';
    } catch (error) {
      return '';
    }
  };

  // Custom renderer for pitch content
  const renderPitchContent = (text) => {
    if (!text) return null;
    
    const cleanedText = text.replace(/^#+\s*/gm, '');
    const sections = cleanedText.split('\n\n');
    
    return sections.map((section, index) => {
      const lines = section.trim().split('\n');
      const heading = lines[0];
      const content = lines.slice(1).join('\n');
      
      const isMainHeading = [
        'Startup Name', 'Tagline', 'Elevator Pitch', 
        'Problem', 'Solution', 'Target Audience', 
        'Key Features', 'Monetization', 'Landing Page Content'
      ].some(h => heading?.includes(h));
      
      if (isMainHeading) {
        return (
          <div key={index} className="mb-6">
            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-3">
              {heading}
            </h3>
            {content && (
              <div className="text-gray-200 leading-relaxed whitespace-pre-wrap break-words">
                {content}
              </div>
            )}
          </div>
        );
      }
      
      return (
        <div key={index} className="text-gray-200 leading-relaxed mb-3 whitespace-pre-wrap break-words">
          {section}
        </div>
      );
    });
  };

  // Professional Edit Button Component
  const EditButton = ({ onEdit, isHovered }) => (
    <button
      onClick={onEdit}
      className={`
        flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all duration-200
        ${isHovered 
          ? "bg-gray-700 text-gray-300 opacity-100" 
          : "bg-transparent text-transparent opacity-0"
        }
        hover:bg-gray-600 hover:text-white
      `}
      title="Edit message"
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
      Edit
    </button>
  );

  // Hamburger Menu Button - Shows when sidebar is closed
  const HamburgerButton = () => (
    <button
      onClick={() => setSidebarOpen(true)}
      className={`
        fixed top-4 left-4 z-30 p-2 pb-1 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all duration-300
        ${sidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        shadow-lg border border-gray-700
      `}
      aria-label="Open sidebar"
    >
      <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );

  // Sidebar component
  const Sidebar = () => (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && window.innerWidth < 768 && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Hamburger Button - Shows when sidebar is closed */}
      <HamburgerButton />
      
      {/* Sidebar */}
      <aside 
        ref={sidebarRef}
        className={`
          fixed md:relative z-50 w-64 bg-gray-900 border-r border-gray-700 flex flex-col h-full
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:pointer-events-none'}
        `}
      >
        {/* Sidebar Header with Logo and Close Button */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
              ⚡ PitchCraft AI
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-lg hover:bg-gray-800 transition-colors"
              aria-label="Close sidebar"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-gray-700">
          <button
            onClick={startNewChat}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg flex items-center justify-center gap-2 transition-all transform hover:scale-105"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-semibold">New Pitch</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-xs text-gray-500 px-3 py-2 uppercase tracking-wider">Recent Pitches</div>
          {user && savedPitches.length > 0 ? (
            savedPitches.map((pitch) => (
              <div
                key={pitch.id}
                className="relative group"
                onMouseEnter={() => setHoveredPitchId(pitch.id)}
                onMouseLeave={() => setHoveredPitchId(null)}
              >
                <button
                  onClick={() => loadPitch(pitch.id)}
                  className={`w-full text-left px-3 py-2.5 mb-1 rounded-lg hover:bg-gray-800 transition-all ${
                    currentSessionId === pitch.id ? 'bg-gray-800 border-l-2 border-indigo-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-400">💡</span>
                    <span className="truncate text-sm flex-1 text-left">
                      {getPitchDisplayName(pitch)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 pl-6">
                    {formatDate(pitch.createdAt)}
                  </div>
                </button>

                {(hoveredPitchId === pitch.id || showMenuForPitch === pitch.id) && (
                  <div className="absolute right-2 top-2 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenuForPitch(showMenuForPitch === pitch.id ? null : pitch.id);
                      }}
                      className="p-1.5 rounded-full hover:bg-gray-800 transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                      </svg>
                    </button>

                    {showMenuForPitch === pitch.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-1 z-20">
                        <button
                          onClick={() => {
                            setRenameModal({ show: true, pitchId: pitch.id, newName: getPitchDisplayName(pitch) });
                            setShowMenuForPitch(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          <span>Rename</span>
                        </button>
                        <button
                          onClick={() => {
                            setShareModal({ show: true, pitchId: pitch.id });
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l5.5-3.5L21 10m0 0l-4.5 7.5L10 17l5.5-3.5M21 10l-4.5 7.5M10 17H3m18 0h-3" />
                          </svg>
                          <span>Share</span>
                        </button>
                        <button
                          onClick={() => deletePitch(pitch.id)}
                          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 text-sm p-4">
              {user ? "No saved pitches yet" : "Login to save pitches"}
            </div>
          )}
        </div>

        {user ? (
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <img
                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=6366f1&color=fff`}
                alt="user"
                className="w-10 h-10 rounded-full ring-2 ring-indigo-500"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </p>
                <p className="text-xs text-gray-400">Pro Member</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-all"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={() => navigate("/login")}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm mb-2"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
            >
              Sign Up
            </button>
          </div>
        )}
      </aside>
    </>
  );

  return (
    <section className="bg-gradient-to-br  from-gray-900 via-gray-800 to-black text-gray-100 h-screen">
      <div className="flex h-full">
        <Sidebar />

     <main className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'md:ml-0' : 'md:ml-0'}`}>
          {/* Increased Header Size */}
          {/* <header className={`px-6 bg-gray-900/70 border-b border-gray-700 backdrop-blur-sm ${sidebarOpen ? 'py-3' : 'py-3'}`}> */}
          <header className={`px-6 bg-gray-900/70 border-b border-gray-700 backdrop-blur-sm ${sidebarOpen ? 'py-0' : currentSessionId ? 'py-3' : 'py-0'}`}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 ms-10">
                {currentSessionId && (
                  <span className="text-sm bg-green-600/20 text-green-400  px-3 py-1.5 my-2  rounded-full">
                    Auto-saved
                  </span>
                )}
                {generatingPDF && (
                  <span className="text-sm bg-yellow-600/20 text-yellow-400 px-3 py-1.5 rounded-full flex items-center gap-1">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    Generating PDF...
                  </span>
                )}
              </div>

              {currentResponse && (
                <button
                  onClick={handleSavePDF}
                  disabled={generatingPDF}
                  className={`px-4 py-2 text-base rounded-lg transition-all flex items-center gap-2 ${
                    generatingPDF
                      ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                  }`}
                >
                  {generatingPDF ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Download PDF
                    </>
                  )}
                </button>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-6">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-2xl">
                  <div className="text-8xl mb-8">🚀</div>
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-6">
                    Welcome to PitchCraft AI
                  </h2>
                  <p className="text-gray-400 mb-8 leading-relaxed text-lg">
                    Turn your raw startup idea into a polished pitch + ready-to-use landing page — all with AI.
                    Type your idea below to get started.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-end w-full p-3 bg-gray-800 rounded-xl border border-gray-700 focus-within:ring-2 focus-within:ring-indigo-500/70 transition-all shadow-lg mx-auto max-w-lg">
                      <div className="relative shrink-0">
                        <select
                          value={tone}
                          onChange={(e) => setTone(e.target.value)}
                          className="appearance-none bg-transparent h-12 pl-10 pr-8 text-gray-100 text-base outline-none cursor-pointer theme-select"
                          aria-label="Select pitch tone"
                        >
                          <option value="Formal" className="theme-option">Formal</option>
                          <option value="Fun" className="theme-option">Fun</option>
                        </select>
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none">
                          {tone === "Formal" ? "🎩" : "🎉"}
                        </span>
                        <svg
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      <div className="self-stretch w-px bg-gray-700 mx-3"></div>

                      <div className="flex-1 relative flex items-end">
                        <textarea
                          ref={textareaRef}
                          value={idea}
                          onChange={(e) => setIdea(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              if (idea.trim() && !loading) {
                                handleGenerate();
                              }
                            }
                          }}
                          placeholder="Describe your startup idea..."
                          disabled={loading}
                          rows={1}
                          className="w-full min-h-[48px] max-h-[120px] leading-7 p-3 bg-transparent text-gray-100 placeholder-gray-500 outline-none resize-none transition-all text-base"
                          aria-label="Startup idea input"
                        />
                        <button
                          onClick={() => handleGenerate()}
                          disabled={loading || !idea.trim()}
                          aria-label="Generate pitch"
                          className={`shrink-0 h-10 w-10 grid place-items-center rounded-lg transition-all shadow-md ml-3
                            ${loading || !idea.trim()
                              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                              : "bg-gradient-to-br from-indigo-500 to-purple-500 text-white hover:scale-105 hover:shadow-indigo-500/30"
                            }`}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" transform="rotate(90 12 12)" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="text-sm text-gray-500 mt-3 text-center select-none">
                      Press Enter to send • Shift+Enter for new line
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((msg, index) => (
                  <div key={msg.id}>
                    <div 
                      className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} mb-4 group`}
                      onMouseEnter={() => setHoveredMessageId(msg.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                      <div className={`max-w-3xl ${msg.type === 'user' ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'bg-gray-800'} rounded-2xl p-4 shadow-lg relative`}>
                        {msg.type === 'user' ? (
                          <div className="flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">👤</span>
                                <span className="text-sm text-indigo-200 font-medium">You</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-indigo-200 opacity-70">
                                  {formatTime(msg.timestamp)}
                                </span>
                                <EditButton 
                                  onEdit={() => startEditing(msg.id, msg.text)}
                                  isHovered={hoveredMessageId === msg.id}
                                />
                              </div>
                            </div>
                            <p className="text-white text-lg">{msg.text}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">🤖</span>
                                <span className="text-sm text-gray-400 font-medium">PitchCraft AI</span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatTime(msg.timestamp)}
                              </span>
                            </div>
                            <div className="prose prose-invert max-w-none">
                              {renderPitchContent(msg.text)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Landing Page Code Section - Only show for latest AI message */}
                    {msg.type === 'ai' && msg.isLatest && msg.landingCode && showCodeSection && (
                      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-700 shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold text-pink-400 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                            Landing Page Code
                          </h3>
                          <div className="flex gap-2">
                            <button
                              onClick={copyCode}
                              className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-all flex items-center gap-1"
                            >
                              {copiedCode ? (
                                <>
                                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  Copy
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => setShowLandingPreview(true)}
                              className="px-3 py-1.5 text-sm bg-teal-600 hover:bg-teal-700 rounded-lg transition-all flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Preview
                            </button>
                          </div>
                        </div>
                        <div className="relative">
                          <pre className="bg-gray-950 text-gray-300 p-4 rounded-lg max-h-96 overflow-y-auto text-xs font-mono whitespace-pre-wrap break-all">
                            <code>{msg.landingCode}</code>
                          </pre>
                          <div className="absolute top-2 right-2 bg-gray-800 px-2 py-1 rounded text-xs text-gray-400">
                            HTML/CSS
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-800 rounded-2xl p-4 shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <span className="text-sm text-gray-400">PitchCraft is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Edit Mode Input */}
          {editingMessageId && (
            <div className="border-t border-yellow-800 bg-yellow-900/20 backdrop-blur-sm p-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span className="text-yellow-400 font-semibold">Editing Message</span>
                </div>
                <div className="flex items-end w-full p-2 bg-gray-800 rounded-xl border border-yellow-500 focus-within:ring-2 focus-within:ring-yellow-500/70 transition-all shadow-lg">
                  <div className="flex-1 relative flex items-end">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onInput={(e) => {
                        e.currentTarget.style.height = "auto";
                        e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 120)}px`;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleGenerate(editingMessageId);
                        }
                      }}
                      placeholder="Edit your message..."
                      disabled={loading}
                      rows={1}
                      className="w-full min-h-[40px] max-h-[120px] leading-6 p-2 bg-transparent text-gray-100 placeholder-gray-500 outline-none resize-none transition-all"
                      aria-label="Edit message input"
                    />
                  </div>
                  <div className="flex gap-2 ml-2">
                    <button
                      onClick={cancelEditing}
                      className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleGenerate(editingMessageId)}
                      disabled={loading || !editText.trim()}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-all flex items-center gap-1 ${
                        loading || !editText.trim()
                          ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                          : "bg-yellow-600 hover:bg-yellow-700 text-white"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" transform="rotate(90 12 12)" />
                      </svg>
                      Regenerate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Normal Input Area - Only show when there are messages and not editing */}
          {messages.length > 0 && !editingMessageId && (
            <div className="border-t border-gray-800 bg-gray-900/80 backdrop-blur-sm p-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-end w-full p-2 bg-gray-800 rounded-xl border border-gray-700 focus-within:ring-2 focus-within:ring-indigo-500/70 transition-all shadow-lg">
                  <div className="relative shrink-0">
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="appearance-none bg-transparent h-10 pl-10 pr-8 text-gray-100 text-sm outline-none cursor-pointer theme-select"
                      aria-label="Select pitch tone"
                    >
                      <option value="Formal" className="theme-option">Formal</option>
                      <option value="Fun" className="theme-option">Fun</option>
                    </select>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none">
                      {tone === "Formal" ? "🎩" : "🎉"}
                    </span>
                    <svg
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  <div className="self-stretch w-px bg-gray-700 mx-2"></div>

                  <div className="flex-1 relative flex items-end">
                    <textarea
                      ref={textareaRef}
                      value={idea}
                      onChange={(e) => setIdea(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (idea.trim() && !loading) {
                            handleGenerate();
                          }
                        }
                      }}
                      placeholder="Ask for changes or more details..."
                      disabled={loading}
                      rows={1}
                      className="w-full min-h-[40px] max-h-[120px] leading-6 p-2 bg-transparent text-gray-100 placeholder-gray-500 outline-none resize-none transition-all"
                      aria-label="Chat input"
                    />
                    <button
                      onClick={() => handleGenerate()}
                      disabled={loading || !idea.trim()}
                      aria-label="Send message"
                      className={`shrink-0 h-8 w-8 grid place-items-center rounded-lg transition-all shadow-md ml-2
                        ${loading || !idea.trim()
                          ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                          : "bg-gradient-to-br from-indigo-500 to-purple-500 text-white hover:scale-105 hover:shadow-indigo-500/30"
                        }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" transform="rotate(90 12 12)" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mt-2 text-center select-none">
                  Press Enter to send • Shift+Enter for new line
                </div>
              </div>
            </div>
          )}
        </main>


        {/* Modals */}
        {renameModal.show && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center p-4 border-b border-gray-700">
                <h2 className="text-lg font-bold text-indigo-400">
                  Rename Pitch
                </h2>
                <button
                  onClick={() => setRenameModal({ show: false, pitchId: null, newName: "" })}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-all"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <input
                    type="text"
                    value={renameModal.newName}
                    onChange={(e) => setRenameModal({...renameModal, newName: e.target.value})}
                    className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter new pitch name"
                  />
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setRenameModal({ show: false, pitchId: null, newName: "" })}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => renamePitch(renameModal.pitchId, renameModal.newName)}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg text-sm transition-all"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {shareModal.show && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center p-4 border-b border-gray-700">
                <h2 className="text-lg font-bold text-indigo-400">
                  Share Pitch
                </h2>
                <button
                  onClick={() => setShareModal({ show: false, pitchId: null })}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-all"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-4 text-center">
                  <p className="text-gray-300">Share this pitch via link:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={`${window.location.origin}/share/${shareModal.pitchId}`}
                      readOnly
                      className="flex-1 p-3 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => sharePitch(shareModal.pitchId)}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showLandingPreview && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-6xl shadow-2xl">
              <div className="flex justify-between items-center p-4 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-teal-400">
                    🌐 Landing Page Preview
                  </h2>
                  <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded-full">
                    Live Preview
                  </span>
                </div>
                <button
                  onClick={() => setShowLandingPreview(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-all"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4">
                <div className="bg-white rounded-lg overflow-hidden shadow-inner">
                  <iframe
                    srcDoc={currentLandingCode}
                    title="Landing Page Preview"
                    className="w-full h-[70vh] bg-white"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-downloads"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default App;