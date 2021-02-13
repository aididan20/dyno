import * as eris from '@dyno.gg/eris';

type ErisChannel = eris.Channel | eris.GuildChannel | eris.PrivateChannel | eris.GroupChannel;

declare module Dyno {
	export interface DynoConfig {
		name: string;
		author: string;
		version: string | number;
		lib: string;
		poweredBy: string;
		prefix: string;
		sudopref: string;
		adminPrefix: string;
		overseers: string[];
		contributors: object[];
		mentions: object[];
		test: boolean;
		beta: boolean;
		isCore: boolean;
		isPremium: boolean;
		shared: boolean;
		state: number;
		stateName: string;
		collector: boolean;
		invite: string;
		logLevel: string;
		youtubeKey: string;
		cryptkey: string;
		defaultPermissions: string;
		pkg: any;
		dynoGuild: string;
		statsGuild: string;
		guildLog: string;
		largeGuildLog: string;
		testGuilds: string[];
		betaGuilds: string[];
		avatar: string;
		shardIds: number[];
		clusterIds: number[];
		clusterCount: number;
		moduleList: string[];
		shardingStrategy: string;
		firstShardOverride: number;
		lastShardOverride: number;
		shardCountOverride: number;
		discordLogger: {[key: string]: string};
		shardWebhook: {[key: string]: string};
		cluster: {[key: string]: string};
		disableHeartbeat: boolean;
		logCommands:  boolean;
		handleRegion: boolean;
		regions: string[];
		disableEvents: boolean;
		enabledCommandGroups: string[];
		disabledCommandGroups: string[];
		disableHelp: boolean;
		maxStreamLimit: number;
		maxSongLength: number;
		maxPlayingTime: number;
		streamLimitThreshold: number;
		statsdPrefix: string;

