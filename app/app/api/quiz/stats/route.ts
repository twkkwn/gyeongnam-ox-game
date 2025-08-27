export const runtime = 'nodejs'
export const dynamic = 'force-dynamic' // no cache

import { NextResponse } from 'next/server'
import { getSheets } from '../../../lib/sheets'

type Row = [string,string,string,string,string,string,string,string,string,string,string]
// A..K: timestamp_utc, date_kst, event_type, session_id, question_id, correct_10, result, ua, platform, vw, vh

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const start = searchParams.get('start') // 'YYYY-MM-DD'
    const end   = searchParams.get('end')   // 'YYYY-MM-DD'
    if (!start || !end) {
      return NextResponse.json({ ok:false, error:'start/end required (YYYY-MM-DD)' }, { status:400 })
    }

    const sheets = getSheets()
    const spreadsheetId = process.env.SPREADSHEET_ID!
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'events!A:K' })
    const rows: Row[] = (res.data.values ?? []).slice(1) as string[][] as Row[]

    // 범위 필터 (date_kst 컬럼)
    const inRange = rows.filter(r => r[1] >= start && r[1] <= end)

    // 집계 컨테이너
    type Day = {
      date: string
      participants: number
      served: Record<number, number>
      answers: Record<number, { correct: number; wrong: number; total: number; rateCorrect: number; rateWrong: number }>
      success: number
      failure: number
    }
    const days = new Map<string, Day>()
    const uniqSessionAll = new Set<string>()
    const servedAll: Record<number, number> = {}
    const ansAll: Record<number, { correct: number; total: number }> = {}
    let successAll = 0, failureAll = 0

    function getDay(d: string): Day {
      if (!days.has(d)) days.set(d, {
        date: d, participants: 0, served: {}, answers: {}, success: 0, failure: 0
      })
      return days.get(d)!
    }

    // 데일리 참여자(고유 세션): 날짜별 set으로 계산
    const daySessionSet = new Map<string, Set<string>>()

    for (const r of inRange) {
      const date = r[1]
      const event = r[2]
      const session = r[3]
      const qid = Number(r[4]) || undefined
      const correct10 = r[5] === '1'
      const result = r[6] as 'success' | 'failure' | ''

      // day bucket
      const d = getDay(date)

      // 1) 데일리 참여자: event=start 기준 고유 세션
      if (event === 'start') {
        if (!daySessionSet.has(date)) daySessionSet.set(date, new Set())
        daySessionSet.get(date)!.add(session)
        uniqSessionAll.add(session)
      }

      // 2) 문항별 출제 횟수(데일리/전체): event=served
      if (event === 'served' && qid) {
        d.served[qid] = (d.served[qid] || 0) + 1
        servedAll[qid] = (servedAll[qid] || 0) + 1
      }

      // 3) 문항별 정/오답(데일리/전체): event=answer
      if (event === 'answer' && qid) {
        if (!d.answers[qid]) d.answers[qid] = { correct: 0, wrong: 0, total: 0, rateCorrect: 0, rateWrong: 0 }
        d.answers[qid].total += 1
        if (correct10) d.answers[qid].correct += 1
        else d.answers[qid].wrong += 1

        if (!ansAll[qid]) ansAll[qid] = { correct: 0, total: 0 }
        ansAll[qid].total += 1
        if (correct10) ansAll[qid].correct += 1
      }

      // 4) 성공/실패(데일리/전체): event=finish
      if (event === 'finish') {
        if (result === 'success') { d.success += 1; successAll += 1 }
        else if (result === 'failure') { d.failure += 1; failureAll += 1 }
      }
    }

    // 데일리 participants 반영 + 정답률 계산
    for (const [date, set] of daySessionSet) {
      const d = days.get(date)!
      d.participants = set.size
      for (const qidStr of Object.keys(d.answers)) {
        const q = d.answers[Number(qidStr)]
        q.rateCorrect = q.total ? q.correct / q.total : 0
        q.rateWrong = 1 - q.rateCorrect
      }
    }

    // 전체 통계
    const overall = {
      participants: uniqSessionAll.size,
      served: servedAll,
      answers: Object.fromEntries(
        Object.entries(ansAll).map(([qid, v]) => [
          Number(qid),
          {
            correct: v.correct,
            wrong: v.total - v.correct,
            total: v.total,
            rateCorrect: v.total ? v.correct / v.total : 0,
            rateWrong: v.total ? 1 - v.correct / v.total : 0,
          },
        ])
      ),
      success: successAll,
      failure: failureAll,
    }

    // 날짜 오름차순 배열
    const daily = Array.from(days.values()).sort((a,b)=> a.date.localeCompare(b.date))

    return NextResponse.json({ ok:true, range:{ start, end }, daily, overall })
  } catch (e:unknown) {
    console.error(e);
    const message = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json({ ok:false, error: message }, { status:500 })
  }
}
