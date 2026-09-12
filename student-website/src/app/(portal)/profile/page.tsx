"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Camera,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  LogOut,
  Mail,
  ShieldCheck,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useStudentAuth } from "@/components/student-auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  changePassword,
  logoutStudent,
} from "@/lib/auth-service";
import {
  getStudentEnrollments,
  getStudentProfile,
  updateStudentName,
  uploadStudentPhoto,
} from "@/lib/student-repository";
import { isStrongPassword, STRONG_PASSWORD_MESSAGE } from "../../../../../shared/auth-validation";
import { useSingleFlight } from "@/lib/use-single-flight";
import { getUserFacingErrorMessage } from "../../../../../shared/user-facing-errors";

export default function ProfilePage() {
  const { user, firebaseActive } = useStudentAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const runSingleFlight = useSingleFlight();
  const profile = useQuery({
    queryKey: ["student", "profile", user?.uid],
    queryFn: () => getStudentProfile(user!.uid),
    enabled: Boolean(user?.uid),
  });
  const enrollments = useQuery({
    queryKey: ["student", "enrollments", user?.uid],
    queryFn: () => getStudentEnrollments(user!.uid),
    enabled: Boolean(user?.uid),
  });
  const photoUpload = useMutation({
    mutationFn: (file: File) => uploadStudentPhoto(user!.uid, file),
    onSuccess: (photoUrl) => {
      queryClient.setQueryData(["student", "profile", user?.uid], { ...profile.data, photoUrl });
      queryClient.invalidateQueries({
        queryKey: ["student", "profile", user?.uid],
      });
      toast.success("Profile photo updated.");
    },
    onError: error =>
      toast.error(
        getUserFacingErrorMessage(error, "Could not update photo. Please try again.")
      ),
  });
  const nameUpdate = useMutation({
    mutationFn: (name: string) => updateStudentName(user!.uid, name),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["student", "profile", user?.uid],
      });
      setShowEditProfile(false);
      toast.success("Your name has been updated.");
    },
    onError: error =>
      toast.error(
        getUserFacingErrorMessage(error, "Could not update name. Please try again.")
      ),
  });
  const passwordChange = useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => changePassword(user!, { currentPassword, newPassword }),
    onSuccess: () => {
      setShowChangePassword(false);
      toast.success("Your password has been updated.");
    },
    onError: error =>
      toast.error(
        getUserFacingErrorMessage(error, "Could not change your password. Please try again.")
      ),
  });

  function onPhotoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file && !profile.data?.photoUrl) void runSingleFlight("profile-photo", async () => {
      try { await photoUpload.mutateAsync(file); } catch { /* handled by onError */ }
    });
  }

  async function signOut() {
    await runSingleFlight("student-sign-out", async () => {
      setSigningOut(true);
      try {
        await logoutStudent();
        toast.success("You have been signed out.");
        router.replace("/login");
      } finally {
        setSigningOut(false);
      }
    });
  }

  const updatePasswordOnce = (values: { currentPassword: string; newPassword: string }) =>
    runSingleFlight("profile-password", async () => {
      try { await passwordChange.mutateAsync(values); } catch { /* handled by onError */ }
    });
  const updateNameOnce = (name: string) =>
    runSingleFlight("profile-name", async () => {
      try { await nameUpdate.mutateAsync(name); } catch { /* handled by onError */ }
    });

  const name = profile.data?.name || user?.displayName || "Student";
  const email = profile.data?.email || user?.email || "student@example.com";
  const studentId = profile.data?.studentId || "Pending";
  const joinedDate = formatJoinedDate(user?.metadata.creationTime);

  return (
    <section className="space-y-5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onPhotoSelected}
      />

      <div className="profile-hero relative overflow-hidden rounded-[22px] px-5 py-7 text-white shadow-[0_16px_40px_rgba(6,78,75,0.16)] sm:px-8 lg:px-12 lg:py-8">
        <div className="profile-wave" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            <div className="relative grid size-28 place-items-center overflow-hidden rounded-full border-[3px] border-white bg-gradient-to-br from-slate-200 to-slate-400 text-4xl font-bold text-teal-950 shadow-lg sm:size-36">
              {profile.data?.photoUrl ? (
                <Image
                  src={profile.data.photoUrl}
                  alt={`${name}'s profile`}
                  fill
                  sizes="(min-width: 640px) 144px, 112px"
                  className="object-cover"
                />
              ) : (
                name.slice(0, 1).toUpperCase()
              )}
            </div>
            <button
              type="button"
              aria-label="Upload profile photo"
              disabled={!firebaseActive || !profile.data || Boolean(profile.data.photoUrl) || photoUpload.isPending}
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 grid size-10 place-items-center rounded-full border-4 border-white bg-white text-teal-700 shadow-sm transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60 sm:size-11"
            >
              {photoUpload.isPending ? (
                <span className="size-4 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
              ) : (
                <Camera className="size-5" />
              )}
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {name}
            </h1>
            <p className="mt-2 text-base text-teal-50 sm:text-lg">
              Student ID · <span className="text-teal-200">{studentId}</span>
            </p>
            <div className="mt-3 h-px max-w-52 bg-white/35" />
            <p className="mt-3 flex items-center gap-2 text-sm text-teal-50">
              <CalendarDays className="size-4" />
              Joined on {joinedDate}
            </p>
          </div>
        </div>
      </div>

      <p role="note" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{profile.data?.photoUrl ? "Your profile photo has been uploaded. Please contact an administrator to reset your photo if you need to change it." : "You may upload your profile photo only once. Please choose your photo carefully before uploading. Photos are automatically resized and compressed to 500 ? 500 pixels."}</p>

      <div className="grid gap-5 lg:grid-cols-12">
        <InfoCard
          title="Personal Information"
          icon={UserRound}
          className="lg:col-span-4"
        >
          <div className="space-y-3.5">
            <DetailRow icon={Mail} label="Email" value={email} />
            <DetailRow icon={UserRound} label="Full Name" value={name} />
            <DetailRow
              icon={GraduationCap}
              label="Student ID"
              value={studentId}
            />
            <DetailRow
              icon={CalendarDays}
              label="Member Since"
              value={joinedDate}
            />
          </div>
          <button
            type="button"
            disabled={!firebaseActive}
            onClick={() => {
              setEditName(name);
              setShowEditProfile(true);
            }}
            className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Edit profile <ArrowRight className="size-4" />
          </button>
        </InfoCard>

        <InfoCard
          title="Enrolled Batches"
          icon={GraduationCap}
          className="lg:col-span-4"
        >
          {enrollments.isLoading ? (
            <div className="flex min-h-40 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-50 to-slate-50 text-sm text-slate-500">
              Loading enrolled batches…
            </div>
          ) : enrollments.data?.length ? (
            <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
              {enrollments.data.map((item) => (
                <FeaturePanel
                  key={`${item.courseId}-${item.batchId}`}
                  compact
                  icon={BookOpen}
                  title={`${item.courseTitle} / ${item.batchName}`}
                  description="You are enrolled in this learning batch."
                />
              ))}
            </div>
          ) : (
            <FeaturePanel
              icon={BookOpen}
              title="Awaiting enrollment"
              description="An administrator will assign your learning batch."
            />
          )}
        </InfoCard>

        <InfoCard title="Security" icon={ShieldCheck} className="lg:col-span-4">
          <SecurityRow
            icon={KeyRound}
            title="Password"
            description="Secure password enabled"
            action="Reset password"
          />
          <div className="my-4 h-px bg-slate-100" />
          <SecurityRow
            icon={KeyRound}
            title="Change password"
            description="Update your password regularly"
            action="Change password"
            onClick={() => setShowChangePassword(true)}
            disabled={!firebaseActive}
          />
        </InfoCard>
      </div>

      {showChangePassword ? (
        <ChangePasswordDialog
          pending={passwordChange.isPending}
          onClose={() => setShowChangePassword(false)}
          onSubmit={values => void updatePasswordOnce(values)}
        />
      ) : null}

      {showEditProfile ? (
        <EditProfileDialog
          name={editName}
          pending={nameUpdate.isPending}
          onClose={() => setShowEditProfile(false)}
          onSubmit={name => void updateNameOnce(name)}
          onNameChange={setEditName}
        />
      ) : null}

      <Card className="relative overflow-hidden border-slate-200 px-5 py-5 shadow-[0_6px_22px_rgba(15,23,42,0.04)] sm:px-7">
        <div
          className="absolute -bottom-10 right-8 size-32 rounded-full bg-teal-50 blur-2xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid size-11 place-items-center rounded-xl bg-teal-50 text-teal-700">
              <Zap className="size-6" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Quick Actions</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Frequently used actions for your account
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              disabled={signingOut}
              onClick={signOut}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="size-4" />
              {signingOut ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
}

function InfoCard({
  title,
  icon: Icon,
  className,
  children,
}: {
  title: string;
  icon: typeof UserRound;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={`overflow-hidden border-slate-200 shadow-[0_6px_22px_rgba(15,23,42,0.04)] ${className ?? ""}`}
    >
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
        <span className="grid size-8 place-items-center rounded-full bg-teal-50 text-teal-800">
          <Icon className="size-[18px]" />
        </span>
        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_1.2fr] items-center gap-3 text-sm">
      <span className="flex min-w-0 items-center gap-2 text-slate-500">
        <Icon className="size-4 shrink-0" />
        {label}
      </span>
      <span className="truncate font-medium text-slate-800" title={value}>
        {value}
      </span>
    </div>
  );
}

