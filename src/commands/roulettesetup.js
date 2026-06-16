import { SlashCommandBuilder } from 'discord.js';
import { createWheelUI } from '../handlers/helpSelectMenus.js'; // Tumpak na path!

export default {
    data: new SlashCommandBuilder()
        .setName('roulettesetup')
        .setDescription('Open the Pet Roulette Wheel'),

    async execute(interaction) {
        try {
            // Gumawa ng bagong Roulette UI
            const wheelUI = createWheelUI();
            
            // Mag-reply sa user nang direkta gamit ang embed at buttons
            return await interaction.reply(wheelUI);
            
        } catch (error) {
            console.error("Failed to execute roulettesetup command:", error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ May error sa pagtakbo ng command na ito.', ephemeral: true });
            }
        }
    }
};

