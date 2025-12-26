import React from 'react';
import { Subject } from '../types';
import { SUBJECT_ICONS, AVATAR_URLS } from '../constants';

interface SidebarProps {
  currentSubject: Subject;
  onSelectSubject: (s: Subject) => void;
  onClearHistory: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentSubject, onSelectSubject, onClearHistory, isOpen, onClose }) => {
  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Drawer */}
      <aside className={`
        fixed md:relative z-50 md:z-auto
        top-0 bottom-0 left-0
        w-[80%] max-w-[320px] md:w-80
        flex flex-col flex-shrink-0
        glass-panel 
        rounded-r-[2.5rem] md:rounded-[2.5rem] rounded-l-none md:rounded-l-[2.5rem]
        shadow-glass 
        bg-white/85 backdrop-blur-md border border-white/70 overflow-hidden
        transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-8 flex flex-col h-full justify-between">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative group cursor-pointer">
                  <div 
                    className="bg-center bg-no-repeat bg-cover rounded-full size-16 border-4 border-[#C8E6C9] shadow-md transition-transform transform group-hover:scale-105" 
                    style={{ backgroundImage: `url("${AVATAR_URLS.academy}")` }}
                  >
                  </div>
                  <div className="absolute bottom-0 right-0 bg-[#C8E6C9] size-4 rounded-full border-2 border-white"></div>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-[#333333] text-xl font-bold leading-tight font-display">Smart Academy</h1>
                  <p className="text-[#666666] text-xs font-medium uppercase tracking-wider font-body">Class 7 Learning Pal</p>
                </div>
              </div>
              <button onClick={onClose} className="md:hidden p-2 rounded-full hover:bg-black/5 text-[#666666]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="h-px w-full bg-[#F5F5F5]"></div>
            
            <nav className="flex flex-col gap-3 overflow-y-auto pr-3 max-h-[calc(100vh-250px)]">
              {Object.values(Subject).map((subject) => {
                const isActive = currentSubject === subject;
                return (
                  <button
                    key={subject}
                    onClick={() => onSelectSubject(subject)}
                    className={`flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all group relative overflow-hidden font-body text-left flex-shrink-0 ${
                      isActive 
                        ? 'bg-[#FFCDD2] shadow-md border border-[#E1BEE7]/50' 
                        : 'hover:bg-[#FFECB3]/50 text-[#666666] hover:text-[#333333]'
                    }`}
                  >
                    {isActive && <div className="absolute left-0 top-0 h-full w-2 bg-[#E1BEE7] rounded-l-xl"></div>}
                    <span className={`material-symbols-outlined text-2xl ${isActive ? 'text-[#E1BEE7]' : 'text-[#C8E6C9]'}`}>
                      {SUBJECT_ICONS[subject]}
                    </span>
                    <span className={`text-base font-semibold ${isActive ? 'text-white' : ''}`}>
                      {subject}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-[#F5F5F5]">
            <button 
              onClick={onClearHistory}
              className="flex items-center gap-3 px-5 py-3.5 rounded-xl hover:bg-[#FFCDD2]/30 text-[#666666] hover:text-[#FFCDD2] transition-colors w-full group font-body"
            >
              <span className="material-symbols-outlined group-hover:animate-none text-2xl">delete_sweep</span>
              <span className="text-base font-bold">Clear All Fun</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;