import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';

// Ito ang function para sa Roleta (Canvas)
async function generateWheelImage(participantsList, currentRotation) {
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext('2d');
    
    // Background ng Roleta
    ctx.fillStyle = '#57F287';
    ctx.beginPath(); ctx.arc(200, 200, 190, 0, 2 * Math.PI); ctx.fill();
    
    // Red Arrow
    ctx.fillStyle = '#ff0000';
    ctx.beginPath(); ctx.moveTo(375, 200); ctx.lineTo(400, 180); ctx.lineTo(400, 220); ctx.closePath(); ctx.fill();
    
    return canvas.toBuffer('image/png');
}

export default {
    data: new SlashCommandBuilder()
        .setName('roulettesetup')
        .setDescription('Magsimula ng giveaway!')
        .addStringOption(o => o.setName('item').setDescription('Item name').setRequired(true))
        .addAttachmentOption(o => o.setName('image').setDescription('Item screenshot')),

    async execute(interaction) {
        const item = interaction.options.getString('item');
        const itemImg = interaction.options.getAttachment('image');
        const participants = new Set();
        const ENTER_ID = "ent";
        const START_ID = "start_btn";

        // Function para i-build ang Embed
        const getEmbed = () => {
            const embed = new EmbedBuilder()
                .setTitle("🎉 GIVEAWAY STARTED!")
                .setDescription(`Item: **${item}**\nHost: ${interaction.user}\n\n**Mga Sumali (${participants.size}):**\n${[...participants].map(u => u.username).join('\n') || 'Wala pa'}`)
                .setColor(0x5865F2);
            
            // Thumbnail ang image para sa malinaw at clickable na item view
            if (itemImg) embed.setImage(itemImg.url); 
            return embed;
        };

        const getRow = () => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(ENTER_ID).setLabel(`Enter (${participants.size})`).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(START_ID).setLabel("Start Roulette 🚀").setStyle(ButtonStyle.Success)
        );

        // Send Initial
        const wheelBuf = await generateWheelImage([], 0);
        const wheelFile = new AttachmentBuilder(wheelBuf, { name: 'wheel.png' });

        const msg = await interaction.reply({
            embeds: [getEmbed()],
            files: [wheelFile], // Roleta ay laging file
            components: [getRow()],
            fetchReply: true
        });

        // Collector para sa Buttons
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 600000 });

        collector.on('collect', async (i) => {
            // Acknowledge agad para hindi mag-fail
            await i.deferUpdate();

            if (i.customId === ENTER_ID) {
                if ([...participants].some(u => u.id === i.user.id)) return;
                participants.add(i.user);
                
                // I-update ang message gamit ang bagong listahan
                const updatedWheelBuf = await generateWheelImage([...participants], 0);
                const updatedWheelFile = new AttachmentBuilder(updatedWheelBuf, { name: 'wheel.png' });
                
                await i.editReply({
                    embeds: [getEmbed()],
                    files: [updatedWheelFile],
                    components: [getRow()]
                });
            } else if (i.customId === START_ID) {
                if (i.user.id !== interaction.user.id) return;
                collector.stop();
                // Dito mo ilalagay ang logic para sa pag-spin
            }
        });
    }
};
