// src/handlers/search-handler.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getJsonFromKv, putJsonToKv } from '../utils';
import { isGroupInCooldown as isSearchGroupInCooldown, recordGroupRequestTimestamp as recordSearchGroupRequestTimestamp } from '../utils/cooldown'; //  !!!  使用别名，区分普通冷却和搜索冷却
import { formatGeminiReply } from '../utils/formatter';

/**
 * 处理 Google 搜索命令
 * @param {object} message Telegram message 对象
 * @param {object} env Cloudflare Worker environment
 * @param {string} botName 机器人名称
 * @param {function} sendTelegramMessage 发送 Telegram 消息的函数
 * @param {string} defaultModelName 默认模型名称
 * @returns {Promise<Response>}
 */
export async function handleSearchCommand(message, env, botName, sendTelegramMessage, defaultModelName) {
	console.log("开始处理 Google 搜索命令...");

	const groupId = message.chat.id;
	const userId = message.from.id;
	const messageText = message.text || message.caption || '';
	const botNameMention = `@${botName}`;
	const searchCommandPrefix = '/search';

	//  !!!  改进搜索关键词提取逻辑  !!!
	const searchCommandMention = `${searchCommandPrefix} ${botNameMention}`; //  构建完整的命令提及，包含空格
	let searchQuery = '';
	const commandMentionIndex = messageText.indexOf(searchCommandMention);
	if (commandMentionIndex !== -1) {
		searchQuery = messageText.substring(commandMentionIndex + searchCommandMention.length).trim(); //  提取命令提及后的所有文本
	}
	console.log(`提取的搜索关键词: ${searchQuery}`);


	//  检查搜索关键词是否为空 (保持不变)
	if (!searchQuery) {
		const replyText = `🤔 请输入您要搜索的内容。\n\n` +
			`例如：\`/search @${botName} 最新 Sing-box 教程\`\n\n` +
			`请在 \`/search @${botName}\` 命令后添加您的搜索关键词。`;
		await sendTelegramMessage(env.BOT_TOKEN, groupId, replyText, message.message_id, 'HTML');
		return new Response('OK');
	}

	const botConfigKv = env.BOT_CONFIG;
	const groupWhitelistKey = env.GROUP_WHITELIST_KV_KEY;
	const groupWhitelist = await getJsonFromKv(botConfigKv, groupWhitelistKey) || [];
	if (!groupWhitelist.includes(groupId)) {
		console.log(`群组 ${groupId} 不在白名单中，忽略 Google 搜索命令`);
		return new Response('OK');
	}
	console.log(`群组 ${groupId} 在白名单中，继续处理 Google 搜索命令`);


	//  搜索冷却检查
	const searchCooldownDuration = env.SEARCH_COOLDOWN_DURATION || '3m'; //  默认 3 分钟
	const isInCooldown = await isSearchGroupInCooldown(botConfigKv, searchCooldownDuration, groupId, userId); //  !!!  使用 isSearchGroupInCooldown  !!!
	if (isInCooldown) {
		console.log(`群组 ${groupId} 处于 Google 搜索冷却中，忽略搜索命令`);
		return new Response('OK');
	}
	console.log(`群组 ${groupId} 未冷却或用户在白名单中，继续处理 Google 搜索命令`);


	try {
		//  初始化 Gemini Pro 模型 (使用原生 SDK)
		const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
		const model = genAI.getGenerativeModel({ model: defaultModelName }); //  使用默认模型名称

		//  获取系统搜索指令
		const systemSearchPromptKey = env.SYSTEM_SEARCH_PROMPT_KV_KEY;
		let systemSearchInstruction = await getJsonFromKv(env.SYSTEM_INIT_CONFIG, systemSearchPromptKey) || "You are a helpful assistant, who answers questions using google search.";
		if (typeof systemSearchInstruction === 'object') {
			systemSearchInstruction = JSON.stringify(systemSearchInstruction); //  如果仍然是对象，则先转换为 JSON 字符串
		}
		systemSearchInstruction = systemSearchInstruction.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\[/g, '\\[').replace(/\]/g, '\\]').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\n/g, '\\n'); //  转义特殊字符和换行符
		// console.log("获取的系统搜索指令 (转义后):", systemSearchInstruction);


		//  构造 Gemini API 请求 (原生 SDK 格式，包含 Google Search 工具)
		const requestPayload = {
			contents: [{
				role: 'user',
				parts: [{ text: searchQuery }],
			}],
			tools: [{
				googleSearch: {} //  !!!  启用 Google Search 工具 !!!
			}],
			generationConfig: {
				maxOutputTokens: 2048, //  !!!  增加最大输出 token  !!!
			},
			systemInstruction: systemSearchInstruction, //  !!!  添加系统指令 !!!
		};
		console.log("发送 Gemini API 搜索请求 (payload):", JSON.stringify(requestPayload, null, 2));

		//  调用 Gemini API 进行搜索 (不使用流式传输)
		const geminiResult = await model.generateContent(requestPayload);
		const geminiResponse = geminiResult.response;
		const geminiText = geminiResponse.text();
		// console.log("收到 Gemini API 搜索回复 (原始):", geminiText);

		const formattedReplyText = formatGeminiReply(geminiText); //  格式化回复文本
		// console.log("格式化后的 Gemini API 搜索回复:", formattedReplyText);


		await sendTelegramMessage(env.BOT_TOKEN, groupId, formattedReplyText, message.message_id, 'HTML'); //  回复消息
		await recordSearchGroupRequestTimestamp(botConfigKv, groupId); //  记录搜索冷却时间  !!!  使用 recordSearchGroupRequestTimestamp  !!!


	} catch (error) {
		console.error("调用 Gemini API 搜索失败:", error);
		const replyText = `🤖️ Google 搜索功能暂时不可用，请稍后再试。\n\n` +
			`错误信息：\`\`\`\n${error.message}\n\`\`\`\n\n` +
			`请检查 Gemini API Key 和网络连接是否正常。`;
		await sendTelegramMessage(env.BOT_TOKEN, groupId, replyText, message.message_id, 'HTML');
	}

	return new Response('OK');
}
