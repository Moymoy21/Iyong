import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';

// Helper function para sa avatar circles (yung nawala mo)
async function generateWheelImage(participantsList, currentRotation) {
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#ffffff'; 
    ctx.beginPath(); ctx.arc(200, 200, 190, 0, 2 * Math.PI); ctx.fill();

    const numSlices = participantsList.length;
    const sliceColors = ['#5865F2', '#57F287', '#FEE75C', '#EB459E'];

    if (numSlices > 0) {
        const anglePerSlice = (2 * Math.PI) / numSlices;
        
        // Guhit ng Slices
        participantsList.forEach((_, index) => {
            const startAngle = index * anglePerSlice + currentRotation;
            const endAngle = startAngle + anglePerSlice;
            ctx.fillStyle = sliceColors[index % sliceColors.length];
            ctx.beginPath(); ctx.moveTo(200, 200); ctx.arc(200, 200, 185, startAngle, endAngle); ctx.lineTo(200, 200); ctx.fill();
        });

        // Paglagay ng Avatar sa bawat slice
        for (let index = 0; index < numSlices; index++) {
            const angle = (index * anglePerSlice + currentRotation) + (anglePerSlice / 2);
            try {
                const avatar = await loadImage(participantsList[index].displayAvatarURL({ extension: 'png', size: 64 }));
                const x = 200 + Math.cos(angle) * 110;
                const y = 200 + Math.sin(angle) * 110;
                ctx.save(); ctx.beginPath(); ctx.arc(x, y, 22, 0, 2 * Math.PI); ctx.clip();
                ctx.drawImage(avatar, x - 22, y - 22, 44, 44); ctx.restore();
            } catch (e) { /* skip */ }
        }
    }

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
        .addAttachmentOption(o => o.setName('image').setDescription('Item image')),

    async execute(interaction) {
        const item = interaction.options.getString('item');
        const itemImg = interaction.options.getAttachment('image');
        const participants = new Set();
        const ENTER_ID = "ent";

        const getEmbed = () => {
            const embed = new EmbedBuilder()
                .setTitle("🎉 GIVEAWAY STARTED!")
                .setDescription(`Item: **${item}**\nHost: ${interaction.user}\n\n**Mga Sumali (${participants.size}):**\n${[...participants].map(u => u.username).join('\n') || 'Wala pa'}`)
                .setColor(0x5865F2);
            
            // Thumbnail ay clickable sa Discord (auto-feature)
            if (itemImg) embed.setThumbnail(itemImg.url); 
            embed.setImage('attachment://wheel.png'); 
            return embed;
        };

        const wheelBuf = await generateWheelImage([], 0);
        const msg = await interaction.reply({
            embeds: [getEmbed()],
            files: [new AttachmentBuilder(wheelBuf, { name: 'wheel.png' })],
            components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(ENTER_ID).setLabel(`Enter (${participants.size})`).setStyle(ButtonStyle.Primary))],
            fetchReply: true
        });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 600000 });

        collector.on('collect', async (i) => {
            participants.add(i.user);
            const newWheelBuf = await generateWheelImage([...participants], 0);
            await i.update({
                embeds: [getEmbed()],
                files: [new AttachmentBuilder(newWheelBuf, { name: 'wheel.png' })],
                components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(ENTER_ID).setLabel(`Enter (${participants.size})`).setStyle(ButtonStyle.Primary))]
            });
        });
    }
};
