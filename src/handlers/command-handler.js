// src/handlers/command-handler.js

import {
	addGroupToWhitelist,
	isUserWhitelisted,
	removeGroupFromWhitelist,
	putJsonToKv,
	getJsonFromKv,
	recordBotReplyMessage,
} from '../utils/utils'; //  导入白名单管理函数
import { clearUserContextHistory } from '../storage/context-storage'; //  导入上下文清理函数
import { handleSearchCommand } from './search-handler'; //  !!!  导入 handleSearchCommand  !!!
import { addSummaryGroupToWhitelist, removeSummaryGroupFromWhitelist } from '../summary/summary-config';

//  !!!  更新 Bot 命令列表，添加 help 命令  !!!
const botCommands = [
	{ command: 'start', description: '查看机器人介绍和使用方法 (白名单用户)' },
	{ command: 'help', description: '查看可用命令列表 (白名单用户)' }, //  !!!  新增 help 命令  !!!
	{ command: 'search', description: '使用 Google 搜索 (所有用户可用)' }, //  !!!  新增 search 命令  !!!
	{ command: 'clear_user_context', description: '清理您在本群组的历史上下文 (所有用户可用)' },
	// { command: 'clear_group_context', description: '清理本群组所有用户的对话上下文 (白名单用户)' },
	{ command: 'whitelist_group', description: '将当前群组加入白名单 (白名单用户)' },
	{ command: 'unwhitelist_group', description: '将当前群组从白名单移除 (白名单用户)' },
];
export { botCommands }; //  导出 botCommands 供 index.js 使用

/**
 * 处理 Bot 命令 -  !!!  修正函数定义，添加 defaultModelName 和 taskQueueKv 参数，并调整参数顺序 !!!
 * @param {object} message Telegram message 对象
 * @param {object} env Cloudflare Worker environment
 * @param {string} botName 机器人名称
 * @param {function} sendTelegramMessage  发送 Telegram 消息的函数 (从 index.js 传入)
 * @param {string} defaultModelName  默认模型名称 (从 index.js 传入)  !!!  添加 defaultModelName 参数 !!!
 * @param {function} deleteTelegramMessage  删除 Telegram 消息的函数 (从 index.js 传入)
 * @param {KVNamespace} taskQueueKv  任务队列 KV 命名空间  !!!  taskQueueKv 参数放在最后 !!!
 * @returns {Promise<Response>}
 */
