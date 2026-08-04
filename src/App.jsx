import React, { useEffect, useRef, useState } from "react";
import { Flame, Dumbbell, Check, RotateCcw, Zap, Crown, Trophy, Droplet, Scale, Pencil, Users, LogOut, Shield, Swords, Gem, Sparkles, Lock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

const ROSTER_KEY = "roster:v2";
const ME_KEY = "me:v2";
const TOTAL = 75;

const BASE_TASKS = [
  { key: "w1", label: "Workout 1", icon: Dumbbell },
  { key: "w2", label: "Workout 2", icon: Dumbbell },
  { key: "water", label: "Water", icon: Droplet },
  { key: "reading", label: "Bonus", icon: Sparkles, optional: true },
];
const WATER_TARGET_ML = 2000;
const WATER_STEP_ML = 250;
const REQUIRED = BASE_TASKS.filter((t) => !t.optional);
const tasksFor = (player) => BASE_TASKS.map((t) => (t.key === "reading" ? { ...t, label: player.customActivity || "Bonus" } : t));
const isTaskDone = (x, key) => (!x ? false : key === "water" ? (x.water || 0) >= WATER_TARGET_ML : !!x[key]);
const allDone = (x) => !!x && REQUIRED.every((t) => isTaskDone(x, t.key));
const anyDone = (x) => !!x && BASE_TASKS.some((t) => isTaskDone(x, t.key));

const COLORS = [
  { text: "text-amber-400", badge: "bg-amber-500", solid: "bg-amber-400", dim: "bg-amber-800", from: "from-amber-500", to: "to-orange-500", border: "border-amber-500", ring: "ring-amber-400", hex: "#fbbf24" },
  { text: "text-cyan-400", badge: "bg-cyan-500", solid: "bg-cyan-400", dim: "bg-cyan-800", from: "from-cyan-500", to: "to-sky-500", border: "border-cyan-500", ring: "ring-cyan-400", hex: "#22d3ee" },
  { text: "text-emerald-400", badge: "bg-emerald-500", solid: "bg-emerald-400", dim: "bg-emerald-800", from: "from-emerald-500", to: "to-teal-500", border: "border-emerald-500", ring: "ring-emerald-400", hex: "#34d399" },
  { text: "text-violet-400", badge: "bg-violet-500", solid: "bg-violet-400", dim: "bg-violet-800", from: "from-violet-500", to: "to-purple-500", border: "border-violet-500", ring: "ring-violet-400", hex: "#a78bfa" },
  { text: "text-rose-400", badge: "bg-rose-500", solid: "bg-rose-400", dim: "bg-rose-800", from: "from-rose-500", to: "to-pink-500", border: "border-rose-500", ring: "ring-rose-400", hex: "#fb7185" },
  { text: "text-sky-400", badge: "bg-sky-500", solid: "bg-sky-400", dim: "bg-sky-800", from: "from-sky-500", to: "to-blue-500", border: "border-sky-500", ring: "ring-sky-400", hex: "#38bdf8" },
];
const colorFor = (i) => COLORS[i % COLORS.length];

// ---- date helpers (local) ----
const pad = (n) => String(n).padStart(2, "0");
const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const todayStr = () => toStr(new Date());
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
const dayInfo = (startDate) => {
  const raw = daysBetween(startDate, todayStr()) + 1;
  return { raw, notStarted: raw < 1, complete: raw > TOTAL, currentDay: Math.min(Math.max(raw, 1), TOTAL) };
};

// ---- game math ----
const tasksDone = (days) => Object.values(days).reduce((n, x) => n + BASE_TASKS.reduce((m, t) => m + (isTaskDone(x, t.key) ? 1 : 0), 0), 0);
const clearedCount = (days) => Object.values(days).filter(allDone).length;
const xpOf = (days) => tasksDone(days) * 10 + clearedCount(days) * 20;
const levelOf = (xp) => Math.floor(xp / 100) + 1;
const RANKS = [
  { min: 1, name: "Rookie", icon: Shield },
  { min: 3, name: "Grinder", icon: Swords },
  { min: 5, name: "Beast", icon: Flame },
  { min: 8, name: "Machine", icon: Gem },
  { min: 11, name: "Legend", icon: Crown },
];
function rankFor(lvl) { let r = RANKS[0]; for (const x of RANKS) if (lvl >= x.min) r = x; return r; }
function longestStreak(days) {
  let best = 0, cur = 0;
  for (let d = 1; d <= TOTAL; d++) { if (allDone(days[d])) { cur++; best = Math.max(best, cur); } else cur = 0; }
  return best;
}
function perfectWeeks(days) {
  let n = 0;
  for (let w = 0; w * 7 < TOTAL; w++) {
    const a = w * 7 + 1, b = Math.min((w + 1) * 7, TOTAL);
    let full = true;
    for (let d = a; d <= b; d++) if (!allDone(days[d])) { full = false; break; }
    if (full) n++;
  }
  return n;
}
const countTask = (days, key) => Object.values(days).filter((x) => x && x[key]).length;

const ACHIEVEMENTS = [
  { id: "first", label: "First Blood", desc: "Clear your first day", icon: Zap, test: (c) => c.cleared >= 1 },
  { id: "week", label: "Week Warrior", desc: "7-day streak", icon: Flame, test: (c) => c.longest >= 7 },
  { id: "fortnight", label: "Iron Will", desc: "14-day streak", icon: Shield, test: (c) => c.longest >= 14 },
  { id: "flawless", label: "Flawless Week", desc: "One full 7-day week", icon: Sparkles, test: (c) => c.perfectWeeks >= 1 },
  { id: "half", label: "Halfway Hero", desc: "38 days cleared", icon: Swords, test: (c) => c.cleared >= 38 },
  { id: "lvl10", label: "Max Grinder", desc: "Reach level 10", icon: Gem, test: (c) => c.lvl >= 10 },
  { id: "bookworm", label: "Side Quest", desc: "20 sessions of your bonus habit", icon: Sparkles, test: (c) => c.reading >= 20 },
  { id: "finish", label: "75 Legend", desc: "All 75 days cleared", icon: Crown, test: (c) => c.cleared >= 75 },
];
function streakOf(days, currentDay) {
  let start = allDone(days[currentDay]) ? currentDay : currentDay - 1;
  let s = 0;
  for (let d = start; d >= 1; d--) { if (allDone(days[d])) s++; else break; }
  return s;
}
const bmiOf = (lbs, inches) => (lbs > 0 && inches > 0 ? (703 * lbs) / (inches * inches) : null);
const bmiCat = (b) => (b < 18.5 ? "Underweight" : b < 25 ? "Healthy" : b < 30 ? "Overweight" : "Obese");
const bmiColor = (b) => (b >= 18.5 && b < 25 ? "text-emerald-400" : b >= 30 ? "text-rose-400" : "text-amber-400");

const WORKOUT_TYPES = ["Run", "Walk", "Hike", "Weights", "Cycle", "Swim", "Yoga", "Sports", "Other"];
const MOODS = [
  { key: "dying", label: "Dying", emoji: "\u{1F480}" },
  { key: "tired", label: "Tired", emoji: "\u{1F634}" },
  { key: "sore", label: "Sore", emoji: "\u{1F975}" },
  { key: "meh", label: "Meh", emoji: "\u{1F610}" },
  { key: "good", label: "Good", emoji: "\u{1F642}" },
  { key: "energetic", label: "Energetic", emoji: "\u26A1" },
];
function weekRange(currentDay) { const w = Math.floor((currentDay - 1) / 7); return [w * 7 + 1, Math.min((w + 1) * 7, TOTAL)]; }
function weekSummary(days, currentDay) {
  const [a, b] = weekRange(currentDay);
  let workouts = 0, stepsSum = 0, stepsN = 0, calSum = 0, calN = 0; const moodCount = {};
  for (let d = a; d <= b; d++) {
    const x = days[d]; if (!x) continue;
    if (x.log?.w1?.type) workouts++;
    if (x.log?.w2?.type) workouts++;
    if (x.metrics?.steps) { stepsSum += Number(x.metrics.steps); stepsN++; }
    if (x.metrics?.calories) { calSum += Number(x.metrics.calories); calN++; }
    if (x.mood) moodCount[x.mood] = (moodCount[x.mood] || 0) + 1;
  }
  let topMood = null, topN = 0;
  for (const k in moodCount) if (moodCount[k] > topN) { topN = moodCount[k]; topMood = k; }
  return { a, b, workouts, avgSteps: stepsN ? Math.round(stepsSum / stepsN) : null, avgCal: calN ? Math.round(calSum / calN) : null, topMood };
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const ROSTER_CACHE_KEY = "roster_cache:v2";
function readCache() { try { const c = localStorage.getItem(ROSTER_CACHE_KEY); return c ? JSON.parse(c) : null; } catch { return null; } }
function writeCache(r) { try { localStorage.setItem(ROSTER_CACHE_KEY, JSON.stringify(r)); } catch {} }

export default function App() {
  const [roster, setRoster] = useState(undefined); // undefined=loading
  const [meId, setMeId] = useState(null);
  const [offline, setOffline] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [busy, setBusy] = useState(false);
  const rosterRef = useRef(roster);
  rosterRef.current = roster;

  const hasStore = typeof window !== "undefined" && window.storage;

  async function loadRoster() {
    if (!hasStore) { setOffline(true); return readCache() || { players: {} }; }
    try {
      const r = await window.storage.get(ROSTER_KEY, true);
      const parsed = r ? JSON.parse(r.value) : { players: {} };
      writeCache(parsed);
      setSyncError(false);
      return parsed;
    } catch {
      // Backend unreachable (rate limit, network blip, etc). Fall back to
      // the last known-good copy instead of pretending there's no data —
      // that false-empty state is what was bouncing people to onboarding.
      setSyncError(true);
      return readCache() || rosterRef.current || { players: {} };
    }
  }
  async function saveRoster(r) {
    writeCache(r);
    if (!hasStore) { setOffline(true); return; }
    try { await window.storage.set(ROSTER_KEY, JSON.stringify(r), true); setSyncError(false); }
    catch { setSyncError(true); }
  }
  async function loadMe() {
    if (!hasStore) return null;
    try { const r = await window.storage.get(ME_KEY, false); return r ? r.value : null; } catch { return null; }
  }
  async function saveMe(id) { if (hasStore) { try { await window.storage.set(ME_KEY, id, false); } catch {} } }
  async function clearMe() { if (hasStore) { try { await window.storage.delete(ME_KEY, false); } catch {} } }

  useEffect(() => { (async () => { const r = await loadRoster(); setRoster(r); const m = await loadMe(); if (m) setMeId(m); })(); }, []); // eslint-disable-line

  // Merges against the roster already held in memory instead of re-fetching
  // first. Cuts requests to the free backend roughly in half — every tap
  // used to cost a read AND a write, which burns through a free tier fast.
  async function updateRoster(mutator) {
    setBusy(true);
    const base = rosterRef.current || readCache() || { players: {} };
    const next = mutator(JSON.parse(JSON.stringify(base)));
    setRoster(next);
    await saveRoster(next);
    setBusy(false);
  }
  async function refresh() { setBusy(true); setRoster(await loadRoster()); setBusy(false); }

  function createPlayer(name, startDate, customActivity) {
    const id = newId();
    updateRoster((r) => { r.players[id] = { id, name: name.trim() || "Player", startDate: startDate || todayStr(), customActivity: (customActivity || "").trim(), days: {}, stats: null }; return r; });
    setMeId(id); saveMe(id);
  }
  function claim(id) { setMeId(id); saveMe(id); }
  function switchUser() { setMeId(null); clearMe(); }

  function toggle(day, key) {
    updateRoster((r) => {
      const p = r.players[meId]; if (!p) return r;
      const d = p.days[day] || { w1: false, w2: false, water: 0, reading: false };
      d[key] = !d[key]; p.days[day] = d; return r;
    });
  }
  function changeWater(day, deltaMl) {
    updateRoster((r) => {
      const p = r.players[meId]; if (!p) return r;
      const d = p.days[day] || { w1: false, w2: false, water: 0, reading: false };
      d.water = Math.max(0, (d.water || 0) + deltaMl);
      p.days[day] = d; return r;
    });
  }
  function saveStats(stats) { updateRoster((r) => { if (r.players[meId]) r.players[meId].stats = stats; return r; }); }
  function saveLog(day, patch) {
    updateRoster((r) => {
      const p = r.players[meId]; if (!p) return r;
      const d = p.days[day] || { w1: false, w2: false, water: 0, reading: false };
      p.days[day] = { ...d, ...patch };
      return r;
    });
  }
  function restartMine() { updateRoster((r) => { const p = r.players[meId]; if (p) { p.startDate = todayStr(); p.days = {}; } return r; }); }

  if (roster === undefined) return <Shell><div className="text-slate-400 animate-pulse">Loading…</div></Shell>;

  const players = Object.values(roster.players || {});
  const me = meId ? roster.players[meId] : null;

  if (!me) return <Onboarding players={players} onCreate={createPlayer} onClaim={claim} offline={offline} />;

  const myIndex = players.findIndex((p) => p.id === meId);

  return (
    <Shell>
      <div className="w-full max-w-2xl mx-auto">
        <Header player={me} onSwitch={switchUser} />
        {syncError && <p className="text-xs text-amber-400 bg-amber-950/40 border border-amber-900 rounded-lg px-3 py-2 mb-4 text-center">Couldn't reach the shared board just now. Showing your last synced data, taps still save locally and will sync once the connection's back.</p>}
        <MyCard key={me.id} player={me} color={colorFor(myIndex)} onToggle={toggle} onWaterChange={changeWater} onSaveStats={saveStats} onSaveLog={saveLog} busy={busy} />
        <Leaderboard players={players} meId={meId} />
        <div className="flex items-center justify-between mt-6 text-sm">
          <button onClick={refresh} className="text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5"><RotateCcw size={14} className={busy ? "animate-spin" : ""} /> Sync</button>
          <RestartButton onConfirm={restartMine} />
        </div>
        {offline && <p className="text-xs text-slate-600 mt-4 text-center">Shared storage isn't available in this browser. Data is only saving on this device.</p>}
      </div>
    </Shell>
  );
}

function Header({ player, onSwitch }) {
  const { notStarted, complete, currentDay } = dayInfo(player.startDate);
  return (
    <div className="flex items-center justify-between mb-6">
      <Logo small />
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-widest text-slate-500">{notStarted ? `Starts ${player.startDate}` : complete ? "Complete" : `Day ${currentDay} / ${TOTAL}`}</span>
        <button onClick={onSwitch} className="text-slate-500 hover:text-slate-200 transition flex items-center gap-1 text-xs" title="Switch person"><LogOut size={13} /> {player.name}</button>
      </div>
    </div>
  );
}

function Onboarding({ players, onCreate, onClaim, offline }) {
  const [name, setName] = useState("");
  const [start, setStart] = useState(todayStr());
  const [activity, setActivity] = useState("");
  return (
    <Shell>
      <div className="w-full max-w-md mx-auto">
        <Logo />
        <p className="text-slate-400 mt-3 mb-8 leading-relaxed">Everyone runs their own 75-day challenge, all in one shared board. Two workouts a day plus water are required. Pick one bonus habit of your own, it's optional. Compare on the leaderboard.</p>

        {players.length > 0 && (
          <div className="mb-8">
            <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">I'm already here</div>
            <div className="flex flex-wrap gap-2">
              {players.map((p, i) => {
                const c = colorFor(i);
                return (
                  <button key={p.id} onClick={() => onClaim(p.id)} className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full pl-1.5 pr-3 py-1.5 hover:border-slate-500 transition">
                    <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full ${c.badge} text-slate-950 font-black text-xs`}>{p.name.charAt(0).toUpperCase()}</span>
                    <span className="text-sm text-slate-200">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">New here</div>
        <div className="space-y-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 outline-none focus:border-amber-400" />
          <label className="block">
            <span className="block text-xs uppercase tracking-widest text-slate-500 mb-1.5">Start date</span>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 outline-none focus:border-slate-400" />
          </label>
          <label className="block">
            <span className="block text-xs uppercase tracking-widest text-slate-500 mb-1.5">Your bonus habit (optional)</span>
            <input value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="Reading, meditation, guitar…" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 outline-none focus:border-slate-400" />
          </label>
        </div>
        <button onClick={() => name.trim() && onCreate(name, start, activity)} className="mt-6 w-full bg-gradient-to-r from-amber-500 to-cyan-500 text-slate-950 font-bold py-3.5 rounded-xl hover:brightness-110 transition active:scale-95">Start my challenge</button>
        {offline && <p className="text-xs text-slate-500 mt-4 text-center">Shared storage isn't available in this browser, data will only save on this device.</p>}
      </div>
    </Shell>
  );
}

function MyCard({ player, color, onToggle, onWaterChange, onSaveStats, onSaveLog, busy }) {
  const { notStarted, complete, currentDay } = dayInfo(player.startDate);
  const days = player.days;
  const xp = xpOf(days), lvl = levelOf(xp), intoLevel = xp % 100;
  const streak = streakOf(days, currentDay);
  const cleared = clearedCount(days);
  const rank = rankFor(lvl);
  const RankIcon = rank.icon;
  const today = days[currentDay] || {};
  const canEdit = !notStarted && !complete;
  const [selectedDay, setSelectedDay] = useState(currentDay);
  useEffect(() => { setSelectedDay(currentDay); }, [currentDay]);

  const ctx = { cleared, longest: longestStreak(days), perfectWeeks: perfectWeeks(days), lvl, reading: countTask(days, "reading") };

  const prevLevel = useRef(lvl);
  const [levelUp, setLevelUp] = useState(null);
  useEffect(() => {
    if (lvl > prevLevel.current) { setLevelUp(lvl); const t = setTimeout(() => setLevelUp(null), 2200); prevLevel.current = lvl; return () => clearTimeout(t); }
    prevLevel.current = lvl;
  }, [lvl]);

  const todayComplete = allDone(today);
  const prevComplete = useRef(todayComplete);
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    if (todayComplete && !prevComplete.current) { setCelebrate(true); const t = setTimeout(() => setCelebrate(false), 1600); prevComplete.current = todayComplete; return () => clearTimeout(t); }
    prevComplete.current = todayComplete;
  }, [todayComplete]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 mb-5 relative overflow-hidden">
      {levelUp && (
        <div className={`absolute inset-x-4 top-4 z-10 rounded-xl bg-gradient-to-r ${color.from} ${color.to} text-slate-950 px-4 py-2.5 flex items-center gap-2 font-bold text-sm shadow-lg animate-bounce`}>
          <Sparkles size={16} /> Level up! You hit Lvl {levelUp}
        </div>
      )}
      {celebrate && (
        <div className="absolute inset-x-4 top-4 z-10 rounded-xl bg-emerald-500 text-slate-950 px-4 py-2.5 flex items-center gap-2 font-bold text-sm shadow-lg animate-bounce">
          <Check size={16} /> Day {currentDay} cleared. Streak's alive.
        </div>
      )}
      {complete && (
        <div className="mb-4 rounded-xl border border-amber-500 bg-slate-950 p-3 flex items-center gap-3">
          <Trophy className="text-amber-400 shrink-0" size={22} /><span className="text-sm text-slate-200">75 days done. Restart below for another run.</span>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-bold text-slate-100 text-lg">{player.name}</div>
          <div className={`text-xs font-medium ${color.text} flex items-center gap-1`}><RankIcon size={13} /> Lvl {lvl} · {rank.name} · {cleared}/{TOTAL} cleared</div>
        </div>
        <div className="flex items-center gap-1 text-orange-400">
          <Flame size={20} className={streak > 0 ? "" : "text-slate-600"} />
          <span className={`font-black text-lg tabular-nums ${streak > 0 ? "text-orange-400" : "text-slate-600"}`}>{streak}</span>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span className="flex items-center gap-1"><Zap size={12} className={color.text} /> {xp} XP</span>
          <span>{intoLevel}/100 to Lvl {lvl + 1}</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div className={`h-full rounded-full bg-gradient-to-r ${color.from} ${color.to} transition-all duration-500`} style={{ width: `${intoLevel}%` }} />
        </div>
      </div>

      <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">{complete ? "Challenge over" : notStarted ? `Starts ${player.startDate}` : `Today · Day ${currentDay}`}</div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {tasksFor(player).map((t) => {
          if (t.key === "water") {
            const ml = today.water || 0;
            const pct = Math.min(100, Math.round((ml / WATER_TARGET_ML) * 100));
            const reached = ml >= WATER_TARGET_ML;
            return (
              <div key={t.key} className={`rounded-xl py-2.5 px-3 border ${reached ? `${color.solid} ${color.border} text-slate-950` : "bg-slate-800 border-slate-700 text-slate-300"}`}>
                <div className="flex items-center justify-between text-sm font-semibold mb-1.5">
                  <span className="flex items-center gap-1.5"><Droplet size={15} /> Water</span>
                  <span className="tabular-nums text-xs">{(ml / 1000).toFixed(2)}L / {(WATER_TARGET_ML / 1000).toFixed(0)}L</span>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden mb-2 ${reached ? "bg-slate-950/25" : "bg-slate-700"}`}>
                  <div className={`h-full rounded-full transition-all ${reached ? "bg-slate-950" : color.solid}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={!canEdit || busy || ml <= 0} onClick={() => onWaterChange(currentDay, -WATER_STEP_ML)} className="flex-1 rounded-lg py-1 text-xs font-bold bg-black/15 hover:bg-black/25 disabled:opacity-30 transition">−{WATER_STEP_ML}ml</button>
                  <button type="button" disabled={!canEdit || busy} onClick={() => onWaterChange(currentDay, WATER_STEP_ML)} className="flex-1 rounded-lg py-1 text-xs font-bold bg-black/15 hover:bg-black/25 disabled:opacity-30 transition">+{WATER_STEP_ML}ml</button>
                </div>
              </div>
            );
          }
          const on = today[t.key], Icon = t.icon;
          return (
            <button key={t.key} disabled={!canEdit || busy} onClick={() => onToggle(currentDay, t.key)}
              className={`rounded-xl py-3 px-2 border transition active:scale-95 disabled:opacity-40 disabled:active:scale-100 ${on ? `${color.solid} ${color.border} text-slate-950` : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"}`}>
              <div className="flex items-center justify-center gap-1.5 font-semibold text-sm">{on ? <Check size={16} /> : <Icon size={16} />} {t.label}</div>
            </button>
          );
        })}
      </div>
      <p className="flex items-center gap-1 text-xs text-slate-500 mb-4"><Sparkles size={11} /> {player.customActivity || "Your bonus habit"} is optional. Earns XP, won't break your streak.</p>

      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: TOTAL }, (_, n) => {
          const d = n + 1, x = days[d];
          const full = allDone(x), partial = anyDone(x) && !full;
          const missed = !full && !partial && d < currentDay && !notStarted;
          const isToday = d === currentDay && !notStarted && !complete;
          const isSelected = d === selectedDay && !isToday;
          const clickable = d <= currentDay && !notStarted;
          let cls = "bg-slate-800";
          if (full) cls = color.solid; else if (partial) cls = color.dim; else if (missed) cls = "bg-rose-950";
          return (
            <button key={d} type="button" disabled={!clickable} onClick={() => setSelectedDay(d)} title={`Day ${d}`}
              className={`aspect-square rounded-sm p-0 border-0 appearance-none ${cls} ${isToday ? "ring-2 ring-slate-100" : ""} ${isSelected ? `ring-2 ${color.ring}` : ""} ${clickable ? "cursor-pointer hover:opacity-80" : "cursor-default"}`} />
          );
        })}
      </div>
      <p className="text-xs text-slate-600 mt-1.5">Tap a day to view or log its details below.</p>

      {!notStarted && <WeekSummary days={days} currentDay={currentDay} />}
      {!notStarted && <DayLog player={player} color={color} currentDay={currentDay} selectedDay={selectedDay} onSelectDay={setSelectedDay} onSaveLog={onSaveLog} busy={busy} />}

      <AchievementsGrid ctx={ctx} color={color} />

      <StatsBlock player={player} color={color} currentDay={currentDay} onSave={onSaveStats} busy={busy} />
    </div>
  );
}

function WeekSummary({ days, currentDay }) {
  const s = weekSummary(days, currentDay);
  const moodMeta = MOODS.find((m) => m.key === s.topMood);
  return (
    <div className="mt-5 pt-4 border-t border-slate-800">
      <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">This week · Day {s.a}\u2013{s.b}</div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-300">
        <span>{s.workouts} workouts logged</span>
        {s.avgSteps !== null && <span>Avg {s.avgSteps.toLocaleString()} steps</span>}
        {s.avgCal !== null && <span>Avg {s.avgCal} cal</span>}
        {moodMeta && <span>Mostly {moodMeta.emoji} {moodMeta.label}</span>}
      </div>
    </div>
  );
}

function DayLog({ player, color, currentDay, selectedDay, onSelectDay, onSaveLog, busy }) {
  const days = player.days;
  const blankW = { type: "", distance: "", duration: "", time: "" };
  const [w1, setW1] = useState(blankW);
  const [w2, setW2] = useState(blankW);
  const [mood, setMood] = useState(null);
  const [metrics, setMetrics] = useState({ steps: "", calories: "", heartRate: "", sleepHours: "" });

  useEffect(() => {
    const x = days[selectedDay] || {};
    setW1(x.log?.w1 || blankW);
    setW2(x.log?.w2 || blankW);
    setMood(x.mood || null);
    setMetrics(x.metrics || { steps: "", calories: "", heartRate: "", sleepHours: "" });
    // eslint-disable-next-line
  }, [selectedDay, player.id]);

  function save() { onSaveLog(selectedDay, { log: { w1, w2 }, mood, metrics }); }

  const prevM = days[selectedDay - 1]?.metrics;
  const curM = days[selectedDay]?.metrics;
  const canCompare = selectedDay > 1 && prevM && curM;
  function delta(key) {
    if (!canCompare) return null;
    const a = Number(prevM[key]), b = Number(curM[key]);
    if (!a || !b) return null;
    return b - a;
  }

  const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 outline-none focus:border-slate-400 text-sm";

  return (
    <div className="mt-5 pt-4 border-t border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-widest text-slate-500">Day log</div>
        <select value={selectedDay} onChange={(e) => onSelectDay(Number(e.target.value))} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 outline-none">
          {Array.from({ length: currentDay }, (_, i) => currentDay - i).map((d) => <option key={d} value={d}>Day {d}</option>)}
        </select>
      </div>

      {[["Workout 1", w1, setW1], ["Workout 2", w2, setW2]].map(([label, val, setter], idx) => (
        <div key={idx} className="mb-3">
          <div className="text-xs text-slate-400 mb-1.5">{label}</div>
          <div className="grid grid-cols-2 gap-2">
            <select value={val.type} onChange={(e) => setter({ ...val, type: e.target.value })} className={inputCls}>
              <option value="">Type</option>
              {WORKOUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="time" value={val.time} onChange={(e) => setter({ ...val, time: e.target.value })} className={inputCls} />
            <input inputMode="decimal" value={val.distance} onChange={(e) => setter({ ...val, distance: e.target.value })} placeholder="Distance (mi)" className={inputCls} />
            <input inputMode="numeric" value={val.duration} onChange={(e) => setter({ ...val, duration: e.target.value })} placeholder="Duration (min)" className={inputCls} />
          </div>
        </div>
      ))}

      <div className="mb-3">
        <div className="text-xs text-slate-400 mb-1.5">How'd you feel</div>
        <div className="flex flex-wrap gap-1.5">
          {MOODS.map((m) => (
            <button key={m.key} type="button" onClick={() => setMood(mood === m.key ? null : m.key)}
              className={`px-2.5 py-1.5 rounded-full text-xs border transition ${mood === m.key ? `${color.badge} ${color.border} text-slate-950 font-semibold` : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"}`}>
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs text-slate-400 mb-1.5">From your device (optional)</div>
        <div className="grid grid-cols-2 gap-2">
          <input inputMode="numeric" value={metrics.steps} onChange={(e) => setMetrics({ ...metrics, steps: e.target.value })} placeholder="Steps" className={inputCls} />
          <input inputMode="numeric" value={metrics.calories} onChange={(e) => setMetrics({ ...metrics, calories: e.target.value })} placeholder="Calories" className={inputCls} />
          <input inputMode="numeric" value={metrics.heartRate} onChange={(e) => setMetrics({ ...metrics, heartRate: e.target.value })} placeholder="Avg heart rate" className={inputCls} />
          <input inputMode="decimal" value={metrics.sleepHours} onChange={(e) => setMetrics({ ...metrics, sleepHours: e.target.value })} placeholder="Sleep (hrs)" className={inputCls} />
        </div>
      </div>

      <button onClick={save} disabled={busy} className={`w-full ${color.badge} text-slate-950 font-semibold py-2 rounded-lg text-sm hover:brightness-110 transition active:scale-95 disabled:opacity-50`}>Save Day {selectedDay} log</button>

      {canCompare && (
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
          {["steps", "calories", "heartRate"].map((k) => {
            const dl = delta(k);
            if (dl === null) return null;
            const label = k === "heartRate" ? "HR" : k.charAt(0).toUpperCase() + k.slice(1);
            return <span key={k}>{label} vs Day {selectedDay - 1}: <span className="text-slate-200">{dl > 0 ? "+" : ""}{dl}</span></span>;
          })}
        </div>
      )}
    </div>
  );
}

function AchievementsGrid({ ctx, color }) {
  const unlockedCount = ACHIEVEMENTS.filter((a) => a.test(ctx)).length;
  return (
    <div className="mt-5 pt-4 border-t border-slate-800">
      <div className="text-xs uppercase tracking-widest text-slate-500 mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5"><Trophy size={12} /> Achievements</span>
        <span className="text-slate-600">{unlockedCount}/{ACHIEVEMENTS.length}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {ACHIEVEMENTS.map((a) => {
          const unlocked = a.test(ctx);
          const Icon = unlocked ? a.icon : Lock;
          return (
            <div key={a.id} title={`${a.label} — ${a.desc}`} className={`flex flex-col items-center gap-1 rounded-xl py-2.5 px-1 border transition ${unlocked ? `${color.badge} ${color.border} text-slate-950` : "bg-slate-800 border-slate-700 text-slate-600"}`}>
              <Icon size={18} />
              <span className={`text-[10px] font-semibold text-center leading-tight ${unlocked ? "text-slate-950" : "text-slate-600"}`}>{a.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatsBlock({ player, color, currentDay, onSave, busy }) {
  const s = player.stats;
  const [editing, setEditing] = useState(false);
  const [ft, setFt] = useState("");
  const [inch, setInch] = useState("");
  const [start, setStart] = useState("");
  const [cur, setCur] = useState("");

  function open() {
    if (s) { setFt(String(Math.floor(s.heightIn / 12))); setInch(String(s.heightIn % 12)); setStart(String(s.startLbs)); setCur(String(s.curLbs)); }
    else { setFt(""); setInch(""); setStart(""); setCur(""); }
    setEditing(true);
  }
  function save() {
    const heightIn = parseInt(ft || "0", 10) * 12 + parseInt(inch || "0", 10);
    const startLbs = parseFloat(start || "0");
    const curLbs = parseFloat(cur || start || "0");
    if (heightIn <= 0 || startLbs <= 0) return;
    const log = { ...((s && s.weightLog) || {}) };
    if (log[1] === undefined) log[1] = startLbs;
    log[currentDay] = curLbs;
    onSave({ heightIn, startLbs, curLbs, weightLog: log });
    setEditing(false);
  }

  const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 outline-none focus:border-slate-400 text-sm";

  if (editing || !s) {
    return (
      <div className="mt-5 pt-4 border-t border-slate-800">
        <div className="text-xs uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5"><Scale size={12} /> Body stats (lbs)</div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input inputMode="numeric" value={ft} onChange={(e) => setFt(e.target.value)} placeholder="Height ft" className={inputCls} />
          <input inputMode="numeric" value={inch} onChange={(e) => setInch(e.target.value)} placeholder="in" className={inputCls} />
          <input inputMode="decimal" value={start} onChange={(e) => setStart(e.target.value)} placeholder="Start lbs" className={inputCls} />
          <input inputMode="decimal" value={cur} onChange={(e) => setCur(e.target.value)} placeholder="Current lbs" className={inputCls} />
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={busy} className={`flex-1 ${color.badge} text-slate-950 font-semibold py-2 rounded-lg text-sm hover:brightness-110 transition active:scale-95 disabled:opacity-50`}>Save</button>
          {s && <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200">Cancel</button>}
        </div>
      </div>
    );
  }

  const bmi = bmiOf(s.curLbs, s.heightIn);
  const delta = s.curLbs - s.startLbs;
  const trend = Object.entries(s.weightLog || {}).map(([d, lbs]) => ({ day: Number(d), lbs })).sort((a, b) => a.day - b.day);

  return (
    <div className="mt-5 pt-4 border-t border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">BMI</div>
          <div className="flex items-baseline gap-2">
            <span className={`font-black text-2xl tabular-nums ${bmiColor(bmi)}`}>{bmi.toFixed(1)}</span>
            <span className={`text-xs font-medium ${bmiColor(bmi)}`}>{bmiCat(bmi)}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">Weight</div>
          <div className="text-sm tabular-nums text-slate-200">{s.curLbs} lbs
            {delta !== 0 && <span className={delta < 0 ? "text-emerald-400" : "text-amber-400"}> ({delta > 0 ? "+" : ""}{delta.toFixed(1)})</span>}
          </div>
        </div>
        <button onClick={open} className="text-slate-500 hover:text-slate-200 transition ml-2 shrink-0" title="Update weight"><Pencil size={15} /></button>
      </div>

      {trend.length >= 2 ? (
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="day" type="number" domain={[1, TOTAL]} tick={{ fill: "#64748b", fontSize: 11 }} stroke="#334155" tickCount={6} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} stroke="#334155" domain={["dataMin - 2", "dataMax + 2"]} width={40} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#94a3b8" }} formatter={(v) => [`${v} lbs`, "Weight"]} labelFormatter={(l) => `Day ${l}`} />
              <Line type="monotone" dataKey="lbs" stroke={color.hex} strokeWidth={2.5} dot={{ r: 3, fill: color.hex }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-xs text-slate-500">Log your weight on a few different days to see the trend line.</p>
      )}
    </div>
  );
}

function Leaderboard({ players, meId }) {
  const ranked = players.map((p, i) => {
    const { currentDay, notStarted } = dayInfo(p.startDate);
    const cleared = clearedCount(p.days);
    const streak = notStarted ? 0 : streakOf(p.days, currentDay);
    return { p, i, cleared, streak, lvl: levelOf(xpOf(p.days)) };
  }).sort((a, b) => b.cleared - a.cleared || b.streak - a.streak || a.p.name.localeCompare(b.p.name));

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="text-xs uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1.5"><Users size={12} /> Leaderboard</div>
      <p className="text-xs text-slate-600 mb-4">Cleared days, streak, and level only. Everyone's day log, mood, and weight stay on their own card.</p>
      <div className="space-y-2">
        {ranked.map((row, rank) => {
          const c = colorFor(row.i);
          const isMe = row.p.id === meId;
          return (
            <div key={row.p.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${isMe ? `${c.border} bg-slate-800` : "border-transparent bg-slate-800"}`}>
              <span className="w-5 text-center font-black tabular-nums text-slate-500">{rank + 1}</span>
              <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${c.badge} text-slate-950 font-black text-sm shrink-0`}>{row.p.name.charAt(0).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-100 truncate">{row.p.name}</span>
                  {rank === 0 && row.cleared > 0 && <Crown size={14} className="text-amber-400 shrink-0" />}
                  {isMe && <span className="text-xs text-slate-500">(you)</span>}
                </div>
                <div className="text-xs text-slate-500">Lvl {row.lvl} · {rankFor(row.lvl).name}</div>
              </div>
              <div className="flex items-center gap-1 text-orange-400 shrink-0"><Flame size={13} className={row.streak > 0 ? "" : "text-slate-600"} /><span className={`text-sm tabular-nums ${row.streak > 0 ? "" : "text-slate-600"}`}>{row.streak}</span></div>
              <div className={`font-black tabular-nums shrink-0 ${c.text}`}>{row.cleared}<span className="text-slate-600 font-medium text-xs">/{TOTAL}</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RestartButton({ onConfirm }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) return (
    <span className="flex items-center gap-3">
      <span className="text-slate-400">Reset your run to Day 1?</span>
      <button onClick={() => { onConfirm(); setConfirm(false); }} className="text-rose-400 font-semibold hover:text-rose-300">Yes</button>
      <button onClick={() => setConfirm(false)} className="text-slate-500 hover:text-slate-300">Cancel</button>
    </span>
  );
  return <button onClick={() => setConfirm(true)} className="text-slate-500 hover:text-rose-400 transition">Restart my challenge</button>;
}

function Shell({ children }) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 to-indigo-950 text-slate-100 flex items-center justify-center p-4 sm:p-6" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      {children}
    </div>
  );
}

function Logo({ small }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`font-black tracking-tighter leading-none bg-gradient-to-br from-amber-400 to-cyan-400 bg-clip-text text-transparent ${small ? "text-2xl" : "text-4xl"}`}>75</span>
      <span className={`font-semibold tracking-tight text-slate-200 ${small ? "text-sm" : "text-lg"}`}>Grind</span>
    </div>
  );
}
