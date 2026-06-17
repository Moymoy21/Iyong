import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder, SlashCommandBuilder } from 'discord.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export default {
    // Gagamit tayo ng totoong SlashCommandBuilder para hingin ang Item at Duration pagkatype ng command
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
                .setDescription('Ilang segundo ang tagal ng pag-ikot/shuffling? (Halimbawa: 10)')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const hostId = interaction.user.id;
            const itemToGiveaway = interaction.options.getString('item');
            // Kung walang nilagay na duration, automatic itong 10 seconds
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

            // Ang link ng iyong umiikot na empty wheel image gift asset
            const wheelImageUrl = "https://cdn.discordapp.com/attachments/1065770284692558005/1516606427236401184/wheel.webp?ex=6a33414d&is=6a31efcd&hm=c95f39f936a6e07c00b590182ad17c41e059aa5a3d294912542307bc2a89ed1f&";
            const wheelAttachment = new AttachmentBuilder(wheelImageUrl, { name: 'rotating-wheel.webp' });

            // 1. UNANG EMBED: Lalabas agad pagkatype ng command (May detalye at Image agad!)
            const setupEmbed = new EmbedBuilder()
                .setTitle("🎉 GIVEAWAY EVENT STARTED! 🎉")
                .setDescription(
                    `🎁 **Items to Giveaway:** \`${itemToGiveaway}\`\n` +
                    `👑 **Host:** <@${hostId}>\n` +
                    `⏱️ **Spin Duration:** \`${spinDuration} seconds\`\n` +
                    `-----------------------------------\n` +
                    `👇 Pindutin ang **Enter** sa ibaba para sumali sa listahan ng roleta!`
                )
                .setImage('attachment://rotating-wheel.webp') // Nakadisplay na agad ang umiikot na wheel gift dito!
                .setColor(0x5865F2)
                .setFooter({ text: "Iyong Bot Official | Roulette Panel Setup" });

            const message = await interaction.reply({ 
                embeds: [setupEmbed], 
                components: [getActionRow()], 
                files: [wheelAttachment], // Isinasama agad ang image file sa unang labas pa lang
                fetchReply: true 
            });

            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 600000 // 10 minutes max waiting bago mag-timeout
            });

            collector.on('collect', async (btnInteraction) => {
                // KAPAG PINDOT ANG ENTER BUTTON
                if (btnInteraction.customId === ENTER_BUTTON_ID) {
                    if (participantsSet.has(btnInteraction.user)) {
                        return await btnInteraction.reply({ content: "❌ Kasali ka na sa laro!", ephemeral: true });
                    }
                    participantsSet.add(btnInteraction.user);
                    await btnInteraction.deferUpdate();
                    // I-e-edit ang reply para mag-update lang yung bilang ng sumali sa label ng Enter button
                    await interaction.editReply({ components: [getActionRow()] });
                }

                // KAPAG PINDOT ANG START BUTTON
                if (btnInteraction.customId === START_BUTTON_ID) {
                    if (btnInteraction.user.id !== hostId) {
                        return await btnInteraction.reply({ content: "❌ **Bawal pakialam:** Ang Host lamang ang pwedeng mag-start ng roleta.", ephemeral: true });
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

                // 2. SHUFFLING ANIMATION PHASE (Tatakbo base sa nilagay mong Spin Duration)
                for (let i = spinDuration; i > 0; i--) {
                    const randomizedList = shuffleArray(participants);
                    const formattedListText = randomizedList
                        .map((user, index) => `\`[ ${index + 1} ]\` **${user.username}**`)
                        .join("\n");

                    const shuffleEmbed = new EmbedBuilder()
                        .setTitle("🎰 Umiikot at Nag-sa-shuffle na ang Gulong! 🎰")
                        .setDescription(
                            `🎁 **Item:** \`${itemToGiveaway}\`\n` +
                            `⏳ **Humihinto na sa loob ng:** \`${i}s\`\n\n` +
                            `⚡ **Kasalukuyang Ayos ng mga Pangalan:**\n${formattedListText}`
                        )
                        .setImage('attachment://rotating-wheel.webp') // Naka-display pa rin ang gulong habang nag-o-roll
                        .setColor(0xFEE75C);

                    await interaction.editReply({ embeds: [shuffleEmbed], files: [wheelAttachment], components: [] });
                    await sleep(1000); 
                }

                // 3. PAGPILI NG WINNER AT CUSTOM LINK GENERATION
                const winner = participants[Math.floor(Math.random() * participants.length)];
                const encodedNames = participants.map(u => encodeURIComponent(u.username)).join(',');
                const wheelBaseUrl = `https://wheelofnames.com/yvy-ukr?names=${encodedNames}`;

                const finalFiltered = participants.filter(u => u.id !== winner.id);
                const finalShuffled = [winner, ...shuffleArray(finalFiltered)];
                const finalRealListText = finalShuffled
                    .map((user, index) => `${index === 0 ? '👑' : `\`[ ${index + 1} ]\``} **${user.username}** ${index === 0 ? '👈 WINNER!' : ''}`)
                    .join("\n");

                // 4. FINAL WINNER EMBED Panel
                const winnerEmbed = new EmbedBuilder()
                    .setTitle("🎉 GIVEAWAY ROULLETE WINNER! 🎉")
                    .setDescription(
                        `### 🏆 Ang mapalad na nanalo ng **${itemToGiveaway}**:\n🏆 **<@${winner.id}>** (${winner.username}) 🏆\n\n` +
                        `📋 **Huling Resulta ng Listahan:**\n${finalRealListText}\n\n` +
                        `🔗 **Gusto niyo bang makita ang custom slices niyo sa web template niyo?**\n👉 [I-click ang link para sa Wheel of Names niyo!](${wheelBaseUrl})`
                    )
                    .setColor(0x57F287)
                    .setThumbnail(winner.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: "Visual Roulette Completed! | Iyong Bot Official" });

                return await interaction.editReply({ 
                    content: `🏆 Congratulations <@${winner.id}>! Ikaw ang nanalo ng **${itemToGiveaway}**!`, 
                    embeds: [winnerEmbed],
                    files: [], // Inalis na ang wheel sa dulo para malinis tingnan
                    components: []
                });
            });

        } catch (error) {
            console.error("Giveaway Panel Roulette Error:", error);
        }
    }
};
