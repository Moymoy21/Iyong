import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateWheelImage(participantsList, currentRotation) {
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext('2d');

    try {
        const wheelImageUrl = "https://cdn.discordapp.com/attachments/1065770284692558005/1516606427236401184/wheel.webp?ex=6a33414d&is=6a31efcd&hm=c95f39f936a6e07c00b590182ad17c41e059aa5a3d294912542307bc2a89ed1f&";
        const baseWheel = await loadImage(wheelImageUrl);
        ctx.drawImage(baseWheel, 0, 0, 400, 400);

        const activeUsers = participantsList || [];

        if (activeUsers.length === 0) {
            ctx.fillStyle = '#5865F2'; 
            ctx.beginPath(); ctx.arc(200, 200, 185, 0, 2 * Math.PI); ctx.fill();
        } else if (activeUsers.length === 1) {
            ctx.fillStyle = '#57F287';
            ctx.beginPath(); ctx.arc(200, 200, 185, 0, 2 * Math.PI); ctx.fill();
            const avatarImg = await loadImage(activeUsers[0].displayAvatarURL({ extension: 'png', size: 128 }));
            ctx.save(); ctx.beginPath(); ctx.arc(200, 200, 50, 0, 2 * Math.PI); ctx.clip();
            ctx.drawImage(avatarImg, 150, 150, 100, 100); ctx.restore();
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

            for (let index = 0; index < activeUsers.length; index++) {
                const middleAngle = (index * anglePerSlice + currentRotation) + (anglePerSlice / 2);
                const avatarImg = await loadImage(activeUsers[index].displayAvatarURL({ extension: 'png', size: 64 }));
                const imgX = 200 + Math.cos(middleAngle) * 110;
                const imgY = 200 + Math.sin(middleAngle) * 110;
                ctx.save(); ctx.beginPath(); ctx.arc(imgX, imgY, 22, 0, 2 * Math.PI); ctx.clip();
                ctx.drawImage(avatarImg, imgX - 22, imgY - 22, 44, 44); ctx.restore();
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(imgX, imgY, 22, 0, 2 * Math.PI); ctx.stroke();
            }
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(200, 200, 38, 0, 2 * Math.PI); ctx.fill();
        }

        ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.moveTo(375, 200); ctx.lineTo(400, 180); ctx.lineTo(400, 220); ctx.closePath(); ctx.fill();
        return canvas.toBuffer('image/png');
    } catch (err) { return null; }
}

export default {
    data: new SlashCommandBuilder()
        .setName('roulettesetup')
        .setDescription('Magsimula ng isang Event Roulette Giveaway!')
        .addStringOption(o => o.setName('item').setDescription('Ano ang premyo?').setRequired(true))
        .addAttachmentOption(o => o.setName('image').setDescription('Screenshot ng item (Optional)')),

    async execute(interaction) {
        const hostId = interaction.user.id;
        const item = interaction.options.getString('item');
        const img = interaction.options.getAttachment('image')?.url || null;
        const participants = new Set();
        const ENTER_ID = "ent", START_ID = "str", REROLL_ID = "rr";

        const getRow = () => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(ENTER_ID).setLabel(`Enter (${participants.size})`).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(START_ID).setLabel("Start Roulette ðŸš€").setStyle(ButtonStyle.Success)
        );

        let msg = await interaction.reply({
            embeds: [new EmbedBuilder().setTitle("ðŸŽ‰ GIVEAWAY STARTED!").setDescription(`Item: **${item}**\nHost: <@${hostId}>`).setImage('attachment://wheel.png').setThumbnail(img).setColor(0x5865F2)],
            files: [new AttachmentBuilder(await generateWheelImage([], 0), { name: 'wheel.png' })],
            components: [getRow()], fetchReply: true
        });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 600000 });

        async function runSpin(pList) {
            if (pList.length === 0) return; // Proteksyon para hindi mag-crash kung walang kasali

            const winnerIdx = Math.floor(Math.random() * pList.length);
            const sliceAngle = (2 * Math.PI) / pList.length;
            const finalRot = (winnerIdx * -sliceAngle) + (Math.PI * 2);
            const totalTicks = 20;

            for (let i = 0; i <= totalTicks; i++) {
                const rot = (finalRot * (i / totalTicks)) + (Math.PI * 0.5);
                const buf = await generateWheelImage(pList, rot);
                await interaction.editReply({ files: [new AttachmentBuilder(buf, { name: 'wheel.png' })] });
                await sleep(500);
            }

            const winner = pList[winnerIdx];
            const embed = new EmbedBuilder()
                .setTitle("ðŸŽ‰ WINNER! ðŸŽ‰").setColor(0x57F287)
                .setDescription(`ðŸ† Nanalo ng **${item}**: <@${winner.id}>\n\nðŸ“‹ **Listahan:**\n${pList.map((u, i) => `${i===winnerIdx?'ðŸ‘‘':`[${i+1}]`} **${u.username}** ${i===winnerIdx?'ðŸ‘ˆ':''}`).join('\n')}`)
                .setImage('attachment://wheel.png');
            
            if(img) embed.setThumbnail(img);
            else embed.setThumbnail(winner.displayAvatarURL());

            // I-update ang interaction kasama ang Reroll Button
            const finalMsg = await interaction.editReply({
                content: `Congratulations <@${winner.id}>!`,
                embeds: [embed],
                components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(REROLL_ID).setLabel("Reroll ðŸ”„").setStyle(ButtonStyle.Danger))]
            });

            // GUMAWA NG BAGONG COLLECTOR PARA SA REROLL BUTTON
            const rerollCollector = finalMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 });
            
            rerollCollector.on('collect', async (ri) => {
                if (ri.customId === REROLL_ID) {
                    if (ri.user.id !== hostId) return ri.reply({ ephemeral: true, content: "Host lang pwede!" });
                    await ri.deferUpdate();
                    rerollCollector.stop(); // Patayin ang kasalukuyang reroll collector bago mag-spin ulit
                    await runSpin(pList);
                }
            });
        }

        collector.on('collect', async (i) => {
            if (i.customId === ENTER_ID) {
                if ([...participants].some(u => u.id === i.user.id)) return i.reply({ ephemeral: true, content: "Kasali ka na!" });
                participants.add(i.user);
                await i.deferUpdate();
                // INAYOS: Idinagdag ang components: [getRow()] para mag-update ang numero sa button
                await interaction.editReply({ 
                    files: [new AttachmentBuilder(await generateWheelImage([...participants], 0), { name: 'wheel.png' })],
                    components: [getRow()] 
                });
            } else if (i.customId === START_ID) {
                if (i.user.id !== hostId) return i.reply({ ephemeral: true, content: "Host lang pwede!" });
                if (participants.size === 0) return i.reply({ ephemeral: true, content: "Kailangan ng kahit isang kasali para masimulan!" });
                await i.deferUpdate(); 
                collector.stop();
                await runSpin([...participants]);
            }
        });
    }
};
                
