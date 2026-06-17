import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateWheelImage(participantsList, currentRotation = 0) {
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext('2d');
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

        activeUsers.forEach((user, index) => {
            const startAngle = (index * anglePerSlice) + currentRotation;
            const endAngle = startAngle + anglePerSlice;
            ctx.fillStyle = sliceColors[index % sliceColors.length];
            ctx.beginPath(); ctx.moveTo(200, 200); ctx.arc(200, 200, 185, startAngle, endAngle); ctx.lineTo(200, 200); ctx.fill();
            ctx.stroke();
        });

        for (let index = 0; index < activeUsers.length; index++) {
            const startAngle = (index * anglePerSlice) + currentRotation;
            const middleAngle = startAngle + (anglePerSlice / 2);
            const avatarUrl = activeUsers[index].displayAvatarURL({ extension: 'png', size: 64 });
            try {
                const avatarImg = await loadImage(avatarUrl);
                const imgX = 200 + Math.cos(middleAngle) * 120;
                const imgY = 200 + Math.sin(middleAngle) * 120;
                ctx.save(); ctx.beginPath(); ctx.arc(imgX, imgY, 20, 0, 2 * Math.PI); ctx.clip();
                ctx.drawImage(avatarImg, imgX - 20, imgY - 20, 40, 40); ctx.restore();
            } catch (e) {}
        }
    }
    ctx.fillStyle = '#ff0000';
    ctx.beginPath(); ctx.moveTo(375, 200); ctx.lineTo(400, 180); ctx.lineTo(400, 220); ctx.closePath(); ctx.fill();
    return canvas.toBuffer('image/png');
}

export default {
    data: new SlashCommandBuilder().setName('roulettesetup').setDescription('Setup').addStringOption(o => o.setName('item').setDescription('Item').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const item = interaction.options.getString('item');
        const participants = new Set();
        const ENTER_ID = "ent", START_ID = "str", REROLL_ID = "rr";
        let winner = null, lastWinTime = null, finalRotation = 0;

        async function updateMessage(isFinal = false) {
            const buffer = await generateWheelImage([...participants], finalRotation);
            const attachment = new AttachmentBuilder(buffer, { name: `w.png` });
            
            const pList = [...participants];
            const participantList = pList.length > 0 ? pList.map(u => `• ${u.username}`).join('\n') : "Wala pa.";
            
            const embed = new EmbedBuilder()
                .setTitle(isFinal ? "Giveaway Winner" : "🎉 GIVEAWAY CREATED")
                .setColor(isFinal ? 0x57F287 : 0x5865F2)
                .setImage(`attachment://w.png`)
                .setDescription(isFinal 
                    ? `Giveaway Winner\n🏆 Winner: <@${winner.id}>\n# ${item}\n\n**Participants:**\n${participantList}` 
                    : `**Host:** <@${interaction.user.id}>\n# ${item}\n\n**Participants (${participants.size})**\n${participantList}`);

            const components = [];
            if (!isFinal) {
                components.push(new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(ENTER_ID).setLabel(`Enter`).setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId(START_ID).setLabel("Start").setStyle(ButtonStyle.Success)
                ));
            } else {
                components.push(new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(REROLL_ID).setLabel("Reroll").setStyle(ButtonStyle.Secondary)
                ));
            }
            await interaction.editReply({ embeds: [embed], files: [attachment], components: components }).catch(console.error);
        }

        await updateMessage();
        const collector = interaction.channel.createMessageComponentCollector({ time: 600000 });
        collector.on('collect', async (i) => {
            if (i.customId === ENTER_ID) {
                participants.add(i.user); await i.deferUpdate(); await updateMessage();
            } else if (i.customId === START_ID || i.customId === REROLL_ID) {
                if (i.user.id !== interaction.user.id) return i.reply({ephemeral: true, content: "Host lang ang pwedeng mag-start!"});
                
                // Reroll time limit check
                if (i.customId === REROLL_ID && lastWinTime && (Date.now() - lastWinTime > 25 * 60000)) {
                    return i.reply({ephemeral: true, content: "Giveaway ended!"});
                }
                
                const pList = [...participants];
                if (pList.length === 0) return i.reply({ephemeral: true, content: "Walang participants!"});

                await i.deferUpdate(); // Iwas "Interaction failed"

                const winnerIdx = Math.floor(Math.random() * pList.length);
                winner = pList[winnerIdx];
                const sliceAngle = (2 * Math.PI) / pList.length;
                const targetRotation = -(winnerIdx * sliceAngle) - (sliceAngle / 2) + (3 * 2 * Math.PI);

                for (let j = 0; j <= 10; j++) {
                    finalRotation = targetRotation * (1 - Math.pow(1 - (j / 10), 3));
                    const buffer = await generateWheelImage(pList, finalRotation);
                    await interaction.editReply({ 
                        embeds: [new EmbedBuilder().setTitle("🎰 ROLLING...").setImage('attachment://w.png')],
                        files: [new AttachmentBuilder(buffer, { name: 'w.png' })],
                        components: [] 
                    });
                    await sleep(1000);
                }
                lastWinTime = Date.now();
                await updateMessage(true);
            }
        });
    }
};
