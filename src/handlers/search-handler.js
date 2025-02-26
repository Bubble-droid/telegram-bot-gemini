// src/handlers/search-handler.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getJsonFromKv, handleCooldownReplyAndCleanup, recordBotReplyMessage } from '../utils/utils';
import { isGroupInCooldownForSearch, recordSearchGroupRequestTimestamp, parseDurationToMs } from '../utils/cooldown'; //  !!!  确保导入 recordSearchGroupRequestTimestamp 和 parseDurationToMs !!!
import { formatGeminiReply } from '../utils/formatter';

/**
 * 处理 Google 搜索命令
 * @param {object} message Telegram message 对象
 * @param {object} env Cloudflare Worker environment
 * @param {string} botName 机器人名称
 * @param {function} sendTelegramMessage 发送 Telegram 消息的函数
 * @param {string} defaultModelName 默认模型名称
 * @param {function} deleteTelegramMessage  删除 Telegram 消息的函数  !!!  新增 deleteTelegramMessage 参数  !!!
 * @returns {Promise<Response>}
 */
export async function handleSearchCommand(message, env, botName, sendTelegramMessage, defaultModelName, deleteTelegramMessage) {
	console.log('开始处理 Google 搜索请求...');

	const groupId = message.chat.id;
	const userId = message.from.id;
	const messageText = message.text || message.caption || '';
	const botNameMention = `@${botName}`;
	const searchCommandPrefix = '/search';

	//  !!!  改进搜索关键词提取逻辑  !!!
	const searchCommandMention = `${searchCommandPrefix}${botNameMention}`; //  构建完整的命令提及
	let searchQuery = '';
	const commandMentionIndex = messageText.indexOf(searchCommandMention);
	if (commandMentionIndex !== -1) {
		searchQuery = messageText.substring(commandMentionIndex + searchCommandMention.length).trim(); //  提取命令提及后的所有文本
	} else {
		//  !!!  兼容不带 @botName 的 /search 命令  !!!
		const simpleSearchCommandPrefix = `${searchCommandPrefix}`;
		if (messageText.startsWith(simpleSearchCommandPrefix)) {
			searchQuery = messageText.substring(simpleSearchCommandPrefix.length).trim();
		}
	}
	console.log(`提取的搜索关键词: ${searchQuery}`);

	//  检查搜索关键词是否为空 (保持不变)
	if (!searchQuery) {
		const replyText =
			'🤔 <b>请输入您要搜索的内容。</b>\n\n' +
			'例如：<code>/search@' +
			botName +
			' 最新 Sing-box 教程</code>\n\n' +
			'请在 <code>/search@' +
			botName +
			'</code> <b>命令后添加您的搜索关键词。</b>'; //  !!!  更新提示信息，包含 /search 命令用法  !!!
		const emptySearchSendResult = await sendTelegramMessage(env.BOT_TOKEN, groupId, replyText, message.message_id, 'HTML'); //  发送回复

		if (emptySearchSendResult.ok && emptySearchSendResult.message_id) {
			//  !!!  记录空搜索关键词提示消息  !!!
			await recordBotReplyMessage(env, botName, replyText, groupId); //  !!!  记录提示消息 !!!
		}

		return new Response('OK');
	}

	const botConfigKv = env.BOT_CONFIG;
	const groupWhitelistKey = env.GROUP_WHITELIST_KV_KEY;
	const groupWhitelist = (await getJsonFromKv(botConfigKv, groupWhitelistKey)) || [];
	if (!groupWhitelist.includes(groupId)) {
		console.log(`群组 ${groupId} 不在白名单中，忽略 Google 搜索命令`);
		return new Response('OK');
	}
	console.log(`群组 ${groupId} 在白名单中，继续处理 Google 搜索命令`);

	//  !!!  搜索冷却检查 (只在 handleSearchCommand 中进行) !!!
	const searchCooldownDuration = env.SEARCH_COOLDOWN_DURATION || '3m'; //  默认 3 分钟
	const isInSearchCooldown = await isGroupInCooldownForSearch(botConfigKv, searchCooldownDuration, groupId, userId); //  !!!  使用 isGroupInCooldownForSearch  !!!
	if (isInSearchCooldown) {
		console.log(`群组 ${groupId} 处于 Google 搜索冷却中，忽略搜索命令, 发送搜索冷却提示`); //  !!!  修改日志，更明确 !!!
		//  !!!  新增: 搜索命令冷却中回复消息 (在 handleSearchCommand 中回复) !!!
		const lastRequestTimestampKey = `cooldown:search:${groupId}`; //  !!!  使用 搜索冷却专用 Key  !!!
		const lastRequestTimestamp = (await getJsonFromKv(botConfigKv, lastRequestTimestampKey)) || 0; // 获取上次请求时间戳  !!!  Key 修正 !!!
		const cooldownMs = parseDurationToMs(searchCooldownDuration);
		const elapsedMs = Date.now() - lastRequestTimestamp;
		const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
		const replyText = `⏱️ 搜索功能正在冷却中，请等待 ${remainingSeconds > 0 ? remainingSeconds : 1} 秒后重试！`;

		console.log('已记录搜索冷却回复消息');

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
		);
		return new Response('OK');
	}
	console.log(`群组 ${groupId} 未冷却或用户在白名单中，继续处理 Google 搜索命令`); //  !!!  修改日志，更明确 !!!

	try {
		//  初始化 Gemini 模型 (使用原生 SDK)
		const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
		const model = genAI.getGenerativeModel({ model: defaultModelName }); //  使用默认模型名称

		//  !!!  修改系统搜索指令获取和处理逻辑 - 分离知识库 !!!
		const systemInitConfigKv = env.SYSTEM_INIT_CONFIG;
		const systemSearchPromptKey = env.SYSTEM_SEARCH_PROMPT_KV_KEY;
		const knowledgeBaseKey = env.KNOWLEDGE_BASE_KV_KEY; //  !!!  知识库 KV Key  !!!

		let systemSearchInstructionData = (await getJsonFromKv(systemInitConfigKv, systemSearchPromptKey)) || {
			systemSearchPrompt: 'You are a helpful assistant, who answers questions using google search.',
		}; //  获取搜索提示词
		let knowledgeBaseData = (await getJsonFromKv(systemInitConfigKv, knowledgeBaseKey)) || { knowledgeBase: '' }; //  !!! 获取知识库 !!!

		let systemSearchInstructionText = systemSearchInstructionData;
		let knowledgeBaseText = knowledgeBaseData;

		if (typeof systemSearchInstructionText === 'object') {
			systemSearchInstructionText = JSON.stringify(systemSearchInstructionText); //  如果仍然是对象，则先转换为 JSON 字符串
		}
		if (typeof knowledgeBaseText === 'object') {
			knowledgeBaseText = JSON.stringify(knowledgeBaseText); //  如果仍然是对象，则先转换为 JSON 字符串
		}

		const systemSearchInstruction = `${systemSearchInstructionText}\n\n${knowledgeBaseText}`; //  !!! 合并提示词和知识库 !!!
		// console.log("系统搜索指令 (分离知识库, 合并后):", systemSearchInstruction);

		const contents = [{ role: 'user', parts: [{ text: searchQuery }] }];
		const tools = [{ googleSearch: {} }];
		const generationConfig = { maxOutputTokens: 1024 };

		//  构造 Gemini API 请求 (原生 SDK 格式，包含 Google Search 工具)
		const requestPayload = {
			contents: contents,
			tools: tools,
			generationConfig: generationConfig,
			systemInstruction: systemSearchInstruction, //  !!!  添加系统指令 !!!
		};
		// console.log("发送 Gemini API 搜索请求 (payload):", JSON.stringify(requestPayload, null, 2));

		//  调用 Gemini API 进行搜索 (不使用流式传输)
		const geminiResult = await model.generateContent(requestPayload);
		const geminiResponse = geminiResult.response;
		const geminiText = geminiResponse.text();
		// console.log("收到 Gemini API 搜索回复 (原始):", geminiText);

		const formattedReplyText = formatGeminiReply(geminiText); //  格式化回复文本
		// console.log("格式化后的 Gemini API 搜索回复:", formattedReplyText);

		await sendTelegramMessage(env.BOT_TOKEN, groupId, formattedReplyText, message.message_id, 'HTML'); //  回复消息

		await recordBotReplyMessage(env, botName, formattedReplyText, groupId); //  调用 recordBotReplyMessage 记录
		console.log('已记录搜索回复消息');

		await recordSearchGroupRequestTimestamp(botConfigKv, groupId); //  记录搜索冷却时间  !!!  使用 recordSearchGroupRequestTimestamp  !!!
	} catch (error) {
		console.error('调用 Gemini API 搜索失败:', error);
		const replyText =
			'🤖️ Google 搜索功能暂时不可用，请稍后再试。\n\n' +
			'错误信息：<code>\n' +
			error.message +
			'\n</code>\n\n' +
			'请检查 Gemini API Key 和网络连接是否正常。';
		await sendTelegramMessage(env.BOT_TOKEN, groupId, replyText, message.message_id, 'HTML');
	}

	return new Response('OK');
}
