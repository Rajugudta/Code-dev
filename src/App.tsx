/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, signInAnonymously, signOut, User, updateProfile, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { 
  BookOpen, 
  Code, 
  Mic, 
  User as UserIcon, 
  Trophy, 
  Flame, 
  LayoutDashboard, 
  LogOut,
  PlayCircle,
  BrainCircuit,
  MessageSquare,
  Menu,
  X,
  Briefcase,
  Star,
  Users,
  Terminal,
  HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import YouTube from "react-youtube";
import Editor from "react-simple-code-editor";
// @ts-ignore
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/themes/prism-tomorrow.css";
import { generateContent, ROADMAP_SYSTEM_PROMPT, TUTOR_SYSTEM_PROMPT, CODE_EVALUATION_SYSTEM_PROMPT, PLACEMENT_SYSTEM_PROMPT } from "./services/geminiService";

// Types
type Tab = "dashboard" | "roadmaps" | "practice" | "mock-interviews" | "lectures" | "community" | "ai-tutor" | "placement";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab ] = useState<Tab>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [usernameInput, setUsernameInput] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const userDoc = await getDoc(doc(db, "users", u.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        } else if (u.displayName) {
          const newData = {
            uid: u.uid,
            displayName: u.displayName,
            xp: 0,
            level: 1,
            streak: 1,
            lectureProgress: {},
            lastActive: new Date().toISOString()
          };
          await setDoc(doc(db, "users", u.uid), newData);
          setUserData(newData);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    
    setLoading(true);
    setLoginError(null);
    
    // We'll use Guest Mode by default for the username login to ensure the app "just works"
    // regardless of Firebase's Anonymous Auth setting.
    const guestData = {
      uid: "guest_" + Math.random().toString(36).substr(2, 9),
      displayName: usernameInput,
      xp: 0,
      level: 1,
      streak: 1,
      lectureProgress: {},
      isGuest: true,
      lastActive: new Date().toISOString()
    };
    
    try {
      // Opt-in: Try to sign in anonymously if it's available, for backend persistence
      const cred = await signInAnonymously(auth);
      await updateProfile(cred.user, { displayName: usernameInput });
      
      const newData = {
        ...guestData,
        uid: cred.user.uid,
        isGuest: false
      };
      await setDoc(doc(db, "users", cred.user.uid), newData);
      setUserData(newData);
      setUser(cred.user);
    } catch (error: any) {
      console.warn("Anonymous auth restricted, entering local-only Guest Mode.", error);
      // Fail gracefully to Guest Mode - common in sandboxed environments
      setUserData(guestData);
      setUser({ uid: guestData.uid, displayName: guestData.displayName } as any);
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setLoading(true);
    setLoginError(null);
    try {
      const res = await signInWithPopup(auth, provider);
      const userDoc = await getDoc(doc(db, "users", res.user.uid));
      if (!userDoc.exists()) {
        const newData = {
          uid: res.user.uid,
          displayName: res.user.displayName,
          xp: 0,
          level: 1,
          streak: 1,
          lectureProgress: {},
          lastActive: new Date().toISOString()
        };
        await setDoc(doc(db, "users", res.user.uid), newData);
        setUserData(newData);
      } else {
        setUserData(userDoc.data());
      }
    } catch (error: any) {
      console.error("Google login failed", error);
      if (error.code === "auth/admin-restricted-operation" || error.code === "auth/popup-blocked") {
        setLoginError("Login blocked by browser or restricted configuration. Try the name login above.");
      } else {
        setLoginError("Google Login failed. Please try the name login or check your connection.");
      }
    }
    setLoading(false);
  };

  const handleLogout = () => signOut(auth);

  const awardXP = async (amount: number) => {
    if (!userData) return;
    
    // Update local state first for immediate feedback
    setUserData((prev: any) => ({ ...prev, xp: (prev?.xp || 0) + amount }));

    // Update database if not a guest
    if (user && !userData.isGuest && auth.currentUser) {
      try {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          xp: increment(amount)
        });
      } catch (e) {
        console.error("Failed to sync XP to database:", e);
      }
    }
  };

  if (loading) return (
    <div className="flex bg-[#0a0a0a] items-center justify-center min-h-screen text-white">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      >
        <BrainCircuit className="w-12 h-12 text-blue-500" />
      </motion.div>
    </div>
  );

  if (!user || !userData) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-white p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full p-10 rounded-[2.5rem] bg-[#111] border border-white/10 backdrop-blur-3xl text-center space-y-8 shadow-2xl relative z-10"
      >
        <div className="space-y-4">
          <div className="w-20 h-20 bg-blue-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/10">
            <BrainCircuit className="w-12 h-12 text-blue-500" />
          </div>
          <h1 className="text-4xl font-black tracking-tight uppercase tracking-widest text-white">Code dev</h1>
          <p className="text-gray-400 text-sm">Welcome back! Just enter your name to start your personal coding journey.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative group">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
            <input 
              required
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="What should we call you?"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-12 py-4 outline-none focus:border-blue-500 transition-all font-medium text-lg placeholder:text-gray-600"
            />
          </div>

          {loginError && (
            <motion.p 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="text-red-500 text-xs font-bold text-left px-2"
            >
              {loginError}
            </motion.p>
          )}

          <button 
            type="submit"
            className="w-full py-5 px-6 bg-blue-600 hover:bg-blue-700 rounded-2xl font-bold text-lg shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            Start Learning <Star className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4 py-2">
            <div className="h-[1px] flex-1 bg-white/10" />
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">or</span>
            <div className="h-[1px] flex-1 bg-white/10" />
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-4 px-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-semibold transition-all flex items-center justify-center gap-3 group"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all" alt="Google" />
            Continue with Google
          </button>
        </form>

        <div className="pt-6 border-t border-white/5">
           <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Joined by 10k+ engineering students</p>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden font-sans">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-8 h-8 text-blue-500" />
          <span className="font-bold text-lg">Code dev</span>
        </div>
        <button onClick={() => setIsSidebarOpen(true)}>
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth > 1024) && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className={`fixed lg:relative z-50 w-72 h-full bg-[#0d0d0d] border-r border-white/5 flex flex-col p-6 transition-all ${!isSidebarOpen && 'hidden lg:flex'}`}
          >
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <BrainCircuit className="w-6 h-6 text-blue-500" />
                </div>
                <h1 className="text-xl font-bold tracking-tight uppercase tracking-widest text-blue-500">Code dev</h1>
              </div>
              <button className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 space-y-2">
              <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === "dashboard"} onClick={() => {setActiveTab("dashboard"); setIsSidebarOpen(false);}} />
              <NavItem icon={<BookOpen size={20} />} label="Roadmaps" active={activeTab === "roadmaps"} onClick={() => {setActiveTab("roadmaps"); setIsSidebarOpen(false);}} />
              <NavItem icon={<PlayCircle size={20} />} label="Lectures" active={activeTab === "lectures"} onClick={() => {setActiveTab("lectures"); setIsSidebarOpen(false);}} />
              <NavItem icon={<Code size={20} />} label="Practice" active={activeTab === "practice"} onClick={() => {setActiveTab("practice"); setIsSidebarOpen(false);}} />
              <NavItem icon={<Mic size={20} />} label="AI Tutor" active={activeTab === "ai-tutor"} onClick={() => {setActiveTab("ai-tutor"); setIsSidebarOpen(false);}} />
              <NavItem icon={<MessageSquare size={20} />} label="Mock interviews" active={activeTab === "mock-interviews"} onClick={() => {setActiveTab("mock-interviews"); setIsSidebarOpen(false);}} />
              <NavItem icon={<Briefcase size={20} />} label="Placement Hub" active={activeTab === "placement"} onClick={() => {setActiveTab("placement"); setIsSidebarOpen(false);}} />
              <NavItem icon={<Trophy size={20} />} label="Leaderboard" active={activeTab === "community"} onClick={() => {setActiveTab("community"); setIsSidebarOpen(false);}} />
            </nav>

            <div className="mt-auto space-y-4 pt-6 border-t border-white/5">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center font-bold text-blue-500">
                  {userData?.displayName?.[0] || "?"}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">{userData?.displayName}</p>
                  <p className="text-xs text-blue-500">Level {userData?.level || 1}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Log out</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-6 lg:p-10 pt-24 lg:pt-10 overflow-y-auto w-full">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('-', ' ')}
            </h2>
            <p className="text-gray-400 mt-1">Hello, {userData?.displayName?.split(' ')[0]}! Track your progress and keep learning.</p>
          </div>
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2 bg-orange-500/10 text-orange-500 px-4 py-2 rounded-2xl border border-orange-500/20">
                <Flame className="w-5 h-5" />
                <span className="font-bold">{userData?.streak || 0}</span>
             </div>
             <div className="flex items-center gap-2 bg-blue-500/10 text-blue-500 px-4 py-2 rounded-2xl border border-blue-500/20">
                <Trophy className="w-5 h-5" />
                <span className="font-bold">{userData?.xp || 0} XP</span>
             </div>
          </div>
        </header>

        <section className="flex-1 w-full max-w-6xl mx-auto">
          {activeTab === "dashboard" && <Dashboard userData={userData} setActiveTab={setActiveTab} />}
          {activeTab === "roadmaps" && <RoadmapSection />}
          {activeTab === "practice" && <PracticeSection awardXP={awardXP} />}
          {activeTab === "lectures" && <LecturesSection userData={userData} awardXP={awardXP} />}
          {activeTab === "ai-tutor" && <AITutorSection awardXP={awardXP} />}
          {activeTab === "mock-interviews" && <MockInterviewSection awardXP={awardXP} />}
          {activeTab === "placement" && <PlacementSection />}
          {activeTab === "community" && <LeaderboardSection userData={userData} />}
        </section>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group ${
        active 
          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-semibold" 
          : "text-gray-400 hover:text-white hover:bg-white/5"
      }`}
    >
      <span className={active ? "text-white" : "text-gray-400 group-hover:text-blue-500 transition-colors"}>
        {icon}
      </span>
      <span className="text-sm">{label}</span>
    </button>
  );
}

function Dashboard({ userData, setActiveTab }: { userData: any, setActiveTab: (tab: Tab) => void }) {
  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-900 p-8 md:p-12 text-white">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold leading-[1.1] mb-4">Complete your Daily Coding Challenge.</h1>
          <p className="text-blue-100/80 text-lg mb-8">Maintain your streak of {userData?.streak || 0} days and earn 50 Bonus XP today!</p>
          <button 
            onClick={() => setActiveTab("practice")}
            className="px-8 py-4 bg-white text-blue-900 font-bold rounded-2xl transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-black/10"
          >
            Start Challenge
          </button>
        </div>
        <BrainCircuit className="absolute top-1/2 -right-20 -translate-y-1/2 w-96 h-96 text-white/10 rotate-12" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatsCard title="Completed Lessons" value="12/45" progress={28} />
        <StatsCard title="AI Accuracy Score" value="84%" progress={84} />
        <StatsCard title="Placement Readiness" value="Ready" color="bg-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Roadmaps */}
        <div className="bg-[#151515] border border-white/5 rounded-[2rem] p-8 space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Your Active Roadmaps</h3>
              <button onClick={() => setActiveTab("roadmaps")} className="text-sm font-medium text-blue-500 hover:underline">View All</button>
           </div>
           <div className="space-y-4">
              <RoadmapItem title="Data Structures & Algorithms" progress={45} lessons="12/30" />
              <RoadmapItem title="Full Stack Web Dev" progress={10} lessons="3/45" />
           </div>
        </div>

        {/* Global Leaderboard Preview */}
        <div className="bg-[#151515] border border-white/5 rounded-[2rem] p-8 space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Global Leaderboard</h3>
              <Trophy className="w-5 h-5 text-yellow-500" />
           </div>
           <div className="space-y-4">
              <LeaderboardItem rank={1} name="Aman Gupta" xp={2450} isMe={false} />
              <LeaderboardItem rank={2} name="Srijan Verma" xp={2310} isMe={false} />
              <LeaderboardItem rank={15} name={userData?.displayName || "You"} xp={userData?.xp || 0} isMe={true} />
           </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, progress, color = "bg-blue-600" }: { title: string, value: string, progress?: number, color?: string }) {
  return (
    <div className="bg-[#151515] border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-white/10 transition-all">
      <p className="text-sm text-gray-400 mb-2">{title}</p>
      <h4 className="text-3xl font-bold mb-4">{value}</h4>
      {progress !== undefined && (
        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className={`h-full ${color}`}
          />
        </div>
      )}
    </div>
  );
}

function RoadmapItem({ title, progress, lessons }: { title: string, progress: number, lessons: string }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer group">
      <div className="flex-1">
        <h5 className="font-semibold text-sm group-hover:text-blue-500 transition-colors">{title}</h5>
        <p className="text-xs text-gray-500 mt-1">{lessons} lessons completed</p>
      </div>
      <div className="w-12 h-12 rounded-full border-2 border-white/10 flex items-center justify-center relative">
        <span className="text-[10px] font-bold">{progress}%</span>
      </div>
    </div>
  );
}

function LeaderboardItem({ rank, name, xp, isMe }: { rank: number, name: string, xp: number, isMe: boolean }) {
  return (
    <div className={`flex items-center gap-4 p-3 rounded-2xl ${isMe ? 'bg-blue-500/10 border border-blue-500/20' : ''}`}>
      <span className={`w-8 text-center text-sm font-bold ${rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-400' : 'text-gray-600'}`}>{rank}</span>
      <p className="text-sm font-medium truncate flex-1">{name}</p>
      <span className="text-sm font-bold text-gray-400">{xp} XP</span>
    </div>
  );
}