export async function handleBotCommand(message, env, botName, sendTelegramMessage, defaultModelName, deleteTelegramMessage, taskQueueKv) {
	//  !!!  修正后的函数定义 !!!
	console.log('进入命令处理器 handleBotCommand');

	const botCommandPrefix = '/'; //  定义命令前缀
	const messageText = message.text || message.caption || ''; // 获取消息文本
	const botNameMention = `@${botName}`; //  完整的 @botName 提及
	const botNameMentionLowerCase = botNameMention.toLowerCase(); //  !!!  添加小写 botNameMention 用于忽略大小写匹配 !!!

	let command = '';
	let isBotCommand = false; //  标记是否为 Bot 命令

	if (message.entities) {
		//  优先使用 entities 检测
		for (const entity of message.entities) {
			if (entity.type === 'bot_command') {
				const commandText = messageText.substring(entity.offset, entity.offset + entity.length);
				const normalizedCommandText = commandText.toLowerCase(); //  !!!  将 entity 中的 commandText 也转换为小写进行匹配 !!!
				if (normalizedCommandText.startsWith(botCommandPrefix) && normalizedCommandText.includes(botNameMentionLowerCase)) {
					//  !!!  检查命令是否以 / 开头 并且 包含 @botname (忽略大小写) !!!
					command = commandText.replace(botNameMention, '').substring(botCommandPrefix.length).trim().toLowerCase(); //  提取命令，移除 @botName, 去除前缀 '/', 转小写
					isBotCommand = true;
					break; //  找到第一个 bot_command entity 即可，跳出循环
				} else {
					console.log(`handleBotCommand: 检测到 bot_command entity, 但不是针对本 Bot (${botNameMention}), 忽略: ${commandText}`); //  更详细的日志
				}
			}
		}
	}

	console.log(`handleBotCommand: 解析出的命令: ${command}`);

	const botConfigKv = env.BOT_CONFIG;
	const userWhitelistKey = env.USER_WHITELIST_KV_KEY;
	const userId = message.from.id;
	const groupId = message.chat.id;
	const chatType = message.chat.type; //  !!!  获取 chat type

	if (chatType === 'private') {
		//  !!!  私聊消息中，忽略所有命令 !!!
		console.log('handleBotCommand: 私聊消息中检测到命令，忽略处理');
		return new Response('OK'); //  私聊消息中，忽略所有命令
	}

	let replyText = '🤖️ 未知命令'; // 默认回复
	let isWhitelistedUserForCommand = false; //  !!!  添加变量，标记用户是否有权限执行命令

	//  !!!  /search 命令的特殊权限处理  !!!
	if (command === 'search') {
		const groupWhitelistKey = env.GROUP_WHITELIST_KV_KEY;
		const groupWhitelist = (await getJsonFromKv(botConfigKv, groupWhitelistKey)) || [];
		if (groupWhitelist.includes(groupId)) {
			console.log(`群组 ${groupId} 在白名单中，允许群组内所有用户使用 /search 命令`);
			isWhitelistedUserForCommand = true; //  白名单群组内的所有用户都可以使用 /search 命令
		} else {
			console.log(`群组 ${groupId} 不在白名单中，/search 命令仅限白名单用户使用`);
			isWhitelistedUserForCommand = await isUserWhitelisted(botConfigKv, userWhitelistKey, userId); //  非白名单群组，仍然需要用户在白名单中
		}
	} else if (command === 'clear_user_context') {
		//  !!!  /clear_user_context 命令的特殊权限处理 !!!
		const groupWhitelistKey = env.GROUP_WHITELIST_KV_KEY;
		const groupWhitelist = (await getJsonFromKv(botConfigKv, groupWhitelistKey)) || [];
		if (groupWhitelist.includes(groupId)) {
			console.log(`群组 ${groupId} 在白名单中，允许群组内所有用户使用 /clear_user_context 命令`);
			isWhitelistedUserForCommand = true; //  白名单群组内的所有用户都可以使用 /clear_user_context 命令
		} else {
			console.log(`群组 ${groupId} 不在白名单中，/clear_user_context 命令仅限白名单群组内使用`);
			isWhitelistedUserForCommand = false; //  非白名单群组，拒绝执行 /clear_user_context 命令
		}
	} else {
		//  !!!  其他命令的通用权限检查  !!!
		isWhitelistedUserForCommand = await isUserWhitelisted(botConfigKv, userWhitelistKey, userId); //  其他命令仍然需要用户在白名单中
	}

	//  !!!  检查用户是否有权限执行命令  !!!
	if (!isWhitelistedUserForCommand) {
		console.log(`用户 ${userId} 没有权限使用命令 ${command}`);
		const replyText = '🚫 抱歉，您没有权限使用该命令。';
		await handleCommandReplyAndCleanup(
			env.BOT_TOKEN,
			groupId,
			replyText,
			message.message_id,
			sendTelegramMessage,
			deleteTelegramMessage,
			env,
			message.message_id,
			botName,
		);
		return new Response('OK'); //  拒绝执行命令
	}
	console.log(`用户 ${userId} 拥有命令 ${command} 的执行权限`);

	switch (command) {
		case 'start':
			replyText =
				'👋 <b>您好，我是 Athena 助手！</b>\n\n' + //  更友好的欢迎语，加粗
				'我是一位基于 <b>Gemini API</b> 的群组助手，我的任务是帮助大家配置 <b>Sing-box</b> 并使用 <b>GUI.for.SingBox</b> 应用。\n\n' + // 突出 Gemini API, Sing-box 和 GUI.for.SingBox，加粗
				'在群组中，我主要通过以下几种方式与您互动，解答关于 <b>Sing-box</b> 和 <b>GUI.for.SingBox</b> 的疑问：\n\n' + //  更清晰的引导，突出互动方式
				'🤖 当前使用的 AI 模型：<code>' +
				defaultModelName +
				'</code>\n\n' + //  模型信息，使用 code 格式化模型名称
				'<b>✨ 主要功能：</b>\n\n' + //  功能介绍，加粗标题
				'1. 💡 <b>Sing-box 设置助手</b>：基于强大的 Gemini API，为您解答 Sing-box 配置和使用中的各种疑问。\n' + //  更生动的描述，加粗功能名称
				'2. 💬 <b>多轮对话记忆</b>：支持上下文对话，记住之前的对话内容，提供更连贯的交流体验（仅限直接 <b>@</b> 提问方式）。\n' + //  更清晰的描述，加粗功能名称，并注明上下文对话的适用范围
				'3. 🖼️ <b>图片消息理解</b>：支持文本和图片消息，您可以发送 <b>Sing-box</b> 或 <b>GUI.for.SingBox</b> 截图并 <b>@</b><code>' +
				botName +
				'</code> 提问，我可以尝试理解图片内容并解答。\n' + //  更形象的描述，突出图片功能，加粗 @ 提及和 botName
				'4. 🔎 <b>Google 搜索</b>：使用 <code>/search@' +
				botName +
				' 关键词</code> 命令，我可以调用 Google 搜索功能为您查找更广泛的信息（不记录上下文，每次搜索为全新会话）。\n' + //  突出 Google 搜索功能和命令，使用 code 格式化命令，并注明不记录上下文
				'5. ⏱️ <b>群组冷却机制</b>：为了避免 API 调用过载，群组内有请求频率限制，默认冷却时间为 <b>1.5 分钟</b>。白名单用户不受冷却限制。\n\n' + //  新增冷却功能介绍，加粗冷却时间和功能名称
				'<b>🛠️ 互动方式：</b>\n\n' + //  使用方法，加粗标题，修改为“互动方式”更贴切
				'1. 💬 <b>直接提问</b>：在本群组中，直接 <b>@</b><code>' +
				botName +
				'</code> + 您的 <b>问题</b> 即可提问（支持上下文对话）。\n' + //  更简洁的描述，加粗关键操作，注明支持上下文
				'2. 📸 <b>图片提问</b>：发送 <b>Sing-box</b> 或 <b>GUI.for.SingBox</b> 相关截图，并 <b>@</b><code>' +
				botName +
				'</code> + 您的 <b>问题</b>，我会尝试理解图片内容并回答（支持上下文对话）。\n' + //  更明确的指导，加粗关键词，注明支持上下文
				'3. 🗣️ <b>回复提问</b>：在群组中，回复任何消息并 <b>@</b><code>' +
				botName +
				'</code> + 您的 <b>问题</b>，我会将 <b>被回复消息</b> 的内容作为参考进行解答（<b>不记录上下文</b>，每次回复提问为全新会话）。\n' + //  新增回复提问互动方式，详细解释，加粗关键词，注明不记录上下文
				'4. 🔍 <b>Google 搜索</b>：使用命令 <code>/search@' +
				botName +
				' 关键词</code> 进行 Google 搜索，例如：<code>/search@' +
				botName +
				' 最新 Sing-box 教程</code>（<b>不记录上下文</b>，每次搜索为全新会话）。\n\n' + //  提供更具体的示例，使用 code 格式化命令和示例，注明不记录上下文
				'⏱️ <b>关于冷却：</b>\n\n' + //  新增“关于冷却”小标题
				'   为了保证所有群组的稳定使用，机器人对群组消息请求频率进行了限制，默认冷却时间为 <b>1.5 分钟</b>。\n' + //  解释冷却原因和默认时长，加粗
				'   如果您是白名单用户，则不受冷却限制。\n' + //  说明白名单用户不受限制
				'   Google 搜索功能有独立的冷却时间，为 <b>3 分钟</b>，与普通提问冷却互不影响。\n\n' + //  补充说明 Google 搜索的独立冷却，加粗
				'<b>📮 私聊反馈：</b>\n\n' +
				'   您私聊发送给我的任何消息，都会被自动转发给我的维护人员，您的反馈和建议对我很重要！\n\n' + //  !!!  添加私聊反馈功能描述  !!!
				'🤓 <b>请注意，本助手目前还不具备算命功能哦~</b>\n\n' + //  趣味性提示，使用 sub 标签缩小字体
				'<b>⚠️ 格式规范：</b>为了确保我能正确理解您的指令，请<b>务必使用规范的命令和 @ 格式</b>，例如：<code>/start@' +
				botName +
				'</code>， <code>/search@' +
				botName +
				' 关键词</code>，以及直接 <code>@' +
				botName +
				' 提问内容</code>。 避免在命令或 @ 符号中使用特殊字符或空格。\n\n' + //  !!!  强调规范格式的重要性  !!!
				'⚠️ <b>重要提示：</b>我会尽力保证 Sing-box 配置信息的准确性，但网络环境和软件版本可能会变化，请务必仔细验证信息，并参考官方文档。\n\n' + //  重要提示，加粗标题
				'如有任何疑问或建议，欢迎随时提出！'; //  结尾语
			const startSendResult = await sendTelegramMessage(env.BOT_TOKEN, groupId, replyText, message.message_id, 'HTML'); // 发送回复
			if (startSendResult.ok && startSendResult.message_id) {
				//  !!!  记录 start 命令回复消息  !!!
				await recordBotReplyMessage(env, botName, replyText, groupId); //  调用 recordBotReplyMessage 记录
			}
			return new Response('OK');
		case 'help': //  !!!  help 命令保持不变  !!!
			replyText = '🤖️ 当前可用命令列表：\n\n';
			botCommands.forEach((cmd) => {
				//  遍历 botCommands 数组，动态生成 help 信息
				replyText += `<code>/${cmd.command}@${botName}</code> - ${cmd.description}\n`; //  !!!  添加 (白名单用户) 提示  !!!
			});
			replyText += `\n例如： <code>/search@${botName}  sing-box 的最新版有哪些变化？</code>`;
			const helpSendResult = await sendTelegramMessage(env.BOT_TOKEN, groupId, replyText, message.message_id, 'HTML'); // 发送回复
			if (helpSendResult.ok && helpSendResult.message_id) {
				//  !!!  记录 help 命令回复消息  !!!
				await recordBotReplyMessage(env, botName, replyText, groupId); //  调用 recordBotReplyMessage 记录
			}
			return new Response('OK');
		case 'clear_user_context': //  !!!  新增 clear_user_context 命令处理 !!!
			console.log(`收到清理用户上下文命令，用户 ID: ${userId}, 群组 ID: ${groupId}`);
			const userContextKv = env.CONTEXT;
			await clearUserContextHistory(userContextKv, groupId, userId); //  !!!  调用清理用户上下文函数  !!!
			replyText = '✅ 您的对话上下文已清理。';
			//  !!!  传递 botConfigKv 参数 !!!
			await handleCommandReplyAndCleanup(
				env.BOT_TOKEN,
				groupId,
				replyText,
				message.message_id,
				sendTelegramMessage,
				deleteTelegramMessage,
				env,
				message.message_id,
				botName,
			); //  !!!  传递 env.TASK_QUEUE_KV !!!
			return new Response('OK');
		case 'whitelist_group':
			console.log(`收到添加群组到白名单命令，群组 ID: ${groupId}`);
			const groupWhitelistKey = env.GROUP_WHITELIST_KV_KEY;
			const botConfigKv = env.BOT_CONFIG;
			await addGroupToWhitelist(botConfigKv, groupWhitelistKey, groupId); //  !!!  调用新的添加群组到白名单函数  !!!
			replyText = '✅ 本群组已添加到白名单。';
			//  !!!  新增：同步添加到总结白名单 !!!
			try {
				await addSummaryGroupToWhitelist(env, groupId);
				replyText += '\n\n✅ 本群组已同步添加到每日总结白名单。';
				console.log(`群组 ${groupId} 已同步添加到总结白名单`);
			} catch (summaryError) {
				console.error(`添加群组 ${groupId} 到总结白名单失败:`, summaryError);
				replyText += '\n\n⚠️  添加到每日总结白名单 <b>失败</b>，请稍后手动添加或联系管理员。';
			}
			//  !!!  传递 botConfigKv 参数 !!!
			await handleCommandReplyAndCleanup(
				env.BOT_TOKEN,
				groupId,
				replyText,
				message.message_id,
				sendTelegramMessage,
				deleteTelegramMessage,
				env,
				message.message_id,
				botName,
			); //  !!!  传递 env.TASK_QUEUE_KV !!!
			return new Response('OK');
		case 'unwhitelist_group':
			console.log(`收到移除群组白名单命令，群组 ID: ${groupId}`);
			const groupWhitelistKeyForRemove = env.GROUP_WHITELIST_KV_KEY; //  !!!  为了避免混淆，使用不同的变量名  !!!
			const botConfigKvForRemove = env.BOT_CONFIG; //  !!!  为了避免混淆，使用不同的变量名  !!!
			await removeGroupFromWhitelist(botConfigKvForRemove, groupWhitelistKeyForRemove, groupId); //  !!!  调用新的移除群组白名单函数  !!!
			replyText = '✅ 本群组已从白名单移除。';
			//  !!!  新增：同步从总结白名单移除 !!!
			try {
				await removeSummaryGroupFromWhitelist(env, groupId);
				replyText += '\n\n✅ 本群组已同步从每日总结白名单移除。';
				console.log(`群组 ${groupId} 已同步从总结白名单移除`);
			} catch (summaryError) {
				console.error(`从总结白名单移除群组 ${groupId} 失败:`, summaryError);
				replyText += '\n\n⚠️  从每日总结白名单 <b>移除失败</b>，请稍后手动移除或联系管理员。';
			}
			//  !!!  传递 botConfigKv 参数 !!!
			await handleCommandReplyAndCleanup(
				env.BOT_TOKEN,
				groupId,
				replyText,
				message.message_id,
				sendTelegramMessage,
				deleteTelegramMessage,
				env,
				message.message_id,
				botName,
			); //  !!!  传递 env.TASK_QUEUE_KV !!!
			return new Response('OK');
		case 'search': //  !!!  search 命令的处理 !!!
			// replyText = `😅 <b>抱歉！搜索功能正在维护中...</b>` ;
			// await handleCommandReplyAndCleanup(env.BOT_TOKEN, groupId, replyText, message.message_id, sendTelegramMessage, deleteTelegramMessage, env, message.message_id, botName);
			// return new Response('OK');
			console.log('handleBotCommand: 检测到 /search 命令，调用 handleSearchCommand 处理');
			//  !!!  /search 命令的冷却检查和处理，全部移动到 handleSearchCommand 函数中 !!!
			return handleSearchCommand(message, env, botName, sendTelegramMessage, defaultModelName, deleteTelegramMessage, taskQueueKv); //  !!!  直接调用 handleSearchCommand，不再进行任何冷却检查 !!!
		default:
			console.log(`handleBotCommand: 未知命令: ${command}`);
			replyText = `🤖️ 未知命令：${command}。\n\n可以使用 /help@${botName} 查看可用命令。`; //  !!!  修改为提示使用 /help 命令  !!!
			//  !!!  传递 botConfigKv 参数 !!!
			try {
				await handleCommandReplyAndCleanup(
					env.BOT_TOKEN,
					groupId,
					replyText,
					message.message_id,
					sendTelegramMessage,
					deleteTelegramMessage,
					env,
					message.message_id,
					botName,
				); //  !!!  传递 env.TASK_QUEUE_KV !!!
			} catch (error) {
				console.error('handleCommandReplyAndCleanup 执行失败:', error);
				//  !!! 调用 sendErrorNotification 发送错误通知 !!!
				await sendErrorNotification(
					env,
					error,
					'command-handler.js - handleBotCommand 函数 - default case - handleCommandReplyAndCleanup 执行失败',
					sendTelegramMessage,
				);
			}
			return new Response('OK');
	}
}

