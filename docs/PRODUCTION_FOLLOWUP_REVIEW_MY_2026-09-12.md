# Production မတင်မီ ထပ်မံစစ်ဆေးမှုရလဒ်

စစ်ဆေးသည့်နေ့ — ၂၀၂၆ စက်တင်ဘာ ၁၂၊ မြန်မာစံတော်ချိန် ည ၁၁:၃၅ ဝန်းကျင်။

Code baseline — `30ad033` နှင့် ရှိပြီးသား admin UI ပြင်ဆင်ချက်များ။ Firebase project — `student-management-syste-e8dbb`၊ database — `(default)`၊ region — `asia-southeast1`။

ဤစစ်ဆေးမှုတွင် live Firebase data/configuration ကို ဖတ်စစ်ခဲ့ပြီး application function အစစ်များကို သီးခြား test data ဖြင့် စမ်းသပ်ခဲ့သည်။ Production data၊ cloud settings၊ application code နှင့် deployment များကို မပြောင်းထားပါ။ Secret value၊ student အမည်နှင့် email များကို report ထဲ မထည့်ထားပါ။

## အဓိကရလဒ်

| စစ်ဆေးသည့်အချက် | အတည်ပြုရလဒ် |
|---|---|
| Batch အလိုက် progress | Bug ကို သီးခြားစမ်းသပ်၍ အတည်ပြုနိုင်သည်။ လက်ရှိ live data မှာ batch ရောတွက်မှု ဖြစ်နေသော selected student မတွေ့သေး။ |
| Enrollment data | Live profile enrollment reference ၃ ခုနှင့် selected course/batch reference ၁ ခုသည် လက်ရှိ enrollment record နှင့် မကိုက်ညီ။ |
| Cloudinary preset | Local config နှင့် client-side limits ကို အတည်ပြုနိုင်သည်။ Provider preset ဖတ်ရန် Admin API access မရှိ၊ GET request က 401 ပြန်လာသည်။ |
| Deployment dependency lock | App နှစ်ခုလုံး frozen install စမ်းသပ်ရာ `ERR_PNPM_OUTDATED_LOCKFILE` ဖြစ်သည်။ |
| Backup/restore | Firestore managed backup schedule ၀၊ backup ၀၊ PITR ပိတ်၊ database deletion protection ပိတ်။ Restore drill မလုပ်ထား။ |
| Monitoring | Google Cloud alert policy ၀၊ uptime check ၀၊ notification channel ၀။ Vercel logs/settings ကို လက်ရှိ connection မှ ဖတ်၍မရ။ |

ယခင် report တွင် “မစစ်ရသေး” ဟုဖော်ပြထားသော Firebase backup နှင့် Google Cloud monitoring တို့ကို ယခု live API ဖြင့် အတည်ပြုစစ်ဆေးပြီးဖြစ်သည်။ Cloudinary provider-side policy နှင့် Vercel configuration တို့သာ access အကန့်အသတ်ကြောင့် မပြီးပြတ်သေးပါ။

## ၁။ Batch progress — bug အတည်ပြုပြီး

သက်ဆိုင်ရာ code — `admin-dashboard/src/app/api/students/route.ts:59`၊ `admin-dashboard/src/lib/student-results-service.ts:76`။

လက်ရှိ API သည် profile ထဲက selected course/batch ကို ဖော်ပြပေမယ့် lessons နှင့် lesson progress ကို course အလိုက်သာ ဆွဲယူသည်။ `batchId` ဖြင့် မကန့်သတ်ထားပါ။

API function အစစ်ကို memory ထဲရှိ database အတုဖြင့် စမ်းသပ်ခဲ့သည်။ Course တစ်ခုတွင် Batch A lesson ၁ ခု၊ Batch B lesson ၁ ခု ရှိပြီး Student က Batch A lesson ကို ပြီးထားသောအခါ—

| အချက် | ရလဒ် |
|---|---|
| Selected batch အတွက် ဖြစ်သင့်သော completion | ၁/၁ = 100% |
| လက်ရှိ API ပြန်ပေးသော completion | ၁/၂ = 50% |

ထို့အပြင် ထို API သည် တခြား course မှ certificate ရှိရုံနှင့် လက်ရှိ selected scope တွင် `Issued` ပြနိုင်ပြီး selected enrollment inactive ဖြစ်နေသော်လည်း profile ထဲက course/batch ကို ဆက်အသုံးပြုကြောင်း သီးခြားစမ်းသပ်၍ အတည်ပြုထားသည်။ Certificate indicator ကို student တစ်ဦးလုံးအတွက် ပြလိုခြင်းဆိုလျှင် label ကို ရှင်းလင်းစွာပြောင်းရန်၊ selected course/batch အတွက်ဆိုလျှင် query ကို scope လုပ်ရန်လိုသည်။

