// src/summary/daily-summary-task.js

import { getJsonFromKv, putJsonToKv, sendErrorNotification } from '../utils/utils';
// import { initGeminiAPI, getGeminiChatCompletion } from '../gemini'; // 移除 Gemini API 模块的导入
import { formatGeminiReply } from '../utils/formatter'; // 确保导入 formatGeminiReply
import { getGeminiChatCompletion } from '../api/gemini-api';

/**
 * 启动每日群组消息记录
 * @param {object} env Cloudflare Worker environment
 * @param {function} sendTelegramMessage 发送 Telegram 消息的函数
 */
export async function startDailyRecord(env, sendTelegramMessage) {
	console.log('每日群组消息记录任务开始...');
	try {
		const summaryConfigKv = env.SUMMARY_CONFIG;
		const historyDataKv = env.HISTORY_DATA;
		const summaryGroupWhitelistKey = env.SUMMARY_GROUP_WHITELIST_KV_KEY;

		const summaryGroupWhitelist = (await getJsonFromKv(summaryConfigKv, summaryGroupWhitelistKey)) || [];
		console.log('总结白名单群组列表:', summaryGroupWhitelist);

		for (const groupId of summaryGroupWhitelist) {
			const historyKey = `history:${groupId}`;
			const existingHistory = await getJsonFromKv(historyDataKv, historyKey);
			if (!existingHistory) {
				await putJsonToKv(historyDataKv, historyKey, []); // 初始化为空数组
				console.log(`群组 ${groupId} 历史记录已初始化`);
			} else {
				console.log(`群组 ${groupId} 历史记录已存在，跳过初始化`);
			}
		}

		await sendSummaryNotification(env, sendTelegramMessage, '每日群聊历史记录已启动');
		console.log('每日群组消息记录任务完成');
	} catch (error) {
		console.error('启动每日群组消息记录任务失败:', error);
		await sendSummaryNotification(env, sendTelegramMessage, `启动每日群聊历史记录任务失败: ${error.message}`);
	}
}

/**
 * 停止每日群组消息记录并进行总结
 * @param {object} env Cloudflare Worker environment
 * @param {function} sendTelegramMessage 发送 Telegram 消息的函数
 */
export async function stopDailyRecordAndSummarize(env, sendTelegramMessage) {
	console.log('停止每日群组消息记录并总结任务开始...');
	try {
		const summaryConfigKv = env.SUMMARY_CONFIG;
		const historyDataKv = env.HISTORY_DATA;
		const summaryGroupWhitelistKey = env.SUMMARY_GROUP_WHITELIST_KV_KEY;

		const summaryGroupWhitelist = (await getJsonFromKv(summaryConfigKv, summaryGroupWhitelistKey)) || [];
		console.log('总结白名单群组列表:', summaryGroupWhitelist);

		for (const groupId of summaryGroupWhitelist) {
			const historyKey = `history:${groupId}`;
			const groupHistory = await getJsonFromKv(historyDataKv, historyKey);

			if (groupHistory && Array.isArray(groupHistory) && groupHistory.length > 0) {
				console.log(`群组 ${groupId} 开始总结，历史记录条数: ${groupHistory.length}`);

				// 发送给 Gemini API 进行总结
				const geminiSummary = await sendSummaryToGemini(env, groupHistory, sendTelegramMessage);
				if (geminiSummary) {
					if (geminiSummary.length > 4000) {
						//  !!!  处理超长回复  !!!
						const chunks = geminiSummary.match(/[\s\S]{1,4000}/g) || []; //  分割成 4000 字符的块
						for (const chunk of chunks) {
							await sendTelegramMessage(env.BOT_TOKEN, groupId, chunk, null, 'HTML');
						}
					} else {
						await sendTelegramMessage(env.BOT_TOKEN, groupId, geminiSummary, null, 'HTML');
					}

					console.log(`群组 ${groupId} 总结发送成功`);
				} else {
					console.warn(`群组 ${groupId} 总结内容为空或获取失败`);
					await sendTelegramMessage(env.BOT_TOKEN, groupId, `🤖️ 今日群组消息总结失败，请稍后重试`, null, 'HTML');
				}

				// 清理群组历史记录
				await putJsonToKv(historyDataKv, historyKey, []); // 清空历史记录
				console.log(`群组 ${groupId} 历史记录已清理`);
			} else {
				console.log(`群组 ${groupId} 没有历史记录或历史记录为空，跳过总结`);
				await sendTelegramMessage(env.BOT_TOKEN, groupId, `😴 今日群组消息不多，没有太多内容可以总结呢~`, null, 'HTML');
			}
		}

		await sendSummaryNotification(env, sendTelegramMessage, '每日群聊历史记录总结任务完成');
		console.log('停止每日群组消息记录并总结任务完成');
	} catch (error) {
		console.error('停止每日群组消息记录并总结任务失败:', error);
		await sendSummaryNotification(env, sendTelegramMessage, `停止每日群聊历史记录并总结任务失败: ${error.message}`);
	}
}

