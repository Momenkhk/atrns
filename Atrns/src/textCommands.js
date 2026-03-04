const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('./utils/store');
const { clearWarns, getWarns, upsertWarn } = require('./commands');

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
  هيلب: 'help',
};

function parseDurationToMs(text) {
  const v = String(text || '').trim().toLowerCase();
  const m = v.match(/^(\d+)([smhd])$/);
  if (!m) return null;
  const n = Number(m[1]);
  const u = m[2];
  if (u === 's') return n * 1000;
  if (u === 'm') return n * 60 * 1000;
  if (u === 'h') return n * 60 * 60 * 1000;
  return n * 24 * 60 * 60 * 1000;
}

async function resolveMember(message, token) {
  const id = token?.replace(/[<@!>]/g, '');
  if (!id) return null;
  return message.guild.members.fetch(id).catch(() => null);
}

async function handleTextCommand(message) {
  if (!message.guild || message.author.bot) return false;
  const cfg = getGuildConfig(message.guild.id);
  const prefix = cfg.prefix || '!';
  if (!message.content.startsWith(prefix)) return false;

  const parts = message.content.slice(prefix.length).trim().split(/\s+/);
  const raw = (parts.shift() || '').toLowerCase();
  if (!raw) return false;

  const command = ({ ...DEFAULT_SHORTCUTS, ...(cfg.shortcuts || {}) })[raw] || raw;
  const hasPerm = (perm) => message.member.permissions.has(perm);

  if (command === 'help') {
    const embed = new EmbedBuilder()
      .setTitle('📚 ATRNS Prefix Help')
      .setDescription('أوامر Prefix السريعة (مع وجود Slash أيضًا).')
      .addFields(
        { name: 'أمثلة', value: `\`${prefix}help\` \`${prefix}ban @user reason\` \`${prefix}kick @user reason\` \`${prefix}purge 20\`` },
        { name: 'حماية/قنوات', value: `\`${prefix}server-lock\` \`${prefix}server-unlock\` \`${prefix}slowmode 10\`` },
        { name: 'أوامر إضافية', value: `\`${prefix}say نص\` \`${prefix}come\`` }
      )
      .setColor(0x5865f2);
    await message.reply({ embeds: [embed] });
    return true;
  }

  if (command === 'say' && hasPerm(PermissionsBitField.Flags.ManageMessages)) {
    const text = parts.join(' ');
    if (!text) return message.reply(`الصيغة: ${prefix}say النص`).then(() => true);
    await message.channel.send(text);
    return true;
  }

  if (command === 'come' && hasPerm(PermissionsBitField.Flags.ManageChannels)) {
    await message.channel.send(`👋 أنا موجود هنا يا ${message.author}`);
    return true;
  }

  if (command === 'server-lock' && hasPerm(PermissionsBitField.Flags.ManageChannels)) {
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
    await message.reply('🔒 تم قفل القناة عبر الاختصار.');
    return true;
  }
  if (command === 'server-unlock' && hasPerm(PermissionsBitField.Flags.ManageChannels)) {
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
    await message.reply('🔓 تم فتح القناة عبر الاختصار.');
    return true;
  }
  if (command === 'purge' && hasPerm(PermissionsBitField.Flags.ManageMessages)) {
    const count = Math.min(100, Math.max(1, Number(parts[0] || 1)));
    const deleted = await message.channel.bulkDelete(count, true);
    await message.reply(`🧹 تم حذف ${deleted.size} رسالة.`);
    return true;
  }
  if (command === 'slowmode' && hasPerm(PermissionsBitField.Flags.ManageChannels)) {
    const seconds = Math.min(21600, Math.max(0, Number(parts[0] || 0)));
    await message.channel.setRateLimitPerUser(seconds);
    await message.reply(`✅ تم ضبط Slowmode إلى ${seconds} ثانية.`);
    return true;
  }
  if (command === 'kick' && hasPerm(PermissionsBitField.Flags.KickMembers)) {
    const member = await resolveMember(message, parts[0]);
    if (!member) return message.reply(`الصيغة: ${prefix}kick @user السبب`).then(() => true);
    await member.kick(parts.slice(1).join(' ') || 'بدون سبب');
    await message.reply(`👢 تم طرد ${member.user.tag}.`);
    return true;
  }
  if (command === 'ban' && hasPerm(PermissionsBitField.Flags.BanMembers)) {
    const member = await resolveMember(message, parts[0]);
    if (!member) return message.reply(`الصيغة: ${prefix}ban @user 10m السبب`).then(() => true);
    const dur = parseDurationToMs(parts[1]);
    if (dur) {
      await member.timeout(dur, parts.slice(2).join(' ') || 'بدون سبب');
      await message.reply(`⏱️ تم تايم أوت ${member.user.tag} لمدة ${parts[1]}.`);
      return true;
    }
    await message.guild.members.ban(member.id, { reason: parts.slice(1).join(' ') || 'بدون سبب' });
    await message.reply(`⛔ تم حظر ${member.user.tag}.`);
    return true;
  }
  if (command === 'timeout' && hasPerm(PermissionsBitField.Flags.ModerateMembers)) {
    const member = await resolveMember(message, parts[0]);
    const dur = parseDurationToMs(parts[1]);
    if (!member || !dur) return message.reply(`الصيغة: ${prefix}timeout @user 10m السبب`).then(() => true);
    await member.timeout(dur, parts.slice(2).join(' ') || 'بدون سبب');
    await message.reply(`⏱️ تم تايم أوت ${member.user.tag}.`);
    return true;
  }
  if (command === 'untimeout' && hasPerm(PermissionsBitField.Flags.ModerateMembers)) {
    const member = await resolveMember(message, parts[0]);
    if (!member) return message.reply(`الصيغة: ${prefix}untimeout @user`).then(() => true);
    await member.timeout(null);
    await message.reply(`✅ تم إلغاء التايم أوت عن ${member.user.tag}.`);
    return true;
  }
  if (command === 'warn' && hasPerm(PermissionsBitField.Flags.ModerateMembers)) {
    const member = await resolveMember(message, parts[0]);
    if (!member) return message.reply(`الصيغة: ${prefix}warn @user السبب`).then(() => true);
    upsertWarn(message.guild.id, member.id, parts.slice(1).join(' ') || 'بدون سبب', message.author.id);
    await message.reply(`⚠️ تم إنذار ${member.user.tag}. العدد: ${getWarns(message.guild.id, member.id).length}`);
    return true;
  }
  if (command === 'clear-warns' && hasPerm(PermissionsBitField.Flags.ModerateMembers)) {
    const member = await resolveMember(message, parts[0]);
    if (!member) return message.reply(`الصيغة: ${prefix}clear-warns @user`).then(() => true);
    clearWarns(message.guild.id, member.id);
    await message.reply(`✅ تم مسح إنذارات ${member.user.tag}.`);
    return true;
  }

  return false;
}

module.exports = { handleTextCommand };
