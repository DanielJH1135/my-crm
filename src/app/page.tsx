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

  // --- 배정 회수(Rollback) 함수 ---
  const rollbackLead = async (leadId: string) => {
    if (!window.confirm('배정을 취소하고 미배정 상태로 되돌리시겠습니까?')) return
    const { error } = await supabase.from('leads').update({
      client_id: null,
      assigned_at: null,
      status: '신규'
    }).eq('id', leadId)
    if (!error) fetchData()
  }

  const assignLead = async (leadId: string, clientId: string) => {
    if (!clientId) return
    const now = new Date().toISOString()
    await supabase.from('leads').update({ client_id: clientId, status: '배정완료', assigned_at: now }).eq('id', leadId)
    fetchData()
  }

  const handleBulkAssign = async () => {
    if (!bulkClientId || selectedIds.length === 0) return alert('대상과 업체를 선택하세요.')
    const now = new Date().toISOString()
    await supabase.from('leads').update({ client_id: bulkClientId, status: '배정완료', assigned_at: now }).in('id', selectedIds)
    setSelectedIds([]); setBulkClientId(''); fetchData()
  }

  const deleteLead = async (leadId: string) => {
    if (!window.confirm('영구 삭제하시겠습니까?')) return
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

  const filteredLeads = leads.filter(l => l.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) || l.phone_number.includes(searchTerm))

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f4f4]">
        <div className="bg-white p-10 w-full max-w-md border-t-4 border-[#0f62fe] shadow-sm">
          <h1 className="text-2xl font-light mb-8 italic text-[#161616]">CPA Manager <span className="font-bold text-[#0f62fe]">Login</span></h1>
          <input className="w-full bg-[#f4f4f4] border-b border-[#8d8d8d] p-3 mb-4 outline-none" placeholder="ID" onChange={e => setLoginId(e.target.value)} />
          <input className="w-full bg-[#f4f4f4] border-b border-[#8d8d8d] p-3 mb-8 outline-none" type="password" placeholder="PW" onChange={e => setPassword(e.target.value)} />
          <button className="w-full bg-[#0f62fe] text-white p-4 font-bold hover:bg-[#0353e9]" onClick={handleLogin}>Log in</button>
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
            <div className="flex gap-2">
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-white border border-[#8d8d8d] px-4 py-2 text-sm outline-none focus:border-[#0f62fe] w-64" placeholder="검색..." />
            </div>
        </div>

        {/* 대시보드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-[#e0e0e0] border border-[#e0e0e0] mb-8 shadow-sm">
            <div className="bg-white p-6"><p className="text-[11px] font-bold text-[#525252] mb-1">TOTAL</p><p className="text-4xl font-light">{leads.length}</p></div>
            <div className="bg-white p-6"><p className="text-[11px] font-bold text-[#0f62fe] mb-1 text-[#0f62fe]">TODAY</p><p className="text-4xl font-light text-[#0f62fe]">{leads.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length}</p></div>
            <div className="bg-white p-6"><p className="text-[11px] font-bold text-[#a2191f] mb-1 text-[#a2191f]">PENDING</p><p className="text-4xl font-light text-[#a2191f]">{leads.filter(l => l.status === '상담중').length}</p></div>
            <div className="bg-white p-6"><p className="text-[11px] font-bold text-[#198038] mb-1 text-[#198038]">CLOSED</p><p className="text-4xl font-light text-[#198038]">{leads.filter(l => l.status === '계약완료').length}</p></div>
        </div>

        {/* 벌크 액션 툴바 */}
        {isAdmin && selectedIds.length > 0 && (
          <div className="bg-[#161616] text-white p-4 mb-4 flex items-center justify-between sticky top-12 z-40 shadow-xl">
            <span className="text-sm font-bold text-[#0f62fe]">{selectedIds.length}개 리드 선택됨</span>
            <div className="flex gap-2">
              <select className="bg-[#393939] text-white border-none p-2 text-sm outline-none" value={bulkClientId} onChange={(e) => setBulkClientId(e.target.value)}>
                <option value="">배정 업체 선택</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
              </select>
              <button onClick={handleBulkAssign} className="bg-[#0f62fe] px-6 py-2 text-sm font-bold hover:bg-[#0353e9]">일괄 배정 실행</button>
              <button onClick={() => setSelectedIds([])} className="text-xs px-2 text-[#c6c6c6]">취소</button>
            </div>
          </div>
        )}

        <div className="space-y-[1px] bg-[#e0e0e0] border border-[#e0e0e0]">
          {filteredLeads.map((lead) => (
            <div key={lead.id} className={`bg-white p-0 flex flex-col md:flex-row hover:bg-[#fbfbfb] transition border-l-4 ${selectedIds.includes(lead.id) ? 'border-[#0f62fe] bg-[#f0f7ff]' : 'border-transparent'}`}>
              <div className="flex-1 p-6 flex items-start gap-4">
                {isAdmin && !lead.client_id && (
                  <input type="checkbox" className="mt-2 w-4 h-4" checked={selectedIds.includes(lead.id)} onChange={() => setSelectedIds(prev => prev.includes(lead.id) ? prev.filter(i => i !== lead.id) : [...prev, lead.id])} />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-6">
                    <span className={`text-[10px] px-2 py-0.5 font-bold uppercase ${lead.client_id ? 'bg-[#e5f6ff] text-[#0043ce]' : 'bg-[#fff1f1] text-[#a2191f]'}`}>{lead.status}</span>
                    <h3 className="text-2xl font-light">{lead.customer_name} | {lead.phone_number}</h3>
                    <div className="ml-auto text-right">
                        <span className="text-[10px] text-slate-400 block">인입: {formatTime(lead.created_at)}</span>
                        {lead.assigned_at && <span className="text-[10px] text-[#0f62fe] block font-bold">배정: {formatTime(lead.assigned_at)}</span>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {lead.lead_logs?.slice(0, 2).map((log: any) => (
                      <div key={log.id} className="text-[11px] flex justify-between p-2 bg-[#f4f4f4]">
                        <span><span className="font-bold text-[#0f62fe] mr-2">[{log.status}]</span>{log.memo}</span>
                        <span className="text-[#a8a8a8]">{formatTime(log.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 액션 사이드바 */}
              <div className="w-full md:w-[320px] bg-[#fbfbfb] p-6 border-l border-[#e0e0e0] flex flex-col justify-center">
                {isAdmin ? (
                  <div className="space-y-3">
                    {lead.client_id ? (
                      <div className="bg-white border border-[#e0e0e0] p-4 shadow-sm text-center">
                        <p className="text-[10px] text-[#525252] font-bold mb-1 uppercase tracking-widest">Assignee</p>
                        <p className="text-sm font-bold text-[#0043ce] mb-4">{clients.find(c => c.id === lead.client_id)?.client_name || '관리자'}</p>
                        <button onClick={() => rollbackLead(lead.id)} className="w-full border border-[#0f62fe] text-[#0f62fe] p-2 text-[10px] font-bold hover:bg-[#e5f6ff] transition">Rollback (배정 회수)</button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold text-[#525252] uppercase tracking-wider">New Assignment</p>
                        <select className="w-full bg-white border border-[#8d8d8d] p-2 text-sm outline-none" onChange={(e) => assignLead(lead.id, e.target.value)} value="">
                          <option value="">업체 선택...</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
                        </select>
                      </div>
                    )}
                    <button onClick={() => deleteLead(lead.id)} className="w-full text-[#fa4d56] p-1 text-[10px] hover:underline transition">Delete Lead</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <select id={`st-${lead.id}`} className="w-full bg-white border border-[#8d8d8d] p-2 text-sm outline-none focus:border-[#0f62fe]">
                      <option>상담중</option><option>재통화필요</option><option>방문예약</option><option>계약완료</option><option>실패</option>
                    </select>
                    <textarea id={`mm-${lead.id}`} className="w-full bg-white border border-[#8d8d8d] p-2 text-xs h-16 outline-none resize-none focus:border-[#0f62fe]" placeholder="상담 내용을 입력하세요..." />
                    <button onClick={() => {
                      const s = (document.getElementById(`st-${lead.id}`) as any).value
                      const m = (document.getElementById(`mm-${lead.id}`) as any).value
                      addLog(lead.id, s, m); (document.getElementById(`mm-${lead.id}`) as any).value = ''
                    }} className="w-full bg-[#0f62fe] text-white p-2 text-sm font-bold hover:bg-[#0353e9] transition">Save Record</button>
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