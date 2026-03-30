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

  const deleteLead = async (leadId: string) => {
    if (!window.confirm('⚠️ 이 리드를 영구 삭제하시겠습니까?')) return
    await supabase.from('leads').delete().eq('id', leadId)
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

  // --- 배정 로직 수정: 배정 시간(assigned_at) 기록 추가 ---
  const assignLead = async (leadId: string) => {
    const clientId = selectedClientId[leadId]
    if (!clientId) return alert('업체 선택!')
    
    const now = new Date().toISOString();
    
    await supabase.from('leads').update({ 
      client_id: clientId, 
      status: '배정완료',
      assigned_at: now // 배정되는 시점의 시간 기록
    }).eq('id', leadId)
    
    fetchData()
    alert('배정이 완료되었습니다.')
  }

  const addLog = async (leadId: string, status: string, memo: string) => {
    if (!memo) return alert('메모 입력!')
    await supabase.from('lead_logs').insert({ lead_id: leadId, status, memo })
    await supabase.from('leads').update({ status }).eq('id', leadId)
    fetchData()
  }

  // 시간 포맷팅 도우미 함수
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '-';
    return new Date(timeStr).toLocaleString('ko-KR', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f4f4]">
        <div className="bg-white p-10 w-full max-w-md border-t-4 border-[#0f62fe] shadow-sm">
          <h1 className="text-2xl font-light mb-8 italic">CPA Manager <span className="font-bold text-[#0f62fe]">Login</span></h1>
          <input className="w-full bg-[#f4f4f4] border-b border-[#8d8d8d] p-3 mb-4 outline-none" placeholder="ID" onChange={e => setLoginId(e.target.value)} />
          <input className="w-full bg-[#f4f4f4] border-b border-[#8d8d8d] p-3 mb-8 outline-none" type="password" placeholder="PW" onChange={e => setPassword(e.target.value)} />
          <button className="w-full bg-[#0f62fe] text-white p-4 font-bold hover:bg-[#0353e9] transition" onClick={handleLogin}>Log in</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] text-[#161616] font-sans">
      <header className="h-12 bg-[#161616] text-white flex items-center justify-between px-6 sticky top-0 z-50">
        <span className="font-bold tracking-tighter">CPA Management System</span>
        <button onClick={() => setUser(null)} className="text-xs text-[#c6c6c6] hover:text-white transition">Logout</button>
      </header>

      <main className="p-8 max-w-[1200px] mx-auto">
        <h1 className="text-3xl font-light mb-8">{isAdmin ? 'Admin Control Center' : `Workspace: ${user.client_name}`}</h1>

        {/* 대시보드 요약 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-[1px] bg-[#e0e0e0] border border-[#e0e0e0] mb-8 shadow-sm">
            <div className="bg-white p-6">
                <p className="text-[11px] font-bold text-[#525252] uppercase mb-2 tracking-widest">Total Leads</p>
                <p className="text-4xl font-light">{leads.length}</p>
            </div>
            <div className="bg-white p-6">
                <p className="text-[11px] font-bold text-[#525252] uppercase mb-2 tracking-widest text-[#0f62fe]">In Progress</p>
                <p className="text-4xl font-light text-[#0f62fe]">{leads.filter(l => l.status === '상담중').length}</p>
            </div>
            <div className="bg-white p-6">
                <p className="text-[11px] font-bold text-[#525252] uppercase mb-2 tracking-widest text-[#198038]">Closed/Won</p>
                <p className="text-4xl font-light text-[#198038]">{leads.filter(l => l.status === '계약완료').length}</p>
            </div>
            <div className="bg-white p-6">
                <p className="text-[11px] font-bold text-[#525252] uppercase mb-2 tracking-widest text-slate-400">Assignment Rate</p>
                <p className="text-4xl font-light text-slate-400">{leads.length > 0 ? Math.round((leads.filter(l => l.client_id).length / leads.length) * 100) : 0}%</p>
            </div>
        </div>

        {isAdmin && (
          <div className="bg-white p-8 mb-8 border border-[#e0e0e0] shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#0f62fe] mb-6">➕ Create New Lead (Manual)</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <input value={newName} onChange={e => setNewName(e.target.value)} className="bg-[#f4f4f4] border-b border-[#8d8d8d] p-2 text-sm outline-none" placeholder="Name" />
              <input value={newPhone} onChange={e => setNewPhone(e.target.value)} className="bg-[#f4f4f4] border-b border-[#8d8d8d] p-2 text-sm outline-none" placeholder="Phone" />
              <input value={newMemo} onChange={e => setNewMemo(e.target.value)} className="bg-[#f4f4f4] border-b border-[#8d8d8d] p-2 text-sm outline-none" placeholder="Memo" />
              <button onClick={handleAddLead} className="bg-[#0f62fe] text-white p-2.5 text-sm font-bold hover:bg-[#0353e9]">Register</button>
            </div>
          </div>
        )}

        <div className="space-y-[1px] bg-[#e0e0e0] border border-[#e0e0e0] shadow-sm">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-white p-0 flex flex-col md:flex-row hover:bg-[#fbfbfb] transition border-l-4 border-[#0f62fe]">
              <div className="flex-1 p-6 border-r border-[#e0e0e0]">
                <div className="flex items-center gap-3 mb-6">
                  <span className={`text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest ${lead.client_id ? 'bg-[#e5f6ff] text-[#0043ce]' : 'bg-[#fff1f1] text-[#a2191f]'}`}>{lead.status}</span>
                  <h3 className="text-2xl font-light">{lead.customer_name} | {lead.phone_number}</h3>
                  
                  {/* --- 시간 표기 로직 수정 --- */}
                  <div className="ml-auto flex flex-col items-end gap-1">
                    {isAdmin ? (
                        <>
                            <span className="text-[10px] text-slate-400 font-bold">인입: {formatTime(lead.created_at)}</span>
                            <span className="text-[10px] text-[#0f62fe] font-bold">배정: {formatTime(lead.assigned_at)}</span>
                        </>
                    ) : (
                        // 고객사 화면에는 배정된 시간을 인입시간인 것처럼 보여줌
                        <span className="text-[10px] text-slate-400 font-bold italic">수신: {formatTime(lead.assigned_at)}</span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-[#8d8d8d] uppercase tracking-[0.2em] border-b border-[#f4f4f4] pb-2">Consultation Journal</p>
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-2 text-xs">
                    {lead.lead_logs?.map((log: any) => (
                      <div key={log.id} className="flex justify-between p-2 bg-[#f4f4f4] border-l-2 border-[#8d8d8d]">
                        <span className="text-[#161616]"><span className="font-bold text-[#0f62fe] mr-2">[{log.status}]</span>{log.memo}</span>
                        <span className="text-[10px] text-[#a8a8a8]">{formatTime(log.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="w-full md:w-[320px] bg-[#fbfbfb] p-6 border-l border-[#e0e0e0] flex flex-col justify-center">
                {isAdmin ? (
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold text-[#525252] uppercase tracking-wider">Lead Assignment</p>
                    <select 
                      className="w-full bg-white border border-[#8d8d8d] p-2.5 text-sm outline-none"
                      onChange={(e) => setSelectedClientId({ ...selectedClientId, [lead.id]: e.target.value })}
                      value={selectedClientId[lead.id] || ''}
                    >
                      <option value="">Select Target Client</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
                    </select>
                    <button onClick={() => assignLead(lead.id)} className="w-full bg-[#161616] text-white p-2.5 text-xs font-bold hover:bg-black transition">Confirm Assignment</button>
                    <button onClick={() => deleteLead(lead.id)} className="w-full border border-[#fa4d56] text-[#fa4d56] p-2 text-xs font-bold hover:bg-[#fff1f1] transition">Delete</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <select id={`st-${lead.id}`} className="w-full bg-white border border-[#8d8d8d] p-2.5 text-sm outline-none">
                      <option>상담중</option><option>재통화필요</option><option>부재중</option><option>방문예약</option><option>계약완료</option><option>실패(종료)</option>
                    </select>
                    <textarea id={`mm-${lead.id}`} className="w-full bg-white border border-[#8d8d8d] p-2.5 text-xs h-24 outline-none resize-none" placeholder="Notes..." />
                    <button 
                      onClick={() => {
                        const s = (document.getElementById(`st-${lead.id}`) as any).value
                        const m = (document.getElementById(`mm-${lead.id}`) as any).value
                        addLog(lead.id, s, m);
                        (document.getElementById(`mm-${lead.id}`) as any).value = ''
                      }}
                      className="w-full bg-[#0f62fe] text-white p-2.5 text-sm font-bold hover:bg-[#0353e9]"
                    >Save Record</button>
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