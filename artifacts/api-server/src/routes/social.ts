import { Router } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const router = Router();
const DATA_DIR = path.resolve(process.cwd(), "data");

function rd<T>(f:string,d:T):T { const p=path.join(DATA_DIR,f); if(!fs.existsSync(p))return d; try{return JSON.parse(fs.readFileSync(p,"utf-8"));}catch{return d;} }
function wr(f:string,d:unknown) { fs.writeFileSync(path.join(DATA_DIR,f),JSON.stringify(d,null,2)); }

interface Answer  { id:string; text:string; authorName:string; authorId:string; timestamp:string; votes:number; voters:string[] }
interface Doubt   { id:string; title:string; text:string; authorName:string; authorId:string; timestamp:string; tags:string[]; answers:Answer[]; resolved:boolean; views:number }
interface Room    { id:string; name:string; topic:string; host:string; members:{id:string;name:string;joined:string}[]; messages:{id:string;author:string;text:string;time:string}[]; maxMembers:number; public:boolean; createdAt:string }
interface MicroVideo { id:string; videoId:string; title:string; subject:string; description:string; duration:string; tags:string[]; views:number; addedAt:string }
interface MarketItem { id:string; teacherName:string; teacherId:string; title:string; desc:string; subject:string; price:number; rating:number; reviews:number; verified:boolean; createdAt:string; videoIds:string[] }

function uid(req:any):string { return req.headers["x-forwarded-for"]?.split(",")[0]?.trim()||req.ip||"unknown"; }
function uname(req:any):string { return req.headers["x-username"]||uid(req); }

/* ══ DOUBTS ══════════════════════════════════════════════════ */
router.get("/doubts", (_r,res) => res.json(rd<Doubt[]>("doubts.json",[])));

router.post("/doubts", (req,res) => {
  const { title, text, tags } = req.body;
  if(!title||!text) return res.status(400).json({error:"title and text required"});
  const doubts = rd<Doubt[]>("doubts.json",[]);
  const d:Doubt = { id:crypto.randomUUID(), title, text, authorName:uname(req), authorId:uid(req), timestamp:new Date().toISOString(), tags:tags||[], answers:[], resolved:false, views:0 };
  doubts.unshift(d); wr("doubts.json",doubts); res.json(d);
});

router.get("/doubts/:id", (req,res) => {
  const doubts = rd<Doubt[]>("doubts.json",[]);
  const d = doubts.find(x=>x.id===req.params.id);
  if(!d) return res.status(404).json({error:"Not found"});
  d.views++; wr("doubts.json",doubts); res.json(d);
});

router.post("/doubts/:id/answer", (req,res) => {
  const {text} = req.body;
  if(!text) return res.status(400).json({error:"text required"});
  const doubts = rd<Doubt[]>("doubts.json",[]);
  const i = doubts.findIndex(x=>x.id===req.params.id);
  if(i===-1) return res.status(404).json({error:"Not found"});
  const a:Answer = { id:crypto.randomUUID(), text, authorName:uname(req), authorId:uid(req), timestamp:new Date().toISOString(), votes:0, voters:[] };
  doubts[i].answers.push(a); wr("doubts.json",doubts); res.json(a);
});

router.post("/doubts/:id/vote/:answerId", (req,res) => {
  const me = uid(req);
  const doubts = rd<Doubt[]>("doubts.json",[]);
  const di = doubts.findIndex(x=>x.id===req.params.id);
  if(di===-1) return res.status(404).json({error:"Not found"});
  const ai = doubts[di].answers.findIndex(a=>a.id===req.params.answerId);
  if(ai===-1) return res.status(404).json({error:"Answer not found"});
  const ans = doubts[di].answers[ai];
  if(ans.voters.includes(me)) { ans.voters=ans.voters.filter(v=>v!==me); ans.votes--; }
  else { ans.voters.push(me); ans.votes++; }
  wr("doubts.json",doubts); res.json({votes:ans.votes});
});

router.patch("/doubts/:id/resolve", (req,res) => {
  const doubts = rd<Doubt[]>("doubts.json",[]);
  const i = doubts.findIndex(x=>x.id===req.params.id);
  if(i===-1) return res.status(404).json({error:"Not found"});
  doubts[i].resolved = !doubts[i].resolved; wr("doubts.json",doubts); res.json({resolved:doubts[i].resolved});
});

