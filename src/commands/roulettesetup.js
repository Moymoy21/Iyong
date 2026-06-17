import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 🔥 PINAGANDANG CANVAS RENDERER: TINAKPAN NA AGAD ANG LUMANG IMAGE MULA SA PANIMULA
async function generateWheelImage(usernameList, currentTimer) {
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext('2d');

    try {
        const wheelImageUrl = "https://cdn.discordapp.com/attachments/1065770284692558005/1516606427236401184/wheel.webp?ex=6a33414d&is=6a31efcd&hm=c95f39f936a6e07c00b590182ad17c41e059aa5a3d294912542307bc2a89ed1f&";
        const baseWheel = await loadImage(wheelImageUrl);
        
        // I-draw ang base wheel para makuha ang anino at bilog na border
        ctx.drawImage(baseWheel, 0, 0, 400, 400);

        const activeNames = (usernameList || []).map(name => String(name).trim()).filter(name => name.length > 0);

        // 1. KUNG WALANG SUMALI PA (INITIAL SETUP PANEL)
        // Tatakpan agad ng malinis na solid Blurple color para burado ang lumang text na "iyong"
        if (activeNames.length === 0) {
            ctx.fillStyle = '#5865F2'; // Discord Blurple
            ctx.beginPath();
            ctx.arc(200, 200, 185, 0, 2 * Math.PI);
            ctx.fill();

            // Maglalagay ng malinis na text sa pinakagitna habang naghihintay
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText("Waiting for Players... 🎟️", 200, 200);
            ctx.restore();
        } 
        // 2. KUNG MAY MGA KASALI NA (DUMATING NA ANG MGA SLICES)
        else {
            // Kung 1 player pa lang, gumawa ng dummy slice para may hati ang gulong
            const displayNames = activeNames.length === 1 ? [activeNames[0], "Waiting... ⏳"] : activeNames;

            const numSlices = displayNames.length;
            const anglePerSlice = (2 * Math.PI) / numSlices;
            
            const rotationOffset = currentTimer * 0.8; 
            const sliceColors = ['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245', '#3498DB', '#9B59B6', '#1ABC9C'];

            displayNames.forEach((name, index) => {
                const startAngle = index * anglePerSlice + rotationOffset;
                const endAngle = startAngle + anglePerSlice;
                const middleAngle = startAngle + (anglePerSlice / 2);

                // Iguhit ang makulay na slice panel na nakatakip sa background
                ctx.fillStyle = sliceColors[index % sliceColors.length];
                ctx.beginPath();
                ctx.moveTo(200, 200);
                ctx.arc(200, 200, 185, startAngle, endAngle);
                ctx.lineTo(200, 200);
                ctx.fill();

                // Puting border line sa bawat pagitan
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Isulat ang pangalan ng player sa loob ng slice nito
                ctx.save();
                ctx.translate(200, 200);
                ctx.rotate(middleAngle);
                
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 16px sans-serif'; 
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                
                const cleanName = name.substring(0, 8);
                ctx.fillText(cleanName, 130, 0); 
                ctx.restore();
            });

            // Re-draw ang gitnang puting bilog para maging malinis ang dulo ng mga linya
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(200, 200, 38, 0, 2 * Math.PI);
            ctx.fill();
        }

        // 3. Pulang Arrow Pointer indicator sa kanang bahagi
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
        .setDescription('Magsimula ng isang Event Roulette Giveaway na may selyadong text overlay!')
        .addStringOption(option => 
            option.setName('item')
                .setDescription('Ano ang ipamimigay mong item?')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Ilang segundo ang tagal ng pag-ikot? (Default: 10)')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const hostId = interaction.user.id;
            const itemToGiveaway = interaction.options.getString('item');
            const spinDuration = interaction.options.getInteger('duration') || 10; 
            
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

            // Unang labas: Malinis na agad at may nakatakip na solid color background
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
                .setFooter({ text: "Iyong Bot Official | Anti-Glitched Canvas System" });

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
                    if (participantsSet.has(btnInteraction.user)) {
                        return await btnInteraction.reply({ content: "❌ Kasali ka na sa laro!", ephemeral: true });
                    }
                    participantsSet.add(btnInteraction.user);
                    await btnInteraction.deferUpdate();
                    
                    const currentNames = Array.from(participantsSet).map(u => u.username);
                    const updatedBuffer = await generateWheelImage(currentNames, 0);
                    const updatedAttachment = new AttachmentBuilder(updatedBuffer, { name: 'rendered-wheel.png' });
                    
                    await interaction.editReply({ 
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

                const participants = Array.from(participantsSet);

                if (participants.length === 0) {
                    const noParticipantsEmbed = new EmbedBuilder()
                        .setTitle("🎡 Roulette Cancelled")
                        .setDescription("❌ Walang pumindot ng Enter kaya hindi itinuloy ang pag-roll.")
                        .setColor(0xED4245);
                    return await interaction.editReply({ embeds: [noParticipantsEmbed], components: [], files: [] });
                }

                // 2. SHUFFLING & SPINNING OVERLAY ANIMATION PHASE
                for (let i = spinDuration; i > 0; i--) {
                    const randomizedList = shuffleArray(participants);
                    const formattedListText = randomizedList
                        .map((user, index) => `\`[ ${index + 1} ]\` **${user.username}**`)
                        .join("\n");

                    const rollingNames = randomizedList.map(u => u.username);
                    const rollingBuffer = await generateWheelImage(rollingNames, i);
                    const rollingAttachment = new AttachmentBuilder(rollingBuffer, { name: 'rendered-wheel.png' });

                    const shuffleEmbed = new EmbedBuilder()
                        .setTitle("🎰 Umiikot na ang Gulong kasama ang mga Pangalan! 🎰")
                        .setDescription(
                            `🎁 **Item:** \`${itemToGiveaway}\`\n` +
                            `⏳ **Humihinto na sa loob ng:** \`${i}s\`\n\n` +
                            `⚡ **Kasalukuyang Ayos ng mga Pangalan:**\n${formattedListText}`
                        )
                        .setImage('attachment://rendered-wheel.png') 
                        .setColor(0xFEE75C);

                    await interaction.editReply({ embeds: [shuffleEmbed], files: [rollingAttachment], components: [] });
                    await sleep(1000); 
                }

                // 3. FINALIZATION AND WINNER CHOSEN
                const winner = participants[Math.floor(Math.random() * participants.length)];
                const encodedNames = participants.map(u => encodeURIComponent(u.username)).join(',');
                const wheelBaseUrl = `https://wheelofnames.com/yvy-ukr?names=${encodedNames}`;

                const finalFiltered = participants.filter(u => u.id !== winner.id);
                const finalShuffled = [winner, ...shuffleArray(finalFiltered)];
                const finalRealListText = finalShuffled
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
