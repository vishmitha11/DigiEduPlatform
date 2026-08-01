"use client";

import { useState } from "react";
import { User, Lock, Bell, ShieldCheck, Trash2, Settings, Menu, X } from "lucide-react";
import EditProfileSection from "./EditProfileSection";
import ChangePasswordSection from "./ChangePasswordSection";
import NotificationSection from "./NotificationSection";
import PrivacySection from "./PrivacySection";
import DeleteAccountSection from "./DeleteAccountSection";
import StudentSettingsSection from "./StudentSettingsSection";
import LecturerSettingsSection from "./LecturerSettingsSection";
import ProviderSettingsSection from "./ProviderSettingsSection";
import EmployerSettingsSection from "./EmployerSettingsSection";

type Role = "STUDENT" | "LECTURER" | "INSTITUTION_ADMIN" | "EMPLOYER" | "ADMIN";

const roleLabels: Record<string, string> = {
  STUDENT: "Academic Info",
  LECTURER: "Expertise",
  INSTITUTION_ADMIN: "Institution",
  EMPLOYER: "Company",
};

const roleColors: Record<string, string> = {
  STUDENT: "bg-blue-600",
  LECTURER: "bg-violet-600",
  INSTITUTION_ADMIN: "bg-emerald-600",
  EMPLOYER: "bg-orange-500",
  ADMIN: "bg-red-600",
};

export default function SettingsShell({ role }: { role: Role }) {
  const [activeTab, setActiveTab] = useState("profile");
  const [mobileOpen, setMobileOpen] = useState(false);

  const accentColor = roleColors[role] ?? "bg-blue-600";

  const tabs = [
    { id: "profile", label: "Edit Profile", icon: User },
    ...(role !== "ADMIN" ? [{ id: "role", label: roleLabels[role] ?? "Role Info", icon: Settings }] : []),
    { id: "password", label: "Change Password", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy & Communications", icon: ShieldCheck },
    { id: "delete", label: "Delete Account", icon: Trash2 },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "profile": return <EditProfileSection />;
      case "password": return <ChangePasswordSection />;
      case "notifications": return <NotificationSection />;
      case "privacy": return <PrivacySection />;
      case "delete": return <DeleteAccountSection />;
      case "role":
        switch (role) {
          case "STUDENT": return <StudentSettingsSection />;
          case "LECTURER": return <LecturerSettingsSection />;
          case "INSTITUTION_ADMIN": return <ProviderSettingsSection />;
          case "EMPLOYER": return <EmployerSettingsSection />;
          default: return null;
        }
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="mt-1 text-gray-500">Manage your account preferences</p>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg border border-gray-200 p-2 lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <div className="flex gap-8">

          {/* Sidebar */}
          <aside className={`${mobileOpen ? "block" : "hidden"} w-full lg:block lg:w-64 shrink-0`}>
            <nav className="sticky top-8 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isDanger = tab.id === "delete";
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setMobileOpen(false); }}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? isDanger
                          ? "bg-red-50 text-red-600"
                          : `${accentColor} text-white`
                        : isDanger
                        ? "text-red-500 hover:bg-red-50"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <main className="min-w-0 flex-1">
            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}