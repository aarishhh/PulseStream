import React, { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { motion, AnimatePresence } from "motion/react";
import { Key, User as UserIcon, LogIn, UserPlus, Sparkles, AlertCircle, Eye, EyeOff } from "lucide-react";

export const AuthView = () => {
  const { login, register, loginWithGoogle, firebaseWarning } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available seed users for high-fidelity quick access
  const seedProfiles = [
    {
      username: "aarish_master",
      displayName: "Aarish",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&h=150&q=80",
      role: "BCA Student / Full Stack Developer"
    }
  ];

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err.message || "Google Sign-In failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Username is required");
      return;
    }
    if (!isLogin && !displayName.trim()) {
      setError("Display Name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isLogin) {
        await login(username.trim().toLowerCase(), password);
      } else {
        await register(username.trim().toLowerCase(), displayName.trim(), password);
      }
    } catch (err) {
      setError(err.message || "Authentication failed. Please check your inputs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeedClick = (selectedUsername) => {
    setError(null);
    setUsername(selectedUsername);
    setPassword("password123");
    setIsLogin(true);
    
    // Loaded notification
    const profile = seedProfiles.find(p => p.username === selectedUsername);
    if (profile) {
      setError(`Loaded demo credentials for ${profile.displayName}! Please click 'Access Stream' below to sign in.`);
    }
  };

  return (
    <div id="auth-view-root" className="min-h-screen w-full bg-[#030712] text-gray-200 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-y-auto">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch z-10">
        
        {/* Left Side: Brand Visual Card */}
        <div className="lg:col-span-5 flex flex-col justify-between p-8 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-md relative overflow-hidden min-h-[350px] lg:min-h-[auto]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl pointer-events-none" />
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <span className="font-display font-black text-xl text-white tracking-wider uppercase">PulseStream</span>
              <p className="text-[10px] text-blue-400 font-mono tracking-widest font-bold uppercase">Real-Time Pulse</p>
            </div>
          </div>

          {/* Description */}
          <div className="my-8 lg:my-0 flex-1 flex flex-col justify-center">
            <h1 className="font-display font-extrabold text-3xl md:text-4xl text-white leading-tight tracking-tight">
              Connect to the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                pulse of tech
              </span>
            </h1>
            <p className="mt-4 text-gray-400 text-sm leading-relaxed">
              Experience ultra-fast interactive posts, dynamic trending hashtags, automated AI content moderation, and real-time Socket.io workspace synchronized communication.
            </p>
          </div>

          {/* Seed User Disclaimer */}
          <div className="border-t border-white/5 pt-4 text-xs text-gray-500 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
            <span>Fully persistent and sandboxed.</span>
          </div>
        </div>

        {/* Right Side: Auth Forms Panel */}
        <div className="lg:col-span-7 flex flex-col justify-center gap-6">
          <div className="rounded-3xl border border-white/10 bg-[#090d1a] p-6 md:p-8 shadow-2xl flex flex-col gap-6">
            
            {/* Tab Switches */}
            <div className="flex bg-white/[0.03] p-1.5 rounded-2xl border border-white/5">
              <button
                onClick={() => { setIsLogin(true); setError(null); }}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                  isLogin
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
              <button
                onClick={() => { setIsLogin(false); setError(null); }}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                  !isLogin
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Create Account
              </button>
            </div>

            {/* Error Message */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-4 border rounded-2xl flex items-start gap-3 ${
                    error.startsWith("Loaded demo credentials")
                      ? "bg-blue-500/10 border-blue-500/20 text-blue-200"
                      : "bg-red-500/10 border-red-500/20 text-red-200"
                  }`}
                >
                  <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    error.startsWith("Loaded demo credentials") ? "text-blue-400" : "text-red-400"
                  }`} />
                  <p className="text-sm">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Firebase configuration warning / fallback notification */}
            <AnimatePresence mode="wait">
              {firebaseWarning && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-200 rounded-2xl flex items-start gap-3 mt-2"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
                  <div className="text-xs">
                    <p className="font-bold mb-1 uppercase font-mono tracking-wider text-amber-300 text-[10px]">💡 Firebase Hybrid Fallback Mode</p>
                    <p className="leading-relaxed">{firebaseWarning}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Auth Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              
              {/* Username Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-400 tracking-wider uppercase font-mono">
                  Username
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. johndoe"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              {/* Display Name Input (Only on Sign Up) */}
              <AnimatePresence initial={false}>
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden flex flex-col gap-1.5"
                  >
                    <label className="text-xs font-bold text-gray-400 tracking-wider uppercase font-mono">
                      Display Name
                    </label>
                    <div className="relative">
                      <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                        disabled={isSubmitting}
                        required={!isLogin}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Password Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-400 tracking-wider uppercase font-mono">
                  Password
                </label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 pl-12 pr-12 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {!isLogin && password && password.length < 6 && (
                  <p className="text-[10px] text-amber-400 font-semibold flex items-center gap-1 mt-1 font-mono">
                    ⚠️ Password is too short (min 6 characters required)
                  </p>
                )}
                {!isLogin && password && password.length >= 6 && (
                  <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-1 font-mono">
                    ✓ Secure password length verified
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/10 hover:shadow-blue-500/20 active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {isLogin ? "Access Stream" : "Initialize Account"}
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#0e1326] hover:bg-[#151c38] disabled:opacity-50 text-white font-bold rounded-2xl transition-all border border-white/10 hover:border-white/20 active:scale-[0.99] flex items-center justify-center gap-3 shadow-lg"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.253-3.133C18.23 1.844 15.442 1 12.24 1c-6.077 0-11 4.923-11 11s4.923 11 11 11c6.34 0 10.56-4.456 10.56-10.75 0-.724-.077-1.277-.174-1.685H12.24z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Quick Demo Access Header */}
            <div className="relative my-2 flex py-1 items-center">
              <div className="flex-grow border-t border-white/5" />
              <span className="flex-shrink mx-4 text-[10px] font-bold text-gray-500 uppercase font-mono tracking-wider">
                Or Quick Access Seeds
              </span>
              <div className="flex-grow border-t border-white/5" />
            </div>

            {/* Seed Profiles List */}
            <div className="grid grid-cols-2 gap-3">
              {seedProfiles.map((p) => (
                <button
                  key={p.username}
                  type="button"
                  onClick={() => handleSeedClick(p.username)}
                  disabled={isSubmitting}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.01] hover:bg-white/[0.04] active:bg-white/[0.06] border border-white/5 hover:border-white/10 text-left transition-all"
                >
                  <img src={p.avatar} alt={p.displayName} className="w-8 h-8 rounded-full object-cover" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate leading-tight">{p.displayName}</p>
                    <p className="text-[9px] text-gray-500 truncate mt-0.5 font-mono">{p.role}</p>
                  </div>
                </button>
              ))}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
