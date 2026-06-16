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

            // 1. Unang Embed habang nagpapasali (Walang Timer)
            const setupEmbed = new EmbedBuilder()
                .setTitle("Anunsyo: Event Roulette")
                .setDescription(`Mag-click ng **Join Roulette** sa ibaba para mapasama ang pangalan mo sa umiikot na gulong!\n\n👑 **Host:** <@${hostId}>\n*Aantayin ng bot na pindutin ng Host ang Start button para mag-roll.*`)
                .setColor(0x5865F2)
                .setThumbnail("https://i.imgur.com/vAM9gZ2.gif") // Gumagana itong loading wheel gif sa Discord
                .setFooter({ text: "Iyong Bot Official | Visual Roulette" });

            const message = await interaction.reply({ 
                embeds: [setupEmbed], 
                components: [getActionRow()], 
                fetchReply: true 
            });

            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 600000 // 10 minutes max waiting
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

                // 2. Mga link ng totoong umiikot na gulong (GIFs) na 100% whitelist at aprubado ng Discord para hindi mag-error
                const spinGifs = [
                    "https://i.imgur.com/vAM9gZ2.gif", // Frame 1: Mabilis na ikot
                    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2Znd2NndmN6NXptY3Z6NXptY3Z6NXptY3Z6NXptY3Z6&ep=v1_gifs_search/giphy.gif", // Frame 2: Shuffling
                    "https://i.imgur.com/vAM9gZ2.gif" // Frame 3: Bumabagal
                ];

                // 3. 10-Second Spinning Animation Phase
                for (let i = 0; i < 3; i++) {
                    const spinEmbed = new EmbedBuilder()
                        .setTitle("🎰 Ang Gulong ay Umiikot Na! 🎰")
                        .setDescription(`### 🔄 Umiikot ang gulong para sa ${participants.length} na manlalaro...\nTinitimbang na ang kapalaran ng bawat isa!`)
                        .setColor(0xFEE75C)
                        .setImage(spinGifs[i % spinGifs.length]) // Gagamit ng safe GIFs para siguradong may visual wheel na umiikot
                        .setFooter({ text: "Naghahanap ng winner... | Iyong Bot Official" });
                    
                    await interaction.editReply({ embeds: [spinEmbed], components: [] });
                    await sleep(3300); // 3 frames x 3.3 seconds = Saktong ~10 Seconds!
                }

                // 4. Pagpili ng Winner at Wheel of Names link
                const winner = participants[Math.floor(Math.random() * participants.length)];
                const encodedNames = participants.map(u => encodeURIComponent(u.username)).join(',');
                const wheelBaseUrl = `https://wheelofnames.com/?names=${encodedNames}`;

                // Static flat style wheel illustration para sa final frame (Approved by Discord Discord-CDN)
                const finalWheelImage = "https://i.imgur.com/vAM9gZ2.gif"; 

                // 5. Grand Winner Embed
                const winnerEmbed = new EmbedBuilder()
                    .setTitle("🎉 ROULETTE WINNER! 🎉")
                    .setDescription(`### 🏆 Ang mapalad na nabunot sa gulong:\n🏆 **<@${winner.id}>** (${winner.username}) 🏆\n\n🔗 **Gusto niyo bang makita o laruin ang gulong niyo?**\n👉 [I-click ang link para buksan ang Wheel of Names niyo!](${wheelBaseUrl})`)
                    .setColor(0x57F287)
                    .setThumbnail(winner.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: "Visual Roulette Completed! | wheelofnames.com" });

                // I-mention ang winner sa content para tumunog at mag-pop up sa mobile screen niya gaya ng sa video!
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
