// src/handlers/message-handler.js

import { getJsonFromKv, putJsonToKv } from '../utils/utils';
import { recordGroupRequestTimestamp, isGroupInCooldown } from '../utils/cooldown';
import { handleImageMessageForContext } from './image-handler';
import { getGeminiChatCompletion } from '../api/gemini-api';
import { updateUserContextHistory, getUserContextHistory } from '../storage/context-storage';
import {
	setBotCommands,
	setChatMenuButton,
	sendTelegramMessage,
	deleteTelegramMessage,
	forwardTelegramMessage,
	sendTelegramPhoto,
} from '../api/telegram-api';
import { scheduleDeletion } from '../utils/scheduler';

/**
 * 提取消息内容 (文本和/或图片) 用于回复提问 -  彻底重构函数
 * @param {object} message Telegram message 对象
 * @param {object} env Cloudflare Worker environment
 * @param {string} botName 机器人名称
 * @returns {Promise<object|null>}  messageContent 对象，如果消息不包含文本或图片则返回 null
 */
export async function extractMessageContentForReply(env, message, botName) {
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
export async function handleReplyToMessageQuestion(env, message, botName) {
	console.log('开始处理回复消息提问 (不带上下文)...');

	const groupId = message.chat.id; //  !!!  获取群组 ID
	const userId = message.from.id;
	const botConfigKv = env.BOT_CONFIG;

	const systemInitConfigKv = env.SYSTEM_INIT_CONFIG;
	const systemPromptKey = env.SYSTEM_PROMPT_KV_KEY;
	const knowledgeBaseKey = env.KNOWLEDGE_BASE_KV_KEY;

	//  !!!  修改系统初始化消息获取和处理逻辑 (普通 @提问) - 分离知识库 !!!
	const systemPromptData = (await systemInitConfigKv.get(systemPromptKey)) || 'You are a helpful assistant.'; //  获取系统提示词
	// const knowledgeBaseData = (await systemInitConfigKv.get(knowledgeBaseKey)) || { knowledgeBase: '' }; //  !!! 获取知识库 !!!

	// const fullSystemPromptText = systemPromptData; //  !!! 合并提示词和知识库 !!!
	const systemInitMessages = [{ role: 'system', content: systemPromptData }];
	// console.log("系统初始化消息 (回复 @提问, 分离知识库, 合并后):", systemInitMessages);

	const modelName = env.GEMINI_MODEL_NAME;

	const replyToMessage = message.reply_to_message;
	const replyMessage = message;

	let replyToMessageContent = await extractMessageContentForReply(env, replyToMessage, botName); //  !!!  提取被回复消息内容
	let currentMessageContent = await extractMessageContentForReply(env, replyMessage, botName); //  !!!  提取当前回复消息内容，包含 @bot 的文本/图片

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
					await putJsonToKv(botMessageIdsKv, botMessageIdKey, telegramMessageId, 604800); //  !!!  使用 BOT_MESSAGE_IDS KV  !!!
					console.log(`存储 Bot 消息 ID (message_id: ${telegramMessageId}) 到 KV, key: ${botMessageIdKey}`);
				}
			}
		} else {
			const botReplySendMessage = await sendTelegramMessage(env.BOT_TOKEN, groupId, geminiReplyText, message.message_id, 'HTML'); //  直接发送
			const telegramMessageId = botReplySendMessage?.message_id;
			if (telegramMessageId) {
				const botMessageIdKey = `last_bot_message_id:${groupId}:${userId}`;
				await putJsonToKv(botMessageIdsKv, botMessageIdKey, telegramMessageId, 604800); //  !!!  使用 BOT_MESSAGE_IDS KV  !!!
				console.log(`存储 Bot 消息 ID (message_id: ${telegramMessageId}) 到 KV, key: ${botMessageIdKey}`);
			}
		}

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
	replyToMessageId,
	botToken,
	botName,
) {
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

	console.log(`开始处理 @ 提问...`);

	const tempMessage = await sendTelegramMessage(botToken, chatId, `**思考中**...`, replyToMessageId, 'HTML');
	const tempMessageId = tempMessage?.message_id;

	const contextHistory = await getUserContextHistory(contextKv, chatId, userId);
	// console.log('上下文历史记录 (提问前):', contextHistory);

	const systemPromptData = (await systemInitConfigKv.get(systemPromptKey)) || `<system_context></system_context>`; //  获取系统提示词
	// const knowledgeBaseData = (await systemInitConfigKv.get(knowledgeBaseKey)) || `<knowledge_base></knowledge_base>`; //  !!! 获取知识库 !!!

	// const fullSystemPromptText = `${systemPromptData}\n${knowledgeBaseData}`; //  !!! 合并提示词和知识库 !!!
	const systemInitMessages = [{ role: 'system', content: systemPromptData }]; //  !!! 使用合并后的提示词 !!!
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

		await deleteTelegramMessage(botToken, chatId, tempMessageId);

		if (geminiReplyText.length > 4000) {
			//  !!!  处理超长回复  !!!
			const chunks = geminiReplyText.match(/[\s\S]{1,4000}/g) || []; //  分割成 4000 字符的块
			for (const chunk of chunks) {
				const botReplySendMessage = await sendTelegramMessage(botToken, chatId, chunk, replyToMessageId, 'HTML'); //  分块发送
				const telegramMessageId = botReplySendMessage?.message_id;
				if (telegramMessageId) {
					const botMessageIdKey = `last_bot_message_id:${chatId}:${userId}`;
					await putJsonToKv(botMessageIdsKv, botMessageIdKey, telegramMessageId, 604800); //  !!!  使用 BOT_MESSAGE_IDS KV  !!!
					console.log(`存储 Bot 消息 ID (message_id: ${telegramMessageId}) 到 KV, key: ${botMessageIdKey}`);
				}
			}
		} else {
			const botReplySendMessage = await sendTelegramMessage(botToken, chatId, geminiReplyText, replyToMessageId, 'HTML'); //  直接发送
			const telegramMessageId = botReplySendMessage?.message_id;
			if (telegramMessageId) {
				const botMessageIdKey = `last_bot_message_id:${chatId}:${userId}`;
				await putJsonToKv(botMessageIdsKv, botMessageIdKey, telegramMessageId, 604800); //  !!!  使用 BOT_MESSAGE_IDS KV  !!!
				console.log(`存储 Bot 消息 ID (message_id: ${telegramMessageId}) 到 KV, key: ${botMessageIdKey}`);
			}
		}

		// console.log("Gemini API 流式响应处理完成，完整回复文本 (原始):", accumulatedReplyText); //  打印完整回复 (原始)
		// console.log("Gemini API 流式响应处理完成，完整回复文本 (HTML 格式化后):", formatGeminiReply(accumulatedReplyText));

		//  !!!  恢复为两次调用 updateUserContextHistory，分别记录 userMessage 和 botReply  !!!

		// await updateUserContextHistory(contextKv, imageDataKv, chatId, userId, messageContent); //  记录用户消息
		const botReplyMessageContent = { role: 'assistant', content: geminiReplyText }; //  机器人回复消息内容

		const context = [messageContent, botReplyMessageContent];

		await updateUserContextHistory(contextKv, imageDataKv, chatId, userId, context); //  记录机器人回复消息

		// console.log('上下文历史记录 (提问后):', await getUserContextHistory(contextKv, chatId, userId));

		await recordGroupRequestTimestamp(botConfigKv, chatId);
	} catch (error) {
		console.error('调用 Gemini API 失败:', error);
		const replyText = '🤖️ Gemini API 接口调用失败，请稍后再试'; //  修改错误提示信息，提示流式传输
		await sendTelegramMessage(botToken, chatId, replyText, replyToMessageId, 'HTML'); //  发送错误消息
	}

	return new Response('OK');
}

