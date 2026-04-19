# System Design — Quiz Resume/Restart
## Atomi Interview Prep | Moving from localStorage to a persistent backend

---

## Current Architecture

- Quiz state lives in `localStorage` under key `"atomi_quiz_state"`
- State includes: full quiz data, current page, all question states (selected answers, results)
- Saved on every question interaction; cleared when quiz completes

**Problems with localStorage:**
1. Not cross-device — student starts on laptop, can't resume on phone
2. Cleared by browser (private mode, storage clear, cache wipe)
3. No audit trail — can't see if a student ever attempted a quiz
4. One quiz at a time — localStorage is overwritten if the user opens two quizzes

---

## The Scenario

**Goal:** allow students to resume partially completed quizzes across different sessions and devices.

This means the server must persist which question the student was on and which answers they gave.

Backend tech: **NestJS + GraphQL + MySQL + Prisma**

---

## Data Model (Prisma schema)

```prisma
model User {
  id        String        @id @default(uuid())
  email     String        @unique
  attempts  QuizAttempt[]
  createdAt DateTime      @default(now())
}

model Quiz {
  id          String        @id @default(uuid())
  title       String
  description String
  questions   Question[]
  attempts    QuizAttempt[]
  createdAt   DateTime      @default(now())
}

model Question {
  id              String           @id @default(uuid())
  quizId          String
  quiz            Quiz             @relation(fields: [quizId], references: [id])
  prompt          String
  explanation     String
  options         QuestionOption[]
  correctOptionId String
  position        Int
  answers         QuestionAnswer[]
}

model QuestionOption {
  id         String   @id @default(uuid())
  questionId String
  question   Question @relation(fields: [questionId], references: [id])
  text       String
  position   Int
}

model QuizAttempt {
  id                   String           @id @default(uuid())
  userId               String
  user                 User             @relation(fields: [userId], references: [id])
  quizId               String
  quiz                 Quiz             @relation(fields: [quizId], references: [id])
  status               AttemptStatus    @default(IN_PROGRESS)
  currentQuestionIndex Int              @default(0)
  answers              QuestionAnswer[]
  startedAt            DateTime         @default(now())
  completedAt          DateTime?
  score                Int?

  @@unique([userId, quizId, status]) // one active attempt per user per quiz
}

model QuestionAnswer {
  id               String      @id @default(uuid())
  attemptId        String
  attempt          QuizAttempt @relation(fields: [attemptId], references: [id])
  questionId       String
  question         Question    @relation(fields: [questionId], references: [id])
  selectedOptionId String
  isCorrect        Boolean
  answeredAt       DateTime    @default(now())

  @@unique([attemptId, questionId]) // one answer per question per attempt
}

enum AttemptStatus {
  IN_PROGRESS
  COMPLETED
  ABANDONED
}
```

---

## GraphQL API Design

### Queries

```graphql
type Query {
  quiz(id: ID!): Quiz
  myAttempt(quizId: ID!): QuizAttempt  # returns in-progress attempt or null
}

type Quiz {
  id: ID!
  title: String!
  description: String!
  questions: [Question!]!
}

type Question {
  id: ID!
  prompt: String!
  explanation: String!
  options: [QuestionOption!]!
  position: Int!
  # correctOptionId is NOT in the schema — never sent to the client
}

type QuizAttempt {
  id: ID!
  status: AttemptStatus!
  currentQuestionIndex: Int!
  answers: [QuestionAnswer!]!
  score: Int
  startedAt: String!
  completedAt: String
}

type QuestionAnswer {
  questionId: ID!
  selectedOptionId: ID!
  isCorrect: Boolean!
}
```

### Mutations

```graphql
type Mutation {
  # Start a new attempt, or return the existing IN_PROGRESS one
  startOrResumeAttempt(quizId: ID!): QuizAttempt!

  # Server validates correctness — client never knows the correct answer
  submitAnswer(attemptId: ID!, questionId: ID!, selectedOptionId: ID!): QuestionAnswer!

  # Update current position (for back/next navigation)
  setCurrentQuestion(attemptId: ID!, questionIndex: Int!): QuizAttempt!

  # Mark complete, calculate score
  completeAttempt(attemptId: ID!): QuizAttempt!

  # Mark current attempt ABANDONED, create a fresh one
  restartAttempt(quizId: ID!): QuizAttempt!
}
```

---

## Key Design Decisions

### 1. Correct answer validation on the server
- The client never receives `correctOptionId`
- `submitAnswer` validates on the server and returns `isCorrect`
- Prevents cheating via browser dev tools / network inspection
- **Trade-off:** adds a round-trip on every answer check (acceptable for a quiz)

