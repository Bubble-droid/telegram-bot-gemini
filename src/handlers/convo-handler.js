// src/handlers/convo-handler.js

import { getJsonFromKv, putJsonToKv, getUserWhitelist, handleCooldownReplyAndCleanup } from '../utils'; // 导入 utils.js 中的 KV 函数和白名单函数
import { getGeminiChatCompletion } from '../gemini'; // 导入 gemini.js 中的 Gemini API 调用函数
import { handleCommandReplyAndCleanup, recordBotReplyMessage } from './command-handler'; // 导入 command-handler.js 中的命令回复和清理函数
import { handleImageMessageForContext } from './image-handler'; // 导入 image-handler.js 中的图片消息处理函数
import { getUserContextHistory, updateUserContextHistory } from '../storage/context-storage'; // 导入 context-storage.js 中的上下文存储函数
import { isGroupInCooldown, recordGroupRequestTimestamp, parseDurationToMs } from '../utils/cooldown'; // 导入 cooldown.js 中的冷却相关函数
import { formatGeminiReply } from '../utils/formatter'; // 导入 formatter.js 中的消息格式化函数
import { recordGroupMessage } from '../summary/summarization-handler'; // 导入 summarization-handler.js 中的群组消息记录函数
import { sendTelegramMessage, editTelegramMessage, deleteTelegramMessage } from '../index'; //  !!!  从 index.js 中导入 Telegram 消息发送/编辑/删除函数  !!!

/**
 *  !!!  新增 handleBotMentionQuestion 函数，用于复用 @ 提问处理逻辑  !!!
 * 处理 @bot 提问 (流式响应，带上下文) -  将原 index.js 中 @bot 提问处理的代码 提取到此函数
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
 * @param {function} getJsonFromKv_duplicate KV 读取 JSON 函数 (重复参数，但为了参数统一保留)
 * @param {function} putJsonToKv_duplicate KV 写入 JSON 函数 (重复参数，但为了参数统一保留)
 * @returns {Promise<Response>}
 */
