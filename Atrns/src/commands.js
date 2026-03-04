const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('./utils/store');

function upsertWarn(guildId, userId, reason, moderatorId) {
  setGuildConfig(guildId, (current) => {
    const moderation = current.moderation || {};
    const warns = moderation.warns || {};
    const userWarns = warns[userId] || [];
    userWarns.push({ reason, moderatorId, createdAt: new Date().toISOString() });
    return {
      ...current,
      moderation: { ...moderation, warns: { ...warns, [userId]: userWarns } },
    };
  });
}

function getWarns(guildId, userId) {
  return getGuildConfig(guildId)?.moderation?.warns?.[userId] || [];
}

function clearWarns(guildId, userId) {
  setGuildConfig(guildId, (current) => {
    const warns = { ...(current?.moderation?.warns || {}) };
    delete warns[userId];
    return {
      ...current,
      moderation: { ...(current.moderation || {}), warns },
    };
  });
}

const commands = [
  new SlashCommandBuilder()
    .setName('setup-tickets')
    .setDescription('إعداد نظام التذاكر')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) => opt.setName('panel_channel').setDescription('قناة البانل').setRequired(true))
    .addChannelOption((opt) => opt.setName('category').setDescription('تصنيف التذاكر').addChannelTypes(ChannelType.GuildCategory))
    .addRoleOption((opt) => opt.setName('support_role').setDescription('رول الدعم')),

  new SlashCommandBuilder()
    .setName('setup-logs')
    .setDescription('تحديد قناة اللوجات')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) => opt.setName('channel').setDescription('قناة اللوجات').setRequired(true)),

  new SlashCommandBuilder()
    .setName('setup-welcome')
    .setDescription('تحديد قناة الترحيب')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) => opt.setName('channel').setDescription('قناة الترحيب').setRequired(true)),

  new SlashCommandBuilder()
    .setName('set-prefix')
    .setDescription('تحديد Prefix للأوامر النصية')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) => opt.setName('prefix').setDescription('مثل ! أو .').setRequired(true).setMaxLength(3)),

  new SlashCommandBuilder()
    .setName('autoresponder-add')
    .setDescription('إضافة رد تلقائي')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) => opt.setName('trigger').setDescription('الكلمة المحفزة').setRequired(true))
    .addStringOption((opt) => opt.setName('response').setDescription('الرد').setRequired(true))
    .addBooleanOption((opt) => opt.setName('reply_mode').setDescription('يرد Reply؟ (true/false)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('autoresponder-remove')
    .setDescription('حذف رد تلقائي')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) => opt.setName('trigger').setDescription('الكلمة المحفزة').setRequired(true)),

  new SlashCommandBuilder()
    .setName('autoresponder-list')
    .setDescription('عرض الردود التلقائية')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('control-panel')
    .setDescription('إرسال بنل تحكم شامل')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('shortcut-set')
    .setDescription('إضافة اختصار نصي')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) => opt.setName('alias').setDescription('مثل: بان').setRequired(true))
    .addStringOption((opt) =>
      opt.setName('command').setDescription('الأمر الأساسي').setRequired(true).addChoices(
        { name: 'ban', value: 'ban' },
        { name: 'kick', value: 'kick' },
        { name: 'timeout', value: 'timeout' },
        { name: 'untimeout', value: 'untimeout' },
        { name: 'warn', value: 'warn' },
        { name: 'clear-warns', value: 'clear-warns' },
        { name: 'purge', value: 'purge' },
        { name: 'server-lock', value: 'server-lock' },
        { name: 'server-unlock', value: 'server-unlock' },
        { name: 'slowmode', value: 'slowmode' }
      )
    ),

  new SlashCommandBuilder()
    .setName('shortcut-list')
    .setDescription('عرض الاختصارات')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('عرض دليل الأوامر (Slash + Prefix)'),

  new SlashCommandBuilder().setName('server-info').setDescription('معلومات السيرفر'),
  new SlashCommandBuilder().setName('user-info').setDescription('معلومات عضو').addUserOption((opt) => opt.setName('user').setRequired(true).setDescription('العضو')),

  new SlashCommandBuilder().setName('server-lock').setDescription('قفل القناة الحالية').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder().setName('server-unlock').setDescription('فتح القناة الحالية').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName('purge')
    .setDescription('حذف رسائل')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((opt) => opt.setName('count').setDescription('1-100').setRequired(true).setMinValue(1).setMaxValue(100)),

  new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('تعديل Slowmode')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption((opt) => opt.setName('seconds').setDescription('0-21600').setRequired(true).setMinValue(0).setMaxValue(21600)),

  new SlashCommandBuilder()
    .setName('channel-create')
    .setDescription('إنشاء قناة')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((opt) => opt.setName('name').setDescription('اسم').setRequired(true))
    .addStringOption((opt) => opt.setName('type').setDescription('نوع').setRequired(true).addChoices({ name: 'text', value: 'text' }, { name: 'voice', value: 'voice' })),

  new SlashCommandBuilder()
    .setName('channel-delete')
    .setDescription('حذف قناة')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((opt) => opt.setName('channel').setDescription('القناة').setRequired(true)),

  new SlashCommandBuilder()
    .setName('role-add')
    .setDescription('إضافة رول')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true))
    .addRoleOption((opt) => opt.setName('role').setDescription('الرول').setRequired(true)),

  new SlashCommandBuilder()
    .setName('role-remove')
    .setDescription('إزالة رول')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true))
    .addRoleOption((opt) => opt.setName('role').setDescription('الرول').setRequired(true)),

  new SlashCommandBuilder()
    .setName('nick')
    .setDescription('تغيير nickname')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true))
    .addStringOption((opt) => opt.setName('name').setDescription('الاسم').setRequired(true)),

  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('تايم أوت')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true))
    .addIntegerOption((opt) => opt.setName('minutes').setDescription('بالدقائق').setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption((opt) => opt.setName('reason').setDescription('السبب')),

  new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('إلغاء تايم أوت')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true)),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('إنذار')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('السبب').setRequired(true)),

  new SlashCommandBuilder().setName('warns').setDescription('عرض الإنذارات').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true)),

  new SlashCommandBuilder().setName('clear-warns').setDescription('مسح الإنذارات').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true)),

  new SlashCommandBuilder().setName('kick').setDescription('طرد').setDefaultMemberPermissions(PermissionFlagsBits.KickMembers).addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true)).addStringOption((opt) => opt.setName('reason').setDescription('السبب')),

  new SlashCommandBuilder().setName('ban').setDescription('حظر').setDefaultMemberPermissions(PermissionFlagsBits.BanMembers).addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true)).addStringOption((opt) => opt.setName('reason').setDescription('السبب')),

  new SlashCommandBuilder().setName('unban').setDescription('فك حظر').setDefaultMemberPermissions(PermissionFlagsBits.BanMembers).addStringOption((opt) => opt.setName('user_id').setDescription('id').setRequired(true)),

  new SlashCommandBuilder().setName('announce').setDescription('إعلان').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages).addChannelOption((opt) => opt.setName('channel').setDescription('القناة').setRequired(true)).addStringOption((opt) => opt.setName('title').setDescription('العنوان').setRequired(true)).addStringOption((opt) => opt.setName('message').setDescription('النص').setRequired(true)),

  new SlashCommandBuilder().setName('ticket-add').setDescription('إضافة عضو للتذكرة').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels).addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true)),

  new SlashCommandBuilder().setName('ticket-remove').setDescription('إزالة عضو من التذكرة').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels).addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true)),

  new SlashCommandBuilder()
    .setName('setup-security')
    .setDescription('تحديد قناة لوقات الحماية')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) => opt.setName('channel').setDescription('قناة لوقات الحماية').setRequired(true)),

  new SlashCommandBuilder()
    .setName('setup-owner-alerts')
    .setDescription('تشغيل/إيقاف تنبيهات DM لمالك السيرفر')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption((opt) => opt.setName('enabled').setDescription('تشغيل التنبيهات').setRequired(true)),

  new SlashCommandBuilder()
    .setName('setup-suggestions')
    .setDescription('تحديد قناة الاقتراحات')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) => opt.setName('channel').setDescription('قناة الاقتراحات').setRequired(true)),

  new SlashCommandBuilder()
    .setName('setup-automod')
    .setDescription('إعداد الحماية ضد السبام والكلمات')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption((opt) => opt.setName('anti_spam_limit').setDescription('عدد الرسائل خلال 8 ثواني').setRequired(true).setMinValue(3).setMaxValue(15))
    .addIntegerOption((opt) => opt.setName('min_account_age_days').setDescription('أقل عمر للحساب بالأيام').setRequired(true).setMinValue(0).setMaxValue(3650)),

  new SlashCommandBuilder()
    .setName('badword-add')
    .setDescription('إضافة كلمة محظورة')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) => opt.setName('word').setDescription('الكلمة').setRequired(true)),

  new SlashCommandBuilder()
    .setName('badword-remove')
    .setDescription('حذف كلمة محظورة')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) => opt.setName('word').setDescription('الكلمة').setRequired(true)),

  new SlashCommandBuilder()
    .setName('badword-list')
    .setDescription('عرض الكلمات المحظورة')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('setup-levels')
    .setDescription('تفعيل نظام اللفلات (شات/فويس)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption((opt) => opt.setName('chat_enabled').setDescription('لفلات الشات').setRequired(true))
    .addBooleanOption((opt) => opt.setName('voice_enabled').setDescription('لفلات الفويس').setRequired(true))
    .addChannelOption((opt) => opt.setName('announce_channel').setDescription('قناة اعلان اللفل').setRequired(false)),

  new SlashCommandBuilder()
    .setName('rank')
    .setDescription('عرض مستوى عضو')
    .addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(false)),

  new SlashCommandBuilder()
    .setName('levels-top')
    .setDescription('عرض أعلى الأعضاء في اللفلات'),

  new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('إرسال اقتراح')
    .addStringOption((opt) => opt.setName('text').setDescription('الاقتراح').setRequired(true)),

  new SlashCommandBuilder()
    .setName('suggest-panel')
    .setDescription('إرسال بنل للاقتراحات')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('protection-status')
    .setDescription('عرض حالة أنظمة الحماية')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('protection-panel')
    .setDescription('إرسال بنل التحكم في الحماية')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('say')
    .setDescription('إرسال رسالة من البوت')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((opt) => opt.setName('message').setDescription('النص').setRequired(true))
    .addChannelOption((opt) => opt.setName('channel').setDescription('القناة (اختياري)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('come')
    .setDescription('استدعاء البوت لقناة معينة (رسالة تنبيه)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((opt) => opt.setName('channel').setDescription('القناة المستهدفة').setRequired(false)),

  new SlashCommandBuilder()
    .setName('crole')
    .setDescription('إنشاء رول مخصص سريع')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) => opt.setName('name').setDescription('اسم الرول').setRequired(true))
    .addStringOption((opt) => opt.setName('color').setDescription('لون Hex مثل #ff0000').setRequired(false))
    .addBooleanOption((opt) => opt.setName('mentionable').setDescription('قابل للمنشن').setRequired(false))
    .addBooleanOption((opt) => opt.setName('hoist').setDescription('يظهر منفصل').setRequired(false))
    .addBooleanOption((opt) => opt.setName('admin').setDescription('صلاحية Administrator').setRequired(false))
    .addBooleanOption((opt) => opt.setName('manage_channels').setDescription('Manage Channels').setRequired(false))
    .addBooleanOption((opt) => opt.setName('manage_roles').setDescription('Manage Roles').setRequired(false)),

  new SlashCommandBuilder()
    .setName('cchannel')
    .setDescription('إنشاء روم مخصص / خاص')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((opt) => opt.setName('name').setDescription('اسم الروم').setRequired(true))
    .addStringOption((opt) => opt.setName('type').setDescription('نوع').setRequired(true).addChoices({ name: 'text', value: 'text' }, { name: 'voice', value: 'voice' }))
    .addBooleanOption((opt) => opt.setName('private').setDescription('خاص؟').setRequired(false))
    .addRoleOption((opt) => opt.setName('role').setDescription('الرول المسموح له').setRequired(false))
    .addChannelOption((opt) => opt.setName('category').setDescription('تصنيف').addChannelTypes(ChannelType.GuildCategory).setRequired(false)),

].map((data) => ({ data, execute: executeCommand }));

