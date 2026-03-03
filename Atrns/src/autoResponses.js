const { getGuildConfig } = require('./utils/store');

async function handleAutoResponse(message) {
  if (!message.guild || message.author.bot) return false;

  const cfg = getGuildConfig(message.guild.id);
  const list = cfg.autoResponses || [];
  if (!list.length) return false;

  const content = (message.content || '').toLowerCase();
  const match = list.find((item) => content.includes(item.trigger.toLowerCase()));
  if (!match) return false;

  if (match.replyMode) {
    await message.reply(match.response).catch(() => null);
  } else {
    await message.channel.send(match.response).catch(() => null);
  }

  return true;
}

module.exports = { handleAutoResponse };
