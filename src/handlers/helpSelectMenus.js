import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const SPIN_WHEEL_ID = "wheel_spin_action";
export const RESET_WHEEL_ID = "wheel_reset_action";

// Listahan ng mga pets na pwedeng mapanalunan
export const ALL_AVAILABLE_PETS = [
    { name: "Dilophosaurus", url: "https://static.wikia.nocookie.net/growagarden/images/3/3c/Dilophosaurus.png" }, //
    { name: "Kitsune", url: "https://static.wikia.nocookie.net/growagarden/images/0/04/Kitsune.png" }, //
    { name: "Peryton", url: "https://static.wikia.nocookie.net/growagarden/images/2/26/PerytonPet.png" } //
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// UI Generator para sa unang labas ng roleta
export function createWheelUI() {
    const embed = new EmbedBuilder()
        .setTitle("🎡 Pet Roulette: Wheel of Names")
        .setDescription("Welcome to the Pet Roulette!\n\n**Possible Rewards:**\n🔹 Dilophosaurus\n🔹 Kitsune\n🔹 Peryton\n\nClick the **Spin Wheel** button below to draw a random pet!")
        .setColor(0x5865F2)
        .setThumbnail("https://i.imgur.com/vAM9gZ2.gif")
        .setFooter({ text: "Iyong Bot Official - Roulette System" });

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(SPIN_WHEEL_ID).setLabel("Spin Wheel").setStyle(ButtonStyle.Success).setEmoji("🎡"),
        new ButtonBuilder().setCustomId(RESET_WHEEL_ID).setLabel("Reset UI").setStyle(ButtonStyle.Secondary).setEmoji("🔄")
    );

    return { embeds: [embed], components: [actionRow] };
}

// Handler para sa mga interaction ng button ng roleta
export async function handleWheelInteraction(interaction) {
    try {
        const { customId } = interaction;

        // Siguraduhin na ang nag-click ng button ay ang mismong nag-type ng command
        const originalAuthorId = interaction.message.interaction?.user?.id;
        if (originalAuthorId && interaction.user.id !== originalAuthorId) {
            return await interaction.reply({ 
                content: "❌ **Bawal makialam:** Ang taong nag-setup lang ng roulette ang pwedeng mag-spin nito.", 
                ephemeral: true 
            });
        }

        if (customId === SPIN_WHEEL_ID) {
            await interaction.deferUpdate();

            const frames = [
                "🟩 Spinning... [ Dilophosaurus ] 🟩",
                "🟥 Spinning... [ Kitsune ] 🟥",
                "🟦 Spinning... [ Peryton ] 🟦",
                "✨ Selecting winner... ✨"
            ];

            for (const frame of frames) {
                const spinEmbed = new EmbedBuilder()
                    .setTitle("🎰 Spinning the Wheel... 🎰")
                    .setDescription(`### ${frame}\nPlease wait while the wheel slows down...`)
                    .setColor(0xFEE75C)
                    .setFooter({ text: "Selecting a pet... | Iyong Bot Official" });
                
                await interaction.editReply({ embeds: [spinEmbed], components: [] });
                await sleep(600); 
            }

            const winnerPet = ALL_AVAILABLE_PETS[Math.floor(Math.random() * ALL_AVAILABLE_PETS.length)];

            const winEmbed = new EmbedBuilder()
                .setTitle(`🎉 Winner Chosen: ${winnerPet.name}! 🎉`)
                .setDescription(`Congratulations <@${interaction.user.id}>! The wheel has selected a **${winnerPet.name}** for you!`)
                .setColor(0x57F287)
                .setImage(winnerPet.url)
                .setFooter({ text: "Spin Completed! | Iyong Bot Official" });

            const resetRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(RESET_WHEEL_ID).setLabel("Spin Again / Reset").setStyle(ButtonStyle.Primary).setEmoji("🔄")
            );

            return await interaction.editReply({ embeds: [winEmbed], components: [resetRow] });
        }

        if (customId === RESET_WHEEL_ID) {
            await interaction.deferUpdate();
            return await interaction.editReply(createWheelUI());
        }

    } catch (e) { 
        console.error("Roulette Button Error: ", e); 
    }
}

