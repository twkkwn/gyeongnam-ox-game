'use client'
import { useEffect, useRef, useState } from 'react'
import Screen from './components/Screen'
import { ALL_QUESTIONS } from './data/questions'
import { saveScreenAsImage } from './lib/screenshot'

// 퍼센트 기반 Hotspot 좌표(1152×2048 기준) — iOS/Android 동일 결과
const HS = {
  start: { left: 35, top: 46, width: 31, height: 13 },
  options: [
    { left: 10, width: 81, top: 46, height: 7 },
    { left: 10, width: 81, top: 55, height: 6 },
    { left: 10, width: 81, top: 63, height: 7 },
    { left: 10, width: 81, top: 72, height: 6 },
  ],
  next:   { left: 23, top: 82, width: 55, height: 5 },
  successSave: { left: 23,  top: 72, width: 54, height: 5 },
  successHome: { left: 23,  top: 78, width: 54, height: 5 },
  failureHome: { left: 23,  top: 74, width: 54, height: 6 },
} as const

type Rect = {left:number; top:number; width:number; height:number}
function pct({ left, top, width, height }: Rect) {
  return { left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` } as React.CSSProperties
}

// 접근성/중복탭 방지 유틸
function useTapLock() {
  const [locked, setLocked] = useState(false)
  const tap = (fn: () => void) => () => {
    if (locked) return
    setLocked(true)
    try { fn(); if (navigator?.vibrate) navigator.vibrate(10) } finally {
      setTimeout(() => setLocked(false), 250)
    }
  }
  return tap
}

// 키보드 진입 대비
function withKeyboard(onActivate: () => void) {
  return (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate() }
  }
}

type Mode = 'main' | 'quiz' | 'answer' | 'success' | 'failure'
type Picked = { id: 1|2|3|4|5|6; correctIndex: 1|2|3|4; image: string; answerImageO: string; answerImageX: string }

// const SUCCESS_BG = 'linear-gradient(to bottom, #fafeff, #61b8e7)'
const SUCCESS_BG = '#ffffff'
const FAILURE_BG = '#ffffff'

// 1) 세션 ID
function getSessionId() {
  const k = 'quiz_session_id'
  let s = localStorage.getItem(k)
  if (!s) { s = (crypto?.randomUUID?.() ?? String(Date.now() + Math.random())); localStorage.setItem(k, s) }
  return s
}

// 2) 로거 (서버로 fire-and-forget)
async function logEvent(p: {
  type: 'start' | 'served' | 'answer' | 'finish'
  questionId?: number
  correct?: boolean
  result?: 'success' | 'failure'
}) {
  const meta = { userAgent: navigator.userAgent, platform: navigator.platform, vw: innerWidth, vh: innerHeight }
  const sessionId = getSessionId()
  fetch('/api/quiz/log', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({
      eventType: p.type, sessionId,
      questionId: p.questionId, correct: p.correct, result: p.result, meta
    }),
  }).catch(()=>{})
}

export default function Page() {
  const [mode, setMode] = useState<Mode>('main')
  const [picked, setPicked] = useState<Picked[]>([])
  const [i, setI] = useState(0)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [score, setScore] = useState(0)
  const tap = useTapLock()
  const servedSetRef = useRef<Set<number>>(new Set()) // 문제 served 중복 방지용

  // 이미지 프리로드
  useEffect(() => {
    const imgs = ['/assets/main.jpg', '/assets/success.jpg', '/assets/failure.jpg', ...ALL_QUESTIONS.flatMap(q => [q.image, q.answerImageO, q.answerImageX])]
    imgs.forEach(src => { const im = new Image(); im.src = src })
  }, [])
 
  // ✅ 문제 화면이 처음 표시될 때 served 로깅 (조건문 밖 최상위 useEffect)
  useEffect(() => {
    if (mode !== 'quiz' || !picked[i]) return
    const id = picked[i].id
    if (!servedSetRef.current.has(id)) {
      servedSetRef.current.add(id)
      logEvent({ type: 'served', questionId: id })
    }
  }, [mode, i, picked])

    // ✅ 새 라운드 시작 (id 기반 고정 + 풀을 필터링해서 셔플)
  const newRound = tap(() => {
    const fixedId = 1
    const fixed = ALL_QUESTIONS.find(q => q.id === fixedId)
    const pool = ALL_QUESTIONS.filter(q => q.id !== fixedId)
    // Fisher–Yates shuffle
    for (let k = pool.length - 1; k > 0; k--) {
      const r = Math.floor(Math.random() * (k + 1))
      ;[pool[k], pool[r]] = [pool[r], pool[k]]
    }
    const selected = [fixed!, ...pool.slice(0, 2)] as Picked[]
    setPicked(selected)
    setI(0)
    setScore(0)
    setIsCorrect(null)
    servedSetRef.current.clear()
    setMode('quiz')
  })
  // // ✅ 새 라운드 시작
  // const newRound = tap(() => {
  //   const others = ALL_QUESTIONS.slice(1)
  //   for (let k = others.length - 1; k > 0; k--) { const r = Math.floor(Math.random() * (k + 1)); [others[k], others[r]] = [others[r], others[k]] }
  //   const selected = [ALL_QUESTIONS[0], ...others.slice(0, 2)] as Picked[]
  //   setPicked(selected)
  //   setI(0)
  //   setScore(0)
  //   setIsCorrect(null)
  //   servedSetRef.current.clear()   // ✅ 새 라운드 때 출제 기록 초기화
  //   setMode('quiz')
  // })

  // ✅ 메인
  if (mode === 'main') {
    return (
      <Screen image="/assets/main.jpg" hotspots={
        <button
          aria-label="게임 시작"
          className="hotspot__btn"
          style={pct(HS.start)}
          onClick={tap(() => { newRound(); logEvent({ type: 'start' }) })}
          onKeyDown={withKeyboard(newRound)}
        />
      } />
    )
  }

  // 퀴즈
   if (mode === 'quiz') {
     const q = picked[i]
     return (
       <Screen image={q.image} hotspots={
         <div>
           {HS.options.map((rect, idx) => (
             <button
               key={idx}
               aria-label={`보기 ${idx+1}`}
               className="hotspot__btn"
               style={pct(rect)}
               onClick={tap(() => {
                 const ok = (idx + 1) === q.correctIndex
                 logEvent({ type: 'answer', questionId: q.id, correct: ok })
                 setIsCorrect(ok)
                 setScore(s => s + (ok ? 1 : 0))
                 setMode('answer')
               })}
               onKeyDown={withKeyboard(() => {
                 const ok = (idx + 1) === q.correctIndex
                 setIsCorrect(ok)
                 setScore(s => s + (ok ? 1 : 0))
                 setMode('answer')
               })}
             />
           ))}
         </div>
       } />
     )
   }

   // 정답/오답 해설
  if (mode === 'answer') {
    const q = picked[i]
    const img = isCorrect ? q.answerImageO : q.answerImageX
    const goNext = tap(() => {
      if (i < 2) { setI(i + 1); setMode('quiz') }
      else { 
        const isSuccess = score === 3   // (답변 처리 시 score 이미 반영)
        logEvent({ type: 'finish', result: isSuccess ? 'success' : 'failure' })
        setMode(isSuccess ? 'success' : 'failure')
      }
    })

    return (
      <Screen image={img} hotspots={
        <button
          aria-label="다음 문제"
          className="hotspot__btn"
          style={pct(HS.next)}
          onClick={goNext}
          onKeyDown={withKeyboard(goNext)}
        />
      } />
    )
  }

  // 성공
  if (mode === 'success') {
    const doSave = tap(() => saveScreenAsImage())
    return (
      <Screen image="/assets/success.jpg" bg={SUCCESS_BG} hotspots={
        <>
        {/*
          <button
            aria-label="내 앨범으로 저장"
            className="hotspot__btn"
            style={pct(HS.successSave)}
            onClick={doSave}
            onKeyDown={withKeyboard(doSave)}
          />
           <button
            aria-label="메인으로 돌아가기"
            className="hotspot__btn"
            style={pct(HS.successHome)}
            onClick={tap(() => setMode('main'))}
            onKeyDown={withKeyboard(() => setMode('main'))}
          /> */}
        </>
      } />
    )
  }

  // 실패
  const goHome = tap(() => setMode('main'))
  return (
    <Screen image="/assets/failure.jpg" bg={FAILURE_BG} hotspots={
      <button
        aria-label="메인으로 돌아가기"
        className="hotspot__btn"
        style={pct(HS.failureHome)}
        onClick={goHome}
        onKeyDown={withKeyboard(goHome)}
      />
    } />
  )
}