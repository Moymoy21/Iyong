import { EmbedBuilder } from 'discord.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default {
    data: {
        name: 'roulettesetup',
        description: 'Magsimula ng isang Event Roulette gamit ang Reactions!',
        // Optional: Pwede mong i-convert ito sa SlashCommandBuilder kung mas gusto mo, pero gumagana ito sa array registration mo sa index.js
        toJSON() {
            return { name: this.name, description: this.description };
        }
    },

    async execute(interaction) {
        try {
            const JOIN_EMOJI = "🎟️"; // Ang emoji na pipindutin ng mga sasali
            let joinTimer = 60; // Oras sa segundo para makapag-react ang mga tao (60 seconds)

            // 1. Unang Embed: Pagpapasali sa mga user
            const setupEmbed = new EmbedBuilder()
                .setTitle("🎡 Event Roulette: Sali na!")
                .setDescription(`Mag-react ng **${JOIN_EMOJI}** sa ibaba para mapasama ang pangalan mo sa roleta!\n\n⏳ **Oras para sumali:** \`${joinTimer}s\``)
                .setColor(0x5865F2)
                .setThumbnail("https://i.imgur.com/vAM9gZ2.gif")
                .setFooter({ text: "Iyong Bot Official | Roulette System" });

            const message = await interaction.reply({ embeds: [setupEmbed], fetchReply: true });
            
            // Awtomatikong mag-react ang bot ng ticket emoji para pipindutin na lang nila
            await message.react(JOIN_EMOJI);

            // 2. Countdown Loop (I-a-update ang embed bawat ilang segundo para sa timer)
            const timerInterval = setInterval(async () => {
                joinTimer -= 5;
                if (joinTimer <= 0) {
                    clearInterval(timerInterval);
                } else {
                    const updateEmbed = new EmbedBuilder()
                        .setTitle("🎡 Event Roulette: Sali na!")
                        .setDescription(`Mag-react ng **${JOIN_EMOJI}** sa ibaba para mapasama ang pangalan mo sa roleta!\n\n⏳ **Oras para sumali:** \`${joinTimer}s\``)
                        .setColor(0x5865F2)
                        .setThumbnail("https://i.imgur.com/vAM9gZ2.gif")
                        .setFooter({ text: "Iyong Bot Official | Roulette System" });
                    
                    await interaction.editReply({ embeds: [updateEmbed] }).catch(() => clearInterval(timerInterval));
                }
            }, 5000);

            // Maghintay hanggang matapos ang 60 seconds registration
            await sleep(60 * 1000);

            // 3. Kolektahin ang mga nag-react
            const freshMessage = await interaction.channel.messages.fetch(message.id);
            const reaction = freshMessage.reactions.cache.get(JOIN_EMOJI);
            
            let participants = [];
            if (reaction) {
                const users = await reaction.users.fetch();
                // Kunin lahat ng nag-react MALIBAN sa mismong bot
                participants = users.filter(user => !user.bot).map(user => user);
            }

            // Awtomatikong tanggalin ang mga reactions para sarado na ang salihan
            await freshMessage.reactions.removeAll().catch(() => {});

            // Kung walang sumali, ihinto ang laro
            if (participants.length === 0) {
                const noParticipantsEmbed = new EmbedBuilder()
                    .setTitle("🎡 Roulette Cancelled")
                    .setDescription("❌ Walang sumali sa roulette kaya hindi ito itinuloy.")
                    .setColor(0xED4245);
                return await interaction.editReply({ embeds: [noParticipantsEmbed] });
            }

            // 4. Spinning Phase (Tatakbo ng eksaktong 10 seconds gamit ang frames)
            const spinFrames = [
                "🔄 [ 🟥 🟥 🟥 🟥 🟥 ] Shuffling names...",
                "🔄 [ 🟨 🟨 🟨 🟨 🟨 ] Mixing entries...",
                "🔄 [ 🟩 🟩 🟩 🟩 🟩 ] Spinning the wheel...",
                "🎰 [ 🟦 🟦 🟦 🟦 🟦 ] Slowing down...",
                "✨ Selecting the ultimate winner... ✨"
            ];

            for (const frame of spinFrames) {
                const spinEmbed = new EmbedBuilder()
                    .setTitle("🎰 Ang Roleta ay Umiikot na! 🎰")
                    .setDescription(`### ${frame}\nBinabasa ang listahan ng mga sumali...`)
                    .setColor(0xFEE75C)
                    .setFooter({ text: "Processing winner... | Iyong Bot Official" });
                
                await interaction.editReply({ embeds: [spinEmbed] });
                await sleep(2000); // 5 frames x 2 seconds = 10 Seconds na pag-ikot!
            }

            // 5. Pagpili sa Winner
            const winner = participants[Math.floor(Math.random() * participants.length)];

            // Pangwakas na Embed: Mention lang sa kaniya nang walang pinapakitang item/reward!
            const winnerEmbed = new EmbedBuilder()
                .setTitle("🎉 ROULETTE WINNER! 🎉")
                .setDescription(`### Ang mapalad na nabunot sa roleta ay walang iba kundi si:\n🏆 **<@${winner.id}>** (${winner.username}) 🏆\n\nSalamat sa lahat ng sumali!`)
                .setColor(0x57F287)
                .setThumbnail(winner.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: "Roulette Completed! | Iyong Bot Official" });

            // Mag-reply at i-mention siya sa mismong content para tumunog ang notification niya sa Discord
            return await interaction.editReply({ 
                content: `🎉 Congratulations <@${winner.id}>! Ikaw ang nanalo sa roleta!`, 
                embeds: [winnerEmbed] 
            });

        } catch (error) {
            console.error("Giveaway Roulette Error:", error);
        }
    }
};
