// src/handlers/message-handler.js

import { handleImageMessageForContext } from './image-handler';
import { handleCooldownReplyAndCleanup, recordBotReplyMessage } from '../utils/utils';

/**
 * 提取消息内容 (文本和/或图片) 用于回复提问 -  彻底重构函数
 * @param {object} message Telegram message 对象
 * @param {object} env Cloudflare Worker environment
 * @param {string} botName 机器人名称
 * @returns {Promise<object|null>}  messageContent 对象，如果消息不包含文本或图片则返回 null
 */
export async function extractMessageContentForReply(message, env, botName) {
	//  !!!  彻底重构  !!!
	if (!message) {
		return null;
	}

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
	deleteTelegramMessage,
	sendTelegramMessage,
	editTelegramMessage,
	recordGroupRequestTimestamp,
	isGroupInCooldown,
	getUserWhitelist,
	getJsonFromKv,
	getGeminiChatCompletion,
	formatGeminiReply,
) {
	console.log('开始处理回复消息提问 (不带上下文)...');

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
							// console.log('编辑 Telegram 消息成功，message_id:', telegramMessageId);
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

		await recordGroupRequestTimestamp(botConfigKv, groupId); //  记录冷却时间
	} catch (error) {
		console.error('调用 Gemini API 失败 (回复提问, 流式):', error);
		geminiReplyText = '🤖️ Gemini API 接口调用失败，请稍后再试 (回复提问, 流式)';
		await sendTelegramMessage(env.BOT_TOKEN, groupId, geminiReplyText, message.message_id, 'HTML');
	}

	return new Response('OK');
}
