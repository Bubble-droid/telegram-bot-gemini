// src/handlers/command-handler.js

import {
	addGroupToWhitelist,
	isUserWhitelisted,
	removeGroupFromWhitelist,
	putJsonToKv,
	getJsonFromKv,
	recordBotReplyMessage,
	isUserBlacklisted,
	addUserToBlacklist,
	removeUserFromBlacklist,
} from '../utils/utils';
import { clearUserContextHistory } from '../storage/context-storage';
// import { handleSearchCommand } from './search-handler';
import { addSummaryGroupToWhitelist, removeSummaryGroupFromWhitelist } from '../summary/summary-config';

const botCommands = [
	{ command: 'start', description: '查看机器人介绍和使用方法' },
	{ command: 'help', description: '查看可用命令列表' },
	{ command: 'search', description: '使用 Google 搜索' },
	{ command: 'clear_user_context', description: '清理您在本群组的历史上下文' },
	{ command: 'whitelist_group', description: '将当前群组加入白名单 (白名单用户)' },
	{ command: 'unwhitelist_group', description: '将当前群组从白名单移除 (白名单用户)' },
	{ command: 'ban', description: '将用户加入黑名单 (白名单用户)' },
	{ command: 'uban', description: '将用户从黑名单移除 (白名单用户)' },
];
export { botCommands };

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
					console.log(`检测到 bot 命令：${commandText}, 但不是针对本 Bot, 忽略 `); //  更详细的日志
					return new Response('OK');
				}
			}
		}
	}

	console.log(`handleBotCommand: 解析出的命令: ${command}`);

	const botConfigKv = env.BOT_CONFIG;
	const userWhitelistKey = env.USER_WHITELIST_KV_KEY;
	const userBlacklistKey = env.USER_BLACKLIST_KV_KEY;

	const userId = message.from.id;
	const groupId = message.chat.id;

	//  !!!  黑名单检测 (在命令处理之前)  !!!
	const isBlacklistedUser = await isUserBlacklisted(botConfigKv, userBlacklistKey, userId); //  !!!  检查用户是否在黑名单 !!!
	if (isBlacklistedUser) {
		console.log(`用户 ${userId} 在黑名单中，拒绝执行命令 ${command}`);
		const replyText = '😅抱歉！你无权使用此机器人！'; //  黑名单回复消息
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
		); //  发送黑名单回复并清理消息
		return new Response('OK'); //  直接返回，不再执行命令
	}

	let replyText = '🤖️ 未知命令'; // 默认回复
	let isWhitelistedUserForCommand = false; //  !!!  添加变量，标记用户是否有权限执行命令

	//  !!!  /search 命令的特殊权限处理 (保持不变) !!!
	if (command === 'start' || command === 'help' || command === 'search' || command === 'clear_user_context') {
		const groupWhitelistKey = env.GROUP_WHITELIST_KV_KEY;
		const groupWhitelist = (await getJsonFromKv(botConfigKv, groupWhitelistKey)) || [];
		if (groupWhitelist.includes(groupId)) {
			console.log(`群组 ${groupId} 在白名单中，允许群组内所有用户使用特定命令`);
			isWhitelistedUserForCommand = true; //  白名单群组内的所有用户都可以使用 /search 命令
		} else {
			console.log(`群组 ${groupId} 不在白名单中，特定命令仅限白名单用户使用`);
			isWhitelistedUserForCommand = await isUserWhitelisted(botConfigKv, userWhitelistKey, userId); //  非白名单群组，仍然需要用户在白名单中
		}
	} else {
		//  !!!  其他命令的通用权限检查 (保持不变) !!!
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
				`👋 大家好！我是基于 <b>Gemini API</b> 的群组助手，我的任务是帮助大家配置 <b>Sing-box</b> 和使用 <b>GUI.for.SingBox</b> 应用。\n\n` +
				`🤖️ 模型: <code>${defaultModelName}</code>\n\n` +
				`✨ <b>功能简介</b>：\n\n` +
				`1. 💬 <b>多轮对话</b>：支持上下文对话记忆。\n` +
				`2. 🖼️ <b>图片理解</b>：可理解图片内容。\n` +
				`3. 🗣️ <b>连续对话</b>：冷却后回复我的消息即可继续对话。\n` +
				`4. 📝 <b>引用提问</b>：回复某条消息即可引用。\n` +
				`5. 🔍 <b>Google 搜索</b>：<code>/search@${botName} 关键词</code>\n` +
				`6. 🧹 <b>清理上下文</b>：<code>/clear_user_context@${botName}</code> 清理个人对话记忆。\n` +
				`7. 📅 <b>每日总结</b>：记录群聊消息并每日总结。\n\n` +
				`⏱️ <b>冷却机制</b>：群组提问有频率限制。\n\n` +
				`⚠️ <b>注意</b>：请详细描述问题，我不会算命。\n\n` +
				`📝 <b>格式</b>：使用规范命令和 <code>@</code> 格式。\n\n` +
				`📮 <b>反馈</b>：私聊我直接反馈。(<b>仅限和 Bot 有关的问题</b>)\n`;
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
			replyText = `😅 <b>抱歉！搜索功能正在维护中...</b>`;
			await sendTelegramMessage(env.BOT_TOKEN, groupId, replyText, message.message_id, 'HTML');
			return new Response('OK');
		// console.log('handleBotCommand: 检测到 /search 命令，调用 handleSearchCommand 处理');
		//  !!!  /search 命令的冷却检查和处理，全部移动到 handleSearchCommand 函数中 !!!
		// return handleSearchCommand(message, env, botName, sendTelegramMessage, defaultModelName, deleteTelegramMessage, taskQueueKv); //  !!!  直接调用 handleSearchCommand，不再进行任何冷却检查 !!!
		case 'ban': //  !!!  ban 命令处理  !!!
			return handleBanCommand(message, env, botName, sendTelegramMessage, deleteTelegramMessage); //  !!!  调用 handleBanCommand 函数 !!!
		case 'uban': //  !!!  uban 命令处理  !!!
			return handleUbanCommand(message, env, botName, sendTelegramMessage, deleteTelegramMessage); //  !!!  调用 handleUbanCommand 函数 !!!
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
 * 处理 /ban 命令
 * @param {object} message Telegram message 对象
 * @param {object} env Cloudflare Worker environment
 * @param {string} botName 机器人名称
 * @param {function} sendTelegramMessage  发送 Telegram 消息的函数
 * @param {function} deleteTelegramMessage  删除 Telegram 消息的函数
 * @returns {Promise<Response>}
 */
async function handleBanCommand(message, env, botName, sendTelegramMessage, deleteTelegramMessage) {
	//  !!!  新增 handleBanCommand 函数  !!!
	console.log('处理 /ban 命令');
	const groupId = message.chat.id;
	const botConfigKv = env.BOT_CONFIG;
	const userBlacklistKey = env.USER_BLACKLIST_KV_KEY;
	const commandText = message.text || message.caption || '';
	const args = commandText.split(/\s+/).slice(1); //  !!!  修正为 slice(1) !!!
	const targetUserId = parseInt(args[0]); //  尝试解析 userId 为整数

	if (!targetUserId || isNaN(targetUserId)) {
		const replyText = '🚫 请提供要加入黑名单的 <b>有效用户 ID</b>。\n\n例如：<code>/ban@' + botName + ' 1234567890</code>';
		await sendTelegramMessage(env.BOT_TOKEN, groupId, replyText, message.message_id, 'HTML');
		return new Response('OK');
	}

	await addUserToBlacklist(botConfigKv, userBlacklistKey, targetUserId); //  添加到黑名单
	const replyText = `✅ 用户 <code>${targetUserId}</code> 已加入黑名单。`;
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
	return new Response('OK');
}

/**
 * 处理 /uban 命令
 * @param {object} message Telegram message 对象
 * @param {object} env Cloudflare Worker environment
 * @param {string} botName 机器人名称
 * @param {function} sendTelegramMessage  发送 Telegram 消息的函数
 * @param {function} deleteTelegramMessage  删除 Telegram 消息的函数
 * @returns {Promise<Response>}
 */
async function handleUbanCommand(message, env, botName, sendTelegramMessage, deleteTelegramMessage) {
	//  !!!  新增 handleUbanCommand 函数  !!!
	console.log('处理 /uban 命令');
	const groupId = message.chat.id;
	const botConfigKv = env.BOT_CONFIG;
	const userBlacklistKey = env.USER_BLACKLIST_KV_KEY;
	const commandText = message.text || message.caption || '';
	const args = commandText.split(/\s+/).slice(1); //  !!!  修正为 slice(1) !!!
	const targetUserId = parseInt(args[0]); //  尝试解析 userId 为整数

	if (!targetUserId || isNaN(targetUserId)) {
		const replyText = '🚫 请提供要从黑名单移除的 <b>有效用户 ID</b>。\n\n例如：<code>/uban@' + botName + ' 1234567890</code>';
		await sendTelegramMessage(env.BOT_TOKEN, groupId, replyText, message.message_id, 'HTML');
		return new Response('OK');
	}

	await removeUserFromBlacklist(botConfigKv, userBlacklistKey, targetUserId); //  从黑名单移除
	const replyText = `✅ 用户 <code>${targetUserId}</code> 已从黑名单移除。`;
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
	return new Response('OK');
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
