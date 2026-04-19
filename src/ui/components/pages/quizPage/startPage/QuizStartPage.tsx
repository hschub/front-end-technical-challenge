import type { Quiz } from "@/types";
import { PageLayout } from "@/ui/components/layouts/PageLayout";
import { Heading } from "@/ui/components/common/Heading";
import { Button } from "@/ui/components/common/Button";
import { Markdown } from "@/ui/components/common/Markdown";
import styles from "./QuizStartPage.module.css";

export type QuizStartPageProps = {
  quiz: Quiz;
  onStart: () => void;
  isResuming: boolean;
};

export function QuizStartPage(props: QuizStartPageProps) {
  const { quiz, onStart, isResuming } = props;

  return (
    <PageLayout>
      <main>
        <Heading>{quiz.name}</Heading>

        <div className={styles.content}>
          <Markdown>{quiz.description}</Markdown>
        </div>

        <div>
          <Button onClick={onStart}>
            {isResuming ? "Resume Quiz" : "Start Quiz"}
          </Button>
        </div>
      </main>
    </PageLayout>
  );
}
