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

  const assignLead = async (leadId: string) => {
    const clientId = selectedClientId[leadId]
    if (!clientId) return alert('업체 선택!')
    await supabase.from('leads').update({ client_id: clientId, status: '배정완료' }).eq('id', leadId)
    fetchData()
  }

  const addLog = async (leadId: string, status: string, memo: string) => {
    if (!memo) return alert('메모 입력!')
    await supabase.from('lead_logs').insert({ lead_id: leadId, status, memo })
    await supabase.from('leads').update({ status }).eq('id', leadId)
    fetchData()
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f4f4]">
        <div className="bg-white p-10 w-full max-w-md border-t-4 border-[#0f62fe] shadow-sm">
          <h1 className="text-2xl font-light mb-8 italic">IBM <span className="font-bold">CRM Login</span></h1>
          <input className="w-full bg-[#f4f4f4] border-b border-[#8d8d8d] p-3 mb-4 outline-none" placeholder="ID" onChange={e => setLoginId(e.target.value)} />
          <input className="w-full bg-[#f4f4f4] border-b border-[#8d8d8d] p-3 mb-8 outline-none" type="password" placeholder="PW" onChange={e => setPassword(e.target.value)} />
          <button className="w-full bg-[#0f62fe] text-white p-4 font-bold" onClick={handleLogin}>Log in</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] text-[#161616]">
      <header className="h-12 bg-[#161616] text-white flex items-center justify-between px-6 sticky top-0 z-50">
        <span className="font-bold tracking-tighter">IBM CRM</span>
        <button onClick={() => setUser(null)} className="text-xs text-[#c6c6c6]">Logout</button>
      </header>

      <main className="p-8 max-w-[1200px] mx-auto">
        <h1 className="text-3xl font-light mb-8">{isAdmin ? 'Admin Center' : 'Dashboard'}</h1>

        {isAdmin && (
          <div className="bg-white p-8 mb-8 border border-[#e0e0e0]">
            <h2 className="text-xs font-bold text-[#0f62fe] mb-6 uppercase">➕ Register New Lead</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <input value={newName} onChange={e => setNewName(e.target.value)} className="bg-[#f4f4f4] border-b border-[#8d8d8d] p-2 text-sm outline-none" placeholder="Name" />
              <input value={newPhone} onChange={e => setNewPhone(e.target.value)} className="bg-[#f4f4f4] border-b border-[#8d8d8d] p-2 text-sm outline-none" placeholder="Phone" />
              <input value={newMemo} onChange={e => setNewMemo(e.target.value)} className="bg-[#f4f4f4] border-b border-[#8d8d8d] p-2 text-sm outline-none" placeholder="Memo" />
              <button onClick={handleAddLead} className="bg-[#0f62fe] text-white p-2.5 text-sm font-bold">Register</button>
            </div>
          </div>
        )}

        <div className="space-y-[1px] bg-[#e0e0e0] border border-[#e0e0e0]">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-white p-0 flex flex-col md:flex-row border-l-4 border-[#0f62fe]">
              <div className="flex-1 p-6 border-r border-[#e0e0e0]">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-[10px] px-2 py-0.5 font-bold uppercase ${lead.client_id ? 'bg-[#e5f6ff] text-[#0043ce]' : 'bg-[#fff1f1] text-[#a2191f]'}`}>{lead.status}</span>
                  <h3 className="text-xl font-light">{lead.customer_name} | {lead.phone_number}</h3>
                </div>
                <div className="space-y-1">
                  {lead.lead_logs?.map((log: any) => (
                    <div key={log.id} className="text-xs flex gap-3 py-1 border-b border-[#f4f4f4]">
                      <span className="font-bold text-[#0f62fe]">[{log.status}]</span>
                      <span className="text-[#525252]">{log.memo}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full md:w-[300px] bg-[#fbfbfb] p-6 flex flex-col justify-center">
                {isAdmin ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-[#525252] uppercase">Control</p>
                    <select 
                      className="w-full bg-white border border-[#8d8d8d] p-2 text-sm outline-none"
                      onChange={(e) => setSelectedClientId({ ...selectedClientId, [lead.id]: e.target.value })}
                      value={selectedClientId[lead.id] || ''}
                    >
                      <option value="">Select Client</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
                    </select>
                    <button onClick={() => assignLead(lead.id)} className="w-full bg-[#161616] text-white p-2 text-xs font-bold hover:bg-black transition">Confirm</button>
                    {/* 삭제 버튼 추가 */}
                    <button 
                      onClick={() => deleteLead(lead.id)}
                      className="w-full border border-[#fa4d56] text-[#fa4d56] p-2 text-xs font-bold hover:bg-[#fff1f1] transition"
                    >Delete Lead</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <select id={`st-${lead.id}`} className="w-full bg-white border border-[#8d8d8d] p-2 text-sm outline-none">
                      <option>상담중</option><option>재통화필요</option><option>방문예약</option><option>계약완료</option><option>실패</option>
                    </select>
                    <textarea id={`mm-${lead.id}`} className="w-full bg-white border border-[#8d8d8d] p-2 text-xs h-16 outline-none resize-none" placeholder="Notes..." />
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