function RoadmapSection() {
  const [topic, setTopic] = useState("");
  const [roadmap, setRoadmap] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateRoadmap = async (selectedTopic: string) => {
    setLoading(true);
    setTopic(selectedTopic);
    try {
      const prompt = `Generate a detailed learning roadmap for ${selectedTopic}. Levels: Beginner, Intermediate, Advanced.`;
      const res = await generateContent(prompt, ROADMAP_SYSTEM_PROMPT);
      setRoadmap(res.text);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const topics = ["C++", "Java", "Python", "Data Structures", "Full Stack", "System Design", "Cloud Computing"];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-4 mb-12">
        <h3 className="text-4xl font-bold">What's your next goal?</h3>
        <p className="text-gray-400">Select a topic to generate your AI-powered learning path.</p>
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {topics.map(t => (
            <button 
              key={t}
              onClick={() => generateRoadmap(t)}
              className="px-6 py-2 rounded-full border border-white/10 hover:bg-white/10 transition-all font-medium"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
           <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity }} className="w-16 h-16 bg-blue-500/20 rounded-3xl flex items-center justify-center">
              <BrainCircuit className="w-8 h-8 text-blue-500" />
           </motion.div>
           <p className="text-gray-400 animate-pulse">Crafting your roadmap with engineering precision...</p>
        </div>
      ) : roadmap ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#151515] border border-white/5 rounded-[2.5rem] p-8 lg:p-12 prose prose-invert prose-blue max-w-none shadow-2xl"
        >
          <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
            <div>
              <h4 className="text-2xl font-bold m-0">{topic} Path</h4>
              <p className="text-gray-400 mt-1">Generated by Code dev • Free Resources Only</p>
            </div>
            <button onClick={() => setRoadmap(null)} className="text-sm font-medium text-blue-500">Reset</button>
          </div>
          <Markdown>{roadmap}</Markdown>
        </motion.div>
      ) : (
        <div className="bg-white/5 border border-white/5 rounded-3xl p-10 text-center">
           <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
           <p className="text-gray-400">Your custom learning path will appear here.</p>
        </div>
      )}
    </div>
  );
}

