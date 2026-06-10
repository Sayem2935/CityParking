import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks";
import { Input, Button, Card, ErrorMessage, LoadingSpinner } from "@/components";
import { useForm } from "@/hooks";
import { required, minLength, maxLength } from "@/utils";

type EditProfileFormValues = {
  firstName: string;
  lastName: string;
  phone: string;
};

const EditProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, isLoading, error, clearError, updateProfile } = useProfile();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useForm<EditProfileFormValues>({
    initialValues: {
      firstName: profile?.firstName || "",
      lastName: profile?.lastName || "",
      phone: profile?.phone || "",
    },
    validationRules: {
      firstName: [
        required("First name is required"),
        minLength(2, "First name must be at least 2 characters"),
        maxLength(50, "First name must be less than 50 characters"),
      ],
      lastName: [
        required("Last name is required"),
        minLength(2, "Last name must be at least 2 characters"),
        maxLength(50, "Last name must be less than 50 characters"),
      ],
      phone: [],
    },
    onSubmit: async (formValues) => {
      setSubmitError(null);
      setSubmitSuccess(false);
      clearError();
      try {
        await updateProfile({
          firstName: formValues.firstName,
          lastName: formValues.lastName,
          phone: formValues.phone || undefined,
        });
        setSubmitSuccess(true);
        setTimeout(() => navigate("/profile"), 1500);
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? (err as { message: string }).message
            : "Update failed. Please try again.";
        setSubmitError(message);
      }
    },
  });

  if (isLoading && !profile) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const displayError = submitError || error;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Edit Profile</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Update your personal information
        </p>
      </div>

      <Card padding="lg">
        {displayError && (
          <ErrorMessage
            message={displayError}
            className="mb-6"
            onRetry={() => {
              setSubmitError(null);
              clearError();
            }}
          />
        )}

        {submitSuccess && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-900/30 p-4">
            <p className="text-sm text-green-800">
              Profile updated successfully! Redirecting...
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="First name"
              name="firstName"
              type="text"
              autoComplete="given-name"
              placeholder="John"
              value={values.firstName}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.firstName}
              touched={touched.firstName}
              disabled={isSubmitting || isLoading}
            />

            <Input
              label="Last name"
              name="lastName"
              type="text"
              autoComplete="family-name"
              placeholder="Doe"
              value={values.lastName}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.lastName}
              touched={touched.lastName}
              disabled={isSubmitting || isLoading}
            />
          </div>

          <Input
            label="Phone number"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="(Optional)"
            value={values.phone}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.phone}
            touched={touched.phone}
            disabled={isSubmitting || isLoading}
          />

          {profile && (
            <div className="mb-4">
              <p className="text-sm font-medium text-zinc-500">Email</p>
              <p className="mt-1 text-sm text-zinc-100">
                {profile.email}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Email cannot be changed
              </p>
            </div>
          )}

          <div className="flex gap-4 mt-6">
            <Button
              type="submit"
              isLoading={isSubmitting || isLoading}
            >
              Save Changes
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/profile")}
              disabled={isSubmitting || isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EditProfilePage;