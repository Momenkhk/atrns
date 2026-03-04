const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { commands, handleTicketCreate, handleTicketClose } = require('./src/commands');
const { getGuildConfig, setGuildConfig } = require('./src/utils/store');
const { handleTextCommand } = require('./src/textCommands');
const { handleAutoResponse } = require('./src/autoResponses');
const { readRuntimeConfig } = require('./src/runtimeConfig');

const runtimeConfig = readRuntimeConfig();
const token = runtimeConfig.bot.token;
const clientId = runtimeConfig.bot.clientId;

const spamTracker = new Map();
const voiceIntervals = new Map();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

function addXP(guildId, userId, type, amount, guild) {
  const cfg = getGuildConfig(guildId);
  const levelsCfg = cfg.levels || { chatEnabled: true, voiceEnabled: true };
  if ((type === 'chat' && !levelsCfg.chatEnabled) || (type === 'voice' && !levelsCfg.voiceEnabled)) return;

  const levelsData = cfg.levelsData || {};
  const current = levelsData[userId] || { chatXP: 0, voiceXP: 0, level: 0 };
  if (type === 'chat') current.chatXP += amount;
  if (type === 'voice') current.voiceXP += amount;

  const total = current.chatXP + current.voiceXP;
  const newLevel = Math.floor(total / 100);
  const leveledUp = newLevel > current.level;
  current.level = newLevel;

  setGuildConfig(guildId, (c) => ({ ...c, levelsData: { ...(c.levelsData || {}), [userId]: current } }));

  if (leveledUp && levelsCfg.announceChannelId && guild) {
    const channel = guild.channels.cache.get(levelsCfg.announceChannelId);
    if (channel?.isTextBased()) {
      channel.send(`🎉 <@${userId}> وصل لفل ${newLevel}!`).catch(() => null);
    }
  }
}

async function sendSecurityAlert(guild, title, description) {
  const cfg = getGuildConfig(guild.id);
  const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(0xc0392b).setTimestamp();

  const secChannel = cfg.securityLogsChannelId ? guild.channels.cache.get(cfg.securityLogsChannelId) : null;
  if (secChannel?.isTextBased()) await secChannel.send({ embeds: [embed] }).catch(() => null);

  const owner = await guild.fetchOwner().catch(() => null);
  const ownerDmAlerts = cfg.ownerDmAlerts ?? runtimeConfig?.defaults?.ownerDmAlerts ?? true;
  if (owner && ownerDmAlerts) await owner.send({ embeds: [embed] }).catch(() => null);
}

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
});

