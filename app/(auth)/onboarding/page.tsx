"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function OnboardingPage() {
  const { user, completeOnboarding, isSubmitting } = useAuth();
  const [step, setStep] = useState(1);
  const [preferences, setPreferences] = useState({
    useCase: "",
    experience: "",
    notifications: true,
  });

  const handleComplete = async () => {
    await completeOnboarding();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Welcome{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}! 👋
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Let's get you set up in just a few steps
          </p>
        </div>

        <div className="bg-white shadow sm:rounded-lg p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">What brings you here?</h3>
                <p className="mt-1 text-sm text-gray-500">Help us personalize your experience</p>
              </div>

              <div className="space-y-4">
                {["Personal use", "Work", "Education", "Other"].map((option) => (
                  <label key={option} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="useCase"
                      value={option}
                      checked={preferences.useCase === option}
                      onChange={(e) => setPreferences({ ...preferences, useCase: e.target.value })}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-900">{option}</span>
                  </label>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!preferences.useCase}
                className="w-full flex justify-center rounded-md bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Your experience level</h3>
                <p className="mt-1 text-sm text-gray-500">This helps us provide better assistance</p>
              </div>

              <div className="space-y-4">
                {["Beginner", "Intermediate", "Advanced", "Expert"].map((option) => (
                  <label key={option} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="experience"
                      value={option}
                      checked={preferences.experience === option}
                      onChange={(e) => setPreferences({ ...preferences, experience: e.target.value })}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-900">{option}</span>
                  </label>
                ))}
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 flex justify-center rounded-md bg-white px-3 py-3 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!preferences.experience}
                  className="flex-1 flex justify-center rounded-md bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
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
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email notifications</p>
                    <p className="text-sm text-gray-500">Receive updates about your account</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.notifications}
                    onChange={(e) => setPreferences({ ...preferences, notifications: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  />
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-sm text-blue-800">
                  🎉 You're all set! Click finish to start using the app.
                </p>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 flex justify-center rounded-md bg-white px-3 py-3 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  className="flex-1 flex justify-center rounded-md bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Finishing..." : "Finish setup"}
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-center space-x-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full ${
                  i === step ? "bg-blue-600" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
