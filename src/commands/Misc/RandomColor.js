'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class RandomColor extends Command {
	constructor(...args) {
		super(...args);

		this.aliases = ['randomcolor', 'randcolor', 'randomcolour'];
		this.group = 'Misc';
		this.description = 'Generates a random hex color with preview.';
		this.usage = 'randomcolor';
		this.cooldown = 3000;
		this.expectedArgs = 0;
	}

	execute({ message }) {
		const int = (Math.random() * (1 << 24) | 0);
		const hex = ('00000' + int.toString(16)).slice(-6);
		const rgb = [(int & 0xff0000) >> 16, (int & 0x00ff00) >> 8, (int & 0x0000ff)];

		const colorurl = `${this.config.colorapi.host}/color/${hex}/80x80.png`;

		return this.sendMessage(message.channel, {
			embed: {
				color: int,
				fields: [
					{ name: 'Hex', value: `#${hex}` },
					{ name: 'RGB', value: `${rgb.join(', ')}` },
				],
				thumbnail: { url: colorurl },
			},
		});
	}
}

module.exports = RandomColor;
