// src/index.js

import { getJsonFromKv, getUserWhitelist, sendErrorNotification, isUserBlacklisted } from './utils/utils';
import { getGeminiChatCompletion } from './api/gemini-api';
import { handleBotCommand, botCommands, handleCommandReplyAndCleanup } from './handlers/command-handler';
import { handleImageMessageForContext } from './handlers/image-handler';
import { getUserContextHistory, updateUserContextHistory } from './storage/context-storage';
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

export default {
	async fetch(request, env) {
		//  !!!  记录 Request 完整信息 (method 和 headers) !!!
		console.log('收到 Webhook 请求:');
		console.log(`  Method: ${request.method}`); //  记录请求方法
		const headers = {};
		request.headers.forEach((value, key) => {
			//  !!!  使用 forEach 迭代 Headers 对象 !!!
			headers[key] = value;
		});
		console.log('  Headers:', headers); //  记录请求头

		//  !!!  Webhook 验证  !!!
		const secretToken = env.TELEGRAM_WEBHOOK_SECRET_TOKEN; //  从环境变量中获取 secret_token
		if (secretToken) {
			//  !!!  仅当配置了 secretToken 时才进行验证 !!!
			const requestSecretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
			if (requestSecretToken !== secretToken) {
				console.warn('Webhook 验证失败：Secret Token 不正确或缺失，忽略请求'); //  警告日志 -  更明确指出忽略请求
				return new Response('Unauthorized'); //  !!!  直接返回 200 OK 并忽略请求 !!!
			} else {
				console.log('Webhook 验证成功：Secret Token 正确，继续处理请求'); //  成功日志 -  更明确
			}
		} else {
			console.warn('TELEGRAM_WEBHOOK_SECRET_TOKEN 未配置，跳过 Webhook 验证 (生产环境强烈建议配置)'); //  警告日志
		}

		// if (request.url.includes("test-start-daily-record")) { //  使用一个特殊的 URL 路径来触发测试
		// 	console.log("手动触发 startDailyRecord 测试...");
		// 	await startDailyRecord(env, sendTelegramMessage);
		// 	return new Response('手动触发 startDailyRecord 测试完成，请查看日志');
		// }

		//  !!!  新增 stopDailyRecordAndSummarize 测试路径  !!!
		// if (request.url.includes("test-stop-daily-summary")) {
		// 	console.log("手动触发 stopDailyRecordAndSummarize 测试...");
		// 	await stopDailyRecordAndSummarize(env, sendTelegramMessage);
		// 	return new Response('手动触发 stopDailyRecordAndSummarize 测试完成，请查看日志');
		// }

		if (request.method === 'POST') {
			try {
				const update = await request.json();
				console.log('收到 Telegram Update:', update);

				if (!update.message) {
					console.log('Update 中不包含消息，忽略');
					return new Response('OK');
				}

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

				const message = update.message;
				const chatType = message.chat.type;
				const userId = message.from.id;
				const chatId = message.chat.id;
				const replyToMessageId = message.message_id;

				const isBlacklisted = await isUserBlacklisted(botConfigKv, userBlacklistKey, userId); //  !!!  检查用户是否在黑名单 !!!

				if (isBlacklisted) {
					console.log(`用户 ${userId} 在黑名单中，拒绝处理`);
					const replyText = '😅抱歉！你无权使用此机器人！'; //  黑名单回复消息
					await sendTelegramMessage(botToken, chatId, replyText, replyToMessageId, 'HTML'); // 发送黑名单回复
					return new Response('OK'); //  直接返回，不再进行任何处理
				}

				if (chatType === 'private') {
					await handlePrivateMessage(
						env,
						botToken,
						message,
						chatId,
						replyToMessageId,
						botCommands,
						setBotCommands,
						setChatMenuButton,
						sendTelegramMessage,
						forwardTelegramMessage,
					);
				}

				if (chatType !== 'private') {
					//  !!!  确保只记录群组消息，排除私聊 !!!
					await recordGroupMessage(env, message); //  !!!  提前到此处调用 recordGroupMessage !!!
				}

				//  !!!  命令检测 (优先级最高，在 @ 提及检测之前) !!!
				let isBotCommand = false;
				if (message.entities) {
					for (const entity of message.entities) {
						if (entity.type === 'bot_command') {
							//	设置 Bot 命令菜单
							await setBotCommands(env.BOT_TOKEN, botCommands, chatId);

							isBotCommand = true;
							break; //  找到 bot_command 即可跳出循环
						}
					}
				}

				if (isBotCommand) {
					console.log('检测到 Bot 命令，交给命令处理器...');
					return handleBotCommand(
						message,
						env,
						env.TELEGRAM_BOT_NAME,
						sendTelegramMessage,
						env.DEFAULT_GEMINI_MODEL_NAME,
						deleteTelegramMessage,
						env.TASK_QUEUE_KV,
					);
				}

				//	群组白名单检测
				const groupWhitelistKey = env.GROUP_WHITELIST_KV_KEY;
				const groupWhitelist = (await getJsonFromKv(botConfigKv, groupWhitelistKey)) || [];
				if (!groupWhitelist.includes(chatId)) {
					console.log(`群组 ${chatId} 不在白名单中，忽略消息处理`);
					return new Response('OK');
				} else {
					console.log(`群组 ${chatId} 在白名单中，继续处理消息`);
				}

				const isInCooldown = await isGroupInCooldown(
					botConfigKv,
					cooldownDuration,
					chatId,
					userId,
					userWhitelistKey,
					sendTelegramMessage,
					replyToMessageId,
					botToken,
				);

				//  !!!  @bot 提问检测 (在命令检测之后)  !!!
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
					console.log('检测到 @ 提及');
					if (!message.document && !message.text && !message.photo) {
						console.log('消息既不是文本也不是图片，忽略');
						const replyText = '😅 抱歉！暂不支持处理非文本文件、音频和视频内容。';
						await sendTelegramMessage(env.BOT_TOKEN, chatId, replyText, message.message_id, 'HTML'); //  回复消息
						return new Response('OK');
					}

					if (isInCooldown) {
						return new Response('OK');
					} else {
						console.log(`群组 ${chatId} 未冷却或用户在白名单中，继续处理提问`);
					}

					if (message.document) {
						console.log(`检测到提问携带文本文件`);
						await handleTextFileMessage(env, botName, botToken, message, chatId, replyToMessageId, sendTelegramMessage);
						return new Response('OK');
					}

					if (message.reply_to_message) {
						//  !!! 回复消息的判断 !!!
						//  !!! 回复提问处理 (不带上下文) !!!
						console.log('检测到回复提问 (不带上下文)');

						await handleReplyToMessageQuestion(
							message,
							env,
							botName,
							sendTelegramMessage,
							recordGroupRequestTimestamp,
							getJsonFromKv,
							getGeminiChatCompletion,
						);
					} else {
						// @bot 提问处理 (流式响应，带上下文)
						console.log(`检测到 @bot 提问 (图片消息: ${!!message.photo}) - (带上下文)`);
						await handleBotMentionQuestion(
							message,
							env,
							botName,
							sendTelegramMessage,
							recordGroupRequestTimestamp,
							getJsonFromKv,
							getUserContextHistory,
							updateUserContextHistory,
							getGeminiChatCompletion,
						);
					}
				}

				if (!isBotCommand && !isBotMention) {
					await handleUniversalMessage(
						env,
						botId,
						botMessageIdsKv,
						message,
						chatId,
						userId,
						isInCooldown,
						botName,
						sendTelegramMessage,
						recordGroupRequestTimestamp,
						getJsonFromKv,
						getUserContextHistory,
						updateUserContextHistory,
						getGeminiChatCompletion,
						handleImageMessageForContext,
						contextKv,
						imageDataKv,
					);
				}
				return new Response('OK');
			} catch (error) {
				console.error('解析 JSON 数据失败:', error);
				await sendErrorNotification(env, error, 'index.js - fetch 函数 - 解析 JSON 数据失败', sendTelegramMessage);
				return new Response('Bad Request', { status: 400 });
			}
		} else {
			return new Response('Method Not Allowed', { status: 405 });
		}
	},
	// scheduled 事件监听器
	async scheduled(event, env) {
		console.log('Cron trigger event:', event); // 打印 event 对象，方便调试

		switch (event.cron) {
			case '59 15 * * *': // UTC 14:00 触发 stopDailyRecordAndSummarize
				console.log('Cron trigger: stopDailyRecordAndSummarize');
				await stopDailyRecordAndSummarize(env, sendTelegramMessage);
				break;
			case '0 16 * * *': // UTC 16:00 触发 startDailyRecord
				console.log('Cron trigger: startDailyRecord');
				await startDailyRecord(env, sendTelegramMessage);
				break;
			default:
				console.log('Unknown cron trigger:', event.cron); // 记录未知的 cron 表达式
				break;
		}
	},
};
