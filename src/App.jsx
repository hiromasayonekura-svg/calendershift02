import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon,
  Users,
  Download,
  X,
  FileText,
  CheckCircle2,
  Share2,
  DownloadCloud,
  ClipboardCopy,
  ShieldCheck,
  UserCheck,
  Wand2,
  Clock
} from 'lucide-react';

// --- Constants ---
const START_TIME_SLOTS = Array.from({ length: 14 }, (_, i) => `${i + 9}:00`);
const END_TIME_SLOTS = Array.from({ length: 14 }, (_, i) => `${i + 10}:00`);
const TIME_SLOTS = START_TIME_SLOTS; // 互換性維持
const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土'];

// モードに応じたスタイルの定義
const STATUS_TYPES = {
  none: { 
    id: 'none', 
    label: '未設定', 
    requestClass: 'bg-white border-slate-200 text-slate-300 hover:bg-slate-50',
    confirmedClass: 'bg-white border-slate-200 text-slate-300 hover:bg-slate-50'
  },
  attendance: { 
    id: 'attendance', 
    label: '出勤/現場', 
    requestClass: 'bg-yellow-50 border-yellow-400 border-dashed border-2 text-yellow-700',
    confirmedClass: 'bg-yellow-300 border-yellow-400 border-solid border text-yellow-900 font-bold shadow-sm'
  },
  remote: { 
    id: 'remote', 
    label: 'リモート', 
    requestClass: 'bg-blue-50 border-blue-400 border-dashed border-2 text-blue-700',
    confirmedClass: 'bg-blue-200 border-blue-400 border-solid border text-blue-900 font-bold shadow-sm'
  },
  unavailable: { 
    id: 'unavailable', 
    label: '不可', 
    requestClass: 'bg-slate-100 border-slate-300 border-dashed border-2 text-slate-400',
    confirmedClass: 'bg-slate-800 border-slate-900 border-solid border text-white font-bold shadow-sm'
  }
};

const REQUEST_CYCLE = ['none', 'attendance', 'remote', 'unavailable'];

