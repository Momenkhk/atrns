require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, Events, EmbedBuilder } = require('discord.js');
const { commands, handleTicketCreate, handleTicketClose } = require('./src/commands');
const { getGuildConfig } = require('./src/utils/store');
const { handleTextCommand } = require('./src/textCommands');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
  console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in environment variables.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
});

client.on(Events.GuildMemberAdd, async (member) => {
  const cfg = getGuildConfig(member.guild.id);
  if (!cfg.welcomeChannelId) return;

  const channel = member.guild.channels.cache.get(cfg.welcomeChannelId);
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
  if (!cfg.logsChannelId) return;

  const logsChannel = message.guild.channels.cache.get(cfg.logsChannelId);
  if (!logsChannel?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle('🗑️ رسالة محذوفة')
    .setDescription(message.content ? message.content.slice(0, 1800) : 'رسالة بدون نص أو غير متاحة في الكاش')
    .addFields(
      { name: 'الكاتب', value: `${message.author}`, inline: true },
      { name: 'القناة', value: `${message.channel}`, inline: true }
    )
    .setColor(0xe74c3c)
    .setTimestamp();

  await logsChannel.send({ embeds: [embed] }).catch(() => null);
});


client.on(Events.MessageCreate, async (message) => {
  await handleTextCommand(message).catch(() => null);
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
        const embed = new EmbedBuilder()
          .setTitle('🎫 نظام التذاكر')
          .setDescription('اضغط الزر لفتح تذكرة جديدة مع الإدارة.')
          .setColor(0x2ecc71);
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket:create').setLabel('فتح تذكرة').setStyle(ButtonStyle.Primary)
        );
        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ تم إرسال بنل التذاكر.', ephemeral: true });
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
