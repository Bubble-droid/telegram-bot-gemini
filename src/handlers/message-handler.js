// src/handlers/message-handler.js

import { handleImageMessageForContext } from './image-handler';
import { putJsonToKv, recordBotReplyMessage } from '../utils/utils';
import { parseDurationToMs } from '../utils/cooldown';
/**
 * 提取消息内容 (文本和/或图片) 用于回复提问 -  彻底重构函数
 * @param {object} message Telegram message 对象
 * @param {object} env Cloudflare Worker environment
 * @param {string} botName 机器人名称
 * @returns {Promise<object|null>}  messageContent 对象，如果消息不包含文本或图片则返回 null
 */
export async function extractMessageContentForReply(message, env, botName) {
	if (!message) {
		return null;
	}

	let messageContentParts = []; //  用于存储消息内容片段 (text 或 image_url)

	// 处理文本内容 (text 或 caption)
	let text = message.text || message.caption;
	if (text) {
		text = text.replace(new RegExp(`@${botName}`, 'gi'), '').trim(); // 移除 @botName 并 trim，忽略大小写
		// if (text) {
		//  只有当文本内容不为空时才添加 text content part
		messageContentParts.push({ type: 'text', text: text });
		// }
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
 * @param {function} getGeminiChatCompletion 调用 Gemini API 函数
 * @param {function} formatGeminiReply 格式化 Gemini 回复函数
 * @returns {Promise<Response>}
 */
export async function handleReplyToMessageQuestion(
	message,
	env,
	botName,
	sendTelegramMessage,
	recordGroupRequestTimestamp,
	isGroupInCooldown,
	getUserWhitelist,
	getJsonFromKv,
	getGeminiChatCompletion,
) {
	console.log('开始处理回复消息提问 (不带上下文)...');

	const groupId = message.chat.id; //  !!!  获取群组 ID
	const userId = message.from.id;
	const botConfigKv = env.BOT_CONFIG;

	const systemInitConfigKv = env.SYSTEM_INIT_CONFIG;
	const systemPromptKey = env.SYSTEM_PROMPT_KV_KEY;
	const knowledgeBaseKey = env.KNOWLEDGE_BASE_KV_KEY;

	//  !!!  修改系统初始化消息获取和处理逻辑 (普通 @提问) - 分离知识库 !!!
	const systemPromptData = (await getJsonFromKv(systemInitConfigKv, systemPromptKey)) || { systemPrompt: 'You are a helpful assistant.' }; //  获取系统提示词
	const knowledgeBaseData = (await getJsonFromKv(systemInitConfigKv, knowledgeBaseKey)) || { knowledgeBase: '' }; //  !!! 获取知识库 !!!

	const combinedSystemPrompt = { ...systemPromptData, ...knowledgeBaseData }; //  !!! 合并提示词和知识库 !!!
	const combinedSystemPromptText = JSON.stringify(combinedSystemPrompt);
	const systemInitMessages = [{ role: 'system', content: combinedSystemPromptText }];
	// console.log("系统初始化消息 (回复 @提问, 分离知识库, 合并后):", systemInitMessages);

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

	let geminiReplyText = '';

	const botMessageIdsKv = env.BOT_MESSAGE_IDS;

	try {
		geminiReplyText = await getGeminiChatCompletion(env, geminiMessages, modelName);

		if (geminiReplyText.length > 4000) {
			//  !!!  处理超长回复  !!!
			const chunks = geminiReplyText.match(/[\s\S]{1,4000}/g) || []; //  分割成 4000 字符的块
			for (const chunk of chunks) {
				const botReplySendMessage = await sendTelegramMessage(env.BOT_TOKEN, groupId, chunk, message.message_id, 'HTML'); //  分块发送
				const telegramMessageId = botReplySendMessage?.message_id;
				if (telegramMessageId) {
					const botMessageIdKey = `last_bot_message_id:${groupId}:${userId}`;
					await putJsonToKv(botMessageIdsKv, botMessageIdKey, telegramMessageId); //  !!!  使用 BOT_MESSAGE_IDS KV  !!!
					console.log(`存储 Bot 消息 ID (message_id: ${telegramMessageId}) 到 KV, key: ${botMessageIdKey}`);
				}
			}
		} else {
			const botReplySendMessage = await sendTelegramMessage(env.BOT_TOKEN, groupId, geminiReplyText, message.message_id, 'HTML'); //  直接发送
			const telegramMessageId = botReplySendMessage?.message_id;
			if (telegramMessageId) {
				const botMessageIdKey = `last_bot_message_id:${groupId}:${userId}`;
				await putJsonToKv(botMessageIdsKv, botMessageIdKey, telegramMessageId); //  !!!  使用 BOT_MESSAGE_IDS KV  !!!
				console.log(`存储 Bot 消息 ID (message_id: ${telegramMessageId}) 到 KV, key: ${botMessageIdKey}`);
			}
		}
		await recordBotReplyMessage(env, botName, geminiReplyText, groupId); // 记录消息
		await recordGroupRequestTimestamp(botConfigKv, groupId); //  记录冷却时间
	} catch (error) {
		console.error('调用 Gemini API 失败 (回复提问):', error);
		geminiReplyText = '🤖️ Gemini API 接口调用失败，请稍后再试 (回复提问)';
		await sendTelegramMessage(env.BOT_TOKEN, groupId, geminiReplyText, message.message_id, 'HTML');
	}
	return new Response('OK');
}

/**
 * 处理 @bot 提问 (带上下文)
 * @param {object} message Telegram message 对象
 * @param {object} env Cloudflare Worker environment
 * @param {string} botName 机器人名称
 * @param {function} sendTelegramMessage 发送 Telegram 消息的函数
 * @param {function} editTelegramMessage 编辑 Telegram 消息的函数
 * @param {function} recordGroupRequestTimestamp 记录群组请求时间戳函数
 * @param {function} isGroupInCooldown 检查群组冷却函数
 * @param {function} getUserWhitelist 获取用户白名单函数
 * @param {function} getJsonFromKv 从 KV 获取 JSON 数据函数
 * @param {function} getUserContextHistory 获取用户上下文历史函数
 * @param {function} updateUserContextHistory 更新用户上下文历史函数
 * @param {function} getGeminiChatCompletion 调用 Gemini API 函数
 * @param {function} formatGeminiReply 格式化 Gemini 回复函数
 * @returns {Promise<Response>}
 */
export async function handleBotMentionQuestion(
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
) {
	const userId = message.from.id;
	const groupId = message.chat.id;
	const botConfigKv = env.BOT_CONFIG;

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

	const systemPromptData = (await getJsonFromKv(systemInitConfigKv, systemPromptKey)) || { systemPrompt: 'You are a helpful assistant.' }; //  获取系统提示词
	const knowledgeBaseData = (await getJsonFromKv(systemInitConfigKv, knowledgeBaseKey)) || { knowledgeBase: '' }; //  !!! 获取知识库 !!!

	const combinedSystemPrompt = { ...systemPromptData, ...knowledgeBaseData }; //  !!! 合并提示词和知识库 !!!
	const combinedSystemPromptText = JSON.stringify(combinedSystemPrompt);
	const systemInitMessages = [{ role: 'system', content: combinedSystemPromptText }]; //  !!! 使用合并后的提示词 !!!
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

	let geminiReplyText = ''; //  !!! 修正：声明

	try {
		geminiReplyText = await getGeminiChatCompletion(env, geminiMessages, modelName);

		if (geminiReplyText.length > 4000) {
			//  !!!  处理超长回复  !!!
			const chunks = geminiReplyText.match(/[\s\S]{1,4000}/g) || []; //  分割成 4000 字符的块
			for (const chunk of chunks) {
				const botReplySendMessage = await sendTelegramMessage(env.BOT_TOKEN, groupId, chunk, message.message_id, 'HTML'); //  分块发送
				const telegramMessageId = botReplySendMessage?.message_id;
				if (telegramMessageId) {
					const botMessageIdKey = `last_bot_message_id:${groupId}:${userId}`;
					await putJsonToKv(botMessageIdsKv, botMessageIdKey, telegramMessageId); //  !!!  使用 BOT_MESSAGE_IDS KV  !!!
					console.log(`存储 Bot 消息 ID (message_id: ${telegramMessageId}) 到 KV, key: ${botMessageIdKey}`);
				}
			}
		} else {
			const botReplySendMessage = await sendTelegramMessage(env.BOT_TOKEN, groupId, geminiReplyText, message.message_id, 'HTML'); //  直接发送
			const telegramMessageId = botReplySendMessage?.message_id;
			if (telegramMessageId) {
				const botMessageIdKey = `last_bot_message_id:${groupId}:${userId}`;
				await putJsonToKv(botMessageIdsKv, botMessageIdKey, telegramMessageId); //  !!!  使用 BOT_MESSAGE_IDS KV  !!!
				console.log(`存储 Bot 消息 ID (message_id: ${telegramMessageId}) 到 KV, key: ${botMessageIdKey}`);
			}
		}

		await recordBotReplyMessage(env, botName, geminiReplyText, groupId); //  调用
		console.log('已记录 @ 提问的回复消息');

		// console.log("Gemini API 流式响应处理完成，完整回复文本 (原始):", accumulatedReplyText); //  打印完整回复 (原始)
		// console.log("Gemini API 流式响应处理完成，完整回复文本 (HTML 格式化后):", formatGeminiReply(accumulatedReplyText));

		//  !!!  恢复为两次调用 updateUserContextHistory，分别记录 userMessage 和 botReply  !!!
		await updateUserContextHistory(contextKv, imageDataKv, groupId, userId, messageContent); //  记录用户消息
		const botReplyMessageContent = { role: 'assistant', content: geminiReplyText }; //  机器人回复消息内容
		await updateUserContextHistory(contextKv, env.IMAGE_DATA, groupId, userId, botReplyMessageContent); //  记录机器人回复消息
		// console.log("上下文历史记录 (提问后):", await getUserContextHistory(contextKv, groupId, userId));

		await recordGroupRequestTimestamp(botConfigKv, groupId);
	} catch (error) {
		console.error('调用 Gemini API 失败:', error);
		geminiReplyText = '🤖️ Gemini API 接口调用失败，请稍后再试'; //  修改错误提示信息，提示流式传输
		await sendTelegramMessage(env.BOT_TOKEN, groupId, geminiReplyText, message.message_id, 'HTML'); //  发送错误消息
	}
	return new Response('OK');
}
