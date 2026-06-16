import { Client, GatewayIntentBits, Collection } from 'discord.js';
import roulettesetup from './commands/roulettesetup.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions // KELANGAN ITO PARA MABASA ANG MGA NAG-RE-REACT
    ]
});

client.commands = new Collection();
client.commands.set(roulettesetup.data.name, roulettesetup);

client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}! Roulette bot is online and ready.`);
    
    try {
        await client.application.commands.set([roulettesetup.data]);
        console.log('✅ Global roulette command registered!');
    } catch (error) {
        console.error('❌ Failed to register command:', error);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error("Command Execution Error:", error);
    }
});

client.login(process.env.BOT_TOKEN);
