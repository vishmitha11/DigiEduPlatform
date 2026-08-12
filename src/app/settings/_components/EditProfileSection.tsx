"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Save, Camera, Trash2, User, Eye, X } from "lucide-react";
import { createClient } from "~/lib/supabase/client";
import AvatarCropModal from "./AvatarCropModal";

const MAX_AVATAR_BYTES = 3 * 1024 * 1024; // 3MB

export default function EditProfileSection() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [nationality, setNationality] = useState("Sri Lankan");

  const [role, setRole] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("Profile")
        .select("fullName, phone, city, district, dateOfBirth, gender, nationality, role, avatarUrl")
        .eq("id", user.id)
        .single();

      if (data) {
        setFullName(data.fullName ?? "");
        setPhone(data.phone ?? "");
        setCity(data.city ?? "");
        setDistrict(data.district ?? "");
        setDateOfBirth(data.dateOfBirth ? data.dateOfBirth.split("T")[0] : "");
        setGender(data.gender ?? "");
        setNationality(data.nationality ?? "Sri Lankan");
        setRole(data.role ?? null);
        setAvatarUrl(data.avatarUrl ?? null);
      }
      setLoading(false);
    };
    void load();
  }, []);

  // Step 1: file picked — validate, then hand off to the crop modal for a
  // live preview + circle-fit adjustment before anything gets uploaded.
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setAvatarError("");

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("Image must be under 3MB.");
      return;
    }

    setCropSrc(URL.createObjectURL(file));
  };

  const closeCropModal = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  // Step 2: user confirmed the crop — upload the cropped square image.
  const handleCropConfirm = async (blob: Blob) => {
    setUploadingAvatar(true);
    setAvatarError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const path = `${user.id}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, cacheControl: "3600", contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust so the new photo shows immediately even though the path is unchanged.
      const bustedUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("Profile")
        .update({ avatarUrl: bustedUrl, updatedAt: new Date().toISOString() })
        .eq("id", user.id);
      if (updateError) throw updateError;

      setAvatarUrl(bustedUrl);
      closeCropModal();
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarError("");
    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Best-effort — try common extensions since we don't track which one is live.
      await Promise.all(
        ["jpg", "jpeg", "png", "webp", "gif"].map((ext) =>
          supabase.storage.from("avatars").remove([`${user.id}/avatar.${ext}`]),
        ),
      );

      const { error: updateError } = await supabase
        .from("Profile")
        .update({ avatarUrl: null, updatedAt: new Date().toISOString() })
        .eq("id", user.id);
      if (updateError) throw updateError;

      setAvatarUrl(null);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Failed to remove photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setError("");
    setSuccess(false);
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("Profile")
        .update({
          fullName: fullName || null,
          phone: phone || null,
          city: city || null,
          district: district || null,
          dateOfBirth: dateOfBirth || null,
          gender: gender || null,
          nationality: nationality || null,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
        <p className="mt-1 text-sm text-gray-500">Update your personal information</p>
      </div>

      {role !== "ADMIN" && (
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => avatarUrl && setShowLightbox(true)}
            disabled={!avatarUrl}
            className="group relative flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-2xl font-bold text-blue-700 disabled:cursor-default"
          >
            {avatarUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarUrl} alt="Profile photo" className="h-full w-full object-cover" />
                <div className="absolute inset-0 hidden items-center justify-center bg-black/40 group-hover:flex">
                  <Eye className="h-5 w-5 text-white" />
                </div>
              </>
            ) : (
              <User className="h-8 w-8" />
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
            )}
          </button>
          <div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                <Camera className="h-4 w-4" />
                {avatarUrl ? "Change Photo" : "Upload Photo"}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => void handleRemoveAvatar()}
                  disabled={uploadingAvatar}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs text-gray-500">JPG, PNG, WEBP or GIF. Max 3MB.</p>
            {avatarError && <p className="mt-1 text-xs text-red-600">{avatarError}</p>}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+94 77 123 4567"
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Date of Birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Gender</label>
          <div className="flex gap-3">
            {["MALE", "FEMALE", "OTHER"].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition ${
                  gender === g
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-600 hover:border-blue-300"
                }`}
              >
                {g.charAt(0) + g.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Colombo"
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">District</label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="Colombo"
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Nationality</label>
          <input
            type="text"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">Profile updated successfully!</div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? "Saving..." : "Save Changes"}
      </button>

      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          onCancel={closeCropModal}
          onConfirm={(blob) => handleCropConfirm(blob)}
        />
      )}

      {showLightbox && avatarUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowLightbox(false)}
        >
          <button
            type="button"
            onClick={() => setShowLightbox(false)}
            className="absolute right-6 top-6 text-white/80 transition hover:text-white"
          >
            <X className="h-7 w-7" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt="Profile photo"
            className="max-h-[80vh] max-w-[80vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
