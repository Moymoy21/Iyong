import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Simple Wheel Generator function
async function generateWheelImage(participantsList, currentRotation) {
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext('2d');
    
    // Background na kulay (Green kung may tao, Blue kung wala)
    ctx.fillStyle = participantsList.length === 0 ? '#5865F2' : '#57F287';
    ctx.beginPath();
    ctx.arc(200, 200, 190, 0, 2 * Math.PI);
    ctx.fill();

    // Red Arrow sa kanan
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.moveTo(375, 200);
    ctx.lineTo(400, 180);
    ctx.lineTo(400, 220);
    ctx.closePath();
    ctx.fill();

    return canvas.toBuffer('image/png');
}

export default {
    data: new SlashCommandBuilder()
        .setName('roulettesetup')
        .setDescription('Magsimula ng giveaway!')
        .addStringOption(o => o.setName('item').setDescription('Item name').setRequired(true))
        .addAttachmentOption(o => o.setName('image').setDescription('Item image (Thumbnail)')),

    async execute(interaction) {
        const item = interaction.options.getString('item');
        const itemImg = interaction.options.getAttachment('image');
        const participants = new Set();
        const ENTER_ID = "ent";
        const START_ID = "str";

        // Function para i-generate ang embed at i-update ang listahan
        const getEmbed = () => {
            const embed = new EmbedBuilder()
                .setTitle("🎉 GIVEAWAY STARTED!")
                .setDescription(`Item: **${item}**\nHost: ${interaction.user}\n\n**Mga Sumali (${participants.size}):**\n${[...participants].map(u => u.username).join('\n') || 'Wala pa'}`)
                .setColor(0x5865F2);
            
            // Thumbnail nasa taas-kanan, Image (wheel) nasa baba (malaki)
            if (itemImg) embed.setThumbnail(itemImg.url); 
            embed.setImage('attachment://wheel.png'); 
            return embed;
        };

        const getRow = () => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(ENTER_ID).setLabel(`Enter (${participants.size})`).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(START_ID).setLabel("Start Roulette 🚀").setStyle(ButtonStyle.Success)
        );

        // Initial setup
        const wheelBuf = await generateWheelImage([], 0);
        const wheelFile = new AttachmentBuilder(wheelBuf, { name: 'wheel.png' });

        const msg = await interaction.reply({
            embeds: [getEmbed()],
            files: [wheelFile],
            components: [getRow()],
            fetchReply: true
        });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 600000 });

        collector.on('collect', async (i) => {
            if (i.customId === ENTER_ID) {
                if ([...participants].some(u => u.id === i.user.id)) return i.reply({ content: "Kasali ka na!", ephemeral: true });
                participants.add(i.user);
                
                // Refresh UI gamit ang .update() para ma-update ang counter at listahan
                const newWheelBuf = await generateWheelImage([...participants], 0);
                const newWheelFile = new AttachmentBuilder(newWheelBuf, { name: 'wheel.png' });
                
                await i.update({
                    embeds: [getEmbed()],
                    files: [newWheelFile],
                    components: [getRow()] 
                });
            }
        });
    }
};
