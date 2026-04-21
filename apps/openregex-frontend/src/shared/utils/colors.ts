const groupColors = [
  {
    base: 'bg-blue-500/15 ring-1 ring-inset ring-blue-400/40 text-blue-900 dark:bg-[#70C1FF]/15 dark:ring-[#70C1FF]/30 dark:text-[#70C1FF] box-decoration-clone',
    active: 'bg-blue-500/40 ring-2 ring-inset ring-blue-500 text-blue-950 dark:bg-[#70C1FF]/30 dark:ring-[#70C1FF]/60 dark:text-[#FFFFFF] dark:shadow-[0_0_8px_rgba(112,193,255,0.4)] z-10 relative box-decoration-clone'
  },
  {
    base: 'bg-pink-500/15 ring-1 ring-inset ring-pink-400/40 text-pink-900 dark:bg-[#E082BD]/15 dark:ring-[#E082BD]/30 dark:text-[#E082BD] box-decoration-clone',
    active: 'bg-pink-500/40 ring-2 ring-inset ring-pink-500 text-pink-950 dark:bg-[#E082BD]/30 dark:ring-[#E082BD]/60 dark:text-[#FFFFFF] dark:shadow-[0_0_8px_rgba(224,130,189,0.4)] z-10 relative box-decoration-clone'
  },
  {
    base: 'bg-purple-500/15 ring-1 ring-inset ring-purple-400/40 text-purple-900 dark:bg-[#9D8BFF]/15 dark:ring-[#9D8BFF]/30 dark:text-[#9D8BFF] box-decoration-clone',
    active: 'bg-purple-500/40 ring-2 ring-inset ring-purple-500 text-purple-950 dark:bg-[#9D8BFF]/30 dark:ring-[#9D8BFF]/60 dark:text-[#FFFFFF] dark:shadow-[0_0_8px_rgba(157,139,255,0.4)] z-10 relative box-decoration-clone'
  },
  {
    base: 'bg-amber-500/15 ring-1 ring-inset ring-amber-400/40 text-amber-900 dark:bg-[#E8D580]/15 dark:ring-[#E8D580]/30 dark:text-[#E8D580] box-decoration-clone',
    active: 'bg-amber-500/40 ring-2 ring-inset ring-amber-500 text-amber-950 dark:bg-[#E8D580]/30 dark:ring-[#E8D580]/60 dark:text-[#FFFFFF] dark:shadow-[0_0_8px_rgba(232,213,128,0.4)] z-10 relative box-decoration-clone'
  },
  {
    base: 'bg-teal-500/15 ring-1 ring-inset ring-teal-400/40 text-teal-900 dark:bg-[#5EEAD4]/15 dark:ring-[#5EEAD4]/30 dark:text-[#5EEAD4] box-decoration-clone',
    active: 'bg-teal-500/40 ring-2 ring-inset ring-teal-500 text-teal-950 dark:bg-[#5EEAD4]/30 dark:ring-[#5EEAD4]/60 dark:text-[#FFFFFF] dark:shadow-[0_0_8px_rgba(94,234,212,0.4)] z-10 relative box-decoration-clone'
  },
  {
    base: 'bg-rose-500/15 ring-1 ring-inset ring-rose-400/40 text-rose-900 dark:bg-[#FDA4AF]/15 dark:ring-[#FDA4AF]/30 dark:text-[#FDA4AF] box-decoration-clone',
    active: 'bg-rose-500/40 ring-2 ring-inset ring-rose-500 text-rose-950 dark:bg-[#FDA4AF]/30 dark:ring-[#FDA4AF]/60 dark:text-[#FFFFFF] dark:shadow-[0_0_8px_rgba(253,164,175,0.4)] z-10 relative box-decoration-clone'
  }
];

export const getGroupColorClasses = (id: number, isActive: boolean, isDimmed: boolean = false) => {
  const c = groupColors[(id - 1) % groupColors.length];
  const baseClass = isActive ? c.active : c.base;
  const opacityClass = isDimmed && !isActive ? 'opacity-40 saturate-[0.8]' : 'opacity-100';
  return `${baseClass} ${opacityClass} transition-all duration-300`;
};

export const getInspectorColor = (id: number) => {
  return groupColors[(id - 1) % groupColors.length];
};