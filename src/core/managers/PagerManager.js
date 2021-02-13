'use strict';

const { Collection, Pager } = require('@dyno.gg/dyno-core');

/**
 * @class PagerManager
 * @extends Collection
 */
class PagerManager extends Collection {
	/**
	 * PagerManager constructor
	 * @param {Dyno} dyno Dyno core instance
	 */
	constructor(dyno) {
		super();
		this.dyno = dyno;
	}

	/**
	 * Create a pager
	 * @param {Object} 				options Pager options
	 * @param {String|GuildChannel} options.channel The channel this pager will be created in
	 * @param {User|Member} 		options.user The user this pager is created for
	 * @param {Object} 				options.embed The embed object to be sent without fields
	 * @param {Object[]} 			options.fields All embed fields that will be paged
	 * @param {Number} 				[options.pageLimit=10] The number of items per page, max 25, default 10
	 */
	create(options) {
		if (!options || !options.channel || !options.user) return;
		let id = `${options.channel.id}.${options.user.id}`;
		let pager = new Pager(this, id, options);
		this.set(id, pager);
		return pager;
	}
}

module.exports = PagerManager;
