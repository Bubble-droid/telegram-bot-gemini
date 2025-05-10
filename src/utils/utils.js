// src/utils/utils.js

import { escapeHtml, formatGeminiReply } from './formatter';
import { recordGroupMessage } from '../summary/summarization-handler';
import { sendTelegramMessage } from '../api/telegram-api';

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
export async function putJsonToKv(kvNamespace, key, jsonData, expirationTtl = undefined) {
	try {
		await kvNamespace.put(key, JSON.stringify(jsonData), { expirationTtl });
	} catch (error) {
		console.error(`向 KV 写入 JSON 数据失败，key: ${key}, 数据:`, jsonData, '错误:', error);
	}
}

/**
 * 将字符串编码为 Base64
 * * -  !!!  修改:  直接接受 ArrayBuffer  !!!
 * @param {ArrayBuffer} arrayBuffer
 * @returns {string}
 */
export function base64Encode(arrayBuffer) {
	//  !!!  修改:  直接将 ArrayBuffer 转换为 Uint8Array 后，再构建二进制字符串  !!!
	let binary = '';
	const bytes = new Uint8Array(arrayBuffer);
	const len = bytes.byteLength;
	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
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
 * 获取用户黑名单
 * @param {KVNamespace} botConfigKvNamespace
 * @param {string} userBlacklistKey
 * @returns {Promise<Array<number>>}
 */
export async function getUserBlacklist(botConfigKvNamespace, userBlacklistKey) {
	//  !!!  新增 getUserBlacklist 函数  !!!
	return (await getJsonFromKv(botConfigKvNamespace, userBlacklistKey)) || []; // 默认返回空数组
}

/**
 * 向用户黑名单添加用户
 * @param {KVNamespace} botConfigKvNamespace
 * @param {string} userBlacklistKey
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function addUserToBlacklist(botConfigKvNamespace, userBlacklistKey, userId) {
	//  !!!  新增 addUserToBlacklist 函数  !!!
	let blacklist = await getUserBlacklist(botConfigKvNamespace, userBlacklistKey);
	if (!blacklist.includes(userId)) {
		blacklist.push(userId);
		await putJsonToKv(botConfigKvNamespace, userBlacklistKey, blacklist);
		console.log(`用户 ${userId} 已添加到用户黑名单`);
	} else {
		console.log(`用户 ${userId} 已在用户黑名单中，无需重复添加`);
	}
}

/**
 * 从用户黑名单移除用户
 * @param {KVNamespace} botConfigKvNamespace
 * @param {string} userBlacklistKey
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function removeUserFromBlacklist(botConfigKvNamespace, userBlacklistKey, userId) {
	//  !!!  新增 removeUserFromBlacklist 函数  !!!
	let blacklist = await getUserBlacklist(botConfigKvNamespace, userBlacklistKey);
	const index = blacklist.indexOf(userId);
	if (index > -1) {
		blacklist.splice(index, 1);
		await putJsonToKv(botConfigKvNamespace, userBlacklistKey, blacklist);
		console.log(`用户 ${userId} 已从用户黑名单移除`);
	} else {
		console.log(`用户 ${userId} 不在用户黑名单中，无法移除`);
	}
}

/**
 * 检查用户是否在用户黑名单中
 * @param {KVNamespace} botConfigKvNamespace
 * @param {string} userBlacklistKey
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
export async function isUserBlacklisted(botConfigKvNamespace, userBlacklistKey, userId) {
	//  !!!  新增 isUserBlacklisted 函数  !!!
	const blacklist = await getUserBlacklist(botConfigKvNamespace, userBlacklistKey);
	return blacklist.includes(userId);
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
 * 获取当前时间
 */

export async function getCurrentTime() {
	const now = new Date();

	// 获取 UTC+8 时区的时间偏移量（单位：分钟）
	const utc8Offset = 8 * 60;

	// 将当前时间转换为 UTC 时间
	const utcTime = new Date(now.getTime() + now.getTimezoneOffset() * 60000);

	// 将 UTC 时间加上 UTC+8 偏移量
	const utc8Time = new Date(utcTime.getTime() + utc8Offset * 60000);

	// 格式化日期和时间
	const year = utc8Time.getFullYear();
	const month = String(utc8Time.getMonth() + 1).padStart(2, '0');
	const day = String(utc8Time.getDate()).padStart(2, '0');
	const hours = String(utc8Time.getHours()).padStart(2, '0');
	const minutes = String(utc8Time.getMinutes()).padStart(2, '0');
	const seconds = String(utc8Time.getSeconds()).padStart(2, '0');

	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 发送错误通知给维护人员
 * @param {object} env Cloudflare Worker environment
 * @param {Error} error 错误对象
 * @param {string} context  错误发生的上下文描述 (例如函数名)
 * @param {function} sendTelegramMessage 发送 Telegram 消息的函数
 * @returns {Promise<void>}
 */
export async function sendErrorNotification(env, error, context) {
	const maintainerUserIdsString = env.MAINTAINER_USER_IDS || '';
	const maintainerUserIds = maintainerUserIdsString
		.split(',')
		.map((id) => parseInt(id.trim()))
		.filter((id) => !isNaN(id));

	const currentTime = await getCurrentTime();

	if (maintainerUserIds.length > 0) {
		const errorMessage = `
		**[错误告警]**

		发生时间: \`${currentTime}\`

		错误上下文: \`${context}\`

		错误信息: \`${error.message}\`

		堆栈追踪:
		\`\`\`javascript
		${error.stack ? escapeHtml(error.stack) : 'N/A'}
		\`\`\`
		`;

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

/**
 *  删除所有键值对
 */

export async function deleteAllKeys(kvNamespaces, chatId) {
	// 延迟函数，返回一个在 ms 毫秒后 resolve 的 Promise
	function delay(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms)); // :contentReference[oaicite:6]{index=6} :contentReference[oaicite:7]{index=7}
	}

	try {
		if (!Array.isArray(kvNamespaces) || kvNamespaces.length !== 2) {
			throw new Error('Expected exactly 2 KV namespaces: [contextKv, imageDataKv]'); // :contentReference[oaicite:8]{index=8}
		}

		const [contextKv, imageDataKv] = kvNamespaces;

		// 一次性列出所有 context 键
		const { keys: contextKeys = [] } = await contextKv.list(); // :contentReference[oaicite:9]{index=9}
		for (const { name: keyName } of contextKeys) {
			const parts = keyName.split(':');
			if (parts.length < 3 || parts[1] !== String(chatId)) {
				continue; // 不属于当前 chatId 的键直接跳过
			}

			// 获取并解析 JSON 值
			let rawValue;
			try {
				rawValue = await contextKv.get(keyName); // :contentReference[oaicite:10]{index=10}
			} catch (err) {
				console.error(`Error retrieving key ${keyName}:`, err);
				continue;
			}
			if (!rawValue) {
				// 值为空也直接删除 context 键
				try {
					await contextKv.delete(keyName); // :contentReference[oaicite:11]{index=11}
					await delay(1000);
				} catch (err) {
					console.error(`Failed to delete empty context key ${keyName}:`, err);
				}
				continue;
			}

			let messages;
			try {
				messages = JSON.parse(rawValue); // :contentReference[oaicite:12]{index=12}
			} catch (err) {
				console.error(`Invalid JSON in key ${keyName}:`, err);
				// JSON 无效也直接删除 context 键
				try {
					await contextKv.delete(keyName); // :contentReference[oaicite:13]{index=13}
					await delay(1000);
				} catch (e) {
					console.error(`Failed to delete invalid JSON context key ${keyName}:`, e);
				}
				continue;
			}

			// 遍历 message 数组，删除所有关联的 imageDataKv 键
			for (const msg of messages) {
				if (msg.role === 'user' && Array.isArray(msg.content)) {
					for (const item of msg.content) {
						if (item.type === 'image_url' && item.image_url?.url) {
							const imgKey = item.image_url.url;
							try {
								const exists = await imageDataKv.get(imgKey);
								if (exists) {
									await imageDataKv.delete(imgKey); // :contentReference[oaicite:14]{index=14}
									console.log(`Deleted imageDataKv key: ${imgKey}`);
									await delay(1000);
								}
							} catch (err) {
								console.error(`Error deleting imageDataKv key ${imgKey}:`, err);
							}
						}
					}
				}
			}

			// 最终删除 context 键（无论是否找到 image_url）
			try {
				await contextKv.delete(keyName); // :contentReference[oaicite:15]{index=15}
				console.log(`Deleted contextKv key: ${keyName}`);
				await delay(1000);
			} catch (err) {
				console.error(`Error deleting contextKv key ${keyName}:`, err);
			}
		}

		return true;
	} catch (err) {
		console.error('Fatal error in cleanChatRelatedData:', err);
		throw err;
	}
}
