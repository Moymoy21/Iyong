import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 🔥 TANGGAL ANG SHUFFLE DITO PARA LOCK ANG KULAY AT POSITION NG PLAYERS
async function generateWheelImage(participantsList, currentRotation) {
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext('2d');

    try {
        const wheelImageUrl = "https://cdn.discordapp.com/attachments/1065770284692558005/1516606427236401184/wheel.webp?ex=6a33414d&is=6a31efcd&hm=c95f39f936a6e07c00b590182ad17c41e059aa5a3d294912542307bc2a89ed1f&";
        const baseWheel = await loadImage(wheelImageUrl);
        
        ctx.drawImage(baseWheel, 0, 0, 400, 400);

        const activeUsers = participantsList || [];

        // CASE A: Walang sumali pa
        if (activeUsers.length === 0) {
            ctx.fillStyle = '#5865F2'; 
            ctx.beginPath();
            ctx.arc(200, 200, 185, 0, 2 * Math.PI);
            ctx.fill();
        } 
        // CASE B: 1 Player lang ang kasali (Solid Color + PFP sa gitna)
        else if (activeUsers.length === 1) {
            const singleUser = activeUsers[0];
            ctx.fillStyle = '#57F287'; // Permanenteng Green kapag mag-isa
            ctx.beginPath();
            ctx.arc(200, 200, 185, 0, 2 * Math.PI);
            ctx.fill();

            try {
                const avatarUrl = singleUser.displayAvatarURL({ extension: 'png', size: 128 });
                const avatarImg = await loadImage(avatarUrl);
                
                ctx.save();
                ctx.beginPath();
                ctx.arc(200, 200, 50, 0, 2 * Math.PI);
                ctx.clip();
                ctx.drawImage(avatarImg, 150, 150, 100, 100);
                ctx.restore();

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(200, 200, 50, 0, 2 * Math.PI);
                ctx.stroke();
            } catch (e) {
                console.error(e);
            }
        } 
        // CASE C: Maraming Slices (Locked Colors + Smooth Rotation Offset)
        else {
            const numSlices = activeUsers.length;
            const anglePerSlice = (2 * Math.PI) / numSlices;
            
            // Ang currentRotation ay galing sa dahan-dahang pagtaas ng value para maging swabe ang ikot
            const rotationOffset = currentRotation; 
            const sliceColors = ['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245', '#3498DB', '#9B59B6', '#1ABC9C'];

            // 1. Iguhit ang mga kulay na slices (LOCKED ayon sa index ng player!)
            activeUsers.forEach((user, index) => {
                const startAngle = index * anglePerSlice + rotationOffset;
                const endAngle = startAngle + anglePerSlice;

                ctx.fillStyle = sliceColors[index % sliceColors.length];
                ctx.beginPath();
                ctx.moveTo(200, 200);
                ctx.arc(200, 200, 185, startAngle, endAngle);
                ctx.lineTo(200, 200);
                ctx.fill();

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();
            });

            // 2. I-paste ang Avatar ng bawat player (LOCKED sa kani-kanilang kulay!)
            for (let index = 0; index < activeUsers.length; index++) {
                const user = activeUsers[index];
                const startAngle = index * anglePerSlice + rotationOffset;
                const middleAngle = startAngle + (anglePerSlice / 2);

                try {
                    const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 64 });
                    const avatarImg = await loadImage(avatarUrl);

                    const imgX = 200 + Math.cos(middleAngle) * 110;
                    const imgY = 200 + Math.sin(middleAngle) * 110;

                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(imgX, imgY, 22, 0, 2 * Math.PI);
                    ctx.clip();
                    ctx.drawImage(avatarImg, imgX - 22, imgY - 22, 44, 44);
                    ctx.restore();

                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(imgX, imgY, 22, 0, 2 * Math.PI);
                    ctx.stroke();
                } catch (imgErr) {
                    console.error(imgErr);
                }
            }

            // Gitnang puting cover ring
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(200, 200, 38, 0, 2 * Math.PI);
            ctx.fill();
        }

        // Kanang pulang tagaturo ng panalo
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(375, 200);
        ctx.lineTo(400, 180);
        ctx.lineTo(400, 220);
        ctx.closePath();
        ctx.fill();

        return canvas.toBuffer('image/png');
    } catch (err) {
        console.error("Canvas Rendering Error:", err);
        return null;
    }
}