function PracticeSection({ awardXP }: { awardXP: (amount: number) => Promise<void> }) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All");
  const [solvingQuestion, setSolvingQuestion] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<"javascript" | "python" | "cpp">("javascript");
  const [code, setCode] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<string | null>(null);

  const questions = [
    { id: 1, title: "Two Sum", difficulty: "Easy", topic: "Arrays", platform: "LeetCode" },
    { id: 2, title: "Reverse Linked List", difficulty: "Easy", topic: "Linked List", platform: "LeetCode" },
    { id: 3, title: "Longest Substring Without Repeating Characters", difficulty: "Medium", topic: "Sliding Window", platform: "LeetCode" },
    { id: 4, title: "Kth Largest Element in an Array", difficulty: "Medium", topic: "Heaps", platform: "LeetCode" },
    { id: 5, title: "Median of Two Sorted Arrays", difficulty: "Hard", topic: "Binary Search", platform: "LeetCode" },
    { id: 6, title: "Merge K Sorted Lists", difficulty: "Hard", topic: "Heaps", platform: "LeetCode" },
    { id: 7, title: "Valid Parentheses", difficulty: "Easy", topic: "Stacks", platform: "LeetCode" },
    { id: 8, title: "Binary Tree Level Order Traversal", difficulty: "Medium", topic: "Trees", platform: "LeetCode" },
    { id: 9, title: "Course Schedule", difficulty: "Medium", topic: "Graphs", platform: "LeetCode" },
    { id: 10, title: "Trapping Rain Water", difficulty: "Hard", topic: "Two Pointers", platform: "LeetCode" },
    { id: 11, title: "Word Ladder", difficulty: "Hard", topic: "BFS", platform: "LeetCode" },
    { id: 12, title: "Best Time to Buy and Sell Stock", difficulty: "Easy", topic: "Arrays", platform: "LeetCode" },
  ];

  const starters: Record<string, Record<number, string>> = {
    javascript: {
      1: "function twoSum(nums, target) {\n  // Write your code here\n}",
      2: "function reverseList(head) {\n  // Write your code here\n}",
      3: "function lengthOfLongestSubstring(s) {\n  // Write your code here\n}",
      4: "function findKthLargest(nums, k) {\n  // Write your code here\n}",
      5: "function findMedianSortedArrays(nums1, nums2) {\n  // Write your code here\n}",
      6: "function mergeKLists(lists) {\n  // Write your code here\n}",
      7: "function isValid(s) {\n  // Write code here\n}",
      8: "function levelOrder(root) {\n  // Write code here\n}",
      9: "function canFinish(numCourses, prerequisites) {\n  // Write code here\n}",
      10: "function trap(height) {\n  // Write code here\n}",
      11: "function ladderLength(beginWord, endWord, wordList) {\n  // Write code here\n}",
      12: "function maxProfit(prices) {\n  // Write code here\n}",
    },
    python: {
      1: "def twoSum(nums: List[int], target: int) -> List[int]:\n    # Write your code here\n    pass",
      2: "def reverseList(head: Optional[ListNode]) -> Optional[ListNode]:\n    # Write your code here\n    pass",
      3: "def lengthOfLongestSubstring(s: str) -> int:\n    # Write your code here\n    pass",
      4: "def findKthLargest(nums: List[int], k: int) -> int:\n    # Write your code here\n    pass",
      5: "def findMedianSortedArrays(nums1: List[int], nums2: List[int]) -> float:\n    # Write your code here\n    pass",
      6: "def mergeKLists(lists: List[Optional[ListNode]]) -> Optional[ListNode]:\n    # Write your code here\n    pass",
      7: "def isValid(s: str) -> bool:\n    # Write code here\n    pass",
      8: "def levelOrder(root: Optional[TreeNode]) -> List[List[int]]:\n    # Write code here\n    pass",
      9: "def canFinish(numCourses: int, prerequisites: List[List[int]]) -> bool:\n    # Write code here\n    pass",
      10: "def trap(height: List[int]) -> int:\n    # Write code here\n    pass",
      11: "def ladderLength(beginWord: str, endWord: str, wordList: List[str]) -> int:\n    # Write code here\n    pass",
      12: "def maxProfit(prices: List[int]) -> int:\n    # Write code here\n    pass",
    },
    cpp: {
      1: "vector<int> twoSum(vector<int>& nums, int target) {\n    // Write your code here\n}",
      2: "ListNode* reverseList(ListNode* head) {\n    // Write your code here\n}",
      3: "int lengthOfLongestSubstring(string s) {\n    // Write your code here\n}",
      4: "int findKthLargest(vector<int>& nums, int k) {\n    // Write your code here\n}",
      5: "double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {\n    // Write your code here\n}",
      6: "ListNode* mergeKLists(vector<ListNode*>& lists) {\n    // Write your code here\n}",
      7: "bool isValid(string s) {\n    // Write code here\n}",
      8: "vector<vector<int>> levelOrder(TreeNode* root) {\n    // Write code here\n}",
      9: "bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {\n    // Write code here\n}",
      10: "int trap(vector<int>& height) {\n    // Write code here\n}",
      11: "int ladderLength(string beginWord, string endWord, vector<string>& wordList) {\n    // Write code here\n}",
      12: "int maxProfit(vector<int>& prices) {\n    // Write code here\n}",
    }
  };

  const handleLanguageChange = (lang: "javascript" | "python" | "cpp") => {
    setSelectedLanguage(lang);
    if (solvingQuestion) {
      setCode(starters[lang][solvingQuestion.id]);
    }
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const prompt = `Problem: ${solvingQuestion.title}\nTopic: ${solvingQuestion.topic}\nLanguage: ${selectedLanguage}\nCandidate Code:\n${code}`;
      const res = await generateContent(prompt, CODE_EVALUATION_SYSTEM_PROMPT);
      setEvaluation(res.text);
      if (res.text.toLowerCase().includes("correct")) {
        awardXP(30);
      }
    } catch (e) {
      console.error(e);
      setEvaluation("Error evaluating code. Please try again.");
    }
    setEvaluating(false);
  };

  const filtered = selectedDifficulty === "All" ? questions : questions.filter(q => q.difficulty === selectedDifficulty);

  if (solvingQuestion) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between gap-4">
          <button onClick={() => {setSolvingQuestion(null); setEvaluation(null);}} className="text-blue-500 hover:underline flex items-center gap-2 font-bold">
            <X size={16} /> Back to Hub
          </button>

          <div className="flex items-center bg-white/5 rounded-2xl p-1 border border-white/10">
            {[
              { id: 'javascript', label: 'JS', icon: 'JS' },
              { id: 'python', label: 'PY', icon: 'PY' },
              { id: 'cpp', label: 'C++', icon: 'C++' }
            ].map(lang => (
              <button
                key={lang.id}
                onClick={() => handleLanguageChange(lang.id as any)}
                className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedLanguage === lang.id ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-[#151515] border border-white/5 rounded-[2rem] p-8">
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <h3 className="text-2xl font-bold uppercase tracking-tight">{solvingQuestion.title}</h3>
                    <p className="text-gray-400 mt-1">{solvingQuestion.topic} • {solvingQuestion.difficulty}</p>
                 </div>
                 <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase ${
                    solvingQuestion.difficulty === "Easy" ? 'bg-emerald-500/10 text-emerald-500' :
                    solvingQuestion.difficulty === "Medium" ? 'bg-orange-500/10 text-orange-500' :
                    'bg-red-500/10 text-red-500'
                 }`}>
                    {solvingQuestion.difficulty}
                 </span>
              </div>
              <div className="prose prose-invert max-w-none">
                <p>Implement the solution for <strong>{solvingQuestion.title}</strong> in <strong>{selectedLanguage === 'cpp' ? 'C++' : selectedLanguage.toUpperCase()}</strong>. Use the editor to write your solution and click evaluate to get AI feedback.</p>
              </div>
            </div>

            {evaluation && (
               <motion.div 
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="bg-white/5 border border-white/10 rounded-[2rem] p-8 prose prose-invert max-w-none"
               >
                 <Markdown>{evaluation}</Markdown>
               </motion.div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-[#0d0d0d] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
              <div className="bg-white/5 px-6 py-3 border-b border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{selectedLanguage === 'cpp' ? 'C++' : selectedLanguage.toUpperCase()} Editor</span>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
              </div>
              <div className="min-h-[400px] bg-[#050505] p-4 overflow-auto">
                <Editor
                  value={code}
                  onValueChange={setCode}
                  highlight={(code) => {
                    const langMap = {
                      javascript: languages.javascript,
                      python: languages.python,
                      cpp: languages.cpp
                    };
                    return highlight(code, langMap[selectedLanguage], selectedLanguage);
                  }}
                  padding={20}
                  style={{
                    fontFamily: '"Fira code", "Fira Mono", monospace',
                    fontSize: 14,
                    minHeight: "350px",
                    outline: 'none'
                  }}
                  className="outline-none"
                />
              </div>
            </div>
            <button 
              onClick={handleEvaluate}
              disabled={evaluating || !code.trim()}
              className="w-full py-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-2xl font-bold transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"
            >
              {evaluating ? "Evaluating Logic..." : "Evaluate Solution"} <BrainCircuit size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="text-3xl font-bold">Coding Practice Hub</h3>
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
          {["All", "Easy", "Medium", "Hard"].map(d => (
            <button 
              key={d}
              onClick={() => setSelectedDifficulty(d)}
              className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${selectedDifficulty === d ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(q => (
          <div key={q.id} className="bg-[#151515] border border-white/10 rounded-3xl p-6 hover:border-blue-500/50 transition-all cursor-pointer group">
            <div className="flex justify-between items-start mb-4">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                q.difficulty === "Easy" ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                q.difficulty === "Medium" ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}>
                {q.difficulty}
              </span>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-blue-500">Solve in App</span>
            </div>
            <h4 className="text-lg font-bold mb-2 group-hover:text-blue-500 transition-colors uppercase tracking-tight">{q.title}</h4>
            <p className="text-sm text-gray-500 mt-6">{q.topic}</p>
            <button 
              onClick={() => {setSolvingQuestion(q); setCode(starters[selectedLanguage][q.id]);}}
              className="mt-6 w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
            >
              Solve Now <Terminal size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function LecturesSection({ userData, awardXP }: { userData: any, awardXP: (amount: number) => Promise<void> }) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  
  const lectures = [
    { id: "cpp-babbar", title: "C++ Placement Series", channel: "Love Babbar", count: "145 Videos", lang: "Hindi", icon: "🚀", videoId: "ZJXQfSowNHA" },
    { id: "java-kunal", title: "Java + DSA + Interview Prep", channel: "Kunal Kushwaha", count: "80 Videos", lang: "English", icon: "☕", videoId: "wq0r6vM3O2o" },
    { id: "dsa-striver", title: "A to Z DSA Course", channel: "take U forward", count: "120 Videos", lang: "Hindi/English", icon: "🎯", videoId: "EAR7De6Gue4" },
    { id: "python-harry", title: "Python for Beginners", channel: "CodeWithHarry", count: "100 Videos", lang: "Hindi", icon: "🐍", videoId: "aqvD6Oux8Hw" },
    { id: "web-apna", title: "Web Development Bootcamp", channel: "Apna College", count: "90 Videos", lang: "Hindi", icon: "🌐", videoId: "viHILXVY_eU" },
    { id: "sql-mosh", title: "SQL Full Course", channel: "Programming with Mosh", count: "1 Video", lang: "English", icon: "📊", videoId: "HXV3zeQKqGY" },
    { id: "react-freecode", title: "React JS Course 2024", channel: "freeCodeCamp", count: "1 Video", lang: "English", icon: "⚛️", videoId: "bMknfKXIFA8" },
    { id: "os-gate", title: "Operating Systems", channel: "GateSmashers", count: "110 Videos", lang: "Hindi", icon: "💻", videoId: "vBURTt97EkA" },
    { id: "ts-fireship", title: "TypeScript in 100 Seconds", channel: "Fireship", count: "1 Video", lang: "English", icon: "📘", videoId: "zQnBQ4tB3ZA" },
    { id: "go-todd", title: "Go Programming Course", channel: "Todd McLeod", count: "40 Videos", lang: "English", icon: "🐹", videoId: "YS4e4q9oBaU" },
    { id: "rust-freecode", title: "Rust for Beginners", channel: "freeCodeCamp", count: "1 Video", lang: "English", icon: "🦀", videoId: "Ms2a5Utp670" },
    { id: "swift-hacking", title: "SwiftUI for Beginners", channel: "Hacking with Swift", count: "100 Videos", lang: "English", icon: "🍎", videoId: "Ulp1Kimblg0" },
    { id: "kotlin-amigos", title: "Kotlin Full Course", channel: "Amigoscode", count: "1 Video", lang: "English", icon: "📱", videoId: "F9UC9DY-vIU" },
    { id: "ruby-freecode", title: "Ruby on Rails", channel: "freeCodeCamp", count: "1 Video", lang: "English", icon: "💎", videoId: "fmyvWz5m61Y" },
    { id: "csharp-mosh", title: "C# Fundamentals", channel: "Programming with Mosh", count: "1 Video", lang: "English", icon: "♯", videoId: "gfkTfcpWqAY" },
    { id: "php-traversy", title: "PHP For Beginners", channel: "Traversy Media", count: "1 Video", lang: "English", icon: "🐘", videoId: "zZ6vybT1HQs" },
    { id: "scala-rock", title: "Scala for Beginners", channel: "Rock the JVM", count: "1 Video", lang: "English", icon: "🔮", videoId: "v_7rX8Z1Qp0" },
    { id: "dart-filled", title: "Dart Programming", channel: "FilledStacks", count: "1 Video", lang: "English", icon: "🎯", videoId: "5F-6n_2Xp8U" },
  ];

  const getProgress = (id: string) => {
    return userData?.lectureProgress?.[id] || 0;
  };

  const handleComplete = async (id: string) => {
    if (getProgress(id) === 100) return;
    
    // Local update
    const newProgress = { ...(userData.lectureProgress || {}), [id]: 100 };
    // We need a way to update userData from here. 
    // Since userData is passed as prop, we should probably have an updateUserData function or use awardXP as a proxy for generic updates.
    // However, I'll assume for now I will add a generic updateUserData in App.
    awardXP(100); // Massive XP for completing a playlist/major video
    
    // Save to Firestore
    if (auth.currentUser && !userData.isGuest) {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        [`lectureProgress.${id}`]: 100
      });
    }
  };

  if (activeVideo) {
    const lecture = lectures.find(l => l.videoId === activeVideo);
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between gap-4">
          <button onClick={() => setActiveVideo(null)} className="text-blue-500 hover:scale-105 transition-transform flex items-center gap-2 font-bold mb-4">
            <X size={16} /> Back to Library
          </button>
          {lecture && getProgress(lecture.id) < 100 && (
            <button 
              onClick={() => handleComplete(lecture.id)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              Mark Playlist Completed <Trophy size={14} />
            </button>
          )}
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="aspect-video w-full rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 bg-black"
        >
           <YouTube 
             videoId={activeVideo} 
             className="w-full h-full"
             opts={{
               width: '100%',
               height: '100%',
               playerVars: { autoplay: 1, rel: 0, modestbranding: 1 }
             }}
           />
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#151515] border border-white/5 p-8 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-6"
        >
           <div>
              <h3 className="text-2xl font-bold uppercase tracking-tight">{lecture?.title}</h3>
              <p className="text-gray-400 mt-2">Streaming directly within Code dev. Learn effectively without YouTube distractions.</p>
           </div>
           {lecture && (
             <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Progress</p>
                  <p className="text-lg font-black text-blue-500">{getProgress(lecture.id)}%</p>
                </div>
                <div className="w-12 h-12 rounded-full border-2 border-blue-500/20 flex items-center justify-center relative">
                   <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-spin" style={{ animationDuration: '3s' }} />
                   <Star size={16} className="text-blue-500" />
                </div>
             </div>
           )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="max-w-xl">
        <h3 className="text-3xl font-bold mb-2 uppercase tracking-tight">Full-App Learning</h3>
        <p className="text-gray-400">Master engineering concepts with interactive tracking and zero distractions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
        {lectures.map((l, i) => (
          <motion.div 
            key={l.id} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setActiveVideo(l.videoId)}
            className="group relative flex flex-col bg-[#151515] border border-white/5 rounded-[2.5rem] hover:bg-white/[0.07] transition-all cursor-pointer shadow-xl shadow-black/20 overflow-hidden active:scale-[0.98]"
          >
            {/* Progress Bar Top */}
            <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${getProgress(l.id)}%` }}
                className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
              />
            </div>

            <div className="flex gap-6 p-8">
              <div className="w-20 h-20 bg-blue-600/10 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform shadow-inner">
                {l.icon}
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-lg font-bold group-hover:text-blue-500 transition-colors tracking-tight">{l.title}</h4>
                  {getProgress(l.id) === 100 && <Star size={14} className="text-emerald-500 fill-emerald-500" />}
                </div>
                <p className="text-sm text-gray-400">{l.channel} • {l.lang}</p>
                <div className="flex items-center gap-4 mt-4">
                   <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full">{l.count}</span>
                   <span className="text-xs font-bold flex items-center gap-1 text-gray-400 group-hover:text-white transition-colors">
                      Watch & Track <PlayCircle size={14} />
                   </span>
                </div>
              </div>
            </div>
            
            {/* Hover visual feedback */}
            <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/[0.02] transition-colors pointer-events-none" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}


function AITutorSection({ awardXP }: { awardXP: (amount: number) => Promise<void> }) {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [mode, setMode] = useState<"general" | "walkthrough" | "debug">("general");
  
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Speech recognition not supported in this browser.");
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setIsListening(false);
      handleAsk(text);
    };
    recognition.onstart = () => setIsListening(true);
    recognition.onerror = () => setIsListening(false);
    recognition.start();
  };

  const handleAsk = async (text: string) => {
    setIsAnswering(true);
    try {
      let specificPrompt = text;
      if (mode === "walkthrough") {
        specificPrompt = `Provide a step-by-step code walkthrough for: ${text}`;
      } else if (mode === "debug") {
        specificPrompt = `Help me debug this code and explain the fixes: ${text}`;
      }
      
      const res = await generateContent(specificPrompt, TUTOR_SYSTEM_PROMPT);
      setAnswer(res.text);
      
      awardXP(10);
    } catch (e) {
      console.error(e);
      setAnswer("Sorry, I encountered an error. Please try again.");
    }
    setIsAnswering(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="text-center space-y-4">
        <h3 className="text-4xl font-bold">AI Engineering Tutor</h3>
        <p className="text-gray-400">Personalized assistance for coding, debugging, and concept clarity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TutorModeCard 
          icon={<HelpCircle size={20} />} 
          label="Concept Clarity" 
          active={mode === "general"} 
          onClick={() => setMode("general")} 
          description="Ask general engineering questions"
        />
        <TutorModeCard 
          icon={<Terminal size={20} />} 
          label="Code Walkthrough" 
          active={mode === "walkthrough"} 
          onClick={() => setMode("walkthrough")} 
          description="Step-by-step logic explanation"
        />
        <TutorModeCard 
          icon={<BrainCircuit size={20} />} 
          label="Debug Assistant" 
          active={mode === "debug"} 
          onClick={() => setMode("debug")} 
          description="Find bugs in your code"
        />
      </div>

      <div className="space-y-6">
        <div className="bg-[#151515] border border-white/5 rounded-[2rem] p-8 min-h-[150px] flex flex-col justify-between shadow-2xl">
          <textarea 
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={mode === "debug" ? "Paste your buggy code here..." : "What are you struggling with today?"}
            className="text-xl bg-transparent border-none outline-none resize-none w-full h-32 placeholder:text-gray-600"
          />
          
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
             <div className="flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}></div>
               <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{isListening ? "Listening..." : "Ready to help"}</span>
             </div>
             
             <div className="flex gap-4">
                <button 
                  onClick={startListening}
                  disabled={isListening || isAnswering}
                  className={`p-4 rounded-2xl transition-all ${isListening ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
                >
                  <Mic className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => handleAsk(transcript)}
                  disabled={!transcript || isAnswering}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-bold shadow-xl shadow-blue-600/20 transition-all flex items-center gap-2"
                >
                  Ask Tutor <BrainCircuit size={20} />
                </button>
             </div>
          </div>
        </div>

        {isAnswering && (
          <div className="text-center py-20 bg-white/5 rounded-[2rem] border border-white/5">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="inline-block">
               <BrainCircuit className="w-12 h-12 text-blue-500" />
            </motion.div>
            <p className="text-sm text-gray-400 mt-6 font-bold uppercase tracking-widest animate-pulse">Analyzing problem space...</p>
          </div>
        )}

        {answer && !isAnswering && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#151515] border border-white/10 rounded-[2.5rem] p-10 prose prose-invert lg:prose-xl max-w-none shadow-2xl"
          >
            <Markdown>{answer}</Markdown>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function TutorModeCard({ icon, label, description, active, onClick }: { icon: React.ReactNode, label: string, description: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`p-6 rounded-3xl border text-left transition-all group ${active ? 'bg-blue-600 border-blue-500 shadow-xl shadow-blue-600/20' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${active ? 'bg-white/20' : 'bg-blue-500/10 text-blue-500'}`}>
        {icon}
      </div>
      <h4 className={`font-bold ${active ? 'text-white' : 'text-gray-300'}`}>{label}</h4>
      <p className={`text-xs mt-1 ${active ? 'text-blue-100' : 'text-gray-500'}`}>{description}</p>
    </button>
  );
}

function MockInterviewSection({ awardXP }: { awardXP: (amount: number) => Promise<void> }) {
  const [stage, setStage] = useState<"idle" | "interviewing" | "feedback">("idle");
  const [topic, setTopic] = useState("");
  const [chat, setChat] = useState<{ role: "ai" | "user", text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const startInterview = async (t: string) => {
    setTopic(t);
    setLoading(true);
    setStage("interviewing");
    setChat([]); // Clear previous chat
    try {
      const prompt = `Start a technical interview for ${t}. Ask the first question.`;
      const res = await generateContent(prompt, "You are a senior technical interviewer. Ask one challenging question at a time. Be professional.");
      setChat([{ role: "ai", text: res.text }]);
    } catch (e) {
      console.error(e);
      setChat([{ role: "ai", text: "Sorry, I had trouble connecting to the interview server. Please try again." }]);
    }
    setLoading(false);
  };

  const handleResponse = async (userText: string) => {
    setChat(prev => [...prev, { role: "user", text: userText }]);
    setLoading(true);
    try {
      const history = chat.map(c => `${c.role === "ai" ? "Interviewer" : "Candidate"}: ${c.text}`).join("\n");
      const prompt = `Interview History:\n${history}\nCandidate Response: ${userText}\n\nProvide feedback on the answer and ask the next question or conclude.`;
      const res = await generateContent(prompt, "You are a senior technical interviewer. Evaluate the candidate and ask the next question.");
      setChat(prev => [...prev, { role: "ai", text: res.text }]);
    } catch (e) {
      console.error(e);
      setChat(prev => [...prev, { role: "ai", text: "Something went wrong. Let's try that again." }]);
    }
    setLoading(false);
  };

  if (stage === "idle") {
    return (
      <div className="space-y-12 max-w-4xl mx-auto">
        <div className="text-center space-y-4">
          <h3 className="text-4xl font-bold">AI Mock Interview</h3>
          <p className="text-gray-400">Simulate a real-world technical interview with Code dev AI.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {["Data Structures", "Frontend Dev", "Backend Dev", "System Design", "Behavioral", "Python"].map(t => (
            <button 
              key={t}
              onClick={() => startInterview(t)}
              className="p-8 bg-[#151515] border border-white/5 rounded-3xl hover:border-blue-500/50 transition-all text-left group"
            >
              <MessageSquare className="w-8 h-8 text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
              <h4 className="text-xl font-bold">{t}</h4>
              <p className="text-sm text-gray-500 mt-2">Start a 15-min practice session</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[70vh] bg-[#151515] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <h4 className="font-bold">Live Interview: {topic}</h4>
        </div>
        <button onClick={async () => {
          awardXP(50);
          setStage("idle");
        }} className="text-xs text-gray-400 hover:text-white flex items-center gap-2">
          <X size={14} /> Finish session
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {chat.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl ${msg.role === "user" ? "bg-blue-600 text-white shadow-xl shadow-blue-600/10" : "bg-white/5 text-gray-200 border border-white/5"}`}>
              <Markdown>{msg.text}</Markdown>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/5 p-4 rounded-2xl animate-pulse text-gray-500 text-sm italic border border-white/5">Interviewer is typing...</div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-white/5 bg-[#0d0d0d]">
        <form onSubmit={(e: any) => {
          e.preventDefault();
          const val = e.target.elements.response.value;
          if (val && !loading) {
            handleResponse(val);
            e.target.reset();
          }
        }} className="flex gap-4">
          <input 
            name="response" 
            autoComplete="off"
            placeholder="Type your answer here..."
            className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
          />
          <button type="submit" disabled={loading} className="bg-blue-600 px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2">
            Send <BrainCircuit size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

function PlacementSection() {
  const [activeSubTab, setActiveSubTab] = useState<"aptitude" | "resume">("aptitude");
  const [aptitudeView, setAptitudeView] = useState<"list" | "quiz">("list");
  const [currentQuiz, setCurrentQuiz] = useState<any>(null);
  const [quizOutput, setQuizOutput] = useState<string | null>(null);
  const [quizLanguage, setQuizLanguage] = useState("JavaScript");

  const aptitudeTopics = [
    { title: "Quantitative Aptitude", desc: "Number systems, percentages, profit & loss", icon: <Briefcase /> },
    { title: "Logical Reasoning", desc: "Syllogisms, blood relations, seating arrangements", icon: <BrainCircuit /> },
    { title: "Technical Quiz", desc: "Language specific syntax and mechanics", icon: <Terminal /> },
    { title: "Data Interpretation", desc: "Bar graphs, pie charts, table data", icon: <Trophy /> }
  ];

  const handleStartQuiz = (topic: string) => {
    setCurrentQuiz(topic);
    setAptitudeView("quiz");
    setQuizOutput("Preparing " + topic + " questions in " + quizLanguage + "...");
    
    generateContent(`Give me 5 challenging ${topic} questions (multiple choice) relevant to ${quizLanguage} if it's a technical quiz, or generic if it's aptitude. Include correct answers and detailed explanations. Format as professional Markdown.`, PLACEMENT_SYSTEM_PROMPT)
      .then(res => setQuizOutput(res.text))
      .catch(() => setQuizOutput("Failed to load questions. Please try again."));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => {setActiveSubTab("aptitude"); setAptitudeView("list");}} className={`px-6 py-2 rounded-2xl font-bold transition-all ${activeSubTab === "aptitude" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white bg-white/5"}`}>Hub & Quizzes</button>
          <button onClick={() => setActiveSubTab("resume")} className={`px-6 py-2 rounded-2xl font-bold transition-all ${activeSubTab === "resume" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white bg-white/5"}`}>AI Resume Helper</button>
        </div>

        {activeSubTab === "aptitude" && aptitudeView === "list" && (
           <select 
             value={quizLanguage}
             onChange={(e) => setQuizLanguage(e.target.value)}
             className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold outline-none text-blue-400"
           >
             {["JavaScript", "Python", "Java", "C++", "TypeScript", "Go", "Rust", "Swift", "Kotlin", "Ruby", "C#", "PHP", "Scala", "Dart"].map(l => (
               <option key={l} value={l} className="bg-[#0a0a0a] text-white">{l} Context</option>
             ))}
           </select>
        )}
      </div>

      {activeSubTab === "aptitude" && (
        <>
          {aptitudeView === "list" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {aptitudeTopics.map(t => (
                <div key={t.title} className="bg-[#151515] border border-white/5 p-8 rounded-[2rem] space-y-4 hover:border-blue-500/50 transition-all cursor-pointer group">
                   <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition-transform">
                      {t.icon}
                   </div>
                   <h4 className="text-xl font-bold tracking-tight">{t.title}</h4>
                   <p className="text-sm text-gray-400">{t.desc}</p>
                   <button 
                     onClick={() => handleStartQuiz(t.title)}
                     className="text-sm font-bold text-blue-500 flex items-center gap-2 pt-4 group-hover:translate-x-2 transition-transform"
                   >
                     Start Practice Session <Star size={14} />
                   </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
               <button onClick={() => setAptitudeView("list")} className="text-blue-500 font-bold mb-4 flex items-center gap-2">
                 <X size={16} /> End Session
               </button>
               <div className="bg-[#151515] border border-white/5 p-8 lg:p-12 rounded-[2.5rem] prose prose-invert max-w-none shadow-2xl">
                  <h3 className="text-2xl font-bold mb-6">{currentQuiz} Quiz</h3>
                  <Markdown>{quizOutput || ""}</Markdown>
               </div>
            </div>
          )}
        </>
      )}

      {activeSubTab === "resume" && <ResumeBuilder />}
    </div>
  );
}

function ResumeBuilder() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: "", email: "", skills: "", projects: "" });
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const handleImprove = async () => {
    setLoading(true);
    try {
      const prompt = `Review this project description and improve it using the STAR method for a software engineering resume:\n${formData.projects}\n\nCandidate Skills: ${formData.skills}`;
      const res = await generateContent(prompt, PLACEMENT_SYSTEM_PROMPT);
      setSuggestion(res.text);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="bg-[#151515] border border-white/5 rounded-[2.5rem] p-8 lg:p-12 flex flex-col md:flex-row gap-12">
      <div className="flex-1 space-y-6">
         <div>
            <h3 className="text-2xl font-bold">Resume Optimizer</h3>
            <p className="text-gray-400 text-sm mt-1">Refine your project descriptions with AI.</p>
         </div>
         
         <div className="space-y-4">
            <div className="space-y-2">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Key Skills (Comma separated)</label>
               <input 
                 value={formData.skills} 
                 onChange={(e) => setFormData({...formData, skills: e.target.value})}
                 className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-blue-500 transition-all font-medium"
                 placeholder="React, Node.js, Python..."
               />
            </div>
            <div className="space-y-2">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Paste Project Description</label>
               <textarea 
                 value={formData.projects} 
                 onChange={(e) => setFormData({...formData, projects: e.target.value})}
                 className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-blue-500 transition-all font-medium h-40 resize-none"
                 placeholder="I built a chat app using socket.io..."
               />
            </div>
            <button 
              onClick={handleImprove}
              disabled={loading || !formData.projects}
              className="w-full py-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-2xl font-bold transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"
            >
              {loading ? "Optimizing..." : "Improve with STAR Method"} <Star size={18} />
            </button>
         </div>
      </div>

      <div className="flex-1">
        <div className="h-full min-h-[400px] bg-[#0d0d0d] border border-white/5 rounded-3xl p-8 overflow-y-auto">
           {suggestion ? (
             <div className="prose prose-invert max-w-none">
                <div className="flex items-center gap-2 text-blue-500 mb-4 font-bold text-sm uppercase tracking-widest">
                   <BrainCircuit size={16} /> AI Suggestions
                </div>
                <Markdown>{suggestion}</Markdown>
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                <Star size={40} className="text-gray-600" />
                <p className="text-gray-500 text-sm">Your optimized points will appear here.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

function LeaderboardSection({ userData }: { userData: any }) {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="bg-[#151515] border border-white/5 rounded-[2.5rem] p-4 lg:p-6 shadow-2xl relative overflow-hidden">
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-extrabold tracking-tight uppercase flex items-center gap-3">
              <Trophy className="text-yellow-500" /> Global Hall of Fame
            </h3>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest px-4 py-2 bg-white/5 rounded-full">Season 1</span>
          </div>
          
          <div className="space-y-2">
            <TopRank rank={1} name="Nirav Shah" xp={4520} badge="C++ Wizard" />
            <TopRank rank={2} name="Ananya Reddy" xp={4120} badge="Algorithm Expert" />
            <TopRank rank={3} name="Rahul Dravid" xp={3890} badge="Java Hero" />
          </div>

          <div className="pt-6 border-t border-white/5 space-y-3">
            {[4, 5, 6, 7, 8].map(i => (
              <div key={i} className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all cursor-pointer">
                <span className="w-8 text-sm font-bold text-gray-600">#{i}</span>
                <div className="w-10 h-10 bg-white/10 rounded-xl" />
                <div className="flex-1">
                   <p className="text-sm font-bold">Student {i}</p>
                   <p className="text-[10px] text-gray-500 uppercase tracking-widest">IIT Madras</p>
                </div>
                <span className="text-sm font-bold text-gray-400">{3500 - i*100} XP</span>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-white/5">
            <div className="p-4 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center gap-4">
               <span className="w-8 text-sm font-bold text-blue-500">#42</span>
               <p className="flex-1 text-sm font-bold">You ({userData?.displayName || "Anonymous"})</p>
               <span className="text-sm font-bold text-blue-500">{userData?.xp || 0} XP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopRank({ rank, name, xp, badge }: { rank: number, name: string, xp: number, badge: string }) {
  const colors = [
    "bg-yellow-500/10 border-yellow-500/30 text-yellow-500",
    "bg-gray-400/10 border-gray-400/30 text-gray-400",
    "bg-orange-700/10 border-orange-700/30 text-orange-700"
  ];
  return (
    <div className={`p-5 rounded-3xl border flex items-center gap-4 ${colors[rank-1]}`}>
        <span className="text-2xl font-black">#{rank}</span>
        <div className="w-12 h-12 bg-white/10 rounded-2xl" />
        <div className="flex-1">
          <p className="font-bold">{name}</p>
          <div className="flex items-center gap-2 mt-1">
             <Star size={10} fill="currentColor" />
             <span className="text-[10px] font-bold uppercase tracking-widest">{badge}</span>
          </div>
        </div>
        <div className="text-right">
           <p className="text-lg font-black">{xp}</p>
           <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">XP Total</p>
        </div>
    </div>
  );
}

function PlaceholderSection({ icon, title }: { icon: React.ReactNode, title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
      <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center text-gray-400">
        {icon}
      </div>
      <h3 className="text-2xl font-bold">{title}</h3>
      <p className="text-gray-400 max-w-sm">This module is under development. We're sourcing the best engineering content for you.</p>
    </div>
  );
}

