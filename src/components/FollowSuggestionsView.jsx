/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ArrowLeft, Settings, CircleCheck, Loader2 } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

export const FollowSuggestionsView = () => {
  const navigate = useNavigate();
  const { currentUser, toggleFollow } = useApp();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("who_to_follow");

  const isFollowing = (username) => {
    return currentUser?.following.includes(username) || false;
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/suggestions");
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch (err) {
        console.error("Error fetching suggestions:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestions();
  }, [currentUser]);

  const handleFollowToggle = async (username) => {
    try {
      await toggleFollow(username);
      // Refresh list to keep state fully in sync
      const res = await fetch("/api/suggestions");
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch (err) {
      console.error("Failed to follow/unfollow:", err);
    }
  };

  // "Creators for you" could be verified accounts, and "Who to follow" can show all suggestion list
  const displayedUsers = activeTab === "who_to_follow" 
    ? suggestions 
    : suggestions.filter(u => u.verified);

  return (
    <div className="flex flex-col w-full h-full bg-[#030712] overflow-y-auto scrollbar-none">
      
      {/* Header Row */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 sticky top-0 bg-[#030712]/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display font-bold text-lg text-white">Follow</h1>
          </div>
        </div>
        <button className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        <button
          onClick={() => setActiveTab("who_to_follow")}
          className="flex-1 py-4 text-center text-sm font-bold relative transition-colors duration-200"
          style={{ color: activeTab === "who_to_follow" ? "#ffffff" : "#9ca3af" }}
        >
          <span>Who to follow</span>
          {activeTab === "who_to_follow" && (
            <motion.div 
              layoutId="followTabUnderline"
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-[#1D9BF0] rounded-full"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("creators_for_you")}
          className="flex-1 py-4 text-center text-sm font-bold relative transition-colors duration-200"
          style={{ color: activeTab === "creators_for_you" ? "#ffffff" : "#9ca3af" }}
        >
          <span>Creators for you</span>
          {activeTab === "creators_for_you" && (
            <motion.div 
              layoutId="followTabUnderline"
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-1 bg-[#1D9BF0] rounded-full"
            />
          )}
        </button>
      </div>

      {/* Suggested Section */}
      <div className="flex flex-col p-4 gap-4">
        <h2 className="font-display font-bold text-xl text-white tracking-tight px-1">
          {activeTab === "who_to_follow" ? "Suggested for you" : "Creators suggested for you"}
        </h2>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-[#1D9BF0] animate-spin" />
            <p className="text-xs text-gray-500 font-mono tracking-wider">LOADING RECOMMENDATIONS...</p>
          </div>
        ) : displayedUsers.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center gap-3 border border-dashed border-white/10 rounded-2xl bg-[#090d1a]/20 px-4">
            <span className="text-sm text-gray-400 font-medium">No new recommendations available</span>
            <p className="text-xs text-gray-500 max-w-xs leading-normal">
              You are already following everyone on this list, or there are no new creators matching this category yet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <AnimatePresence mode="popLayout">
              {displayedUsers.map((user) => {
                const following = isFollowing(user.username);
                return (
                  <motion.div
                    key={user.username}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-start justify-between gap-3 p-3 rounded-2xl hover:bg-white/[0.02] border border-white/0 hover:border-white/5 transition-all group"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <img
                        src={user.avatar}
                        alt={user.displayName}
                        onClick={() => navigate(`/profile/${user.username}`)}
                        className="w-12 h-12 rounded-full object-cover border border-white/5 cursor-pointer hover:border-[#1D9BF0]/50 transition-colors"
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span 
                            onClick={() => navigate(`/profile/${user.username}`)}
                            className="text-sm font-bold text-white hover:underline cursor-pointer flex items-center gap-1"
                          >
                            {user.displayName}
                          </span>
                          {user.verified && (
                            <CircleCheck className="w-4 h-4 text-[#1D9BF0] fill-[#1D9BF0]" />
                          )}
                        </div>
                        <span className="text-xs text-gray-400 font-mono">@{user.username}</span>
                        {user.bio && (
                          <p className="text-sm text-gray-300 mt-1.5 leading-relaxed break-words whitespace-pre-wrap">
                            {user.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleFollowToggle(user.username)}
                      className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 shadow-sm flex-shrink-0 ${
                        following
                          ? "bg-white/10 text-white hover:bg-red-500/15 hover:text-red-400 border border-white/5"
                          : "bg-white text-black hover:bg-gray-200 hover:scale-[1.02]"
                      }`}
                    >
                      {following ? "Following" : "Follow"}
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

    </div>
  );
};
