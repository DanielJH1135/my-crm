import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { customer_name, phone_number, memo } = body

    // 1. Supabase DB에 저장
    const { data, error } = await supabase
      .from('leads')
      .insert({ customer_name, phone_number, status: '신규' })
      .select()
      .single()

    if (error) throw error

    // 2. 텔레그램 알림 발송
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID
    
    const message = `
🚀 [신규 리드 도착]
-----------------------
👤 고객명: ${customer_name}
📞 연락처: ${phone_number}
📝 메모: ${memo || '없음'}
-----------------------
지금 바로 배정 센터에서 확인하세요!
`
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: message })
    })

    return NextResponse.json({ success: true, lead: data })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}