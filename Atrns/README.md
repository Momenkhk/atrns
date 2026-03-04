# ATRNS Discord Ultimate Control Bot

بوت سيستم شامل وقوي لإدارة السيرفر بالكامل من خلال الأوامر + بنل تحكم.

## مهم: الإعداد أصبح عبر `config.json` (بدل `.env`)
1. انسخ `config.example.json` إلى `config.json`
2. ضع القيم:
   - `bot.token`
   - `bot.clientId`

## الأنظمة المدعومة
- ✅ الترحيب
- ✅ اللوقات العامة
- ✅ لوقات الحماية + تنبيهات DM للأونر (قابلة للتشغيل/الإيقاف)
- ✅ بنل حماية للتحكم الفوري (Toggle)
- ✅ تيكتات كاملة
- ✅ ليفلات (شات + فويس) + توب ليفلات
- ✅ حظر كلمات معينة + حماية ضد السبام
- ✅ نظام اقتراحات + بنل اقتراحات
- ✅ فلترة الحسابات الوهمية (عمر الحساب)
- ✅ اختصارات عربية + أوامر نصية
- ✅ ردود تلقائية (Reply أو رسالة عادية)
- ✅ أوامر إنشاء رولات ورومات مخصصة
- ✅ أوامر `say` و `come`

## أوامر الإعداد الأساسية
- `/setup-welcome channel:<#channel>`
- `/setup-logs channel:<#channel>`
- `/setup-security channel:<#channel>`
- `/setup-owner-alerts enabled:<true|false>`
- `/setup-tickets panel_channel:<#channel> [category] [support_role]`
- `/setup-suggestions channel:<#channel>`
- `/setup-automod anti_spam_limit:<number> min_account_age_days:<number>`
- `/setup-levels chat_enabled:<true|false> voice_enabled:<true|false> [announce_channel]`
- `/set-prefix prefix:!`

## الحماية وفلترة المحتوى
- `/badword-add word:<text>`
- `/badword-remove word:<text>`
- `/badword-list`
- `/protection-status`
- `/protection-panel`

## الاقتراحات واللفلات
- `/suggest text:<اقتراح>`
- `/suggest-panel`
- `/rank [user]`
- `/levels-top`

## إنشاء رولات ورومات
- `/crole` : ينشئ رول مع خيارات صلاحيات.
- `/cchannel` : ينشئ روم نصي/فويس + خيار private + role/category.

## أوامر إضافية
- `/help` (دليل الأوامر)
- `/say message:<text> [channel]`
- `/come [channel]`

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
npm install
npm start
```

> البوت يعمل ضمن صلاحيات Discord الرسمية فقط.


## Prefix و Slash معاً
- كل الأنظمة الأساسية متاحة عبر Slash.
- تمت إضافة أوامر Prefix للأوامر الشائعة + أمر هيلب:
  - `!help`
  - `!ban` `!kick` `!timeout` `!untimeout`
  - `!purge` `!server-lock` `!server-unlock` `!slowmode`
  - `!say` `!come`