const App = () => {
  // --- State ---
  const [appMode, setAppMode] = useState('staff'); // 'staff' (希望入力) | 'admin' (確定調整)
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1)); // 2026年4月
  
  const [staff, setStaff] = useState([
    { id: '1', name: '島田' },
    { id: '2', name: '本間' }
  ]);
  
  const [shifts, setShifts] = useState({});
  const [newStaffName, setNewStaffName] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importCodeStr, setImportCodeStr] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // --- Helpers ---
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const formatDate = (y, m, d) => {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const changeMonth = (offset) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };

  const addStaff = () => {
    if (!newStaffName.trim()) return;
    const newMember = {
      id: Math.random().toString(36).substr(2, 9),
      name: newStaffName.trim()
    };
    setStaff([...staff, newMember]);
    setNewStaffName('');
  };

  const removeStaff = (id) => {
    setStaff(staff.filter(s => s.id !== id));
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 5000);
  };

  // --- Staff Mode: プルダウン用の状態解析と更新 ---
  const getStaffDropdownState = (dateStr, staffId) => {
    const reqs = shifts[dateStr]?.requests?.[staffId] || {};
    const activeTimes = START_TIME_SLOTS.filter(t => reqs[t] === 'attendance' || reqs[t] === 'remote');
    
    let status = 'none';
    if (activeTimes.length > 0) status = reqs[activeTimes[0]];
    else if (Object.values(reqs).includes('unavailable')) status = 'unavailable';
    
    let start = activeTimes.length > 0 ? activeTimes[0] : '9:00';
    let end = activeTimes.length > 0 ? END_TIME_SLOTS[START_TIME_SLOTS.indexOf(activeTimes[activeTimes.length - 1])] : '18:00';

    return { status, start, end };
  };

  const handleStaffRequestChange = (dateStr, staffId, field, value) => {
    const current = getStaffDropdownState(dateStr, staffId);
    
    let newStatus = current.status;
    let newStart = current.start;
    let newEnd = current.end;

    if (field === 'status') newStatus = value;
    if (field === 'start') {
      newStart = value;
      // 終了時間が開始時間以下にならないように補正
      if (START_TIME_SLOTS.indexOf(newStart) > END_TIME_SLOTS.indexOf(newEnd)) {
        newEnd = END_TIME_SLOTS[START_TIME_SLOTS.indexOf(newStart)];
      }
    }
    if (field === 'end') newEnd = value;

    const newStaffReqs = {};
    
    if (newStatus === 'unavailable') {
      START_TIME_SLOTS.forEach(t => newStaffReqs[t] = 'unavailable');
    } else if (newStatus === 'attendance' || newStatus === 'remote') {
      const startIdx = START_TIME_SLOTS.indexOf(newStart);
      const endIdx = END_TIME_SLOTS.indexOf(newEnd);
      
      START_TIME_SLOTS.forEach((t, idx) => {
        if (idx >= startIdx && idx <= endIdx) {
          newStaffReqs[t] = newStatus;
        }
      });
    }

    setShifts(prev => {
      const dayData = prev[dateStr] || { notes: '', staffTasks: {}, requests: {}, confirmed: {} };
      return {
        ...prev,
        [dateStr]: {
          ...dayData,
          requests: {
            ...dayData.requests,
            [staffId]: newStaffReqs
          }
        }
      };
    });
  };

  // --- Admin Mode: 管理者用のトグル・自動反映 ---
  const toggleConfirmed = (dateStr, staffId, time) => {
    setShifts(prev => {
      const dayData = prev[dateStr] || { notes: '', staffTasks: {}, requests: {}, confirmed: {} };
      const req = dayData.requests?.[staffId]?.[time];
      const conf = dayData.confirmed?.[staffId]?.[time] || 'none';
      
      let nextConf;
      if (conf === 'none') {
        if (req === 'attendance' || req === 'remote') nextConf = req;
        else nextConf = 'attendance';
      } else if (conf === 'attendance') {
        nextConf = 'remote';
      } else {
        nextConf = 'none';
      }

      return {
        ...prev,
        [dateStr]: {
          ...dayData,
          confirmed: {
            ...dayData.confirmed,
            [staffId]: {
              ...(dayData.confirmed?.[staffId] || {}),
              [time]: nextConf === 'none' ? undefined : nextConf
            }
          }
        }
      };
    });
  };

  // 希望から一括シフト作成機能
  const applyRequestsToConfirmed = (dateStr) => {
    setShifts(prev => {
      const dayData = prev[dateStr];
      if (!dayData || !dayData.requests) return prev;
      
      const newConfirmed = {};
      Object.keys(dayData.requests).forEach(staffId => {
        newConfirmed[staffId] = { ...(dayData.confirmed?.[staffId] || {}) };
        Object.keys(dayData.requests[staffId]).forEach(time => {
          const req = dayData.requests[staffId][time];
          if (req !== 'none') {
            newConfirmed[staffId][time] = req; // 希望をそのまま確定に上書き
          }
        });
      });

      return {
        ...prev,
        [dateStr]: {
          ...dayData,
          confirmed: {
            ...(dayData.confirmed || {}),
            ...newConfirmed
          }
        }
      };
    });
    showToast('メンバーの希望をシフトに自動反映しました！');
  };

  const updateDayNote = (dateStr, note) => {
    setShifts(prev => ({
      ...prev,
      [dateStr]: { ...(prev[dateStr] || { staffTasks: {}, requests: {}, confirmed: {} }), notes: note }
    }));
  };

  const updateStaffTask = (dateStr, staffId, task) => {
    setShifts(prev => {
      const dayData = prev[dateStr] || { notes: '', staffTasks: {}, requests: {}, confirmed: {} };
      return {
        ...prev,
        [dateStr]: {
          ...dayData,
          staffTasks: { ...dayData.staffTasks, [staffId]: task }
        }
      };
    });
  };

  // --- Data Sharing & Export ---
  const generateShareCode = () => {
    const data = { staff, shifts };
    const jsonStr = JSON.stringify(data);
    const codeStr = btoa(encodeURIComponent(jsonStr));
    
    const el = document.createElement('textarea');
    el.value = codeStr;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    
    showToast('希望コードをコピーしました！管理者にLINE等で送ってください。');
  };

  const handleImportCode = () => {
    if (!importCodeStr.trim()) return;
    try {
      const jsonStr = decodeURIComponent(atob(importCodeStr.trim()));
      const data = JSON.parse(jsonStr);
      
      let updatedStaff = [...staff];
      if (data.staff) {
        data.staff.forEach(importedStaff => {
          if (!updatedStaff.find(s => s.id === importedStaff.id)) {
            updatedStaff.push(importedStaff);
          }
        });
      }
      setStaff(updatedStaff);

      if (data.shifts) {
        setShifts(prev => {
          const newShifts = { ...prev };
          Object.keys(data.shifts).forEach(date => {
            if (!newShifts[date]) newShifts[date] = { requests: {}, confirmed: {}, staffTasks: {}, notes: '' };
            const importedDay = data.shifts[date];
            
            if (importedDay.requests) {
              newShifts[date].requests = { ...(newShifts[date].requests || {}) };
              Object.keys(importedDay.requests).forEach(staffId => {
                newShifts[date].requests[staffId] = {
                  ...(newShifts[date].requests[staffId] || {}),
                  ...importedDay.requests[staffId]
                };
              });
            }
            if (importedDay.staffTasks) {
              newShifts[date].staffTasks = { ...(newShifts[date].staffTasks || {}), ...importedDay.staffTasks };
            }
          });
          return newShifts;
        });
      }
      showToast('メンバーの希望データを読み込みました！');
      setImportCodeStr('');
    } catch (e) {
      alert('無効なコードです。正しいコードを貼り付けてください。');
    }
  };

  const exportToSpreadsheet = () => {
    let tsv = `日付\t曜日\t${TIME_SLOTS.join('\t')}\t備考\n`;
    const days = getDaysInMonth(year, month);
    
    for (let d = 1; d <= days; d++) {
      const dateStr = formatDate(year, month, d);
      const dayData = shifts[dateStr] || {};
      const dayOfWeek = DAYS_OF_WEEK[new Date(year, month, d).getDay()];
      
      let row = `${month + 1}月${d}日\t${dayOfWeek}\t`;
      
      TIME_SLOTS.forEach(time => {
        let cellStaff = [];
        staff.forEach(s => {
          const status = dayData.confirmed?.[s.id]?.[time];
          if (status === 'attendance') cellStaff.push(`${s.name}(出)`);
          if (status === 'remote') cellStaff.push(`${s.name}(リ)`);
        });
        row += `${cellStaff.join(' / ')}\t`;
      });
      
      row += `${dayData.notes || ''}\n`;
      tsv += row;
    }
    
    const el = document.createElement('textarea');
    el.value = tsv;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    
    showToast('TSV出力完了！スプレッドシートのA1に貼り付けてください。');
  };

  // --- Render Helpers ---
  const calendarDays = useMemo(() => {
    const days = [];
    const totalDays = getDaysInMonth(year, month);
    const startDay = getFirstDayOfMonth(year, month);
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(d);
    return days;
  }, [year, month]);

  const calculateHours = (schedulesObj) => {
    if (!schedulesObj) return { attendance: 0, remote: 0 };
    let att = 0, rem = 0;
    Object.values(schedulesObj).forEach(status => {
      if (status === 'attendance') att++;
      if (status === 'remote') rem++;
    });
    return { attendance: att, remote: rem };
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800 relative">
      <div className="max-w-7xl mx-auto">
        
        {/* モード切替タブ */}
        <div className="flex bg-slate-200/70 p-1.5 rounded-2xl mb-6 max-w-md mx-auto shadow-sm">
          <button 
            onClick={() => setAppMode('staff')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-bold rounded-xl transition-all duration-200 ${appMode === 'staff' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <UserCheck size={18} />
            メンバー用 (希望入力)
          </button>
          <button 
            onClick={() => setAppMode('admin')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-bold rounded-xl transition-all duration-200 ${appMode === 'admin' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ShieldCheck size={18} />
            管理者用 (シフト確定)
          </button>
        </div>

        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon className={appMode === 'staff' ? "text-blue-600" : "text-emerald-600"} />
              シフト調整ツール
            </h1>
            <p className="text-slate-500 mt-1">
              {appMode === 'staff' ? '出勤可能な希望時間帯を入力してください。' : 'カレンダー上でメンバーの希望を確認し、シフトを確定させます。'}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="font-bold px-4 min-w-[120px] text-center">
              {year}年 {month + 1}月
            </span>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-md font-semibold mb-4 flex items-center gap-2">
                <Users size={18} className="text-slate-400" />
                {appMode === 'staff' ? 'メンバー追加' : 'スタッフ管理'}
              </h2>
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="名前を入力"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-0"
                  onKeyPress={(e) => e.key === 'Enter' && addStaff()}
                />
                <button 
                  onClick={addStaff}
                  disabled={!newStaffName.trim()}
                  className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-900 transition-colors disabled:bg-slate-300 shrink-0"
                >
                  <Plus size={20} />
                </button>
              </div>
              <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {staff.map(s => (
                  <li key={s.id} className="flex items-center justify-between group p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100">
                    <span className="text-sm font-medium">{s.name}</span>
                    <button onClick={() => removeStaff(s.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* モード別アクションエリア */}
            {appMode === 'staff' ? (
              <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                <h2 className="text-md font-semibold mb-2 text-blue-900 flex items-center gap-2">
                  <Share2 size={18} />
                  希望を提出する
                </h2>
                <p className="text-xs text-blue-700 mb-4 leading-relaxed">
                  すべての希望を入力し終えたら、下のボタンからコードをコピーして管理者に送付してください。
                </p>
                <button 
                  onClick={generateShareCode}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-bold shadow-sm shadow-blue-200"
                >
                  <ClipboardCopy size={18} />
                  希望コードをコピー
                </button>
              </div>
            ) : (
              <>
                <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                  <h2 className="text-md font-semibold mb-2 text-emerald-900 flex items-center gap-2">
                    <DownloadCloud size={18} />
                    希望を読み込む
                  </h2>
                  <p className="text-xs text-emerald-700 mb-3 leading-relaxed">
                    メンバーから送られた「希望コード」を貼り付けて読み込みます。
                  </p>
                  <textarea 
                    value={importCodeStr}
                    onChange={(e) => setImportCodeStr(e.target.value)}
                    placeholder="ここにコードをペースト..."
                    className="w-full p-2 text-xs border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none mb-2"
                    rows={3}
                  />
                  <button 
                    onClick={handleImportCode}
                    disabled={!importCodeStr.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-bold disabled:bg-emerald-300"
                  >
                    データを取り込む
                  </button>
                </div>
                
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                  <h2 className="text-md font-semibold mb-3 flex items-center gap-2">
                    <Download size={18} className="text-slate-400" />
                    シフト出力
                  </h2>
                  <button 
                    onClick={exportToSpreadsheet}
                    className="w-full py-2.5 px-4 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors text-sm font-bold shadow-sm"
                  >
                    確定シフトをTSV出力
                  </button>
                </div>
              </>
            )}
            
            {/* 凡例 */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">凡例</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border-dashed border-2 bg-yellow-50 border-yellow-400`}></div>
                  <span className="text-xs text-slate-600">出勤(希望)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border-solid border bg-yellow-300 border-yellow-400`}></div>
                  <span className="text-xs text-slate-600">出勤(確定)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border-dashed border-2 bg-blue-50 border-blue-400`}></div>
                  <span className="text-xs text-slate-600">リモート(希望)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border-solid border bg-blue-200 border-blue-400`}></div>
                  <span className="text-xs text-slate-600">リモート(確定)</span>
                </div>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                  <div className={`w-4 h-4 rounded border-dashed border-2 bg-slate-100 border-slate-300`}></div>
                  <span className="text-xs text-slate-600">不可(希望)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border-solid border bg-slate-800 border-slate-900`}></div>
                  <span className="text-xs text-slate-600">不可(確定)</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Calendar View */}
          <main className="lg:col-span-4 overflow-x-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-w-[600px] overflow-hidden">
              <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                {DAYS_OF_WEEK.map((day, idx) => (
                  <div key={day} className={`py-3 text-center text-xs font-bold uppercase tracking-wider ${idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-slate-400'}`}>
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 border-l border-t border-slate-100">
                {calendarDays.map((day, idx) => {
                  const dateStr = day ? formatDate(year, month, day) : null;
                  const dayData = dateStr ? (shifts[dateStr] || {}) : {};
                  const isToday = day && new Date().toDateString() === new Date(year, month, day).toDateString();

                  return (
                    <div 
                      key={idx} 
                      onClick={() => day && (setSelectedDate(dateStr), setIsModalOpen(true))}
                      className={`min-h-[140px] max-h-[160px] p-2 border-r border-b border-slate-100 transition-colors flex flex-col ${day ? 'cursor-pointer hover:bg-slate-50/80 bg-white' : 'bg-slate-50/50'}`}
                    >
                      {day && (
                        <>
                          <div className="flex justify-between items-start mb-2">
                            <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? (appMode === 'staff' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white') : 'text-slate-700'}`}>
                              {day}
                            </span>
                          </div>
                          
                          {/* 稼働サマリー */}
                          <div className="flex-1 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
                            {staff.map(s => {
                              const reqHours = calculateHours(dayData.requests?.[s.id]);
                              const confHours = calculateHours(dayData.confirmed?.[s.id]);
                              const reqTotal = reqHours.attendance + reqHours.remote;
                              const confTotal = confHours.attendance + confHours.remote;
                              
                              if (appMode === 'staff' && reqTotal === 0) return null;
                              if (appMode === 'admin' && reqTotal === 0 && confTotal === 0) return null;
                              
                              return (
                                <div key={s.id} className="text-[11px] leading-tight flex flex-col xl:flex-row xl:items-center justify-between gap-1 bg-slate-50 border border-slate-100 p-1 rounded">
                                  <span className="font-medium truncate xl:max-w-[50px]">{s.name}</span>
                                  <div className="flex gap-1 text-[10px]">
                                    {appMode === 'staff' ? (
                                      <>
                                        {reqHours.attendance > 0 && <span className="text-yellow-700 bg-yellow-100 px-1 rounded whitespace-nowrap">{reqHours.attendance}h</span>}
                                        {reqHours.remote > 0 && <span className="text-blue-700 bg-blue-100 px-1 rounded whitespace-nowrap">{reqHours.remote}h</span>}
                                      </>
                                    ) : (
                                      confTotal > 0 ? (
                                        <>
                                          {confHours.attendance > 0 && <span className="text-yellow-900 bg-yellow-300 border border-yellow-400 font-bold px-1 rounded whitespace-nowrap">{confHours.attendance}h</span>}
                                          {confHours.remote > 0 && <span className="text-blue-900 bg-blue-200 border border-blue-400 font-bold px-1 rounded whitespace-nowrap">{confHours.remote}h</span>}
                                        </>
                                      ) : (
                                        <>
                                          {reqHours.attendance > 0 && <span className="text-yellow-600 bg-yellow-50 border border-dashed border-yellow-400 px-1 rounded whitespace-nowrap">希 {reqHours.attendance}h</span>}
                                          {reqHours.remote > 0 && <span className="text-blue-600 bg-blue-50 border border-dashed border-blue-400 px-1 rounded whitespace-nowrap">希 {reqHours.remote}h</span>}
                                        </>
                                      )
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* 備考インジケーター */}
                          {dayData.notes && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 rounded px-1 py-1 truncate border border-slate-100">
                              <FileText size={10} className="shrink-0" />
                              <span className="truncate">{dayData.notes}</span>
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

      {/* タイムライン割り当てモーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className={`p-4 sm:p-5 border-b flex justify-between items-start rounded-t-2xl ${appMode === 'staff' ? 'bg-blue-50/50 border-blue-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
              <div className="w-full">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-3">
                    {selectedDate} 
                    <span className={`text-sm sm:text-base font-bold px-3 py-1 rounded-full ${appMode === 'staff' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {appMode === 'staff' ? '希望入力' : 'シフト確定'}
                    </span>
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={20} className="text-slate-500" />
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-sm font-semibold text-slate-600 whitespace-nowrap">全体備考:</span>
                  <input
                    type="text"
                    value={shifts[selectedDate]?.notes || ''}
                    onChange={(e) => updateDayNote(selectedDate, e.target.value)}
                    placeholder="例：LEADING SPRING @品川インターシティ"
                    className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
            
            {/* --- Staff Mode: プルダウン入力 UI --- */}
            {appMode === 'staff' && (
              <div className="flex-1 overflow-auto p-4 sm:p-6 bg-white space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-700 border-b pb-2 flex items-center gap-2">
                    <Clock size={16} /> 出勤時間の希望
                  </h4>
                  {staff.map(s => {
                    const { status, start, end } = getStaffDropdownState(selectedDate, s.id);
                    return (
                      <div key={s.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="font-bold text-slate-800 w-24">{s.name}</span>
                        
                        <select 
                          value={status}
                          onChange={(e) => handleStaffRequestChange(selectedDate, s.id, 'status', e.target.value)}
                          className={`p-2 border rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none ${status === 'none' ? 'bg-white text-slate-500 border-slate-300' : STATUS_TYPES[status].confirmedClass.split(' ').slice(0,3).join(' ')}`}
                        >
                          <option value="none">未設定</option>
                          <option value="attendance">出勤希望</option>
                          <option value="remote">リモート希望</option>
                          <option value="unavailable">×不可</option>
                        </select>

                        {(status === 'attendance' || status === 'remote') && (
                          <div className="flex items-center gap-2 mt-2 sm:mt-0">
                            <select 
                              value={start}
                              onChange={(e) => handleStaffRequestChange(selectedDate, s.id, 'start', e.target.value)}
                              className="p-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                              {START_TIME_SLOTS.map(t => <option key={`start-${t}`} value={t}>{t}</option>)}
                            </select>
                            <span className="text-slate-500 font-bold">〜</span>
                            <select 
                              value={end}
                              onChange={(e) => handleStaffRequestChange(selectedDate, s.id, 'end', e.target.value)}
                              className="p-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                              {END_TIME_SLOTS.map((t, idx) => {
                                const startIdx = START_TIME_SLOTS.indexOf(start);
                                if (idx >= startIdx) {
                                  return <option key={`end-${t}`} value={t}>{t}</option>;
                                }
                                return null;
                              })}
                            </select>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="space-y-4 pt-2">
                  <h4 className="text-sm font-bold text-slate-700 border-b pb-2 flex items-center gap-2">
                    <FileText size={16} /> タスク・個人の備考
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {staff.map(s => (
                      <div key={`task-${s.id}`}>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">{s.name}</label>
                        <textarea
                          rows={2}
                          value={shifts[selectedDate]?.staffTasks?.[s.id] || ''}
                          onChange={(e) => updateStaffTask(selectedDate, s.id, e.target.value)}
                          placeholder="例：13時から別件あり"
                          className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* --- Admin Mode: テーブル UI と一括反映 --- */}
            {appMode === 'admin' && (
              <div className="flex-1 flex flex-col overflow-hidden bg-white">
                <div className="p-3 sm:px-5 sm:py-3 bg-emerald-50/50 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm z-10">
                  <p className="text-xs text-emerald-700 font-medium">点線はメンバーの希望です。クリックで「確定」に切り替わります。</p>
                  <button 
                    onClick={() => applyRequestsToConfirmed(selectedDate)}
                    className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-700 transition-all active:scale-95 whitespace-nowrap"
                  >
                    <Wand2 size={16} />
                    希望から一括シフト作成
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-2 sm:p-5">
                  <div className="min-w-[600px]">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-white z-10 shadow-sm">
                        <tr>
                          <th className="p-2 border-b-2 border-slate-200 text-slate-500 text-sm font-semibold w-20 sm:w-24 text-center">時間</th>
                          {staff.map(s => (
                            <th key={s.id} className="p-2 border-b-2 border-slate-200 text-slate-800 font-bold text-center">
                              {s.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {TIME_SLOTS.map(time => (
                          <tr key={time} className="hover:bg-slate-50 group">
                            <td className="p-1 border-b border-slate-100 text-center text-sm font-medium text-slate-500 bg-slate-50/50 group-hover:bg-slate-100/50">
                              {time}
                            </td>
                            {staff.map(s => {
                              const req = shifts[selectedDate]?.requests?.[s.id]?.[time] || 'none';
                              const conf = shifts[selectedDate]?.confirmed?.[s.id]?.[time] || 'none';
                              
                              const isConfirmed = conf !== 'none';
                              const activeStatus = isConfirmed ? conf : req;
                              const statusDef = STATUS_TYPES[activeStatus];
                              
                              let btnClass = 'bg-white border-slate-200 hover:bg-slate-50 text-transparent';
                              let label = '';

                              if (isConfirmed) {
                                btnClass = statusDef.confirmedClass;
                                label = statusDef.label;
                              } else if (req !== 'none') {
                                btnClass = statusDef.requestClass;
                                label = req === 'unavailable' ? '×不可' : `${statusDef.label.substring(0,2)}希望`;
                              }

                              return (
                                <td key={`${s.id}-${time}`} className="p-1 border-b border-x border-slate-100 text-center">
                                  <button
                                    onClick={() => toggleConfirmed(selectedDate, s.id, time)}
                                    className={`w-full h-8 sm:h-10 rounded text-xs transition-all border focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 ${btnClass}`}
                                  >
                                    {label}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        {/* タスク行 */}
                        <tr className="bg-slate-50/80">
                          <td className="p-2 sm:p-3 border-b border-slate-200 text-center text-xs sm:text-sm font-bold text-slate-700">
                            タスク・<br/>個人の備考
                          </td>
                          {staff.map(s => (
                            <td key={`task-${s.id}`} className="p-2 border-b border-x border-slate-200 align-top">
                              <textarea
                                rows={3}
                                value={shifts[selectedDate]?.staffTasks?.[s.id] || ''}
                                onChange={(e) => updateStaffTask(selectedDate, s.id, e.target.value)}
                                placeholder="例：投稿スケジュール作成"
                                className="w-full p-2 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                              />
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex flex-col sm:flex-row justify-between items-center gap-3">
              <p className="text-xs text-slate-500 text-center sm:text-left">
                {appMode === 'staff' 
                  ? '時間を選択すると、その時間帯の希望が一括でセットされます。'
                  : '細かく時間を調整したい場合は、各セルをクリックして個別に変更できます。'}
              </p>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto bg-slate-800 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-sm"
              >
                閉じる
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* トースト通知 */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-in slide-in-from-bottom-5">
          <CheckCircle2 size={20} className="text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage('')} className="text-slate-400 hover:text-white ml-2">
            <X size={16} />
          </button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
      `}} />
    </div>
  );
};

export default App;