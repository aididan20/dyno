const { Command } = require('@dyno.gg/dyno-core');

class Color extends Command {
    constructor(...args) {
        super(...args);

        this.aliases      = ['color', 'colour'];
        this.module       = 'Misc';
        this.description  = 'Show a color using hex.';
        this.usage        = ['color #hex', 'color hex'];
        this.example      = ['color #ffffff', 'color ffffff'];
        this.cooldown     = 3000;
        this.expectedArgs = 1;
    }
    hextoRGB(hex) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return [r, g, b];
    }
    execute({ message, args }) {
        const hex = args[0].replace('#', '');
        const rgb = this.hextoRGB(hex);
        if (rgb.includes(NaN)) return this.error(message.channel, 'Invalid color format!');
        const colorurl = `${this.config.colorapi.host}/color/${hex}/80x80.png`;

        return this.sendMessage(message.channel, {
            embed: {
                color: parseInt(`0x${hex}`),
                fields: [
                    { name: 'Hex', value: `#${hex}` },
                    { name: 'RGB', value: `${rgb.join(', ')}` },
                ],
                thumbnail: { url: colorurl },
            },
        });
    }
}

module.exports = Color;
