import { useState } from "react";
import YTPlayer from "@/components/YTPlayer";

const PLAYLIST = [
  { id: "O6HL1Q3MCrM", title: "Phy-01 - Phy-01 অধ্যায় ০১ চেইন", source: "Youtube" },
  { id: "O6HL1Q3MCrM", title: "Phy-02 - Phy-02 অধ্যায় ০১ চেইন", source: "Youtube" },
  { id: "O6HL1Q3MCrM", title: "Phy-03 - Phy-03 অধ্যায় ০১ চেইন", source: "Youtube" },
  { id: "O6HL1Q3MCrM", title: "Phy-04 - Phy-04 অধ্যায় ১০ আদর্শ গ্যাস ও গ্যাসের গতিতত্ত্ব", source: "Youtube" },
  { id: "O6HL1Q3MCrM", title: "Phy-05 - Phy-05 অধ্যায় ১০ আদর্শ গ্যাস ও গ্যাসের গতিতত্ত্ব", source: "Youtube" },
  { id: "O6HL1Q3MCrM", title: "Phy-06 - Phy-06 অধ্যায় ০১ তাপগতিবিজ্ঞান", source: "Youtube" },
  { id: "O6HL1Q3MCrM", title: "Phy-07 - Phy-07 অধ্যায় ০১ তাপগতিবিজ্ঞান", source: "Youtube" },
  { id: "O6HL1Q3MCrM", title: "Phy-08 - Phy-08 অধ্যায় ০১ তাপগতিবিজ্ঞান", source: "Youtube" },
  { id: "O6HL1Q3MCrM", title: "Phy-09 - Phy-09 অধ্যায় ০২ স্থির বিদ্যুৎ", source: "Youtube" },
  { id: "O6HL1Q3MCrM", title: "Phy-10 - Phy-10 অধ্যায় ০২ স্থির বিদ্যুৎ", source: "Youtube" },
];

export default function App() {
  const [activeIndex, setActiveIndex] = useState(4);
  const [source, setSource] = useState<"Source-1" | "Source-2">("Source-2");

  const current = PLAYLIST[activeIndex];
  const prev = activeIndex > 0 ? activeIndex - 1 : null;
  const next = activeIndex < PLAYLIST.length - 1 ? activeIndex + 1 : null;

  return (
    <div className="page-wrap">
      {/* ── Video player ── */}
      <YTPlayer
        key={current.id + activeIndex}
        videoId={current.id}
        title={current.title}
      />

      {/* ── Video title + nav ── */}
      <div className="vid-info">
        <div className="vid-title">{current.title}</div>
        <div className="vid-nav">
          <button
            className="vid-nav-btn"
            disabled={prev === null}
            onClick={() => prev !== null && setActiveIndex(prev)}
          >
            &lt; Previous
          </button>
          <button
            className="vid-nav-btn primary"
            disabled={next === null}
            onClick={() => next !== null && setActiveIndex(next)}
          >
            Next &gt;
          </button>
        </div>
      </div>

      {/* ── Source tabs ── */}
      <div className="source-tabs">
        {(["Source-1", "Source-2"] as const).map((s) => (
          <button
            key={s}
            className={`source-tab${source === s ? " active" : ""}`}
            onClick={() => setSource(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── Playlist ── */}
      <div className="playlist-wrap">
        <div className="playlist-section-title">Up Next</div>
        {PLAYLIST.map((item, i) => (
          <div
            key={i}
            className={`playlist-item${i === activeIndex ? " active" : ""}`}
            onClick={() => setActiveIndex(i)}
          >
            <span className="playlist-num">{i + 1}</span>
            <div className="playlist-text">
              <div className="playlist-name">{item.title}</div>
              <div className="playlist-sub">{item.source}</div>
            </div>
            <span className="playlist-dot" />
          </div>
        ))}
      </div>
    </div>
  );
}
