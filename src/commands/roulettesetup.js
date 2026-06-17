import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';
import https from 'https';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 🛠️ FONT LOADER PARA SA RAILWAY: Nag-o-auto download ng font file para may magamit si @napi-rs/canvas
const fontPath = path.join(process.cwd(), 'Roboto-Bold.ttf');
let isFontLoaded = false;

function ensureFontExists() {
    return new Promise((resolve) => {
        if (isFontLoaded || fs.existsSync(fontPath)) {
            if (!isFontLoaded) {
                GlobalFonts.registerFromPath(fontPath, 'CustomRailwayFont');
                isFontLoaded = true;
            }
            return resolve(true);
        }

        // Mag-download ng selyadong Roboto Bold font mula sa opisyal na Google Fonts CDN
        const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/apache/roboto/Roboto-Bold.ttf';
        const file = fs.createWriteStream(fontPath);

        https.get(fontUrl, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                GlobalFonts.registerFromPath(fontPath, 'CustomRailwayFont');
                isFontLoaded = true;
                console.log('✅ Font downloaded and registered successfully for Railway!');
                resolve(true);
            });
        }).on('error', (err) => {
            console.error('Error downloading font:', err);
            resolve(false);
        });
    });
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 🔥 CANVAS ENGINE: SENTRADO AT MAY REHISTRADONG FONT NA KAYA GAGANA NA ANG TEXT
async function generateWheelImage(usernameList, currentTimer) {
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext('2d');

    // Siguraduhing load ang font bago mag-draw
    await ensureFontExists();

    try {
        const wheelImageUrl = "https://cdn.discordapp.com/attachments/1065770284692558005/1516606427236401184/wheel.webp?ex=6a33414d&is=6a31efcd&hm=c95f39f936a6e07c00b590182ad17c41e059aa5a3d294912542307bc2a89ed1f&";
        const baseWheel = await loadImage(wheelImageUrl);
        
        ctx.drawImage(baseWheel, 0, 0, 400, 400);

        const activeNames = (usernameList || []).map(name => String(name).trim()).filter(name => name.length > 0);

        if (activeNames.length === 0) {
            // Unang labas: Solid Blurple para malinis tingnan
            ctx.fillStyle = '#5865F2'; 
            ctx.beginPath();
            ctx.arc(200, 200, 185, 0, 2 * Math.PI);
            ctx.fill();

            ctx.save();
            ctx.fillStyle = '#ffffff';
            // GAGANA NA ITO: Dahil rehistrado na ang 'CustomRailwayFont' sa system
            ctx.font = 'bold 18px CustomRailwayFont';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText("Waiting for Players... 🎟️", 200, 200);
            ctx.restore();
        } 
        else {
            const displayNames = activeNames.length === 1 ? [activeNames[0], "Waiting... ⏳"] : activeNames;

            const numSlices = displayNames.length;
            const anglePerSlice = (2 * Math.PI) / numSlices;
            
            const rotationOffset = currentTimer * 0.8; 
            const sliceColors = ['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245', '#3498DB', '#9B59B6', '#1ABC9C'];

            displayNames.forEach((name, index) => {
                const startAngle = index * anglePerSlice + rotationOffset;
                const endAngle = startAngle + anglePerSlice;
                const middleAngle = startAngle + (anglePerSlice / 2);

                // Iguhit ang makulay na slice panel
                ctx.fillStyle = sliceColors[index % sliceColors.length];
                ctx.beginPath();
                ctx.moveTo(200, 200);
                ctx.arc(200, 200, 185, startAngle, endAngle);
                ctx.lineTo(200, 200);
                ctx.fill();

                // Puting hati/border lines
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Isulat ang pangalan gamit ang na-download na font
                ctx.save();
                ctx.translate(200, 200);
                ctx.rotate(middleAngle);
                
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 15px CustomRailwayFont'; 
                ctx.textAlign = 'center'; 
                ctx.textBaseline = 'middle';
                
                // Kunin ang unang 10 characters ng discord username niyo
                const cleanName = name.substring(0, 10);
                ctx.fillText(cleanName, 110, 0); 
                ctx.restore();
            });

            // Gitnang puting cover circle
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(200, 200, 38, 0, 2 * Math.PI);
            ctx.fill();
        }

        // Kanang pulang arrow indicator
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
                .setFooter({ text: "Iyong Bot Official | Auto-Font Injection System" });

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
                    
                    // Kinukuha ang saktong discord username ng pumindot
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
