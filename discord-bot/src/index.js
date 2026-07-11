require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();

// ─── Slash Commands ────────────────────────────────────────
const commands = [
  // User commands
  { name: 'redeem', description: 'Redeem a license key', options: [{ name: 'key', description: 'Your license key', type: 3, required: true }] },
  { name: 'resethwid', description: 'Reset your HWID to bind to a new machine' },
  { name: 'myscripts', description: 'View your accessible scripts' },
  { name: 'status', description: 'Check your key status and expiry' },
  { name: 'panel', description: 'Open the user control panel' },

  // Admin commands
  { name: 'whitelist', description: 'Whitelist a user for your project', options: [
    { name: 'user', description: 'Discord user to whitelist', type: 6, required: true },
    { name: 'project', description: 'Project slug or ID', type: 3, required: true },
  ]},
  { name: 'unwhitelist', description: 'Remove a user from whitelist', options: [
    { name: 'user', description: 'Discord user to unwhitelist', type: 6, required: true },
  ]},
  { name: 'blacklist', description: 'Blacklist a user from your projects', options: [
    { name: 'user', description: 'Discord user to blacklist', type: 6, required: true },
  ]},
  { name: 'mass-whitelist', description: 'Whitelist all members with a specific role', options: [
    { name: 'role', description: 'Discord role to whitelist', type: 8, required: true },
    { name: 'project', description: 'Project slug or ID', type: 3, required: true },
  ]},
  { name: 'force-resethwid', description: 'Override cooldown and reset a user HWID', options: [
    { name: 'user', description: 'Discord user', type: 6, required: true },
  ]},
  { name: 'compensate', description: 'Add days to all keys in a project', options: [
    { name: 'days', description: 'Number of days to add', type: 4, required: true },
    { name: 'project', description: 'Project slug or ID', type: 3, required: true },
  ]},
  { name: 'givekey', description: 'Grant a free key to a user', options: [
    { name: 'user', description: 'Discord user', type: 6, required: true },
    { name: 'project', description: 'Project slug or ID', type: 3, required: true },
  ]},
  { name: 'revokekey', description: 'Revoke a specific user key', options: [
    { name: 'user', description: 'Discord user', type: 6, required: true },
  ]},

  // Setup commands
  { name: 'login', description: 'Authenticate the bot with your API key', options: [
    { name: 'api_key', description: 'Your luau.uwu API key', type: 3, required: true },
  ]},
  { name: 'logout', description: 'Disconnect the bot from your account' },
  { name: 'setpanel', description: 'Set up the user control panel in this channel' },
  { name: 'setlogs', description: 'Set the logging channel', options: [
    { name: 'channel', description: 'Channel for logs', type: 7, required: true },
  ]},
];

// ─── Command Handlers ──────────────────────────────────────

