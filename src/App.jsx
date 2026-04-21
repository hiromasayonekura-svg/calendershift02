import React, { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Trash2,
  Calendar as CalendarIcon, Users, Download, X,
  FileText, CheckCircle2, Share2, DownloadCloud,
  ClipboardCopy, ShieldCheck, UserCheck, Wand2, Clock
} from 'lucide-react';

// ── 対策: 安全なアイコン呼び出しコンポーネント ─────────────
// アイコンが存在しない場合でもアプリがクラッシュ（真っ暗）するのを防ぎます
const SafeIcon = ({ icon: Icon, size = 16, color = "currentColor", ...props }) => {
  if (!Icon) {
    // アイコンが存在しない場合は、赤い枠線の四角を表示してクラッシュを回避
    return <span style={{ width: size, height: size, display: 'inline-block', backgroundColor: '#fee2e2', border: '1px dashed #ef4444', borderRadius: '4px' }} title="Icon Missing" />;
  }
  return <Icon size={size} color={color} {...props} />;
};
// ────────────────────────────────────────────────────────

const START_TIME_SLOTS = Array.from({ length: 14 }, (_, i) => `${i + 9}:00`);
const END_TIME_SLOTS = Array.from({ length: 14 }, (_, i) => `${i + 10}:00`);
const TIME_SLOTS = START_TIME_SLOTS;
const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土'];

const STATUS_TYPES = {
  none: { id: 'none', label: '未設定' },
  attendance: { id: 'attendance', label: '出勤/現場' },
  remote: { id: 'remote', label: 'リモート' },
  unavailable: { id: 'unavailable', label: '不可' },
};

// ── Inline style tokens ──────────────────────────────
const C = {
  bg: '#f8fafc',
  white: '#ffffff',
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  slate900: '#0f172a',
  blue50: '#eff6ff',
  blue100: '#dbeafe',
  blue200: '#bfdbfe',
  blue400: '#60a5fa',
  blue500: '#3b82f6',
  blue600: '#2563eb',
  blue700: '#1d4ed8',
  blue900: '#1e3a8a',
  emerald50: '#ecfdf5',
  emerald100: '#d1fae5',
  emerald200: '#a7f3d0',
  emerald400: '#34d399',
  emerald500: '#10b981',
  emerald600: '#059669',
  emerald700: '#047857',
  emerald900: '#064e3b',
  yellow50: '#fefce8',
  yellow100: '#fef9c3',
  yellow300: '#fde047',
  yellow400: '#facc15',
  yellow600: '#ca8a04',
  yellow700: '#a16207',
  yellow900: '#713f12',
  red500: '#ef4444',
};

