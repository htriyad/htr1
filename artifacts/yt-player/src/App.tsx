import { useEffect, useRef, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import Dashboard from "./pages/Dashboard";
import PastClasses from "./pages/PastClasses";
import Courses from "./pages/Courses";
import VideoPage from "./pages/VideoPage";
import Admin from "./pages/Admin";
import IpGate from "./pages/IpGate";
import ExamList from "./pages/ExamList";
import ExamTake from "./pages/ExamTake";
import AiTutor from "./pages/AiTutor";
import AskTeacher from "./pages/AskTeacher";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import SolveSheet from "./pages/SolveSheet";
import LiveClasses from "./pages/LiveClasses";
import Discussion from "./pages/Discussion";
import Flashcards from "./pages/Flashcards";
import StudyTimer from "./pages/StudyTimer";
import Analytics from "./pages/Analytics";
import Tools from "./pages/Tools";
import Formulas from "./pages/Formulas";
import Planner from "./pages/Planner";
import Papers from "./pages/Papers";
import Notes from "./pages/Notes";
import SmartQuiz from "./pages/SmartQuiz";
import Roadmap from "./pages/Roadmap";
import Vault from "./pages/Vault";
import ExamSim from "./pages/ExamSim";
import KnowledgeFractal from "./pages/KnowledgeFractal";
import VocabBuilder from "./pages/VocabBuilder";
import BattleQuiz from "./pages/BattleQuiz";
import FocusRoom from "./pages/FocusRoom";
import StudyRoom from "./pages/StudyRoom";
import Community from "./pages/Community";
import Messages from "./pages/Messages";
import Channels from "./pages/Channels";
import Explore from "./pages/Explore";
import ModLogin from "./pages/ModLogin";
import ModPanel from "./pages/ModPanel";
import FloatingMusic from "./components/FloatingMusic";
import "./index.css";

const savedTheme = localStorage.getItem("rr_theme");
if (savedTheme === "light") document.documentElement.classList.add("light-theme");
else if (savedTheme === "eye") document.documentElement.classList.add("eye-theme");

export const USER_TOKEN_KEY  = "rr_user_token";
export const USER_NAME_KEY   = "rr_username";

/* ── DevTools detection ────────────────────────────────────
   Uses window dimension diff + debugger timing heuristic.
   Fires a security alert to the admin when triggered.      */
let devtoolsAlertSent = false;

function sendSecurityAlert(alertType: string, details?: object) {
  if (devtoolsAlertSent && alertType === "devtools") return;
  devtoolsAlertSent = true;
  const username = localStorage.getItem(USER_NAME_KEY);
  fetch("/api/security/alert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alertType, username, details }),
  }).catch(() => {});
}

