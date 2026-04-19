import React from "react";
import type { QuizState } from "@/types";
import * as LocalStorageAPI from "@/api/localStorageAPI";
import { useQuizState } from "@/ui/hooks/useQuizState";
import { QuizStartPage } from "./startPage/QuizStartPage";
import { QuizResultsPage } from "./resultsPage/QuizResultsPage";
import { QuizQuestionPage } from "./questionPage/QuizQuestionPage";

export type QuizPageProps = {
  quizState: QuizState;
};

export function QuizPage(props: QuizPageProps) {
  const { quizState } = props;
  const { state, handleEvent } = useQuizState({ quizState });

  // Save the current state
  React.useEffect(() => {
    if (state.page.kind === "QuestionPage") {
      LocalStorageAPI.saveQuizState(state);
    }
  }, [state]);

  switch (state.page.kind) {
    case "StartPage": {
      return (
        <QuizStartPage
          quiz={state.quiz}
          onStart={() => {
            handleEvent({ kind: "StartQuiz" });
          }}
        />
      );
    }
    case "ResultsPage": {
      return (
        <QuizResultsPage
          quiz={state.quiz}
          totalMarks={state.page.totalMarks}
          marks={state.page.marks}
          onRepeatQuiz={() => {
            handleEvent({ kind: "RepeatQuiz" });
          }}
        />
      );
    }
    case "QuestionPage": {
      const { questionIndex } = state.page;
      const question = state.quiz.questions[questionIndex];
      const questionState = state.questionStates[questionIndex];
      const itemCount = state.quiz.questions.length;
      return (
        <QuizQuestionPage
          questionIndex={questionIndex}
          questionCount={itemCount}
          question={question}
          questionState={questionState}
          onEvent={handleEvent}
        />
      );
    }
  }
}
