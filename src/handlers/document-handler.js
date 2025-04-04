// src/handlers/document-handler.js

import { getJsonFromKv } from '../utils/utils';

/**
 * 处理通用文本文件消息并进行提问 (支持 txt, csv, md 等)
 * @param {object} message Telegram message 对象
 * @param {object} env Cloudflare Worker environment
 * @param {string} botName 机器人名称
 * @param {function} sendTelegramMessage 发送 Telegram 消息的函数
 * @param {function} getJsonFromKv 工具函数，从 KV 获取 JSON 数据
 * @returns {Promise<void>}
 */

export async function handleTextFileMessage(env, botName, botToken, message, chatId, replyToMessageId, sendTelegramMessage) {
	console.log('开始处理文本文件消息...');

	const document = message.document;
	const fileId = document.file_id;
	const fileName = document.file_name;

	console.log(`文本文件 file_id: ${fileId}, 文件名: ${fileName}`);

	try {
		const fileInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
		if (!fileInfoResponse.ok) {
			console.error('获取文本文件信息失败:', fileInfoResponse.status, fileInfoResponse.statusText);
			await sendTelegramMessage(botToken, chatId, '😥 获取文件信息失败，请稍后重试。', replyToMessageId, 'HTML');
			return;
		}
		const fileInfo = await fileInfoResponse.json();
		if (!fileInfo.ok) {
			console.error('获取文本文件信息失败 (API error):', fileInfo);
			await sendTelegramMessage(botToken, chatId, '😥 获取文件信息失败，请稍后重试。(API Error)', replyToMessageId, 'HTML');
			return;
		}
		const filePath = fileInfo.result.file_path;
		const fileDownloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
		console.log(`JSON 文件下载 URL: ${fileDownloadUrl}`);

		const fileResponse = await fetch(fileDownloadUrl);
		if (!fileResponse.ok) {
			console.error('下载文本文件失败:', fileResponse.status, fileResponse.statusText);
			await sendTelegramMessage(botToken, chatId, '😥 下载文件失败，请稍后重试。', replyToMessageId, 'HTML');
			return;
		}
		const fileText = await fileResponse.text(); //  !!!  使用 text() 获取文件内容 !!!

		const systemInitConfigKv = env.SYSTEM_INIT_CONFIG;
		const systemPromptKey = env.SYSTEM_PROMPT_KV_KEY;
		const knowledgeBaseKey = env.KNOWLEDGE_BASE_KV_KEY;

		//  !!!  修改系统初始化消息获取和处理逻辑 (普通 @提问) - 分离知识库 !!!
		const systemPromptData = (await getJsonFromKv(systemInitConfigKv, systemPromptKey)) || { systemPrompt: 'You are a helpful assistant.' }; //  获取系统提示词
		const knowledgeBaseData = (await getJsonFromKv(systemInitConfigKv, knowledgeBaseKey)) || { knowledgeBase: '' }; //  !!! 获取知识库 !!!

		const combinedSystemPrompt = { ...systemPromptData, ...knowledgeBaseData }; //  !!! 合并提示词和知识库 !!!
		const combinedSystemPromptText = JSON.stringify(combinedSystemPrompt);

		const userCaption = message.caption || '';
		const processedCaption = userCaption.replace(new RegExp(`@${botName}`, 'gi'), '').trim(); //  去除 @botName
		// console.log('JSON 文件内容：', fileText);
		//  构建 Gemini API 请求体
		const geminiApiRequestBody = {
			system_instruction: {
				parts: [
					{
						text: combinedSystemPromptText,
					},
				],
			},
			contents: [
				{
					parts: [
						{
							text: processedCaption,
						},
						{
							text: `文件 ${fileName} 内容:\n\n${fileText}`,
						},
					],
				},
			],
			generationConfig: {
				temperature: 0.7,
				topK: 64,
				topP: 0.95,
				maxOutputTokens: 8192,
				responseMimeType: 'text/plain',
			},
			tools: [
				{
					googleSearch: {},
				},
			],
		};

		// console.log(JSON.stringify(geminiApiRequestBody, null, 2));

		const modelName = env.DEFAULT_GEMINI_MODEL_NAME;
		const apiKey = env.GEMINI_API_KEY;

		try {
			const responseTextParts = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(geminiApiRequestBody),
				},
			);

			if (!responseTextParts || responseTextParts.length === 0) {
				console.warn('Gemini API 返回内容为空。');
				await sendTelegramMessage(botToken, chatId, '🤔 Gemini 没有返回任何内容，请稍后重试。', replyToMessageId, 'HTML');
				return;
			}

			const responseData = await responseTextParts.json();

			const textParts = responseData.candidates[0].content.parts;

			// 提取所有 text 部分并拼接
			let fullText = '';
			for (const part of textParts) {
				if (part.text) {
					fullText += part.text;
				}
			}
			const geminiReplyText = fullText.trim(); //  !!!  trim() 去除首尾空白 !!!
			// console.log('Gemini API 返回的文本 (已格式化):', formattedReplyText);

			if (geminiReplyText.length > 4000) {
				//  !!!  处理超长回复  !!!
				const chunks = geminiReplyText.match(/[\s\S]{1,4000}/g) || []; //  分割成 4000 字符的块
				for (const chunk of chunks) {
					await sendTelegramMessage(botToken, chatId, chunk, replyToMessageId, 'HTML'); //  分块发送
				}
			} else {
				await sendTelegramMessage(botToken, chatId, geminiReplyText, replyToMessageId, 'HTML'); //  直接
			}
		} catch (apiError) {
			console.error('调用 Gemini API 失败:', apiError);
			await sendTelegramMessage(botToken, chatId, '😥 调用 Gemini API 失败，请稍后重试。', replyToMessageId, 'HTML');
			return;
		}
	} catch (error) {
		console.error('处理文本文件消息失败:', error);
		await sendTelegramMessage(botToken, chatId, `😥 处理文本文件消息时发生错误: ${error.message}`, replyToMessageId, 'HTML');
	}
	return new Response('OK');
}
