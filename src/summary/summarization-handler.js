// src/summary/summarization-handler.js

import { getJsonFromKv, putJsonToKv } from '../utils/utils';
import { isGroupInSummaryWhitelist } from './summary-config';

/**
 * 记录群组消息到 KV 存储 (只记录白名单群组且包含文本内容的消息, 增加回复和转发信息记录)
 * @param {object} env Cloudflare Worker environment
 * @param {object} message Telegram message 对象
 */
export async function recordGroupMessage(env, message) {
	try {
		const groupId = message.chat.id;
		const chatType = message.chat.type;
		if (chatType === 'private') {
			return; // 私聊消息不记录
		}

		if (!(await isGroupInSummaryWhitelist(env, groupId))) {
			return; // 非总结白名单群组不记录
		}

		let messageText = message.text || message.caption;
		if (!messageText) {
			return; // 无文本内容的消息不记录
		}

		const historyDataKv = env.HISTORY_DATA;
		const historyKey = `history:${groupId}`;
		const currentHistory = (await getJsonFromKv(historyDataKv, historyKey)) || [];

		const userName = `${message.from.first_name || ''} ${message.from.last_name || ''}`.trim();
		const utcDate = new Date(message.date * 1000); // 先创建 UTC 时间的 Date 对象
		const chinaTime = new Date(utcDate.getTime() + 8 * 60 * 60 * 1000); // 转换为 UTC+8 时间
		const timestamp = chinaTime.toISOString(); // 转换为 ISO 格式时间戳

		const messageObject = {
			user: userName,
			timestamp: timestamp,
			message: messageText,
		};

		//  处理回复消息
		if (message.reply_to_message) {
			const replyToUser = `${message.reply_to_message.from.first_name || ''} ${message.reply_to_message.from.last_name || ''}`.trim();
			const replyToText = message.reply_to_message.text || message.reply_to_message.caption || '(无文本内容)'; //  处理被回复消息可能没有文本的情况
			messageObject.reply_to = {
				user: replyToUser || 'Unknown User', //  防止 replyToUser 为空
				message: replyToText.substring(0, 50) + (replyToText.length > 50 ? '...' : ''), //  记录被回复消息的前 50 个字符
			};
		}

		//  处理转发消息
		if (message.forward_from || message.forward_chat) {
			messageObject.forward_from = {};
			if (message.forward_from) {
				const forwardUserName = `${message.forward_from.first_name || ''} ${message.forward_from.last_name || ''}`.trim();
				messageObject.forward_from.user = forwardUserName || 'Unknown User';
			} else if (message.forward_chat) {
				messageObject.forward_from.chat = message.forward_chat.title || `Chat ID: ${message.forward_chat.id}`; //  尝试获取频道/群组标题，否则使用 ID
			}
			const forwardedText = message.text || message.caption || '(无文本内容)'; //  处理转发消息可能没有文本的情况
			messageObject.forward_from.message = forwardedText.substring(0, 50) + (forwardedText.length > 50 ? '...' : ''); // 记录转发消息的前 50 个字符
		}

		currentHistory.push(messageObject);
		await putJsonToKv(historyDataKv, historyKey, currentHistory);

		let logMessage = `群组 ${groupId} 记录消息: ${messageText.substring(0, 20)}... 来自: ${userName}`;
		if (messageObject.reply_to) {
			logMessage += `，回复: ${messageObject.reply_to.user} - "${messageObject.reply_to.message}"`;
		}
		if (messageObject.forward_from) {
			const forwardSource = messageObject.forward_from.user || messageObject.forward_from.chat;
			const forwardContent = messageObject.forward_from.message;
			logMessage += `，转发自: ${forwardSource} - "${forwardContent}"`;
		}
		console.log(logMessage);
	} catch (error) {
		console.error('记录群组消息失败:', error);
	}
}

/**
 * 获取群组历史记录
 * @param {object} env Cloudflare Worker environment
 * @param {number} groupId 群组 ID
 * @returns {Promise<Array<object>|null>} 群组历史记录 (JSON 数组)，失败或无记录时返回 null
 */
export async function getGroupHistory(env, groupId) {
	try {
		const historyDataKv = env.HISTORY_DATA;
		const historyKey = `history:${groupId}`;
		const groupHistory = await getJsonFromKv(historyDataKv, historyKey);
		if (Array.isArray(groupHistory)) {
			return groupHistory;
		} else {
			console.warn(`群组 ${groupId} 历史记录数据格式不正确或为空`);
			return null;
		}
	} catch (error) {
		console.error(`获取群组 ${groupId} 历史记录失败:`, error);
		return null;
	}
}

/**
 * 清理群组历史记录
 * @param {object} env Cloudflare Worker environment
 * @param {number} groupId 群组 ID
 * @returns {Promise<void>}
 */
export async function clearGroupHistory(env, groupId) {
	try {
		const historyDataKv = env.HISTORY_DATA;
		const historyKey = `history:${groupId}`;
		await putJsonToKv(historyDataKv, historyKey, []); // 存储空数组，清空历史记录
		console.log(`群组 ${groupId} 历史记录已清理`);
	} catch (error) {
		console.error(`清理群组 ${groupId} 历史记录失败:`, error);
	}
}

//  processGeminiSummaryResponse 函数 (目前只需要返回 Gemini 文本内容，无需特殊处理)
export async function processGeminiSummaryResponse(geminiResponse) {
	if (
		geminiResponse &&
		geminiResponse.choices &&
		geminiResponse.choices[0] &&
		geminiResponse.choices[0].message &&
		geminiResponse.choices[0].message.content
	) {
		return geminiResponse.choices[0].message.content.trim();
	} else {
		return null;
	}
}
