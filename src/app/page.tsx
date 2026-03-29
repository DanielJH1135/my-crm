'use client'

import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

// 1. Supabase 연결 설정
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function CarbonLeadSystem() {
  // --- 상태 관리 ---
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [leads, setLeads] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<Record<string, string>>({})

  // --- 로그인 로직 ---
  const handleLogin = async () => {
    // 관리자 하드코딩 (나중에 DB로 옮겨도 됨)
    if (loginId === 'admin' && password === '1234') {
      setUser({ client_name: '총괄 관리자' })
      setIsAdmin(true)
      return
    }

    // 일반 고객사 로그인 (Supabase 조회)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('login_id', loginId)
      .eq('password', password)
      .single()

    if (data) {
      setUser(data)
      setIsAdmin(false)
    } else {
      alert('아이디 또는 비밀번호가 올바르지 않습니다.')
    }
  }

  // --- 데이터 불러오기 ---
  const fetchData = async () => {
    if (!user) return

    // 리드 및 상담 로그 조인해서 가져오기
    let query = supabase
      .from('leads')
      .select('*, lead_logs(*)')
      .order('created_at', { ascending: false })
    
    // 일반 업체라면 본인 것만 필터링
    if (!isAdmin) {
      query = query.eq('client_id', user.id)
    }

    const { data: leadsData, error } = await query
    if (error) console.error("Data fetch error:", error)

    // 어드민일 경우 배정용 업체 목록 로드
    if (isAdmin) {
      const { data: clientsData } = await supabase.from('clients').select('*')
      setClients(clientsData || [])
    }

    setLeads(leadsData || [])
  }

  useEffect(() => {
    fetchData()
  }, [user])

  // --- 리드 배정 로직 (Admin 전용) ---
  const assignLead = async (leadId: string) => {
    const clientId = selectedClientId[leadId]
    if (!clientId) return alert('배정할 업체를 선택해주세요.')

    const { error } = await supabase
      .from('leads')
      .update({ client_id: clientId, status: '배정완료' })
      .eq('id', leadId)

    if (error) {
      alert('배정 중 오류가 발생했습니다.')
    } else {
      alert('성공적으로 배정되었습니다.')
      fetchData()
    }
  }

  // --- 상담 일지 추가 로직 ---
  const addLog = async (leadId: string, status: string, memo: string) => {
    if (!memo.trim()) return alert('상담 내용을 입력해주세요.')

    // 1. 로그 테이블에 추가 (lead_id: leadId 로 타입 에러 해결)
    const { error: logError } = await supabase
      .from('lead_logs')
      .insert({ lead_id: leadId, status, memo })

    // 2. 리드 본체 상태 업데이트
    const { error: leadError } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', leadId)

    if (!logError && !leadError) {
      alert('상담 일지가 저장되었습니다.')
      fetchData()
    } else {
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  // --- UI: 로그인 화면 ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f4f4] font-sans text-[#161616]">
        <div className="bg-white p-10 w-full max-w-md border-t-4 border-[#0f62fe] shadow-md">
          <p className="text-[12px] font-semibold text-[#0f62fe] mb-1">IBM Cloud Pak</p>
          <h2 className="text-3xl font-light mb-8">CRM Login</h2>
          <div className="space-y-6">
            <div>
              <label className="text-[12px] text-[#525252] block mb-2 font-medium">User ID</label>
              <input 
                className="w-full bg-[#f4f4f4] border-b border-[#8d8d8d] p-3 focus:outline-none focus:border-[#0f62fe] transition-all" 
                onChange={e => setLoginId(e.target.value)} 
              />
            </div>
            <div>
              <label className="text-[12px] text-[#525252] block mb-2 font-medium">Password</label>
              <input 
                className="w-full bg-[#f4f4f4] border-b border-[#8d8d8d] p-3 focus:outline-none focus:border-[#0f62fe] transition-all" 
                type="password" 
                onChange={e => setPassword(e.target.value)} 
              />
            </div>
            <button 
              className="w-full bg-[#0f62fe] text-white p-4 text-sm font-semibold hover:bg-[#0353e9] transition shadow-lg" 
              onClick={handleLogin}
            >
              Log in
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- UI: 메인 대시보드 ---
  return (
    <div className="min-h-screen bg-[#f4f4f4] text-[#161616] font-sans pb-20">
      {/* Shell Header */}
      <header className="h-12 bg-[#161616] text-white flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <span className="font-bold tracking-tighter text-lg underline decoration-[#0f62fe] decoration-2">IBM</span>
          <span className="text-sm font-light">Lead Management System</span>
          <div className="h-4 w-[1px] bg-[#393939] mx-2" />
          <span className="text-xs text-[#c6c6c6]">{isAdmin ? 'Administrator' : user.client_name}</span>
        </div>
        <button onClick={() => { setUser(null); setIsAdmin(false); }} className="text-xs text-[#c6c6c6] hover:text-white transition">Log out</button>
      </header>

      <main className="p-8 max-w-[1200px] mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-light mb-4">{isAdmin ? 'Global Administration' : 'Client Operations'}</h1>
          <div className="h-[2px] w-16 bg-[#0f62fe] mb-10" />
          
          {/* Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-[1px] bg-[#e0e0e0] border border-[#e0e0e0]">
            {[
              { label: 'Total Records', value: leads.length },
              { label: 'Unassigned', value: leads.filter(l => !l.client_id).length, color: 'text-[#fa4d56]' },
              { label: 'Active Pipeline', value: leads.filter(l => l.status === '상담중').length, color: 'text-[#0f62fe]' },
              { label: 'Closed/Won', value: leads.filter(l => l.status === '계약완료').length, color: 'text-[#198038]' }
            ].map((s, i) => (
              <div key={i} className="bg-white p-6">
                <p className="text-[11px] font-bold text-[#525252] uppercase mb-2 tracking-widest">{s.label}</p>
                <p className={`text-4xl font-light ${s.color || ''}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Rows */}
        <div className="space-y-4">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-white flex flex-col md:flex-row shadow-sm border-l-4 border-[#0f62fe]">
              {/* Info Area */}
              <div className="flex-1 p-8">
                <div className="flex items-center gap-4 mb-6">
                  <span className={`text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest ${lead.client_id ? 'bg-[#e5f6ff] text-[#0043ce]' : 'bg-[#fff1f1] text-[#a2191f]'}`}>
                    {lead.status}
                  </span>
                  <h3 className="text-2xl font-light">{lead.customer_name}</h3>
                  <span className="text-lg text-[#525252]">{lead.phone_number}</span>
                </div>
                
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-[#8d8d8d] uppercase tracking-[0.2em] border-b border-[#f4f4f4] pb-2">Consultation History</p>
                  <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                    {lead.lead_logs?.length > 0 ? lead.lead_logs.map((log: any) => (
                      <div key={log.id} className="text-sm flex gap-4 p-3 bg-[#f4f4f4] border-l-2 border-[#8d8d8d]">
                        <span className="font-bold text-[#0f62fe] min-w-[80px] text-xs">[{log.status}]</span>
                        <span className="text-[#161616] flex-1">{log.memo}</span>
                        <span className="text-[10px] text-[#a8a8a8]">{new Date(log.created_at).toLocaleDateString()}</span>
                      </div>
                    )) : <p className="text-xs text-[#c6c6c6] italic">No previous logs found.</p>}
                  </div>
                </div>
              </div>

              {/* Action Area */}
              <div className="w-full md:w-[380px] bg-[#fbfbfb] p-8 border-l border-[#e0e0e0] flex flex-col justify-center">
                {isAdmin ? (
                  <div className="space-y-4">
                    <label className="text-[11px] font-bold text-[#525252] uppercase tracking-wider">Lead Assignment</label>
                    <div className="flex flex-col gap-2">
                      <select 
                        className="w-full bg-white border border-[#8d8d8d] p-3 text-sm focus:border-[#0f62fe] outline-none transition-all"
                        value={selectedClientId[lead.id] || ""}
                        onChange={(e) => setSelectedClientId({ ...selectedClientId, [lead.id]: e.target.value })}
                      >
                        <option value="">Select Target Client</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
                      </select>
                      <button 
                        onClick={() => assignLead(lead.id)}
                        className="bg-[#0f62fe] text-white px-4 py-3 text-sm font-bold hover:bg-[#0353e9] transition shadow-md"
                      >
                        Confirm Assignment
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <label className="text-[11px] font-bold text-[#525252] uppercase tracking-wider">Update Status</label>
                    <select id={`st-${lead.id}`} className="w-full bg-white border border-[#8d8d8d] p-3 text-sm outline-none focus:border-[#0f62fe]">
                      <option>상담중</option>
                      <option>재통화필요</option>
                      <option>부재중</option>
                      <option>방문예약</option>
                      <option>계약완료</option>
                      <option>실패(종료)</option>
                    </select>
                    <textarea 
                      id={`mm-${lead.id}`} 
                      className="w-full bg-white border border-[#8d8d8d] p-3 text-sm h-24 outline-none focus:border-[#0f62fe] resize-none" 
                      placeholder="Add detailed notes..." 
                    />
                    <button 
                      onClick={() => {
                        const s = (document.getElementById(`st-${lead.id}`) as any).value
                        const m = (document.getElementById(`mm-${lead.id}`) as any).value
                        addLog(lead.id, s, m);
                        (document.getElementById(`mm-${lead.id}`) as any).value = ''
                      }}
                      className="w-full bg-[#161616] text-white p-3 text-sm font-bold hover:bg-black transition shadow-md"
                    >
                      Save Journal
                    </button>
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