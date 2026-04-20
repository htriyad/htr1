import { Switch, Route } from "wouter";
import Dashboard from "./pages/Dashboard";
import PastClasses from "./pages/PastClasses";
import VideoPage from "./pages/VideoPage";
import "./index.css";

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/past-classes" component={PastClasses} />
      <Route path="/video/:videoId" component={VideoPage} />
      <Route>
        <Dashboard />
      </Route>
    </Switch>
  );
}