const handlers = {
  async redeem(interaction) {
    const key = interaction.options.getString('key');
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const { data } = await axios.post(`${process.env.API_BASE_URL}/validate`, {
        key,
        discord_id: interaction.user.id,
      });
      
      if (data.valid) {
        // Assign whitelist role if configured
        if (process.env.WHITELIST_ROLE_NAME) {
          const role = interaction.guild.roles.cache.find(r => r.name === process.env.WHITELIST_ROLE_NAME);
          if (role) await interaction.member.roles.add(role).catch(() => {});
        }
        
        const embed = new EmbedBuilder()
          .setColor(0x22d3ee)
          .setTitle('✅ Key Redeemed Successfully')
          .setDescription(`Your key has been activated!`)
          .addFields(
            { name: 'Plan', value: data.plan || 'Unknown', inline: true },
            { name: 'Expires', value: data.expires_at ? new Date(data.expires_at).toLocaleDateString() : 'Never', inline: true },
          )
          .setFooter({ text: 'luau.uwu' });
        
        await interaction.editReply({ embeds: [embed], ephemeral: true });
      } else {
        await interaction.editReply({ content: `❌ Invalid key: ${data.reason || 'Unknown error'}`, ephemeral: true });
      }
    } catch (err) {
      await interaction.editReply({ content: '❌ Failed to validate key. Please try again later.', ephemeral: true });
    }
  },

  async resethwid(interaction) {
    await interaction.deferReply({ ephemeral: true });
    try {
      const { data } = await axios.post(`${process.env.API_BASE_URL}/keys/reset-hwid`, {
        discord_id: interaction.user.id,
      }, { headers: { Authorization: `Bearer ${process.env.API_KEY}` } });
      
      await interaction.editReply({ content: '✅ HWID reset successfully! Your key can now be bound to a new machine.', ephemeral: true });
    } catch (err) {
      await interaction.editReply({ content: '❌ Failed to reset HWID. You may have a cooldown active.', ephemeral: true });
    }
  },

  async myscripts(interaction) {
    await interaction.deferReply({ ephemeral: true });
    try {
      const { data } = await axios.get(`${process.env.API_BASE_URL}/keys/my-scripts`, {
        headers: { Authorization: `Bearer ${process.env.API_KEY}` },
        params: { discord_id: interaction.user.id },
      });
      
      if (!data.scripts || data.scripts.length === 0) {
        return interaction.editReply({ content: '📝 You don\'t have any accessible scripts. Redeem a key first!', ephemeral: true });
      }
      
      const embed = new EmbedBuilder()
        .setColor(0x6366f1)
        .setTitle('📜 Your Scripts')
        .setDescription(data.scripts.map((s, i) => `${i + 1}. **${s.name}** — [Load](${s.url})`).join('\n'))
        .setFooter({ text: 'luau.uwu' });
      
      await interaction.editReply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      await interaction.editReply({ content: '❌ Failed to fetch scripts.', ephemeral: true });
    }
  },

  async status(interaction) {
    await interaction.deferReply({ ephemeral: true });
    try {
      const { data } = await axios.get(`${process.env.API_BASE_URL}/keys/my-status`, {
        headers: { Authorization: `Bearer ${process.env.API_KEY}` },
        params: { discord_id: interaction.user.id },
      });
      
      const embed = new EmbedBuilder()
        .setColor(0x6366f1)
        .setTitle('🔑 Key Status')
        .addFields(
          { name: 'Status', value: data.active ? '✅ Active' : '❌ Inactive', inline: true },
          { name: 'Plan', value: data.plan || 'Free', inline: true },
          { name: 'Expires', value: data.expires_at ? new Date(data.expires_at).toLocaleDateString() : 'Never', inline: true },
          { name: 'HWID Locked', value: data.hwid_locked ? 'Yes' : 'No', inline: true },
          { name: 'Scripts Accessible', value: String(data.script_count || 0), inline: true },
        )
        .setFooter({ text: 'luau.uwu' });
      
      await interaction.editReply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      await interaction.editReply({ content: '❌ Failed to fetch status.', ephemeral: true });
    }
  },

  async panel(interaction) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('panel_redeem').setLabel('Redeem Key').setStyle(ButtonStyle.Primary).setEmoji('🔑'),
      new ButtonBuilder().setCustomId('panel_resethwid').setLabel('Reset HWID').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
      new ButtonBuilder().setCustomId('panel_scripts').setLabel('My Scripts').setStyle(ButtonStyle.Success).setEmoji('📜'),
      new ButtonBuilder().setCustomId('panel_status').setLabel('Status').setStyle(ButtonStyle.Secondary).setEmoji('📊'),
    );
    
    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle('🎮 luau.uwu Control Panel')
      .setDescription('Select an option below to manage your keys and scripts.')
      .setFooter({ text: 'luau.uwu' });
    
    await interaction.reply({ embeds: [embed], components: [row] });
  },

  async whitelist(interaction) {
    if (!isManager(interaction)) return interaction.reply({ content: '❌ You don\'t have permission to use this command.', ephemeral: true });
    const user = interaction.options.getUser('user');
    const project = interaction.options.getString('project');
    await interaction.deferReply({ ephemeral: true });
    
    try {
      await axios.post(`${process.env.API_BASE_URL}/admin/whitelist`, {
        discord_id: user.id,
        project,
      }, { headers: { Authorization: `Bearer ${process.env.API_KEY}` } });
      
      if (process.env.WHITELIST_ROLE_NAME) {
        const member = await interaction.guild.members.fetch(user.id);
        const role = interaction.guild.roles.cache.find(r => r.name === process.env.WHITELIST_ROLE_NAME);
        if (role && member) await member.roles.add(role).catch(() => {});
      }
      
      await interaction.editReply({ content: `✅ **${user.tag}** has been whitelisted for **${project}**.`, ephemeral: true });
      await logAction(interaction, `Whitelisted ${user.tag} for ${project}`);
    } catch (err) {
      await interaction.editReply({ content: '❌ Failed to whitelist user.', ephemeral: true });
    }
  },

  async unwhitelist(interaction) {
    if (!isManager(interaction)) return interaction.reply({ content: '❌ You don\'t have permission.', ephemeral: true });
    const user = interaction.options.getUser('user');
    await interaction.deferReply({ ephemeral: true });
    
    try {
      await axios.post(`${process.env.API_BASE_URL}/admin/unwhitelist`, {
        discord_id: user.id,
      }, { headers: { Authorization: `Bearer ${process.env.API_KEY}` } });
      
      if (process.env.WHITELIST_ROLE_NAME) {
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        const role = interaction.guild.roles.cache.find(r => r.name === process.env.WHITELIST_ROLE_NAME);
        if (role && member) await member.roles.remove(role).catch(() => {});
      }
      
      await interaction.editReply({ content: `✅ **${user.tag}** has been unwhitelisted.`, ephemeral: true });
      await logAction(interaction, `Unwhitelisted ${user.tag}`);
    } catch (err) {
      await interaction.editReply({ content: '❌ Failed to unwhitelist user.', ephemeral: true });
    }
  },

  async blacklist(interaction) {
    if (!isManager(interaction)) return interaction.reply({ content: '❌ You don\'t have permission.', ephemeral: true });
    const user = interaction.options.getUser('user');
    await interaction.deferReply({ ephemeral: true });
    
    try {
      await axios.post(`${process.env.API_BASE_URL}/admin/blacklist`, {
        discord_id: user.id,
      }, { headers: { Authorization: `Bearer ${process.env.API_KEY}` } });
      
      await interaction.editReply({ content: `✅ **${user.tag}** has been blacklisted.`, ephemeral: true });
      await logAction(interaction, `Blacklisted ${user.tag}`);
    } catch (err) {
      await interaction.editReply({ content: '❌ Failed to blacklist user.', ephemeral: true });
    }
  },

  async 'mass-whitelist'(interaction) {
    if (!isManager(interaction)) return interaction.reply({ content: '❌ You don\'t have permission.', ephemeral: true });
    const role = interaction.options.getRole('role');
    const project = interaction.options.getString('project');
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const members = await interaction.guild.members.fetch();
      const roleMembers = members.filter(m => m.roles.cache.has(role.id));
      const discordIds = roleMembers.map(m => m.id);
      
      await axios.post(`${process.env.API_BASE_URL}/admin/mass-whitelist`, {
        discord_ids: discordIds,
        project,
      }, { headers: { Authorization: `Bearer ${process.env.API_KEY}` } });
      
      await interaction.editReply({ content: `✅ Whitelisted **${discordIds.length}** members with the **${role.name}** role for **${project}**.`, ephemeral: true });
      await logAction(interaction, `Mass-whitelisted ${discordIds.length} members with role ${role.name}`);
    } catch (err) {
      await interaction.editReply({ content: '❌ Failed to mass-whitelist.', ephemeral: true });
    }
  },

  async 'force-resethwid'(interaction) {
    if (!isManager(interaction)) return interaction.reply({ content: '❌ You don\'t have permission.', ephemeral: true });
    const user = interaction.options.getUser('user');
    await interaction.deferReply({ ephemeral: true });
    
    try {
      await axios.post(`${process.env.API_BASE_URL}/admin/force-reset-hwid`, {
        discord_id: user.id,
      }, { headers: { Authorization: `Bearer ${process.env.API_KEY}` } });
      
      await interaction.editReply({ content: `✅ HWID for **${user.tag}** has been force-reset.`, ephemeral: true });
      await logAction(interaction, `Force-reset HWID for ${user.tag}`);
    } catch (err) {
      await interaction.editReply({ content: '❌ Failed to force-reset HWID.', ephemeral: true });
    }
  },

  async compensate(interaction) {
    if (!isManager(interaction)) return interaction.reply({ content: '❌ You don\'t have permission.', ephemeral: true });
    const days = interaction.options.getInteger('days');
    const project = interaction.options.getString('project');
    await interaction.deferReply({ ephemeral: true });
    
    try {
      await axios.post(`${process.env.API_BASE_URL}/admin/compensate`, {
        days,
        project,
      }, { headers: { Authorization: `Bearer ${process.env.API_KEY}` } });
      
      await interaction.editReply({ content: `✅ Added **${days} days** to all keys in **${project}**.`, ephemeral: true });
      await logAction(interaction, `Compensated ${days} days for ${project}`);
    } catch (err) {
      await interaction.editReply({ content: '❌ Failed to compensate keys.', ephemeral: true });
    }
  },

  async givekey(interaction) {
    if (!isManager(interaction)) return interaction.reply({ content: '❌ You don\'t have permission.', ephemeral: true });
    const user = interaction.options.getUser('user');
    const project = interaction.options.getString('project');
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const { data } = await axios.post(`${process.env.API_BASE_URL}/admin/give-key`, {
        discord_id: user.id,
        project,
      }, { headers: { Authorization: `Bearer ${process.env.API_KEY}` } });
      
      await interaction.editReply({ content: `✅ **${user.tag}** received key: \`${data.key}\``, ephemeral: true });
      await logAction(interaction, `Gave key to ${user.tag} for ${project}`);
    } catch (err) {
      await interaction.editReply({ content: '❌ Failed to give key.', ephemeral: true });
    }
  },

  async revokekey(interaction) {
    if (!isManager(interaction)) return interaction.reply({ content: '❌ You don\'t have permission.', ephemeral: true });
    const user = interaction.options.getUser('user');
    await interaction.deferReply({ ephemeral: true });
    
    try {
      await axios.post(`${process.env.API_BASE_URL}/admin/revoke-key`, {
        discord_id: user.id,
      }, { headers: { Authorization: `Bearer ${process.env.API_KEY}` } });
      
      await interaction.editReply({ content: `✅ Key for **${user.tag}** has been revoked.`, ephemeral: true });
      await logAction(interaction, `Revoked key for ${user.tag}`);
    } catch (err) {
      await interaction.editReply({ content: '❌ Failed to revoke key.', ephemeral: true });
    }
  },

  async login(interaction) {
    const apiKey = interaction.options.getString('api_key');
    try {
      // Store the API key in memory for this session
      process.env.API_KEY = apiKey;
      await interaction.reply({ content: '✅ Successfully authenticated! The bot is now connected to your luau.uwu account.', ephemeral: true });
      await logAction(interaction, 'Bot authenticated');
    } catch (err) {
      await interaction.reply({ content: '❌ Failed to authenticate. Check your API key and try again.', ephemeral: true });
    }
  },

  async logout(interaction) {
    if (!isManager(interaction)) return interaction.reply({ content: '❌ You don\'t have permission.', ephemeral: true });
    process.env.API_KEY = '';
    await interaction.reply({ content: '✅ Bot disconnected from your account.', ephemeral: true });
    await logAction(interaction, 'Bot logged out');
  },

  async setpanel(interaction) {
    if (!isManager(interaction)) return interaction.reply({ content: '❌ You don\'t have permission.', ephemeral: true });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('panel_redeem').setLabel('Redeem Key').setStyle(ButtonStyle.Primary).setEmoji('🔑'),
      new ButtonBuilder().setCustomId('panel_resethwid').setLabel('Reset HWID').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
      new ButtonBuilder().setCustomId('panel_scripts').setLabel('My Scripts').setStyle(ButtonStyle.Success).setEmoji('📜'),
      new ButtonBuilder().setCustomId('panel_status').setLabel('Status').setStyle(ButtonStyle.Secondary).setEmoji('📊'),
    );
    
    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle('🎮 luau.uwu Control Panel')
      .setDescription('Use the buttons below to manage your keys and scripts.')
      .setFooter({ text: 'luau.uwu' });
    
    await interaction.reply({ embeds: [embed], components: [row] });
    await logAction(interaction, 'Control panel set up');
  },

  async setlogs(interaction) {
    if (!isManager(interaction)) return interaction.reply({ content: '❌ You don\'t have permission.', ephemeral: true });
    const channel = interaction.options.getChannel('channel');
    process.env.LOG_CHANNEL_ID = channel.id;
    await interaction.reply({ content: `✅ Logs channel set to ${channel}.`, ephemeral: true });
  },
};