		paths: {[key: string]: string};
		client: ClientConfig;
		site: WebConfig;
		cleverbot: { key: string };
		redis: {
			host: string;
			port: number;
			auth: string;
		}
		webhook: {
			host: string;
			port: number;
		}
		api: { baseurl: string }
		sentry: {
			dsn: string;
			logLevel: string;
		}
		emojis: {[key: string]: string};
		carbon: {
			key: string;
			url: string;
			list: string;
			info: string;
		}
		dbots: {
			key: string;
			url: string;
		}
		announcements: {
			joinMessage: string;
			leaveMessage: string;
			banMessage: string;
		}
		automod: {
			logChannel: string;
			badwords: string[];
		}
		permissions: {[key: string]: number};
		permissionsMap:{[key: string]: string};
	}
	export interface ClientConfig {
		id: string;
		secret: string;
		token: string;
		userid: string;
		game: string;
		admin: string;
		fetchAllUsers: boolean;
		disableEveryone: boolean;
		maxCachedMessages: number;
		messageLogging: boolean;
		ws: {[key: string]: string|number};
	}
	export interface WebConfig {
		host: string;
		port: number;
		listen_port: number;
		secret: string;
		statusChannel: string;
		statusMessage: string;
	}
	export interface ClusterConfig {
		clusterId: number;
		shardCount: number;
		clusterCount: number;
		firstShardId: number;
		lastShardId: number;
		rootCtx: any;
		client: eris.Client;
		restClient: eris.Client;
	}
	export interface GlobalConfig {
		prefix: string;
		commands: {[key: string]: boolean}
		modules: {[key: string]: boolean}
		webhooks: string[];
		dashAccess: string[];
		ignoredUsers: string[];
		nodes: NodeConfig[];
		[key: string]: any;
	}
	export interface NodeConfig {
		host: string;
		name?: string;
		port?: string;
		region?: string;
		premium?: boolean;
	}
	export interface GuildConfig {
		_id: string;
		prefix: string;
		modules: {[key: string]: boolean};
		commands: {[key: string]: boolean};
		subcommands?: {[key: string]: any};
		name?: string;
		iconURL?: string;
		ownerID?: string;
		region?: string;
		clientID?: string;
		lastActive?: number;
		timezone?: string;
		mods?: string[];
		modRoles?: string[];
		modonly?: boolean;
		deleted?: boolean;
		debug?: boolean;
		beta?: boolean;
		isPremium?: boolean;
		premiumInstalled?: boolean;
		ignoredUsers?: {[key: string]: any};
		ignoredRoles?: {[key: string]: any};
		ignoredChannels?: {[key: string]: any};
		[key: string]: any;
	}
	export class Dyno {
		public isReady: boolean;
		public readonly client: eris.Client;
		public readonly restClient: eris.Client;
		public readonly config: DynoConfig;
		public readonly globalConfig: GlobalConfig;
		public readonly logger: any;
		public readonly models: any;
		public readonly redis: any;
		public readonly statsd: any;
		public readonly utils: Utils;
		[key: string]: any;
	}
	export class Base {
		public readonly client: eris.Client;
		public readonly restClient: eris.Client;
		public readonly dyno: Dyno;
		public readonly cluster: ClusterConfig;
		public readonly config: DynoConfig;
		public readonly globalConfig: GlobalConfig;
		public readonly logger: any;
		public readonly ipc: IPCManager;
		public readonly webhooks: WebhookManager;
		public readonly permissionsManager: PermissionsManager;
		public readonly models: any;
		public readonly redis: any;
		public readonly statsd: any;
		public readonly utils: Utils;
		constructor(dyno: Dyno, guild?: eris.Guild);
		public hasPermissions(guild: eris.Guild, ...perms: string[]): boolean;
		public hasChannelPermissions(guild: eris.Guild, channel: ErisChannel, ...perms: string[]): boolean;
		public hasRoleHierarchy(guild: eris.Guild, role: eris.Role): boolean;
		public regionEnabled(guild: eris.Guild): boolean;
		public isAdmin(user: eris.User|eris.Member): boolean;
		public isOverseer(user: eris.User|eris.Member): boolean;
		public isServerAdmin(member: eris.Member, channel: ErisChannel): boolean;
		public isServerMod(member: eris.Member, channel: ErisChannel): boolean;
		public getVoiceChannel(member: eris.Member): ErisChannel;
		public resolveUser(guild: eris.Guild, user: string, context: any[], exact: boolean): eris.User|eris.Member;
		public resolveRole(guild: eris.Guild, role: string): eris.Role;
		public resolveChannel(guild: eris.Guild, channel: string): ErisChannel;
		public createRole(guild: eris.Guild, options: any): Promise<eris.Role>;
		public sendDM(userId: string, content: eris.MessageContent): Promise<any>;
		public sendMessage(channel: ErisChannel, content: eris.MessageContent, options?: any): Promise<eris.Message>;
		public executeWebhook(webhook: any, options: any): Promise<any>;
		public sendWebhook(channel: ErisChannel, options: any, guildConfig: GuildConfig): Promise<any>;
		public sendCode(channel: ErisChannel, content: eris.MessageContent, lang?:string): Promise<eris.Message>;
		public reply(message: eris.Message, content: eris.MessageContent): Promise<eris.Message>;
		public success(channel: ErisChannel, content: eris.MessageContent): Promise<eris.Message>;
		public error(channel: ErisChannel, content: eris.MessageContent, err?: Error): Promise<eris.Message>;
		public info(message: eris.Message): Promise<eris.Message>;
		public debug(message: eris.Message): Promise<eris.Message>;
		public warn(message: eris.Message): Promise<eris.Message>;
		public logError(err: Error, type: string): void;
	}
	export class Module extends Base {
		constructor(dyno: Dyno);
		isEnabled(guild: eris.Guild,  module: string|Module, guildConfig?: GuildConfig): boolean;
		schedule(interval: string, task: Function): void;
		[key: string]: any;
	}
	export interface ICommand {
		group         : string;
		module?       : string;
		aliases       : string[];
		description   : string;
		expectedArgs  : number;
		cooldown      : number;
		usage         : string|string[]
		defaultUsage? : string;
		disableDM?    : boolean;
		execute(data: CommandData): Promise<{}>;
	}
	export interface CommandData {
		message: eris.Message;
		args?: any[];
		guildConfig?: GuildConfig;
		isAdmin?: boolean;
		isOverseer?: boolean;
		command?: Command;
	}
	export interface SubCommand {
		name: string;
		desc: string;
		usage: string;
		default?: boolean;
		cooldown?: number;
	}
	export class Command extends Base {
		public name: string;
		public aliases: string[];
		constructor(dyno: Dyno);
		public help(message: eris.Message, guildConfig: GuildConfig): Promise<any>;
		[key: string]: any;
	}
	export class Role {
		public guild: eris.Guild;
		public guildConfig: GuildConfig;
		constructor(guild: eris.Guild, guildConfig: GuildConfig);
		public static resolve(guild: eris.Guild, role: string): Promise<eris.Role>;
		public static createRole(guild: eris.Guild, options: eris.RoleOptions): Promise<eris.Role>;
		public createRole(options: eris.RoleOptions): Promise<eris.Role>;
		public hasPermissions(guild: eris.Guild, ...perms: string[]): boolean;
		public getOrCreate(options: eris.RoleOptions): Promise<eris.Role>;
		public createOverwritePermissions(channels: ErisChannel[], permissions: string[]): void;
	}
	export class Channel {
		public guild: eris.Guild;
		public guildConfig: GuildConfig;
		constructor(guild: eris.Guild, guildConfig: GuildConfig);
		public static resolve(guild: eris.Guild, channel: string): Promise<eris.Channel>;
		public static create(guild: eris.Guild, options: any): Promise<eris.Channel>;
		public static delete(guild: eris.Guild, channelId: string): Promise<any>;
		public create(options: any): Promise<ErisChannel>;
		public delete(channel: ErisChannel): Promise<ErisChannel>;
	}
	export class Utils {
		public colors: {[key: string]: string};
		public time(fn: Function, label: string): void;
		public readdirRecursive(dir: string): string[];
		public existsSync(file: string): boolean;
		public sha256(data: any): string;
		public encrypt(str: string): string;
		public decrypt(str: string): string;
		public nextTick(): Promise<void>;
		public getRandomArbitrary(min: number, max: number): number;
		public getRandomInt(min: number, max: number): number;
		public pad(str: string, n: number): string;
		public lpad(str: string, n: number): string;
		public sumKeys(key: string, data: any): number;
		public ucfirst(str: string): string;
		public shuffleArray(arr: any[]): any[];
		public regEscape(str: string): string;
		public splitMessage(message: string|string[], len: number): any[];
		public clean(str: string): string;
		public fullName(user: any, escape: boolean): string;
		public regionEnabled(guild: eris.Guild, config: any): boolean;
		public sendMessage(channel: ErisChannel, message: string, lang: string, options: any): Promise<any>;
		public sortRoles(roles: eris.Role[]): eris.Role[];
		public highestRole(guild: eris.Guild, member: eris.Member): eris.Role;
		public hasRoleHierarchy(guild: eris.Guild, clientMember: eris.Member, role: eris.Role): boolean;
		public replacer(content: string, data: any, mentionUser: boolean): boolean;
		public isArray(value: any): boolean;
		public hexToInt(color: string): number;
		public getColor(color: string): number;
		public parseTimeLimit(limit: string|number): number;
		public formatBytes(bytes: number, decimals: number): string;
	}
	export class IPCManager {
		public client: eris.Client;
		public dyno: Dyno;
		public id: number;
		public pid: number;
		public commands: Map<string, Function>;
		public send(event: string, data: {[key: string]: any}): void;
		public onMessage(message: eris.Message): void;
		public awaitResponse(op: string, d: {[key: string]: any}): void;
		public register(command: Function): void;
	}
	export class PermissionsManager {
		constructor(dyno: Dyno);
		public dyno: Dyno;
		public isAdmin(user: eris.User|eris.Member): boolean;
		public isOverseer(user: eris.User|eris.Member): boolean;
		public isServerAdmin(member: eris.Member, channel: ErisChannel): boolean;
		public isServerMod(member: eris.Member, channel: ErisChannel): boolean;
		public canOverride(channel: ErisChannel, member: eris.Member, command: string): boolean;
	}
	export class WebhookManager {
		public dyno: Dyno;
		public config: DynoConfig;
		public client: eris.Client;
		public avatarUrl: string;
		public default: {
			username: string;
			avatarURL: string;
			tts: boolean;
		}
		constructor(dyno: Dyno);
		public getOrCreate(channel: ErisChannel): Promise<eris.Webhook>;
		public execute(channel: ErisChannel, options: eris.WebhookPayload, webhook: eris.Webhook): Promise<any>;
	}
}

export = Dyno;
