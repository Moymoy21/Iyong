import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';

// Function para gumawa ng gulong na may mga avatars
async function generateWheelImage(participantsList, currentRotation = 0) {
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#2b2d31';
    ctx.fillRect(0, 0, 400, 400);

    const activeUsers = participantsList || [];

    if (activeUsers.length === 0) {
        ctx.fillStyle = '#5865F2';
        ctx.beginPath(); ctx.arc(200, 200, 150, 0, 2 * Math.PI); ctx.fill();
    } else {
        const numSlices = activeUsers.length;
        const anglePerSlice = (2 * Math.PI) / numSlices;
        const sliceColors = ['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245', '#3498DB', '#9B59B6', '#1ABC9C'];

        // Draw Slices
        activeUsers.forEach((user, index) => {
            const startAngle = index * anglePerSlice + currentRotation;
            const endAngle = startAngle + anglePerSlice;
            ctx.fillStyle = sliceColors[index % sliceColors.length];
            ctx.beginPath(); ctx.moveTo(200, 200); ctx.arc(200, 200, 185, startAngle, endAngle); ctx.lineTo(200, 200); ctx.fill();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        });

        // Draw Avatars
        for (let index = 0; index < activeUsers.length; index++) {
            const middleAngle = (index * anglePerSlice + currentRotation) + (anglePerSlice / 2);
            const avatarUrl = activeUsers[index].displayAvatarURL({ extension: 'png', size: 64 });
            
            try {
                const avatarImg = await loadImage(avatarUrl);
                const imgX = 200 + Math.cos(middleAngle) * 120;
                const imgY = 200 + Math.sin(middleAngle) * 120;
                
                ctx.save();
                ctx.beginPath();
                ctx.arc(imgX, imgY, 20, 0, 2 * Math.PI);
                ctx.clip();
                ctx.drawImage(avatarImg, imgX - 20, imgY - 20, 40, 40);
                ctx.restore();
            } catch (e) {
                console.error("Hindi ma-load ang avatar:", e);
            }
        }
    }

    // Pointer (Red Arrow)
    ctx.fillStyle = '#ff0000';
    ctx.beginPath(); ctx.moveTo(375, 200); ctx.lineTo(400, 180); ctx.lineTo(400, 220); ctx.closePath(); ctx.fill();
    
    return canvas.toBuffer('image/png');
}

export default {
    data: new SlashCommandBuilder()
        .setName('roulettesetup')
        .setDescription('Magsimula ng isang Event Roulette Giveaway!')
        .addStringOption(o => o.setName('item').setDescription('Ano ang premyo?').setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();
        const item = interaction.options.getString('item');
        const participants = new Set();
        const ENTER_ID = "ent", START_ID = "str";

        const getRow = () => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(ENTER_ID).setLabel(`Enter (${participants.size})`).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(START_ID).setLabel("Start Roulette 🚀").setStyle(ButtonStyle.Success)
        );

        async function updateMessage(isFinal = false, winner = null) {
            const buffer = await generateWheelImage([...participants]);
            const attachment = new AttachmentBuilder(buffer, { name: `wheel_${Date.now()}.png` });
            
            const embed = new EmbedBuilder()
                .setTitle(isFinal ? "🎉 WINNER!" : "🎉 GIVEAWAY STARTED!")
                .setDescription(isFinal 
                    ? `🏆 Nanalo ng **${item}**: <@${winner.id}>` 
                    : `Item: **${item}**\nHost: <@${interaction.user.id}>\n\nClick "Enter" para sumali!`)
                .setImage(`attachment://${attachment.name}`)
                .setColor(isFinal ? 0x57F287 : 0x5865F2);

            await interaction.editReply({ 
                embeds: [embed], 
                files: [attachment], 
                components: isFinal ? [] : [getRow()] 
            });
        }

        await updateMessage();

        const collector = interaction.channel.createMessageComponentCollector({ time: 600000 });

        collector.on('collect', async (i) => {
            if (i.customId === ENTER_ID) {
                if ([...participants].some(u => u.id === i.user.id)) return i.reply({ ephemeral: true, content: "Kasali ka na!" });
                participants.add(i.user);
                await i.deferUpdate();
                await updateMessage();
            } else if (i.customId === START_ID) {
                if (i.user.id !== interaction.user.id) return i.reply({ ephemeral: true, content: "Host lang pwede!" });
                if (participants.size === 0) return i.reply({ ephemeral: true, content: "Walang participants!" });
                
                collector.stop();
                const pList = [...participants];
                const winner = pList[Math.floor(Math.random() * pList.length)];
                await updateMessage(true, winner);
            }
        });
    }
};
