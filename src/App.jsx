/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext.jsx";
import { Sidebar } from "./components/Sidebar.jsx";
import { Header } from "./components/Header.jsx";
import { RightWidgets } from "./components/RightWidgets.jsx";
import { HomeFeed } from "./components/HomeFeed.jsx";
import { ExploreView } from "./components/ExploreView.jsx";
import { ProfileView } from "./components/ProfileView.jsx";
import { MessagesView } from "./components/MessagesView.jsx";
import { PostDetailView } from "./components/PostDetailView.jsx";
import { BookmarksView } from "./components/BookmarksView.jsx";
import { ListsView } from "./components/ListsView.jsx";
import { MoreView } from "./components/MoreView.jsx";
import { FollowSuggestionsView } from "./components/FollowSuggestionsView.jsx";
import { SearchView } from "./components/SearchView.jsx";
import { motion, AnimatePresence } from "motion/react";
import { PenSquare, X, Loader2 } from "lucide-react";
import { useApp } from "./context/AppContext.jsx";
import { AuthView } from "./components/AuthView.jsx";

// Quick wrapper for quick-post modal inside layout
const MainLayout = () => {
  const { createPost, currentUser, loading } = useApp();
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [modalImage, setModalImage] = useState(null);
  const [isModalSubmitting, setIsModalSubmitting] = useState(false);

  if (loading) {
    return (
      <div id="loading-splash-screen" className="h-screen w-full bg-[#030712] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 font-mono text-xs animate-pulse tracking-widest uppercase">Synchronizing Stream Pulse...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView />;
  }

  const handleModalPost = async () => {
    if (!modalContent.trim() && !modalImage) return;
    setIsModalSubmitting(true);
    try {
      await createPost(modalContent, modalImage || undefined);
      setModalContent("");
      setModalImage(null);
      setIsPostModalOpen(false);
    } catch (err) {
      console.error("Modal Post creation failed:", err);
    } finally {
      setIsModalSubmitting(false);
    }
  };

  const handleModalImageUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setModalImage(event.target.result);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#030712] text-gray-200 overflow-hidden font-sans">
      
      {/* 1. Left Sidebar Column (collapsible with transition, hidden on mobile) */}
      <aside className="hidden md:flex h-full z-20 flex-shrink-0">
        <Sidebar onOpenPostModal={() => setIsPostModalOpen(true)} />
      </aside>

      {/* 2. Central Content Column (occupies remaining space) */}
      <main className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <Header />
        
        {/* Dynamic Route Container */}
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomeFeed />} />
            <Route path="/explore" element={<ExploreView />} />
            <Route path="/profile" element={<ProfileView />} />
            <Route path="/profile/:username" element={<ProfileView />} />
            <Route path="/messages" element={<MessagesView />} />
            <Route path="/posts/:id" element={<PostDetailView />} />
            <Route path="/bookmarks" element={<BookmarksView />} />
            <Route path="/lists" element={<ListsView />} />
            <Route path="/more" element={<MoreView />} />
            <Route path="/follow" element={<FollowSuggestionsView />} />
            <Route path="/search" element={<SearchView />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </div>
      </main>

      {/* 3. Right Sidebar Column (hidden on md/mobile) */}
      <aside className="hidden lg:flex w-[320px] xl:w-[350px] h-full z-20 flex-shrink-0">
        <RightWidgets />
      </aside>

      {/* Quick Creator Dialog */}
      <AnimatePresence>
        {isPostModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-lg p-5 glass-card rounded-2xl shadow-2xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-display font-semibold text-lg text-white flex items-center gap-2">
                  <PenSquare className="w-5 h-5 text-blue-500" />
                  Compose Post
                </h3>
                <button 
                  onClick={() => setIsPostModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <textarea
                value={modalContent}
                onChange={(e) => setModalContent(e.target.value)}
                placeholder="What's the pulse? (supports trending tags like #TechInnovation...)"
                rows={4}
                className="w-full bg-transparent border-0 text-white placeholder-gray-500 focus:ring-0 focus:outline-none resize-none text-base leading-relaxed"
                required
              />

              {modalImage && (
                <div className="relative rounded-xl overflow-hidden max-h-48 border border-white/10">
                  <img src={modalImage} alt="Post preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setModalImage(null)}
                    className="absolute top-2 right-2 p-1 bg-black/60 rounded-full hover:bg-black/95 text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                <div className="flex items-center gap-2">
                  <label className="p-2 rounded-xl hover:bg-blue-500/10 text-blue-400 cursor-pointer transition-colors">
                    <span className="text-xs font-semibold">Add Image</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleModalImageUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>

                <button
                  onClick={handleModalPost}
                  disabled={isModalSubmitting || (!modalContent.trim() && !modalImage)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-full font-bold text-sm text-white transition-all shadow-md hover:shadow-lg hover:shadow-blue-900/30 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                >
                  {isModalSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Publish</span>
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

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </BrowserRouter>
  );
}