/**
 *  处理普通消息
 */

export async function handleUniversalMessage(
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
	replyToMessageId,
	botToken,
	botId,
	botName,
) {
	console.log(`普通群组消息 (非 @ 提及, 也非命令, 图片消息: ${!!message.photo})`);

	if (message.new_chat_participant) {
		return await handleNewChatPtcp(env, botToken, botName, message, chatId);
	}

	//  !!!  连续对话检测 !!!
	if (message.reply_to_message && message.reply_to_message.from.id === parseInt(botId)) {
		//  !!!  回复消息 且 回复对象是 Bot !!!
		const botMessageIdKey = `last_bot_message_id:${chatId}:${userId}`;
		const lastBotMessageId = await getJsonFromKv(botMessageIdsKv, botMessageIdKey); //  !!!  从 BOT_MESSAGE_IDS KV 获取  !!!

		if (lastBotMessageId && message.reply_to_message.message_id === lastBotMessageId) {
			//  !!!  检测到连续对话 !!!
			console.log(`检测到用户 ${userId} 在群组 ${chatId} 的连续对话 (回复了 message_id: ${lastBotMessageId})`);
			//  !!!  触发 @ 提问处理流程 (复用现有逻辑) !!!

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
			if (isInCooldown) {
				return new Response('OK');
			} else {
				console.log(`群组 ${chatId} 未冷却或用户在白名单中，继续处理提问`);
			}

			await handleBotMentionQuestion(
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
				replyToMessageId,
				botToken,
				botName,
			);

			return new Response('OK');
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
		}
		const content = [messageContent];
		await updateUserContextHistory(contextKv, imageDataKv, chatId, userId, content);
	} else {
		console.log('非文本或图片消息，不记录上下文');
	}
	return new Response('OK');
}

