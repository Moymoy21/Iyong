import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`🤖 Logged in as ${client.user.tag}! Bot is fresh and ready.`);
});

// Gagamit ng process.env.BOT_TOKEN na kukunin natin sa Railway variables mamaya
client.login(process.env.BOT_TOKEN);

