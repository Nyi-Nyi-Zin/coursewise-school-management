export const portalText = {
  en: {
    home: "Home",
    overview: "Overview",
    courses: "Courses & batches",
    students: "Students",
    announcements: "Announcements",
    lessons: "Lessons",
    assignments: "Assignments",
    quizzes: "Quizzes",
    attendance: "Attendance",
    progress: "Progress",
    gradebook: "Gradebook",
    notifications: "Notifications",
    profile: "Profile",
    settings: "Settings",
    signOut: "Sign out",
    myProfile: "My profile",
    management: "Management",
    connected: "Firebase connected",
    offlineReady: "Offline-ready mode",
    language: "Language",
    theme: "Theme",
  },
  my: {
    home: "ပင်မစာမျက်နှာ",
    overview: "အနှစ်ချုပ်",
    courses: "သင်တန်းနှင့် Batch",
    students: "ကျောင်းသားများ",
    announcements: "ကြေညာချက်များ",
    lessons: "သင်ခန်းစာများ",
    assignments: "တာဝန်များ",
    quizzes: "မေးခွန်းစစ်ဆေးမှုများ",
    attendance: "တက်ရောက်မှု",
    progress: "တိုးတက်မှု",
    gradebook: "အမှတ်စာရင်း",
    notifications: "အကြောင်းကြားချက်များ",
    profile: "ကိုယ်ရေးအချက်အလက်",
    settings: "ဆက်တင်များ",
    signOut: "ထွက်မည်",
    myProfile: "ကိုယ်ရေးအချက်အလက်",
    management: "စီမံခန့်ခွဲမှု",
    connected: "Firebase ချိတ်ဆက်ပြီး",
    offlineReady: "Offline-ready mode",
    language: "ဘာသာစကား",
    theme: "ပုံစံ",
  },
} as const;

export type PortalLocale = keyof typeof portalText;
export type PortalTextKey = keyof typeof portalText.en;

export function translatePortalText(locale: PortalLocale, key: PortalTextKey) {
  return portalText[locale][key] ?? portalText.en[key];
}
