// src/index.js

import { getJsonFromKv, getUserWhitelist, sendErrorNotification, isUserBlacklisted } from './utils/utils';
import { getGeminiChatCompletion } from './api/gemini-api';
import { handleBotCommand, botCommands, handleCommandReplyAndCleanup } from './handlers/command-handler';
import { handleImageMessageForContext } from './handlers/image-handler';
import { getUserContextHistory, updateUserContextHistory, clearGroupContextHistory } from './storage/context-storage';
import { isGroupInCooldown, recordGroupRequestTimestamp, parseDurationToMs } from './utils/cooldown';
import { recordGroupMessage } from './summary/summarization-handler';
import { startDailyRecord, stopDailyRecordAndSummarize } from './summary/daily-summary-task';
import {
	handleReplyToMessageQuestion,
	handleBotMentionQuestion,
	handleUniversalMessage,
	handlePrivateMessage,
} from './handlers/message-handler';
import { setBotCommands, setChatMenuButton, sendTelegramMessage, deleteTelegramMessage, forwardTelegramMessage } from './api/telegram-api';
import { handleTextFileMessage } from './handlers/document-handler';
import { addSummaryGroupToWhitelist } from './summary/summary-config';
import { TimerDO } from './utils/timer_do';

export { TimerDO };

export default {
	async fetch(request, env) {
		console.log('\u6536\u5230 Webhook \u8BF7\u6C42:');
		console.log(`Request method: ${request.method}`);
		const headersObject = Object.fromEntries(request.headers);
		const requestHeaders = JSON.stringify(headersObject, null, 2);
		console.log(`Request headers: ${requestHeaders}`);

		const secretToken = env.TELEGRAM_WEBHOOK_SECRET_TOKEN;
		if (secretToken) {
			const requestSecretToken = headersObject['x-telegram-bot-api-secret-token'];
			if (requestSecretToken !== secretToken) {
				console.warn(
					'Webhook \u9A8C\u8BC1\u5931\u8D25\uFF1ASecret Token \u4E0D\u6B63\u786E\u6216\u7F3A\u5931\uFF0C\u5FFD\u7565\u8BF7\u6C42',
				);
				return new Response('Unauthorized', { status: 444 });
			} else {
				console.log('Webhook \u9A8C\u8BC1\u6210\u529F\uFF1ASecret Token \u6B63\u786E\uFF0C\u7EE7\u7EED\u5904\u7406\u8BF7\u6C42');
			}
		} else {
			console.warn(
				'TELEGRAM_WEBHOOK_SECRET_TOKEN \u672A\u914D\u7F6E\uFF0C\u8DF3\u8FC7 Webhook \u9A8C\u8BC1 (\u751F\u4EA7\u73AF\u5883\u5F3A\u70C8\u5EFA\u8BAE\u914D\u7F6E)',
			);
		}
		if (request.method === 'POST') {
			try {
				const update = await request.json();
				console.log('\u6536\u5230 Telegram Update:', JSON.stringify(update, null, 2));
				if (!update.message) {
					console.log('Update \u4E2D\u4E0D\u5305\u542B\u6D88\u606F\uFF0C\u5FFD\u7565');
					return new Response('OK');
				}
				const modelName = env.GEMINI_MODEL_NAME;
				const botToken = env.BOT_TOKEN;
				const botId = env.BOT_ID;
				const botName = env.TELEGRAM_BOT_NAME;
				const botConfigKv = env.BOT_CONFIG;
				const contextKv = env.CONTEXT;
				const imageDataKv = env.IMAGE_DATA;
				const botMessageIdsKv = env.BOT_MESSAGE_IDS;
				const userWhitelistKey = env.USER_WHITELIST_KV_KEY;
				const cooldownDuration = env.COOLDOWN_DURATION;
				const userBlacklistKey = env.USER_BLACKLIST_KV_KEY;
				const taskQueueKv = env.TASK_QUEUE_KV;
				const systemInitConfigKv = env.SYSTEM_INIT_CONFIG;
				const systemPromptKey = env.SYSTEM_PROMPT_KV_KEY;
				const knowledgeBaseKey = env.KNOWLEDGE_BASE_KV_KEY;
				const message = update?.message;
				const chatType = message?.chat.type;
				const userId = message?.from.id;
				const chatId = message?.chat.id;
				const messageId = message?.message_id;
				const isBlacklisted = await isUserBlacklisted(botConfigKv, userBlacklistKey, userId);

				if (chatType === 'private') {
					return await handlePrivateMessage(env, botToken, message, chatId, messageId, userId);
				}

				let isBotCommand = false;
				if (message.entities || message.caption_entities) {
					const entitiesToCheck2 = message.entities ? message.entities : message.caption_entities ? message.caption_entities : [];
					for (const entity of entitiesToCheck2) {
						if (entity.type === 'bot_command') {
							await setBotCommands(botToken, botCommands, chatId);
							isBotCommand = true;
							break;
						}
					}
				}
				if (isBotCommand) {
					console.log('\u68C0\u6D4B\u5230 Bot \u547D\u4EE4\uFF0C\u4EA4\u7ED9\u547D\u4EE4\u5904\u7406\u5668...');
					return await handleBotCommand(
						env,
						message,
						userId,
						chatId,
						messageId,
						botToken,
						botName,
						modelName,
						contextKv,
						imageDataKv,
						botConfigKv,
						cooldownDuration,
						isGroupInCooldown,
						userWhitelistKey,
						userBlacklistKey,
						sendTelegramMessage,
						deleteTelegramMessage,
						recordGroupRequestTimestamp,
						taskQueueKv,
					);
				}
				const groupWhitelistKey = env.GROUP_WHITELIST_KV_KEY;
				const groupWhitelist = (await getJsonFromKv(botConfigKv, groupWhitelistKey)) || [];
				if (!groupWhitelist.includes(chatId)) {
					console.log(`\u7FA4\u7EC4 ${chatId} \u4E0D\u5728\u767D\u540D\u5355\u4E2D\uFF0C\u5FFD\u7565\u6D88\u606F\u5904\u7406`);
					return new Response('OK');
				} else {
					console.log(`\u7FA4\u7EC4 ${chatId} \u5728\u767D\u540D\u5355\u4E2D\uFF0C\u7EE7\u7EED\u5904\u7406\u6D88\u606F`);
				}
				let isBotMention = false;
				const textToCheck = message.text || message.caption;
				const entitiesToCheck = message.entities || message.caption_entities;
				if (textToCheck && entitiesToCheck) {
					for (const entity of entitiesToCheck) {
						if (entity.type === 'mention') {
							if (textToCheck.substring(entity.offset, entity.offset + entity.length).toLowerCase() === `@${botName.toLowerCase()}`) {
								isBotMention = true;
								break;
							}
						}
					}
				}
				if (isBotMention) {
					console.log('\u68C0\u6D4B\u5230 @ \u63D0\u53CA');
					if (isBlacklisted) {
						console.log(`\u7528\u6237 ${userId} \u5728\u9ED1\u540D\u5355\u4E2D\uFF0C\u62D2\u7EDD\u5904\u7406`);
						const replyText = '\u{1F605}\u62B1\u6B49\uFF01\u4F60\u65E0\u6743\u4F7F\u7528\u6B64\u673A\u5668\u4EBA\uFF01';
						await sendTelegramMessage(botToken, chatId, replyText, messageId, 'HTML');
						return new Response('OK');
					}
					if (!message.document && !message.text && !message.photo) {
						console.log('\u6D88\u606F\u65E2\u4E0D\u662F\u6587\u672C\u4E5F\u4E0D\u662F\u56FE\u7247\uFF0C\u5FFD\u7565');
						const replyText =
							'\u{1F605} \u62B1\u6B49\uFF01\u6682\u4E0D\u652F\u6301\u5904\u7406\u975E\u6587\u672C\u6587\u4EF6\u3001\u97F3\u9891\u548C\u89C6\u9891\u5185\u5BB9\u3002';
						await sendTelegramMessage(botToken, chatId, replyText, messageId, 'HTML');
						return new Response('OK');
					}
					const isInCooldown = await isGroupInCooldown(
						botConfigKv,
						cooldownDuration,
						chatId,
						userId,
						userWhitelistKey,
						sendTelegramMessage,
						messageId,
						botToken,
					);
					if (isInCooldown) {
						return new Response('OK');
					} else {
						console.log(
							`\u7FA4\u7EC4 ${chatId} \u672A\u51B7\u5374\u6216\u7528\u6237\u5728\u767D\u540D\u5355\u4E2D\uFF0C\u7EE7\u7EED\u5904\u7406\u63D0\u95EE`,
						);
					}
					if (message.document) {
						console.log(`\u68C0\u6D4B\u5230\u63D0\u95EE\u643A\u5E26\u6587\u672C\u6587\u4EF6`);
						return await handleTextFileMessage(
							env,
							botName,
							botToken,
							botConfigKv,
							message,
							chatId,
							messageId,
							sendTelegramMessage,
							recordGroupRequestTimestamp,
						);
					}
					if (message.reply_to_message) {
						console.log('\u68C0\u6D4B\u5230\u56DE\u590D\u63D0\u95EE (\u4E0D\u5E26\u4E0A\u4E0B\u6587)');
						return await handleReplyToMessageQuestion(env, message, botName);
					} else {
						console.log(`\u68C0\u6D4B\u5230 @bot \u63D0\u95EE (\u56FE\u7247\u6D88\u606F: ${!!message.photo}) - (\u5E26\u4E0A\u4E0B\u6587)`);
						return await handleBotMentionQuestion(
							env,
							modelName,
							botConfigKv,
							contextKv,
							imageDataKv,
							botMessageIdsKv,
							systemInitConfigKv,
							systemPromptKey,
							knowledgeBaseKey,
							message,
							chatId,
							userId,
							messageId,
							botToken,
							botName,
						);
					}
				}
				if (!isBotCommand && !isBotMention) {
					return await handleUniversalMessage(
						env,
						modelName,
						botConfigKv,
						contextKv,
						imageDataKv,
						botMessageIdsKv,
						systemInitConfigKv,
						systemPromptKey,
						knowledgeBaseKey,
						userWhitelistKey,
						cooldownDuration,
						message,
						chatId,
						userId,
						messageId,
						botToken,
						botId,
						botName,
					);
				}
				return new Response('OK');
			} catch (error) {
				console.error('\u89E3\u6790 JSON \u6570\u636E\u5931\u8D25:', error);
				await sendErrorNotification(env, error, 'index.js - fetch \u51FD\u6570 - \u89E3\u6790 JSON \u6570\u636E\u5931\u8D25');
				return new Response('Bad Request', { status: 400 });
			}
		} else {
			return new Response('Method Not Allowed', { status: 405 });
		}
	},
	// scheduled 事件监听器
	// async scheduled(event, env, ctx) {
	// 	console.log('Cron trigger event:', event); // 打印 event 对象，方便调试
	// 	try {
	// 		switch (event.cron) {
	// 			// case '59 15 * * *': // UTC 14:00 触发 stopDailyRecordAndSummarize
	// 			// 	// console.log('Cron trigger: stopDailyRecordAndSummarize');
	// 			// 	// await stopDailyRecordAndSummarize(env, sendTelegramMessage);
	// 			// 	break;
	// 			// case '0 16 * * *': // UTC 16:00 触发 startDailyRecord
	// 			// 	// console.log('Cron trigger: startDailyRecord');
	// 			// 	// await startDailyRecord(env, sendTelegramMessage);
	// 			// 	break;
	// 			case '0 14 * * 7':
	// 				await clearGroupContextHistory(env, env.BOT_TOKEN, env.CONTEXT, env.IMAGE_DATA, -1002033703290, null);
	// 				break;
	// 			default:
	// 				console.log('Unknown cron trigger:', event.cron); // 记录未知的 cron 表达式
	// 				break;
	// 		}
	// 		return new Response('OK');
	// 	} catch (error) {
	// 		console.error(`Errot in scheduled task '${event.cron}': ${error}`);
	// 		await sendErrorNotification(env, error, `index.js - scheduled - Errot in scheduled task '${event.cron}'`);
	// 		return new Response('Bad');
	// 	}
	// },
};
