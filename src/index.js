// src/index.js

import { getJsonFromKv, putJsonToKv, getUserWhitelist, sendErrorNotification, handleCooldownReplyAndCleanup } from './utils';
import { initGeminiAPI, getGeminiChatCompletion } from './gemini';
import { handleBotCommand, botCommands, recordBotReplyMessage } from './handlers/command-handler';
import { handleImageMessageForContext } from './handlers/image-handler';
import { getUserContextHistory, updateUserContextHistory } from './storage/context-storage';
import { isGroupInCooldown, recordGroupRequestTimestamp, parseDurationToMs } from './utils/cooldown';
import { formatGeminiReply, formatGeminiReplyMarkdownV2 } from './utils/formatter';
import { recordGroupMessage } from './summary/summarization-handler';
import { startDailyRecord, stopDailyRecordAndSummarize } from './summary/daily-summary-task';
import { handleBotMentionQuestion } from './handlers/convo-handler';

export default {
	async fetch(request, env, ctx) {
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

		await setBotCommands(env.BOT_TOKEN, botCommands);
		initGeminiAPI(env.GEMINI_API_KEY, env.OPENAI_API_BASE_URL, env.DEFAULT_GEMINI_MODEL_NAME);

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
				const groupId = message.chat.id;

				if (chatType === 'private') {
					//  !!!  私聊消息处理 (保持不变)  !!!
					console.log('收到私聊消息');

					//  !!!  命令检测判断 (私聊消息中也进行命令检测，但仅用于忽略，不实际处理命令) !!!
					const botCommandPrefix = '/';
					const messageText = message.text || message.caption || '';
					let isPrivateChatCommand = false;

					if (message.entities) {
						for (const entity of message.entities) {
							if (entity.type === 'bot_command') {
								if (messageText.substring(entity.offset, entity.offset + entity.length).startsWith(botCommandPrefix)) {
									isPrivateChatCommand = true;
									break;
								}
							}
						}
					}

					if (isPrivateChatCommand) {
						console.log('私聊消息为命令，忽略处理');
						return new Response('OK'); //  如果是命令，则不转发，直接返回
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

				// const groupId = message.chat.id;
				const botName = env.TELEGRAM_BOT_NAME; // 获取机器人名称
				const userId = message.from.id; // 获取用户 ID

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
					console.log(`检测到 @bot 提及 (可能为提问)`);

					if (!message.text && !message.photo) {
						console.log('消息既不是文本也不是图片，忽略');
						const replyText = `😅 抱歉！暂不支持处理文件、音频和视频内容，请直接发送图片或者文本进行提问。`;
						await sendTelegramMessage(env.BOT_TOKEN, groupId, replyText, message.message_id, 'HTML'); //  回复消息
						return new Response('OK');
					}

					if (message.reply_to_message) {
						//  !!! 回复消息的判断 !!!
						//  !!! 回复提问处理 (不带上下文) !!!
						console.log(`检测到回复提问 (不带上下文) - 流式响应处理`);

						const groupId = message.chat.id; //  !!!  获取群组 ID
						const groupWhitelistKey = env.GROUP_WHITELIST_KV_KEY;
						const botConfigKv = env.BOT_CONFIG;
						const groupWhitelist = (await getJsonFromKv(botConfigKv, groupWhitelistKey)) || [];
						if (!groupWhitelist.includes(groupId)) {
							console.log(`群组 ${groupId} 不在白名单中，忽略回复提问`);
							return new Response('OK');
						}
						console.log(`群组 ${groupId} 在白名单中，继续处理回复提问`);

						const userId = message.from.id;
						const userWhitelistKey = env.USER_WHITELIST_KV_KEY;
						const userWhitelist = (await getUserWhitelist(botConfigKv, userWhitelistKey)) || [];
						const cooldownDuration = env.COOLDOWN_DURATION;
						const isInCooldown = await isGroupInCooldown(botConfigKv, cooldownDuration, groupId, userId, userWhitelist);
						if (isInCooldown) {
							console.log(`群组 ${groupId} 处于冷却中，忽略回复提问, 发送冷却提示`); //  !!!  添加日志，表明发送冷却提示 !!!
							//  !!!  新增: 冷却中回复消息 (回复 @提问) !!!
							const lastRequestTimestampKey = `cooldown:${groupId}`; //  获取 lastRequestTimestampKey
							const lastRequestTimestamp = (await getJsonFromKv(botConfigKv, lastRequestTimestampKey)) || 0; // 获取上次请求时间戳
							const cooldownMs = parseDurationToMs(cooldownDuration); //  解析冷却时间为毫秒 (假设 parseDurationToMs 函数已定义)
							const remainingSeconds = Math.ceil((cooldownMs - (Date.now() - lastRequestTimestamp)) / 1000); // 计算剩余秒数
							const replyText = `⏱️ 系统正在冷却中，请等待 ${remainingSeconds} 秒后重试！`; //  构建冷却提示消息

							await handleCooldownReplyAndCleanup(
								env.BOT_TOKEN,
								groupId,
								replyText,
								message.message_id,
								sendTelegramMessage,
								deleteTelegramMessage,
								env,
								message.message_id,
								botName,
							); // 发送冷却提示并清理
							return new Response('OK');
						}
						console.log(`群组 ${groupId} 未冷却或用户在白名单中，继续处理回复提问`);
						return handleReplyToMessageQuestion(
							message,
							env,
							botName,
							sendTelegramMessage,
							editTelegramMessage,
							recordGroupRequestTimestamp,
							isGroupInCooldown,
							getUserWhitelist,
							getJsonFromKv,
							getUserContextHistory,
							updateUserContextHistory,
							getGeminiChatCompletion,
							formatGeminiReply,
							getJsonFromKv,
							putJsonToKv,
						);
					} else {
						// @bot 提问处理 (流式响应，带上下文)
						console.log(`检测到 @bot 提问 (图片消息: ${!!message.photo}) -  流式响应处理 (带上下文)`);

						const groupId = message.chat.id;
						const groupWhitelistKey = env.GROUP_WHITELIST_KV_KEY;
						const botConfigKv = env.BOT_CONFIG;
						const groupWhitelist = (await getJsonFromKv(botConfigKv, groupWhitelistKey)) || [];
						if (!groupWhitelist.includes(groupId)) {
							console.log(`群组 ${groupId} 不在白名单中，忽略 @bot 提问`);
							return new Response('OK');
						}
						console.log(`群组 ${groupId} 在白名单中，继续处理 @bot 提问`);

						const userId = message.from.id;
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

							await handleCooldownReplyAndCleanup(
								env.BOT_TOKEN,
								groupId,
								replyText,
								message.message_id,
								sendTelegramMessage,
								deleteTelegramMessage,
								env,
								message.message_id,
								botName,
							); // 发送冷却提示并清理
							return new Response('OK');
						}
						console.log(`群组 ${groupId} 未冷却或用户在白名单中，继续处理 @bot 提问`);

						let messageContent;

						if (message.text) {
							const textWithoutBotName = message.text.replace(new RegExp(`@${botName}`, 'gi'), '').trim(); //  !!!  使用 RegExp 忽略大小写  !!!
							messageContent = { role: 'user', content: textWithoutBotName };
						} else if (message.photo) {
							messageContent = await handleImageMessageForContext(message, env);
						}

						if (!messageContent) {
							console.warn('messageContent 为空，忽略 @bot 提问');
							return new Response('OK');
						}

						const contextKv = env.CONTEXT;
						const modelName = env.DEFAULT_GEMINI_MODEL_NAME;
						const systemInitConfigKv = env.SYSTEM_INIT_CONFIG;
						const systemPromptKey = env.SYSTEM_PROMPT_KV_KEY;
						const knowledgeBaseKey = env.KNOWLEDGE_BASE_KV_KEY;
						const imageDataKv = env.IMAGE_DATA;
						const botMessageIdsKv = env.BOT_MESSAGE_IDS; //  !!!  获取 BOT_MESSAGE_IDS KV Namespace  !!!
						const contextHistory = await getUserContextHistory(contextKv, groupId, userId);
						// console.log("上下文历史记录 (提问前):", contextHistory);

						const systemPromptData = (await getJsonFromKv(systemInitConfigKv, systemPromptKey)) || {
							systemPrompt: 'You are a helpful assistant.',
						}; //  获取系统提示词
						const knowledgeBaseData = (await getJsonFromKv(systemInitConfigKv, knowledgeBaseKey)) || { knowledgeBase: '' }; //  !!! 获取知识库 !!!

						let systemPromptText = systemPromptData;
						let knowledgeBaseText = knowledgeBaseData;

						if (typeof systemPromptText === 'object') {
							//  !!!  添加判断，确保是对象 !!!
							systemPromptText = JSON.stringify(systemPromptText); //  !!!  将整个 JSON 对象转换为字符串 !!!
						}
						if (typeof knowledgeBaseText === 'object') {
							//  !!!  添加判断，确保是对象 !!!
							knowledgeBaseText = JSON.stringify(knowledgeBaseText); //  !!!  将整个 JSON 对象转换为字符串 !!!
						}

						const combinedSystemPrompt = `${systemPromptText}\n\n${knowledgeBaseText}`; //  !!! 合并提示词和知识库 !!!
						const systemInitMessages = [{ role: 'system', content: combinedSystemPrompt }]; //  !!! 使用合并后的提示词 !!!
						// console.log("系统初始化消息 (普通 @提问, 分离知识库, 合并后):", systemInitMessages);

						let processedMessages = [];
						for (const msg of [...contextHistory, messageContent]) {
							if (msg.content && Array.isArray(msg.content)) {
								const processedContent = await Promise.all(
									msg.content.map(async (contentPart) => {
										if (contentPart.type === 'image_url') {
											const imageKvKey = contentPart.image_url.url;
											const base64Image = await imageDataKv.get(imageKvKey);
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
								processedMessages.push({ role: msg.role, content: processedContent });
							} else {
								processedMessages.push(msg);
							}
						}

						const geminiMessages = [...systemInitMessages, ...processedMessages];
						// console.log("发送给 Gemini API 的消息 (流式):", JSON.stringify(geminiMessages, null, 2)); //  修改日志

						let geminiStream; //  声明 geminiStream 变量
						let telegramMessageId = null; //  声明 telegramMessageId 到外部作用域
						let geminiReplyText = ''; //  !!! 修正：声明 geminiReplyText 到函数作用域 !!!
						let lastEditedText = ''; //  !!! 修正：声明 lastEditedText 到函数作用域 !!!

						try {
							geminiStream = await getGeminiChatCompletion(geminiMessages, modelName);
							// console.log("Gemini API 流式响应:", geminiStream); //  !!!  不要打印 stream 对象，会输出大量信息  !!!

							let accumulatedReplyText = ''; //  用于累积 Gemini API 回复文本
							telegramMessageId = null; //  用于存储第一条 Telegram 消息的 message_id，后续编辑消息

							//  !!!  逐 chunk 处理 Gemini API 流式响应  !!!
							for await (const chunk of geminiStream) {
								const chunkText = chunk.choices[0]?.delta?.content || '';
								if (chunkText) {
									accumulatedReplyText += chunkText;
									const formattedChunkText = formatGeminiReply(chunkText);
									const currentText = formatGeminiReply(accumulatedReplyText); // 获取当前累积的格式化文本
									if (currentText !== lastEditedText) {
										//  !!! 内容差异检测 !!!
										if (!telegramMessageId) {
											const firstResponse = await sendTelegramMessage(
												env.BOT_TOKEN,
												groupId,
												formattedChunkText,
												message.message_id,
												'HTML',
											);
											telegramMessageId = firstResponse?.message_id;
											lastEditedText = formattedChunkText; // 更新 lastEditedText
											console.log('发送第一条流式消息，message_id:', telegramMessageId);
										} else {
											const editResult = await editTelegramMessage(env.BOT_TOKEN, groupId, telegramMessageId, currentText, 'HTML'); //  使用 currentText 编辑
											if (editResult.ok) {
												lastEditedText = currentText; //  !!! 仅在编辑成功时更新 lastEditedText !!!
												console.log('编辑 Telegram 消息成功，message_id:', telegramMessageId);
											} else {
												console.error('编辑 Telegram 消息失败:', editResult);
												console.error('编辑 Telegram 消息失败详情:', editResult);
												if (editResult.error && editResult.error.error_code === 429) {
													console.warn('遇到 429 错误，达到速率限制，请稍后重试');
												}
												const fallbackText =
													formatGeminiReply(chunkText) || '🤖️ Gemini API 接口流式传输过程中编辑消息失败，尝试发送新消息...';
												console.log('降级发送新消息, fallbackText:', fallbackText);
												const sendFallbackResult = await sendTelegramMessage(env.BOT_TOKEN, groupId, fallbackText, null, 'HTML');
												if (!sendFallbackResult.ok) {
													console.error('降级发送新消息也失败:', sendFallbackResult);
												}
											}
										}
									} else {
										console.log('本次 chunk 内容与上次编辑内容相同，跳过编辑操作'); //  添加日志：跳过编辑
									}
									await new Promise((resolve) => setTimeout(resolve, 3000));
								}
							}
							//  !!!  for await 循环 结束 !!!

							await recordBotReplyMessage(env, botName, accumulatedReplyText, groupId); //  调用
							console.log('已记录 @ 提问的回复消息');

							// console.log("Gemini API 流式响应处理完成，完整回复文本 (原始):", accumulatedReplyText); //  打印完整回复 (原始)
							// console.log("Gemini API 流式响应处理完成，完整回复文本 (HTML 格式化后):", formatGeminiReply(accumulatedReplyText));

							//  !!!  存储 Bot 消息 ID  !!!
							if (telegramMessageId) {
								const botMessageIdKey = `last_bot_message_id:${groupId}:${userId}`;
								await putJsonToKv(botMessageIdsKv, botMessageIdKey, telegramMessageId); //  !!!  使用 BOT_MESSAGE_IDS KV  !!!
								console.log(`存储 Bot 消息 ID (message_id: ${telegramMessageId}) 到 KV, key: ${botMessageIdKey}`);
							}

							//  !!!  恢复为两次调用 updateUserContextHistory，分别记录 userMessage 和 botReply  !!!
							await updateUserContextHistory(contextKv, imageDataKv, groupId, userId, messageContent); //  记录用户消息
							const botReplyMessageContent = { role: 'assistant', content: accumulatedReplyText }; //  机器人回复消息内容
							await updateUserContextHistory(contextKv, env.IMAGE_DATA, groupId, userId, botReplyMessageContent); //  记录机器人回复消息
							// console.log("上下文历史记录 (提问后):", await getUserContextHistory(contextKv, groupId, userId));

							await recordGroupRequestTimestamp(botConfigKv, groupId);
						} catch (error) {
							console.error('调用 Gemini API 失败 (流式传输):', error);
							geminiReplyText = '🤖️ Gemini API 接口调用失败，请稍后再试 (流式传输)'; //  修改错误提示信息，提示流式传输
							await sendTelegramMessage(env.BOT_TOKEN, groupId, geminiReplyText, message.message_id, 'HTML'); //  发送错误消息
						}
					} //  !!!  @bot 提问处理 (流式响应)  的  else  代码块 结束 !!!
				}

				if (!isBotCommand && !isBotMention) {
					// !!!  普通群组消息处理 (非 @bot 提及, 也非命令)  !!!
					console.log(`普通群组消息 (非 @bot 提及, 也非命令, 图片消息: ${!!message.photo})`);

					const groupId = message.chat.id;
					const groupWhitelistKey = env.GROUP_WHITELIST_KV_KEY;
					const botConfigKv = env.BOT_CONFIG;
					const groupWhitelist = (await getJsonFromKv(botConfigKv, groupWhitelistKey)) || [];
					if (!groupWhitelist.includes(groupId)) {
						console.log(`群组 ${groupId} 不在白名单中，忽略普通消息`);
						return new Response('OK');
					}
					console.log(`群组 ${groupId} 在白名单中，继续处理普通消息并记录上下文`);

					const contextKv = env.CONTEXT;
					const userId = message.from.id;
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
							return handleBotMentionQuestion(
								message,
								env,
								botName,
								sendTelegramMessage,
								editTelegramMessage,
								recordGroupRequestTimestamp,
								isGroupInCooldown,
								getUserWhitelist,
								getJsonFromKv,
								getUserContextHistory,
								updateUserContextHistory,
								getGeminiChatCompletion,
								formatGeminiReply,
								getJsonFromKv,
								putJsonToKv,
							); //  !!!  直接调用 @ 提问处理函数 !!!
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
						console.log(`非文本或图片消息，不记录上下文`);
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
	//  !!!  正确的 scheduled 事件监听器  !!!
	async scheduled(event, env, ctx) {
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

/**
 * 设置 Bot 命令菜单 (保持不变)
 */
async function setBotCommands(botToken, commands) {
	const apiUrl = `https://api.telegram.org/bot${botToken}/setMyCommands`;
	try {
		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				commands: commands,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			console.error('设置 Bot 命令菜单失败:', error);
		} else {
			console.log('成功设置 Bot 命令菜单');
		}
	} catch (error) {
		console.error('设置 Bot 命令菜单时发生错误:', error);
	}
}

/**
 * 发送 Telegram 消息 (保持不变，但返回 response 对象) -  修改为返回 response 对象，以便获取 message_id
 * @param {string} botToken
 * @param {number} chatId
 * @param {string} text
 * @param {number} replyToMessageId  (optional) 如果需要回复某条消息，则指定 message_id
 * @param {string} parseMode  (optional) 消息解析模式，例如 'HTML'
 * @returns {Promise<Response>}  返回 response 对象
 */
export async function sendTelegramMessage(botToken, chatId, text, replyToMessageId = null, parseMode = null) {
	//  !!!  修改返回值为 Promise<Response>  !!!
	const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
	const payload = {
		chat_id: chatId,
		text: text,
		reply_to_message_id: replyToMessageId,
		parse_mode: parseMode,
	};

	try {
		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const error = await response.json();
			console.error('发送 Telegram 消息失败:', error);
			return { ok: false, error }; //  返回包含错误信息的对象
		} else {
			const result = await response.json(); //  解析 JSON 响应
			console.log('成功发送 Telegram 消息, message_id:', result.result.message_id); //  打印 message_id
			return { ok: true, message_id: result.result.message_id }; //  返回包含 message_id 的对象
		}
	} catch (error) {
		console.error('发送 Telegram 消息时发生错误:', error);
		return { ok: false, error }; //  返回包含错误信息的对象
	}
}

/**
 * 编辑 Telegram 消息 (用于流式响应) -  新增编辑消息函数
 * @param {string} botToken
 * @param {number} chatId
 * @param {number} messageId  要编辑的消息 ID
 * @param {string} text  新的消息文本
 * @param {string} parseMode  消息解析模式，例如 'HTML'
 * @returns {Promise<Response>}  返回 response 对象
 */
export async function editTelegramMessage(botToken, chatId, messageId, text, parseMode) {
	//  !!!  新增 editTelegramMessage 函数  !!!
	const apiUrl = `https://api.telegram.org/bot${botToken}/editMessageText`;
	const payload = {
		chat_id: chatId,
		message_id: messageId,
		text: text,
		parse_mode: parseMode,
	};

	try {
		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const error = await response.json();
			console.error('编辑 Telegram 消息失败:', error);
			return { ok: false, error }; //  返回包含错误信息的对象
		} else {
			console.log('成功编辑 Telegram 消息, message_id:', messageId); //  打印 message_id
			return { ok: true }; //  返回成功对象
		}
	} catch (error) {
		console.error('编辑 Telegram 消息时发生错误:', error);
		return { ok: false, error }; //  返回包含错误信息的对象
	}
}

/**
 * 删除 Telegram 消息 -  新增删除消息函数
 * @param {string} botToken
 * @param {number} chatId
 * @param {number} messageId  要删除的消息 ID
 * @returns {Promise<Response>}  返回 response 对象
 */
export async function deleteTelegramMessage(botToken, chatId, messageId) {
	//  !!!  新增 deleteTelegramMessage 函数  !!!
	const apiUrl = `https://api.telegram.org/bot${botToken}/deleteMessage`;
	const payload = {
		chat_id: chatId,
		message_id: messageId,
	};

	try {
		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const error = await response.json();
			console.error('删除 Telegram 消息失败:', error);
			return { ok: false, error }; //  返回包含错误信息的对象
		} else {
			console.log('成功删除 Telegram 消息, message_id:', messageId); //  打印 message_id
			return { ok: true }; //  返回成功对象
		}
	} catch (error) {
		console.error('删除 Telegram 消息时发生错误:', error);
		return { ok: false, error }; //  返回包含错误信息的对象
	}
}

/**
 * 转发 Telegram 消息 -  新增 forwardTelegramMessage 函数  !!!
 * @param {string} botToken
 * @param {number} chatId  目标 Chat ID (维护人员)
 * @param {number} fromChatId  原始消息来源 Chat ID (用户)
 * @param {number} messageId  要转发的消息 ID
 * @returns {Promise<Response>}  返回 response 对象
 */
async function forwardTelegramMessage(botToken, chatId, fromChatId, messageId) {
	//  !!!  新增 forwardTelegramMessage 函数  !!!
	const apiUrl = `https://api.telegram.org/bot${botToken}/forwardMessage`;
	const payload = {
		chat_id: chatId,
		from_chat_id: fromChatId,
		message_id: messageId,
	};

	try {
		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const error = await response.json();
			console.error('转发 Telegram 消息失败:', error);
			return { ok: false, error }; //  返回包含错误信息的对象
		} else {
			console.log(`成功转发 Telegram 消息 (message_id: ${messageId}) to chat_id: ${chatId}`); //  打印转发成功的日志
			return { ok: true }; //  返回成功对象
		}
	} catch (error) {
		console.error('转发 Telegram 消息时发生错误:', error);
		return { ok: false, error }; //  返回包含错误信息的对象
	}
}

/**
 * 处理回复消息的提问 (不带上下文)
 * @param {object} message Telegram message 对象
 * @param {object} env Cloudflare Worker environment
 * @param {string} botName 机器人名称
 * @param {function} sendTelegramMessage 发送 Telegram 消息的函数
 * @param {function} editTelegramMessage 编辑 Telegram 消息的函数
 * @param {function} recordGroupRequestTimestamp 记录群组请求时间戳函数
 * @param {function} isGroupInCooldown 检查群组冷却函数
 * @param {function} getUserWhitelist 获取用户白名单函数
 * @param {function} getJsonFromKv 从 KV 获取 JSON 数据函数
 * @param {function} getUserContextHistory 获取用户上下文历史函数 (这里实际上不使用，但为了参数统一保留)
 * @param {function} updateUserContextHistory 更新用户上下文历史函数 (这里实际上不使用，但为了参数统一保留)
 * @param {function} getGeminiChatCompletion 调用 Gemini API 函数
 * @param {function} formatGeminiReply 格式化 Gemini 回复函数
 * @param {function} getJsonFromKv KV 读取 JSON 函数 (重复参数，但为了参数统一保留)
 * @param {function} putJsonToKv KV 写入 JSON 函数 (重复参数，但为了参数统一保留)
 * @returns {Promise<Response>}
 */
async function handleReplyToMessageQuestion(
	message,
	env,
	botName,
	sendTelegramMessage,
	editTelegramMessage,
	recordGroupRequestTimestamp,
	isGroupInCooldown,
	getUserWhitelist,
	getJsonFromKv,
	getUserContextHistory,
	updateUserContextHistory,
	getGeminiChatCompletion,
	formatGeminiReply,
	getJsonFromKv_duplicate,
	putJsonToKv_duplicate,
) {
	console.log('开始处理回复消息提问 (不带上下文)...');

	const groupId = message.chat.id;
	const groupWhitelistKey = env.GROUP_WHITELIST_KV_KEY;
	const botConfigKv = env.BOT_CONFIG;
	const groupWhitelist = (await getJsonFromKv(botConfigKv, groupWhitelistKey)) || [];
	if (!groupWhitelist.includes(groupId)) {
		console.log(`群组 ${groupId} 不在白名单中，忽略回复提问`);
		return new Response('OK');
	}
	console.log(`群组 ${groupId} 在白名单中，继续处理回复提问`);

	const userId = message.from.id;
	const userWhitelistKey = env.USER_WHITELIST_KV_KEY;
	const userWhitelist = (await getUserWhitelist(botConfigKv, userWhitelistKey)) || [];
	const cooldownDuration = env.COOLDOWN_DURATION;
	const isInCooldown = await isGroupInCooldown(botConfigKv, cooldownDuration, groupId, userId, userWhitelist);
	if (isInCooldown) {
		console.log(`群组 ${groupId} 处于冷却中，忽略回复提问`);
		return new Response('OK');
	}
	console.log(`群组 ${groupId} 未冷却或用户在白名单中，继续处理回复提问`);

	const systemInitConfigKv = env.SYSTEM_INIT_CONFIG;
	const systemPromptKey = env.SYSTEM_PROMPT_KV_KEY;
	const knowledgeBaseKey = env.KNOWLEDGE_BASE_KV_KEY;

	//  !!!  修改系统初始化消息获取和处理逻辑 (普通 @提问) - 分离知识库 !!!
	const systemPromptData = (await getJsonFromKv(systemInitConfigKv, systemPromptKey)) || { systemPrompt: 'You are a helpful assistant.' }; //  获取系统提示词
	const knowledgeBaseData = (await getJsonFromKv(systemInitConfigKv, knowledgeBaseKey)) || { knowledgeBase: '' }; //  !!! 获取知识库 !!!

	let systemPromptText = systemPromptData;
	let knowledgeBaseText = knowledgeBaseData;

	if (typeof systemPromptText === 'object') {
		//  !!!  添加判断，确保是对象 !!!
		systemPromptText = JSON.stringify(systemPromptText); //  !!!  将整个 JSON 对象转换为字符串 !!!
	}
	if (typeof knowledgeBaseText === 'object') {
		//  !!!  添加判断，确保是对象 !!!
		knowledgeBaseText = JSON.stringify(knowledgeBaseText); //  !!!  将整个 JSON 对象转换为字符串 !!!
	}

	const combinedSystemPrompt = `${systemPromptText}\n\n${knowledgeBaseText}`; //  !!! 合并提示词和知识库 !!!
	const systemInitMessages = [{ role: 'system', content: combinedSystemPrompt }]; //  !!! 使用合并后的提示词 !!!
	// console.log("系统初始化消息 (回复 @提问, 分离知识库, 合并后):", systemInitMessages);

	const imageDataKv = env.IMAGE_DATA;
	const modelName = env.DEFAULT_GEMINI_MODEL_NAME;

	const replyToMessage = message.reply_to_message;
	const replyMessage = message;

	let replyToMessageContent = await extractMessageContentForReply(replyToMessage, env, botName); //  !!!  提取被回复消息内容
	let currentMessageContent = await extractMessageContentForReply(replyMessage, env, botName); //  !!!  提取当前回复消息内容，包含 @bot 的文本/图片

	let geminiMessages = [...systemInitMessages]; //  !!!  仅包含系统初始化消息，不包含上下文 !!!

	if (replyToMessageContent) {
		geminiMessages.push(replyToMessageContent); //  添加被回复消息内容
	}
	if (currentMessageContent) {
		geminiMessages.push(currentMessageContent); //  添加当前回复消息内容
	}

	// console.log("发送给 Gemini API 的消息 (回复提问, 流式):", JSON.stringify(geminiMessages, null, 2));

	let geminiStream;
	let geminiReplyText = '';
	let telegramMessageId = null; //  声明 telegramMessageId 到外部作用域
	let lastEditedText = ''; //  !!! 修正：声明 lastEditedText 到函数作用域 !!!

	try {
		geminiStream = await getGeminiChatCompletion(geminiMessages, modelName);

		let accumulatedReplyText = '';
		telegramMessageId = null;

		for await (const chunk of geminiStream) {
			const chunkText = chunk.choices[0]?.delta?.content || '';
			if (chunkText) {
				accumulatedReplyText += chunkText;
				const formattedChunkText = formatGeminiReply(chunkText);
				const currentText = formatGeminiReply(accumulatedReplyText); // 获取当前累积的格式化文本
				if (currentText !== lastEditedText) {
					//  !!! 内容差异检测 !!!
					if (!telegramMessageId) {
						const firstResponse = await sendTelegramMessage(env.BOT_TOKEN, groupId, formattedChunkText, message.message_id, 'HTML');
						telegramMessageId = firstResponse?.message_id;
						lastEditedText = formattedChunkText; // 更新 lastEditedText
						console.log('发送第一条流式消息，message_id:', telegramMessageId);
					} else {
						const editResult = await editTelegramMessage(env.BOT_TOKEN, groupId, telegramMessageId, currentText, 'HTML'); //  使用 currentText 编辑
						if (editResult.ok) {
							lastEditedText = currentText; //  !!! 仅在编辑成功时更新 lastEditedText !!!
							console.log('编辑 Telegram 消息成功，message_id:', telegramMessageId);
						} else {
							console.error('编辑 Telegram 消息失败:', editResult);
							console.error('编辑 Telegram 消息失败详情:', editResult);
							if (editResult.error && editResult.error.error_code === 429) {
								console.warn('遇到 429 错误，达到速率限制，请稍后重试');
							}
							const fallbackText = formatGeminiReply(chunkText) || '🤖️ Gemini API 接口流式传输过程中编辑消息失败，尝试发送新消息...';
							console.log('降级发送新消息, fallbackText:', fallbackText);
							const sendFallbackResult = await sendTelegramMessage(env.BOT_TOKEN, groupId, fallbackText, null, 'HTML');
							if (!sendFallbackResult.ok) {
								console.error('降级发送新消息也失败:', sendFallbackResult);
							}
						}
					}
				} else {
					console.log('本次 chunk 内容与上次编辑内容相同，跳过编辑操作'); //  添加日志：跳过编辑
				}
				await new Promise((resolve) => setTimeout(resolve, 3000));
			}
		}

		await recordBotReplyMessage(env, botName, accumulatedReplyText, groupId); //  调用
		console.log('已记录回复 @ 提问的回复消息');

		await recordGroupRequestTimestamp(botConfigKv, groupId); //  记录冷却时间
	} catch (error) {
		console.error('调用 Gemini API 失败 (回复提问, 流式):', error);
		geminiReplyText = '🤖️ Gemini API 接口调用失败，请稍后再试 (回复提问, 流式)';
		await sendTelegramMessage(env.BOT_TOKEN, groupId, geminiReplyText, message.message_id, 'HTML');
	}

	return new Response('OK');
}

/**
 * 提取消息内容 (文本和/或图片) 用于回复提问 -  彻底重构函数
 * @param {object} message Telegram message 对象
 * @param {object} env Cloudflare Worker environment
 * @param {string} botName 机器人名称
 * @returns {Promise<object|null>}  messageContent 对象，如果消息不包含文本或图片则返回 null
 */
async function extractMessageContentForReply(message, env, botName) {
	//  !!!  彻底重构  !!!
	if (!message) {
		return null;
	}

	const botNameMention = `@${botName}`;
	let messageContentParts = []; //  用于存储消息内容片段 (text 或 image_url)

	// 处理文本内容 (text 或 caption)
	let text = message.text || message.caption;
	if (text) {
		text = text.replace(new RegExp(`@${botName}`, 'gi'), '').trim(); // 移除 @botName 并 trim，忽略大小写
		if (text) {
			//  只有当文本内容不为空时才添加 text content part
			messageContentParts.push({ type: 'text', text: text });
		}
	}

	// 处理图片内容 (photo)
	if (message.photo) {
		const imageMessageContent = await handleImageMessageForContext(message, env, true); //  !!!  isReply = true  !!!
		if (imageMessageContent && imageMessageContent.content) {
			messageContentParts.push(...imageMessageContent.content.filter((part) => part.type === 'image_url')); //  只添加 image_url content part, 并过滤掉可能的 text
		}
	}

	if (messageContentParts.length === 0) {
		return null; //  如果没有任何内容片段，则返回 null
	} else if (messageContentParts.length === 1 && messageContentParts[0].type === 'text') {
		return { role: 'user', content: messageContentParts[0].text }; //  如果只有一个 text content part, 则 content 为字符串
	} else {
		return { role: 'user', content: messageContentParts }; //  否则 content 为 content part 数组
	}
}