client.on(Events.GuildMemberAdd, async (member) => {
  const cfg = getGuildConfig(member.guild.id);

  const ageFilterEnabled = cfg.automod?.accountAgeFilterEnabled ?? runtimeConfig?.defaults?.accountAgeFilterEnabled ?? true;
  const minAgeDays = cfg.automod?.minAccountAgeDays ?? runtimeConfig?.defaults?.minAccountAgeDays ?? 0;
  const accountAgeMs = Date.now() - member.user.createdTimestamp;
  const minAgeMs = minAgeDays * 24 * 60 * 60 * 1000;
  if (ageFilterEnabled && minAgeDays > 0 && accountAgeMs < minAgeMs) {
    await member.kick(`Account younger than ${minAgeDays} days`).catch(() => null);
    await sendSecurityAlert(member.guild, '🛡️ حماية ضد الحسابات الوهمية', `تم طرد ${member.user.tag} لأن عمر الحساب أقل من ${minAgeDays} يوم.`);
    return;
  }

  const channel = cfg.welcomeChannelId ? member.guild.channels.cache.get(cfg.welcomeChannelId) : null;
  if (!channel?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle('🎉 عضو جديد')
    .setDescription(`أهلاً ${member} في سيرفر **${member.guild.name}**`)
    .setThumbnail(member.user.displayAvatarURL())
    .setColor(0x2ecc71);

  await channel.send({ embeds: [embed] }).catch(() => null);
});

client.on(Events.MessageDelete, async (message) => {
  if (!message.guild || message.author?.bot) return;
  const cfg = getGuildConfig(message.guild.id);
  const logsChannel = cfg.logsChannelId ? message.guild.channels.cache.get(cfg.logsChannelId) : null;
  if (!logsChannel?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle('🗑️ رسالة محذوفة')
    .setDescription(message.content ? message.content.slice(0, 1800) : 'رسالة بدون نص أو غير متاحة')
    .addFields(
      { name: 'الكاتب', value: `${message.author}`, inline: true },
      { name: 'القناة', value: `${message.channel}`, inline: true }
    )
    .setColor(0xe74c3c)
    .setTimestamp();

  await logsChannel.send({ embeds: [embed] }).catch(() => null);
});

client.on(Events.ChannelCreate, async (channel) => {
  if (!channel.guild) return;
  await sendSecurityAlert(channel.guild, '🛡️ تغيير أمني', `تم إنشاء قناة جديدة: ${channel}`);
});

client.on(Events.ChannelDelete, async (channel) => {
  if (!channel.guild) return;
  await sendSecurityAlert(channel.guild, '🛡️ تغيير أمني', `تم حذف قناة: ${channel.name}`);
});

client.on(Events.RoleCreate, async (role) => {
  await sendSecurityAlert(role.guild, '🛡️ تغيير أمني', `تم إنشاء رول: ${role.name}`);
});

client.on(Events.RoleDelete, async (role) => {
  await sendSecurityAlert(role.guild, '🛡️ تغيير أمني', `تم حذف رول: ${role.name}`);
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  const key = `${member.guild.id}:${member.id}`;

  if (!oldState.channelId && newState.channelId) {
    if (voiceIntervals.has(key)) clearInterval(voiceIntervals.get(key));
    const interval = setInterval(() => {
      const latest = member.guild.members.cache.get(member.id);
      if (!latest?.voice?.channelId) {
        clearInterval(interval);
        voiceIntervals.delete(key);
        return;
      }
      addXP(member.guild.id, member.id, 'voice', 5, member.guild);
    }, 60_000);
    voiceIntervals.set(key, interval);
  }

  if (oldState.channelId && !newState.channelId) {
    if (voiceIntervals.has(key)) {
      clearInterval(voiceIntervals.get(key));
      voiceIntervals.delete(key);
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (!message.guild || message.author.bot) return;

  const cfg = getGuildConfig(message.guild.id);
  const bannedWordsEnabled = cfg.automod?.bannedWordsEnabled ?? runtimeConfig?.defaults?.bannedWordsEnabled ?? true;
  const bannedWords = cfg.automod?.bannedWords || [];
  const content = message.content.toLowerCase();

  if (bannedWordsEnabled && bannedWords.some((word) => word && content.includes(word.toLowerCase()))) {
    await message.delete().catch(() => null);
    await message.channel.send(`⚠️ ${message.author} تم حذف رسالتك بسبب كلمة محظورة.`).catch(() => null);
    await sendSecurityAlert(message.guild, '🛡️ فلتر كلمات', `تم حذف رسالة من ${message.author.tag} بسبب كلمة محظورة.`);
    return;
  }

  const now = Date.now();
  const key = `${message.guild.id}:${message.author.id}`;
  const history = (spamTracker.get(key) || []).filter((t) => now - t < 8000);
  history.push(now);
  spamTracker.set(key, history);
  const antiSpamEnabled = cfg.automod?.antiSpamEnabled ?? runtimeConfig?.defaults?.antiSpamEnabled ?? true;
  const limit = cfg.automod?.antiSpamLimit ?? runtimeConfig?.defaults?.antiSpamLimit ?? 6;
  if (antiSpamEnabled && history.length >= limit) {
    await message.member.timeout(2 * 60 * 1000, 'Spam protection').catch(() => null);
    await message.channel.send(`🚫 ${message.author} تم إيقافك مؤقتاً بسبب السبام.`).catch(() => null);
    await sendSecurityAlert(message.guild, '🛡️ حماية سبام', `تم تطبيق timeout على ${message.author.tag} بسبب السبام.`);
    spamTracker.set(key, []);
    return;
  }

  addXP(message.guild.id, message.author.id, 'chat', 3, message.guild);

  const handled = await handleTextCommand(message).catch(() => false);
  if (handled) return;
  await handleAutoResponse(message).catch(() => null);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = commands.find((c) => c.data.name === interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'ticket:create') await handleTicketCreate(interaction);
      if (interaction.customId === 'ticket:close') await handleTicketClose(interaction);

      if (interaction.customId === 'panel:lock') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
        await interaction.reply({ content: '🔒 تم قفل القناة من البنل.', ephemeral: true });
      }
      if (interaction.customId === 'panel:unlock') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: true });
        await interaction.reply({ content: '🔓 تم فتح القناة من البنل.', ephemeral: true });
      }
      if (interaction.customId === 'panel:purge10') {
        const deleted = await interaction.channel.bulkDelete(10, true);
        await interaction.reply({ content: `🧹 تم حذف ${deleted.size} رسالة من البنل.`, ephemeral: true });
      }
      if (interaction.customId === 'panel:tickets') {
        const embed = new EmbedBuilder().setTitle('🎫 نظام التذاكر').setDescription('اضغط الزر لفتح تذكرة جديدة مع الإدارة.').setColor(0x2ecc71);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket:create').setLabel('فتح تذكرة').setStyle(ButtonStyle.Primary)
        );
        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ تم إرسال بنل التذاكر.', ephemeral: true });
      }

      if (interaction.customId === 'prot:toggleSpam') {
        const cfg = getGuildConfig(interaction.guildId);
        const current = cfg.automod?.antiSpamEnabled ?? true;
        setGuildConfig(interaction.guildId, (c) => ({
          ...c,
          automod: { ...(c.automod || {}), antiSpamEnabled: !current },
        }));
        await interaction.reply({ content: `🛡️ Anti-Spam: ${!current ? 'ON' : 'OFF'}`, ephemeral: true });
      }
      if (interaction.customId === 'prot:toggleWords') {
        const cfg = getGuildConfig(interaction.guildId);
        const current = cfg.automod?.bannedWordsEnabled ?? true;
        setGuildConfig(interaction.guildId, (c) => ({
          ...c,
          automod: { ...(c.automod || {}), bannedWordsEnabled: !current },
        }));
        await interaction.reply({ content: `🛡️ Word Filter: ${!current ? 'ON' : 'OFF'}`, ephemeral: true });
      }
      if (interaction.customId === 'prot:toggleAge') {
        const cfg = getGuildConfig(interaction.guildId);
        const current = cfg.automod?.accountAgeFilterEnabled ?? true;
        setGuildConfig(interaction.guildId, (c) => ({
          ...c,
          automod: { ...(c.automod || {}), accountAgeFilterEnabled: !current },
        }));
        await interaction.reply({ content: `🛡️ Account Age Filter: ${!current ? 'ON' : 'OFF'}`, ephemeral: true });
      }
    }
  } catch (error) {
    console.error(error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'حدث خطأ أثناء تنفيذ العملية.', ephemeral: true });
    }
  }
});

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(token);
  await rest.put(Routes.applicationCommands(clientId), {
    body: commands.map((command) => command.data.toJSON()),
  });
  console.log('✅ Slash commands registered.');
}

registerCommands()
  .then(() => client.login(token))
  .catch((err) => {
    console.error('Failed to start bot:', err);
    process.exit(1);
  });
