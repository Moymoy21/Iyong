import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateWheelImage(participantsList, currentRotation) {
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(200, 200, 190, 0, 2 * Math.PI); ctx.fill();

    const numSlices = participantsList.length;
    const sliceColors = ['#5865F2', '#57F287', '#FEE75C', '#EB459E'];

    if (numSlices > 0) {
        const anglePerSlice = (2 * Math.PI) / numSlices;
        participantsList.forEach((_, index) => {
            const startAngle = index * anglePerSlice + currentRotation;
            const endAngle = startAngle + anglePerSlice;
            ctx.fillStyle = sliceColors[index % sliceColors.length];
            ctx.beginPath(); ctx.moveTo(200, 200); ctx.arc(200, 200, 185, startAngle, endAngle); ctx.lineTo(200, 200); ctx.fill();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        });

        for (let index = 0; index < numSlices; index++) {
            const angle = (index * anglePerSlice + currentRotation) + (anglePerSlice / 2);
            try {
                const avatar = await loadImage(participantsList[index].displayAvatarURL({ extension: 'png', size: 64 }));
                const x = 200 + Math.cos(angle) * 110;
                const y = 200 + Math.sin(angle) * 110;
                ctx.save(); ctx.beginPath(); ctx.arc(x, y, 22, 0, 2 * Math.PI); ctx.clip();
                ctx.drawImage(avatar, x - 22, y - 22, 44, 44); ctx.restore();
            } catch (e) {}
        }
    }
    ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.moveTo(375, 200); ctx.lineTo(400, 180); ctx.lineTo(400, 220); ctx.closePath(); ctx.fill();
    return canvas.toBuffer('image/png');
}

export default {
    data: new SlashCommandBuilder()
        .setName('roulettesetup')
        .setDescription('Magsimula ng isang Event Roulette Giveaway!')
        .addStringOption(o => o.setName('item').setDescription('Ano ang premyo?').setRequired(true))
        .addAttachmentOption(o => o.setName('image').setDescription('Screenshot ng item')),

    async execute(interaction) {
        const item = interaction.options.getString('item');
        const img = interaction.options.getAttachment('image');
        const participants = new Set();
        const ENTER_ID = "ent", START_ID = "str", REROLL_ID = "rr";

        const getEmbed = () => {
            const embed = new EmbedBuilder()
                .setTitle("🎉 GIVEAWAY STARTED!")
                .setDescription(`Item: **${item}**\nHost: ${interaction.user}\n\n**Mga Sumali (${participants.size}):**\n${[...participants].map(u => u.username).join('\n') || 'Wala pa'}`)
                .setColor(0x5865F2);
            // Ginawang setImage para malaki at clickable to view
            if (img) embed.setImage(img.url); 
            return embed;
        };

        const getRow = () => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(ENTER_ID).setLabel(`Enter (${participants.size})`).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(START_ID).setLabel("Start Roulette 🚀").setStyle(ButtonStyle.Success)
        );

        let msg = await interaction.reply({
            embeds: [getEmbed()],
            files: [new AttachmentBuilder(await generateWheelImage([], 0), { name: 'wheel.png' })],
            components: [getRow()], fetchReply: true
        });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 600000 });

        async function runSpin(pList) {
            const winnerIdx = Math.floor(Math.random() * pList.length);
            const sliceAngle = (2 * Math.PI) / pList.length;
            const finalRot = (winnerIdx * -sliceAngle) + (Math.PI * 2);
            for (let i = 0; i <= 20; i++) {
                const rot = (finalRot * (i / 20)) + (Math.PI * 0.5);
                const buf = await generateWheelImage(pList, rot);
                await interaction.editReply({ files: [new AttachmentBuilder(buf, { name: 'wheel.png' })] });
                await sleep(500);
            }
            const winner = pList[winnerIdx];
            const embed = new EmbedBuilder()
                .setTitle("🎉 WINNER! 🎉").setColor(0x57F287)
                .setDescription(`🏆 Nanalo ng **${item}**: <@${winner.id}>\n\n📋 **Listahan:**\n${pList.map((u, i) => `${i===0?'👑':`[${i+1}]`} **${u.username}** ${i===0?'👈':''}`).join('\n')}`)
                .setImage(img ? img.url : 'attachment://wheel.png'); // Pinagsama ang logic

            await interaction.editReply({
                embeds: [embed],
                components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(REROLL_ID).setLabel("Reroll 🔄").setStyle(ButtonStyle.Danger))]
            });
        }

        collector.on('collect', async (i) => {
            if (i.customId === ENTER_ID) {
                if ([...participants].some(u => u.id === i.user.id)) return i.reply({ ephemeral: true, content: "Kasali ka na!" });
                participants.add(i.user);
                
                // Dito ang fix: Update ang embed (para sa counter) AT ang row (para sa button label)
                await i.update({
                    embeds: [getEmbed()],
                    files: [new AttachmentBuilder(await generateWheelImage([...participants], 0), { name: 'wheel.png' })],
                    components: [getRow()]
                });
            } else if (i.customId === START_ID) {
                if (i.user.id !== interaction.user.id) return i.reply({ ephemeral: true, content: "Host lang pwede!" });
                await i.deferUpdate(); collector.stop();
                await runSpin([...participants]);
            } else if (i.customId === REROLL_ID) {
                if (i.user.id !== interaction.user.id) return i.reply({ ephemeral: true, content: "Host lang pwede!" });
                await i.deferUpdate();
                await runSpin([...participants]);
            }
        });
    }
};