async function executeCommand(interaction) {
  const name = interaction.commandName;

  if (name === 'help') {
    const cfg = getGuildConfig(interaction.guildId);
    const prefix = cfg.prefix || '!';

    const embed = new EmbedBuilder()
      .setTitle('📚 ATRNS Help')
      .setDescription('دليل سريع لأهم الأوامر (Slash + Prefix).')
      .addFields(
        {
          name: '🛡️ حماية',
          value: '`/setup-automod` `/badword-add` `/protection-panel` `/protection-status`',
        },
        {
          name: '🎫 تكتات',
          value: '`/setup-tickets` + زر `فتح تذكرة` + `/ticket-add` `/ticket-remove`',
        },
        {
          name: '📢 أدوات عامة',
          value: '`/say` `/come` `/announce` `/control-panel`',
        },
        {
          name: '⌨️ Prefix',
          value: `\`${prefix}help\` \`${prefix}ban @user reason\` \`${prefix}kick @user reason\` \`${prefix}purge 20\` \`${prefix}say نص\` \`${prefix}come\``,
        }
      )
      .setColor(0x5865f2);

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (name === 'setup-tickets') {
    const panelChannel = interaction.options.getChannel('panel_channel', true);
    const category = interaction.options.getChannel('category');
    const supportRole = interaction.options.getRole('support_role');
    const embed = new EmbedBuilder().setTitle('🎫 نظام التذاكر').setDescription('اضغط لفتح تذكرة').setColor(0x2ecc71);
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket:create').setLabel('فتح تذكرة').setStyle(ButtonStyle.Primary));
    await panelChannel.send({ embeds: [embed], components: [row] });
    setGuildConfig(interaction.guildId, (c) => ({ ...c, tickets: { panelChannelId: panelChannel.id, categoryId: category?.id, supportRoleId: supportRole?.id, openTickets: c?.tickets?.openTickets || {} } }));
    return interaction.reply({ content: '✅ تم إعداد التذاكر.', ephemeral: true });
  }

  if (name === 'setup-logs') {
    const channel = interaction.options.getChannel('channel', true);
    setGuildConfig(interaction.guildId, (c) => ({ ...c, logsChannelId: channel.id }));
    return interaction.reply({ content: `✅ تم ضبط اللوجات: ${channel}`, ephemeral: true });
  }

  if (name === 'setup-welcome') {
    const channel = interaction.options.getChannel('channel', true);
    setGuildConfig(interaction.guildId, (c) => ({ ...c, welcomeChannelId: channel.id }));
    return interaction.reply({ content: `✅ تم ضبط الترحيب: ${channel}`, ephemeral: true });
  }

  if (name === 'setup-security') {
    const channel = interaction.options.getChannel('channel', true);
    setGuildConfig(interaction.guildId, (c) => ({ ...c, securityLogsChannelId: channel.id }));
    return interaction.reply({ content: `✅ تم ضبط لوقات الحماية: ${channel}`, ephemeral: true });
  }

  if (name === 'setup-owner-alerts') {
    const enabled = interaction.options.getBoolean('enabled', true);
    setGuildConfig(interaction.guildId, (c) => ({ ...c, ownerDmAlerts: enabled }));
    return interaction.reply({ content: `✅ تنبيهات المالك عبر DM: ${enabled ? 'مفعلة' : 'متوقفة'}`, ephemeral: true });
  }

  if (name === 'setup-suggestions') {
    const channel = interaction.options.getChannel('channel', true);
    setGuildConfig(interaction.guildId, (c) => ({ ...c, suggestionsChannelId: channel.id }));
    return interaction.reply({ content: `✅ تم ضبط قناة الاقتراحات: ${channel}`, ephemeral: true });
  }

  if (name === 'setup-automod') {
    const antiSpamLimit = interaction.options.getInteger('anti_spam_limit', true);
    const minAccountAgeDays = interaction.options.getInteger('min_account_age_days', true);
    setGuildConfig(interaction.guildId, (c) => ({
      ...c,
      automod: {
        ...(c.automod || {}),
        antiSpamLimit,
        minAccountAgeDays,
        antiSpamEnabled: c.automod?.antiSpamEnabled ?? true,
        bannedWordsEnabled: c.automod?.bannedWordsEnabled ?? true,
        accountAgeFilterEnabled: c.automod?.accountAgeFilterEnabled ?? true,
      },
    }));
    return interaction.reply({ content: `✅ تم تحديث Automod: spam=${antiSpamLimit}, accountAge=${minAccountAgeDays}d`, ephemeral: true });
  }

  if (name === 'badword-add') {
    const word = interaction.options.getString('word', true).toLowerCase().trim();
    setGuildConfig(interaction.guildId, (c) => ({
      ...c,
      automod: {
        ...(c.automod || {}),
        bannedWords: Array.from(new Set([...(c.automod?.bannedWords || []), word])),
      },
    }));
    return interaction.reply({ content: `✅ تمت إضافة الكلمة المحظورة: ${word}`, ephemeral: true });
  }

  if (name === 'badword-remove') {
    const word = interaction.options.getString('word', true).toLowerCase().trim();
    setGuildConfig(interaction.guildId, (c) => ({
      ...c,
      automod: {
        ...(c.automod || {}),
        bannedWords: (c.automod?.bannedWords || []).filter((w) => w !== word),
      },
    }));
    return interaction.reply({ content: `✅ تمت إزالة الكلمة: ${word}`, ephemeral: true });
  }

  if (name === 'badword-list') {
    const words = getGuildConfig(interaction.guildId).automod?.bannedWords || [];
    if (!words.length) return interaction.reply({ content: 'لا توجد كلمات محظورة.', ephemeral: true });
    const text = words.map((w) => `• ${w}`).join('\n');
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('الكلمات المحظورة').setDescription(text).setColor(0xe67e22)], ephemeral: true });
  }

  if (name === 'setup-levels') {
    const chatEnabled = interaction.options.getBoolean('chat_enabled', true);
    const voiceEnabled = interaction.options.getBoolean('voice_enabled', true);
    const announceChannel = interaction.options.getChannel('announce_channel');
    setGuildConfig(interaction.guildId, (c) => ({
      ...c,
      levels: {
        ...(c.levels || {}),
        chatEnabled,
        voiceEnabled,
        announceChannelId: announceChannel?.id,
      },
    }));
    return interaction.reply({ content: '✅ تم تحديث نظام اللفلات.', ephemeral: true });
  }

  if (name === 'set-prefix') {
    const prefix = interaction.options.getString('prefix', true);
    setGuildConfig(interaction.guildId, (c) => ({ ...c, prefix }));
    return interaction.reply({ content: `✅ تم ضبط الـ Prefix إلى: ${prefix}`, ephemeral: true });
  }

  if (name === 'autoresponder-add') {
    const trigger = interaction.options.getString('trigger', true).toLowerCase();
    const response = interaction.options.getString('response', true);
    const replyMode = interaction.options.getBoolean('reply_mode', true);
    setGuildConfig(interaction.guildId, (c) => {
      const list = c.autoResponses || [];
      const cleaned = list.filter((x) => x.trigger !== trigger);
      cleaned.push({ trigger, response, replyMode });
      return { ...c, autoResponses: cleaned };
    });
    return interaction.reply({ content: `✅ تم حفظ رد تلقائي لـ ${trigger}`, ephemeral: true });
  }

  if (name === 'autoresponder-remove') {
    const trigger = interaction.options.getString('trigger', true).toLowerCase();
    setGuildConfig(interaction.guildId, (c) => ({ ...c, autoResponses: (c.autoResponses || []).filter((x) => x.trigger !== trigger) }));
    return interaction.reply({ content: `✅ تم حذف الرد التلقائي: ${trigger}`, ephemeral: true });
  }

  if (name === 'autoresponder-list') {
    const list = getGuildConfig(interaction.guildId).autoResponses || [];
    if (!list.length) return interaction.reply({ content: 'لا يوجد ردود تلقائية.', ephemeral: true });
    const lines = list.slice(0, 20).map((x, i) => `${i + 1}. ${x.trigger} -> ${x.replyMode ? 'Reply' : 'Send'}: ${x.response.slice(0, 80)}`).join('\n');
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('الردود التلقائية').setDescription(lines).setColor(0x1abc9c)], ephemeral: true });
  }

  if (name === 'control-panel') {
    const cfg = getGuildConfig(interaction.guildId);
    const aliases = cfg.shortcuts || {};
    const aliasLines = Object.keys(aliases).length ? Object.entries(aliases).slice(0, 15).map(([a, c]) => `• ${a} ➜ ${c}`).join('\n') : 'لا توجد اختصارات.';
    const embed = new EmbedBuilder().setTitle('🎛️ ATRNS Control Panel').setDescription('بنل تحكم سريع').addFields(
      { name: 'إدارة فورية', value: '🔒 قفل\n🔓 فتح\n🧹 حذف 10\n🎫 بنل تذاكر', inline: true },
      { name: 'الاختصارات', value: aliasLines, inline: true },
    ).setColor(0x5865f2);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('panel:lock').setLabel('قفل').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('panel:unlock').setLabel('فتح').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('panel:purge10').setLabel('حذف 10').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('panel:tickets').setLabel('بنل التذاكر').setStyle(ButtonStyle.Primary),
    );
    await interaction.channel.send({ embeds: [embed], components: [row] });
    return interaction.reply({ content: '✅ تم إرسال البنل.', ephemeral: true });
  }

  if (name === 'shortcut-set') {
    const alias = interaction.options.getString('alias', true).toLowerCase().trim();
    const command = interaction.options.getString('command', true);
    setGuildConfig(interaction.guildId, (c) => ({ ...c, shortcuts: { ...(c.shortcuts || {}), [alias]: command } }));
    return interaction.reply({ content: `✅ ${alias} => ${command}`, ephemeral: true });
  }

  if (name === 'shortcut-list') {
    const shortcuts = getGuildConfig(interaction.guildId).shortcuts || {};
    if (!Object.keys(shortcuts).length) return interaction.reply({ content: 'لا توجد اختصارات.', ephemeral: true });
    const text = Object.entries(shortcuts).map(([a, c]) => `• ${a} ➜ ${c}`).join('\n');
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('الاختصارات').setDescription(text).setColor(0x3498db)] });
  }

  if (name === 'rank') {
    const user = interaction.options.getUser('user') || interaction.user;
    const levels = getGuildConfig(interaction.guildId).levelsData || {};
    const data = levels[user.id] || { chatXP: 0, voiceXP: 0, level: 0 };
    const embed = new EmbedBuilder()
      .setTitle(`مستوى ${user.tag}`)
      .addFields(
        { name: 'Level', value: `${data.level}`, inline: true },
        { name: 'Chat XP', value: `${data.chatXP}`, inline: true },
        { name: 'Voice XP', value: `${data.voiceXP}`, inline: true }
      )
      .setColor(0x8e44ad);
    return interaction.reply({ embeds: [embed] });
  }

  if (name === 'levels-top') {
    const levels = getGuildConfig(interaction.guildId).levelsData || {};
    const top = Object.entries(levels)
      .map(([userId, data]) => ({ userId, total: (data.chatXP || 0) + (data.voiceXP || 0), level: data.level || 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    if (!top.length) {
      return interaction.reply({ content: 'لا توجد بيانات لفلات حتى الآن.' });
    }

    const lines = top
      .map((item, idx) => `${idx + 1}. <@${item.userId}> — Level ${item.level} (${item.total} XP)`)
      .join('\n');

    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle('🏆 Top Levels').setDescription(lines).setColor(0xf1c40f)],
    });
  }

  if (name === 'suggest') {
    const cfg = getGuildConfig(interaction.guildId);
    const ch = cfg.suggestionsChannelId ? interaction.guild.channels.cache.get(cfg.suggestionsChannelId) : null;
    if (!ch?.isTextBased()) return interaction.reply({ content: '❌ قناة الاقتراحات غير مضبوطة.', ephemeral: true });
    const text = interaction.options.getString('text', true);
    const embed = new EmbedBuilder().setTitle('💡 اقتراح جديد').setDescription(text).addFields({ name: 'من', value: `${interaction.user}` }).setColor(0x3498db);
    const msg = await ch.send({ embeds: [embed] });
    await msg.react('✅').catch(() => null);
    await msg.react('❌').catch(() => null);
    return interaction.reply({ content: '✅ تم إرسال اقتراحك.', ephemeral: true });
  }

  if (name === 'suggest-panel') {
    const cfg = getGuildConfig(interaction.guildId);
    const ch = cfg.suggestionsChannelId ? interaction.guild.channels.cache.get(cfg.suggestionsChannelId) : interaction.channel;
    if (!ch?.isTextBased()) return interaction.reply({ content: '❌ قناة الاقتراحات غير صالحة.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('💡 Suggestion Panel')
      .setDescription('استخدم الأمر `/suggest` لإرسال اقتراحك بشكل منظم.')
      .setColor(0x3498db);

    await ch.send({ embeds: [embed] });
    return interaction.reply({ content: '✅ تم إرسال بنل الاقتراحات.', ephemeral: true });
  }

  if (name === 'protection-status') {
    const cfg = getGuildConfig(interaction.guildId);
    const automod = cfg.automod || {};
    const bannedWords = automod.bannedWords || [];

    const embed = new EmbedBuilder()
      .setTitle('🛡️ حالة الحماية')
      .addFields(
        { name: 'قناة لوقات الحماية', value: cfg.securityLogsChannelId ? `<#${cfg.securityLogsChannelId}>` : 'غير مضبوطة', inline: true },
        { name: 'تنبيهات DM للمالك', value: cfg.ownerDmAlerts === false ? 'متوقفة' : 'مفعلة', inline: true },
        { name: 'Anti-Spam Limit', value: `${automod.antiSpamLimit || 6} رسائل/8ث`, inline: true },
        { name: 'Min Account Age', value: `${automod.minAccountAgeDays || 0} يوم`, inline: true },
        { name: 'عدد الكلمات المحظورة', value: `${bannedWords.length}`, inline: true },
        { name: 'Spam', value: automod.antiSpamEnabled === false ? 'OFF' : 'ON', inline: true },
        { name: 'Words', value: automod.bannedWordsEnabled === false ? 'OFF' : 'ON', inline: true },
        { name: 'Age Filter', value: automod.accountAgeFilterEnabled === false ? 'OFF' : 'ON', inline: true }
      )
      .setColor(0xc0392b);

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (name === 'protection-panel') {
    const cfg = getGuildConfig(interaction.guildId);
    const automod = cfg.automod || {};
    const embed = new EmbedBuilder()
      .setTitle('🛡️ Protection Control Panel')
      .setDescription('استخدم الأزرار لتفعيل/تعطيل أنظمة الحماية بسرعة.')
      .addFields(
        { name: 'Anti-Spam', value: automod.antiSpamEnabled === false ? 'OFF' : 'ON', inline: true },
        { name: 'Word Filter', value: automod.bannedWordsEnabled === false ? 'OFF' : 'ON', inline: true },
        { name: 'Account Age Filter', value: automod.accountAgeFilterEnabled === false ? 'OFF' : 'ON', inline: true }
      )
      .setColor(0xc0392b);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prot:toggleSpam').setLabel('Toggle Spam').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('prot:toggleWords').setLabel('Toggle Words').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('prot:toggleAge').setLabel('Toggle Age Filter').setStyle(ButtonStyle.Primary)
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    return interaction.reply({ content: '✅ تم إرسال بنل الحماية.', ephemeral: true });
  }

  if (name === 'say') {
    const text = interaction.options.getString('message', true);
    const ch = interaction.options.getChannel('channel') || interaction.channel;
    if (!ch?.isTextBased()) return interaction.reply({ content: '❌ قناة غير صالحة.', ephemeral: true });
    await ch.send(text);
    return interaction.reply({ content: '✅ تم الإرسال.', ephemeral: true });
  }

  if (name === 'come') {
    const ch = interaction.options.getChannel('channel') || interaction.channel;
    if (!ch?.isTextBased()) return interaction.reply({ content: '❌ قناة غير صالحة.', ephemeral: true });
    await ch.send(`👋 أنا موجود هنا يا ${interaction.user}`);
    return interaction.reply({ content: `✅ وصلت للقناة ${ch}.`, ephemeral: true });
  }

  if (name === 'crole') {
    const perms = [];
    if (interaction.options.getBoolean('admin')) perms.push(PermissionFlagsBits.Administrator);
    if (interaction.options.getBoolean('manage_channels')) perms.push(PermissionFlagsBits.ManageChannels);
    if (interaction.options.getBoolean('manage_roles')) perms.push(PermissionFlagsBits.ManageRoles);

    const role = await interaction.guild.roles.create({
      name: interaction.options.getString('name', true),
      color: interaction.options.getString('color') || undefined,
      mentionable: interaction.options.getBoolean('mentionable') || false,
      hoist: interaction.options.getBoolean('hoist') || false,
      permissions: perms,
      reason: `Created by ${interaction.user.tag}`,
    });
    return interaction.reply(`✅ تم إنشاء الرول ${role}`);
  }

  if (name === 'cchannel') {
    const channelType = interaction.options.getString('type', true) === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
    const isPrivate = interaction.options.getBoolean('private') || false;
    const role = interaction.options.getRole('role');
    const category = interaction.options.getChannel('category');

    const permissionOverwrites = isPrivate
      ? [
          { id: interaction.guild.roles.everyone.id, deny: ['ViewChannel'] },
          ...(role ? [{ id: role.id, allow: ['ViewChannel', 'SendMessages', 'Connect', 'Speak'] }] : []),
        ]
      : undefined;

    const channel = await interaction.guild.channels.create({
      name: interaction.options.getString('name', true),
      type: channelType,
      parent: category?.id,
      permissionOverwrites,
      reason: `Created by ${interaction.user.tag}`,
    });

    return interaction.reply(`✅ تم إنشاء الروم ${channel}` + (isPrivate ? ' (خاص)' : ''));
  }

  if (name === 'server-lock') {
    await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
    return interaction.reply('🔒 تم قفل القناة.');
  }
  if (name === 'server-unlock') {
    await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: true });
    return interaction.reply('🔓 تم فتح القناة.');
  }
  if (name === 'purge') {
    const count = interaction.options.getInteger('count', true);
    const deleted = await interaction.channel.bulkDelete(count, true);
    return interaction.reply({ content: `🧹 تم حذف ${deleted.size} رسالة.`, ephemeral: true });
  }
  if (name === 'slowmode') {
    const seconds = interaction.options.getInteger('seconds', true);
    await interaction.channel.setRateLimitPerUser(seconds);
    return interaction.reply(`✅ تم ضبط Slowmode: ${seconds}s`);
  }
  if (name === 'channel-create') {
    const ch = await interaction.guild.channels.create({
      name: interaction.options.getString('name', true),
      type: interaction.options.getString('type', true) === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText,
    });
    return interaction.reply(`✅ تم إنشاء ${ch}`);
  }
  if (name === 'channel-delete') {
    const ch = interaction.options.getChannel('channel', true);
    await ch.delete('Deleted via bot command');
    return interaction.reply('✅ تم حذف القناة.');
  }
  if (name === 'role-add') {
    const member = await interaction.guild.members.fetch(interaction.options.getUser('user', true).id);
    const role = interaction.options.getRole('role', true);
    await member.roles.add(role);
    return interaction.reply(`✅ تم إضافة ${role} إلى ${member}`);
  }
  if (name === 'role-remove') {
    const member = await interaction.guild.members.fetch(interaction.options.getUser('user', true).id);
    const role = interaction.options.getRole('role', true);
    await member.roles.remove(role);
    return interaction.reply(`✅ تمت إزالة ${role} من ${member}`);
  }
  if (name === 'nick') {
    const member = await interaction.guild.members.fetch(interaction.options.getUser('user', true).id);
    const newName = interaction.options.getString('name', true);
    await member.setNickname(newName);
    return interaction.reply(`✅ تم تغيير الاسم إلى ${newName}`);
  }
  if (name === 'timeout') {
    const member = await interaction.guild.members.fetch(interaction.options.getUser('user', true).id);
    const mins = interaction.options.getInteger('minutes', true);
    const reason = interaction.options.getString('reason') || 'بدون سبب';
    await member.timeout(mins * 60 * 1000, reason);
    return interaction.reply(`⏱️ تايم أوت ${mins} دقيقة لـ ${member}`);
  }
  if (name === 'untimeout') {
    const member = await interaction.guild.members.fetch(interaction.options.getUser('user', true).id);
    await member.timeout(null);
    return interaction.reply(`✅ تم إلغاء التايم أوت عن ${member}`);
  }
  if (name === 'warn') {
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);
    upsertWarn(interaction.guildId, user.id, reason, interaction.user.id);
    return interaction.reply(`⚠️ تم إنذار ${user}. عدد الإنذارات: ${getWarns(interaction.guildId, user.id).length}`);
  }
  if (name === 'warns') {
    const user = interaction.options.getUser('user', true);
    const warns = getWarns(interaction.guildId, user.id);
    if (!warns.length) return interaction.reply(`لا يوجد إنذارات على ${user}.`);
    const lines = warns.slice(-10).map((w, i) => `${i + 1}. ${w.reason} - <@${w.moderatorId}>`).join('\n');
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`إنذارات ${user.tag}`).setDescription(lines).setColor(0xf39c12)] });
  }
  if (name === 'clear-warns') {
    const user = interaction.options.getUser('user', true);
    clearWarns(interaction.guildId, user.id);
    return interaction.reply(`✅ تم مسح إنذارات ${user}`);
  }
  if (name === 'kick') {
    const user = interaction.options.getUser('user', true);
    const member = await interaction.guild.members.fetch(user.id);
    await member.kick(interaction.options.getString('reason') || 'بدون سبب');
    return interaction.reply(`👢 تم طرد ${user.tag}`);
  }
  if (name === 'ban') {
    const user = interaction.options.getUser('user', true);
    await interaction.guild.members.ban(user.id, { reason: interaction.options.getString('reason') || 'بدون سبب' });
    return interaction.reply(`⛔ تم حظر ${user.tag}`);
  }
  if (name === 'unban') {
    const id = interaction.options.getString('user_id', true);
    await interaction.guild.members.unban(id);
    return interaction.reply(`✅ تم فك الحظر عن ${id}`);
  }
  if (name === 'server-info') {
    const g = interaction.guild;
    const embed = new EmbedBuilder().setTitle(`معلومات ${g.name}`).addFields(
      { name: 'الأعضاء', value: `${g.memberCount}`, inline: true },
      { name: 'القنوات', value: `${g.channels.cache.size}`, inline: true },
      { name: 'الرولات', value: `${g.roles.cache.size}`, inline: true },
    ).setColor(0x3498db);
    return interaction.reply({ embeds: [embed] });
  }
  if (name === 'user-info') {
    const user = interaction.options.getUser('user', true);
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const embed = new EmbedBuilder().setTitle(`معلومات ${user.tag}`).setThumbnail(user.displayAvatarURL()).addFields(
      { name: 'ID', value: user.id },
      { name: 'Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
      { name: 'Joined', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'N/A', inline: true },
    );
    return interaction.reply({ embeds: [embed] });
  }
  if (name === 'announce') {
    const channel = interaction.options.getChannel('channel', true);
    const embed = new EmbedBuilder().setTitle(`📢 ${interaction.options.getString('title', true)}`).setDescription(interaction.options.getString('message', true)).setColor(0x9b59b6);
    await channel.send({ embeds: [embed] });
    return interaction.reply({ content: '✅ تم إرسال الإعلان.', ephemeral: true });
  }
  if (name === 'ticket-add') {
    const user = interaction.options.getUser('user', true);
    await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
    return interaction.reply(`✅ تمت إضافة ${user}`);
  }
  if (name === 'ticket-remove') {
    const user = interaction.options.getUser('user', true);
    await interaction.channel.permissionOverwrites.delete(user.id).catch(() => null);
    return interaction.reply(`✅ تمت إزالة ${user}`);
  }
}

