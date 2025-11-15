export type Question = {
  id: 1|2|3|4|5|6
  image: string
  correctIndex: 1|2|3|4
  answerImageO: string
  answerImageX: string
}

export const ALL_QUESTIONS: Question[] = [
  { id: 1, image: '/assets/quiz-1.jpg', correctIndex: 2, answerImageO: '/assets/quiz-1-o.jpg', answerImageX: '/assets/quiz-1-x.jpg' },
  { id: 2, image: '/assets/quiz-2.jpg', correctIndex: 2, answerImageO: '/assets/quiz-2-o.jpg', answerImageX: '/assets/quiz-2-x.jpg' },
  { id: 3, image: '/assets/quiz-3.jpg', correctIndex: 3, answerImageO: '/assets/quiz-3-o.jpg', answerImageX: '/assets/quiz-3-x.jpg' },
  { id: 4, image: '/assets/quiz-4.jpg', correctIndex: 4, answerImageO: '/assets/quiz-4-o.jpg', answerImageX: '/assets/quiz-4-x.jpg' },
  { id: 5, image: '/assets/quiz-5.jpg', correctIndex: 4, answerImageO: '/assets/quiz-5-o.jpg', answerImageX: '/assets/quiz-5-x.jpg' },
  { id: 6, image: '/assets/quiz-6.jpg', correctIndex: 1, answerImageO: '/assets/quiz-6-o.jpg', answerImageX: '/assets/quiz-6-x.jpg' },
]