Live စစ်ဆေးချိန်တွင် published lesson စုစုပေါင်းနှင့် selected batch lesson စုစုပေါင်း ကွာနေသော student မတွေ့သေးပါ။ ထို့ကြောင့် “လက်ရှိ student အားလုံး၏ percentage မှားနေသည်” ဟု မဆိုလိုပါ။ Batch များတွင် lesson ထပ်ထည့်လာသောအခါ ပေါ်လာနိုင်သည့် bug ဖြစ်သည်။

လိုအပ်သောပြင်ဆင်မှု — Lessons/progress ကို `studentId`၊ `courseId`၊ `batchId` ဖြင့် လိုသလိုကန့်သတ်ရန်၊ selected enrollment active ဖြစ်မဖြစ်စစ်ရန်၊ မရှိလျှင် valid active enrollment သို့ ပြောင်းသုံးရန်။

## ၂။ Enrollment — live data မကိုက်ညီမှု တွေ့ရှိ

ဖတ်စစ်ခဲ့သော records များ—

| Collection | အရေအတွက် |
|---|---:|
| courses | ၂ |
| batches | ၃ |
| users | ၂၁ |
| enrollments | ၅ |
| lessons | ၂ |
| lessonProgress | ၀ |

ဖတ်စစ်မှုသည် collection တစ်ခုလျှင် ၅,၀၀၁ အထိသာ ဖတ်ရန်ကန့်သတ်ထားပြီး ဤ project တွင် collection အားလုံးကို အပြည့်ဖတ်စစ်နိုင်ခဲ့သည်။ Student names/emails နှင့် lesson contents တို့ကို မဆွဲယူဘဲ relationship စစ်ရန်လိုသော field များသာ ရွေးဖတ်ခဲ့သည်။

အတည်ပြုတွေ့ရှိချက်—

- `users.enrollments` ထဲတွင် လက်ရှိ active enrollment မရှိသော reference ၃ ခုရှိသည်။ လက်ရှိ enrollment ၅ ခုလုံး active ဖြစ်သောကြောင့် ထို reference များနှင့်ကိုက်သော enrollment document မရှိခြင်းဖြစ်သည်။
- Profile ၁ ခု၏ `activeCourseId`/`activeBatchId` သည် လက်ရှိ active enrollment ကို မညွှန်းတော့ပါ။
- အထက်ပါအရေအတွက်နှစ်ခုသည် overlap ဖြစ်နိုင်သည်။ Student ၄ ဦးဟု ပေါင်းမတွက်ရပါ။
- ရှိနေသော enrollment ၅ ခုအတွင်း missing course/batch/student၊ batch-course mismatch၊ noncanonical document ID၊ active enrollment အတွက် course/batch discovery array ပျောက်နေခြင်း မတွေ့ပါ။

မည်သည့်လုပ်ဆောင်မှုက stale references ကို ဖြစ်စေခဲ့သည်ကို audit log မရှိဘဲ အတည်မပြုနိုင်ပါ။ သို့သော် ထပ်ဖြစ်စေနိုင်သော code paths များကို function အစစ်ဖြင့် သီးခြားပြန်စမ်းထားသည်—

| Code | ပြန်စမ်း၍တွေ့သည့်ပြဿနာ |
|---|---|
| `course-batch-service.ts:108` — `saveEnrollmentStatus` | Inactive ပြောင်းပြီးနောက် profile selected scope နှင့် discovery arrays မပြောင်း။ |
| `course-batch-service.ts:113` — `deleteCourse` | Course ဖျက်ပြီးနောက် batch/enrollment များကျန်။ |
| `course-batch-service.ts:166` — `linkBatchToCourse` | Batch ကို course အသစ်နှင့်ချိတ်သော်လည်း enrollment က course အဟောင်းကို ဆက်ညွှန်း။ |
| `course-batch-service.ts:212` — `updateEnrollmentBatch` | တခြား course ၏ batch သို့ပြောင်းရာတွင် batch-course mismatch ဖြစ်သော enrollment ကို လက်ခံရေးသား။ |

နောက်ဆုံးပြဿနာသည် function ကို တိုက်ရိုက်ခေါ်မှ ဖြစ်နိုင်ခြင်းမျိုးသာ မဟုတ်ပါ။ `admin-dashboard/src/components/course-batch-manager.tsx:1349` တွင် course တစ်ခုခုနှင့် ချိတ်ထားသော batch အားလုံးကို dropdown ထဲထည့်ထားပြီး လက်ရှိ enrollment ၏ course အလိုက် မကန့်သတ်ထားပါ။