### 2. `startOrResumeAttempt` is idempotent
- If an `IN_PROGRESS` attempt exists → return it (resume)
- If not → create a new one (start)
- Client calls the same mutation whether starting or resuming — simplifies client logic

### 3. One active attempt per user per quiz
- Enforced by `@@unique([userId, quizId, status])`
- Prevents ghost attempts accumulating
- User opening quiz on phone and laptop gets the same attempt

### 4. Storing `currentQuestionIndex` explicitly
- Allows resuming to the exact question, even if the user navigated back without answering
- Alternative: derive from last answered question — but this loses position if user went back

### 5. Restart: ABANDONED, not deleted
- Mark current attempt as `ABANDONED` (preserve data for analytics/reporting)
- Create a fresh `IN_PROGRESS` attempt
- Never delete old attempts — losing historical data is unrecoverable

---

## Frontend Migration Strategy

The existing code already has an abstraction layer (`localStorageAPI.ts`, `quizAPI.ts`). Migration steps:

1. Create `apiClient.ts` wrapping Apollo Client (or plain `fetch` for GraphQL)

2. Create `attemptAPI.ts`:
   - `startOrResumeAttempt(quizId)` → calls mutation
   - `submitAnswer(...)` → calls mutation
   - `completeAttempt(attemptId)` → calls mutation
   - `restartAttempt(quizId)` → calls mutation

3. Update `useLoadQuizState`:
   - Call `quiz(id)` query for quiz data
   - Call `myAttempt(quizId)` to check for an existing in-progress attempt
   - If attempt exists → set page to `QuestionPage` at `currentQuestionIndex` (true resume)
   - If not → call `startOrResumeAttempt`, set page to `StartPage`

4. Update `useQuizState` event handlers:
   - `MultipleChoiceQuestionCheckAnswer` → call `submitAnswer` instead of local comparison
   - `FinishQuiz` → call `completeAttempt`
   - `RepeatQuiz` → call `restartAttempt`

5. `localStorage` becomes the offline fallback or is removed entirely

---

## Edge Cases to Discuss

### Multiple tabs open
- Both tabs call `startOrResumeAttempt` → get the same `attemptId`
- Tab A and Tab B both answer Q1 differently
- `@@unique([attemptId, questionId])` means the second write wins (last-write-wins)
- More sophisticated: optimistic locking with a `version` field on `QuizAttempt`
- For a quiz app, last-write-wins is acceptable

### Offline support
- Keep `localStorage` as a write-ahead buffer
- Sync to server when connection restores
- Risk: conflicts if user answered offline on two devices
- For MVP: show "offline" indicator, disable answer submission

### Session expiry
- JWT expires mid-quiz → client gets 401 on `submitAnswer`
- Should prompt re-login, then resume via `myAttempt` query

### Quiz content changes
- A question is edited after a student has started
- Attempt stores `questionId` references, not snapshots
- In-progress attempts will see new question text with old answers
- Mitigation: version quiz content, or lock questions once any attempt exists

### Scale
- Index `QuizAttempt` on `(userId, quizId, status)` for fast resume lookup
- Index `QuestionAnswer` on `(attemptId)` for fast answer loading
- Archive or soft-delete completed attempts after a retention period

---

## Questions to Expect from Interviewers

**"Why GraphQL instead of REST?"**
> GraphQL lets the client request exactly the fields needed. For quiz resume, the client needs nested data (attempt + all answers) in one request — with REST you'd need multiple round-trips or a custom endpoint. GraphQL also gives a typed schema that doubles as documentation.

**"How would you handle authentication?"**
> JWT in an `HttpOnly` cookie (not `localStorage` — XSS resistant). Include `userId` claim. Server extracts `userId` from JWT on every request. Never trust `userId` from the request body.

**"What happens if `submitAnswer` fails mid-quiz?"**
> Show an error state, do not advance the question. The student retries. Since `@@unique([attemptId, questionId])` prevents duplicates, retrying the same answer is safe (idempotent upsert).

**"Should the client or server calculate the score?"**
> Server. The client doesn't know which answers are correct. Score = count of `isCorrect: true` in `QuestionAnswer`. Calculated when `completeAttempt` is called.

**"What if two students finish the same quiz simultaneously?"**
> No issue — attempts are per-user, separate rows. Database transactions handle concurrent writes to the same attempt (same user, multiple tabs) at the row level.

**"What about the existing `correctOptionId` on the frontend `Question` type?"**
> This is actually a security issue in the current codebase — the correct answer is being sent to the client and checked locally. Moving to the backend resolves this: `correctOptionId` never appears in the GraphQL schema.