const S = {
  app: {
    minHeight: '100vh', background: C.bg,
    padding: '16px', fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif",
    color: C.slate800,
  },
  maxW: { maxWidth: 1280, margin: '0 auto' },
  card: {
    background: C.white, borderRadius: 16,
    border: `1px solid ${C.slate200}`,
    boxShadow: '0 1px 4px rgba(0,0,0,.06)',
  },
  cardPad: { padding: 20 },
  sidebar: { width: 260, minWidth: 220, flexShrink: 0 },
  btnPrimary: (color = C.slate800) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '10px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
    background: color, color: C.white, fontWeight: 700, fontSize: 13,
    transition: 'opacity .15s',
  }),
  btnSmall: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer',
    background: C.slate800, color: C.white,
  },
  btnGhost: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer',
    background: 'transparent', color: C.slate400,
  },
  btnTab: (active, color) => ({
    flex: 1, padding: '10px 8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
    background: active ? C.white : 'transparent',
    color: active ? color : C.slate500,
    boxShadow: active ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
    transition: 'all .2s',
  }),
  input: {
    padding: '9px 12px', borderRadius: 10, fontSize: 13,
    border: `1.5px solid ${C.slate200}`, outline: 'none',
    background: C.white, color: C.slate800,
  },
  select: {
    padding: '8px 10px', borderRadius: 10, fontSize: 13,
    border: `1.5px solid ${C.slate200}`, outline: 'none',
    background: C.white, color: C.slate800, cursor: 'pointer',
  },
  textarea: {
    padding: '8px 10px', borderRadius: 8, fontSize: 12,
    border: `1.5px solid ${C.slate200}`, outline: 'none',
    background: C.white, color: C.slate800, resize: 'none', width: '100%',
    boxSizing: 'border-box',
  },
  reqPill: (type) => {
    const map = {
      attendance: { bg: '#fef9c3', border: '#facc15', color: '#854d0e', borderStyle: 'dashed' },
      remote: { bg: '#eff6ff', border: '#60a5fa', color: '#1e40af', borderStyle: 'dashed' },
      unavailable: { bg: '#f1f5f9', border: '#94a3b8', color: '#64748b', borderStyle: 'dashed' },
    };
    const m = map[type] || {};
    return {
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '1px 5px', borderRadius: 5, fontSize: 10, fontWeight: 600,
      background: m.bg, color: m.color,
      border: `1.5px ${m.borderStyle || 'solid'} ${m.border}`,
      whiteSpace: 'nowrap',
    };
  },
  confPill: (type) => {
    const map = {
      attendance: { bg: '#fde047', border: '#facc15', color: '#713f12' },
      remote: { bg: '#bfdbfe', border: '#60a5fa', color: '#1e3a8a' },
      unavailable: { bg: '#1e293b', border: '#0f172a', color: '#fff' },
    };
    const m = map[type] || {};
    return {
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '1px 5px', borderRadius: 5, fontSize: 10, fontWeight: 700,
      background: m.bg, color: m.color,
      border: `1.5px solid ${m.border}`,
      whiteSpace: 'nowrap',
    };
  },
};

// ── Auth Screen ───────────────────────────────────────
const AuthScreen = ({ onAuth }) => {
  const [val, setVal] = useState('');
  return (
    <div style={{ minHeight: '100vh', background: C.slate900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ ...S.card, maxWidth: 420, width: '100%', padding: 40, textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, background: C.blue100, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: C.blue600 }}>
          <SafeIcon icon={ShieldCheck} size={28} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.slate900, marginBottom: 8 }}>Password Required</h1>
        <p style={{ fontSize: 13, color: C.slate500, marginBottom: 28 }}>社内専用ツールです。パスワードを入力してください。</p>
        <input
          type="password"
          value={val}
          onChange={e => { setVal(e.target.value); if (e.target.value === 'zavvaznight') onAuth(); }}
          placeholder="••••••••"
          autoFocus
          style={{ ...S.input, width: '100%', boxSizing: 'border-box', textAlign: 'center', fontSize: 18, letterSpacing: 6, marginBottom: 12 }}
        />
        <p style={{ fontSize: 11, color: C.slate400 }}>※正しいパスワードを入力すると自動的に開きます</p>
      </div>
    </div>
  );
};

