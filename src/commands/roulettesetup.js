import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateWheelImage(participantsList, currentRotation) {
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext('2d');

    try {
        const wheelImageUrl = "https://discordapp.com&";
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
            new ButtonBuilder().setCustomId(START_ID).setLabel("Start Roulette 🚀").setStyle(ButtonStyle.Success)
        );

        const initialEmbed = new EmbedBuilder()
            .setTitle("🎉 GIVEAWAY STARTED!")
            .setDescription(`Item: **${item}**\nHost: <@${hostId}>`)
            .setColor(0x5865F2);

        if (img) {
            initialEmbed.setImage(img); // Malaking larawan na pwedeng i-click/zoom
        } else {
            initialEmbed.setImage('attachment://wheel.png');
        }

        let msg = await interaction.reply({
            embeds: [initialEmbed],
            files: [new AttachmentBuilder(await generateWheelImage([], 0), { name: 'wheel.png' })],
            components: [getRow()], fetchReply: true
        });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 600000 });

        async function runSpin(pList) {
            if (pList.length === 0) return;

            // 1. COUNTDOWN ANIMATION (Iwas Blink Trick)
            // Sa halip na i-edit ang picture nang paunti-unti, magpapakita muna tayo ng countdown sa text.
            const countdownEmbed = new EmbedBuilder()
                .setTitle("🎰 ROLLING THE WHEEL...")
                .setDescription(`Item: **${item}**\n\n**Ang gulong ay umiikot na...**\nStatus: 🕒 Kinakalkula ang resulta...`)
                .setColor(0xFEE75C);
                
            if (img) countdownEmbed.setThumbnail(img); // Panatilihing nakikita ang item habang nag-e-edit

            await interaction.editReply({
                embeds: [countdownEmbed],
                components: [] // Tanggalin muna ang mga button habang umiikot
            });

            // Mag-antay ng 2.5 segundo para sa suspense simulation habang nirerender ang panalo
            await sleep(2500); 

            // 2. KALKULASYON NG PANALO
            const winnerIdx = Math.floor(Math.random() * pList.length);
            const sliceAngle = (2 * Math.PI) / pList.length;
            
            // Random na dagdag na ikot gamit ang random offset para iba-iba ang huling pwesto
            const randomOffset = Math.random() * sliceAngle;
            const targetRotation = (winnerIdx * -sliceAngle) - randomOffset + (Math.PI * 0.5);
            
            const buf = await generateWheelImage(pList, targetRotation);
            const winner = pList[winnerIdx];
            
            // 3. WINNER SCREEN LAYOUT
            const embed = new EmbedBuilder()
                .setTitle("🎉 WINNER! 🎉").setColor(0x57F287)
                .setDescription(`🏆 Nanalo ng **${item}**: <@${winner.id}>\n\n📋 **Listahan:**\n${pList.map((u, i) => `${i===winnerIdx?'👑':`[${i+1}]`} **${u.username}** ${i===winnerIdx?'👈':''}`).join('\n')}`)
                .setThumbnail(winner.displayAvatarURL()); // Maliit na avatar ng nanalo sa gilid

            if (img) {
                embed.setImage(img); // Malaking image ng item na pwedeng mai-click para mag-zoom sa dulo
            } else {
                embed.setImage('attachment://wheel.png');
            }

            // Bagong attachment para sa huling pwesto ng gulong
            const filesToSend = [new AttachmentBuilder(buf, { name: 'wheel.png' })];

            const finalMsg = await interaction.editReply({
                content: `Congratulations <@${winner.id}>!`,
                embeds: [embed],
                files: filesToSend,
                components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(REROLL_ID).setLabel("Reroll 🔄").setStyle(ButtonStyle.Danger))]
            });

            // 4. REROLL SYSTEM COLLECTOR
            const rerollCollector = finalMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 });
            
            rerollCollector.on('collect', async (ri) => {
                if (ri.customId === REROLL_ID) {
                    if (ri.user.id !== hostId) return ri.reply({ ephemeral: true, content: "Host lang pwede!" });
                    await ri.deferUpdate();
                    rerollCollector.stop();
                    await runSpin(pList);
                }
            });
        }

        collector.on('collect', async (i) => {
            if (i.customId === ENTER_ID) {
                if ([...participants].some(u => u.id === i.user.id)) return i.reply({ ephemeral: true, content: "Kasali ka na!" });
                participants.add(i.user);
                await i.deferUpdate();
                
                // Panatilihin ang kasalukuyang embed properties nang hindi nasisira ang larawan
                const currentEmbed = EmbedBuilder.from(msg.embeds[0]);
                
                await interaction.editReply({ 
                    embeds: [currentEmbed],
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
