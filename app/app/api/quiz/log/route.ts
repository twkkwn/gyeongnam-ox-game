export const runtime = 'nodejs'
export const dynamic = 'force-dynamic' // no cache

import { NextResponse } from 'next/server'
import { getSheets } from '../../../lib/sheets' // 상대경로 주의

type Body = {
  eventType: 'start' | 'served' | 'answer' | 'finish'
  sessionId: string
  questionId?: number            // served/answer 때 사용
  correct?: boolean              // answer 때 사용
  result?: 'success' | 'failure' // finish 때 사용
  meta?: { userAgent?: string; platform?: string; vw?: number; vh?: number }
}

function todayKST(): string {
  // YYYY-MM-DD (KST, 데일리 집계 기준)
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date())
}

export async function POST(req: Request) {
  try {
    const { eventType, sessionId, questionId, correct, result, meta }: Body = await req.json()
    if (!eventType || !sessionId) {
      return NextResponse.json({ ok: false, error: 'eventType/sessionId required' }, { status: 400 })
    }
    if (eventType === 'answer' && typeof correct !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'correct required for answer' }, { status: 400 })
    }
    if (eventType === 'finish' && !result) {
      return NextResponse.json({ ok: false, error: 'result required for finish' }, { status: 400 })
    }

    const sheets = getSheets()
    const spreadsheetId = process.env.SPREADSHEET_ID!
    const values = [[
      new Date().toISOString(),   // A timestamp_utc
      todayKST(),                 // B date_kst
      eventType,                  // C event_type
      sessionId,                  // D session_id
      questionId ?? '',           // E question_id
      typeof correct === 'boolean' ? (correct ? 1 : 0) : '', // F correct_10
      result ?? '',               // G result
      meta?.userAgent ?? '',      // H ua
      meta?.platform ?? '',       // I platform
      meta?.vw ?? '',             // J vw
      meta?.vh ?? '',             // K vh
    ]]

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'events!A:K',
      valueInputOption: 'RAW',
      requestBody: { values },
    })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
      console.error(e);
      const message = e instanceof Error ? e.message : 'unknown';
      return NextResponse.json({ ok:false, error: message }, { status:500 });
    }
}
