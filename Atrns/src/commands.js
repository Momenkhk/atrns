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
    userWarns.push({
      reason,
      moderatorId,
      createdAt: new Date().toISOString(),
    });

    return {
      ...current,
      moderation: {
        ...moderation,
        warns: {
          ...warns,
          [userId]: userWarns,
        },
      },
    };
  });
}

function getWarns(guildId, userId) {
  const cfg = getGuildConfig(guildId);
  return cfg?.moderation?.warns?.[userId] || [];
}

function clearWarns(guildId, userId) {
  setGuildConfig(guildId, (current) => {
    const warns = { ...(current?.moderation?.warns || {}) };
    delete warns[userId];

    return {
      ...current,
      moderation: {
        ...(current.moderation || {}),
        warns,
      },
    };
  });
}

const commands = [
  {
    data: new SlashCommandBuilder()
      .setName('setup-tickets')
      .setDescription('إعداد نظام التذاكر')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addChannelOption((opt) =>
        opt.setName('panel_channel').setDescription('قناة إرسال لوحة التذاكر').setRequired(true)
      )
      .addChannelOption((opt) =>
        opt
          .setName('category')
          .setDescription('تصنيف إنشاء التذاكر')
          .addChannelTypes(ChannelType.GuildCategory)
      )
      .addRoleOption((opt) =>
        opt.setName('support_role').setDescription('رول فريق الدعم')
      ),
    async execute(interaction) {
      const panelChannel = interaction.options.getChannel('panel_channel', true);
      const category = interaction.options.getChannel('category', false);
      const supportRole = interaction.options.getRole('support_role', false);

      const embed = new EmbedBuilder()
        .setTitle('🎫 نظام التذاكر')
        .setDescription('اضغط الزر لفتح تذكرة جديدة مع الإدارة.')
        .setColor(0x2ecc71);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket:create')
          .setLabel('فتح تذكرة')
          .setStyle(ButtonStyle.Primary)
      );

      await panelChannel.send({ embeds: [embed], components: [row] });

      setGuildConfig(interaction.guildId, (current) => ({
        ...current,
        tickets: {
          panelChannelId: panelChannel.id,
          categoryId: category?.id,
          supportRoleId: supportRole?.id,
          openTickets: current?.tickets?.openTickets || {},
        },
      }));

      await interaction.reply({ content: '✅ تم إعداد نظام التذاكر.', ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('setup-logs')
      .setDescription('تحديد قناة اللوجات')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addChannelOption((opt) =>
        opt.setName('channel').setDescription('قناة اللوجات').setRequired(true)
      ),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel', true);
      setGuildConfig(interaction.guildId, (current) => ({ ...current, logsChannelId: channel.id }));
      await interaction.reply({ content: `✅ تم ضبط قناة اللوجات: ${channel}`, ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('setup-welcome')
      .setDescription('تحديد قناة الترحيب')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addChannelOption((opt) =>
        opt.setName('channel').setDescription('قناة الترحيب').setRequired(true)
      ),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel', true);
      setGuildConfig(interaction.guildId, (current) => ({ ...current, welcomeChannelId: channel.id }));
      await interaction.reply({ content: `✅ تم ضبط قناة الترحيب: ${channel}`, ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('server-lock')
      .setDescription('قفل القناة الحالية')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false,
      });
      await interaction.reply('🔒 تم قفل القناة.');
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('server-unlock')
      .setDescription('فتح القناة الحالية')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: true,
      });
      await interaction.reply('🔓 تم فتح القناة.');
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('purge')
      .setDescription('حذف رسائل')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addIntegerOption((opt) =>
        opt.setName('count').setDescription('عدد الرسائل 1-100').setRequired(true).setMinValue(1).setMaxValue(100)
      ),
    async execute(interaction) {
      const count = interaction.options.getInteger('count', true);
      const deleted = await interaction.channel.bulkDelete(count, true);
      await interaction.reply({ content: `🧹 تم حذف ${deleted.size} رسالة.`, ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder().setName('server-info').setDescription('معلومات السيرفر'),
    async execute(interaction) {
      const guild = interaction.guild;
      const embed = new EmbedBuilder()
        .setTitle(`معلومات ${guild.name}`)
        .addFields(
          { name: 'الأعضاء', value: `${guild.memberCount}`, inline: true },
          { name: 'القنوات', value: `${guild.channels.cache.size}`, inline: true },
          { name: 'الرولات', value: `${guild.roles.cache.size}`, inline: true }
        )
        .setColor(0x3498db)
        .setThumbnail(guild.iconURL());
      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('user-info')
      .setDescription('معلومات عضو')
      .addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true)),
    async execute(interaction) {
      const user = interaction.options.getUser('user', true);
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const embed = new EmbedBuilder()
        .setTitle(`معلومات ${user.tag}`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: 'ID', value: user.id, inline: false },
          { name: 'تاريخ إنشاء الحساب', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
          {
            name: 'تاريخ الدخول',
            value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'غير متاح',
            inline: true,
          }
        )
        .setColor(0x95a5a6);
      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('role-add')
      .setDescription('إضافة رول لعضو')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true))
      .addRoleOption((opt) => opt.setName('role').setDescription('الرول').setRequired(true)),
    async execute(interaction) {
      const user = interaction.options.getUser('user', true);
      const role = interaction.options.getRole('role', true);
      const member = await interaction.guild.members.fetch(user.id);
      await member.roles.add(role);
      await interaction.reply(`✅ تم إضافة رول ${role} إلى ${member}.`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('role-remove')
      .setDescription('إزالة رول من عضو')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true))
      .addRoleOption((opt) => opt.setName('role').setDescription('الرول').setRequired(true)),
    async execute(interaction) {
      const user = interaction.options.getUser('user', true);
      const role = interaction.options.getRole('role', true);
      const member = await interaction.guild.members.fetch(user.id);
      await member.roles.remove(role);
      await interaction.reply(`✅ تم إزالة رول ${role} من ${member}.`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('nick')
      .setDescription('تغيير اسم عضو')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
      .addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true))
      .addStringOption((opt) => opt.setName('name').setDescription('الاسم الجديد').setRequired(true)),
    async execute(interaction) {
      const user = interaction.options.getUser('user', true);
      const name = interaction.options.getString('name', true);
      const member = await interaction.guild.members.fetch(user.id);
      await member.setNickname(name);
      await interaction.reply(`✅ تم تغيير الاسم إلى: ${name}`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('timeout')
      .setDescription('تايم أوت لعضو')
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true))
      .addIntegerOption((opt) => opt.setName('minutes').setDescription('بالدقائق').setRequired(true).setMinValue(1).setMaxValue(40320))
      .addStringOption((opt) => opt.setName('reason').setDescription('السبب').setRequired(false)),
    async execute(interaction) {
      const user = interaction.options.getUser('user', true);
      const minutes = interaction.options.getInteger('minutes', true);
      const reason = interaction.options.getString('reason') || 'بدون سبب';
      const member = await interaction.guild.members.fetch(user.id);
      await member.timeout(minutes * 60 * 1000, reason);
      await interaction.reply(`⏱️ تم عمل تايم أوت لـ ${member} لمدة ${minutes} دقيقة. السبب: ${reason}`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('untimeout')
      .setDescription('إلغاء التايم أوت')
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true)),
    async execute(interaction) {
      const user = interaction.options.getUser('user', true);
      const member = await interaction.guild.members.fetch(user.id);
      await member.timeout(null);
      await interaction.reply(`✅ تم إلغاء التايم أوت عن ${member}.`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('warn')
      .setDescription('توجيه إنذار لعضو')
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true))
      .addStringOption((opt) => opt.setName('reason').setDescription('السبب').setRequired(true)),
    async execute(interaction) {
      const user = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason', true);
      upsertWarn(interaction.guildId, user.id, reason, interaction.user.id);
      const warns = getWarns(interaction.guildId, user.id);
      await interaction.reply(`⚠️ تم إنذار ${user}. عدد الإنذارات: ${warns.length}`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('warns')
      .setDescription('عرض إنذارات عضو')
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true)),
    async execute(interaction) {
      const user = interaction.options.getUser('user', true);
      const warns = getWarns(interaction.guildId, user.id);
      if (!warns.length) {
        await interaction.reply(`لا يوجد إنذارات على ${user}.`);
        return;
      }

      const lines = warns
        .slice(-10)
        .map((w, idx) => `${idx + 1}. ${w.reason} (mod: <@${w.moderatorId}>, <t:${Math.floor(new Date(w.createdAt).getTime() / 1000)}:R>)`)
        .join('\n');

      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle(`إنذارات ${user.tag}`).setDescription(lines).setColor(0xf39c12)],
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('clear-warns')
      .setDescription('مسح إنذارات عضو')
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true)),
    async execute(interaction) {
      const user = interaction.options.getUser('user', true);
      clearWarns(interaction.guildId, user.id);
      await interaction.reply(`✅ تم مسح إنذارات ${user}.`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('kick')
      .setDescription('طرد عضو')
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
      .addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true))
      .addStringOption((opt) => opt.setName('reason').setDescription('السبب').setRequired(false)),
    async execute(interaction) {
      const user = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason') || 'بدون سبب';
      const member = await interaction.guild.members.fetch(user.id);
      await member.kick(reason);
      await interaction.reply(`👢 تم طرد ${user.tag}. السبب: ${reason}`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('ban')
      .setDescription('حظر عضو')
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true))
      .addStringOption((opt) => opt.setName('reason').setDescription('السبب').setRequired(false)),
    async execute(interaction) {
      const user = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason') || 'بدون سبب';
      await interaction.guild.members.ban(user.id, { reason });
      await interaction.reply(`⛔ تم حظر ${user.tag}. السبب: ${reason}`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('unban')
      .setDescription('فك حظر عضو بالآيدي')
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addStringOption((opt) => opt.setName('user_id').setDescription('ايدي العضو').setRequired(true)),
    async execute(interaction) {
      const userId = interaction.options.getString('user_id', true);
      await interaction.guild.members.unban(userId);
      await interaction.reply(`✅ تم فك الحظر عن ${userId}.`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('channel-create')
      .setDescription('إنشاء قناة')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addStringOption((opt) => opt.setName('name').setDescription('اسم القناة').setRequired(true))
      .addStringOption((opt) =>
        opt
          .setName('type')
          .setDescription('نوع القناة')
          .addChoices({ name: 'text', value: 'text' }, { name: 'voice', value: 'voice' })
          .setRequired(true)
      ),
    async execute(interaction) {
      const name = interaction.options.getString('name', true);
      const type = interaction.options.getString('type', true);
      const channel = await interaction.guild.channels.create({
        name,
        type: type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText,
      });
      await interaction.reply(`✅ تم إنشاء القناة ${channel}.`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('channel-delete')
      .setDescription('حذف قناة')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addChannelOption((opt) => opt.setName('channel').setDescription('القناة').setRequired(true)),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel', true);
      await channel.delete('Deleted via command');
      await interaction.reply('✅ تم حذف القناة.');
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('slowmode')
      .setDescription('تغيير slowmode للقناة الحالية')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addIntegerOption((opt) =>
        opt.setName('seconds').setDescription('0 - 21600').setRequired(true).setMinValue(0).setMaxValue(21600)
      ),
    async execute(interaction) {
      const seconds = interaction.options.getInteger('seconds', true);
      await interaction.channel.setRateLimitPerUser(seconds);
      await interaction.reply(`✅ تم ضبط Slowmode على ${seconds} ثانية.`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('announce')
      .setDescription('إرسال إعلان مميز')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addChannelOption((opt) => opt.setName('channel').setDescription('القناة').setRequired(true))
      .addStringOption((opt) => opt.setName('title').setDescription('العنوان').setRequired(true))
      .addStringOption((opt) => opt.setName('message').setDescription('المحتوى').setRequired(true)),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel', true);
      const title = interaction.options.getString('title', true);
      const message = interaction.options.getString('message', true);
      const embed = new EmbedBuilder().setTitle(`📢 ${title}`).setDescription(message).setColor(0x9b59b6);
      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: '✅ تم إرسال الإعلان.', ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('ticket-add')
      .setDescription('إضافة عضو إلى التذكرة الحالية')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true)),
    async execute(interaction) {
      const user = interaction.options.getUser('user', true);
      await interaction.channel.permissionOverwrites.edit(user.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });
      await interaction.reply(`✅ تمت إضافة ${user} للتذكرة.`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('ticket-remove')
      .setDescription('إزالة عضو من التذكرة الحالية')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addUserOption((opt) => opt.setName('user').setDescription('العضو').setRequired(true)),
    async execute(interaction) {
      const user = interaction.options.getUser('user', true);
      await interaction.channel.permissionOverwrites.delete(user.id).catch(() => null);
      await interaction.reply(`✅ تمت إزالة ${user} من التذكرة.`);
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('control-panel')
      .setDescription('إرسال بنل تحكم شامل في القناة الحالية')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const cfg = getGuildConfig(interaction.guildId);
      const aliases = cfg.shortcuts || {};
      const aliasLines = Object.keys(aliases).length
        ? Object.entries(aliases)
            .map(([alias, command]) => `• ${alias} ➜ ${command}`)
            .slice(0, 15)
            .join('\n')
        : 'لا توجد اختصارات مخصصة بعد.';

      const embed = new EmbedBuilder()
        .setTitle('🎛️ ATRNS Control Panel')
        .setDescription('بنل سريع لإدارة السيرفر + عرض الاختصارات النصية.')
        .addFields(
          {
            name: 'أزرار سريعة',
            value: '🔒 قفل القناة\n🔓 فتح القناة\n🧹 حذف 10 رسائل\n🎫 إرسال بنل التذاكر',
            inline: true,
          },
          {
            name: 'اختصارات نصية مخصصة',
            value: aliasLines,
            inline: true,
          },
          {
            name: 'أمثلة اختصارات',
            value: '`!بان @user 10m سبب`\n`!طرد @user سبب`\n`!تنظيف 20`',
            inline: false,
          }
        )
        .setColor(0x5865f2);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('panel:lock').setLabel('قفل').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('panel:unlock').setLabel('فتح').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('panel:purge10').setLabel('حذف 10').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('panel:tickets').setLabel('بنل التذاكر').setStyle(ButtonStyle.Primary)
      );

      await interaction.channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: '✅ تم إرسال بنل التحكم.', ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('shortcut-set')
      .setDescription('إضافة اختصار نصي لأمر إداري')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption((opt) => opt.setName('alias').setDescription('الاختصار مثل: بان').setRequired(true))
      .addStringOption((opt) =>
        opt
          .setName('command')
          .setDescription('الأمر الأساسي')
          .setRequired(true)
          .addChoices(
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
    async execute(interaction) {
      const alias = interaction.options.getString('alias', true).trim().toLowerCase();
      const command = interaction.options.getString('command', true);
      setGuildConfig(interaction.guildId, (current) => ({
        ...current,
        shortcuts: {
          ...(current.shortcuts || {}),
          [alias]: command,
        },
      }));
      await interaction.reply({ content: `✅ تم ربط الاختصار \`${alias}\` بالأمر \`${command}\`.`, ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('shortcut-list')
      .setDescription('عرض كل الاختصارات النصية')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const cfg = getGuildConfig(interaction.guildId);
      const shortcuts = cfg.shortcuts || {};
      if (!Object.keys(shortcuts).length) {
        await interaction.reply({ content: 'لا توجد اختصارات حالياً.', ephemeral: true });
        return;
      }
      const lines = Object.entries(shortcuts).map(([alias, command]) => `• ${alias} ➜ ${command}`).join('\n');
      await interaction.reply({ embeds: [new EmbedBuilder().setTitle('اختصارات الأوامر').setDescription(lines).setColor(0x1abc9c)] });
    },
  },
];

async function handleTicketCreate(interaction) {
  const cfg = getGuildConfig(interaction.guildId);
  const ticketsCfg = cfg.tickets || {};

  if (!ticketsCfg.panelChannelId) {
    await interaction.reply({ content: '❌ نظام التذاكر غير مفعّل.', ephemeral: true });
    return;
  }

  const alreadyOpenId = ticketsCfg.openTickets?.[interaction.user.id];
  if (alreadyOpenId) {
    await interaction.reply({ content: `عندك تذكرة مفتوحة: <#${alreadyOpenId}>`, ephemeral: true });
    return;
  }

  const ticketChannel = await interaction.guild.channels.create({
    name: `ticket-${interaction.user.username}`,
    type: ChannelType.GuildText,
    parent: ticketsCfg.categoryId,
    permissionOverwrites: [
      { id: interaction.guild.roles.everyone.id, deny: ['ViewChannel'] },
      {
        id: interaction.user.id,
        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
      },
      ...(ticketsCfg.supportRoleId
        ? [
            {
              id: ticketsCfg.supportRoleId,
              allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
            },
          ]
        : []),
    ],
  });

  setGuildConfig(interaction.guildId, (current) => ({
    ...current,
    tickets: {
      ...(current.tickets || {}),
      openTickets: {
        ...(current.tickets?.openTickets || {}),
        [interaction.user.id]: ticketChannel.id,
      },
    },
  }));

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket:close').setLabel('إغلاق التذكرة').setStyle(ButtonStyle.Danger)
  );

  await ticketChannel.send({
    content:
      `مرحباً ${interaction.user}، سيتم الرد عليك قريباً.` +
      (ticketsCfg.supportRoleId ? ` <@&${ticketsCfg.supportRoleId}>` : ''),
    components: [row],
  });

  await interaction.reply({ content: `✅ تم إنشاء التذكرة: ${ticketChannel}`, ephemeral: true });
}

async function handleTicketClose(interaction) {
  const cfg = getGuildConfig(interaction.guildId);
  const ticketsCfg = cfg.tickets || {};
  const openTickets = ticketsCfg.openTickets || {};

  const ownerId = Object.keys(openTickets).find((userId) => openTickets[userId] === interaction.channelId);
  if (ownerId) {
    delete openTickets[ownerId];
    setGuildConfig(interaction.guildId, (current) => ({
      ...current,
      tickets: {
        ...(current.tickets || {}),
        openTickets,
      },
    }));
  }

  await interaction.reply('سيتم إغلاق التذكرة خلال 3 ثواني...');
  setTimeout(() => interaction.channel.delete().catch(() => null), 3000);
}

module.exports = {
  commands,
  handleTicketCreate,
  handleTicketClose,
  upsertWarn,
  getWarns,
  clearWarns,
};