function FeaturePanel({
  icon: Icon,
  title,
  description,
  compact = false,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center gap-5 rounded-2xl bg-gradient-to-br from-teal-50 to-slate-50 ${compact ? "min-h-24 p-4" : "min-h-40 p-5"}`}>
      <span className={`grid shrink-0 place-items-center rounded-full bg-teal-100/70 text-teal-700 ${compact ? "size-12" : "size-20"}`}>
        <Icon className={compact ? "size-6" : "size-10"} strokeWidth={1.7} />
      </span>
      <div className="min-w-0">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function SecurityRow({
  icon: Icon,
  title,
  description,
  action,
  onClick,
  disabled = false,
}: {
  icon: typeof KeyRound;
  title: string;
  description: string;
  action: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const label = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="truncate text-xs text-slate-500">{description}</p>
      </div>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex w-full items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
      >
        {label}
        <span className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition group-hover:bg-slate-50">
          {action}
        </span>
      </button>
    );
  }
  return (
    <div className="flex items-center gap-3">
      {label}
      <Link
        href="/forgot-password"
        className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
      >
        {action}
      </Link>
    </div>
  );
}

function ChangePasswordDialog({
  pending,
  onClose,
  onSubmit,
}: {
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: { currentPassword: string; newPassword: string }) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const newPasswordInvalid = newPassword.length > 0 && !isStrongPassword(newPassword);
  const confirmMismatch =
    confirmPassword.length > 0 && confirmPassword !== newPassword;
  const canSubmit =
    Boolean(currentPassword) &&
    isStrongPassword(newPassword) &&
    confirmPassword === newPassword &&
    !pending;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"
    >
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <Card className="relative z-10 w-full max-w-md">
        <CardContent className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
                Account security
              </p>
              <h2 id="change-password-title" className="mt-2 text-xl font-bold text-slate-950">
                Change password
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 disabled:opacity-50"
              aria-label="Close dialog"
            >
              <X className="size-4" />
            </button>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Enter your current password to verify your identity, then choose a
            strong new password.
          </p>

          <div className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Current password
              <div className="relative mt-2">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={event => setCurrentPassword(event.target.value)}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-11 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
                <PasswordVisibilityButton visible={showCurrentPassword} onClick={() => setShowCurrentPassword(value => !value)} />
              </div>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              New password
              <div className="relative mt-2">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={event => setNewPassword(event.target.value)}
                  placeholder="8+ upper, lower, number, symbol"
                  autoComplete="new-password"
                  minLength={8}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-11 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
                <PasswordVisibilityButton visible={showNewPassword} onClick={() => setShowNewPassword(value => !value)} />
              </div>
            </label>
            {newPasswordInvalid ? (
              <p className="text-xs font-medium text-red-600">
                {STRONG_PASSWORD_MESSAGE}
              </p>
            ) : null}
            <label className="block text-sm font-medium text-slate-700">
              Confirm new password
              <div className="relative mt-2">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={event => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  minLength={8}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-11 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
                <PasswordVisibilityButton visible={showConfirmPassword} onClick={() => setShowConfirmPassword(value => !value)} />
              </div>
            </label>
            {confirmMismatch ? (
              <p className="text-xs font-medium text-red-600">
                Passwords do not match.
              </p>
            ) : null}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button
              disabled={!canSubmit}
              onClick={() =>
                onSubmit({ currentPassword, newPassword })
              }
            >
              {pending ? "Updating…" : "Update password"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PasswordVisibilityButton({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-teal-700" aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>;
}

function EditProfileDialog({
  name,
  pending,
  onClose,
  onSubmit,
  onNameChange,
}: {
  name: string;
  pending: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  onNameChange: (name: string) => void;
}) {
  const canSubmit = name.trim().length > 0 && !pending;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"
    >
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <Card className="relative z-10 w-full max-w-md">
        <CardContent className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
                Personal information
              </p>
              <h2 id="edit-profile-title" className="mt-2 text-xl font-bold text-slate-950">
                Edit profile
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 disabled:opacity-50"
              aria-label="Close dialog"
            >
              <X className="size-4" />
            </button>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Update your full name. This will be displayed on your profile.
          </p>

          <div className="mt-5">
            <label className="block text-sm font-medium text-slate-700">
              Full Name
              <input
                type="text"
                value={name}
                onChange={event => onNameChange(event.target.value)}
                placeholder="Enter your full name"
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button
              disabled={!canSubmit}
              onClick={() => onSubmit(name.trim())}
            >
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatJoinedDate(value?: string) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
