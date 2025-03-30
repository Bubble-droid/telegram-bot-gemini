// src/index.js

import { getJsonFromKv, getUserWhitelist, sendErrorNotification, isUserBlacklisted } from './utils/utils';
import { getGeminiChatCompletion } from './api/gemini-api';
import { handleBotCommand, botCommands, handleCommandReplyAndCleanup } from './handlers/command-handler';
import { handleImageMessageForContext } from './handlers/image-handler';
import { getUserContextHistory, updateUserContextHistory } from './storage/context-storage';
import { isGroupInCooldown, recordGroupRequestTimestamp, parseDurationToMs } from './utils/cooldown';
import { recordGroupMessage } from './summary/summarization-handler';
import { startDailyRecord, stopDailyRecordAndSummarize } from './summary/daily-summary-task';
import { handleReplyToMessageQuestion, handleBotMentionQuestion } from './handlers/message-handler';
import { setBotCommands, setChatMenuButton, sendTelegramMessage, deleteTelegramMessage, forwardTelegramMessage } from './api/telegram-api';
import { handleJsonFileMessage } from './handlers/document-handler';

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

				const message = update.message;
				const chatType = message.chat.type; //  !!!  获取 chat type
				const userId = message.from.id;
				const groupId = message.chat.id;

				const botName = env.TELEGRAM_BOT_NAME; // 获取机器人名称

				const botConfigKv = env.BOT_CONFIG;
				const userBlacklistKey = env.USER_BLACKLIST_KV_KEY;
				const isBlacklisted = await isUserBlacklisted(botConfigKv, userBlacklistKey, userId); //  !!!  检查用户是否在黑名单 !!!

				if (chatType === 'private') {
					//  !!!  黑名单检测  !!!
					if (isBlacklisted) {
						console.log(`用户 ${userId} 在黑名单中，拒绝处理`);
						const replyText = '😅抱歉！你无权使用此机器人！'; //  黑名单回复消息
						await sendTelegramMessage(env.BOT_TOKEN, groupId, replyText, message.message_id, 'HTML'); // 发送黑名单回复
						return new Response('OK'); //  直接返回，不再进行任何处理
					}

					//  !!!  私聊消息处理 (保持不变)  !!!
					console.log('收到私聊消息');

					//  !!!  命令检测判断 (私聊消息中也进行命令检测，但仅用于忽略，不实际处理命令) !!!
					const botCommandPrefix = '/';
					const messageText = message.text || message.caption || '';
					let isPrivateChatCommand = false;
					let privateChatCommand = '';

					if (message.entities) {
						for (const entity of message.entities) {
							if (entity.type === 'bot_command') {
								//	设置 Bot 命令菜单
								await setBotCommands(env.BOT_TOKEN, botCommands, groupId);
								//	设置 Bot 对话菜单按钮
								await setChatMenuButton(env.BOT_TOKEN, groupId);

								const commandText = messageText.substring(entity.offset, entity.offset + entity.length);
								if (commandText.startsWith(botCommandPrefix)) {
									isPrivateChatCommand = true;
									privateChatCommand = commandText.substring(botCommandPrefix.length).toLowerCase(); //  !!!  提取命令名称  !!!
									break;
								}
							}
						}
					}

					if (isPrivateChatCommand) {
						console.log(`私聊消息为命令: /${privateChatCommand}`); //  更详细的日志

						if (privateChatCommand === 'start') {
							//  !!!  处理私聊 /start 命令  !!!
							const replyText =
								'👋 你好！请注意私聊通道只用于反馈和建议(<b>仅限和 Bot 有关的问题</b>)，<b>无法进行提问！</b>\n\n' +
								'请直接提交你的反馈内容，我会将你的消息转发给 Bot 的维护者。';
							await sendTelegramMessage(env.BOT_TOKEN, groupId, replyText, message.message_id, 'HTML'); //  发送回复
							console.log('已回复私聊 /start 命令');
							return new Response('OK'); //  返回，不再进行后续处理
						} else {
							console.log(`私聊消息为其他命令 (/${privateChatCommand})，忽略处理`); //  日志更明确
							return new Response('OK'); //  如果是其他命令，则忽略，直接返回
						}
					}

					//  !!!  获取维护人员用户 ID 列表  !!!
					const maintainerUserIdsString = env.MAINTAINER_USER_IDS || ''; //  获取环境变量，默认为空字符串
					const maintainerUserIds = maintainerUserIdsString
						.split(',')
						.map((id) => parseInt(id.trim()))
						.filter((id) => !isNaN(id)); //  逗号分隔，转换为数字，过滤无效 ID
					console.log('维护人员用户 ID 列表:', maintainerUserIds);

					if (maintainerUserIds.length > 0) {
						//  !!!  使用 forwardMessage 方法转发消息  !!!
						for (const maintainerId of maintainerUserIds) {
							try {
								await forwardTelegramMessage(env.BOT_TOKEN, maintainerId, message.chat.id, message.message_id); //  !!!  调用 forwardTelegramMessage 函数  !!!
								console.log(`已转发私聊消息 (message_id: ${message.message_id}) 给维护人员 ${maintainerId}`);
							} catch (error) {
								console.error(`转发私聊消息 (message_id: ${message.message_id}) 给维护人员 ${maintainerId} 失败:`, error);
							}
						}
					} else {
						console.log('未配置维护人员用户 ID，不转发私聊消息');
					}

					console.log('私聊消息处理完成 (不回复用户, 使用 forwardMessage)'); //  明确指出不回复用户和使用 forwardMessage
					return new Response('OK'); //  私聊消息不作其他处理，直接返回 OK，不回复用户
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
							await setBotCommands(env.BOT_TOKEN, botCommands, groupId);

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
					); //  !!!  统一由 handleBotCommand 处理所有命令 !!!
				}

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

				//	群组白名单检测
				const groupWhitelistKey = env.GROUP_WHITELIST_KV_KEY;
				const groupWhitelist = (await getJsonFromKv(botConfigKv, groupWhitelistKey)) || [];
				if (!groupWhitelist.includes(groupId)) {
					console.log(`群组 ${groupId} 不在白名单中，忽略消息处理`);
					return new Response('OK');
				}
				console.log(`群组 ${groupId} 在白名单中，继续处理消息`);

				if (isBotMention) {
					//  !!!  黑名单检测  !!!
					if (isBlacklisted) {
						console.log(`用户 ${userId} 在黑名单中，拒绝处理`);
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
						return new Response('OK'); //  直接返回，不再进行任何处理
					}

					console.log('检测到 @bot 提及 (可能为提问)');
					if (!message.document && !message.text && !message.photo) {
						console.log('消息既不是文本也不是图片，忽略');
						const replyText = '😅 抱歉！暂不支持处理非文本文件、音频和视频内容。';
						await sendTelegramMessage(env.BOT_TOKEN, groupId, replyText, message.message_id, 'HTML'); //  回复消息
						return new Response('OK');
					}

					const userWhitelistKey = env.USER_WHITELIST_KV_KEY;
					const userWhitelist = (await getUserWhitelist(botConfigKv, userWhitelistKey)) || [];
					const cooldownDuration = env.COOLDOWN_DURATION;
					const isInCooldown = await isGroupInCooldown(botConfigKv, cooldownDuration, groupId, userId, userWhitelist);
					if (isInCooldown) {
						console.log(`群组 ${groupId} 处于冷却中，忽略 @bot 提问, 发送冷却提示`); //  !!!  添加日志，表明发送冷却提示 !!!
						//  !!!  新增: 冷却中回复消息 !!!
						const lastRequestTimestampKey = `cooldown:${groupId}`; //  获取 lastRequestTimestampKey
						const lastRequestTimestamp = (await getJsonFromKv(botConfigKv, lastRequestTimestampKey)) || 0; // 获取上次请求时间戳
						const cooldownMs = parseDurationToMs(cooldownDuration); //  解析冷却时间为毫秒 (假设 parseDurationToMs 函数已定义)
						const remainingSeconds = Math.ceil((cooldownMs - (Date.now() - lastRequestTimestamp)) / 1000); // 计算剩余秒数
						const replyText = `⏱️ 系统正在冷却中，请等待 ${remainingSeconds} 秒后重试！`; //  构建冷却提示消息

						await sendTelegramMessage(env.BOT_TOKEN, groupId, replyText, message.message_id, 'HTML');
						return new Response('OK');
					}
					console.log(`群组 ${groupId} 未冷却或用户在白名单中，继续处理 @bot 提问`);

					if (message.document) {
						const fileType = message.document.mime_type;
						if (fileType === 'application/json') {
							console.log(`检测到提问携带 JSON 文件`);
							await handleJsonFileMessage(env, message, sendTelegramMessage);
							return new Response('OK');
						} else {
							console.log(`检测到提问携带文件，但不是 JSON 类型`);
							return new Response('OK');
						}
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
							isGroupInCooldown,
							getUserWhitelist,
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
							isGroupInCooldown,
							getUserWhitelist,
							getJsonFromKv,
							getUserContextHistory,
							updateUserContextHistory,
							getGeminiChatCompletion,
						);
					}
				}

				if (!isBotCommand && !isBotMention) {
					// !!!  普通群组消息处理 (非 @bot 提及, 也非命令)  !!!
					//  !!!  黑名单检测  !!!
					if (isBlacklisted) {
						console.log(`用户 ${userId} 在黑名单中，拒绝处理`);
						return new Response('OK'); //  直接返回，不再进行任何处理
					}

					console.log(`普通群组消息 (非 @bot 提及, 也非命令, 图片消息: ${!!message.photo})`);

					const contextKv = env.CONTEXT;
					const botMessageIdsKv = env.BOT_MESSAGE_IDS; //  !!!  获取 BOT_MESSAGE_IDS KV Namespace  !!!

					//  !!!  连续对话检测 !!!
					if (message.reply_to_message && message.reply_to_message.from.id === parseInt(env.BOT_ID)) {
						//  !!!  回复消息 且 回复对象是 Bot !!!
						const botMessageIdKey = `last_bot_message_id:${groupId}:${userId}`;
						const lastBotMessageId = await getJsonFromKv(botMessageIdsKv, botMessageIdKey); //  !!!  从 BOT_MESSAGE_IDS KV 获取  !!!

						if (lastBotMessageId && message.reply_to_message.message_id === lastBotMessageId) {
							//  !!!  检测到连续对话 !!!
							console.log(`检测到用户 ${userId} 在群组 ${groupId} 的连续对话 (回复了 message_id: ${lastBotMessageId})`);
							//  !!!  触发 @ 提问处理流程 (复用现有逻辑) !!!
							await handleBotMentionQuestion(
								message,
								env,
								botName,
								sendTelegramMessage,
								recordGroupRequestTimestamp,
								isGroupInCooldown,
								getUserWhitelist,
								getJsonFromKv,
								getUserContextHistory,
								updateUserContextHistory,
								getGeminiChatCompletion,
							);
						} else {
							console.log(
								`用户 ${userId} 回复了 Bot 消息，但不是连续对话 (lastBotMessageId: ${lastBotMessageId}, reply_message_id: ${message.reply_to_message.message_id})`,
							);
						}
					}

					let messageContent;
					if (message.text) {
						const textWithoutBotName = message.text.replace(new RegExp(`@${botName}`, 'gi'), '').trim(); //  !!!  使用 RegExp 忽略大小写  !!!
						messageContent = { role: 'user', content: textWithoutBotName };
					} else if (message.photo) {
						messageContent = await handleImageMessageForContext(message, env);
					}

					if (messageContent) {
						let processedMessageContent = { ...messageContent };
						if (processedMessageContent.content && Array.isArray(processedMessageContent.content)) {
							processedMessageContent.content = await Promise.all(
								processedMessageContent.content.map(async (contentPart) => {
									if (contentPart.type === 'image_url') {
										const imageKvKey = contentPart.image_url.url;
										const base64Image = await env.IMAGE_DATA.get(imageKvKey);
										if (base64Image) {
											return {
												type: 'image_url',
												image_url: { url: `data:image/jpeg;base64,${base64Image}` },
											};
										} else {
											console.error(`KV 键名 ${imageKvKey} 对应的 Base64 数据未找到`);
											return { type: 'text', text: `(图片数据丢失, key: ${imageKvKey})` };
										}
									}
									return contentPart;
								}),
							);
						}
						await updateUserContextHistory(contextKv, env.IMAGE_DATA, groupId, userId, messageContent);
						console.log(`已更新用户 ${userId} 在群组 ${groupId} 的上下文`);
					} else {
						console.log('非文本或图片消息，不记录上下文');
					}
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
