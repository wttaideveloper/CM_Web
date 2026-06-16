export default function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[#e3eee9] bg-white/95 px-6 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1f6a58] text-white">
          <svg
            aria-hidden="true"
            className="h-6 w-6"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M25 7C15.2 7.9 8.3 13.6 7.6 23.7C15.7 24.2 23.1 18.8 25 7Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8.5 22.8C12 19.4 15.4 17.5 20 16.6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-[#07352d]">Invigorate Health</h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#52736a] hover:bg-[#f1f7f4]"
          aria-label="Notifications"
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13.7 21a2 2 0 0 1-3.4 0"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#52736a] hover:bg-[#f1f7f4]"
          aria-label="Settings"
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" />
            <path
              d="M19 13.5a7.8 7.8 0 0 0 0-3l2-1.5-2-3.4-2.4 1a8.5 8.5 0 0 0-2.6-1.5L13.7 2h-3.4L10 5.1a8.5 8.5 0 0 0-2.6 1.5l-2.4-1-2 3.4 2 1.5a7.8 7.8 0 0 0 0 3L3 15l2 3.4 2.4-1a8.5 8.5 0 0 0 2.6 1.5l.3 3.1h3.4l.3-3.1a8.5 8.5 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.5Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1f6a58] text-sm font-bold text-white">
          SJ
        </div>
      </div>
    </header>
  );
}
