/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  ListTodo, Users, Lock, Sparkles, Plus, 
  ArrowLeft, Trash2, Shield, Eye, Heart, MessageSquare, 
  Repeat, Loader2, Check, X, ShieldAlert
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

export const ListsView = () => {
  const navigate = useNavigate();
  const { 
    lists, 
    createList, 
    deleteList, 
    fetchListPosts, 
    likePost, 
    repostPost, 
    currentUser 
  } = useApp();

  const [selectedList, setSelectedList] = useState(null);
  const [listPosts, setListPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [newListName, setNewListName] = useState("");
  const [newListDesc, setNewListDesc] = useState("");
  const [newListPrivate, setNewListPrivate] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Load posts when a list is selected
  useEffect(() => {
    if (selectedList) {
      setLoadingPosts(true);
      fetchListPosts(selectedList.id)
        .then(posts => {
          setListPosts(posts);
        })
        .catch(err => {
          console.error("Failed to load list posts:", err);
        })
        .finally(() => {
          setLoadingPosts(false);
        });
    }
  }, [selectedList]);

  const handleCreateListSubmit = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) {
      setErrorMsg("List name is required");
      return;
    }
    setErrorMsg("");
    setIsSubmitting(true);
    try {
      await createList(newListName, newListDesc, selectedMembers, newListPrivate);
      setNewListName("");
      setNewListDesc("");
      setNewListPrivate(false);
      setSelectedMembers([]);
      setShowCreateModal(false);
    } catch (err) {
      setErrorMsg(err.message || "Failed to create list");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async (listId, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this list?")) {
      try {
        await deleteList(listId);
        if (selectedList?.id === listId) {
          setSelectedList(null);
        }
      } catch (err) {
        console.error("Failed to delete list:", err);
      }
    }
  };

  const toggleMemberSelection = (username) => {
    if (selectedMembers.includes(username)) {
      setSelectedMembers(prev => prev.filter(u => u !== username));
    } else {
      setSelectedMembers(prev => [...prev, username]);
    }
  };

  const isPostLiked = (post) => {
    return currentUser ? post.likes.includes(currentUser.username) : false;
  };

  const isPostReposted = (post) => {
    return currentUser ? post.reposts.includes(currentUser.username) : false;
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#030712] p-6 overflow-y-auto gap-6 scrollbar-thin relative">
      <AnimatePresence mode="wait">
        {!selectedList ? (
          // LIST INDEX VIEW
          <motion.div 
            key="list-index"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 15 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-6 w-full"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                  <ListTodo className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="font-display font-bold text-2xl text-white">Your Lists</h1>
                  <p className="text-xs text-gray-400 mt-0.5">Custom feeds curated by you</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] rounded-xl text-xs font-semibold text-white transition-all shadow-md hover:shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create List</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lists.length === 0 ? (
                <div className="col-span-full py-16 flex flex-col items-center justify-center text-center gap-3 border border-dashed border-white/10 rounded-3xl bg-[#090d1a]/20">
                  <ListTodo className="w-10 h-10 text-gray-600 animate-pulse" />
                  <span className="text-sm text-gray-400 font-medium">No lists found</span>
                  <p className="text-xs text-gray-500 max-w-xs leading-normal">
                    Create a curated feed of posts from specifically selected profiles.
                  </p>
                </div>
              ) : (
                lists.map((list) => (
                  <div 
                    key={list.id} 
                    onClick={() => setSelectedList(list)}
                    className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-blue-500/20 hover:bg-white/[0.05] transition-all flex items-center justify-between group cursor-pointer shadow-sm relative overflow-hidden"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-all">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                          {list.name}
                        </span>
                        {list.description && (
                          <span className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                            {list.description}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500 mt-1 font-mono uppercase tracking-wider">
                          {list.members.length} member{list.members.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {list.isPrivate ? (
                        <Lock className="w-4 h-4 text-gray-500" title="Private List" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-blue-400" title="Public List" />
                      )}
                      
                      {currentUser && list.ownerUsername === currentUser.username && (
                        <button
                          onClick={(e) => handleDeleteClick(list.id, e)}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete List"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          // DETAILED LIST CURATED FEED VIEW
          <motion.div 
            key="list-feed"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-6 w-full"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedList(null)}
                  className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-display font-bold text-2xl text-white">{selectedList.name}</h1>
                    {selectedList.isPrivate ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase bg-white/5 border border-white/10 px-2 py-0.5 rounded-full font-mono">
                        <Lock className="w-3 h-3 text-gray-400" /> Private
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400 uppercase bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full font-mono">
                        <Sparkles className="w-3 h-3 text-blue-400" /> Public
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {selectedList.description || `Feed curated by @${selectedList.ownerUsername}`}
                  </p>
                </div>
              </div>
              <span className="text-xs text-gray-500 font-mono">
                {selectedList.members.length} profile{selectedList.members.length !== 1 ? "s" : ""} Curated
              </span>
            </div>

            {loadingPosts ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <span className="text-sm text-gray-400">Assembling list feed...</span>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-white/10">
                {listPosts.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center gap-3 bg-[#090d1a]/20 border border-white/5 rounded-3xl">
                    <ShieldAlert className="w-10 h-10 text-gray-500" />
                    <span className="text-sm text-gray-400 font-medium">No posts available</span>
                    <p className="text-xs text-gray-500 max-w-xs leading-normal">
                      The members of this list ({selectedList.members.join(", ")}) haven't posted anything yet.
                    </p>
                  </div>
                ) : (
                  listPosts.map((post) => {
                    const liked = isPostLiked(post);
                    const reposted = isPostReposted(post);

                    return (
                      <motion.article
                        key={post.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-5 flex flex-col gap-3 hover:bg-white/[0.01] transition-colors"
                      >
                        {/* Post Author Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={post.author.avatar}
                              alt={post.author.displayName}
                              onClick={() => navigate(`/profile/${post.author.username}`)}
                              className="w-10 h-10 rounded-full object-cover border border-white/5 cursor-pointer hover:border-blue-500/50 transition-colors"
                            />
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span 
                                  onClick={() => navigate(`/profile/${post.author.username}`)}
                                  className="text-sm font-bold text-white hover:underline cursor-pointer"
                                >
                                  {post.author.displayName}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 truncate">
                                @{post.author.username} • {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="pl-13 flex flex-col gap-3">
                          <p 
                            onClick={() => navigate(`/posts/${post.id}`)}
                            className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap hover:text-white cursor-pointer transition-colors"
                          >
                            {post.content}
                          </p>

                          {/* Shared Image Attachment */}
                          {post.image && (
                            <div 
                              onClick={() => navigate(`/posts/${post.id}`)}
                              className="rounded-2xl overflow-hidden border border-white/5 max-h-96 cursor-pointer hover:border-white/10 transition-colors"
                            >
                              <img 
                                src={post.image} 
                                alt="Post media attachment" 
                                className="w-full h-full object-cover" 
                                loading="lazy"
                              />
                            </div>
                          )}

                          {/* Actions Panel */}
                          <div className="flex items-center justify-between text-gray-500 max-w-md mt-1 border-t border-b border-white/5 py-2">
                            {/* Comments action */}
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
                          </div>
                        </div>
                      </motion.article>
                    );
                  })
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE LIST MODAL DIALOG */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b0f19] border border-white/10 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.01]">
                <span className="font-display font-bold text-lg text-white">Create Curated List</span>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateListSubmit} className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">List Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Design Leaders" 
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:bg-white/[0.06] transition-all"
                    maxLength={35}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Description (Optional)</label>
                  <textarea 
                    placeholder="What is this feed about?" 
                    value={newListDesc}
                    onChange={(e) => setNewListDesc(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:bg-white/[0.06] transition-all h-20 resize-none"
                    maxLength={100}
                  />
                </div>

                {/* Privacy checkbox */}
                <div 
                  onClick={() => setNewListPrivate(prev => !prev)}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">Private List</span>
                      <span className="text-[10px] text-gray-400">Only visible to you</span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                    newListPrivate ? "bg-blue-600 border-blue-600 text-white" : "border-white/20 text-transparent"
                  }`}>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>

                {/* Select member profiles to curate */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Select Curated Members</label>
                  <div className="flex flex-col gap-2.5 max-h-36 overflow-y-auto pr-1">
                    <div 
                      onClick={() => toggleMemberSelection("aarish_master")}
                      className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <img 
                          src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&h=150&q=80" 
                          className="w-7 h-7 rounded-full object-cover" 
                          alt="Aarish"
                        />
                        <span className="text-xs font-bold text-white">Aarish (@aarish_master)</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                        selectedMembers.includes("aarish_master") ? "bg-blue-600 border-blue-600 text-white" : "border-white/20 text-transparent"
                      }`}>
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    </div>
                  </div>
                </div>

                {errorMsg && (
                  <span className="text-xs text-red-400 font-semibold text-center">{errorMsg}</span>
                )}

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-lg hover:shadow-blue-500/10 flex items-center justify-center gap-2 mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating List...</span>
                    </>
                  ) : (
                    <span>Create Curated List</span>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