/**
 *  处理私聊消息
 */

export async function handlePrivateMessage(env, botToken, message, chatId, messageId, userId) {
	console.log('收到私聊消息');

	const adminId = Number(env.MAINTAINER_USER_IDS);
	const deleteDelay = 10 * 1000;

	try {
		// 始终调度删除用户的原始消息
		await scheduleDeletion(env, botToken, chatId, messageId, deleteDelay);

		// 非管理员时发送未授权提示并删除提示消息
		if (userId !== adminId) {
			const sent = await sendTelegramMessage(botToken, chatId, '⚠️ **未授权！**', messageId, 'HTML');
			await scheduleDeletion(env, botToken, chatId, sent.message_id, deleteDelay);
		}
	} catch (error) {
		console.error('handlePrivateMessage 处理失败：', error);
	}

	return new Response('ok');
}

const handleNewChatPtcp = async (env, botToken, botName, message, chatId) => {
	const newChatPtcp = message.new_chat_participant;
	try {
		// 1. 发送欢迎消息
		const ptcpId = newChatPtcp.id;
		const ptcpFullName = `${newChatPtcp.first_name || ''} ${newChatPtcp.last_name || ''}`.trim();
		const ptcpMention = `[${ptcpFullName}](tg://user?id=${ptcpId})`;
		const welcomeText =
			`欢迎  ${ptcpMention}  加入讨论组！\n\n` +
			`* **提问前须知：**\n` +
			`    - 遇到任何问题请先将 GUI 客户端和滚动发行升级到最新版。\n` +
			`    - 请确保你当前使用的 GUI 版本，与所选内核兼容。\n` +
			`    - 提问应直接发报错或者日志截图，而不是一堆意义不明的文字。\n` +
			`    - 简单问题可先 @ 智能助手(${botName}) 提问，以获得及时解答。`;

		const botSendMessage = await sendTelegramMessage(botToken, chatId, welcomeText, null, 'HTML');
		const sendMessageId = botSendMessage.message_id;

		await scheduleDeletion(env, botToken, chatId, sendMessageId, 90 * 1000);

		return new Response('ok');
	} catch (error) {
		console.error('Error in handleNewChatPtcp:', error);
	}
};
