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
            
            // Dito natin itatabi ang listahan (Set) ng mga sumali para walang duplicate
            const participantsSet = new Set();
            // Awtomatikong kasali ang host sa simula, pwede mo itong alisin kung gusto mo
            participantsSet.add(interaction.user);

            const JOIN_BUTTON_ID = "roulette_join_btn";
            const START_BUTTON_ID = "roulette_start_btn";

            // 1. Gawa ng UI Buttons
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

            // Unang Embed habang naghihintay ng mga sasali (Walang Timer!)
            const setupEmbed = new EmbedBuilder()
                .setTitle("Anunsyo: Event Roulette")
                .setDescription(`Mag-click ng **Join Roulette** sa ibaba para mapasama ang pangalan mo sa umiikot na gulong!\n\n👑 **Host:** <@${hostId}>\n*Aantayin ng bot na pindutin ng Host ang Start button para mag-roll.*`)
                .setColor(0x5865F2)
                .setThumbnail("https://i.imgur.com/vAM9gZ2.gif")
                .setFooter({ text: "Iyong Bot Official | Visual Roulette" });

            const message = await interaction.reply({ 
                embeds: [setupEmbed], 
                components: [getActionRow()], 
                fetchReply: true 
            });

            // 2. Button Interaction Collector (Tatakbo hanggang hindi pini-pindot ang Start)
            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 600000 // Lifespan ng button bago mag-timeout (10 minutes max waiting time)
            });

            collector.on('collect', async (btnInteraction) => {
                // KASO A: May nag-click ng "Join Roulette"
                if (btnInteraction.customId === JOIN_BUTTON_ID) {
                    if (participantsSet.has(btnInteraction.user)) {
                        return await btnInteraction.reply({ 
                            content: "❌ Kasali na ang pangalan mo sa listahan!", 
                            ephemeral: true 
                        });
                    }

                    participantsSet.add(btnInteraction.user);
                    await btnInteraction.deferUpdate();
                    
                    // I-update ang bilang ng sumali sa label ng button
                    await interaction.editReply({ components: [getActionRow()] });
                }

                // KASO B: May nag-click ng "Start Roulette"
                if (btnInteraction.customId === START_BUTTON_ID) {
                    // Tiyakin na ang Host LANG ang pwedeng magpapindot ng Start
                    if (btnInteraction.user.id !== hostId) {
                        return await btnInteraction.reply({ 
                            content: "❌ **Bawal makialam:** Ang Host lamang ang may kapangyarihang magpasimula ng roleta.", 
                            ephemeral: true 
                        });
                    }

                    // Ihinto na ang pagtanggap ng clicks
                    await btnInteraction.deferUpdate();
                    collector.stop("start_pressed");
                }
            });

            collector.on('end', async (collected, reason) => {
                // Kung nag-timeout at walang nag-start
                if (reason !== "start_pressed") {
                    const timeoutEmbed = new EmbedBuilder()
                        .setTitle("🎡 Roulette Cancelled")
                        .setDescription("❌ Lumipas ang 10 minuto at hindi nasimulan ng host ang roulette.")
                        .setColor(0xED4245);
                    return await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
                }

                // Convert Set back to Array para sa processing
                const participants = Array.from(participantsSet);

                if (participants.length === 0) {
                    const noParticipantsEmbed = new EmbedBuilder()
                        .setTitle("🎡 Roulette Cancelled")
                        .setDescription("❌ Walang sumali kaya hindi natuloy ang pag-ikot ng gulong.")
                        .setColor(0xED4245);
                    return await interaction.editReply({ embeds: [noParticipantsEmbed], components: [] });
                }

                // 3. I-encode ang mga pangalan para sa Wheel of Names URL
                const encodedNames = participants.map(u => encodeURIComponent(u.username)).join(',');
                const wheelBaseUrl = `https://wheelofnames.com/?names=${encodedNames}`;
                
                // Gagamit ng image renderer para kumuha ng snapshot ng gulong
                const getWheelSnapshot = (angle) => `https://image.thum.io/get/width/400/crop/600/${wheelBaseUrl}&spin=${angle}`;

                // 4. Automated Spinning Phase (Eksaktong 10 Seconds Simulation)
                const rotationAngles = ["90", "180", "270", "360", "45"];
                let currentFrame = 1;

                for (const angle of rotationAngles) {
                    const spinEmbed = new EmbedBuilder()
                        .setTitle("🎰 Ang Gulong ay Umiikot Na! 🎰")
                        .setDescription(`### 🔄 [ Frame ${currentFrame}/5 ] Umiikot ang mga pangalan niyo...\nKapansin-pansing bumabagal na ang ikot ng roleta!`)
                        .setColor(0xFEE75C)
                        .setImage(getWheelSnapshot(angle))
                        .setFooter({ text: "Naghahanap ng winner... | Iyong Bot Official" });
                    
                    // I-edit ang reply nang WALANG components/buttons para selyado na
                    await interaction.editReply({ embeds: [spinEmbed], components: [] });
                    await sleep(2000); // 5 frames x 2 seconds = 10 Seconds ng pag-ikot!
                    currentFrame++;
                }

                // 5. Pagpili ng Masuwerteng Winner
                const winner = participants[Math.floor(Math.random() * participants.length)];

                // Pangwakas na Embed
                const winnerEmbed = new EmbedBuilder()
                    .setTitle("🎉 ROULETTE WINNER! 🎉")
                    .setDescription(`### 🏆 Ang mapalad na nabunot sa gulong:\n🏆 **<@${winner.id}>** (${winner.username}) 🏆\n\n🔗 **Gusto niyo bang makita ang custom wheel niyo?**\n👉 [I-click ang link para i-spin ulit!](${wheelBaseUrl})`)
                    .setColor(0x57F287)
                    .setImage(getWheelSnapshot("0"))
                    .setThumbnail(winner.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: "Visual Roulette Completed! | wheelofnames.com" });

                // I-mention ang winner sa chat text para alertado siya agad tulad ng sa video!
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
