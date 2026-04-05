"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { profileService } from "@/lib/profile/profile.service";
import type { UseCase, ExperienceLevel } from "@/lib/profile/profile.types";
import { Sparkles, ArrowRight, ArrowLeft } from "lucide-react";

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState({
    useCase: "" as UseCase | "",
    experience: "" as ExperienceLevel | "",
    notifications: true,
  });

  const progress = (step / TOTAL_STEPS) * 100;

  const handleComplete = async () => {
    if (!preferences.useCase || !preferences.experience) {
      setError("Please complete all steps");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await profileService.completeOnboarding({
      use_case: preferences.useCase as UseCase,
      experience_level: preferences.experience as ExperienceLevel,
      notifications: preferences.notifications,
    });

    setIsSubmitting(false);

    if (result.success) {
      router.push("/chat");
    } else {
      setError(result.error?.message || "Failed to complete onboarding");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Welcome{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Let's personalize your experience in just a few steps
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Content Card */}
        <div className="bg-white shadow-lg sm:rounded-lg p-8 border border-gray-100">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">What brings you here?</h3>
                <p className="mt-1 text-sm text-gray-500">Help us personalize your experience</p>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Personal use", value: "personal" as UseCase },
                  { label: "Work", value: "work" as UseCase },
                  { label: "Education", value: "education" as UseCase },
                  { label: "Other", value: "other" as UseCase },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      preferences.useCase === option.value
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="useCase"
                      value={option.value}
                      checked={preferences.useCase === option.value}
                      onChange={(e) => setPreferences({ ...preferences, useCase: e.target.value as UseCase })}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-900">{option.label}</span>
                  </label>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!preferences.useCase}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Your experience level</h3>
                <p className="mt-1 text-sm text-gray-500">This helps us provide better assistance</p>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Beginner", value: "beginner" as ExperienceLevel },
                  { label: "Intermediate", value: "intermediate" as ExperienceLevel },
                  { label: "Advanced", value: "advanced" as ExperienceLevel },
                  { label: "Expert", value: "expert" as ExperienceLevel },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      preferences.experience === option.value
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="experience"
                      value={option.value}
                      checked={preferences.experience === option.value}
                      onChange={(e) => setPreferences({ ...preferences, experience: e.target.value as ExperienceLevel })}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-900">{option.label}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!preferences.experience}
                  className="flex-1 flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Notification preferences</h3>
                <p className="mt-1 text-sm text-gray-500">You can change these later in settings</p>
              </div>

              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-gray-300 transition-all">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email notifications</p>
                    <p className="text-sm text-gray-500">Receive updates about your account</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.notifications}
                    onChange={(e) => setPreferences({ ...preferences, notifications: e.target.checked })}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  />
                </label>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">You're all set!</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Click finish to start using your personalized assistant.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:from-blue-500 hover:to-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Finishing...
                    </>
                  ) : (
                    <>
                      Finish Setup
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step Indicators */}
          <div className="mt-8 flex justify-center items-center gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full font-medium text-xs transition-all ${
                    i < step
                      ? "bg-blue-600 text-white"
                      : i === step
                      ? "bg-blue-600 text-white ring-4 ring-blue-100"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {i < step ? "✓" : i}
                </div>
                {i < 3 && (
                  <div
                    className={`w-12 h-0.5 mx-1 transition-all ${
                      i < step ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
