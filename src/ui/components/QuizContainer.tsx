import { useLoadQuizState } from "@/ui/hooks/useLoadQuizState";
import { QuizPage } from "./pages/quizPage/QuizPage";
import { LoadingPage } from "./pages/loadingPage/LoadingPage";
import { ErrorPage } from "./pages/errorPage/ErrorPage";

export type QuizContainerProps = {
  quizId: string;
};

export function QuizContainer(props: QuizContainerProps) {
  const { quizId } = props;

  const result = useLoadQuizState({ quizId });

  switch (result.kind) {
    case "Loading": {
      return <LoadingPage />;
    }
    case "Error": {
      return <ErrorPage message={result.error} />;
    }
    case "Success": {
      return <QuizPage quizState={result.quizState} />;
    }
  }
}
