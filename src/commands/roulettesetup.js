import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default {
    data: {
        name: 'roulettesetup',
        description: 'Magsimula ng isang visual Wheel of Names roulette gamit ang Buttons!',
        toJSON() {
            return { name: this.name, description: this.description };
        }
    },

    async execute(interaction) {
        try {
            const hostId = interaction.user.id;
            const participantsSet = new Set();
            
            // Awtomatikong kasali ang host sa simula
            participantsSet.add(interaction.user);

            const JOIN_BUTTON_ID = "roulette_join_btn";
            const START_BUTTON_ID = "roulette_start_btn";

            const getActionRow = () => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(JOIN_BUTTON_ID)
                        .setLabel(`Join Roulette (${participantsSet.size})`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji("🎟️"),
                    new ButtonBuilder()
                        .setCustomId(START_BUTTON_ID)
                        .setLabel("Start Roulette 🚀")
                        .setStyle(ButtonStyle.Success)
                );
            };

            // 1. Unang Embed: Pagpapasali (Walang Timer)
            const setupEmbed = new EmbedBuilder()
                .setTitle("🎡 Event Roulette: Sali na!")
                .setDescription(`Mag-click ng **Join Roulette** sa ibaba para mapasama ang pangalan mo sa umiikot na gulong!\n\n👑 **Host:** <@${hostId}>\n*Aantayin ng bot na pindutin ng Host ang Start button para mag-roll.*`)
                .setColor(0x5865F2)
                .setFooter({ text: "Iyong Bot Official | Roulette System" });

            const message = await interaction.reply({ 
                embeds: [setupEmbed], 
                components: [getActionRow()], 
                fetchReply: true 
            });

            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 600000 // 10 minutes max waiting time
            });

            collector.on('collect', async (btnInteraction) => {
                if (btnInteraction.customId === JOIN_BUTTON_ID) {
                    if (participantsSet.has(btnInteraction.user)) {
                        return await btnInteraction.reply({ content: "❌ Kasali na ang pangalan mo!", ephemeral: true });
                    }
                    participantsSet.add(btnInteraction.user);
                    await btnInteraction.deferUpdate();
                    await interaction.editReply({ components: [getActionRow()] });
                }

                if (btnInteraction.customId === START_BUTTON_ID) {
                    if (btnInteraction.user.id !== hostId) {
                        return await btnInteraction.reply({ content: "❌ **Bawal makialam:** Ang Host lamang ang pwedeng mag-start.", ephemeral: true });
                    }
                    await btnInteraction.deferUpdate();
                    collector.stop("start_pressed");
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason !== "start_pressed") {
                    const timeoutEmbed = new EmbedBuilder()
                        .setTitle("🎡 Roulette Cancelled")
                        .setDescription("❌ Lumipas ang oras at hindi nasimulan ng host ang roulette.")
                        .setColor(0xED4245);
                    return await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
                }

                const participants = Array.from(participantsSet);

                // 2. Emoji at Text Animation Frames para sa Suspense (Ligtas sa Kahit Anong Device/Proxy)
                const animationFrames = [
                    "🔴 🟢 🔵 🟡 [ SHUFFLING ENTRIES ] 🟡 🔵 🟢 🔴",
                    "🚀 🎡 🚀 🎡 [ SPINNING THE WHEEL ] 🎡 🚀 🎡 🚀",
                    "✨ 🔮 ✨ 🔮 [ MIXING SLICES NOW ] 🔮 ✨ 🔮 ✨",
                    "🎰 🎰 🎰 🎰 [ SLOWING DOWN... ] 🎰 🎰 🎰 🎰",
                    "⚡ ⚡ ⚡ ⚡ [ SELECTING WINNER ] ⚡ ⚡ ⚡ ⚡"
                ];

                // 3. 10-Second Visual Loop gamit ang embeds at text swaps
                for (let i = 0; i < animationFrames.length; i++) {
                    const spinEmbed = new EmbedBuilder()
                        .setTitle("🎰 Ang Gulong ay Umiikot Na! 🎰")
                        .setDescription(`### ${animationFrames[i]}\n\n👥 **Bilang ng Kasali:** \`${participants.length} na manlalaro\`\n*Tinitimbang na ang kapalaran ng bawat isa sa gulong!*`)
                        .setColor(0xFEE75C)
                        .setFooter({ text: "Naghahanap ng winner... | Iyong Bot Official" });
                    
                    await interaction.editReply({ embeds: [spinEmbed], components: [] });
                    await sleep(2000); // 5 frames x 2 seconds = Saktong 10 Seconds ng Pag-ikot!
                }

                // 4. Pagpili ng Winner at Pag-link sa totoong Web Interface ng Wheel of Names
                const winner = participants[Math.floor(Math.random() * participants.length)];
                const encodedNames = participants.map(u => encodeURIComponent(u.username)).join(',');
                const wheelBaseUrl = `https://wheelofnames.com/?names=${encodedNames}`;

                // 5. Pangwakas na Embed na 100% Solid ang text at Mention
                const winnerEmbed = new EmbedBuilder()
                    .setTitle("🎉 ROULETTE WINNER! 🎉")
                    .setDescription(`### 🏆 Ang mapalad na nabunot sa gulong:\n🏆 **<@${winner.id}>** (${winner.username}) 🏆\n\n🔗 **Gusto niyo bang makita o laruin ang gulong niyo?**\n👉 [I-click ang link para buksan ang Wheel of Names niyo!](${wheelBaseUrl})`)
                    .setColor(0x57F287)
                    .setThumbnail(winner.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: "Visual Roulette Completed! | wheelofnames.com" });

                // I-mention ang mismong account para makatanggap siya ng notipikasyon sa notification bar ng mobile!
                return await interaction.editReply({ 
                    content: `🏆 Congratulations <@${winner.id}>! Ikaw ang nanalo sa Wheel of Names!`, 
                    embeds: [winnerEmbed],
                    components: []
                });
            });

        } catch (error) {
            console.error("Visual Button Roulette Error:", error);
        }
    }
};