export async function handleBotMentionQuestion(message, env, botName, sendTelegramMessage, editTelegramMessage, recordGroupRequestTimestamp, isGroupInCooldown, getUserWhitelist, getJsonFromKv, getUserContextHistory, updateUserContextHistory, getGeminiChatCompletion, formatGeminiReply, getJsonFromKv_duplicate, putJsonToKv_duplicate) {
	console.log(`开始处理 @bot 提问 (复用函数, 图片消息: ${!!message.photo}) -  流式响应处理 (带上下文)`);

	const groupId = message.chat.id;
	const groupWhitelistKey = env.GROUP_WHITELIST_KV_KEY;
	const botConfigKv = env.BOT_CONFIG;
	const groupWhitelist = await getJsonFromKv(botConfigKv, groupWhitelistKey) || [];
	if (!groupWhitelist.includes(groupId)) {
		console.log(`群组 ${groupId} 不在白名单中，忽略 @bot 提问 (复用函数)`);
		return new Response('OK');
	}
	console.log(`群组 ${groupId} 在白名单中，继续处理 @bot 提问 (复用函数)`);

	const userId = message.from.id;
	const userWhitelistKey = env.USER_WHITELIST_KV_KEY;
	const userWhitelist = await getUserWhitelist(botConfigKv, userWhitelistKey) || [];
	const cooldownDuration = env.COOLDOWN_DURATION;
	const isInCooldown = await isGroupInCooldown(botConfigKv, cooldownDuration, groupId, userId, userWhitelist);
	if (isInCooldown) {
		console.log(`群组 ${groupId} 处于冷却中，忽略 @bot 提问 (复用函数), 发送冷却提示`); //  !!!  添加日志，表明发送冷却提示 !!!
		//  !!!  新增: 冷却中回复消息 !!!
		const lastRequestTimestampKey = `cooldown:${groupId}`; //  获取 lastRequestTimestampKey
		const lastRequestTimestamp = await getJsonFromKv(botConfigKv, lastRequestTimestampKey) || 0; // 获取上次请求时间戳
		const cooldownMs = parseDurationToMs(cooldownDuration); //  解析冷却时间为毫秒 (假设 parseDurationToMs 函数已定义)
		const remainingSeconds = Math.ceil((cooldownMs - (Date.now() - lastRequestTimestamp)) / 1000); // 计算剩余秒数
		const replyText = `⏱️ 系统正在冷却中，请等待 ${remainingSeconds} 秒后重试！`; //  构建冷却提示消息

		await handleCooldownReplyAndCleanup(env.BOT_TOKEN, groupId, replyText, message.message_id, sendTelegramMessage, deleteTelegramMessage, env, message.message_id, botName); // 发送冷却提示并清理
		return new Response('OK');
	}
	console.log(`群组 ${groupId} 未冷却或用户在白名单中，继续处理 @bot 提问 (复用函数)`);

	let messageContent;

	if (message.text) {
		const textWithoutBotName = message.text.replace(new RegExp(`@${botName}`, 'gi'), '').trim(); //  !!!  使用 RegExp 忽略大小写  !!!
		messageContent = { role: 'user', content: textWithoutBotName };
	} else if (message.photo) {
		messageContent = await handleImageMessageForContext(message, env);
	}


	if (!messageContent) {
		console.warn("messageContent 为空，忽略 @bot 提问 (复用函数)");
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

	//  !!!  修改系统初始化消息获取和处理逻辑 (普通 @提问) - 分离知识库 !!!
	const systemPromptData = await getJsonFromKv(systemInitConfigKv, systemPromptKey) || { systemPrompt: "You are a helpful assistant." }; //  获取系统提示词
	const knowledgeBaseData = await getJsonFromKv(systemInitConfigKv, knowledgeBaseKey) || { knowledgeBase: "" }; //  !!! 获取知识库 !!!

	let systemPromptText = systemPromptData;
	let knowledgeBaseText = knowledgeBaseData;

	if (typeof systemPromptText === 'object') { //  !!!  添加判断，确保是对象 !!!
		systemPromptText = JSON.stringify(systemPromptText); //  !!!  将整个 JSON 对象转换为字符串 !!!
	}
	if (typeof knowledgeBaseText === 'object') { //  !!!  添加判断，确保是对象 !!!
		knowledgeBaseText = JSON.stringify(knowledgeBaseText); //  !!!  将整个 JSON 对象转换为字符串 !!!
	}

	const combinedSystemPrompt = `${systemPromptText}\n\n${knowledgeBaseText}`; //  !!! 合并提示词和知识库 !!!
	const systemInitMessages = [{ role: 'system', content: combinedSystemPrompt }]; //  !!! 使用合并后的提示词 !!!
	// console.log("系统初始化消息 (普通 @提问, 分离知识库, 合并后):", systemInitMessages);

	let processedMessages = [];
	for (const msg of [...contextHistory, messageContent]) {
		if (msg.content && Array.isArray(msg.content)) {
			const processedContent = await Promise.all(msg.content.map(async contentPart => {
				if (contentPart.type === 'image_url') {
					const imageKvKey = contentPart.image_url.url;
					const base64Image = await imageDataKv.get(imageKvKey);
					if (base64Image) {
						return {
							type: 'image_url',
							image_url: { url: `data:image/jpeg;base64,${base64Image}` }
						};
					} else {
						console.error(`KV 键名 ${imageKvKey} 对应的 Base64 数据未找到`);
						return { type: 'text', text: `(图片数据丢失, key: ${imageKvKey})` };
					}
				}
				return contentPart;
			}));
			processedMessages.push({ role: msg.role, content: processedContent });
		} else {
			processedMessages.push(msg);
		}
	}

	const geminiMessages = [
		...systemInitMessages,
		...processedMessages,
	];
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

				if (currentText !== lastEditedText) { //  !!! 内容差异检测 !!!
					if (!telegramMessageId) {
						const firstResponse = await sendTelegramMessage(env.BOT_TOKEN, groupId, formattedChunkText, message.message_id, 'HTML');
						telegramMessageId = firstResponse?.message_id;
						lastEditedText = formattedChunkText; // 更新 lastEditedText
						console.log("发送第一条流式消息，message_id:", telegramMessageId);
					} else {
						const editResult = await editTelegramMessage(env.BOT_TOKEN, groupId, telegramMessageId, currentText, 'HTML'); //  使用 currentText 编辑
						if (editResult.ok) {
							lastEditedText = currentText; //  !!! 仅在编辑成功时更新 lastEditedText !!!
							console.log("编辑 Telegram 消息成功，message_id:", telegramMessageId);
						} else {
							console.error("编辑 Telegram 消息失败:", editResult);
							console.error("编辑 Telegram 消息失败详情:", editResult);
							if (editResult.error && editResult.error.error_code === 429) {
								console.warn("遇到 429 错误，达到速率限制，请稍后重试");
							}
							const fallbackText = formatGeminiReply(chunkText) || "🤖️ Gemini API 接口流式传输过程中编辑消息失败，尝试发送新消息...";
							console.log("降级发送新消息, fallbackText:", fallbackText);
							const sendFallbackResult = await sendTelegramMessage(env.BOT_TOKEN, groupId, fallbackText, null, 'HTML');
							if (!sendFallbackResult.ok) {
								console.error("降级发送新消息也失败:", sendFallbackResult);
							}
						}
					}
				} else {
					console.log("本次 chunk 内容与上次编辑内容相同，跳过编辑操作"); //  添加日志：跳过编辑
				}
				await new Promise(resolve => setTimeout(resolve, 3000));
			}
		} //  !!!  for await 循环 结束 !!!

		await recordBotReplyMessage(env, botName, accumulatedReplyText, groupId); //  调用 recordBotReplyMessage 记录
		console.log("已记录 @ 提问的回复消息 (复用函数)");

		//  !!!  存储 Bot 消息 ID  !!!
		if (telegramMessageId) {
			const botMessageIdKey = `last_bot_message_id:${groupId}:${userId}`;
			await putJsonToKv(botMessageIdsKv, botMessageIdKey, telegramMessageId); //  !!!  使用 BOT_MESSAGE_IDS KV  !!!
			console.log(`存储 Bot 消息 ID (message_id: ${telegramMessageId}) 到 KV, key: ${botMessageIdKey} (复用函数)`);
		}


		//  !!!  恢复为两次调用 updateUserContextHistory，分别记录 userMessage 和 botReply  !!!
		await updateUserContextHistory(contextKv, imageDataKv, groupId, userId, messageContent); //  记录用户消息
		const botReplyMessageContent = { role: 'assistant', content: accumulatedReplyText }; //  机器人回复消息内容
		await updateUserContextHistory(contextKv, env.IMAGE_DATA, groupId, userId, botReplyMessageContent); //  记录机器人回复消息
		// console.log("上下文历史记录 (提问后):", await getUserContextHistory(contextKv, groupId, userId));

		await recordGroupRequestTimestamp(botConfigKv, groupId);


	} catch (error) {
		console.error("调用 Gemini API 失败 (流式传输, 复用函数):", error);
		geminiReplyText = "🤖️ Gemini API 接口调用失败，请稍后再试 (流式传输, 复用函数)"; //  修改错误提示信息，提示流式传输
		await sendTelegramMessage(env.BOT_TOKEN, groupId, geminiReplyText, message.message_id, 'HTML'); //  发送错误消息
	}

	return new Response('OK');
}
