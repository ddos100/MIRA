/**
 * External Assessment Portal – no authentication required.
 * Accessed via /portal/assessment/:token
 */
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";

const portalClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
});

interface Question {
  id: string;
  text: string;
  question_type: "text" | "yes_no" | "scale" | "multiple_choice" | "date";
  options: string[];
  is_required: boolean;
  order: number;
}

interface AssessmentDetail {
  id: string;
  title: string;
  description: string;
  respondent_name: string;
  respondent_email: string;
  due_date: string | null;
  status: string;
  completed_at?: string;
  total_score?: string;
  questions: Question[];
}

interface ResponseItem {
  question_id: string;
  answer_text: string;
  answer_data: unknown;
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string;
  onChange: (v: string, data?: unknown) => void;
}) {
  if (question.question_type === "yes_no") {
    return (
      <div className="flex gap-4">
        {["Yes", "No"].map((opt) => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={question.id}
              value={opt.toLowerCase()}
              checked={value === opt.toLowerCase()}
              onChange={() => onChange(opt.toLowerCase())}
              className="accent-blue-600"
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.question_type === "scale") {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">1</span>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={value || "3"}
          onChange={(e) => onChange(e.target.value, Number(e.target.value))}
          className="flex-1 accent-blue-600"
        />
        <span className="text-sm text-gray-500">5</span>
        <span className="ml-2 font-semibold text-blue-700 w-6 text-center">
          {value || "3"}
        </span>
      </div>
    );
  }

  if (question.question_type === "multiple_choice" && question.options?.length) {
    return (
      <div className="space-y-2">
        {question.options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={question.id}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="accent-blue-600"
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.question_type === "date") {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    );
  }

  // Default: text/textarea
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      placeholder="Enter your response…"
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
    />
  );
}

export default function AssessmentPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [answers, setAnswers] = useState<Record<string, { text: string; data: unknown }>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    total_score?: string;
    responses_saved?: number;
    completed_at?: string;
  } | null>(null);

  const { data: assessment, isLoading, error } = useQuery<AssessmentDetail>({
    queryKey: ["portal-assessment", token],
    queryFn: async () => {
      const { data } = await portalClient.get(`/assessments/portal/${token}/`);
      return data;
    },
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: async (responses: ResponseItem[]) => {
      const { data } = await portalClient.post(
        `/assessments/portal/${token}/submit/`,
        { responses }
      );
      return data;
    },
    onSuccess: (data) => {
      setSubmitResult(data);
      setSubmitted(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessment) return;
    const responses: ResponseItem[] = assessment.questions.map((q) => ({
      question_id: q.id,
      answer_text: answers[q.id]?.text ?? "",
      answer_data: answers[q.id]?.data ?? null,
    }));
    submitMutation.mutate(responses);
  };

  // ── Render states ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !assessment) {
    const msg =
      axios.isAxiosError(error) && error.response?.data?.detail
        ? error.response.data.detail
        : "Assessment not found or the link is invalid.";
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Assessment Unavailable
          </h1>
          <p className="text-gray-600">{msg}</p>
        </div>
      </div>
    );
  }

  if (submitted && submitResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Thank you!
          </h1>
          <p className="text-gray-600 mb-4">
            Your assessment has been submitted successfully.
          </p>
          {submitResult.total_score && (
            <div className="bg-blue-50 rounded-xl p-4 inline-block">
              <p className="text-sm text-blue-600 font-medium">Your score</p>
              <p className="text-3xl font-bold text-blue-700">
                {parseFloat(submitResult.total_score).toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (assessment.status === "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Already Completed
          </h1>
          <p className="text-gray-600">
            This assessment has already been submitted.
          </p>
          {assessment.total_score && (
            <p className="mt-3 text-sm text-gray-500">
              Score: <strong>{parseFloat(assessment.total_score).toFixed(1)}%</strong>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow mb-6 p-6">
          <div className="flex items-start justify-between mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{assessment.title}</h1>
            {assessment.due_date && (
              <span className="flex items-center gap-1 text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                <Clock size={14} />
                Due {new Date(assessment.due_date).toLocaleDateString()}
              </span>
            )}
          </div>
          {assessment.description && (
            <p className="text-gray-600 mt-2">{assessment.description}</p>
          )}
          {assessment.respondent_name && (
            <p className="text-sm text-gray-500 mt-3">
              For: <strong>{assessment.respondent_name}</strong>
              {assessment.respondent_email && ` (${assessment.respondent_email})`}
            </p>
          )}
        </div>

        {/* Questions */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {assessment.questions.map((q, idx) => (
            <div key={q.id} className="bg-white rounded-2xl shadow p-6">
              <p className="font-medium text-gray-900 mb-1">
                <span className="text-gray-400 mr-2">{idx + 1}.</span>
                {q.text}
                {q.is_required && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </p>
              <div className="mt-3">
                <QuestionField
                  question={q}
                  value={answers[q.id]?.text ?? (q.question_type === "scale" ? "3" : "")}
                  onChange={(text, data) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [q.id]: { text, data: data ?? null },
                    }))
                  }
                />
              </div>
            </div>
          ))}

          {submitMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              Submission failed. Please try again.
            </div>
          )}

          <div className="flex justify-end pb-8">
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              {submitMutation.isPending ? "Submitting…" : "Submit Assessment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
