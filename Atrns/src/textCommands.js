const { PermissionsBitField } = require('discord.js');
const { getGuildConfig, clearWarns, getWarns, upsertWarn } = (() => {
  const store = require('./utils/store');
  const cmds = require('./commands');
  return {
    getGuildConfig: store.getGuildConfig,
    clearWarns: cmds.clearWarns,
    getWarns: cmds.getWarns,
    upsertWarn: cmds.upsertWarn,
  };
})();

const DEFAULT_SHORTCUTS = {
  بان: 'ban',
  طرد: 'kick',
  تايم: 'timeout',
  الغاءتايم: 'untimeout',
  انذار: 'warn',
  مسحالانذارات: 'clear-warns',
  تنظيف: 'purge',
  قفل: 'server-lock',
  فتح: 'server-unlock',
  بطيء: 'slowmode',
};

function parseDurationToMs(text) {
  const value = String(text || '').trim().toLowerCase();
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match) return null;
  const n = Number(match[1]);
  const unit = match[2];
  if (unit === 's') return n * 1000;
  if (unit === 'm') return n * 60 * 1000;
  if (unit === 'h') return n * 60 * 60 * 1000;
  if (unit === 'd') return n * 24 * 60 * 60 * 1000;
  return null;
}

async function resolveMember(message, token) {
  const id = token?.replace(/[<@!>]/g, '');
  if (!id) return null;
  return message.guild.members.fetch(id).catch(() => null);
}

async function handleTextCommand(message) {
  if (!message.guild || message.author.bot) return;

  const cfg = getGuildConfig(message.guild.id);
  const prefix = cfg.prefix || '!';
  if (!message.content.startsWith(prefix)) return;

  const parts = message.content.slice(prefix.length).trim().split(/\s+/);
  const rawCommand = (parts.shift() || '').toLowerCase();
  if (!rawCommand) return;

  const shortcuts = { ...DEFAULT_SHORTCUTS, ...(cfg.shortcuts || {}) };
  const command = shortcuts[rawCommand] || rawCommand;

  const hasPerm = (perm) => message.member.permissions.has(perm);

  if (command === 'server-lock' && hasPerm(PermissionsBitField.Flags.ManageChannels)) {
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
    await message.reply('🔒 تم قفل القناة عبر الاختصار.');
    return;
  }

  if (command === 'server-unlock' && hasPerm(PermissionsBitField.Flags.ManageChannels)) {
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
    await message.reply('🔓 تم فتح القناة عبر الاختصار.');
    return;
  }

  if (command === 'purge' && hasPerm(PermissionsBitField.Flags.ManageMessages)) {
    const count = Math.min(100, Math.max(1, Number(parts[0] || 1)));
    const deleted = await message.channel.bulkDelete(count, true);
    await message.reply(`🧹 تم حذف ${deleted.size} رسالة.`);
    return;
  }

  if (command === 'slowmode' && hasPerm(PermissionsBitField.Flags.ManageChannels)) {
    const seconds = Math.min(21600, Math.max(0, Number(parts[0] || 0)));
    await message.channel.setRateLimitPerUser(seconds);
    await message.reply(`✅ تم ضبط Slowmode إلى ${seconds} ثانية.`);
    return;
  }

  if (command === 'kick' && hasPerm(PermissionsBitField.Flags.KickMembers)) {
    const member = await resolveMember(message, parts[0]);
    if (!member) return void message.reply('حدد عضو صحيح: `!طرد @user السبب`');
    const reason = parts.slice(1).join(' ') || 'بدون سبب';
    await member.kick(reason);
    await message.reply(`👢 تم طرد ${member.user.tag}.`);
    return;
  }

  if (command === 'ban' && hasPerm(PermissionsBitField.Flags.BanMembers)) {
    const member = await resolveMember(message, parts[0]);
    if (!member) return void message.reply('حدد عضو صحيح: `!بان @user 10m السبب`');

    const maybeDuration = parseDurationToMs(parts[1]);
    if (maybeDuration) {
      const reason = parts.slice(2).join(' ') || 'بدون سبب';
      await member.timeout(maybeDuration, reason);
      await message.reply(`⏱️ تم تنفيذ اختصار بان كـ تايم أوت لمدة ${parts[1]} على ${member.user.tag}. السبب: ${reason}`);
      return;
    }

    const reason = parts.slice(1).join(' ') || 'بدون سبب';
    await message.guild.members.ban(member.id, { reason });
    await message.reply(`⛔ تم حظر ${member.user.tag}.`);
    return;
  }

  if (command === 'timeout' && hasPerm(PermissionsBitField.Flags.ModerateMembers)) {
    const member = await resolveMember(message, parts[0]);
    const durationMs = parseDurationToMs(parts[1]);
    if (!member || !durationMs) return void message.reply('الصيغة: `!تايم @user 10m السبب`');
    const reason = parts.slice(2).join(' ') || 'بدون سبب';
    await member.timeout(durationMs, reason);
    await message.reply(`⏱️ تم تايم أوت ${member.user.tag} لمدة ${parts[1]}.`);
    return;
  }

  if (command === 'untimeout' && hasPerm(PermissionsBitField.Flags.ModerateMembers)) {
    const member = await resolveMember(message, parts[0]);
    if (!member) return void message.reply('الصيغة: `!الغاءتايم @user`');
    await member.timeout(null);
    await message.reply(`✅ تم إلغاء التايم أوت عن ${member.user.tag}.`);
    return;
  }

  if (command === 'warn' && hasPerm(PermissionsBitField.Flags.ModerateMembers)) {
    const member = await resolveMember(message, parts[0]);
    if (!member) return void message.reply('الصيغة: `!انذار @user السبب`');
    const reason = parts.slice(1).join(' ') || 'بدون سبب';
    upsertWarn(message.guild.id, member.id, reason, message.author.id);
    const warns = getWarns(message.guild.id, member.id);
    await message.reply(`⚠️ تم إنذار ${member.user.tag}. العدد: ${warns.length}`);
    return;
  }

  if (command === 'clear-warns' && hasPerm(PermissionsBitField.Flags.ModerateMembers)) {
    const member = await resolveMember(message, parts[0]);
    if (!member) return void message.reply('الصيغة: `!مسحالانذارات @user`');
    clearWarns(message.guild.id, member.id);
    await message.reply(`✅ تم مسح إنذارات ${member.user.tag}.`);
  }
}

module.exports = {
  handleTextCommand,
};
