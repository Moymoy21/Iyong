import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import GIFEncoder from 'gifencoder';

// Helper function para sa canvas rendering context ng roleta
async function drawWheelFrame(ctx, participantsList, currentRotation) {
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
    } catch (err) {
        console.error(err);
    }
}

// Function para gumawa ng standalone PNG block para sa registration view
async function generateWheelImage(participantsList, currentRotation) {
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext('2d');
    await drawWheelFrame(ctx, participantsList, currentRotation);
    return canvas.toBuffer('image/png');
}

// Gumagawa ng animated GIF file ng pag-roll ng roleta
async function generateAnimatedWheelGif(pList, winnerIdx) {
    const encoder = new GIFEncoder(400, 400);
    encoder.start();
    encoder.setRepeat(0);   // Loop configuration
    encoder.setDelay(80);   // Frame speed tick (ms)
    encoder.setQuality(10); // Code image quality process ratio

    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext('2d');

    const sliceAngle = (2 * Math.PI) / pList.length;
    // Pinuwersa ang huling rotation value na tumigil sa nanalong index slot sa may arrow tracker
    const finalRot = (winnerIdx * -sliceAngle) + (Math.PI * 2);
    const totalFrames = 22; 

    for (let i = 0; i <= totalFrames; i++) {
        const t = i / totalFrames;
        // Cubic Ease Out formula para bumagal ang ikot sa huli
        const easeOutCubic = 1 - Math.pow(1 - t, 3);
        const currentRot = (finalRot * easeOutCubic) + (Math.PI * 0.5);
        
        ctx.clearRect(0, 0, 400, 400);
        await drawWheelFrame(ctx, pList, currentRot);
        encoder.addFrame(ctx);
    }

    // Freeze delay buffer para hindi biglang mag-loop back ang animation sa simula
    for (let i = 0; i < 15; i++) {
        encoder.addFrame(ctx);
    }

    encoder.finish();
    return encoder.out.getData();
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

        let msg = await interaction.reply({
            embeds: [new EmbedBuilder().setTitle("🎉 GIVEAWAY STARTED!").setDescription(`Item: **${item}**\nHost: <@${hostId}>`).setImage('attachment://wheel.png').setThumbnail(img).setColor(0x5865F2)],
            files: [new AttachmentBuilder(await generateWheelImage([], 0), { name: 'wheel.png' })],
            components: [getRow()], fetchReply: true
        });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 600000 });

        async function runSpin(pList) {
            if (pList.length === 0) return;

            // Loading layout screen para may temporary status update bago lumabas ang GIF rendering stream
            const loadingEmbed = new EmbedBuilder()
                .setTitle("🎰 GENERATING ROULETTE...")
                .setDescription(`Item: **${item}**\n\nInihahanda ang mahiwagang gulong para sa ${pList.length} na kasali...`)
                .setColor(0xFEE75C);
                
            if(img) loadingEmbed.setThumbnail(img);

            await interaction.editReply({
                embeds: [loadingEmbed],
                components: [],
                files: []
            });

            const winnerIdx = Math.floor(Math.random() * pList.length);
            const gifBuffer = await generateAnimatedWheelGif(pList, winnerIdx);
            const winner = pList[winnerIdx];

            const embed = new EmbedBuilder()
                .setTitle("🎉 WINNER! 🎉").setColor(0x57F287)
                .setDescription(`🏆 Nanalo ng **${item}**: <@${winner.id}>\n\n📋 **Listahan:**\n${pList.map((u, i) => `${i===winnerIdx?'👑':`[${i+1}]`} **${u.username}** ${i===winnerIdx?'👈':''}`).join('\n')}`)
                .setImage('attachment://wheel.gif'); // Naka-link na ngayon sa animated buffer stream
            
            if(img) embed.setThumbnail(img);
            else embed.setThumbnail(winner.displayAvatarURL());

            const finalMsg = await interaction.editReply({
                content: `Congratulations <@${winner.id}>!`,
                embeds: [embed],
                files: [new AttachmentBuilder(gifBuffer, { name: 'wheel.gif' })],
                components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(REROLL_ID).setLabel("Reroll 🔄").setStyle(ButtonStyle.Danger))]
            });

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
                                                                                                                                           
