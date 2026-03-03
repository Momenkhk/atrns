# ATRNS Discord Ultimate Control Bot

تم تطوير البوت ليكون نظام إدارة شامل لسيرفر ديسكورد (بصلاحيات Discord الرسمية)، مع عدد كبير من الأنظمة والأوامر.

## الأنظمة المتوفرة

- 🎫 نظام تذاكر كامل (لوحة + فتح + إغلاق + إضافة/إزالة أعضاء من التذكرة).
- 🛡️ أنظمة مودريشن قوية:
  - إنذار (`/warn`) + عرض الإنذارات (`/warns`) + مسحها (`/clear-warns`)
  - تايم أوت / إلغاء تايم أوت
  - طرد / حظر / فك حظر
- 🧰 إدارة السيرفر:
  - قفل/فتح القنوات
  - إنشاء/حذف قناة
  - Slowmode
  - إدارة الرتب (إضافة/إزالة رول)
  - تغيير Nickname
- 📢 أنظمة مساعدة:
  - إعلان مدمج Embed
  - معلومات سيرفر ومعلومات عضو
- 🧾 أنظمة تلقائية:
  - قناة ترحيب للأعضاء الجدد
  - قناة لوجات لحذف الرسائل

## المتطلبات

- Node.js 18+
- Discord Bot Token
- Discord Application Client ID

## التشغيل

```bash
cp .env.example .env
# حط القيم داخل .env
npm install
npm start
```

## أهم الأوامر

### إعداد الأنظمة
- `/setup-tickets panel_channel:<#channel> [category] [support_role]`
- `/setup-logs channel:<#channel>`
- `/setup-welcome channel:<#channel>`

### التذاكر
- زر `فتح تذكرة`
- `/ticket-add user:@member`
- `/ticket-remove user:@member`
- زر `إغلاق التذكرة`

### المودريشن
- `/warn user:@member reason:text`
- `/warns user:@member`
- `/clear-warns user:@member`
- `/timeout user:@member minutes:number [reason]`
- `/untimeout user:@member`
- `/kick user:@member [reason]`
- `/ban user:@member [reason]`
- `/unban user_id:string`

### إدارة القنوات والرسائل
- `/server-lock`
- `/server-unlock`
- `/purge count:1-100`
- `/channel-create name:text type:text|voice`
- `/channel-delete channel:<#channel>`
- `/slowmode seconds:0-21600`

### أوامر معلوماتية
- `/server-info`
- `/user-info user:@member`
- `/announce channel:<#channel> title:text message:text`

## ملاحظات أمنية

هذا المشروع لإدارة سيرفرك داخل Discord فقط. لا يوجد أي قدرات اختراق أو تحكم خارج صلاحيات البوت الرسمية.


### بنل التحكم الكبير + الاختصارات
- `/control-panel` يرسل بنل تحكم شامل في القناة مع أزرار سريعة:
  - قفل القناة
  - فتح القناة
  - حذف 10 رسائل
  - إرسال بنل تذاكر
- `/shortcut-set alias:<اختصار> command:<أمر>` لربط اختصار نصي بأي أمر رئيسي.
- `/shortcut-list` يعرض كل الاختصارات الحالية.

### الأوامر النصية السريعة (Prefix)
الـ Prefix الافتراضي هو `!`.

أمثلة:
- `!بان @member 10m سبام` (ينفذ تايم أوت بالمدة)
- `!بان @member سبب` (حظر مباشر)
- `!طرد @member سبب`
- `!تنظيف 25`
- `!قفل`
- `!فتح`
- `!بطيء 15`
- `!انذار @member السبب`
