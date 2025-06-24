import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing id', id }, { status: 400 })
  }
  const now = new Date(); // Get Date object
  console.log("Raw Date object in API:", now);
  const nowISO = now.toISOString()
  console.log("Timestamp being sent to Supabase for 'inicio':", nowISO);
  const { error } = await supabase.from('puntos_agenda').update({ estado: 'EN_CURSO', inicio: nowISO }).eq('id', id)
  if (error) {
    return NextResponse.json({ success: false, error: error.message, id }, { status: 500 })
  }
  return NextResponse.json({ success: true, id })
} 