/**
 * 发送总结任务通知给维护人员
 * @param {object} env Cloudflare Worker environment
 * @param {function} sendTelegramMessage 发送 Telegram 消息的函数
 * @param {string} message 通知消息内容
 */
async function sendSummaryNotification(env, sendTelegramMessage, message) {
	const maintainerUserIdsString = env.MAINTAINER_USER_IDS || '';
	const maintainerUserIds = maintainerUserIdsString
		.split(',')
		.map((id) => parseInt(id.trim()))
		.filter((id) => !isNaN(id));

	if (maintainerUserIds.length > 0) {
		for (const maintainerId of maintainerUserIds) {
			try {
				await sendTelegramMessage(env.BOT_TOKEN, maintainerId, `[群聊总结通知] ${message}`, null, 'HTML');
				console.log(`已发送总结通知给维护人员 ${maintainerId}: ${message}`);
			} catch (error) {
				console.error(`发送总结通知给维护人员 ${maintainerId} 失败:`, error);
			}
		}
	} else {
		console.warn('未配置维护人员用户 ID，无法发送总结通知');
	}
}

/**
 * 发送群组历史记录到 Gemini API 进行总结
 * @param {object} env Cloudflare Worker environment
 * @param {Array<object>} groupHistory 群组历史记录 (JSON 数组)
 * @returns {Promise<string|null>} Gemini API 返回的总结文本，失败或内容为空时返回 null
 */
async function sendSummaryToGemini(env, groupHistory, sendTelegramMessage) {
	console.log('开始发送群组历史记录到 Gemini API 进行总结...');
	if (!groupHistory || !Array.isArray(groupHistory) || groupHistory.length === 0) {
		console.warn('群组历史记录为空，无法发送到 Gemini API');
		return null;
	}

	const modelName = env.DEFAULT_GEMINI_MODEL_NAME;

	try {
		const systemPromptKv = env.SYSTEM_INIT_CONFIG;
		const systemPromptKey = env.SUMMARY_SYSTEM_PROMPT_KV_KEY;
		let systemPrompt = (await systemPromptKv.get(systemPromptKey)) || 'You are a helpful assistant. Summarize the following chat history.';

		if (typeof groupHistory === 'object') {
			groupHistory = JSON.stringify(groupHistory); //  如果仍然是对象，则先转换为 JSON 字符串
		}

		const geminiMessages = [
			{
				role: 'system',
				content: systemPrompt,
			},
			{
				role: 'user',
				content: groupHistory,
			},
		];

		const geminiReplyText = await getGeminiChatCompletion(env, geminiMessages, modelName);
		return geminiReplyText;
	} catch (error) {
		console.error('调用 Gemini API 进行总结失败:', error);
		await sendErrorNotification(
			env,
			error,
			'src/summary/daily-summary-task.js - sendSummaryToGemini 函数 - 调用 Gemini API 进行总结失败',
			sendTelegramMessage,
		);
	}
	return new Response('OK');
}
