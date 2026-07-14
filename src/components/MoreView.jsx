/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Settings, 
  Shield, 
  Cpu, 
  LogOut, 
  ArrowLeft, 
  AlertTriangle, 
  Trash2, 
  ShieldAlert,
  Loader2
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

export const MoreView = () => {
  const { logout, deleteAccount, currentUser } = useApp();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("menu");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const options = [
    { id: "account", title: "Account Settings", desc: "Manage your username, email, and authentication details.", icon: Settings },
    { id: "privacy", title: "Privacy & Safety", desc: "Configure location visibility, content blockers, and tracking.", icon: Shield },
    { id: "diagnostics", title: "API Diagnostics", desc: "Diagnose background Socket.io connections and simulated Redis states.", icon: Cpu },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/home");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteAccount();
      navigate("/home");
    } catch (err) {
      setDeleteError(err.message || "An error occurred while deleting your account");
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#030712] p-6 overflow-y-auto gap-6 relative">
      <AnimatePresence mode="wait">
        {activeSection === "menu" && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-6"
          >
            <div className="border-b border-white/10 pb-4">
              <h1 className="font-display font-bold text-2xl text-white">More Options</h1>
              <p className="text-xs text-gray-400 mt-0.5">Configure and monitor your PulseStream environment</p>
            </div>

            <div className="flex flex-col gap-3">
              {options.map((opt) => {
                const Icon = opt.icon;
                return (
                  <div 
                    key={opt.title} 
                    onClick={() => setActiveSection(opt.id)}
                    className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all flex items-start gap-4 cursor-pointer"
                  >
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 mt-0.5">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-white">{opt.title}</span>
                      <span className="text-xs text-gray-400 mt-0.5 leading-relaxed">{opt.desc}</span>
                    </div>
                  </div>
                );
              })}

              {/* Dynamic Log Out Action */}
              <div 
                onClick={handleLogout}
                className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 hover:border-red-500/20 hover:bg-red-500/10 transition-all flex items-start gap-4 cursor-pointer group"
              >
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 mt-0.5 group-hover:bg-red-500/20 transition-colors">
                  <LogOut className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-red-400">Sign Out of Account</span>
                  <span className="text-xs text-gray-500 mt-0.5 leading-relaxed">Instantly clear session cookies and lock your active browser stream window.</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === "account" && (
          <motion.div
            key="account"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <button 
                onClick={() => setActiveSection("menu")}
                className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-display font-bold text-xl text-white">Account Settings</h1>
                <p className="text-xs text-gray-400 mt-0.5">Manage details and delete your PulseStream profile</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
              <h2 className="text-sm font-bold text-gray-300">Profile Metadata</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col bg-white/[0.02] border border-white/5 p-3.5 rounded-xl">
                  <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Username</span>
                  <span className="text-sm text-white font-medium mt-1">@{currentUser?.username}</span>
                </div>
                <div className="flex flex-col bg-white/[0.02] border border-white/5 p-3.5 rounded-xl">
                  <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Display Name</span>
                  <span className="text-sm text-white font-medium mt-1">{currentUser?.displayName}</span>
                </div>
                <div className="flex flex-col bg-white/[0.02] border border-white/5 p-3.5 rounded-xl">
                  <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Joined Date</span>
                  <span className="text-sm text-white font-medium mt-1">
                    {currentUser?.joinedDate ? new Date(currentUser.joinedDate).toLocaleDateString(undefined, { dateStyle: "long" }) : "N/A"}
                  </span>
                </div>
                <div className="flex flex-col bg-white/[0.02] border border-white/5 p-3.5 rounded-xl">
                  <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Verification Status</span>
                  <span className="text-sm text-white font-medium mt-1 flex items-center gap-1.5">
                    {currentUser?.verified ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        Verified Pulse Creator
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-gray-500" />
                        Standard Stream Account
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-500/10 text-red-400 rounded-xl mt-0.5">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-400">Danger Zone</h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Once you delete your account, there is no going back. All of your posts, comments, follower connections, bookmarks, and lists will be permanently deleted from the database.
                  </p>
                </div>
              </div>

              <div className="border-t border-red-500/10 pt-4 flex justify-end">
                <button 
                  onClick={() => setShowConfirmDelete(true)}
                  className="px-5 py-2.5 bg-red-600/80 hover:bg-red-600 rounded-xl font-bold text-xs text-white transition-all shadow-md hover:shadow-lg hover:shadow-red-950/20 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Permanently Delete Account</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === "privacy" && (
          <motion.div
            key="privacy"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <button 
                onClick={() => setActiveSection("menu")}
                className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-display font-bold text-xl text-white">Privacy & Safety</h1>
                <p className="text-xs text-gray-400 mt-0.5">Configure discoverability and tracking preferences</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
              <p className="text-xs text-gray-400">These settings are simulated for your sandboxed security environment:</p>
              <div className="flex flex-col gap-3">
                <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-xs font-bold text-white">Private Profile</span>
                  <input type="checkbox" defaultChecked className="rounded bg-black border-white/10 text-blue-500 focus:ring-0" />
                </label>
                <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-xs font-bold text-white">AI Safety Filter</span>
                  <input type="checkbox" defaultChecked disabled className="rounded bg-black border-white/10 text-blue-500 focus:ring-0 opacity-50" />
                </label>
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === "diagnostics" && (
          <motion.div
            key="diagnostics"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <button 
                onClick={() => setActiveSection("menu")}
                className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-display font-bold text-xl text-white">API Diagnostics</h1>
                <p className="text-xs text-gray-400 mt-0.5">Diagnose and troubleshoot your PulseStream environment</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium">Socket Connection:</span>
                <span className="text-xs font-mono text-emerald-400 font-bold">● Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium">HMR State:</span>
                <span className="text-xs font-mono text-amber-400 font-bold">Disabled (Optimized)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium">Database Layer:</span>
                <span className="text-xs font-mono text-blue-400 font-bold">JSON File (db.json)</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-md bg-gray-900 border border-red-500/20 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl"
            >
              <div className="flex items-center gap-2.5 text-red-400 border-b border-white/10 pb-3">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-display font-bold text-base">Confirm Account Deletion</h3>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                This action is <strong>irreversible</strong>. You will be logged out immediately, and all your records will be cleared. Are you absolutely sure you want to delete your PulseStream account?
              </p>

              {deleteError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[11px] leading-relaxed">
                  {deleteError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button 
                  onClick={() => {
                    setShowConfirmDelete(false);
                    setDeleteError("");
                  }}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl hover:bg-white/5 border border-white/5 text-gray-400 hover:text-white transition-all text-xs font-bold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Yes, Delete Account
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
