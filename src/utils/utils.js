// src/utils/utils.js

import { escapeHtml } from './formatter';
import { recordGroupMessage } from '../summary/summarization-handler';

/**
 * 从 KV 命名空间获取 JSON 数据
 * @param {KVNamespace} kvNamespace
 * @param {string} key
 * @returns {Promise<any>}
 */
export async function getJsonFromKv(kvNamespace, key) {
	try {
		const value = await kvNamespace.get(key);
		if (value === null) {
			return null; // Key 不存在
		}
		return JSON.parse(value);
	} catch (error) {
		console.error(`从 KV 获取 JSON 数据失败，key: ${key}, 错误:`, error);
		return null; // 解析 JSON 失败或 KV 错误
	}
}

/**
 * 向 KV 命名空间存储 JSON 数据
 * @param {KVNamespace} kvNamespace
 * @param {string} key
 * @param {any} jsonData
 * @returns {Promise<void>}
 */
export async function putJsonToKv(kvNamespace, key, jsonData) {
	try {
		await kvNamespace.put(key, JSON.stringify(jsonData));
	} catch (error) {
		console.error(`向 KV 存储 JSON 数据失败，key: ${key}, 数据:`, jsonData, '错误:', error);
	}
}

/**
 * 将字符串编码为 Base64
 * @param {string} str
 * @returns {string}
 */
export function base64Encode(str) {
	return btoa(str);
}

/**
 * 将 Base64 字符串解码为字符串
 * @param {string} base64Str
 * @returns {string}
 */
export function base64Decode(base64Str) {
	return atob(base64Str);
}

/**
 * 获取用户白名单
 * @param {KVNamespace} botConfigKvNamespace
 * @param {string} userWhitelistKey
 * @returns {Promise<Array<number>>}
 */
export async function getUserWhitelist(botConfigKvNamespace, userWhitelistKey) {
	return (await getJsonFromKv(botConfigKvNamespace, userWhitelistKey)) || []; // 默认返回空数组
}

/**
 * 向用户白名单添加用户
 * @param {KVNamespace} botConfigKvNamespace
 * @param {string} userWhitelistKey
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function addUserToWhitelist(botConfigKvNamespace, userWhitelistKey, userId) {
	let whitelist = await getUserWhitelist(botConfigKvNamespace, userWhitelistKey);
	if (!whitelist.includes(userId)) {
		whitelist.push(userId);
		await putJsonToKv(botConfigKvNamespace, userWhitelistKey, whitelist);
		console.log(`用户 ${userId} 已添加到用户白名单`);
	} else {
		console.log(`用户 ${userId} 已在用户白名单中，无需重复添加`);
	}
}

/**
 * 从用户白名单移除用户
 * @param {KVNamespace} botConfigKvNamespace
 * @param {string} userWhitelistKey
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function removeUserFromWhitelist(botConfigKvNamespace, userWhitelistKey, userId) {
	let whitelist = await getUserWhitelist(botConfigKvNamespace, userWhitelistKey);
	const index = whitelist.indexOf(userId);
	if (index > -1) {
		whitelist.splice(index, 1);
		await putJsonToKv(botConfigKvNamespace, userWhitelistKey, whitelist);
		console.log(`用户 ${userId} 已从用户白名单移除`);
	} else {
		console.log(`用户 ${userId} 不在用户白名单中，无法移除`);
	}
}

/**
 * 检查用户是否在用户白名单中
 * @param {KVNamespace} botConfigKvNamespace
 * @param {string} userWhitelistKey
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
export async function isUserWhitelisted(botConfigKvNamespace, userWhitelistKey, userId) {
	const whitelist = await getUserWhitelist(botConfigKvNamespace, userWhitelistKey);
	return whitelist.includes(userId);
}

/**
 * 向群组白名单添加群组
 * @param {KVNamespace} botConfigKvNamespace
 * @param {string} groupWhitelistKey
 * @param {number} groupId
 * @returns {Promise<void>}
 */
export async function addGroupToWhitelist(botConfigKvNamespace, groupWhitelistKey, groupId) {
	let whitelist = await getGroupWhitelist(botConfigKvNamespace, groupWhitelistKey);
	if (!whitelist.includes(groupId)) {
		whitelist.push(groupId);
		await putJsonToKv(botConfigKvNamespace, groupWhitelistKey, whitelist);
		console.log(`群组 ${groupId} 已添加到群组白名单`);
	} else {
		console.log(`群组 ${groupId} 已在群组白名单中，无需重复添加`);
	}
}

/**
 * 从群组白名单移除群组
 * @param {KVNamespace} botConfigKvNamespace
 * @param {string} groupWhitelistKey
 * @param {number} groupId
 * @returns {Promise<void>}
 */