export default {
    data: new SlashCommandBuilder()
        .setName('roulettesetup')
        .setDescription('Magsimula ng isang Event Roulette Giveaway!')
        .addStringOption(option => 
            option.setName('item')
                .setDescription('Ano ang ipamimigay mong item?')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Ilang segundo ang tagal ng pag-ikot? (Default: 5)')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const hostId = interaction.user.id;
            const itemToGiveaway = interaction.options.getString('item');
            const spinDuration = interaction.options.getInteger('duration') || 5; // Ginawang 5s para iwas lag sa Discord rate limits
            
            const participantsSet = new Set();

            const ENTER_BUTTON_ID = "roulette_enter_btn";
            const START_BUTTON_ID = "roulette_start_btn";

            const getActionRow = () => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(ENTER_BUTTON_ID)
                        .setLabel(`Enter (${participantsSet.size})`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji("🎟️"),
                    new ButtonBuilder()
                        .setCustomId(START_BUTTON_ID)
                        .setLabel("Start Roulette 🚀")
                        .setStyle(ButtonStyle.Success)
                );
            };

            const initialBuffer = await generateWheelImage([], 0);
            const initialAttachment = new AttachmentBuilder(initialBuffer, { name: 'rendered-wheel.png' });

            const setupEmbed = new EmbedBuilder()
                .setTitle("🎉 GIVEAWAY EVENT STARTED! 🎉")
                .setDescription(
                    `🎁 **Items to Giveaway:** \`${itemToGiveaway}\`\n` +
                    `👑 **Host:** <@${hostId}>\n` +
                    `⏱️ **Spin Duration:** \`${spinDuration} seconds\`\n` +
                    `-----------------------------------\n` +
                    `👇 Pindutin ang **Enter** sa ibaba para sumali sa listahan ng roleta!`
                )
                .setImage('attachment://rendered-wheel.png')
                .setColor(0x5865F2)
                .setFooter({ text: "Iyong Bot Official | Locked Smooth Spin Engine" });

            const message = await interaction.reply({ 
                embeds: [setupEmbed], 
                components: [getActionRow()], 
                files: [initialAttachment],
                fetchReply: true 
            });

            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 600000 
            });

            collector.on('collect', async (btnInteraction) => {
                if (btnInteraction.customId === ENTER_BUTTON_ID) {
                    if (Array.from(participantsSet).some(u => u.id === btnInteraction.user.id)) {
                        return await btnInteraction.reply({ content: "❌ Kasali ka na sa laro!", ephemeral: true });
                    }
                    participantsSet.add(btnInteraction.user);
                    await btnInteraction.deferUpdate();
                    
                    const participantsList = Array.from(participantsSet);
                    const updatedBuffer = await generateWheelImage(participantsList, 0);
                    const updatedAttachment = new AttachmentBuilder(updatedBuffer, { name: 'rendered-wheel.png' });
                    
                    const currentListText = participantsList.map((user, i) => `\`[ ${i + 1} ]\` **${user.username}**`).join('\n');
                    const updatedEmbed = EmbedBuilder.from(setupEmbed)
                        .setDescription(
                            `🎁 **Items to Giveaway:** \`${itemToGiveaway}\`\n` +
                            `👑 **Host:** <@${hostId}>\n` +
                            `⏱️ **Spin Duration:** \`${spinDuration} seconds\`\n` +
                            `-----------------------------------\n` +
                            `⚡ **Mga Kasalukuyang Sumali (${participantsSet.size}):**\n${currentListText}\n\n` +
                            `👇 Pindutin ang **Enter** sa ibaba para sumali sa listahan ng roleta!`
                        );

                    await interaction.editReply({ 
                        embeds: [updatedEmbed],
                        components: [getActionRow()],
                        files: [updatedAttachment]
                    });
                }

                if (btnInteraction.customId === START_BUTTON_ID) {
                    if (btnInteraction.user.id !== hostId) {
                        return await btnInteraction.reply({ content: "❌ **Bawal makialam:** Ang Host lamang ang pwedeng mag-start ng roleta.", ephemeral: true });
                    }
                    await btnInteraction.deferUpdate();
                    collector.stop("start_pressed");
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason !== "start_pressed") {
                    const timeoutEmbed = new EmbedBuilder()
                        .setTitle("🎡 Roulette Cancelled")
                        .setDescription("❌ Lumipas ang oras at hindi nasimulan ng host ang giveaway.")
                        .setColor(0xED4245);
                    return await interaction.editReply({ embeds: [timeoutEmbed], components: [], files: [] });
                }

                // ETO NA ANG FIX: Permanenteng pagkakasunod-sunod ng sumali, Bawal i-shuffle!
                const participants = Array.from(participantsSet);

                if (participants.length === 0) {
                    const noParticipantsEmbed = new EmbedBuilder()
                        .setTitle("🎡 Roulette Cancelled")
                        .setDescription("❌ Walang pumindot ng Enter kaya hindi itinuloy ang pag-roll.")
                        .setColor(0xED4245);
                    return await interaction.editReply({ embeds: [noParticipantsEmbed], components: [], files: [] });
                }

                // 🔄 SMOOTH SPIN ALGORITHM USING MATH ROTATION INDEPENDENT OF SHUFFLE
                let currentAngle = 0;
                const totalTicks = spinDuration * 2; // Hatiin ang bawat segundo sa 2 ticks para mas mabilis at hindi mukhang lag
                
                // HIDDEN CHANGING TEXT: Itatago natin ang gumagalaw na listahan sa chat habang nag-eexecute ang rotation!
                const shuffleEmbed = new EmbedBuilder()
                    .setTitle("🎰 Umiikot na ang Gulong... Mag-abang sa Resulta! 🎰")
                    .setDescription(`🎁 **Item:** \`${itemToGiveaway}\`\n⚡ *Kasalukuyang tinutukoy ng roleta ang mananalo...*`)
                    .setColor(0xFEE75C);

                for (let tick = 0; tick < totalTicks; tick++) {
                    // Dahan-dahang daragdagan ang anggulo para umikot nang swabe
                    currentAngle += 1.8; 
                    
                    const rollingBuffer = await generateWheelImage(participants, currentAngle);
                    const rollingAttachment = new AttachmentBuilder(rollingBuffer, { name: 'rendered-wheel.png' });

                    const finalEmbed = EmbedBuilder.from(shuffleEmbed).setImage('attachment://rendered-wheel.png');

                    await interaction.editReply({ embeds: [finalEmbed], files: [rollingAttachment], components: [] });
                    await sleep(500); // 500ms bawat render para swabe ang transitions
                }

                // 🏆 PAGPILI NG MANANALO PAGKATAPOS NG SWABENG IKOT
                const winner = participants[Math.floor(Math.random() * participants.length)];
                const encodedNames = participants.map(u => encodeURIComponent(u.username)).join(',');
                const wheelBaseUrl = `https://wheelofnames.com/yvy-ukr?names=${encodedNames}`;

                const finalFiltered = participants.filter(u => u.id !== winner.id);
                const finalRealListText = [winner, ...finalFiltered]
                    .map((user, index) => `${index === 0 ? '👑' : `\`[ ${index + 1} ]\``} **${user.username}** ${index === 0 ? '👈 WINNER!' : ''}`)
                    .join("\n");

                const winnerEmbed = new EmbedBuilder()
                    .setTitle("🎉 GIVEAWAY ROULLETE WINNER! 🎉")
                    .setDescription(
                        `### 🏆 Ang mapalad na nanalo ng **${itemToGiveaway}**:\n🏆 **<@${winner.id}>** (${winner.username}) 🏆\n\n` +
                        `📋 **Huling Resulta ng Listahan:**\n${finalRealListText}\n\n` +
                        `🔗 **Gusto niyo bang laruin ang eksaktong slices na ito sa web niyo?**\n👉 [I-click ang link para sa Wheel of Names niyo!](${wheelBaseUrl})`
                    )
                    .setColor(0x57F287)
                    .setThumbnail(winner.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: "Visual Roulette Completed! | Iyong Bot Official" });

                return await interaction.editReply({ 
                    content: `🏆 Congratulations <@${winner.id}>! Ikaw ang nanalo ng **${itemToGiveaway}**!`, 
                    embeds: [winnerEmbed],
                    files: [], 
                    components: []
                });
            });

        } catch (error) {
            console.error("Giveaway Canvas Roulette Error:", error);
        }
    }
};