async function handleTicketCreate(interaction) {
  const cfg = getGuildConfig(interaction.guildId);
  const ticketsCfg = cfg.tickets || {};
  if (!ticketsCfg.panelChannelId) return interaction.reply({ content: '❌ نظام التذاكر غير مفعّل.', ephemeral: true });
  const alreadyOpenId = ticketsCfg.openTickets?.[interaction.user.id];
  if (alreadyOpenId) return interaction.reply({ content: `عندك تذكرة مفتوحة: <#${alreadyOpenId}>`, ephemeral: true });

  const ticketChannel = await interaction.guild.channels.create({
    name: `ticket-${interaction.user.username}`,
    type: ChannelType.GuildText,
    parent: ticketsCfg.categoryId,
    permissionOverwrites: [
      { id: interaction.guild.roles.everyone.id, deny: ['ViewChannel'] },
      { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
      ...(ticketsCfg.supportRoleId ? [{ id: ticketsCfg.supportRoleId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }] : []),
    ],
  });

  setGuildConfig(interaction.guildId, (current) => ({
    ...current,
    tickets: {
      ...(current.tickets || {}),
      openTickets: { ...(current.tickets?.openTickets || {}), [interaction.user.id]: ticketChannel.id },
    },
  }));

  const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket:close').setLabel('إغلاق التذكرة').setStyle(ButtonStyle.Danger));
  await ticketChannel.send({ content: `مرحباً ${interaction.user}` + (ticketsCfg.supportRoleId ? ` <@&${ticketsCfg.supportRoleId}>` : ''), components: [row] });
  await interaction.reply({ content: `✅ تم إنشاء التذكرة: ${ticketChannel}`, ephemeral: true });
}

async function handleTicketClose(interaction) {
  const cfg = getGuildConfig(interaction.guildId);
  const openTickets = cfg?.tickets?.openTickets || {};
  const ownerId = Object.keys(openTickets).find((id) => openTickets[id] === interaction.channelId);
  if (ownerId) {
    delete openTickets[ownerId];
    setGuildConfig(interaction.guildId, (c) => ({ ...c, tickets: { ...(c.tickets || {}), openTickets } }));
  }
  await interaction.reply('سيتم إغلاق التذكرة خلال 3 ثواني...');
  setTimeout(() => interaction.channel.delete().catch(() => null), 3000);
}

module.exports = { commands, handleTicketCreate, handleTicketClose, upsertWarn, getWarns, clearWarns };
