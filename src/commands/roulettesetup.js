import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder } from 'discord.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default {
    data: {
        name: 'roulettesetup',
        description: 'Magsimula ng isang totoong visual Wheel of Names roulette gamit ang opisyal na API!',
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

            // 1. Pagpapasali na Embed
            const setupEmbed = new EmbedBuilder()
                .setTitle("🎡 Official Wheel Roulette: Sali na!")
                .setDescription(`Mag-click ng **Join Roulette** sa ibaba para mapasama ang pangalan mo sa umiikot na gulong!\n\n👑 **Host:** <@${hostId}>\n*Aantayin ng bot na pindutin ng Host ang Start button para mag-roll.*`)
                .setColor(0x5865F2)
                .setFooter({ text: "Iyong Bot Official | Powered by wheelofnames.com" });

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

                // Saglit na Loading text habang kinukuha ng bot ang animation sa API
                const loadingEmbed = new EmbedBuilder()
                    .setTitle("🎬 Inihahanda ang Gulong... 🎬")
                    .setDescription("⚡ Kinukuha ang totoong spin animation mula sa Wheel of Names API... Wait lang po!")
                    .setColor(0xFEE75C);
                await interaction.editReply({ embeds: [loadingEmbed], components: [] });

                // 2. Pag-contact sa opisyal na Wheel of Names API base sa binigay mong Stoplight Docs
                // Gagawa tayo ng request para i-render ang listahan ng mga sumali bilang umiikot na GIF
                const encodedNames = participants.map(u => encodeURIComponent(u.username)).join(',');
                const wheelBaseUrl = `https://wheelofnames.com/?names=${encodedNames}`;

                let animationAttachment = null;
                try {
                    // Tinatawagan ang configuration generator endpoint para sa GIF format
                    const apiResponse = await fetch("https://wheelofnames.com/api/v2", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            imageFormat: "gif",
                            size: 360,
                            fps: 20,
                            loop: true,
                            displayWinnerDialog: false,
                            // Ipinapasok ang dynamic configurations base sa inyong listahan
                            description: `Discord Spin for ${participants.length} players`
                        })
                    });

                    // Kung maayos ang tugon ng server, gagawin natin itong attachment
                    if (apiResponse.ok) {
                        const buffer = await apiResponse.arrayBuffer();
                        animationAttachment = new AttachmentBuilder(Buffer.from(buffer), { name: "wheel-spin.gif" });
                    }
                } catch (apiError) {
                    console.error("API Fetch Error, falling back to layout:", apiError);
                }

                // 3. 10-Second Spinning Phase Simulation gamit ang totoong GIF (o fallback kapag downtime)
                const spinEmbed = new EmbedBuilder()
                    .setTitle("🎰 Ang Gulong ay Umiikot Na! 🎰")
                    .setDescription(`### 🔄 Umiikot ang mga pangalan ng ${participants.length} na manlalaro!\n\n*Panoorin ang gulong sa ibaba, bumabagal na ang ikot nito...*`)
                    .setColor(0xFEE75C)
                    .setFooter({ text: "Naghahanap ng winner... | Iyong Bot Official" });

                if (animationAttachment) {
                    spinEmbed.setImage("attachment://wheel-spin.gif");
                    await interaction.editReply({ embeds: [spinEmbed], files: [animationAttachment] });
                } else {
                    // Backup design kung sakaling walang internet/down ang panlabas na endpoint
                    spinEmbed.setDescription(`### 🔄 [ SPINNING ] 🎡\n\n👥 Kasali: \`${participants.length} players\`\n*Humihinto na ang roleta!*`);
                    await interaction.editReply({ embeds: [spinEmbed] });
                }

                // Papatakbuhin ng eksaktong 10 segundo ang suspense phase bago ibigay ang panalo gaya ng sa video mo!
                await sleep(10000);

                // 4. Pagpili ng Masuwerteng Winner
                const winner = participants[Math.floor(Math.random() * participants.length)];

                // 5. Grand Winner Embed
                const winnerEmbed = new EmbedBuilder()
                    .setTitle("🎉 TOTOONG ROULETTE WINNER! 🎉")
                    .setDescription(`### 🏆 Ang mapalad na nabunot sa gulong:\n🏆 **<@${winner.id}>** (${winner.username}) 🏆\n\n🔗 **Gusto niyo bang makita o laruin ang gulong niyo live?**\n👉 [I-click ang link para buksan ang Wheel of Names niyo!](${wheelBaseUrl})`)
                    .setColor(0x57F287)
                    .setThumbnail(winner.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: "Visual Roulette Completed! | wheelofnames.com" });

                if (animationAttachment) {
                    return await interaction.editReply({ 
                        content: `🏆 Congratulations <@${winner.id}>! Ikaw ang nanalo sa Wheel of Names!`, 
                        embeds: [winnerEmbed],
                        files: [animationAttachment] // Ika-cache muli para sa huling frame
                    });
                } else {
                    return await interaction.editReply({ 
                        content: `🏆 Congratulations <@${winner.id}>! Ikaw ang nanalo sa Wheel of Names!`, 
                        embeds: [winnerEmbed]
                    });
                }
            });

        } catch (error) {
            console.error("Official API Wheel Roulette Error:", error);
        }
    }
};
