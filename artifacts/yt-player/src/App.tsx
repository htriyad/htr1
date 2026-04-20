import { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import Dashboard from "./pages/Dashboard";
import PastClasses from "./pages/PastClasses";
import VideoPage from "./pages/VideoPage";
import Admin from "./pages/Admin";
import IpGate from "./pages/IpGate";
import ExamList from "./pages/ExamList";
import ExamTake from "./pages/ExamTake";
import "./index.css";

const savedTheme = localStorage.getItem("rr_theme");
if (savedTheme === "eye") document.documentElement.classList.add("eye-theme");

export const USER_TOKEN_KEY  = "rr_user_token";
export const USER_NAME_KEY   = "rr_username";

export default function App() {
  const [location] = useLocation();
  const [status, setStatus] = useState<"loading"|"allowed"|"blocked">("loading");
  const [myIp, setMyIp]     = useState("...");

  const isAdmin = location.startsWith("/admin");

  useEffect(() => {
    if (isAdmin) { setStatus("allowed"); return; }

    const token = localStorage.getItem(USER_TOKEN_KEY);

    // If we have a saved token, validate it first
    if (token) {
      fetch("/api/validate-token", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          if (d.valid) {
            if (d.username) localStorage.setItem(USER_NAME_KEY, d.username);
            setStatus("allowed");
          } else {
            // Token expired — remove and fall back to IP check
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
          if (d.allowed) {
            if (d.username) localStorage.setItem(USER_NAME_KEY, d.username);
            setStatus("allowed");
          } else {
            setStatus("blocked");
          }
        })
        .catch(() => setStatus("allowed")); // graceful fail-open
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

  if (status === "blocked") return <IpGate ip={myIp} />;

  return (
    <Switch>
      <Route path="/"                component={Dashboard} />
      <Route path="/past-classes"    component={PastClasses} />
      <Route path="/video/:videoId"  component={VideoPage} />
      <Route path="/exams"           component={ExamList} />
      <Route path="/exam/:examId"    component={ExamTake} />
      <Route path="/admin"           component={Admin} />
      <Route><Dashboard /></Route>
    </Switch>
  );
}
