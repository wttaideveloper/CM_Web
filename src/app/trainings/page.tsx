import AppShell from "@/components/layout/AppShell";

const filters = ["All Levels", "Beginner", "Intermediate", "Advanced"];

const courses = [
  {
    title: "Foundation Fitness Program",
    instructor: "Maya Chen",
    level: "Beginner",
    rating: "4.8",
    lessons: "18 lessons",
    weeks: "6 weeks",
    enrolled: "428 enrolled",
    gradient: "from-[#1f6a58] via-[#5a9b78] to-[#c3d8a6]",
  },
  {
    title: "Advanced Strength Training",
    instructor: "Jordan Miles",
    level: "Advanced",
    rating: "4.9",
    lessons: "24 lessons",
    weeks: "8 weeks",
    enrolled: "219 enrolled",
    gradient: "from-[#204f49] via-[#3f7c68] to-[#7fb08d]",
  },
  {
    title: "Mindful Movement Mastery",
    instructor: "Elena Park",
    level: "Intermediate",
    rating: "4.7",
    lessons: "16 lessons",
    weeks: "5 weeks",
    enrolled: "301 enrolled",
    gradient: "from-[#1d5a52] via-[#6e9687] to-[#b9d1c6]",
  },
  {
    title: "Nutrition for Athletes",
    instructor: "Samira Patel",
    level: "Intermediate",
    rating: "4.8",
    lessons: "20 lessons",
    weeks: "7 weeks",
    enrolled: "356 enrolled",
    gradient: "from-[#285c4e] via-[#799b61] to-[#d5bf72]",
  },
  {
    title: "Mental Performance Coaching",
    instructor: "Noah Brooks",
    level: "Advanced",
    rating: "4.9",
    lessons: "14 lessons",
    weeks: "4 weeks",
    enrolled: "188 enrolled",
    gradient: "from-[#173f3b] via-[#587f77] to-[#95b8b2]",
  },
  {
    title: "Flexibility & Mobility",
    instructor: "Ari Morgan",
    level: "Beginner",
    rating: "4.6",
    lessons: "12 lessons",
    weeks: "4 weeks",
    enrolled: "512 enrolled",
    gradient: "from-[#1f6a58] via-[#76a36d] to-[#b8c98d]",
  },
];

export default function TrainingsPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#06201c]">Training Management</h2>
          <p className="mt-1 text-sm text-[#52736a]">
            Create and manage training courses.
          </p>
        </div>
        <button className="h-12 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm">
          + Create Course
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input
            type="search"
            placeholder="Search courses..."
            className="h-12 w-full rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58] lg:max-w-sm"
          />
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a]"
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <article
            key={course.title}
            className="overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm"
          >
            <div
              className={`relative h-[180px] bg-gradient-to-br ${course.gradient} p-5`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.24)_0_1px,transparent_1px)] bg-[length:28px_28px]" />
              <span className="relative rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#1f6a58]">
                {course.level}
              </span>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold leading-tight text-[#06201c]">
                {course.title}
              </h3>
              <p className="mt-2 text-sm text-[#52736a]">Instructor: {course.instructor}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="font-bold text-[#1f6a58]">&#9733; {course.rating}</span>
                <span className="text-[#52736a]">
                  {course.lessons} &middot; {course.weeks}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-[#06201c]">
                {course.enrolled}
              </p>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
