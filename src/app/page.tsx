'use client'

import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LeadManagementSystem() {
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [leads, setLeads] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  
  // 검색 및 벌크 선택 상태
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkClientId, setBulkClientId] = useState('')

  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newMemo, setNewMemo] = useState('')

  const handleLogin = async () => {
    if (loginId === 'admin' && password === '1234') {
      setUser({ client_name: '총괄 관리자' }); setIsAdmin(true); return
    }
    const { data } = await supabase.from('clients').select('*').eq('login_id', loginId).eq('password', password).single()
    if (data) { setUser(data); setIsAdmin(false); } else { alert('인증 실패'); }
  }

  const fetchData = async () => {
    if (!user) return
    let query = supabase.from('leads').select('*, lead_logs(*)').order('created_at', { ascending: false })
    if (!isAdmin) query = query.eq('client_id', user.id)
    const { data: leadsData } = await query
    if (isAdmin) {
      const { data: clientsData } = await supabase.from('clients').select('*')
      setClients(clientsData || [])
    }
    setLeads(leadsData || [])
  }

  useEffect(() => { fetchData() }, [user])

  // --- 벌크 선택 로직 ---
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLeads.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredLeads.map(l => l.id))
    }
  }

  // --- 일괄 배정 실행 ---
  const handleBulkAssign = async () => {
    if (!bulkClientId) return alert('배정할 업체를 선택해주세요.')
    if (selectedIds.length === 0) return alert('대상 리드를 선택해주세요.')
    
    if (!window.confirm(`${selectedIds.length}개의 리드를 일괄 배정하시겠습니까?`)) return

    const now = new Date().toISOString()
    const { error } = await supabase.from('leads').update({ 
      client_id: bulkClientId, 
      status: '배정완료',
      assigned_at: now 
    }).in('id', selectedIds)

    if (!error) {
      alert('일괄 배정이 완료되었습니다.')
      setSelectedIds([])
      setBulkClientId('')
      fetchData()
    }
  }

  const downloadExcel = () => {
    const headers = ['이름', '연락처', '상태', '인입시간', '배정시간', '메모']
    const rows = leads.map(l => [l.customer_name, `'${l.phone_number}`, l.status, formatTime(l.created_at), formatTime(l.assigned_at), l.memo || ''])
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob); const link = document.createElement("a")
    link.setAttribute("href", url); link.setAttribute("download", `Leads_Export.csv`)
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  const filteredLeads = leads.filter(l => 
    l.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) || l.phone_number.includes(searchTerm)
  )

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '-';
    return new Date(timeStr).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  const isToday = (dateStr: string | null) => {
    if (!dateStr) return false;
    const date = new Date(dateStr); const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f4f4]">
        <div className="bg-white p-10 w-full max-w-md border-t-4 border-[#0f62fe] shadow-sm">
          <h1 className="text-2xl font-light mb-8 italic">CPA Manager <span className="font-bold text-[#0f62fe]">Login</span></h1>
          <input className="w-full bg-[#f4f4f4] border-b border-[#8d8d8d] p-3 mb-4 outline-none" placeholder="ID" onChange={e => setLoginId(e.target.value)} />
          <input className="w-full bg-[#f4f4f4] border-b border-[#8d8d8d] p-3 mb-8 outline-none" type="password" placeholder="PW" onChange={e => setPassword(e.target.value)} />
          <button className="w-full bg-[#0f62fe] text-white p-4 font-bold" onClick={handleLogin}>Log in</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] text-[#161616] font-sans">
      <header className="h-12 bg-[#161616] text-white flex items-center justify-between px-6 sticky top-0 z-50">
        <span className="font-bold tracking-tighter uppercase">CPA Management</span>
        <button onClick={() => setUser(null)} className="text-xs text-[#c6c6c6]">Logout</button>
      </header>

      <main className="p-8 max-w-[1200px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <h1 className="text-3xl font-light">{isAdmin ? 'Admin Center' : `Workspace: ${user.client_name}`}</h1>
            <div className="flex gap-2 w-full md:w-auto">
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-white border border-[#8d8d8d] px-4 py-2 text-sm outline-none focus:border-[#0f62fe] flex-1 md:w-64" placeholder="검색..." />
                <button onClick={downloadExcel} className="bg-[#161616] text-white px-4 py-2 text-sm font-bold hover:bg-black transition">📥 Export</button>
            </div>
        </div>

        {/* 요약 대시보드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-[#e0e0e0] border border-[#e0e0e0] mb-8 shadow-sm">
            <div className="bg-white p-6">
                <p className="text-[11px] font-bold text-[#525252] uppercase mb-1 tracking-widest">Total</p>
                <p className="text-4xl font-light">{leads.length}</p>
            </div>
            <div className="bg-white p-6">
                <p className="text-[11px] font-bold text-[#0f62fe] uppercase mb-1 tracking-widest text-[#0f62fe]">Today</p>
                <p className="text-4xl font-light text-[#0f62fe]">{isAdmin ? leads.filter(l => isToday(l.created_at)).length : leads.filter(l => isToday(l.assigned_at)).length}</p>
            </div>
            <div className="bg-white p-6">
                <p className="text-[11px] font-bold text-[#a2191f] uppercase mb-1 tracking-widest text-[#a2191f]">Pending</p>
                <p className="text-4xl font-light text-[#a2191f]">{leads.filter(l => l.status === '상담중').length}</p>
            </div>
            <div className="bg-white p-6">
                <p className="text-[11px] font-bold text-[#198038] uppercase mb-1 tracking-widest text-[#198038]">Closed</p>
                <p className="text-4xl font-light text-[#198038]">{leads.filter(l => l.status === '계약완료').length}</p>
            </div>
        </div>

        {/* --- 어드민 전용: 일괄 배정 툴바 --- */}
        {isAdmin && selectedIds.length > 0 && (
          <div className="bg-[#161616] text-white p-4 mb-4 flex items-center justify-between shadow-lg sticky top-12 z-40 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-[#0f62fe]">{selectedIds.length}개 선택됨</span>
            </div>
            <div className="flex gap-2">
              <select 
                className="bg-[#393939] text-white border-none p-2 text-sm outline-none"
                value={bulkClientId}
                onChange={(e) => setBulkClientId(e.target.value)}
              >
                <option value="">배정할 업체 선택</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
              </select>
              <button onClick={handleBulkAssign} className="bg-[#0f62fe] px-6 py-2 text-sm font-bold hover:bg-[#0353e9]">일괄 배정 실행</button>
              <button onClick={() => setSelectedIds([])} className="text-xs text-[#c6c6c6] px-2">취소</button>
            </div>
          </div>
        )}

        <div className="space-y-[1px] bg-[#e0e0e0] border border-[#e0e0e0]">
          {/* 리스트 헤더 (선택용) */}
          {isAdmin && (
            <div className="bg-[#f4f4f4] p-3 flex items-center gap-4 px-6 border-b border-[#e0e0e0]">
              <input type="checkbox" className="w-4 h-4" checked={selectedIds.length === filteredLeads.length && filteredLeads.length > 0} onChange={toggleSelectAll} />
              <span className="text-xs font-bold text-[#525252]">전체 선택</span>
            </div>
          )}

          {filteredLeads.map((lead) => (
            <div key={lead.id} className={`bg-white p-0 flex flex-col md:flex-row hover:bg-[#fbfbfb] transition border-l-4 ${selectedIds.includes(lead.id) ? 'border-[#0f62fe] bg-[#f0f7ff]' : 'border-transparent'}`}>
              <div className="flex-1 p-6 flex items-start gap-4">
                {isAdmin && (
                  <input type="checkbox" className="mt-2 w-4 h-4" checked={selectedIds.includes(lead.id)} onChange={() => toggleSelect(lead.id)} />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`text-[10px] px-2 py-0.5 font-bold uppercase ${lead.client_id ? 'bg-[#e5f6ff] text-[#0043ce]' : 'bg-[#fff1f1] text-[#a2191f]'}`}>{lead.status}</span>
                    <h3 className="text-xl font-light">{lead.customer_name} | {lead.phone_number}</h3>
                    <div className="ml-auto text-right flex flex-col gap-1">
                        {isAdmin ? (
                            <>
                                <span className="text-[10px] text-slate-400">인입: {formatTime(lead.created_at)}</span>
                                <span className="text-[10px] text-[#0f62fe]">배정: {formatTime(lead.assigned_at)}</span>
                            </>
                        ) : (
                            <span className="text-[10px] text-slate-400 italic">수신: {formatTime(lead.assigned_at)}</span>
                        )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {lead.lead_logs?.slice(0, 2).map((log: any) => (
                      <div key={log.id} className="text-xs flex justify-between p-2 bg-[#f4f4f4]">
                        <span><span className="font-bold text-[#0f62fe] mr-2">[{log.status}]</span>{log.memo}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="w-full md:w-[280px] bg-[#fbfbfb] p-6 border-l border-[#e0e0e0]">
                {isAdmin ? (
                  <div className="space-y-2">
                    <select 
                      className="w-full bg-white border border-[#8d8d8d] p-2 text-sm outline-none"
                      onChange={(e) => {
                        const cid = e.target.value;
                        if (!cid) return;
                        supabase.from('leads').update({ client_id: cid, status: '배정완료', assigned_at: new Date().toISOString() }).eq('id', lead.id).then(() => fetchData());
                      }}
                      value={lead.client_id || ''}
                    >
                      <option value="">개별 배정</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
                    </select>
                    <button onClick={() => deleteLead(lead.id)} className="w-full border border-[#fa4d56] text-[#fa4d56] p-1.5 text-[10px] font-bold hover:bg-[#fff1f1]">Delete</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select id={`st-${lead.id}`} className="w-full bg-white border border-[#8d8d8d] p-2 text-sm">
                      <option>상담중</option><option>재통화필요</option><option>방문예약</option><option>계약완료</option><option>실패</option>
                    </select>
                    <textarea id={`mm-${lead.id}`} className="w-full bg-white border border-[#8d8d8d] p-2 text-xs h-16 outline-none" placeholder="Notes..." />
                    <button 
                      onClick={() => {
                        const s = (document.getElementById(`st-${lead.id}`) as any).value
                        const m = (document.getElementById(`mm-${lead.id}`) as any).value
                        addLog(lead.id, s, m);
                        (document.getElementById(`mm-${lead.id}`) as any).value = ''
                      }}
                      className="w-full bg-[#0f62fe] text-white p-2 text-sm font-bold"
                    >Save</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}