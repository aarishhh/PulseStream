/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  MapPin, 
  Calendar, 
  Link as LinkIcon, 
  MoreHorizontal, 
  Mail, 
  CheckCircle, 
  Heart, 
  MessageSquare, 
  Repeat, 
  Eye,
  X,
  ArrowLeft,
  Loader2,
  UserCheck,
  UserPlus,
  Bookmark,
  Trash2
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";

export const ProfileView = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { currentUser, posts, updateProfile, toggleFollow, likePost, repostPost, bookmarkPost, bookmarks, deletePost } = useApp();
  
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");
  const [showEditModal, setShowEditModal] = useState(false);

  // Follow list modal state
  const [showFollowListModal, setShowFollowListModal] = useState(false);
  const [followListTab, setFollowListTab] = useState("followers");
  const [followListUsers, setFollowListUsers] = useState([]);
  const [loadingFollowList, setLoadingFollowList] = useState(false);

  // Edit fields
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editWebsite, setEditWebsite] = useState("");

  const isOwnProfile = !username || username === currentUser?.username;

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const targetUsername = isOwnProfile ? currentUser?.username : username;
      if (!targetUsername) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/users/${targetUsername}`);
        if (res.ok) {
          const data = await res.json();
          setUserProfile(data);
        } else {
          setUserProfile(null);
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username, isOwnProfile]);

  // Keep user profile silently in sync with currentUser when viewing own profile without showing a full page loading spinner
  useEffect(() => {
    if (isOwnProfile && currentUser) {
      setUserProfile(currentUser);
    }
  }, [currentUser, isOwnProfile]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    await updateProfile({
      displayName: editDisplayName,
      bio: editBio,
      location: editLocation,
      website: editWebsite,
    });
    setShowEditModal(false);
  };

  const handleFollowClick = async () => {
    if (!userProfile) return;
    await toggleFollow(userProfile.username);
    // Refresh user profile after following
    try {
      const res = await fetch(`/api/users/${userProfile.username}`);
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFollowList = async (tab) => {
    if (!userProfile) return;
    setLoadingFollowList(true);
    const usernames = tab === "followers" ? userProfile.followers : userProfile.following;
    if (!usernames || usernames.length === 0) {
      setFollowListUsers([]);
      setLoadingFollowList(false);
      return;
    }
    try {
      const res = await fetch("/api/users/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames }),
      });
      if (res.ok) {
        const data = await res.json();
        setFollowListUsers(data);
      }
    } catch (err) {
      console.error("Error fetching follow list users:", err);
    } finally {
      setLoadingFollowList(false);
    }
  };

  useEffect(() => {
    if (showFollowListModal) {
      fetchFollowList(followListTab);
    }
  }, [followListTab, showFollowListModal, userProfile?.followers, userProfile?.following]);

  const handleFollowListItemToggle = async (targetUsername) => {
    await toggleFollow(targetUsername);
    // Refresh user profile so stats update in the background
    if (userProfile) {
      try {
        const resProfile = await fetch(`/api/users/${userProfile.username}`);
        if (resProfile.ok) {
          const updatedProfile = await resProfile.json();
          setUserProfile(updatedProfile);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleMessageClick = () => {
    if (!userProfile) return;
    navigate("/messages", { state: { selectContact: userProfile } });
  };

  const tabs = [
    { id: "posts", name: "Posts" },
    { id: "media", name: "Media" },
    { id: "likes", name: "Likes" }
  ];

  // Filter posts based on active profile tab
  const getFilteredProfilePosts = () => {
    if (!userProfile) return [];
    
    switch (activeTab) {
      case "posts":
        return posts.filter(p => p.author.username === userProfile.username);
      case "media":
        return posts.filter(p => p.author.username === userProfile.username && p.image);
      case "likes":
        return posts.filter(p => p.likes.includes(userProfile.username));
      default:
        return [];
    }
  };

  const filteredPosts = getFilteredProfilePosts();

  const isFollowingUser = () => {
    if (!userProfile || !currentUser) return false;
    return currentUser.following.includes(userProfile.username);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400 h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-xs font-medium">Loading profile stream...</span>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center gap-3 text-gray-400 h-full">
        <ArrowLeft className="w-10 h-10 text-gray-600 cursor-pointer hover:text-white" onClick={() => navigate(-1)} />
        <span className="text-lg font-bold text-white font-display">User Not Found</span>
        <p className="text-xs text-gray-500 max-w-xs">
          The requested profile @{username} does not exist or may have been deactivated.
        </p>
        <button
          onClick={() => navigate("/home")}
          className="mt-2 px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
        >
          Return Home
        </button>
      </div>
    );
  }

  const following = isFollowingUser();

  return (
    <div className="flex flex-col w-full h-full bg-[#030712] overflow-y-auto">
      {/* Top sticky back-button header when viewing other profiles */}
      {!isOwnProfile && (
        <div className="p-4 border-b border-white/10 flex items-center gap-4 bg-black/10 backdrop-blur sticky top-0 z-40">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-white font-display">{userProfile.displayName}</h2>
            <span className="text-[10px] text-gray-500">@{userProfile.username}</span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="h-44 relative w-full border-b border-white/5 bg-gradient-to-tr from-blue-900/40 via-purple-900/20 to-black overflow-hidden flex-shrink-0">
        <img 
          src={userProfile.banner} 
          alt="Profile banner" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
      </div>

      {/* Profile Quick Stats */}
      <div className="px-6 pb-4 relative flex flex-col gap-4">
        
        {/* Avatar & Action Button Row */}
        <div className="flex justify-between items-end -mt-12 z-10">
          <div className="relative">
            <img
              src={userProfile.avatar}
              alt={userProfile.displayName}
              className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover border-4 border-[#030712] shadow-2xl bg-[#030712]"
            />
            <span className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#030712] shadow-md" />
          </div>

          <div className="flex items-center gap-2">
            {!isOwnProfile ? (
              <>
                <button 
                  onClick={handleMessageClick}
                  className="p-2.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                  title="Direct Message"
                >
                  <Mail className="w-5 h-5" />
                </button>
                <button
                  onClick={handleFollowClick}
                  className={`px-5 py-2 rounded-full font-bold text-sm transition-all duration-200 flex items-center gap-1.5 shadow-md ${
                    following
                      ? "bg-white/10 text-white hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/30 border border-white/5"
                      : "bg-white text-black hover:bg-gray-200"
                  }`}
                >
                  {following ? (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button className="p-2.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => {
                    setEditDisplayName(userProfile.displayName);
                    setEditBio(userProfile.bio);
                    setEditLocation(userProfile.location);
                    setEditWebsite(userProfile.website);
                    setShowEditModal(true);
                  }}
                  className="px-5 py-2 rounded-full bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-colors"
                >
                  Edit profile
                </button>
              </>
            )}
          </div>
        </div>

        {/* Profile Info Details */}
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex items-center gap-1.5">
            <h1 className="font-display font-bold text-2xl text-white tracking-tight leading-none">
              {userProfile.displayName}
            </h1>
            {userProfile.verified && (
              <CheckCircle className="w-5 h-5 text-blue-500 fill-blue-500" />
            )}
          </div>
          <span className="text-sm text-gray-500 font-mono">@{userProfile.username}</span>
          
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap mt-1">
            {userProfile.bio}
          </p>

          {/* Location, website, joined metadata */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-xs text-gray-400">
            {userProfile.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-500" />
                <span>{userProfile.location}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              <span>Joined {userProfile.joinedDate}</span>
            </div>
            {userProfile.website && (
              <a 
                href={`https://${userProfile.website}`}
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:underline"
              >
                <LinkIcon className="w-3.5 h-3.5 text-blue-500" />
                <span>{userProfile.website}</span>
              </a>
            )}
          </div>

          {/* Followers & Following counts */}
          <div className="flex items-center gap-4 mt-2.5 text-xs">
            <button 
              onClick={() => {
                setFollowListTab("following");
                setShowFollowListModal(true);
              }}
              className="flex items-center gap-1 hover:underline transition-all cursor-pointer text-left focus:outline-none"
            >
              <span className="font-bold text-white">{userProfile.following.length}</span>
              <span className="text-gray-400">Following</span>
            </button>
            <button 
              onClick={() => {
                setFollowListTab("followers");
                setShowFollowListModal(true);
              }}
              className="flex items-center gap-1 hover:underline transition-all cursor-pointer text-left focus:outline-none"
            >
              <span className="font-bold text-white">{userProfile.followers.length}</span>
              <span className="text-gray-400">Followers</span>
            </button>
          </div>

        </div>

      </div>

      {/* Tab Selection */}
      <div className="flex border-b border-white/10 sticky top-14 bg-[#030712]/90 backdrop-blur-md z-30 mt-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-3.5 text-xs font-semibold relative text-center transition-colors"
          >
            <span className={activeTab === tab.id ? "text-white" : "text-gray-400 hover:text-white"}>
              {tab.name}
            </span>
            {activeTab === tab.id && (
              <motion.div
                layoutId="profileTabLine"
                className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-500"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Profile Tabbed Feed */}
      <div className="flex flex-col divide-y divide-white/10">
        {filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
            <span className="text-gray-500 font-medium text-sm">No items in this tab yet</span>
            <p className="text-xs text-gray-500 max-w-xs">Publish posts with media or like other feed posts to see lists here.</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <div 
              key={post.id} 
              className="p-4 flex flex-col gap-3 hover:bg-white/[0.01] transition-colors"
            >
              <div className="flex items-center gap-3">
                <img
                  src={post.author.avatar}
                  alt={post.author.displayName}
                  className="w-9 h-9 rounded-full object-cover cursor-pointer"
                  onClick={() => navigate(`/profile/${post.author.username}`)}
                />
                <div className="flex flex-col">
                  <span 
                    className="text-sm font-bold text-white hover:underline cursor-pointer"
                    onClick={() => navigate(`/profile/${post.author.username}`)}
                  >
                    {post.author.displayName}
                  </span>
                  <span className="text-[10px] text-gray-400">@{post.author.username} • {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              <p 
                onClick={() => navigate(`/posts/${post.id}`)}
                className="text-sm text-gray-300 leading-relaxed pl-12 hover:text-white cursor-pointer transition-colors"
              >
                {post.content}
              </p>
              
              {post.image && (
                <div 
                  onClick={() => navigate(`/posts/${post.id}`)}
                  className="rounded-xl overflow-hidden max-h-64 mt-1 pl-12 cursor-pointer"
                >
                  <img src={post.image} alt="Attachment" className="w-full h-full object-cover" />
                </div>
              )}

              {(() => {
                const liked = currentUser ? post.likes.includes(currentUser.username) : false;
                const reposted = currentUser ? post.reposts.includes(currentUser.username) : false;
                const isBookmarked = bookmarks.some((b) => b.id === post.id);
                const isOwnPost = currentUser ? post.author.username.toLowerCase() === currentUser.username.toLowerCase() : false;
                return (
                  <div className="flex items-center justify-between text-gray-500 mt-3 pl-12 max-w-md">
                    {/* Comment action */}
                    <button 
                      onClick={() => navigate(`/posts/${post.id}`)}
                      className="flex items-center gap-1.5 text-xs hover:text-blue-400 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{post.comments.length}</span>
                    </button>

                    {/* Repost action */}
                    <button 
                      onClick={() => repostPost(post.id)}
                      className={`flex items-center gap-1.5 text-xs hover:text-emerald-400 transition-colors ${
                        reposted ? "text-emerald-400" : ""
                      }`}
                    >
                      <Repeat className={`w-4 h-4 transition-transform duration-200 ${reposted ? "rotate-180" : ""}`} />
                      <span>{post.reposts.length}</span>
                    </button>

                    {/* Like action */}
                    <button 
                      onClick={() => likePost(post.id)}
                      className={`flex items-center gap-1.5 text-xs hover:text-rose-500 transition-colors ${
                        liked ? "text-rose-500" : ""
                      }`}
                    >
                      <motion.div
                        whileTap={{ scale: 0.8 }}
                        animate={liked ? { scale: [1, 1.45, 0.9, 1.15, 1] } : { scale: 1 }}
                        transition={{ duration: 0.45, ease: "easeInOut" }}
                        className="flex items-center justify-center"
                      >
                        <Heart className={`w-4 h-4 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
                      </motion.div>
                      <span>{post.likes.length}</span>
                    </button>

                    {/* Views action */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <Eye className="w-4 h-4" />
                      <span>{post.views >= 1000 ? `${(post.views / 1000).toFixed(1)}K` : post.views}</span>
                    </div>

                    {/* Bookmark action */}
                    <button 
                      onClick={() => bookmarkPost(post.id)}
                      className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${
                        isBookmarked ? "text-yellow-500 hover:text-yellow-400" : "text-gray-500 hover:text-yellow-500"
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-yellow-500" : ""}`} />
                    </button>

                    {/* Delete action */}
                    {isOwnPost && (
                      <button 
                        onClick={async () => {
                          if (window.confirm("Are you sure you want to delete this post?")) {
                            try {
                              await deletePost(post.id);
                            } catch (err) {
                              alert(err.message || "Failed to delete post");
                            }
                          }
                        }}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-white/5 transition-colors"
                        title="Delete Post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          ))
        )}
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.form
              onSubmit={handleEditSubmit}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md p-6 glass-card rounded-2xl shadow-2xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-display font-semibold text-lg text-white">Edit Profile</h3>
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400">Display Name</label>
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400">Bio</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    rows={3}
                    className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400">Location</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400">Website</label>
                  <input
                    type="text"
                    value={editWebsite}
                    onChange={(e) => setEditWebsite(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-900/30 transition-all"
              >
                Save Changes
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Followers / Following List Modal */}
      <AnimatePresence>
        {showFollowListModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md h-[450px] flex flex-col glass-card rounded-2xl shadow-2xl overflow-hidden border border-white/10"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/20 flex-shrink-0">
                <div className="flex gap-4">
                  <button
                    onClick={() => setFollowListTab("followers")}
                    className={`text-sm font-bold relative pb-1 transition-colors focus:outline-none cursor-pointer ${
                      followListTab === "followers" ? "text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <span>Followers</span>
                    {followListTab === "followers" && (
                      <motion.div
                        layoutId="modalTabLine"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                      />
                    )}
                  </button>
                  <button
                    onClick={() => setFollowListTab("following")}
                    className={`text-sm font-bold relative pb-1 transition-colors focus:outline-none cursor-pointer ${
                      followListTab === "following" ? "text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <span>Following</span>
                    {followListTab === "following" && (
                      <motion.div
                        layoutId="modalTabLine"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                      />
                    )}
                  </button>
                </div>
                <button
                  onClick={() => setShowFollowListModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content List */}
              <div className="flex-1 overflow-y-auto p-4 scrollbar-none flex flex-col gap-3 bg-[#030712]/45">
                {loadingFollowList ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    <span className="text-[10px] font-mono tracking-wider">RESOLVING USERS...</span>
                  </div>
                ) : followListUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center gap-2 px-4">
                    <span className="text-gray-400 font-medium text-sm">No users found</span>
                    <p className="text-xs text-gray-500 leading-normal max-w-xs">
                      {followListTab === "followers"
                        ? "No followers to display yet. Follow other active users to get noticed!"
                        : "Not following anyone yet. Visit home or follow pages to discover creators!"}
                    </p>
                  </div>
                ) : (
                  followListUsers.map((user) => {
                    const isSelf = user.username === currentUser?.username;
                    const followingItem = currentUser?.following.includes(user.username);
                    return (
                      <div
                        key={user.username}
                        className="flex items-start justify-between gap-3 p-2.5 rounded-xl hover:bg-white/[0.02] border border-white/0 hover:border-white/5 transition-all"
                      >
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <img
                            src={user.avatar}
                            alt={user.displayName}
                            onClick={() => {
                              setShowFollowListModal(false);
                              navigate(`/profile/${user.username}`);
                            }}
                            className="w-10 h-10 rounded-full object-cover border border-white/5 cursor-pointer hover:border-blue-500/50 transition-colors"
                          />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span
                              onClick={() => {
                                setShowFollowListModal(false);
                                navigate(`/profile/${user.username}`);
                              }}
                              className="text-xs font-bold text-white hover:underline cursor-pointer flex items-center gap-1"
                            >
                              {user.displayName}
                              {user.verified && (
                                <span className="w-3.5 h-3.5 rounded-full bg-blue-500 inline-flex items-center justify-center text-[8px] font-bold text-white">✓</span>
                              )}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono font-medium">@{user.username}</span>
                            {user.bio && (
                              <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                                {user.bio}
                              </p>
                            )}
                          </div>
                        </div>

                        {!isSelf && (
                          <button
                            onClick={() => handleFollowListItemToggle(user.username)}
                            className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold transition-all flex-shrink-0 focus:outline-none ${
                              followingItem
                                ? "bg-white/10 text-white hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/30 border border-white/5"
                                : "bg-white text-black hover:bg-gray-200"
                            }`}
                          >
                            {followingItem ? "Following" : "Follow"}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
