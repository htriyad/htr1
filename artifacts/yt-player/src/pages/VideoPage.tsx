import { useState } from "react";
import { useParams, useLocation } from "wouter";
import Header from "../components/Header";
import YTPlayer from "../components/YTPlayer";

export default function VideoPage() {
  const params = useParams<{ videoId: string }>();
  const [location] = useLocation();

  const searchStr = location.includes("?") ? location.split("?")[1] : "";
  const searchParams = new URLSearchParams(searchStr);
  const title = searchParams.get("title") || "SSC Final Revision Class Bangla-10";

  const videoId = params.videoId || "O6HL1Q3MCrM";

  const [activeSource, setActiveSource] = useState<1 | 2>(2);
  const [activeLang, setActiveLang] = useState<"bn" | "en">("bn");

  return (
    <div className="vp-page">
      <div className="page" style={{ padding: 0 }}>
        <Header showBack backTo="/past-classes" title={title} />

        {/* Player */}
        <div style={{ background: "#000" }}>
          <YTPlayer videoId={videoId} title={title} />
        </div>

        {/* Source tabs */}
        <div className="vp-source-tabs">
          <button
            className={`vp-source-tab ${activeSource === 1 ? "active" : ""}`}
            onClick={() => setActiveSource(1)}
          >
            Source-1
          </button>
          <button
            className={`vp-source-tab ${activeSource === 2 ? "active" : ""}`}
            onClick={() => setActiveSource(2)}
          >
            Source-2
          </button>
        </div>

        {/* Class info card */}
        <div className="vp-info-card">
          <div className="vp-lang-row">
            <button
              className={`vp-lang-btn ${activeLang === "bn" ? "active" : ""}`}
              onClick={() => setActiveLang("bn")}
            >বাংলা</button>
            <button
              className={`vp-lang-btn ${activeLang === "en" ? "active" : ""}`}
              onClick={() => setActiveLang("en")}
            >English</button>
          </div>

          <div className="vp-card-title">{title}</div>
          <div className="vp-card-date">Nov 19, 2025, 8:00 PM to 9:45 PM</div>

          <div className="vp-card-subject">Ba-10</div>
          <div className="vp-card-desc" style={{ whiteSpace: "pre-line" }}>
            {activeLang === "bn"
              ? "১ম পত্র- উপন্যাস: ১৯৭১\n২য় পত্র- পরিচ্ছেদ: ৪৫ (সারাংশ ও সারমর্ম), ৪৬ (ভাব-সম্প্রসারণ), ৪৮ (সংবাদ প্রতিবেদন), ৪৯ (প্রবন্ধ)"
              : "1st Paper- Novel: 1971\n2nd Paper- Chapter: 45 (Summary), 46 (Expansion), 48 (News Report), 49 (Essay)"}
          </div>

          <div className="vp-card-links">
            <button className="vp-card-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Video
            </button>
            <button className="vp-card-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Notes
            </button>
          </div>
        </div>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
