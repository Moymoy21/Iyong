import { EmbedBuilder } from 'discord.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default {
    data: {
        name: 'roulettesetup',
        description: 'Magsimula ng isang visual Wheel of Names roulette gamit ang Reactions!',
        toJSON() {
            return { name: this.name, description: this.description };
        }
    },

    async execute(interaction) {
        try {
            const JOIN_EMOJI = "🎟️"; 
            let joinTimer = 60; // 60 seconds salihan

            // 1. Unang Embed: Pagpapasali sa mga user
            const setupEmbed = new EmbedBuilder()
                .setTitle("🎡 Visual Event Roulette: Sali na!")
                .setDescription(`Mag-react ng **${JOIN_EMOJI}** sa ibaba para mapasama ang pangalan mo sa totoong Wheel of Names!\n\n⏳ **Oras para sumali:** \`${joinTimer}s\``)
                .setColor(0x5865F2)
                .setThumbnail("https://i.imgur.com/vAM9gZ2.gif")
                .setFooter({ text: "Iyong Bot Official | Visual Roulette" });

            const message = await interaction.reply({ embeds: [setupEmbed], fetchReply: true });
            await message.react(JOIN_EMOJI);

            // Countdown Loop para sa timer
            const timerInterval = setInterval(async () => {
                joinTimer -= 5;
                if (joinTimer <= 0) {
                    clearInterval(timerInterval);
                } else {
                    const updateEmbed = new EmbedBuilder()
                        .setTitle("🎡 Visual Event Roulette: Sali na!")
                        .setDescription(`Mag-react ng **${JOIN_EMOJI}** sa ibaba para mapasama ang pangalan mo sa totoong Wheel of Names!\n\n⏳ **Oras para sumali:** \`${joinTimer}s\``)
                        .setColor(0x5865F2)
                        .setThumbnail("https://i.imgur.com/vAM9gZ2.gif")
                        .setFooter({ text: "Iyong Bot Official | Visual Roulette" });
                    
                    await interaction.editReply({ embeds: [updateEmbed] }).catch(() => clearInterval(timerInterval));
                }
            }, 5000);

            // Maghintay ng 60 seconds
            await sleep(60 * 1000);

            // 2. Kolektahin ang mga sumali
            const freshMessage = await interaction.channel.messages.fetch(message.id);
            const reaction = freshMessage.reactions.cache.get(JOIN_EMOJI);
            
            let participants = [];
            if (reaction) {
                const users = await reaction.users.fetch();
                // Kunin ang Discord tag o username ng mga totoong tao
                participants = users.filter(user => !user.bot).map(user => user);
            }

            await freshMessage.reactions.removeAll().catch(() => {});

            if (participants.length === 0) {
                const noParticipantsEmbed = new EmbedBuilder()
                    .setTitle("🎡 Roulette Cancelled")
                    .setDescription("❌ Walang sumali kaya hindi natuloy ang pag-ikot ng gulong.")
                    .setColor(0xED4245);
                return await interaction.editReply({ embeds: [noParticipantsEmbed] });
            }

            // 3. 10-Second Spinning Phase (Visual Illusion Simulation)
            const spinFrames = [
                " Shuffling names into the wheel slices...",
                " Generating custom Wheel of Names interface...",
                " Setting up colors and pointer...",
                " Ready! Spinning the wheel now... 🎡",
                " ✨ Choosing winner from the entries... ✨"
            ];

            for (const frame of spinFrames) {
                const spinEmbed = new EmbedBuilder()
                    .setTitle("🎰 Inihahanda ang Wheel of Names... 🎰")
                    .setDescription(`### ${frame}\nKasalukuyang pinoproseso ang gulong...`)
                    .setColor(0xFEE75C)
                    .setThumbnail("https://i.imgur.com/vAM9gZ2.gif")
                    .setFooter({ text: "Processing... | Iyong Bot Official" });
                
                await interaction.editReply({ embeds: [spinEmbed] });
                await sleep(2000); // 5 frames x 2 seconds = 10 Seconds spinning presentation!
            }

            // 4. Pagpili ng Winner at Pag-gawa ng Custom Wheel Link
            const winner = participants[Math.floor(Math.random() * participants.length)];
            
            // Gumawa tayo ng Wheel of Names shareable link gamit ang names ng participants para pwede nilang laruin ulit live!
            // I-eencode natin ang mga pangalan para maging valid URL parameters
            const encodedNames = participants.map(u => encodeURIComponent(u.username)).join(',');
            const wheelLink = `https://wheelofnames.com/?names=${encodedNames}`;

            // 5. Pangwakas na Embed
            const winnerEmbed = new EmbedBuilder()
                .setTitle("🎉 TOTOONG ROULETTE WINNER! 🎉")
                .setDescription(`### 🏆 Ang mapalad na nabunot sa gulong: **<@${winner.id}>** (${winner.username}) 🏆\n\n🔗 **Gusto mo bang makita ang gulong niyo?**\nPanoorin o i-spin ulit ang inyong custom wheel dito:\n👉 [I-click para makita ang Wheel of Names niyo!](${wheelLink})`)
                .setColor(0x57F287)
                .setThumbnail(winner.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: "Visual Roulette Completed! | wheelofnames.com" });

            // I-mention ang winner sa chat text para alertado siya agad!
            return await interaction.editReply({ 
                content: `🏆 Congratulations <@${winner.id}>! Ikaw ang nanalo sa Wheel of Names!`, 
                embeds: [winnerEmbed] 
            });

        } catch (error) {
            console.error("Giveaway Roulette Error:", error);
        }
    }
};