// ─── Helpers ────────────────────────────────────────────────

function isManager(interaction) {
  const managerRole = process.env.MANAGER_ROLE_NAME || 'Manager';
  return interaction.member.roles.cache.some(r => r.name === managerRole) || interaction.member.permissions.has('Administrator');
}

async function logAction(interaction, action) {
  if (!process.env.LOG_CHANNEL_ID) return;
  try {
    const channel = await interaction.client.channels.fetch(process.env.LOG_CHANNEL_ID);
    if (!channel) return;
    
    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle('📋 Action Log')
      .addFields(
        { name: 'Action', value: action },
        { name: 'User', value: interaction.user.tag },
        { name: 'Channel', value: interaction.channel?.name || 'Unknown' },
      )
      .setTimestamp();
    
    await channel.send({ embeds: [embed] });
  } catch {}
}

// ─── Button Interaction Handler ────────────────────────────

client.on('interactionCreate', async (interaction) => {
  if (interaction.isCommand()) {
    const handler = handlers[interaction.commandName];
    if (handler) {
      try {
        await handler(interaction);
      } catch (err) {
        console.error(`Error handling ${interaction.commandName}:`, err);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ An error occurred.', ephemeral: true }).catch(() => {});
        }
      }
    }
    return;
  }
  
  if (interaction.isButton()) {
    const userId = interaction.user.id;
    switch (interaction.customId) {
      case 'panel_redeem': {
        await interaction.reply({ content: 'Please use `/redeem <key>` to redeem your key.', ephemeral: true });
        break;
      }
      case 'panel_resethwid': {
        await interaction.reply({ content: 'Please use `/resethwid` to reset your HWID.', ephemeral: true });
        break;
      }
      case 'panel_scripts': {
        await interaction.reply({ content: 'Please use `/myscripts` to view your scripts.', ephemeral: true });
        break;
      }
      case 'panel_status': {
        await interaction.reply({ content: 'Please use `/status` to check your status.', ephemeral: true });
        break;
      }
    }
  }
});

// ─── Ready Event ──────────────────────────────────────────

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  
  // Register slash commands
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    if (process.env.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
      console.log('✅ Slash commands registered for guild');
    } else {
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
      console.log('✅ Global slash commands registered');
    }
  } catch (err) {
    console.error('❌ Failed to register slash commands:', err);
  }
  
  // Set bot status
  client.user.setActivity('/panel | luau.uwu', { type: 2 });
});

// ─── Login ─────────────────────────────────────────────────

if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN is required in .env file');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
