/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  TrendingUp, 
  ChevronRight, 
  Gamepad2, 
  Binary, 
  Globe, 
  Tv, 
  TrendingUp as TrendIcon,
  CircleCheck,
  Briefcase,
  Coins,
  Microscope
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { useApp } from "../context/AppContext.jsx";

const formatNumber = (val) => {
  if (!val) return "0";
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return val.toString();
};

export const RightWidgets = () => {
  const { 
    trendingTags, 
    analytics, 
    currentUser, 
    toggleFollow
  } = useApp();

  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await fetch("/api/suggestions");
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch (err) {
        console.error("Error fetching suggestions:", err);
      }
    };
    fetchSuggestions();
  }, [currentUser]);

  const categories = [
    { name: "News", icon: Globe },
    { name: "Technology", icon: Binary },
    { name: "Sports", icon: TrendIcon },
    { name: "Entertainment", icon: Tv },
    { name: "Gaming", icon: Gamepad2 },
    { name: "Business", icon: Briefcase },
    { name: "Crypto", icon: Coins },
    { name: "Science", icon: Microscope },
  ];

  const handleFollowToggle = async (username) => {
    await toggleFollow(username);
  };

  const isFollowing = (username) => {
    return currentUser?.following.includes(username) || false;
  };

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto h-full bg-[#030712] w-full scrollbar-none">
      
      {/* 1. Trending Now Widget */}
      <div className="glass-card rounded-2xl p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-lg text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Trending Now
          </h3>
          <Link to="/explore" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">View all</Link>
        </div>

        <div className="flex flex-col gap-3">
          {trendingTags.slice(0, 5).map((tag, idx) => (
            <div key={tag.hashtag} className="flex items-center justify-between group cursor-pointer hover:bg-white/5 p-1.5 rounded-xl transition-colors">
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-gray-500 font-medium">#{idx + 1} • Trending</span>
                <span className="text-sm font-semibold text-white truncate mt-0.5 group-hover:text-blue-400 transition-colors">
                  {tag.hashtag}
                </span>
                <span className="text-xs text-gray-400 mt-0.5">{tag.count >= 1000 ? `${(tag.count / 1000).toFixed(1)}K` : tag.count} posts</span>
              </div>
              <TrendingUp className="w-4 h-4 text-gray-500 group-hover:text-blue-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
          ))}
        </div>
      </div>

      {/* 2. Your Analytics Widget */}
      {analytics && (
        <div className="glass-card rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-lg text-white">Your Analytics</h3>
            <Link to="/profile" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">View all</Link>
          </div>

          <div className="grid grid-cols-3 gap-2 border-b border-white/10 pb-3">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-medium">Impressions</span>
              <span className="text-base font-bold text-white mt-0.5">
                {formatNumber(analytics.impressions)}
              </span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 mt-0.5">
                ↑ {analytics.impressionsGrowth}%
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-medium">Engagement</span>
              <span className="text-base font-bold text-white mt-0.5">
                {analytics.engagementRate}%
              </span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 mt-0.5">
                ↑ {analytics.engagementGrowth}%
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-medium">Visits</span>
              <span className="text-base font-bold text-white mt-0.5">
                {formatNumber(analytics.profileVisits)}
              </span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 mt-0.5">
                ↑ {analytics.profileVisitsGrowth}%
              </span>
            </div>
          </div>

          {/* Comparative Bar Chart Mon-Sun */}
          <div className="h-28 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.dailyStats}>
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "#9ca3af", fontSize: 9 }} 
                />
                <Tooltip 
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{ background: "#0b1528", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff", fontSize: 10 }}
                  itemStyle={{ color: "#3B82F6", fontSize: 10 }}
                />
                <Bar 
                  dataKey="impressions" 
                  fill="#0066FF" 
                  radius={[3, 3, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 3. Who to Follow Widget */}
      <div className="glass-card rounded-2xl p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-lg text-white">Who to follow</h3>
          <Link to="/follow" className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">View all</Link>
        </div>

        <div className="flex flex-col gap-3">
          {suggestions.length === 0 ? (
            <p className="text-xs text-gray-500 font-medium py-1">No new follow recommendations</p>
          ) : (
            suggestions.slice(0, 5).map((user) => {
              const following = isFollowing(user.username);
              return (
                <div key={user.username} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={user.avatar}
                      alt={user.displayName}
                      className="w-10 h-10 rounded-full object-cover border border-white/5"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-white flex items-center gap-1">
                        {user.displayName}
                        {user.verified && <CircleCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />}
                      </span>
                      <span className="text-xs text-gray-400 truncate font-mono">@{user.username}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleFollowToggle(user.username)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                      following 
                        ? "bg-white/10 text-white hover:bg-red-500/15 hover:text-red-400 border border-white/5"
                        : "bg-white text-black hover:bg-gray-200 shadow-md"
                    }`}
                  >
                    {following ? "Unfollow" : "Follow"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Explore by Category Widget */}
      <div className="glass-card rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-lg text-white">Explore by category</h3>
          <span className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer transition-colors">View all</span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {categories.slice(0, 6).map((cat) => {
            const Icon = cat.icon;
            return (
              <div 
                key={cat.name} 
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 cursor-pointer border border-white/0 hover:border-white/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 group-hover:text-blue-300 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">{cat.name}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
