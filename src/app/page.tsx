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
  const [selectedClientId, setSelectedClientId] = useState<Record<string, string>>({})
  
  // 검색어 상태 추가
  const [searchTerm, setSearchTerm] = useState('')
  
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

  // --- 엑셀(CSV) 다운로드 로직 ---
  const downloadExcel = () => {
    const headers = ['이름', '연락처', '상태', '인입시간', '배정시간', '메모']
    const rows = leads.map(l => [
      l.customer_name,
      `'${l.phone_number}`, // 연락처가 숫자로 변환되지 않도록 ' 추가
      l.status,
      formatTime(l.created_at),
      formatTime(l.assigned_at),
      l.memo || ''
    ])

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `Leads_Export_${new Date().toLocaleDateString()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // --- 검색 필터 로직 ---
  const filteredLeads = leads.filter(l => 
    l.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.phone_number.includes(searchTerm)
  )

  const assignLead = async (leadId: string) => {
    const clientId = selectedClientId[leadId]
    if (!clientId) return alert('업체 선택!')
    const now = new Date().toISOString()
    await supabase.from('leads').update({ client_id: clientId, status: '배정완료', assigned_at: now }).eq('id', leadId)
    fetchData()
  }

  const deleteLead = async (leadId: string) => {
    if (!window.confirm('⚠️ 영구 삭제하시겠습니까?')) return
    await supabase.from('leads').delete().eq('id', leadId)
    fetchData()
  }

  const addLog = async (leadId: string, status: string, memo: string) => {
    if (!memo) return alert('메모 입력!')
    await supabase.from('lead_logs').insert({ lead_id: leadId, status, memo })
    await supabase.from('leads').update({ status }).eq('id', leadId)
    fetchData()
  }

  const handleAddLead = async () => {
    if (!newName || !newPhone) return alert('필수 입력!')
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_name: newName, phone_number: newPhone, memo: newMemo })
    })
    if (res.ok) { setNewName(''); setNewPhone(''); setNewMemo(''); fetchData(); }
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '-';
    return new Date(timeStr).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
        <span className="font-bold tracking-tighter">CPA Management System</span>
        <button onClick={() => setUser(null)} className="text-xs text-[#c6c6c6]">Logout</button>
      </header>

      <main className="p-8 max-w-[1200px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <h1 className="text-3xl font-light">{isAdmin ? 'Admin Center' : `Workspace: ${user.client_name}`}</h1>
            
            <div className="flex gap-2 w-full md:w-auto">
                {/* --- 검색창 추가 --- */}
                <input 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white border border-[#8d8d8d] px-4 py-2 text-sm outline-none focus:border-[#0f62fe] flex-1 md:w-64"
                  placeholder="이름 또는 연락처 검색..."
                />
                {/* --- 엑셀 다운로드 버튼 추가 --- */}
                <button 
                  onClick={downloadExcel}
                  className="bg-[#161616] text-white px-4 py-2 text-sm font-bold hover:bg-black transition flex items-center gap-2 whitespace-nowrap"
                >
                  <span className="text-xs">📥</span> Export Excel
                </button>
            </div>
        </div>

        {/* 요약 대시보드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-[#e0e0e0] border border-[#e0e0e0] mb-8 shadow-sm">
            <div className="bg-white p-6">
                <p className="text-[11px] font-bold text-[#525252] uppercase mb-1 tracking-widest">Total</p>
                <p className="text-4xl font-light">{leads.length}</p>
            </div>
            <div className="bg-white p-6 border-x border-[#e0e0e0]">
                <p className="text-[11px] font-bold text-[#525252] uppercase mb-1 tracking-widest text-[#0f62fe]">In Progress</p>
                <p className="text-4xl font-light text-[#0f62fe]">{leads.filter(l => l.status === '상담중').length}</p>
            </div>
            <div className="bg-white p-6">
                <p className="text-[11px] font-bold text-[#525252] uppercase mb-1 tracking-widest text-[#198038]">Closed</p>
                <p className="text-4xl font-light text-[#198038]">{leads.filter(l => l.status === '계약완료').length}</p>
            </div>
        </div>

        {isAdmin && (
          <div className="bg-white p-8 mb-8 border border-[#e0e0e0] shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#0f62fe] mb-6">➕ Create New Lead</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <input value={newName} onChange={e => setNewName(e.target.value)} className="bg-[#f4f4f4] border-b border-[#8d8d8d] p-2 text-sm outline-none" placeholder="Name" />
              <input value={newPhone} onChange={e => setNewPhone(e.target.value)} className="bg-[#f4f4f4] border-b border-[#8d8d8d] p-2 text-sm outline-none" placeholder="Phone" />
              <input value={newMemo} onChange={e => setNewMemo(e.target.value)} className="bg-[#f4f4f4] border-b border-[#8d8d8d] p-2 text-sm outline-none" placeholder="Memo" />
              <button onClick={handleAddLead} className="bg-[#0f62fe] text-white p-2.5 text-sm font-bold">Register</button>
            </div>
          </div>
        )}

        <div className="space-y-[1px] bg-[#e0e0e0] border border-[#e0e0e0] shadow-sm">
          {/* --- 필터링된 결과만 출력 --- */}
          {filteredLeads.map((lead) => (
            <div key={lead.id} className="bg-white p-0 flex flex-col md:flex-row hover:bg-[#fbfbfb] transition border-l-4 border-[#0f62fe]">
              <div className="flex-1 p-6 border-r border-[#e0e0e0]">
                <div className="flex items-center gap-3 mb-6">
                  <span className={`text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest ${lead.client_id ? 'bg-[#e5f6ff] text-[#0043ce]' : 'bg-[#fff1f1] text-[#a2191f]'}`}>{lead.status}</span>
                  <h3 className="text-2xl font-light">{lead.customer_name} | {lead.phone_number}</h3>
                  <div className="ml-auto flex flex-col items-end gap-1">
                    {isAdmin ? (
                        <>
                            <span className="text-[10px] text-slate-400 font-bold">인입: {formatTime(lead.created_at)}</span>
                            <span className="text-[10px] text-[#0f62fe] font-bold">배정: {formatTime(lead.assigned_at)}</span>
                        </>
                    ) : (
                        <span className="text-[10px] text-slate-400 font-bold italic">수신: {formatTime(lead.assigned_at)}</span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-[#8d8d8d] uppercase tracking-[0.2em] border-b border-[#f4f4f4] pb-2">Journal</p>
                  <div className="max-h-40 overflow-y-auto space-y-2 text-xs">
                    {lead.lead_logs?.map((log: any) => (
                      <div key={log.id} className="flex justify-between p-2 bg-[#f4f4f4]">
                        <span><span className="font-bold text-[#0f62fe] mr-2">[{log.status}]</span>{log.memo}</span>
                        <span className="text-[10px] text-[#a8a8a8]">{formatTime(log.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="w-full md:w-[320px] bg-[#fbfbfb] p-6 flex flex-col justify-center">
                {isAdmin ? (
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold text-[#525252] uppercase tracking-wider">Control</p>
                    <select 
                      className="w-full bg-white border border-[#8d8d8d] p-2.5 text-sm outline-none"
                      onChange={(e) => setSelectedClientId({ ...selectedClientId, [lead.id]: e.target.value })}
                      value={selectedClientId[lead.id] || ''}
                    >
                      <option value="">Select Target</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
                    </select>
                    <button onClick={() => assignLead(lead.id)} className="w-full bg-[#161616] text-white p-2.5 text-xs font-bold">Confirm</button>
                    <button onClick={() => deleteLead(lead.id)} className="w-full border border-[#fa4d56] text-[#fa4d56] p-2 text-xs font-bold hover:bg-[#fff1f1]">Delete</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <select id={`st-${lead.id}`} className="w-full bg-white border border-[#8d8d8d] p-2.5 text-sm outline-none">
                      <option>상담중</option><option>재통화필요</option><option>방문예약</option><option>계약완료</option><option>실패</option>
                    </select>
                    <textarea id={`mm-${lead.id}`} className="w-full bg-white border border-[#8d8d8d] p-2.5 text-xs h-24 outline-none resize-none" placeholder="Notes..." />
                    <button 
                      onClick={() => {
                        const s = (document.getElementById(`st-${lead.id}`) as any).value
                        const m = (document.getElementById(`mm-${lead.id}`) as any).value
                        addLog(lead.id, s, m);
                        (document.getElementById(`mm-${lead.id}`) as any).value = ''
                      }}
                      className="w-full bg-[#0f62fe] text-white p-2.5 text-sm font-bold"
                    >Save</button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredLeads.length === 0 && (
            <div className="bg-white p-20 text-center text-slate-400 italic">
                검색 결과가 없습니다.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}