/* ══ GROUP STUDY ROOMS ══════════════════════════════════════ */
router.get("/rooms", (_r,res) => {
  const rooms = rd<Room[]>("rooms.json",[]);
  res.json(rooms.map(r=>({...r, messages: r.messages.slice(-20), memberCount:r.members.length})));
});

router.post("/rooms", (req,res) => {
  const {name,topic,maxMembers,isPublic} = req.body;
  if(!name) return res.status(400).json({error:"name required"});
  const rooms = rd<Room[]>("rooms.json",[]);
  const r:Room = { id:crypto.randomUUID(), name, topic:topic||"General Study", host:uname(req), members:[], messages:[], maxMembers:maxMembers||10, public:isPublic!==false, createdAt:new Date().toISOString() };
  rooms.unshift(r); wr("rooms.json",rooms); res.json(r);
});

router.post("/rooms/:id/join", (req,res) => {
  const rooms = rd<Room[]>("rooms.json",[]);
  const i = rooms.findIndex(x=>x.id===req.params.id);
  if(i===-1) return res.status(404).json({error:"Not found"});
  const me = uid(req); const name = uname(req);
  if(!rooms[i].members.find(m=>m.id===me)) {
    if(rooms[i].members.length >= rooms[i].maxMembers) return res.status(400).json({error:"Room is full"});
    rooms[i].members.push({id:me,name,joined:new Date().toISOString()});
    wr("rooms.json",rooms);
  }
  res.json(rooms[i]);
});

router.post("/rooms/:id/leave", (req,res) => {
  const rooms = rd<Room[]>("rooms.json",[]);
  const i = rooms.findIndex(x=>x.id===req.params.id);
  if(i===-1) return res.status(404).json({error:"Not found"});
  const me = uid(req);
  rooms[i].members = rooms[i].members.filter(m=>m.id!==me);
  wr("rooms.json",rooms); res.json({ok:true});
});

router.post("/rooms/:id/message", (req,res) => {
  const {text} = req.body;
  if(!text) return res.status(400).json({error:"text required"});
  const rooms = rd<Room[]>("rooms.json",[]);
  const i = rooms.findIndex(x=>x.id===req.params.id);
  if(i===-1) return res.status(404).json({error:"Not found"});
  const msg = {id:crypto.randomUUID(),author:uname(req),text,time:new Date().toISOString()};
  rooms[i].messages.push(msg);
  if(rooms[i].messages.length>200) rooms[i].messages=rooms[i].messages.slice(-200);
  wr("rooms.json",rooms); res.json(msg);
});

router.delete("/rooms/:id", (req,res) => {
  const rooms = rd<Room[]>("rooms.json",[]);
  wr("rooms.json", rooms.filter(r=>r.id!==req.params.id)); res.json({ok:true});
});

/* ══ MICRO-LEARNING FEED ════════════════════════════════════ */
router.get("/microfeed", (_r,res) => res.json(rd<MicroVideo[]>("microfeed.json",[])));

router.post("/microfeed", (req,res) => {
  const {videoId,title,subject,description,duration,tags} = req.body;
  if(!videoId||!title) return res.status(400).json({error:"videoId and title required"});
  const feed = rd<MicroVideo[]>("microfeed.json",[]);
  const v:MicroVideo = { id:crypto.randomUUID(), videoId, title, subject:subject||"General", description:description||"", duration:duration||"", tags:tags||[], views:0, addedAt:new Date().toISOString() };
  feed.unshift(v); wr("microfeed.json",feed); res.json(v);
});

router.post("/microfeed/:id/view", (req,res) => {
  const feed = rd<MicroVideo[]>("microfeed.json",[]);
  const i = feed.findIndex(x=>x.id===req.params.id);
  if(i>-1) { feed[i].views++; wr("microfeed.json",feed); }
  res.json({ok:true});
});

/* ══ TEACHER MARKETPLACE ════════════════════════════════════ */
router.get("/marketplace", (_r,res) => res.json(rd<MarketItem[]>("marketplace.json",[])));

router.post("/marketplace", (req,res) => {
  const {teacherName,title,desc,subject,price} = req.body;
  if(!title||!teacherName) return res.status(400).json({error:"title and teacherName required"});
  const items = rd<MarketItem[]>("marketplace.json",[]);
  const item:MarketItem = { id:crypto.randomUUID(), teacherName, teacherId:uid(req), title, desc:desc||"", subject:subject||"General", price:price||0, rating:0, reviews:0, verified:false, createdAt:new Date().toISOString(), videoIds:[] };
  items.unshift(item); wr("marketplace.json",items); res.json(item);
});

export default router;