function useDevToolsDetection(enabled: boolean) {
  const [devtoolsOpen, setDevtoolsOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    function check() {
      const threshold = 160;
      const widthDiff  = window.outerWidth  - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      const open = widthDiff > threshold || heightDiff > threshold;
      if (open) {
        setDevtoolsOpen(true);
        sendSecurityAlert("devtools", {
          outerWidth: window.outerWidth, innerWidth: window.innerWidth,
          outerHeight: window.outerHeight, innerHeight: window.innerHeight,
        });
      }
    }

    // Also use the console.log image trick
    const img = new Image();
    let fired = false;
    Object.defineProperty(img, "id", {
      get() {
        if (!fired) {
          fired = true;
          setDevtoolsOpen(true);
          sendSecurityAlert("devtools", { method: "console-image" });
        }
        return "";
      },
    });
    // eslint-disable-next-line no-console
    console.log("%c", img);

    intervalRef.current = setInterval(check, 1500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [enabled]);

  return devtoolsOpen;
}

export default function App() {
  const [location] = useLocation();
  const [status, setStatus]   = useState<"loading"|"allowed"|"blocked">("loading");
  const [myIp, setMyIp]       = useState("...");
  const [vpnDetected, setVpn] = useState(false);
  const [banned, setBanned]   = useState(false);

  const isAdmin = location.startsWith("/admin");

  // DevTools detection — active for all logged-in users
  const devtoolsOpen = useDevToolsDetection(status === "allowed" && !isAdmin);

  useEffect(() => {
    if (isAdmin) { setStatus("allowed"); return; }

    const token = localStorage.getItem(USER_TOKEN_KEY);

    if (token) {
      fetch("/api/validate-token", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          if (d.banned) {
            localStorage.removeItem(USER_TOKEN_KEY);
            localStorage.removeItem(USER_NAME_KEY);
            setBanned(true); setStatus("blocked");
          } else if (d.valid) {
            if (d.username) localStorage.setItem(USER_NAME_KEY, d.username);
            setStatus("allowed");
          } else {
            localStorage.removeItem(USER_TOKEN_KEY);
            localStorage.removeItem(USER_NAME_KEY);
            checkIp();
          }
        })
        .catch(() => checkIp());
    } else {
      checkIp();
    }

    function checkIp() {
      fetch("/api/check-ip")
        .then(r => r.json())
        .then(d => {
          setMyIp(d.ip || "unknown");
          if (d.banned || d.userBanned) { setBanned(true); setStatus("blocked"); return; }
          if (d.vpnDetected) { setVpn(true); setStatus("blocked"); return; }
          if (d.allowed) {
            if (d.username) localStorage.setItem(USER_NAME_KEY, d.username);
            setStatus("allowed");
          } else {
            setStatus("blocked");
          }
        })
        .catch(() => setStatus("allowed"));
    }
  }, [isAdmin]);

  if (status === "loading") {
    return (
      <div style={{ minHeight:"100svh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:44 }}>🥀</div>
          <p style={{ marginTop:12, color:"var(--sub)", fontSize:14, fontFamily:"Roboto,sans-serif" }}>Loading RedRose...</p>
        </div>
      </div>
    );
  }

  if (status === "blocked") return <IpGate ip={myIp} vpnDetected={vpnDetected} banned={banned} />;

  return (
    <>
      {/* DevTools Alert Overlay */}
      {devtoolsOpen && (
        <div style={{
          position:"fixed", inset:0, zIndex:99999,
          background:"rgba(185,28,28,0.97)", display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", padding:24, textAlign:"center",
        }}>
          <div style={{ fontSize:64, marginBottom:16 }}>🚨</div>
          <h1 style={{ fontSize:26, fontWeight:900, color:"#fff", fontFamily:"Lato,sans-serif", marginBottom:12 }}>
            Security Alert!
          </h1>
          <p style={{ fontSize:16, color:"#fecaca", lineHeight:1.8, maxWidth:440, marginBottom:24 }}>
            Developer tools have been detected.<br/>
            This incident has been <b>automatically reported to the admin</b>.<br/>
            Unauthorized inspection of this platform is strictly prohibited.
          </p>
          <p style={{ fontSize:13, color:"#fca5a5" }}>
            Please close your browser developer tools to continue.
          </p>
        </div>
      )}

      <Switch>
        <Route path="/"                component={Dashboard} />
        <Route path="/past-classes"    component={PastClasses} />
        <Route path="/courses"         component={Courses} />
        <Route path="/video/:videoId"  component={VideoPage} />
        <Route path="/exams"           component={ExamList} />
        <Route path="/exam/:examId"    component={ExamTake} />
        <Route path="/ai-tutor"        component={AiTutor} />
        <Route path="/ask"             component={AskTeacher} />
        <Route path="/profile"         component={Profile} />
        <Route path="/leaderboard"     component={Leaderboard} />
        <Route path="/solve-sheet"     component={SolveSheet} />
        <Route path="/live-class"      component={LiveClasses} />
        <Route path="/discussion"      component={Discussion} />
        <Route path="/flashcards"      component={Flashcards} />
        <Route path="/study-timer"     component={StudyTimer} />
        <Route path="/analytics"       component={Analytics} />
        <Route path="/tools"           component={Tools} />
        <Route path="/formulas"        component={Formulas} />
        <Route path="/planner"         component={Planner} />
        <Route path="/papers"          component={Papers} />
        <Route path="/notes"           component={Notes} />
        <Route path="/smart-quiz"      component={SmartQuiz} />
        <Route path="/roadmap"         component={Roadmap} />
        <Route path="/vault"           component={Vault} />
        <Route path="/exam-sim/:examId" component={ExamSim} />
        <Route path="/fractal"         component={KnowledgeFractal} />
        <Route path="/vocab"             component={VocabBuilder} />
        <Route path="/battle-quiz"       component={BattleQuiz} />
        <Route path="/focus-room"        component={FocusRoom} />
        <Route path="/study-room/:id"    component={StudyRoom} />
        <Route path="/study-room"        component={StudyRoom} />
        <Route path="/community"         component={Community} />
        <Route path="/messages/:threadId" component={Messages} />
        <Route path="/messages"          component={Messages} />
        <Route path="/channels"          component={Channels} />
        <Route path="/explore"           component={Explore} />
        <Route path="/mod-login"         component={ModLogin} />
        <Route path="/mod"               component={ModPanel} />
        <Route path="/admin"           component={Admin} />
        <Route><Dashboard /></Route>
      </Switch>
      <FloatingMusic />
    </>
  );
}
