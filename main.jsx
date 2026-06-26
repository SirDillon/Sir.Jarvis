import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Brain, Calendar, Clock, Gift, Play, Plus, ShieldCheck, Sparkles, TimerReset, Zap } from 'lucide-react';
import './styles.css';

const uid = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2);
const today = new Date().toISOString().slice(0,10);
const storeKey = 'jarvis-coach-v01';

const starter = {
  tasks: [
    { id: uid(), title: 'Do the dishes', estimate: 10, avoided: 0, done: false, type: 'home' },
    { id: uid(), title: 'Upload product photos', estimate: 25, avoided: 2, done: false, type: 'business' },
    { id: uid(), title: 'Reply to emails', estimate: 15, avoided: 1, done: false, type: 'admin' },
  ],
  blocks: [
    { id: uid(), title: 'Tennis lesson', start: '10:00', end: '11:30' },
  ],
  rewards: [
    { id: uid(), title: '15 minutes TikTok', strength: 'small' },
    { id: uid(), title: 'Coffee run', strength: 'small' },
    { id: uid(), title: 'Movie tonight', strength: 'daily' },
  ],
  anchors: [
    { id: uid(), title: 'Walk dogs', pair: 'Duolingo lesson or 100 lunges' },
    { id: uid(), title: 'Oil change / waiting room', pair: 'Bring laptop and answer emails' },
    { id: uid(), title: 'Costco run', pair: 'Start laundry before leaving' },
  ],
  sessions: []
};

function loadData(){ try { return JSON.parse(localStorage.getItem(storeKey)) || starter; } catch { return starter; } }
function saveData(data){ localStorage.setItem(storeKey, JSON.stringify(data)); }
function minutesToLabel(sec){ const m = Math.floor(sec/60); const s = sec%60; return `${m}:${String(s).padStart(2,'0')}`; }
function nowLabel(){ return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }

function App(){
  const [data, setData] = useState(loadData);
  const [taskText, setTaskText] = useState('');
  const [blockTitle, setBlockTitle] = useState('');
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [rewardText, setRewardText] = useState('');
  const [active, setActive] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [timer, setTimer] = useState(0);
  const [phase, setPhase] = useState('idle');

  useEffect(() => saveData(data), [data]);
  useEffect(() => {
    if (countdown <= 0 || phase !== 'countdown') return;
    const t = setInterval(() => setCountdown(v => Math.max(0, v-1)), 1000);
    return () => clearInterval(t);
  }, [countdown, phase]);
  useEffect(() => {
    if (phase === 'countdown' && countdown === 0 && active) { setPhase('work'); setTimer(active.estimate*60); }
  }, [countdown, phase, active]);
  useEffect(() => {
    if (timer <= 0 || phase !== 'work') return;
    const t = setInterval(() => setTimer(v => Math.max(0, v-1)), 1000);
    return () => clearInterval(t);
  }, [timer, phase]);

  const openTasks = data.tasks.filter(t => !t.done);
  const choices = useMemo(() => [...openTasks].sort((a,b) => b.avoided - a.avoided || a.estimate - b.estimate).slice(0,3), [data.tasks]);
  const avoided = openTasks.filter(t => t.avoided >= 2)[0];
  const reward = data.rewards[0];

  const isBlocked = () => {
    const n = new Date(); const hh = String(n.getHours()).padStart(2,'0'); const mm = String(n.getMinutes()).padStart(2,'0');
    const current = `${hh}:${mm}`;
    return data.blocks.find(b => current >= b.start && current <= b.end);
  };

  const startTask = (task, delay = 100) => { setActive(task); setCountdown(delay); setPhase('countdown'); };
  const finishTask = () => {
    if(!active) return;
    const actual = Math.max(1, Math.round((active.estimate*60 - timer)/60));
    setData(d => ({...d, tasks: d.tasks.map(t => t.id === active.id ? {...t, done: true, estimate: Math.round((t.estimate + actual)/2)} : t), sessions: [{ id: uid(), task: active.title, actual, date: today }, ...d.sessions].slice(0,20)}));
    setActive(null); setPhase('idle'); setTimer(0); setCountdown(0);
  };
  const extend = (min) => { setTimer(t => t + min*60); setData(d => ({...d, tasks: d.tasks.map(t => t.id === active?.id ? {...t, estimate: t.estimate + min} : t)})); };
  const skipTask = (id) => setData(d => ({...d, tasks: d.tasks.map(t => t.id === id ? {...t, avoided: t.avoided + 1} : t)}));

  return <main className="app">
    <section className="hero card">
      <div><p className="eyebrow"><Brain size={16}/> Jarvis Coach V0.1</p><h1>Use your open time. Keep momentum.</h1><p className="muted">Today is {new Date().toLocaleDateString([], {weekday:'long', month:'short', day:'numeric'})}. Current time: {nowLabel()}.</p></div>
      <div className={isBlocked() ? 'status blocked' : 'status open'}>{isBlocked() ? `Blocked: ${isBlocked().title}` : 'Open for nudges'}</div>
    </section>

    {phase !== 'idle' && active && <section className="card focus">
      <p className="eyebrow"><Zap size={16}/> Active mission</p>
      <h2>{active.title}</h2>
      {phase === 'countdown' ? <><div className="bigtime">{minutesToLabel(countdown)}</div><p>Starts after the runway. You have <b>{active.estimate} minutes</b>.</p></> : <><div className="bigtime">{minutesToLabel(timer)}</div><p>Keep going. Need more time is not failure.</p><div className="row"><button onClick={() => extend(5)}>+5 min</button><button onClick={() => extend(10)}>+10 min</button><button onClick={finishTask} className="primary">Done</button></div></>}
    </section>}

    <section className="card">
      <p className="eyebrow"><Sparkles size={16}/> Check-in</p>
      <h2>Are you currently working on a task?</h2>
      <div className="grid choices">
        {openTasks.slice(0,4).map(t => <button key={t.id} onClick={() => startTask(t,0)}>{t.title}<span>{t.estimate} min</span></button>)}
      </div>
      <div className="addline"><input value={taskText} onChange={e=>setTaskText(e.target.value)} placeholder="Add current/new task"/><button onClick={()=>{ if(taskText.trim()){ const t={id:uid(), title:taskText.trim(), estimate:15, avoided:0, done:false, type:'new'}; setData(d=>({...d,tasks:[t,...d.tasks]})); startTask(t,0); setTaskText('');}}}><Plus size={18}/> Add & start</button></div>
    </section>

    <section className="card">
      <p className="eyebrow"><ShieldCheck size={16}/> Choice of 3</p>
      <h2>Pick the one you feel most willing to do.</h2>
      <div className="grid choices">
        {choices.map(t => <div className="choice" key={t.id}><button onClick={() => startTask(t,100)}><b>{t.title}</b><span>{t.estimate} min · avoided {t.avoided}x</span></button><button className="ghost" onClick={() => skipTask(t.id)}>Not this</button></div>)}
      </div>
    </section>

    {avoided && reward && <section className="card reward">
      <p className="eyebrow"><Gift size={16}/> Motivation engine</p>
      <h2>{avoided.title} has been avoided {avoided.avoided} times.</h2>
      <p>Finish it now and earn: <b>{reward.title}</b></p>
      <button className="primary" onClick={()=>startTask(avoided,100)}>Accept reward mission</button>
    </section>}

    <section className="card">
      <p className="eyebrow"><Calendar size={16}/> Fixed blocks: no nudges</p>
      {data.blocks.map(b => <div className="item" key={b.id}><span>{b.title}</span><small>{b.start}–{b.end}</small></div>)}
      <div className="addline three"><input value={blockTitle} onChange={e=>setBlockTitle(e.target.value)} placeholder="Lesson / appointment"/><input type="time" value={blockStart} onChange={e=>setBlockStart(e.target.value)}/><input type="time" value={blockEnd} onChange={e=>setBlockEnd(e.target.value)}/><button onClick={()=>{ if(blockTitle && blockStart && blockEnd){setData(d=>({...d,blocks:[...d.blocks,{id:uid(),title:blockTitle,start:blockStart,end:blockEnd}]})); setBlockTitle(''); setBlockStart(''); setBlockEnd('');}}}>Add block</button></div>
    </section>

    <section className="card">
      <p className="eyebrow"><TimerReset size={16}/> Task pairing</p>
      {data.anchors.map(a => <div className="item" key={a.id}><span>{a.title}</span><small>{a.pair}</small></div>)}
    </section>

    <section className="card">
      <p className="eyebrow"><Gift size={16}/> Rewards</p>
      {data.rewards.map(r => <div className="item" key={r.id}><span>{r.title}</span><small>{r.strength}</small></div>)}
      <div className="addline"><input value={rewardText} onChange={e=>setRewardText(e.target.value)} placeholder="Add reward"/><button onClick={()=>{ if(rewardText.trim()){setData(d=>({...d,rewards:[...d.rewards,{id:uid(),title:rewardText.trim(),strength:'custom'}]})); setRewardText('');}}}>Add reward</button></div>
    </section>

    <section className="card">
      <p className="eyebrow"><Clock size={16}/> Recent behavior</p>
      {data.sessions.length === 0 ? <p className="muted">No completed sessions yet.</p> : data.sessions.map(s => <div className="item" key={s.id}><span>{s.task}</span><small>{s.actual} min</small></div>)}
    </section>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