လိုအပ်သောပြင်ဆင်မှု — Destination batch/course ကို transaction ထဲတွင်စစ်ရန်၊ status/transfer/delete လုပ်ရာတွင် enrollment၊ profile နှင့် discovery references ကို တစ်ပြိုင်နက်ညှိရန်၊ အသုံးပြုနေသော course/batch ကို archive လုပ်ခြင်း သို့မဟုတ် ဖျက်ခွင့်ကန့်သတ်ခြင်း သတ်မှတ်ရန်။ Live reference ၃ ခုနှင့် selected reference ၁ ခုကို မပြင်မီ backup နှင့် ပြင်မည့်အပြောင်းအလဲစာရင်း အရင်ယူရန်။

## ၃။ Cloudinary — client code စစ်ပြီး၊ provider policy ကို access မရ

`.env` သုံးဖိုင်လုံးတွင် cloud name နှင့် upload preset တူညီသည်။ Public cloud name/preset ရှိသော်လည်း Admin API key/secret သို့မဟုတ် `CLOUDINARY_URL` credential မရှိပါ။ Preset ကို GET ဖြင့်ဖတ်ရာ HTTP 401 `Invalid credentials` ပြန်လာသည်။ ဤ 401 သည် upload preset ပျက်နေသည်ဟု ဆိုလိုခြင်းမဟုတ်ဘဲ Admin API ဖတ်ခွင့်မရှိခြင်းဖြစ်သည်။

Code ထဲရှိ browser-side limits—

| Upload | Limit | Endpoint |
|---|---|---|
| Student profile photo | 5 MiB၊ image type စစ်၊ JPEG အဖြစ်ပြောင်း | `/image/upload` |
| Student assignment file | 20 MiB၊ type allow-list မရှိ | `/auto/upload` |
| Admin image | 5 MiB၊ image type စစ် | `/auto/upload` |
| Admin non-image file | 10 MiB | `/auto/upload` |

Evidence — `student-website/src/lib/cloudinary-upload-service.ts` နှင့် `admin-dashboard/src/lib/cloudinary-upload-service.ts`။

