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

  // 신규 리드 추가를 위한 입력 상태
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newMemo, setNewMemo] = useState('')

  const handleLogin = async () => {
    if (loginId === 'admin' && password === '1234') {
      setUser({ client_name: '총괄 관리자' })
      setIsAdmin(true)
      return
    }
    const { data } = await supabase.from('clients').select('*').eq('login_id', loginId).eq('password', password).single()
    if (data) { setUser(data); setIsAdmin(false); } 
    else { alert('인증 실패'); }
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

  // 어드민 전용: 수동 리드 추가 함수
  const handleAddLead = async () => {
    if (!newName || !newPhone) return alert('이름과 연락처는 필수입니다.')
    
    // 아까 만든 /api/leads를 통해 저장하면 텔레그램 알림까지 동시에 갑니다!
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_name: newName, phone_number: newPhone, memo: newMemo })
    })

    if (res.ok) {
      alert('신규 리드가 등록되었습니다.')
      setNewName(''); setNewPhone(''); setNewMemo('')
      fetchData()
    }
  }

  const assignLead = async (leadId: string) => {
    const clientId = selectedClientId[leadId]
    if (!clientId) return alert('업체를 선택해주세요.')
    await supabase.from('leads').update({ client_id: clientId, status: '배정완료' }).eq('id', leadId)
    fetchData()
    alert('배정 완료')
  }

  const addLog = async (leadId: string, status: string, memo: string) => {
    if (!memo) return alert('메모를 입력하세요')
    await supabase.from('lead_logs').insert({ lead_id: leadId, status, memo })
    await supabase.from('leads').update({ status }).eq('id', leadId)
    fetchData()
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f4f4] font-sans">
        <div className="bg-white p-10 w-full max-w-md border-t-4 border-[#0f62fe] shadow-sm">
          <h1 className="text-2xl font-light text-[#161616] mb-8 italic">IBM <span className="font-bold">CRM Login</span></h1>
          <div className="space-y-4">
            <input className="w-full bg-[#f4f4f4] border-b border-[#8d8d8d] p-3 focus:outline-none" placeholder="User ID" onChange={e => setLoginId(e.target.value)} />
            <input className="w-full bg-[#f4f4f4] border-b border-[#8d8d8d] p-3 focus:outline-none" type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
            <button className="w-full bg-[#0f62fe] text-white p-4 text-sm font-medium hover:bg-[#0353e9]" onClick={handleLogin}>Log in</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] text-[#161616] font-sans">
      <header className="h-12 bg-[#161616] text-white flex items-center justify-between px-6 sticky top-0 z-50">
        <span className="font-bold">IBM <span className="font-light text-[#c6c6c6]">CRM System</span></span>
        <button onClick={() => setUser(null)} className="text-xs text-[#c6c6c6] hover:text-white">Log out</button>
      </header>

      <main className="p-8 max-w-[1200px] mx-auto">
        <h1 className="text-3xl font-light mb-8">{isAdmin ? 'Admin Control Center' : `Workspace: ${user.client_name}`}</h1>

        {/* --- 어드민 전용: 리드 직접 추가 섹션 --- */}
        {isAdmin && (
          <div className="bg-white p-8 mb-8 border border-[#e0e0e0] shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#0f62fe] mb-6">➕ Create New Lead (Manual)</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="text-[11px] text-[#525252] block mb-2 font-bold">CUSTOMER NAME</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-[#f4f4f4] border-b border-[#8d8d8d] p-2 text-sm focus:border-[#0f62fe] outline-none" placeholder="Ex: 홍길동" />
              </div>
              <div>
                <label className="text-[11px] text-[#525252] block mb-2 font-bold">PHONE NUMBER</label>
                <input value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full bg-[#f4f4f4] border-b border-[#8d8d8d] p-2 text-sm focus:border-[#0f62fe] outline-none" placeholder="010-0000-0000" />
              </div>
              <div>
                <label className="text-[11px] text-[#525252] block mb-2 font-bold">INITIAL MEMO</label>
                <input value={newMemo} onChange={e => setNewMemo(e.target.value)} className="w-full bg-[#f4f4f4] border-b border-[#8d8d8d] p-2 text-sm focus:border-[#0f62fe] outline-none" placeholder="Any details..." />
              </div>
              <button onClick={handleAddLead} className="bg-[#0f62fe] text-white p-2.5 text-sm font-bold hover:bg-[#0353e9] transition shadow-md">
                Register Lead
              </button>
            </div>
          </div>
        )}

        {/* 리드 리스트 */}
        <div className="space-y-[1px] bg-[#e0e0e0] border border-[#e0e0e0]">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-white p-0 flex flex-col md:flex-row hover:bg-[#fbfbfb] transition">
              <div className="flex-1 p-6 border-r border-[#e0e0e0]">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-[10px] px-2 py-0.5 font-bold uppercase ${lead.client_id ? 'bg-[#e5f6ff] text-[#0043ce]' : 'bg-[#fff1f1] text-[#a2191f]'}`}>
                    {lead.status}
                  </span>
                  <h3 className="text-xl font-light">{lead.customer_name}</h3>
                  <span className="text-sm text-[#525252]">{lead.phone_number}</span>
                </div>
                <div className="space-y-1">
                  {lead.lead_logs?.map((log: any) => (
                    <div key={log.id} className="text-xs flex gap-3 py-1 border-b border-[#f4f4f4]">
                      <span className="font-bold text-[#0f62fe] min-w-[70px]">[{log.status}]</span>
                      <span className="text-[#525252]">{log.memo}</span>
                      <span className="text-[#a8a8a8] ml-auto">{new Date(log.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full md:w-[350px] bg-[#fbfbfb] p-6">
                {isAdmin ? (
                  <div className="space-y-4">
                    <p className="text-[11px] font-bold text-[#525252] uppercase">Assign to Client</p>
                    <div className="flex gap-2">
                      <select 
                        className="flex-1 bg-white border border-[#8d8d8d] p-2 text-sm outline-none"
                        onChange={(e) => setSelectedClientId({ ...selectedClientId, [lead.id]: e.target.value })}
                        value={selectedClientId[lead.id] || ''}
                      >
                        <option value="">Select Client</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
                      </select>
                      <button onClick={() => assignLead(lead.id)} className="bg-[#161616] text-white px-4 py-2 text-xs font-bold hover:bg-black transition">Confirm</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <select id={`st-${lead.id}`} className="w-full bg-white border border-[#8d8d8d] p-2 text-sm">
                      <option>상담중</option><option>재통화필요</option><option>방문예약</option><option>계약완료</option><option>실패</option>
                    </select>
                    <textarea id={`mm-${lead.id}`} className="w-full bg-white border border-[#8d8d8d] p-2 text-xs h-16 outline-none" placeholder="Enter notes..." />
                    <button 
                      onClick={() => {
                        const s = (document.getElementById(`st-${lead.id}`) as any).value
                        const m = (document.getElementById(`mm-${lead.id}`) as any).value
                        addLog(lead.id, s, m);
                        (document.getElementById(`mm-${lead.id}`) as any).value = ''
                      }}
                      className="w-full bg-[#0f62fe] text-white p-2 text-sm font-bold hover:bg-[#0353e9]"
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