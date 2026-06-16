import { Client, GatewayIntentBits, Collection } from 'discord.js';
import roulettesetup from './commands/roulettesetup.js';
import { handleWheelInteraction, SPIN_WHEEL_ID, RESET_WHEEL_ID } from './handlers/helpSelectMenus.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// I-setup ang commands collection
client.commands = new Collection();
client.commands.set(roulettesetup.data.name, roulettesetup);

client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}! Bot is fresh and ready.`);
    
    // Awtomatikong i-register ang /roulettesetup command sa Discord global para lumabas agad kapag tinype mo
    try {
        await client.application.commands.set([roulettesetup.data]);
        console.log('✅ Global slash commands registered successfully!');
    } catch (error) {
        console.error('❌ Failed to register slash commands:', error);
    }
});

// Interaction Create Event Handler (Commands at Buttons)
client.on('interactionCreate', async (interaction) => {
    // 1. Kung ito ay Slash Command (/roulettesetup)
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
        }
    }

    // 2. Kung ito ay Button Click (Spin Wheel o Reset)
    if (interaction.isButton()) {
        if (interaction.customId === SPIN_WHEEL_ID || interaction.customId === RESET_WHEEL_ID) {
            await handleWheelInteraction(interaction);
        }
    }
});

client.login(process.env.BOT_TOKEN);
