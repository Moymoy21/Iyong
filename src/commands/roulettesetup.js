import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import { createCanvas } from '@napi-rs/canvas';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateWheelImage(participantsList, currentRotation) {
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#2b2d31';
    ctx.fillRect(0, 0, 400, 400);

    const activeUsers = participantsList || [];

    if (activeUsers.length === 0) {
        ctx.fillStyle = '#5865F2';
        ctx.beginPath(); ctx.arc(200, 200, 185, 0, 2 * Math.PI); ctx.fill();
    } else {
        const numSlices = activeUsers.length;
        const anglePerSlice = (2 * Math.PI) / numSlices;
        const sliceColors = ['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245', '#3498DB', '#9B59B6', '#1ABC9C'];

        activeUsers.forEach((user, index) => {
            const startAngle = index * anglePerSlice + currentRotation;
            const endAngle = startAngle + anglePerSlice;
            ctx.fillStyle = sliceColors[index % sliceColors.length];
            ctx.beginPath(); ctx.moveTo(200, 200); ctx.arc(200, 200, 185, startAngle, endAngle); ctx.lineTo(200, 200); ctx.fill();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        });
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
        const ENTER_ID = "ent", START_ID = "str", REROLL_ID = "rr";

        const getRow = () => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(ENTER_ID).setLabel(`Enter (${participants.size})`).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(START_ID).setLabel("Start Roulette 🚀").setStyle(ButtonStyle.Success)
        );

        async function updateMessage(isFinal = false) {
            const timestamp = Date.now();
            const fileName = `wheel_${timestamp}.png`;
            const buffer = await generateWheelImage([...participants], 0);
            const attachment = new AttachmentBuilder(buffer, { name: fileName });
            
            const embed = new EmbedBuilder()
                .setTitle(isFinal ? "🎉 WINNER!" : "🎉 GIVEAWAY STARTED!")
                .setDescription(`Item: **${item}**\nParticipants: ${participants.size}`)
                .setImage(`attachment://${fileName}`)
                .setColor(isFinal ? 0x57F287 : 0x5865F2);

            const components = isFinal ? [] : [getRow()];
            await interaction.editReply({ embeds: [embed], files: [attachment], components: components });
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
                
                const finalEmbed = new EmbedBuilder()
                    .setTitle("🏆 ANG NANALO AY...")
                    .setDescription(`Congratulations **${winner.username}**! Nanalo ka ng **${item}**.`)
                    .setColor(0x57F287);
                
                await interaction.editReply({ embeds: [finalEmbed], components: [], files: [] });
            }
        });
    }
};
