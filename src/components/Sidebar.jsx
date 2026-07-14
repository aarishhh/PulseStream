/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { 
  Home, 
  Search, 
  Bookmark, 
  ListTodo, 
  User as UserIcon, 
  MoreHorizontal, 
  PenSquare, 
  Flame,
  ChevronDown,
  Menu,
  MessageSquare,
  LogOut
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";

export const Sidebar = ({ onOpenPostModal }) => {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const navItems = [
    { name: "Home", path: "/home", icon: Home },
    { name: "Explore", path: "/explore", icon: Search },
    { name: "Messages", path: "/messages", icon: MessageSquare },
    { name: "Bookmarks", path: "/bookmarks", icon: Bookmark },
    { name: "Lists", path: "/lists", icon: ListTodo },
    { name: "Profile", path: "/profile", icon: UserIcon },
    { name: "More", path: "/more", icon: MoreHorizontal },
  ];

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex flex-col h-full justify-between p-3.5 bg-[#030712] border-r border-white/10 transition-all duration-300 ${
        isHovered ? "w-[260px]" : "w-[76px]"
      }`}
    >
      <div className="flex flex-col gap-6">
        {/* Logo and Menu Trigger Area */}
        <div className="flex items-center justify-between px-2 py-2 text-white h-10">
          {isHovered ? (
            <>
              <Link to="/home" className="flex items-center gap-2 group min-w-0 overflow-hidden">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-[#0066FF] to-[#3B82F6] flex-shrink-0"
                >
                  <Flame className="w-5 h-5 text-white" />
                </motion.div>
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="font-display font-bold text-lg tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent truncate"
                >
                  PulseStream
                </motion.span>
              </Link>
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-gray-400"
              >
                <Menu className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
              </motion.div>
            </>
          ) : (
            <div className="mx-auto text-gray-400 hover:text-white transition-colors cursor-pointer" title="Hover to expand">
              <Menu className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* Navigation List */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) => `
                  relative flex items-center gap-4 px-3 py-3 rounded-xl font-medium text-sm transition-all duration-200 group
                  ${isActive 
                    ? "text-white bg-gradient-to-r from-blue-600/20 to-transparent border-l-4 border-blue-500" 
                    : "text-gray-400 hover:text-white hover:bg-white/5"}
                  ${!isHovered ? "justify-center" : ""}
                `}
                title={!isHovered ? item.name : undefined}
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-blue-400" : ""}`} />
                    
                    {isHovered && (
                      <motion.span
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="truncate"
                      >
                        {item.name}
                      </motion.span>
                    )}

                    {isActive && isHovered && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-500"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Post CTA */}
        <button
          onClick={onOpenPostModal}
          id="sidebar-post-btn"
          className={`bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 font-display text-[15px] ${
            isHovered ? "w-full py-3 px-4" : "w-11 h-11 mx-auto p-0"
          }`}
          title="Post Now"
        >
          <PenSquare className="w-5 h-5 flex-shrink-0" />
          {isHovered && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="truncate"
            >
              Post Now
            </motion.span>
          )}
        </button>
      </div>

      {/* User Profile Switcher */}
      {currentUser && (
        <div className="flex flex-col gap-2">
          {/* Quick Sign Out option when expanded */}
          {isHovered && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await logout();
                  navigate("/home");
                } catch (err) {
                  console.error("Sign out failed:", err);
                }
              }}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-all w-full cursor-pointer justify-center border border-red-500/10 hover:border-red-500/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out @{currentUser.username}
            </button>
          )}

          <div 
            onClick={() => navigate(`/profile/${currentUser.username}`)}
            className={`flex items-center rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all duration-200 cursor-pointer group ${
              isHovered ? "p-3 w-full justify-between" : "p-1.5 w-11 h-11 mx-auto justify-center"
            }`}
            title={!isHovered ? currentUser.displayName : undefined}
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.displayName}
              className="w-8 h-8 rounded-full object-cover border border-white/10 group-hover:border-blue-500/50 transition-colors flex-shrink-0"
            />
            {isHovered && (
              <motion.div 
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col min-w-0 flex-1 ml-2 text-left"
              >
                <span className="text-xs font-bold text-white truncate leading-tight">{currentUser.displayName}</span>
                <span className="text-[10px] text-gray-400 truncate leading-tight mt-0.5">@{currentUser.username}</span>
              </motion.div>
            )}
            {isHovered && <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors flex-shrink-0 ml-1" />}
          </div>
        </div>
      )}
    </div>
  );
};