/**
 * 处理命令回复并清理消息 (通用函数) -  修改为使用 KV 轮询实现延迟删除
 * @param {string} botToken Telegram Bot Token
 * @param {number} chatId  Chat ID
 * @param {string} replyText  回复文本
 * @param {number} commandMessageId  命令消息 ID
 * @param {function} sendTelegramMessage  发送 Telegram 消息的函数
 * @param {function} deleteTelegramMessage  删除 Telegram 消息的函数
 * @param {KVNamespace} botConfigKv  BOT_CONFIG KV 命名空间
 * @param {number} replyToMessageId  回复消息 ID (可选)
 * @returns {Promise<void>}
 */
export async function handleCommandReplyAndCleanup(
	botToken,
	chatId,
	replyText,
	commandMessageId,
	sendTelegramMessage,
	deleteTelegramMessage,
	env,
	replyToMessageId = null,
	botName,
) {
	//  !!!  新增 taskQueueKv 参数 !!!
	console.log('开始处理命令回复和清理消息 (KV 轮询延迟)...');
	const sendResult = await sendTelegramMessage(botToken, chatId, replyText, replyToMessageId, 'HTML'); //  发送回复消息
	if (sendResult.ok && sendResult.message_id) {
		const botReplyMessageId = sendResult.message_id; //  获取机器人回复消息 ID
		console.log(`机器人回复消息 ID: ${botReplyMessageId}`);

		await recordBotReplyMessage(env, botName, replyText, chatId); //  调用 recordBotReplyMessage 记录
		console.log('已记录命令回复消息');

		const deletionReadyTimestamp = Date.now() + 3000; //  3 秒后的时间戳
		const deletionSignalKey = `delete_message:${chatId}:${commandMessageId}:${botReplyMessageId}`; //  唯一的 KV 键
		const taskQueueKv = env.TASK_QUEUE_KV; //  !!!  从 env 中获取 taskQueueKv !!!
		await putJsonToKv(taskQueueKv, deletionSignalKey, {
			chatId: chatId,
			commandMessageId: commandMessageId,
			botReplyMessageId: botReplyMessageId,
			deletionReadyTimestamp: deletionReadyTimestamp,
		});
		console.log(`已存储消息删除指令到 KV，key: ${deletionSignalKey}, 删除就绪时间戳: ${deletionReadyTimestamp}`);

		//  !!!  使用 KV 轮询实现延迟删除  !!!
		console.log('开始 KV 轮询检测删除就绪时间...');
		const delayCheckInterval = 1000; //  轮询间隔 500 毫秒
		let deletionTriggered = false; //  标记是否已触发删除，避免重复删除

		while (true) {
			//  无限循环，直到删除操作完成
			const now = Date.now();
			const storedDeletionSignal = await getJsonFromKv(taskQueueKv, deletionSignalKey); //  每次循环都从 KV 读取最新的删除指令
			if (storedDeletionSignal && now >= storedDeletionSignal.deletionReadyTimestamp && !deletionTriggered) {
				//  检查时间是否到达，并且尚未触发删除
				console.log(`删除就绪时间已到，开始删除消息... (当前时间: ${now}, 删除就绪时间: ${storedDeletionSignal.deletionReadyTimestamp})`);

				await deleteTelegramMessage(botToken, chatId, storedDeletionSignal.commandMessageId); //  删除用户命令消息
				await deleteTelegramMessage(botToken, chatId, storedDeletionSignal.botReplyMessageId); //  删除机器人回复消息
				await taskQueueKv.delete(deletionSignalKey); //  删除 KV 中的删除指令
				console.log(
					`用户命令消息 (ID: ${storedDeletionSignal.commandMessageId}) 和机器人回复消息 (ID: ${storedDeletionSignal.botReplyMessageId}) 删除完成`,
				);
				deletionTriggered = true; //  标记为已触发删除
				break; //  跳出循环，完成删除操作
			} else {
				//  时间未到，或删除指令不存在，则等待一段时间后再次检查
				//  如果删除指令已被其他请求处理 (例如，由于网络延迟导致重复请求)，则 storedDeletionSignal 可能为 null，此时也应该跳出循环，避免无限循环
				if (!storedDeletionSignal) {
					console.log('KV 中删除指令已不存在，跳出轮询');
					break; //  跳出循环
				}
				// console.log(`删除就绪时间未到，等待 ${delayCheckInterval} 毫秒后再次检查... (当前时间: ${now}, 删除就绪时间: ${storedDeletionSignal.deletionReadyTimestamp})`); //  减少日志输出
				await new Promise((resolve) => setTimeout(resolve, delayCheckInterval)); //  等待一段时间
			}
		} //  while 循环 结束

		console.log('KV 轮询延迟删除处理完成');
	} else {
		console.error('发送命令回复消息失败，无法进行消息清理 (KV 轮询延迟)'); //  如果回复消息发送失败，则无法进行消息清理
	}
}