တူညီသော unsigned preset ကို အသုံးပြုသဖြင့် browser-side checks ကိုကျော်ပြီး request တိုက်ရိုက်ပို့သူအပေါ် account role အလိုက် 5/10/20 MiB policy မသတ်မှတ်နိုင်ပါ။ Provider preset တွင် အမှန်တကယ်တားထားသော size/type/folder/overwrite/access restrictions ကို မဖတ်ရသေးပါ။ Cloudinary သည် preset details ကို Admin API မှ GET ဖြင့်ဖတ်နိုင်ကြောင်း [official reference](https://cloudinary.com/documentation/admin_api) တွင် ဖော်ပြထားသည်။

ပြီးပြတ်ရန်လိုသောအချက် — Cloudinary Console ၏ Upload Preset settings သို့ read access သို့မဟုတ် secret မပါသော preset configuration export ရရန်။ အောက်ပါ fields ကို အတည်ပြုရန်လိုသည်: `unsigned`, allowed formats, max file size, folder/asset folder, public-ID/overwrite restrictions, transformations, delivery/access policy နှင့် account usage limits။

Upload စမ်းသပ်ရန် production ထဲ file အသစ်မတင်ထားပါ။ လက်ရှိ file များကိုလည်း မဖျက်ထားပါ။

## ၄။ Deployment lockfile — နှစ်ခုလုံး မကိုက်ညီကြောင်း အတည်ပြု

App တစ်ခုစီ၏ `package.json` နှင့် `pnpm-lock.yaml` ကို `tmp/production-lock-audit/` အောက်သို့ ကူးယူပြီး မူရင်းဖိုင်များမပြောင်းဘဲ အောက်ပါ command ဖြင့်စမ်းသပ်ခဲ့သည်—

```text
pnpm install --ignore-workspace --frozen-lockfile --lockfile-only --ignore-scripts --offline
```

Admin နှင့် Student နှစ်ခုလုံး `ERR_PNPM_OUTDATED_LOCKFILE` ဖြင့် မအောင်ပါ။

| App | အတိအကျမကိုက်ညီချက် |
|---|---|
| Admin | Manifest တွင် `recharts: ^3.10.1` ရှိသော်လည်း app lockfile importer တွင်မရှိ။ |
| Student | Manifest Next.js/ESLint config `16.3.3` ဖြစ်သော်လည်း lockfile `16.3.1` ကျန်။ React manifest `19.2.1` နှင့် lockfile `19.2.8` မကိုက်။ `firebase-admin` importer dependency မရှိ။ React type version specifier များလည်းကွာ။ |

App နှစ်ခုလုံး၏ `vercel.json:3` တွင် `--ignore-workspace --no-frozen-lockfile` သုံးထားသည်။ ထို့ကြောင့် dependency ပြန်တွက်၍ deploy အောင်နိုင်သော်လည်း checked-in lockfile တူညီစွာ အသုံးပြုသည့် build ဟု အာမခံမရပါ။ Root workspace audit မှတွေ့သည့် dependency graph နှင့် isolated Vercel install graph တူကြောင်းလည်း မအတည်ပြုနိုင်ပါ။

လိုအပ်သောပြင်ဆင်မှု — Workspace root lockfile တစ်ခုတည်းသုံးမည်လား၊ app တစ်ခုစီ isolated lockfile သုံးမည်လား သတ်မှတ်ပြီး ကိုက်ညီအောင်ပြန်ထုတ်ရန်။ ထို့နောက် frozen install အောင်ကြောင်းစစ်ပြီး deploy တွင် `--no-frozen-lockfile` ဖယ်ရန်။ Dependency install ကို ပြောင်းလဲပြီးနောက် actual deployment graph ကို audit ပြန်လုပ်ရန်။

Vercel live configuration အတွက် `.vercel/project.json` ထဲရှိ project ID နှစ်ခုကို connected app ဖြင့်စစ်ခဲ့သည်။ Team ကိုမြင်ရသော်လည်း project list ဗလာဖြစ်ပြီး project/deployment ဖတ်ရာ 404 ပြန်လာသည်။ ဤအချက်တစ်ခုတည်းဖြင့် projects ဖျက်ခံထားရသည်ဟု မသတ်မှတ်နိုင်ပါ။ လက်ရှိ connection နှင့် project mapping/access ကို ပြန်အတည်ပြုရန်လိုသည်။

## ၅။ Backup/restore — production အတွက် အဓိကလိုအပ်ချက်

ပထမ service-account request တွင် backup စာရင်းဖတ်ခွင့်မရသဖြင့် ရှိပြီးသား Firebase CLI login ကိုအသုံးပြုကာ ပြန်ဖတ်ခဲ့သည်။ ဒုတိယ request များသည် HTTP 200 ဖြစ်ပြီး အောက်ပါရလဒ်များရသည်—

| Live setting/resource | ရလဒ် |
|---|---|
| Database location | `asia-southeast1` |
| Point-in-time recovery | `POINT_IN_TIME_RECOVERY_DISABLED` |
| Version retention | `3600s` = ၁ နာရီ |
| Database deletion protection | `DELETE_PROTECTION_DISABLED` |
| Managed backup schedules | ၀ |
| Region ရှိ managed backups | ၀ |
| Project ရှိ Cloud Storage buckets | ၀ |
| ပြန်ရရှိသော database operations | ၁၁ ခု၊ index operations များသာ |
| Cloud Scheduler API | `SERVICE_DISABLED` |

လက်ရှိ project တွင် managed backup မရှိကြောင်း အတည်ပြုနိုင်သည်။ တခြား project/account သို့မဟုတ် offline တွင် ကိုယ်တိုင်ယူထားသော export ရှိမရှိကို ဤရလဒ်က မဖော်ပြနိုင်ပါ။ Operations စာရင်းတွင် restore/export မတွေ့ခြင်းသည် ယခင်က လုံးဝမလုပ်ဖူးဟု သက်သေမဟုတ်ပါ။

Default version retention ၁ နာရီကို backup အဖြစ် မမှတ်ယူသင့်ပါ။ PITR နှင့် managed backups သည် သီးခြား recovery mechanisms ဖြစ်ကြောင်း [PITR documentation](https://firebase.google.com/docs/firestore/use-pitr) နှင့် [backup/restore documentation](https://firebase.google.com/docs/firestore/backups) တွင်ရှင်းပြထားသည်။

လိုအပ်သောပြင်ဆင်မှု — Database deletion protection ဖွင့်ရန်၊ recovery လိုအပ်ချက်နှင့်ကိုက်ညီသော PITR/backup retention သတ်မှတ်ရန်၊ scheduled backup ပြုလုပ်ရန်၊ backup တစ်ခုအောင်ပြီးနောက် သီးခြား database သို့ restore စမ်းရန်။ Firebase Auth accounts နှင့် Cloudinary assets အတွက် recovery လည်း Firestore document backup နှင့် သီးခြားစဉ်းစားရန်။

ဤအကြိမ်တွင် backup ဖန်တီးခြင်း၊ PITR ဖွင့်ခြင်းနှင့် restore ပြုလုပ်ခြင်း မလုပ်ထားပါ။ Restore သည် resource/data အသစ်ဖန်တီးနိုင်သော လုပ်ဆောင်မှုဖြစ်ပြီး ယခုတောင်းဆိုချက်သည် စစ်ဆေးရန်ဖြစ်သည်။ ထို့ကြောင့် recovery အောင်မြင်ကြောင်း မကြေညာထားပါ။

## ၆။ Monitoring — Google Cloud တွင် မတပ်ဆင်ရသေးကြောင်း အတည်ပြု

ရှိပြီးသား Firebase login ဖြင့် Google Cloud Monitoring API ကို ဖတ်ရာ—

| Resource | HTTP status | အရေအတွက် |
|---|---:|---:|
| Alert policies | 200 | ၀ |
| Uptime checks | 200 | ၀ |
| Notification channels | 200 | ၀ |

Code တွင် server API failure များအတွက် `console.error` ရှိသည်။ သို့သော် app source/manifests တွင် Sentry၊ Datadog၊ Vercel Web Analytics၊ Speed Insights သို့မဟုတ် custom frontend error reporting integration မတွေ့ပါ။ Log ရေးခြင်းတစ်ခုတည်းက notification ပို့သည့် alert system ရှိသည်ဟု မဆိုလိုပါ။

Vercel runtime log aggregate request သည် 403 ပြန်လာသည်။ ထို့ကြောင့် Vercel ဘက်၌ error မရှိ၊ drain မရှိ၊ monitoring မရှိဟု အတည်မပြုနိုင်ပါ။ တခြား monitoring account တစ်ခုတွင်ထားသော checks များကိုလည်း ဤစစ်ဆေးမှုက မဖယ်ထုတ်နိုင်ပါ။

Public deployment URL နှစ်ခုကို HTTP ဖြင့်ဖတ်ရာ connection timeout ဖြစ်သော်လည်း DNS resolve အောင်သည်။ ယင်းကို site ပျက်နေကြောင်းသက်သေဟု မယူထားပါ။

လိုအပ်သောပြင်ဆင်မှု — Admin/Student URL uptime checks၊ backend 5xx/error alerts၊ notification destination နှင့် browser exception reporting တို့ကို သတ်မှတ်ရန်။ Vercel project access ပြန်ရလျှင် logs/drains နှင့် deployed monitoring settings ကိုထပ်စစ်ရန်။

## ပြန်လည်စမ်းသပ်နိုင်သောအထောက်အထား

စစ်ဆေးစဉ်သုံးထားသော temporary scripts များမှာ Git-ignored `tmp/` ထဲတွင်ရှိသည်—

- `tmp/production-followup-audit.mjs` — service-account ဖြင့် database metadata နှင့် data relationships ကို read-only စစ်သည်။ `node --env-file=.env tmp/production-followup-audit.mjs` ဖြင့် run နိုင်သည်။
- `tmp/production-cloud-controls-audit.mjs` — ရှိပြီးသား Firebase CLI login ဖြင့် backup/monitoring metadata ဖတ်သည်။ Token များကို output မထုတ်ပါ။
- `tmp/production-code-reproductions.cjs` — actual TypeScript functions ကို memory ထဲရှိ service doubles ဖြင့် run ပြီး bug scenario ၇ ခု အတည်ပြုသည်။ Live data မရေးပါ။
- `tmp/production-lock-audit/admin` နှင့် `student` — frozen install စမ်းရန် manifest/lockfile copies များသာ။
- `tmp/production-remaining-checks.mjs` — Cloudinary local config ကိုက်ညီမှု၊ preset read access နှင့် public URL connectivity စစ်သည်။

ဤစစ်ဆေးမှုကြောင့် production release အတွက် မဖြစ်မနေဆက်လုပ်ရန်မှာ backup/recovery တည်ဆောက်ခြင်း၊ enrollment/progress bug ပြင်ခြင်းနှင့် frozen dependency install အောင်အောင်လုပ်ခြင်းတို့ဖြစ်သည်။ Cloudinary preset နှင့် Vercel settings/logs စစ်ဆေးမှုကို အပြီးသတ်ရန် ထို account/project များ၏ ဖတ်ခွင့်လိုအပ်နေသည်။
