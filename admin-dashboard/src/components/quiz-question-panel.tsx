"use client";

import {
  deleteQuizQuestion,
  loadQuizAttempts,
  loadQuizQuestions,
  publishQuiz,
  saveQuizQuestion,
  type QuizAttemptSummary,
  type QuizQuestionDraft,
} from "@/lib/firebase-quiz-workflows";
import { hasFirebaseConfiguration } from "@/lib/firebase";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSingleFlight } from "@/lib/use-single-flight";
import { toast } from "sonner";
import { getUserFacingErrorMessage } from "../../../shared/user-facing-errors";

type QuestionType = "multiple_choice" | "multiple_select" | "true_false";
const questionTypeLabels: Record<QuestionType, string> = {
  multiple_choice: "Multiple choice",
  multiple_select: "Multiple select",
  true_false: "True / False",
};

export function QuizQuestionPanel({
  quizId,
  quizTitle,
  onClose,
}: {
  quizId: string;
  quizTitle: string;
  onClose: () => void;
}) {
  const [questions, setQuestions] = useState<QuizQuestionDraft[]>([]);
  const [attempts, setAttempts] = useState<QuizAttemptSummary[]>([]);
  const [prompt, setPrompt] = useState("");
  const [explanation, setExplanation] = useState("");
  const [type, setType] = useState<QuestionType>("multiple_choice");
  const [options, setOptions] = useState("\n\n");
  const [correctAnswerIndices, setCorrectAnswerIndices] = useState<number[]>([
    0,
  ]);
  const [marks, setMarks] = useState(1);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const runSingleFlight = useSingleFlight();
  useEffect(() => {
    if (!hasFirebaseConfiguration) return;
    void loadQuizQuestions(quizId)
      .then(loadedQuestions => setQuestions(loadedQuestions))
      .catch(cause =>
        setError(
          getUserFacingErrorMessage(cause, "Could not load saved questions. Please refresh and try again.")
        )
      );
    void loadQuizAttempts(quizId)
      .then(loadedAttempts => setAttempts(loadedAttempts))
      .catch(() => undefined);
  }, [quizId]);
  const visibleOptions =
    type === "true_false"
      ? ["True", "False"]
      : options
          .split("\n")
          .map(value => value.trim())
          .filter(Boolean);
  const changeType = (nextType: QuestionType) => {
    setType(nextType);
    setCorrectAnswerIndices([0]);
    setError("");
  };
  const toggleCorrectAnswer = (index: number) =>
    setCorrectAnswerIndices(current =>
      type === "multiple_select"
        ? current.includes(index)
          ? current.filter(value => value !== index)
          : [...current, index]
        : [index]
    );
  const save = async (): Promise<QuizQuestionDraft | null> => {
    if (!prompt.trim()) {
      setError("Enter the question prompt.");
      return null;
    }
    if (visibleOptions.length < 2) {
      setError("Add at least two answer options.");
      return null;
    }
    const validAnswers = correctAnswerIndices.filter(
      index => index >= 0 && index < visibleOptions.length
    );
    if (!validAnswers.length) {
      setError("Choose at least one correct answer.");
      return null;
    }
    return (
      (await runSingleFlight("quiz-question-save", async () => {
        setSavingQuestion(true);
        const item: QuizQuestionDraft = {
          id: crypto.randomUUID(),
          prompt: prompt.trim(),
          explanation: explanation.trim(),
          type,
          options: visibleOptions,
          correctAnswerIndex: validAnswers[0],
          ...(type === "multiple_select"
            ? { correctAnswerIndices: validAnswers }
            : {}),
          marks: Math.max(1, marks || 1),
          sortOrder: questions.length,
        };
        try {
          if (hasFirebaseConfiguration) await saveQuizQuestion(quizId, item);
          setQuestions(current => [...current, item]);
          toast.success("Quiz question was added successfully.");
        } catch (cause) {
          setError(
            getUserFacingErrorMessage(cause, "Could not save question. Please try again.")
          );
          return null;
        } finally {
          setSavingQuestion(false);
        }
        setPrompt("");
        setExplanation("");
        setOptions("\n\n");
        setCorrectAnswerIndices([0]);
        setMarks(1);
        setError("");
        return item;
      })) ?? null
    );
  };
  const submit = async () => {
    await runSingleFlight("quiz-submit", async () => {
      setSubmitting(true);
      setError("");
      try {
        const pendingPrompt = prompt.trim();
        const pendingQuestion = pendingPrompt ? await save() : null;
        if (pendingPrompt && !pendingQuestion) return;
        const savedQuestions = pendingQuestion
          ? [...questions, pendingQuestion]
          : questions;
        if (!savedQuestions.length) {
          setError("Add at least one question before submitting the quiz.");
          return;
        }
        if (hasFirebaseConfiguration) await publishQuiz(quizId, savedQuestions);
        toast.success("Quiz was published successfully.");
        onClose();
      } catch (cause) {
        setError(
          getUserFacingErrorMessage(cause, "Could not submit quiz. Please try again.")
        );
      } finally {
        setSubmitting(false);
      }
    });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/30 p-4">
      <section className="max-h-[calc(100vh-2rem)] flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-stone-100 p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">
              Quiz builder
            </p>
            <h3 className="mt-1 font-display text-xl font-semibold">
              {quizTitle}
            </h3>
          </div>
          <button
            type="button"
            disabled={submitting || savingQuestion}
            onClick={onClose}
            aria-label="Close quiz builder"
            className="rounded-xl p-2 text-stone-400 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </header>
        {!hasFirebaseConfiguration && (
          <p className="border-b border-amber-100 bg-amber-50 px-6 py-2 text-xs font-semibold text-amber-800">
            Offline-ready mode: connect Firebase in Settings to keep questions
            and results after this panel closes.
          </p>
        )}
        <div className="grid flex-1 gap-6 overflow-y-auto p-6 lg:grid-cols-2">
          <section>
            <h4 className="font-display text-lg font-semibold">Questions</h4>
            <div className="mt-4 space-y-3">
              {questions.length ? (
                questions.map((question, index) => (
                  <article
                    key={question.id}
                    className="rounded-2xl border border-stone-200 p-4"
                  >
                    <div className="flex justify-between gap-3">
                      <p className="text-sm font-semibold">
                        {index + 1}. {question.prompt}
                      </p>
                      <ConfirmDeleteDialog
                        title={`Delete question ${index + 1}?`}
                        description="This permanently removes the question and its answer key."
                        onConfirm={async () => {
                          try {
                            if (hasFirebaseConfiguration)
                              await deleteQuizQuestion(quizId, question.id);
                            setQuestions(current =>
                              current.filter(item => item.id !== question.id)
                            );
                            toast.success("Quiz question was deleted successfully.");
                          } catch (cause) {
                            setError(getUserFacingErrorMessage(cause, "Could not delete question. Please try again."));
                          }
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-stone-500">
                      {questionTypeLabels[question.type ?? "multiple_choice"]} ·{" "}
                      {question.marks} marks · Correct{" "}
                      {question.type === "multiple_select"
                        ? "options"
                        : "option"}{" "}
                      {(
                        question.correctAnswerIndices ?? [
                          question.correctAnswerIndex,
                        ]
                      )
                        .map(value => value + 1)
                        .join(", ")}
                    </p>
                    <SavedExplanation
                      quizId={quizId}
                      question={question}
                      onSaved={updated =>
                        setQuestions(current =>
                          current.map(item =>
                            item.id === updated.id ? updated : item
                          )
                        )
                      }
                    />
                  </article>
                ))
              ) : (
                <p className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-500">
                  Add your first quiz question.
                </p>
              )}
            </div>
          </section>
          <section>
            <h4 className="font-display text-lg font-semibold">Add question</h4>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-stone-700">
                Question type
                <select
                  value={type}
                  onChange={event =>
                    changeType(event.target.value as QuestionType)
                  }
                  className="mt-1 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm"
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="multiple_select">Multiple Select</option>
                  <option value="true_false">True / False</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-stone-700">
                Question prompt
                <input
                  value={prompt}
                  onChange={event => setPrompt(event.target.value)}
                  placeholder="e.g. What is the capital of Myanmar?"
                  className="mt-1 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm"
                />
              </label>
              {type === "true_false" ? (
                <p className="rounded-xl bg-stone-50 p-3 text-sm text-stone-600">
                  Options: True and False
                </p>
              ) : (
                <label className="block text-sm font-medium text-stone-700">
                  Answer options
                  <textarea
                    value={options}
                    onChange={event => setOptions(event.target.value)}
                    placeholder="One answer per line"
                    className="mt-1 min-h-28 w-full rounded-xl border border-stone-200 p-3 text-sm"
                  />
                </label>
              )}
              <fieldset>
                <legend className="text-sm font-medium text-stone-700">
                  {type === "multiple_select"
                    ? "Correct answers (select all that apply)"
                    : "Correct answer"}
                </legend>
                <div className="mt-2 space-y-2">
                  {visibleOptions.length ? (
                    visibleOptions.map((option, index) => (
                      <label
                        key={`${option}-${index}`}
                        className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm"
                      >
                        <input
                          type={
                            type === "multiple_select" ? "checkbox" : "radio"
                          }
                          name="correct-answer"
                          checked={correctAnswerIndices.includes(index)}
                          onChange={() => toggleCorrectAnswer(index)}
                        />
                        {index + 1}. {option}
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-stone-500">Add options first.</p>
                  )}
                </div>
              </fieldset>
              <label className="block text-sm font-medium text-stone-700">
                Answer explanation
                <textarea
                  value={explanation}
                  onChange={event => setExplanation(event.target.value)}
                  placeholder="Explain why this answer is correct. Students see this after an incorrect answer."
                  className="mt-1 min-h-28 w-full rounded-xl border border-stone-200 p-3 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-stone-700">
                Marks
                <input
                  type="number"
                  min="1"
                  value={marks}
                  onChange={event => setMarks(Number(event.target.value))}
                  className="mt-1 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm"
                />
              </label>
              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={savingQuestion || submitting}
                  onClick={() => void save()}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-900 px-4 py-2.5 text-sm font-bold text-emerald-900 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus size={15} />
                  {savingQuestion ? "Saving..." : "Save question"}
                </button>
              </div>
            </div>
            <h4 className="mt-8 font-display text-lg font-semibold">Results</h4>
            <div className="mt-3 space-y-2">
              {attempts.length ? (
                attempts.map(attempt => (
                  <div
                    key={attempt.id}
                    className="rounded-xl bg-stone-50 p-3 text-sm"
                  >
                    <span className="font-bold">
                      {attempt.score}/{attempt.totalMarks}
                    </span>
                    <span className="ml-2 text-stone-500">
                      {attempt.percentage}% · {attempt.studentId}
                    </span>
                  </div>
                ))
              ) : (
                <p className="rounded-xl bg-stone-50 p-3 text-sm text-stone-500">
                  Completed student attempts will appear here.
                </p>
              )}
            </div>
          </section>
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-stone-100 bg-white p-4 sm:px-6">
          <p className="text-xs text-stone-500">
            Questions are saved before the quiz is submitted.
          </p>
          <button
            type="button"
            disabled={submitting || savingQuestion}
            onClick={() => void submit()}
            className="rounded-xl bg-emerald-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Submitting..." : "Submit quiz"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function SavedExplanation({
  quizId,
  question,
  onSaved,
}: {
  quizId: string;
  question: QuizQuestionDraft;
  onSaved: (question: QuizQuestionDraft) => void;
}) {
  const [value, setValue] = useState(question.explanation ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const runSingleFlight = useSingleFlight();
  async function saveExplanation() {
    await runSingleFlight("quiz-explanation-save", async () => {
      setPending(true);
      setError("");
      try {
        const updated = { ...question, explanation: value.trim() };
        if (hasFirebaseConfiguration) await saveQuizQuestion(quizId, updated);
        onSaved(updated);
        setValue(updated.explanation);
        toast.success("Answer explanation was updated successfully.");
      } catch (cause) {
        setError(getUserFacingErrorMessage(cause, "Could not save explanation. Please try again."));
      } finally {
        setPending(false);
      }
    });
  }
  return (
    <div className="mt-3">
      <label className="block text-xs font-semibold">
        Answer explanation
        <textarea
          value={value}
          disabled={pending}
          onChange={event => setValue(event.target.value)}
          className="mt-1 min-h-24 w-full rounded-lg border border-stone-200 p-2 text-sm"
        />
      </label>
      <button
        type="button"
        disabled={pending || value === (question.explanation ?? "")}
        onClick={() => void saveExplanation()}
        className="mt-2 text-xs font-semibold text-emerald-800 disabled:opacity-40"
      >
        {pending ? "Saving..." : "Save explanation"}
      </button>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