export async function removeGroupFromWhitelist(botConfigKvNamespace, groupWhitelistKey, groupId) {
	let whitelist = await getGroupWhitelist(botConfigKvNamespace, groupWhitelistKey);
	const index = whitelist.indexOf(groupId);
	if (index > -1) {
		whitelist.splice(index, 1);
		await putJsonToKv(botConfigKvNamespace, groupWhitelistKey, whitelist);
		console.log(`群组 ${groupId} 已从群组白名单移除`);
	} else {
		console.log(`群组 ${groupId} 不在群组白名单中，无法移除`);
	}
}

/**
 * 获取群组白名单 (为了内部复用，虽然 index.js 中已经有相同的代码)
 * @param {KVNamespace} botConfigKvNamespace
 * @param {string} groupWhitelistKey
 * @returns {Promise<Array<number>>}
 */
export async function getGroupWhitelist(botConfigKvNamespace, groupWhitelistKey) {
	return (await getJsonFromKv(botConfigKvNamespace, groupWhitelistKey)) || [];
}

/**
 * 发送错误通知给维护人员
 * @param {object} env Cloudflare Worker environment
 * @param {Error} error 错误对象
 * @param {string} context  错误发生的上下文描述 (例如函数名)
 * @param {function} sendTelegramMessage 发送 Telegram 消息的函数
 * @returns {Promise<void>}
 */
export async function sendErrorNotification(env, error, context, sendTelegramMessage) {
	const maintainerUserIdsString = env.MAINTAINER_USER_IDS || '';
	const maintainerUserIds = maintainerUserIdsString
		.split(',')
		.map((id) => parseInt(id.trim()))
		.filter((id) => !isNaN(id));

	const utcDate = new Date(message.date * 1000); // 先创建 UTC 时间的 Date 对象
	const chinaTime = new Date(utcDate.getTime() + 8 * 60 * 60 * 1000); // 转换为 UTC+8 时间
	const timestamp = chinaTime.toISOString(); // 转换为 ISO 格式时间戳

	if (maintainerUserIds.length > 0) {
		const errorMessage =
			'<b>[错误告警]</b>\n\n' +
			'发生时间: <code>' +
			timestamp +
			'</code>\n\n' +
			'错误上下文: <code>' +
			context +
			'</code>\n\n' +
			'错误信息: <code>' +
			error.message +
			'</code>\n\n' +
			'堆栈追踪: <pre><code class="language-javascript">' +
			(error.stack ? escapeHtml(error.stack) : '<code>N/A</code>') +
			'</code></pre>'; // 包含堆栈追踪信息

		for (const maintainerId of maintainerUserIds) {
			try {
				await sendTelegramMessage(env.BOT_TOKEN, maintainerId, errorMessage, null, 'HTML');
				console.log(`已发送错误通知给维护人员 ${maintainerId}: ${context} - ${error.message}`);
			} catch (notificationError) {
				console.error(`发送错误通知给维护人员 ${maintainerId} 失败:`, notificationError);
				console.error('原始错误:', error); //  同时打印原始错误
			}
		}
	} else {
		console.warn('未配置维护人员用户 ID，无法发送错误通知:', context, '-', error.message);
		console.warn('原始错误:', error); //  同时打印原始错误
	}
}

/**
 * 封装记录机器人回复消息的函数 (避免代码重复)
 * @param {KVNamespace} env  Cloudflare Worker environment
 * @param {string} botName 机器人名称
 * @param {string} replyText 机器人回复文本
 * @param {number} groupId 群组 ID
 * @returns {Promise<void>}
 */
export async function recordBotReplyMessage(env, botName, replyText, groupId) {
	//  !!!  修改为 env 参数 !!!
	const botReplyMessage = {
		chat: { id: groupId, type: 'group' },
		from: {
			id: 0,
			first_name: botName,
			is_bot: true,
		},
		text: replyText,
		date: Math.floor(Date.now() / 1000),
	};
	await recordGroupMessage(env, botReplyMessage); //  !!!  传递 env !!!
}

/**
 * 处理冷却回复并清理消息 (通用函数) -  修改为使用 KV 轮询实现延迟删除
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
export async function handleCooldownReplyAndCleanup(
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
	console.log('开始处理冷却提示和清理消息 (KV 轮询延迟)...');
	const sendResult = await sendTelegramMessage(botToken, chatId, replyText, replyToMessageId, 'HTML'); //  发送回复消息
	if (sendResult.ok && sendResult.message_id) {
		const botReplyMessageId = sendResult.message_id; //  获取机器人回复消息 ID
		console.log(`机器人回复消息 ID: ${botReplyMessageId}`);

		await recordBotReplyMessage(env, botName, replyText, chatId); //  调用 recordBotReplyMessage 记录
		console.log('已记录冷却回复消息');

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
