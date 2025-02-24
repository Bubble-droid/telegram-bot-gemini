// src/gemini.js

import OpenAI from 'openai';

let openaiClient;

/**
 * 初始化 OpenAI 客户端 (兼容 Gemini API)
 * @param {string} apiKey Gemini API Key
 * @param {string} baseUrl Gemini API Base URL
 * @param {string} modelName Gemini 模型名称
 */
export function initGeminiAPI(apiKey, baseUrl, modelName) {
	openaiClient = new OpenAI({
		apiKey: apiKey,
		baseURL: baseUrl,
	});
	console.log('Gemini API 客户端初始化完成 (支持流式传输)'); //  修改日志，提示支持流式传输
}

/**
 * 调用 Gemini API 获取聊天回复 (流式传输) -  返回 ReadableStream
 * @param {Array<object>} messages  消息内容 (包含上下文历史)
 * @param {string} modelName Gemini 模型名称
 * @returns {Promise<ReadableStream>}  返回 ReadableStream
 */
export async function getGeminiChatCompletion(messages, modelName) {
	if (!openaiClient) {
		throw new Error('Gemini API 客户端未初始化，请先调用 initGeminiAPI()');
	}
	console.log('开始处理 @ 提问请求...');
	console.log(`当前所使用的 AI 模型: ${modelName}`);
	try {
		const payload = {
			//  !!!  构建完整的 payload 对象，用于日志输出  !!!
			model: modelName,
			messages: messages,
			max_completion_tokens: 1024,
			stream: true,
		};

		// console.log("发送 Gemini API 请求 (完整 payload):", JSON.stringify(payload, null, 2)); //  !!!  打印完整 payload !!!

		//  !!!  启用 stream: true,  获取流式响应  !!!
		const completion = await openaiClient.chat.completions.create(payload); //  使用 payload 对象

		//  !!!  返回 completion 对象 (ReadableStream)  !!!
		return completion; //  返回流对象，而不是文本
	} catch (error) {
		console.error('调用 Gemini API 失败 (流式传输):', error);

		//  !!!  简化错误日志，重点关注状态码和响应体  !!!
		console.error('Gemini API 请求失败详情:');
		console.error('  HTTP 状态码:', error.status);
		console.error('  HTTP 状态文本:', error.statusText);

		if (error.response) {
			try {
				const responseBody = await error.response.json(); //  !!!  尝试解析 JSON 响应体 !!!
				console.error('  响应体 (Response Body - JSON):', JSON.stringify(responseBody, null, 2)); //  !!!  记录 JSON 响应体 !!!
			} catch (jsonError) {
				console.error('  响应体 (Response Body - Text):', await error.response.text()); //  !!!  如果 JSON 解析失败，记录纯文本响应体 !!!
			}
		} else {
			console.error('  没有响应体 (No Response Body)'); //  !!!  如果 error.response 不存在，则没有响应体 !!!
		}
		throw error; //  将错误抛出，让调用者处理
	}
}
