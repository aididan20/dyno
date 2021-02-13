'use strict';

const {Command} = require('@dyno.gg/dyno-core');

class Distance extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['distance'];
		this.group        = 'Misc';
		this.description  = 'Get the distance between two sets of coordinates';
		this.usage        = 'distance [coords] [coords]';
		this.cooldown     = 3000;
		this.expectedArgs = 2;
		this.example = [
			'distance 51.295978,-1.104938 45.407692,2.4415',
		];
	}

	deg2rad(deg) {
		return deg * (Math.PI/180)
	}

	getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
		var R = 6371;
		var dLat = this.deg2rad(lat2-lat1);
		var dLon = this.deg2rad(lon2-lon1); 
		var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
				Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
				Math.sin(dLon/2) * Math.sin(dLon/2);
		var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
		var d = R * c;
		return d;
	  }

	execute({ message, args }) {
		args = args.join(' ').replace(/, /g, ',').split(' ');

		let coords1 = args[0].split(','),
			coords2 = args[1].split(',');

		if (!coords1 || !coords2 || coords1.length !== 2 || coords2.length !== 2) {
			return this.error(message.channel, 'Invalid coordinates, please provide two coordinate pairs. See distance help for more info.');
		}

		let distance = this.getDistanceFromLatLonInKm(coords1[0], coords1[1], coords2[0], coords2[1]);
		if (!distance) {
			return this.error(message.channel, 'Invalid coordinates, please provide two coordinate pairs. See distance help for more info.');
		}

		const embed = {
			color: this.utils.getColor('blue'),
			fields: [
				{ name: 'Lat/Lng 1', value: coords1.join(', '), inline: true },
				{ name: 'Lat/Lng 2', value: coords2.join(', '), inline: true },
				{ name: 'Distance (km)', value: distance.toFixed(2).toString() },
			],
		};

		return this.sendMessage(message.channel, { embed });
	}
}

module.exports = Distance;
