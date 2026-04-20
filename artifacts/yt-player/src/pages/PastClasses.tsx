import { useState } from "react";
import { useLocation } from "wouter";
import Header from "../components/Header";

const CLASSES = [
  {
    id: "O6HL1Q3MCrM",
    title: "SSC Final Revision Class Bangla-10",
    subjectId: "Ba-10",
    desc: "১ম পত্র- উপন্যাস: ১৯৭১\n২য় পত্র- পরিচ্ছেদ: ৪৫ (সারাংশ ও সারমর্ম), ৪৬ (ভাব-সম্প্রসারণ), ৪৮ (সংবাদ প্রতিবেদন), ৪৯ (প্রবন্ধ)",
    date: "19 Nov, 2025 08:00 PM to 09:45 PM",
    course: "SSC/Dakhil 2026 A to Z Final Revision Course for Science\nSSC A to Z Final Revision Course (Online) 2026",
    online: true,
    thumb: null,
  },
  {
    id: "O6HL1Q3MCrM",
    title: "SSC Final Revision Class ICT-05",
    subjectId: "ICT-05",
    desc: "অধ্যায়-০৬ প্রোগ্রামিংয়ের মাধ্যমে সমস্যার সমাধান: (গাণিতিক অপারেশন থেকে অধ্যায়ের শেষ পর্যন্ত)",
    date: "18 Nov, 2025 05:00 PM to 06:45 PM",
    course: "SSC/Dakhil 2026 A to Z Final Revision Course for Science\nSSC A to Z Final Revision Course (Online) 2026",
    online: true,
    thumb: null,
  },
  {
    id: "O6HL1Q3MCrM",
    title: "SSC Final Revision Class Bangla-09",
    subjectId: "Ba-09",
    desc: "১ম পত্র- কবিতা: আমার পরিচয়, জীবন-সঙ্গীত\n২য় পত্র- পরিচ্ছেদ: ৪০-৪৪",
    date: "17 Nov, 2025 08:00 PM to 09:45 PM",
    course: "SSC/Dakhil 2026 A to Z Final Revision Course for Science",
    online: true,
    thumb: null,
  },
  {
    id: "O6HL1Q3MCrM",
    title: "SSC Final Revision Class Physics-07",
    subjectId: "Phy-07",
    desc: "অধ্যায়-১০: স্থির তড়িৎ (পুরো অধ্যায়)",
    date: "16 Nov, 2025 05:00 PM to 06:45 PM",
    course: "SSC/Dakhil 2026 A to Z Final Revision Course for Science",
    online: true,
    thumb: null,
  },
  {
    id: "O6HL1Q3MCrM",
    title: "SSC Final Revision Class Chemistry-06",
    subjectId: "Chem-06",
    desc: "অধ্যায়-০৮: রাসায়নিক বিক্রিয়া (পুরো অধ্যায়)\nঅধ্যায়-০৯: এসিড-ক্ষার সমতা",
    date: "15 Nov, 2025 07:00 PM to 08:45 PM",
    course: "SSC/Dakhil 2026 A to Z Final Revision Course for Science",
    online: true,
    thumb: null,
  },
];

export default function PastClasses() {
  const [, navigate] = useLocation();
  const [course, setCourse] = useState("");
  const [subject, setSubject] = useState("");

  return (
    <div style={{ background: "var(--bg)", minHeight: "100svh" }}>
      <div className="page">
        <Header showBack backTo="/" />

        <h1 className="pc-title">PAST CLASSES</h1>

        <div className="pc-filters">
          <select className="pc-select" value={course} onChange={(e) => setCourse(e.target.value)}>
            <option value="">All Course</option>
            <option>SSC/Dakhil 2026 Final Revision</option>
            <option>HSC 2026 Final Revision</option>
          </select>
          <select className="pc-select" value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">All Subject</option>
            <option>Bangla</option>
            <option>English</option>
            <option>Physics</option>
            <option>Chemistry</option>
            <option>ICT</option>
          </select>
          <select className="pc-select">
            <option>All Platform</option>
            <option>Online</option>
            <option>Offline</option>
          </select>
        </div>

        <div className="pc-cards">
          {CLASSES.map((cls, i) => (
            <div key={i} className="pc-card">
              {cls.online && <span className="pc-badge">Online</span>}
              <div className="pc-card-title">{cls.title}</div>
              <div className="pc-subject-id">{cls.subjectId}</div>
              <div className="pc-desc" style={{ whiteSpace: "pre-line" }}>{cls.desc}</div>
              <div className="pc-meta-row"><strong>Date &amp; Time</strong></div>
              <div className="pc-meta-row">{cls.date}</div>
              <div className="pc-meta-row" style={{ marginTop: 6 }}><strong>Course</strong></div>
              <div className="pc-meta-row">{cls.course}</div>
              <div className="pc-actions">
                <button
                  className="pc-btn"
                  onClick={() => navigate(`/video/${cls.id}?title=${encodeURIComponent(cls.title)}`)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  Video
                </button>
                <button className="pc-btn" style={{ background: "#374151" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  Notes
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