// ── Main App ──────────────────────────────────────────
const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [appMode, setAppMode] = useState('staff');
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1));
  const [staff, setStaff] = useState([{ id: '1', name: '島田' }, { id: '2', name: '本間' }]);
  const [shifts, setShifts] = useState({});
  const [newStaffName, setNewStaffName] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importCodeStr, setImportCodeStr] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  if (!isAuthenticated) return <AuthScreen onAuth={() => setIsAuthenticated(true)} />;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();
  const formatDate = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const changeMonth = (o) => setCurrentDate(new Date(year, month + o, 1));

  const addStaff = () => {
    if (!newStaffName.trim()) return;
    setStaff([...staff, { id: Math.random().toString(36).substr(2, 9), name: newStaffName.trim() }]);
    setNewStaffName('');
  };
  const removeStaff = (id) => setStaff(staff.filter(s => s.id !== id));

  const showToast = (msg) => { setToastMessage(msg); setTimeout(() => setToastMessage(''), 5000); };

  const getStaffDropdownState = (dateStr, staffId) => {
    const reqs = shifts[dateStr]?.requests?.[staffId] || {};
    const activeTimes = START_TIME_SLOTS.filter(t => reqs[t] === 'attendance' || reqs[t] === 'remote');
    let status = 'none';
    if (activeTimes.length > 0) status = reqs[activeTimes[0]];
    else if (Object.values(reqs).includes('unavailable')) status = 'unavailable';
    const start = activeTimes.length > 0 ? activeTimes[0] : '9:00';
    const end = activeTimes.length > 0 ? END_TIME_SLOTS[START_TIME_SLOTS.indexOf(activeTimes[activeTimes.length - 1])] : '18:00';
    return { status, start, end };
  };

  const handleStaffRequestChange = (dateStr, staffId, field, value) => {
    const current = getStaffDropdownState(dateStr, staffId);
    let newStatus = current.status, newStart = current.start, newEnd = current.end;
    if (field === 'status') newStatus = value;
    if (field === 'start') { newStart = value; if (START_TIME_SLOTS.indexOf(newStart) > END_TIME_SLOTS.indexOf(newEnd)) newEnd = END_TIME_SLOTS[START_TIME_SLOTS.indexOf(newStart)]; }
    if (field === 'end') newEnd = value;
    const newStaffReqs = {};
    if (newStatus === 'unavailable') { START_TIME_SLOTS.forEach(t => newStaffReqs[t] = 'unavailable'); }
    else if (newStatus === 'attendance' || newStatus === 'remote') {
      const startIdx = START_TIME_SLOTS.indexOf(newStart), endIdx = END_TIME_SLOTS.indexOf(newEnd);
      START_TIME_SLOTS.forEach((t, idx) => { if (idx >= startIdx && idx <= endIdx) newStaffReqs[t] = newStatus; });
    }
    setShifts(prev => {
      const dayData = prev[dateStr] || { notes: '', staffTasks: {}, requests: {}, confirmed: {} };
      return { ...prev, [dateStr]: { ...dayData, requests: { ...dayData.requests, [staffId]: newStaffReqs } } };
    });
  };

  const toggleConfirmed = (dateStr, staffId, time) => {
    setShifts(prev => {
      const dayData = prev[dateStr] || { notes: '', staffTasks: {}, requests: {}, confirmed: {} };
      const req = dayData.requests?.[staffId]?.[time];
      const conf = dayData.confirmed?.[staffId]?.[time] || 'none';
      let nextConf;
      if (conf === 'none') nextConf = (req === 'attendance' || req === 'remote') ? req : 'attendance';
      else if (conf === 'attendance') nextConf = 'remote';
      else nextConf = 'none';
      return { ...prev, [dateStr]: { ...dayData, confirmed: { ...dayData.confirmed, [staffId]: { ...(dayData.confirmed?.[staffId] || {}), [time]: nextConf === 'none' ? undefined : nextConf } } } };
    });
  };

  const applyRequestsToConfirmed = (dateStr) => {
    setShifts(prev => {
      const dayData = prev[dateStr];
      if (!dayData?.requests) return prev;
      const newConfirmed = {};
      Object.keys(dayData.requests).forEach(staffId => {
        newConfirmed[staffId] = { ...(dayData.confirmed?.[staffId] || {}) };
        Object.keys(dayData.requests[staffId]).forEach(time => { if (dayData.requests[staffId][time] !== 'none') newConfirmed[staffId][time] = dayData.requests[staffId][time]; });
      });
      return { ...prev, [dateStr]: { ...dayData, confirmed: { ...(dayData.confirmed || {}), ...newConfirmed } } };
    });
    showToast('メンバーの希望をシフトに自動反映しました！');
  };

  const updateDayNote = (dateStr, note) => setShifts(prev => ({ ...prev, [dateStr]: { ...(prev[dateStr] || { staffTasks: {}, requests: {}, confirmed: {} }), notes: note } }));
  const updateStaffTask = (dateStr, staffId, task) => {
    setShifts(prev => { const d = prev[dateStr] || { notes: '', staffTasks: {}, requests: {}, confirmed: {} }; return { ...prev, [dateStr]: { ...d, staffTasks: { ...d.staffTasks, [staffId]: task } } }; });
  };

  const generateShareCode = () => {
    const el = document.createElement('textarea');
    el.value = btoa(encodeURIComponent(JSON.stringify({ staff, shifts })));
    document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    showToast('希望コードをコピーしました！管理者に送ってください。');
  };

  const handleImportCode = () => {
    if (!importCodeStr.trim()) return;
    try {
      const data = JSON.parse(decodeURIComponent(atob(importCodeStr.trim())));
      let updatedStaff = [...staff];
      if (data.staff) data.staff.forEach(s => { if (!updatedStaff.find(x => x.id === s.id)) updatedStaff.push(s); });
      setStaff(updatedStaff);
      if (data.shifts) {
        setShifts(prev => {
          const n = { ...prev };
          Object.keys(data.shifts).forEach(date => {
            if (!n[date]) n[date] = { requests: {}, confirmed: {}, staffTasks: {}, notes: '' };
            const imp = data.shifts[date];
            if (imp.requests) { n[date].requests = { ...n[date].requests }; Object.keys(imp.requests).forEach(sid => { n[date].requests[sid] = { ...(n[date].requests[sid] || {}), ...imp.requests[sid] }; }); }
            if (imp.staffTasks) n[date].staffTasks = { ...n[date].staffTasks, ...imp.staffTasks };
          });
          return n;
        });
      }
      showToast('メンバーの希望データを読み込みました！'); setImportCodeStr('');
    } catch { alert('無効なコードです。正しいコードを貼り付けてください。'); }
  };

  const exportToSpreadsheet = () => {
    let tsv = `日付\t曜日\t${TIME_SLOTS.join('\t')}\t備考\n`;
    const days = getDaysInMonth(year, month);
    for (let d = 1; d <= days; d++) {
      const dateStr = formatDate(year, month, d), dayData = shifts[dateStr] || {}, dow = DAYS_OF_WEEK[new Date(year, month, d).getDay()];
      let row = `${month + 1}月${d}日\t${dow}\t`;
      TIME_SLOTS.forEach(time => {
        let cs = []; staff.forEach(s => { const st = dayData.confirmed?.[s.id]?.[time]; if (st === 'attendance') cs.push(`${s.name}(出)`); if (st === 'remote') cs.push(`${s.name}(リ)`); }); row += `${cs.join(' / ')}\t`;
      });
      row += `${dayData.notes || ''}\n`; tsv += row;
    }
    const el = document.createElement('textarea'); el.value = tsv; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    showToast('TSV出力完了！スプレッドシートのA1に貼り付けてください。');
  };

  const calendarDays = useMemo(() => {
    const days = [], total = getDaysInMonth(year, month), start = getFirstDayOfMonth(year, month);
    for (let i = 0; i < start; i++) days.push(null);
    for (let d = 1; d <= total; d++) days.push(d);
    return days;
  }, [year, month]);

  const calculateHours = (obj) => {
    if (!obj) return { attendance: 0, remote: 0 };
    let att = 0, rem = 0;
    Object.values(obj).forEach(s => { if (s === 'attendance') att++; if (s === 'remote') rem++; });
    return { attendance: att, remote: rem };
  };

  const accentColor = appMode === 'staff' ? C.blue600 : C.emerald600;
  const accentLight = appMode === 'staff' ? C.blue50 : C.emerald50;
  const accentBorder = appMode === 'staff' ? C.blue100 : C.emerald100;

  return (
    <div style={S.app}>
      <div style={S.maxW}>

        {/* Mode tabs */}
        <div style={{ display: 'flex', background: C.slate100, padding: 6, borderRadius: 16, maxWidth: 440, margin: '0 auto 28px', gap: 4 }}>
          <button style={S.btnTab(appMode === 'staff', C.blue600)} onClick={() => setAppMode('staff')}>
            <SafeIcon icon={UserCheck} size={16} /> メンバー用（希望入力）
          </button>
          <button style={S.btnTab(appMode === 'admin', C.emerald600)} onClick={() => setAppMode('admin')}>
            <SafeIcon icon={ShieldCheck} size={16} /> 管理者用（シフト確定）
          </button>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: C.slate900, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
              <SafeIcon icon={CalendarIcon} size={26} color={accentColor} /> シフト調整ツール
            </h1>
            <p style={{ fontSize: 13, color: C.slate500, marginTop: 4 }}>
              {appMode === 'staff' ? '出勤可能な希望時間帯を入力してください。' : 'カレンダーでメンバーの希望を確認し、シフトを確定します。'}
            </p>
          </div>
          <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px' }}>
            <button style={S.btnGhost} onClick={() => changeMonth(-1)}><SafeIcon icon={ChevronLeft} size={20} /></button>
            <span style={{ fontWeight: 700, minWidth: 110, textAlign: 'center', fontSize: 15 }}>{year}年 {month + 1}月</span>
            <button style={S.btnGhost} onClick={() => changeMonth(1)}><SafeIcon icon={ChevronRight} size={20} /></button>
          </div>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Sidebar */}
          <aside style={{ width: 240, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ ...S.card, ...S.cardPad }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.slate700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <SafeIcon icon={Users} size={16} color={C.slate400} /> {appMode === 'staff' ? 'メンバー追加' : 'スタッフ管理'}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  style={{ ...S.input, flex: 1, minWidth: 0 }}
                  value={newStaffName} placeholder="名前を入力"
                  onChange={e => setNewStaffName(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && addStaff()}
                />
                <button style={{ ...S.btnSmall, borderRadius: 10 }} onClick={addStaff} disabled={!newStaffName.trim()}>
                  <SafeIcon icon={Plus} size={18} />
                </button>
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {staff.map(s => (
                  <li key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 10, background: C.slate50, border: `1px solid ${C.slate100}` }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</span>
                    <button style={{ ...S.btnGhost, padding: 4 }} onClick={() => removeStaff(s.id)}><SafeIcon icon={Trash2} size={14} /></button>
                  </li>
                ))}
              </ul>
            </div>

            {appMode === 'staff' ? (
              <div style={{ ...S.card, padding: 20, background: C.blue50, border: `1px solid ${C.blue100}` }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.blue900, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <SafeIcon icon={Share2} size={16} /> 希望を提出する
                </div>
                <p style={{ fontSize: 12, color: C.blue700, marginBottom: 14, lineHeight: 1.6 }}>
                  すべての希望を入力し終えたら、コードをコピーして管理者に送付してください。
                </p>
                <button style={{ ...S.btnPrimary(C.blue600), width: '100%' }} onClick={generateShareCode}>
                  <SafeIcon icon={ClipboardCopy} size={16} /> 希望コードをコピー
                </button>
              </div>
            ) : (
              <>
                <div style={{ ...S.card, padding: 20, background: C.emerald50, border: `1px solid ${C.emerald100}` }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.emerald900, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <SafeIcon icon={DownloadCloud} size={16} /> 希望を読み込む
                  </div>
                  <p style={{ fontSize: 12, color: C.emerald700, marginBottom: 10, lineHeight: 1.6 }}>
                    メンバーから送られた「希望コード」を貼り付けて読み込みます。
                  </p>
                  <textarea style={{ ...S.textarea, border: `1.5px solid ${C.emerald200}`, marginBottom: 8 }} rows={3} value={importCodeStr} onChange={e => setImportCodeStr(e.target.value)} placeholder="ここにコードをペースト..." />
                  <button style={{ ...S.btnPrimary(C.emerald600), width: '100%' }} onClick={handleImportCode} disabled={!importCodeStr.trim()}>
                    データを取り込む
                  </button>
                </div>
                <div style={{ ...S.card, ...S.cardPad }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.slate700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <SafeIcon icon={Download} size={16} color={C.slate400} /> シフト出力
                  </div>
                  <button style={{ ...S.btnPrimary(), width: '100%' }} onClick={exportToSpreadsheet}>
                    確定シフトをTSV出力
                  </button>
                </div>
              </>
            )}

            <div style={{ ...S.card, ...S.cardPad }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.slate400, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>凡例</div>
              {[
                { style: S.reqPill('attendance'), text: '出勤（希望）' },
                { style: S.confPill('attendance'), text: '出勤（確定）' },
                { style: S.reqPill('remote'), text: 'リモート（希望）' },
                { style: S.confPill('remote'), text: 'リモート（確定）' },
                { style: S.reqPill('unavailable'), text: '不可（希望）' },
                { style: S.confPill('unavailable'), text: '不可（確定）' },
              ].map(({ style, text }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={style}>{text.includes('出勤') ? '出' : text.includes('リ') ? 'リ' : '×'}</span>
                  <span style={{ fontSize: 12, color: C.slate600 }}>{text}</span>
                </div>
              ))}
            </div>
          </aside>

          {/* Calendar */}
          <main style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
            <div style={{ ...S.card, minWidth: 580, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: C.slate50, borderBottom: `1px solid ${C.slate200}` }}>
                {DAYS_OF_WEEK.map((d, i) => (
                  <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: i === 0 ? '#ef4444' : i === 6 ? C.blue500 : C.slate400 }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderLeft: `1px solid ${C.slate100}`, borderTop: `1px solid ${C.slate100}` }}>
                {calendarDays.map((day, idx) => {
                  const dateStr = day ? formatDate(year, month, day) : null;
                  const dayData = dateStr ? (shifts[dateStr] || {}) : {};
                  const isToday = day && new Date().toDateString() === new Date(year, month, day).toDateString();
                  const dow = day ? new Date(year, month, day).getDay() : -1;

                  return (
                    <div
                      key={idx}
                      onClick={() => day && (setSelectedDate(dateStr), setIsModalOpen(true))}
                      style={{
                        minHeight: 120, padding: 8, borderRight: `1px solid ${C.slate100}`, borderBottom: `1px solid ${C.slate100}`,
                        background: day ? C.white : C.slate50, cursor: day ? 'pointer' : 'default',
                        display: 'flex', flexDirection: 'column', transition: 'background .1s',
                      }}
                      onMouseEnter={e => { if (day) e.currentTarget.style.background = C.slate50; }}
                      onMouseLeave={e => { if (day) e.currentTarget.style.background = C.white; }}
                    >
                      {day && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{
                              width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, fontWeight: 600, background: isToday ? accentColor : 'transparent',
                              color: isToday ? C.white : dow === 0 ? '#ef4444' : dow === 6 ? C.blue500 : C.slate700,
                            }}>{day}</span>
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto' }}>
                            {staff.map(s => {
                              const rh = calculateHours(dayData.requests?.[s.id]);
                              const ch = calculateHours(dayData.confirmed?.[s.id]);
                              const rTotal = rh.attendance + rh.remote, cTotal = ch.attendance + ch.remote;
                              if (appMode === 'staff' && rTotal === 0) return null;
                              if (appMode === 'admin' && rTotal === 0 && cTotal === 0) return null;
                              return (
                                <div key={s.id} style={{ fontSize: 10, background: C.slate50, border: `1px solid ${C.slate100}`, borderRadius: 6, padding: '3px 5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                                  <span style={{ fontWeight: 600, color: C.slate700, flexShrink: 0 }}>{s.name}</span>
                                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                    {appMode === 'staff' ? (
                                      <>
                                        {rh.attendance > 0 && <span style={S.reqPill('attendance')}>{rh.attendance}h</span>}
                                        {rh.remote > 0 && <span style={S.reqPill('remote')}>{rh.remote}h</span>}
                                      </>
                                    ) : cTotal > 0 ? (
                                      <>
                                        {ch.attendance > 0 && <span style={S.confPill('attendance')}>{ch.attendance}h</span>}
                                        {ch.remote > 0 && <span style={S.confPill('remote')}>{ch.remote}h</span>}
                                      </>
                                    ) : (
                                      <>
                                        {rh.attendance > 0 && <span style={S.reqPill('attendance')}>希{rh.attendance}h</span>}
                                        {rh.remote > 0 && <span style={S.reqPill('remote')}>希{rh.remote}h</span>}
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {dayData.notes && (
                            <div style={{ marginTop: 4, fontSize: 10, color: C.slate400, display: 'flex', alignItems: 'center', gap: 3, background: C.slate50, borderRadius: 4, padding: '2px 5px', border: `1px solid ${C.slate100}`, overflow: 'hidden' }}>
                              <SafeIcon icon={FileText} size={9} style={{ flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dayData.notes}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: C.white, borderRadius: 20, boxShadow: '0 25px 60px rgba(0,0,0,.2)', width: '100%', maxWidth: 860, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: `1px solid ${accentBorder}`, background: accentLight, borderRadius: '20px 20px 0 0', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: C.slate900, margin: 0 }}>{selectedDate}</h3>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: appMode === 'staff' ? C.blue100 : C.emerald100, color: accentColor }}>
                    {appMode === 'staff' ? '希望入力' : 'シフト確定'}
                  </span>
                </div>
                <button onClick={() => setIsModalOpen(false)} style={{ padding: 8, borderRadius: 10, border: `1px solid ${C.slate200}`, background: C.white, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <SafeIcon icon={X} size={18} color={C.slate500} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.slate600, whiteSpace: 'nowrap' }}>全体備考:</span>
                <input
                  type="text" style={{ ...S.input, flex: 1 }}
                  value={shifts[selectedDate]?.notes || ''}
                  onChange={e => updateDayNote(selectedDate, e.target.value)}
                  placeholder="例：LEADING SPRING @品川インターシティ"
                />
              </div>
            </div>

            {appMode === 'staff' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                <section>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.slate700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${C.slate200}` }}>
                    <SafeIcon icon={Clock} size={15} /> 出勤時間の希望
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {staff.map(s => {
                      const { status, start, end } = getStaffDropdownState(selectedDate, s.id);
                      const statusColors = {
                        attendance: { bg: C.yellow50, border: C.yellow400, color: C.yellow700 },
                        remote: { bg: C.blue50, border: C.blue400, color: C.blue700 },
                        unavailable: { bg: C.slate100, border: C.slate300, color: C.slate500 },
                        none: { bg: C.white, border: C.slate200, color: C.slate500 },
                      };
                      const sc = statusColors[status];
                      return (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: C.slate50, border: `1px solid ${C.slate200}`, borderRadius: 12, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, color: C.slate800, minWidth: 60, fontSize: 14 }}>{s.name}</span>
                          <select
                            value={status}
                            onChange={e => handleStaffRequestChange(selectedDate, s.id, 'status', e.target.value)}
                            style={{ ...S.select, background: sc.bg, borderColor: sc.border, color: sc.color, fontWeight: 600 }}
                          >
                            <option value="none">未設定</option>
                            <option value="attendance">出勤希望</option>
                            <option value="remote">リモート希望</option>
                            <option value="unavailable">× 不可</option>
                          </select>
                          {(status === 'attendance' || status === 'remote') && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <select style={S.select} value={start} onChange={e => handleStaffRequestChange(selectedDate, s.id, 'start', e.target.value)}>
                                {START_TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <span style={{ color: C.slate400, fontWeight: 700 }}>〜</span>
                              <select style={S.select} value={end} onChange={e => handleStaffRequestChange(selectedDate, s.id, 'end', e.target.value)}>
                                {END_TIME_SLOTS.map((t, i) => START_TIME_SLOTS.indexOf(start) <= i ? <option key={t} value={t}>{t}</option> : null)}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
                <section>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.slate700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${C.slate200}` }}>
                    <SafeIcon icon={FileText} size={15} /> タスク・個人の備考
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                    {staff.map(s => (
                      <div key={s.id}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.slate500, marginBottom: 4 }}>{s.name}</label>
                        <textarea rows={2} style={S.textarea} value={shifts[selectedDate]?.staffTasks?.[s.id] || ''} onChange={e => updateStaffTask(selectedDate, s.id, e.target.value)} placeholder="例：13時から別件あり" />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {appMode === 'admin' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '10px 22px', background: C.emerald50, borderBottom: `1px solid ${C.emerald100}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
                  <p style={{ fontSize: 12, color: C.emerald700, fontWeight: 500, margin: 0 }}>点線はメンバーの希望です。クリックで「確定」に切り替わります。</p>
                  <button style={{ ...S.btnPrimary(C.emerald600), whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => applyRequestsToConfirmed(selectedDate)}>
                    <SafeIcon icon={Wand2} size={15} /> 希望から一括シフト作成
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px' }}>
                  <div style={{ minWidth: 500 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ position: 'sticky', top: 0, background: C.white, zIndex: 10 }}>
                          <th style={{ padding: '8px 10px', borderBottom: `2px solid ${C.slate200}`, color: C.slate500, fontSize: 12, fontWeight: 600, textAlign: 'center', width: 70 }}>時間</th>
                          {staff.map(s => (
                            <th key={s.id} style={{ padding: '8px 10px', borderBottom: `2px solid ${C.slate200}`, color: C.slate800, fontWeight: 700, textAlign: 'center', fontSize: 14 }}>{s.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {TIME_SLOTS.map(time => (
                          <tr key={time} style={{ borderBottom: `1px solid ${C.slate100}` }}>
                            <td style={{ padding: '4px 8px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: C.slate500, background: C.slate50 }}>{time}</td>
                            {staff.map(s => {
                              const req = shifts[selectedDate]?.requests?.[s.id]?.[time] || 'none';
                              const conf = shifts[selectedDate]?.confirmed?.[s.id]?.[time] || 'none';
                              const isConf = conf !== 'none';
                              let btnStyle, label;
                              if (isConf) {
                                const m = { attendance: { bg: C.yellow300, border: C.yellow400, color: C.yellow900 }, remote: { bg: C.blue200, border: C.blue400, color: C.blue900 }, unavailable: { bg: C.slate800, border: C.slate900, color: C.white } }[conf];
                                btnStyle = { background: m.bg, borderColor: m.border, color: m.color, fontWeight: 700, borderStyle: 'solid' };
                                label = STATUS_TYPES[conf].label;
                              } else if (req !== 'none') {
                                const m = { attendance: { bg: C.yellow50, border: C.yellow400, color: C.yellow700 }, remote: { bg: C.blue50, border: C.blue400, color: C.blue700 }, unavailable: { bg: C.slate100, border: C.slate300, color: C.slate400 } }[req];
                                btnStyle = { background: m.bg, borderColor: m.border, color: m.color, fontWeight: 500, borderStyle: 'dashed' };
                                label = req === 'unavailable' ? '×不可' : `${STATUS_TYPES[req].label.substring(0, 2)}希望`;
                              } else {
                                btnStyle = { background: C.white, borderColor: C.slate200, color: 'transparent', borderStyle: 'solid' };
                                label = '';
                              }
                              return (
                                <td key={s.id} style={{ padding: '3px 4px', textAlign: 'center' }}>
                                  <button
                                    onClick={() => toggleConfirmed(selectedDate, s.id, time)}
                                    style={{ width: '100%', height: 36, borderRadius: 8, border: `1.5px ${btnStyle.borderStyle} ${btnStyle.borderColor}`, background: btnStyle.background, color: btnStyle.color, fontWeight: btnStyle.fontWeight, fontSize: 11, cursor: 'pointer', transition: 'all .15s' }}
                                  >{label}</button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        <tr style={{ background: C.slate50 }}>
                          <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: C.slate700 }}>タスク・<br />備考</td>
                          {staff.map(s => (
                            <td key={s.id} style={{ padding: 6, verticalAlign: 'top' }}>
                              <textarea rows={3} style={S.textarea} value={shifts[selectedDate]?.staffTasks?.[s.id] || ''} onChange={e => updateStaffTask(selectedDate, s.id, e.target.value)} placeholder="例：投稿スケジュール作成" />
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div style={{ padding: '14px 22px', borderTop: `1px solid ${C.slate100}`, background: C.slate50, borderRadius: '0 0 20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
              <p style={{ flex: 1, fontSize: 11, color: C.slate400, margin: 0 }}>
                {appMode === 'staff' ? '時間を選択するとその時間帯の希望が一括でセットされます。' : '細かく時間を調整したい場合は各セルをクリックして個別に変更できます。'}
              </p>
              <button style={{ ...S.btnPrimary(), padding: '10px 28px' }} onClick={() => setIsModalOpen(false)}>閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: C.slate800, color: C.white, padding: '12px 18px', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,.3)', display: 'flex', alignItems: 'center', gap: 10, zIndex: 100 }}>
          <SafeIcon icon={CheckCircle2} size={18} color={C.emerald400} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>{toastMessage}</span>
          <button style={{ ...S.btnGhost, marginLeft: 4, padding: 2 }} onClick={() => setToastMessage('')}><SafeIcon icon={X} size={15} /></button>
        </div>
      )}
    </div>
  );
};

export default App;