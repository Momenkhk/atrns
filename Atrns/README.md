# ATRNS Discord Ultimate Control Bot

بوت سيستم شامل وقوي لإدارة السيرفر بالكامل من خلال الأوامر + بنل تحكم.

## الأنظمة المدعومة
- ✅ الترحيب
- ✅ اللوقات العامة
- ✅ لوقات الحماية + تنبيهات DM للأونر
- ✅ تيكتات كاملة
- ✅ ليفلات (شات + فويس)
- ✅ حظر كلمات معينة + حماية ضد السبام
- ✅ نظام اقتراحات
- ✅ فلترة الحسابات الوهمية (عمر الحساب)
- ✅ اختصارات عربية + أوامر نصية
- ✅ ردود تلقائية (Reply أو رسالة عادية)
- ✅ أوامر إنشاء رولات ورومات مخصصة

## أوامر الإعداد الأساسية
- `/setup-welcome channel:<#channel>`
- `/setup-logs channel:<#channel>`
- `/setup-security channel:<#channel>`
- `/setup-tickets panel_channel:<#channel> [category] [support_role]`
- `/setup-suggestions channel:<#channel>`
- `/setup-automod anti_spam_limit:<number> min_account_age_days:<number>`
- `/setup-levels chat_enabled:<true|false> voice_enabled:<true|false> [announce_channel]`
- `/set-prefix prefix:!`

## الحماية وفلترة المحتوى
- `/badword-add word:<text>`
- `/badword-remove word:<text>`
- `/badword-list`

## الاقتراحات واللفلات
- `/suggest text:<اقتراح>`
- `/rank [user]`

## إنشاء رولات ورومات (مثل طلبك)
- `/crole` : ينشئ رول مع خيارات صلاحيات أساسية.
- `/cchannel` : ينشئ روم نصي/فويس + خيار خاص (private) + تحديد رول مسموح.

## بنل التحكم والاختصارات
- `/control-panel`
- `/shortcut-set alias:<اختصار> command:<أمر>`
- `/shortcut-list`

## الردود التلقائية
- `/autoresponder-add trigger:<كلمة> response:<رد> reply_mode:<true|false>`
- `/autoresponder-remove trigger:<كلمة>`
- `/autoresponder-list`

## تشغيل البوت
```bash
cp .env.example .env
npm install
npm start
```

> البوت يعمل ضمن صلاحيات Discord الرسمية فقط.
